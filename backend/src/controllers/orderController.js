
const { randomBytes } = require('crypto');
const { prisma } = require('../config/database');

class OrderError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function requiredText(value, field, maxLength = 150) {
  if (typeof value !== 'string') {
    throw new OrderError(400, `${field} is required`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new OrderError(400, `${field} is required`);
  }

  if (normalized.length > maxLength) {
    throw new OrderError(400, `${field} is too long`);
  }

  return normalized;
}

function validateShippingAddress(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new OrderError(400, 'A valid shipping address is required');
  }

  const fullName = requiredText(input.fullName, 'Full name', 100);
  const phone = requiredText(input.phone, 'Phone number', 25);
  const addressLine1 = requiredText(
    input.addressLine1,
    'Address line 1',
    200
  );
  const city = requiredText(input.city, 'City', 100);
  const state = requiredText(input.state, 'State', 100);
  const postalCode = requiredText(input.postalCode, 'Postal code', 15);
  const country = requiredText(input.country, 'Country', 80);

  const phoneDigits = phone.replace(/\D/g, '');

  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    throw new OrderError(400, 'Enter a valid phone number');
  }

  if (postalCode.length < 3) {
    throw new OrderError(400, 'Enter a valid postal code');
  }

  const address = {
    fullName,
    phone,
    addressLine1,
    city,
    state,
    postalCode,
    country,
  };

  if (input.addressLine2 !== undefined &&
      input.addressLine2 !== null &&
      String(input.addressLine2).trim()) {
    address.addressLine2 = requiredText(
      String(input.addressLine2),
      'Address line 2',
      200
    );
  }

  return address;
}

async function placeOrder(req, res, next) {
  try {
    const sessionId =
      typeof req.body?.sessionId === 'string'
        ? req.body.sessionId.trim()
        : '';

    if (!sessionId || sessionId.length > 128) {
      return res.status(400).json({
        success: false,
        message: 'A valid sessionId is required',
      });
    }

    const paymentMethod =
      req.body.paymentMethod === undefined
        ? 'COD'
        : String(req.body.paymentMethod).trim().toUpperCase();

    if (paymentMethod !== 'COD') {
      return res.status(400).json({
        success: false,
        message: 'Only Cash on Delivery (COD) is supported',
      });
    }

    const shippingAddress = validateShippingAddress(
      req.body.shippingAddress
    );

    // Only use an identity supplied by trusted authentication middleware.
    // Never accept userId directly from the request body.
    const userId = req.user?.id || null;

    const order = await prisma.$transaction(
      async (tx) => {
        // Serialize checkout attempts for the same cart.
        // A second checkout must wait for the first transaction to finish.
        await tx.$queryRaw`
          SELECT "id"
          FROM "Cart"
          WHERE "sessionId" = ${sessionId}
          FOR UPDATE
        `;

        const cart = await tx.cart.findUnique({
          where: { sessionId },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        });

        if (!cart || cart.items.length === 0) {
          throw new OrderError(
            409,
            'Cart is empty or has already been checked out'
          );
        }

        const orderItems = [];
        let totalAmount = 0;

        for (const cartItem of cart.items) {
          const product = cartItem.product;

          if (!Number.isSafeInteger(cartItem.quantity) ||
              cartItem.quantity <= 0) {
            throw new OrderError(
              400,
              `Invalid quantity for product: ${product.name}`
            );
          }

          if (!product.isActive) {
            throw new OrderError(
              400,
              `Product is unavailable: ${product.name}`
            );
          }

          if (product.stock < cartItem.quantity) {
            throw new OrderError(
              409,
              `Insufficient stock for ${product.name}. Available: ${product.stock}, requested: ${cartItem.quantity}`
            );
          }

          let unitPrice = product.price;

          if (
            product.wholesalePrice !== null &&
            product.wholesalePrice !== undefined &&
            product.wholesaleQty !== null &&
            product.wholesaleQty !== undefined &&
            cartItem.quantity >= product.wholesaleQty
          ) {
            unitPrice = product.wholesalePrice;
          }

          const totalPrice = unitPrice * cartItem.quantity;

          orderItems.push({
            productId: product.id,
            quantity: cartItem.quantity,
            unitPrice,
            totalPrice,
          });

          totalAmount += totalPrice;
        }

        const orderNumber =
          `ORD-${Date.now()}-${randomBytes(5)
            .toString('hex')
            .toUpperCase()}`;

        const createdOrder = await tx.order.create({
          data: {
            orderNumber,
            userId,
            status: 'CONFIRMED',
            totalAmount,
            paymentMethod: 'COD',
            shippingAddress,
            items: {
              create: orderItems,
            },
          },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    images: true,
                  },
                },
              },
            },
          },
        });

        // Conditional stock updates prevent overselling,
        // even when different customers check out simultaneously.
        for (const item of createdOrder.items) {
          const stockUpdate = await tx.product.updateMany({
            where: {
              id: item.productId,
              isActive: true,
              stock: {
                gte: item.quantity,
              },
            },
            data: {
              stock: {
                decrement: item.quantity,
              },
            },
          });

          if (stockUpdate.count !== 1) {
            throw new OrderError(
              409,
              `Stock changed during checkout for ${item.product.name}. Please review your cart.`
            );
          }

          const updatedProduct = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true },
          });

          if (!updatedProduct) {
            throw new OrderError(
              409,
              'Product became unavailable during checkout'
            );
          }

          await tx.inventoryEvent.create({
            data: {
              productId: item.productId,
              eventType: 'STOCK_DECREASED',
              quantity: item.quantity,
              previousStock: updatedProduct.stock + item.quantity,
              newStock: updatedProduct.stock,
              orderId: createdOrder.id,
              metadata: {
                orderNumber: createdOrder.orderNumber,
              },
            },
          });
        }

        // Clear the cart only after order and inventory operations succeed.
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });

        return createdOrder;
      },
      {
        maxWait: 5000,
        timeout: 15000,
      }
    );

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: order,
    });
  } catch (error) {
    if (error instanceof OrderError) {
      return res.status(error.status).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 'P2034') {
      return res.status(409).json({
        success: false,
        message: 'Checkout conflict. Please review your cart and try again.',
      });
    }

    return next(error);
  }
}

async function getOrderById(req, res, next) {
  try {
    // Guest orders cannot be retrieved through this endpoint.
    // Add authentication before enabling customer order-history access.
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication is required to access order details',
      });
    }

    const { id } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                images: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    return res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  placeOrder,
  getOrderById,
};
