
const { prisma } = require('../config/database');

async function getProductReviews(req, res, next) {
  try {
    const { productId } = req.params;

    const reviews = await prisma.review.findMany({
      where: { productId },
      include: {
        user: {
          select: {
            name: true,
            id: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    return next(error);
  }
}

async function createReview(req, res, next) {
  try {
    // IMPORTANT: Never accept userId from the request body.
    // Use the identity verified by JWT middleware.
    const userId = req.user.id;

    const productId =
      typeof req.body?.productId === 'string'
        ? req.body.productId.trim()
        : '';

    const rating = Number(req.body?.rating);

    const comment =
      req.body?.comment === undefined ||
      req.body?.comment === null
        ? null
        : req.body.comment;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'productId is required',
      });
    }

    if (
      !Number.isSafeInteger(rating) ||
      rating < 1 ||
      rating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5',
      });
    }

    if (
      comment !== null &&
      (typeof comment !== 'string' || comment.length > 1000)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Comment must be text with a maximum of 1000 characters',
      });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Only purchases belonging to the authenticated customer
    // can qualify the review as a verified purchase.
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId,
        order: {
          userId,
          status: 'CONFIRMED',
        },
      },
      select: {
        id: true,
      },
    });

    const review = await prisma.review.create({
      data: {
        productId,
        userId,
        rating,
        comment: comment?.trim() || null,
        isVerified: Boolean(hasPurchased),
      },
      include: {
        user: {
          select: {
            name: true,
            id: true,
          },
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: review,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this product',
      });
    }

    return next(error);
  }
}

module.exports = {
  getProductReviews,
  createReview,
};
