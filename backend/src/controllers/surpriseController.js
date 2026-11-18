
const { prisma } = require('../config/database');

function requiredText(value, field, maxLength = 150) {
  if (typeof value !== 'string' || !value.trim()) {
    return {
      error: `${field} is required`,
    };
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    return {
      error: `${field} is too long`,
    };
  }

  return { value: normalized };
}

async function createSurpriseRequest(req, res, next) {
  try {
    // Never trust userId supplied by the browser.
    const userId = req.user.id;

    const recipientName = requiredText(
      req.body?.recipientName,
      'Recipient name',
      100
    );

    const recipientPhone = requiredText(
      req.body?.recipientPhone,
      'Recipient phone',
      25
    );

    if (recipientName.error || recipientPhone.error) {
      return res.status(400).json({
        success: false,
        message: recipientName.error || recipientPhone.error,
      });
    }

    const phoneDigits = recipientPhone.value.replace(/\D/g, '');

    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      return res.status(400).json({
        success: false,
        message: 'Enter a valid recipient phone number',
      });
    }

    const message = req.body?.message ?? null;

    if (
      message !== null &&
      (typeof message !== 'string' || message.length > 1000)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Message must be text with a maximum of 1000 characters',
      });
    }

    let productId = null;

    if (req.body?.productId !== undefined &&
        req.body?.productId !== null &&
        req.body?.productId !== '') {
      if (
        typeof req.body.productId !== 'string' ||
        !req.body.productId.trim()
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid productId',
        });
      }

      productId = req.body.productId.trim();

      const product = await prisma.product.findFirst({
        where: {
          id: productId,
          isActive: true,
        },
        select: { id: true },
      });

      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Product not found or unavailable',
        });
      }
    }

    const surprise = await prisma.surpriseRequest.create({
      data: {
        userId,
        recipientName: recipientName.value,
        recipientPhone: recipientPhone.value,
        message: message?.trim() || null,
        productId,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Surprise request submitted successfully',
      data: surprise,
    });
  } catch (error) {
    return next(error);
  }
}

async function getUserSurprises(req, res, next) {
  try {
    // Customers can retrieve only their own requests.
    const userId = req.user.id;

    const surprises = await prisma.surpriseRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.json({
      success: true,
      data: surprises,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  createSurpriseRequest,
  getUserSurprises,
};
