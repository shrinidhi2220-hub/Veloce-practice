const { prisma } = require('../config/database');

async function getInventoryEvents(req, res, next) {
  try {
    const page = req.query.page === undefined
      ? 1
      : Number(req.query.page);

    const limit = req.query.limit === undefined
      ? 20
      : Number(req.query.limit);

    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      page > 1000000 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pagination. Page must be positive and limit must be between 1 and 100.',
      });
    }

    const where = {};

    if (req.query.productId !== undefined) {
      const productId = String(req.query.productId).trim();

      if (!productId || productId.length > 128) {
        return res.status(400).json({
          success: false,
          message: 'Invalid productId',
        });
      }

      where.productId = productId;
    }

    if (req.query.eventType !== undefined) {
      const eventType = String(req.query.eventType).trim();

      if (!eventType || eventType.length > 60) {
        return res.status(400).json({
          success: false,
          message: 'Invalid eventType',
        });
      }

      where.eventType = eventType;
    }

    if (req.query.orderId !== undefined) {
      const orderId = String(req.query.orderId).trim();

      if (!orderId || orderId.length > 128) {
        return res.status(400).json({
          success: false,
          message: 'Invalid orderId',
        });
      }

      where.orderId = orderId;
    }

    const skip = (page - 1) * limit;

    const [events, total] = await prisma.$transaction([
      prisma.inventoryEvent.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),

      prisma.inventoryEvent.count({
        where,
      }),
    ]);

    return res.json({
      success: true,
      data: events,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getInventoryEvents,
};
