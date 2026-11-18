
const { prisma } = require('../config/database');

function formatCart(cart) {
  if (!cart) {
    return { items: [], total: 0 };
  }

  const items = cart.items.map((item) => {
    const product = item.product;
    let unitPrice = product.price;

    if (
      product.wholesalePrice !== null &&
      product.wholesalePrice !== undefined &&
      product.wholesaleQty !== null &&
      product.wholesaleQty !== undefined &&
      item.quantity >= product.wholesaleQty
    ) {
      unitPrice = product.wholesalePrice;
    }

    return {
      ...item,
      unitPrice,
      totalPrice: unitPrice * item.quantity,
    };
  });

  return {
    ...cart,
    items,
    total: items.reduce((sum, item) => sum + item.totalPrice, 0),
  };
}

const cartInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          price: true,
          wholesalePrice: true,
          wholesaleQty: true,
          stock: true,
          images: true,
        },
      },
    },
  },
};

function validateIdentifiers(sessionId, productId) {
  return (
    typeof sessionId === 'string' &&
    sessionId.trim().length > 0 &&
    sessionId.length <= 128 &&
    typeof productId === 'string' &&
    productId.trim().length > 0
  );
}

function validateQuantity(value) {
  const quantity = Number(value);
  return Number.isSafeInteger(quantity) && quantity > 0
    ? quantity
    : null;
}

// All cart mutations lock the cart row before changing its items.
async function lockCart(tx, sessionId) {
  const cart = await tx.cart.findUnique({
    where: { sessionId },
    select: { id: true },
  });

  if (!cart) return null;

  await tx.$queryRaw`
    SELECT "id"
    FROM "Cart"
    WHERE "id" = ${cart.id}
    FOR UPDATE
  `;

  return cart.id;
}

async function addToCart(req, res, next) {
  try {
    const sessionId =
      typeof req.body?.sessionId === 'string'
        ? req.body.sessionId.trim()
        : '';

    const productId =
      typeof req.body?.productId === 'string'
        ? req.body.productId.trim()
        : '';

    const quantity = validateQuantity(
      req.body?.quantity === undefined ? 1 : req.body.quantity
    );

    if (!sessionId || sessionId.length > 128 || !productId) {
      return res.status(400).json({
        success: false,
        message: 'Valid sessionId and productId are required',
      });
    }

    if (quantity === null) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive integer',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create the cart if it does not exist.
      const cartRef = await tx.cart.upsert({
        where: { sessionId },
        create: { sessionId },
        update: { updatedAt: new Date() },
        select: { id: true },
      });

      await tx.$queryRaw`
        SELECT "id"
        FROM "Cart"
        WHERE "id" = ${cartRef.id}
        FOR UPDATE
      `;

      // Read cart data after acquiring the lock.
      const cart = await tx.cart.findUnique({
        where: { id: cartRef.id },
        include: { items: true },
      });

      const product = await tx.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          stock: true,
          isActive: true,
        },
      });

      if (!product) {
        return {
          error: { status: 404, message: 'Product not found' },
        };
      }

      if (!product.isActive) {
        return {
          error: { status: 400, message: 'Product is not available' },
        };
      }

      const existingItem = cart.items.find(
        (item) => item.productId === productId
      );

      const existingQuantity = existingItem?.quantity || 0;
      const newTotalQuantity = existingQuantity + quantity;

      if (newTotalQuantity > product.stock) {
        return {
          error: {
            status: 400,
            message: `Insufficient stock. Available: ${product.stock}, already in cart: ${existingQuantity}`,
          },
        };
      }

      if (existingItem) {
        await tx.cartItem.update({
          where: { id: existingItem.id },
          data: { quantity: newTotalQuantity },
        });
      } else {
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId,
            quantity,
          },
        });
      }

      const updatedCart = await tx.cart.findUnique({
        where: { id: cart.id },
        include: cartInclude,
      });

      return { cart: updatedCart };
    });

    if (result.error) {
      return res.status(result.error.status).json({
        success: false,
        message: result.error.message,
      });
    }

    return res.json({
      success: true,
      message: 'Item added to cart',
      data: formatCart(result.cart),
    });
  } catch (error) {
    next(error);
  }
}

async function getCart(req, res, next) {
  try {
    const sessionId = req.params.sessionId;

    const cart = await prisma.cart.findUnique({
      where: { sessionId },
      include: cartInclude,
    });

    return res.json({
      success: true,
      data: formatCart(cart),
    });
  } catch (error) {
    next(error);
  }
}

// Set the absolute cart-item quantity.
async function updateCartItem(req, res, next) {
  try {
    const { sessionId, productId } = req.params;
    const quantity = validateQuantity(req.body?.quantity);

    if (!validateIdentifiers(sessionId, productId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid sessionId and productId are required',
      });
    }

    if (quantity === null) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive integer',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const cartId = await lockCart(tx, sessionId);

      if (!cartId) {
        return {
          error: { status: 404, message: 'Cart not found' },
        };
      }

      const cart = await tx.cart.findUnique({
        where: { id: cartId },
        include: { items: true },
      });

      const cartItem = cart.items.find(
        (item) => item.productId === productId
      );

      if (!cartItem) {
        return {
          error: {
            status: 404,
            message: 'Item not found in cart',
          },
        };
      }

      const product = await tx.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          stock: true,
          isActive: true,
        },
      });

      if (!product || !product.isActive) {
        return {
          error: {
            status: 400,
            message: 'Product is not available',
          },
        };
      }

      if (quantity > product.stock) {
        return {
          error: {
            status: 400,
            message: `Insufficient stock. Available stock: ${product.stock}, requested: ${quantity}`,
          },
        };
      }

      await tx.cartItem.update({
        where: { id: cartItem.id },
        data: { quantity },
      });

      const updatedCart = await tx.cart.findUnique({
        where: { id: cartId },
        include: cartInclude,
      });

      return { cart: updatedCart };
    });

    if (result.error) {
      return res.status(result.error.status).json({
        success: false,
        message: result.error.message,
      });
    }

    return res.json({
      success: true,
      message: 'Cart item quantity updated',
      data: formatCart(result.cart),
    });
  } catch (error) {
    next(error);
  }
}

async function removeFromCart(req, res, next) {
  try {
    const { sessionId, productId } = req.params;

    if (!validateIdentifiers(sessionId, productId)) {
      return res.status(400).json({
        success: false,
        message: 'Valid sessionId and productId are required',
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const cartId = await lockCart(tx, sessionId);

      if (!cartId) {
        return {
          error: { status: 404, message: 'Cart not found' },
        };
      }

      const cart = await tx.cart.findUnique({
        where: { id: cartId },
        include: { items: true },
      });

      const cartItem = cart.items.find(
        (item) => item.productId === productId
      );

      if (!cartItem) {
        return {
          error: {
            status: 404,
            message: 'Item not found in cart',
          },
        };
      }

      await tx.cartItem.delete({
        where: { id: cartItem.id },
      });

      const updatedCart = await tx.cart.findUnique({
        where: { id: cartId },
        include: cartInclude,
      });

      return { cart: updatedCart };
    });

    if (result.error) {
      return res.status(result.error.status).json({
        success: false,
        message: result.error.message,
      });
    }

    return res.json({
      success: true,
      message: 'Item removed from cart',
      data: formatCart(result.cart),
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  addToCart,
  getCart,
  updateCartItem,
  removeFromCart,
};
