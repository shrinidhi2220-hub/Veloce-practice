const { prisma } = require('../config/database');

const allowedStatuses = [
  'PENDING',
  'CONFIRMED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

// Only forward delivery transitions are supported for now.
// Cancellation is deliberately excluded until stock-restoration logic is implemented.
const transitions = {
  CONFIRMED: 'PROCESSING',
  PROCESSING: 'SHIPPED',
  SHIPPED: 'DELIVERED',
};

function parsePositiveInteger(value, fallback, maximum) {
  if (value === undefined) return fallback;

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return null;
  }

  return Math.min(parsed, maximum);
}

const orderInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      city: true,
    },
  },
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
};

async function getAdminOrders(req, res, next) {
  try {
    const page = parsePositiveInteger(req.query.page, 1, 1000000);
    const limit = parsePositiveInteger(req.query.limit, 20, 100);

    if (page === null || limit === null) {
      return res.status(400).json({
        success: false,
        message: 'Page and limit must be positive integers',
      });
    }

    let where = {};

    if (req.query.status !== undefined) {
      if (typeof req.query.status !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Invalid order status',
        });
      }

      const status = req.query.status.trim().toUpperCase();

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Status must be one of: ${allowedStatuses.join(', ')}`,
        });
      }

      where = { status };
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.order.count({ where }),
    ]);

    return res.json({
      success: true,
      data: orders,
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

async function updateOrderStatus(req, res, next) {
  try {
    const id = req.params.id;

    if (typeof id !== 'string' || !id.trim() || id.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'A valid order ID is required',
      });
    }

    const requestedStatus = req.body?.status;

    if (typeof requestedStatus !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'A valid next order status is required',
      });
    }

    const nextStatus = requestedStatus.trim().toUpperCase();

    if (!allowedStatuses.includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${allowedStatuses.join(', ')}`,
      });
    }

    const orderId = id.trim();

    const currentOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
      },
    });

    if (!currentOrder) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const expectedNextStatus = transitions[currentOrder.status];

    if (expectedNextStatus !== nextStatus) {
      return res.status(409).json({
        success: false,
        message: `Invalid order transition from ${currentOrder.status} to ${nextStatus}`,
        data: {
          currentStatus: currentOrder.status,
          allowedNextStatus: expectedNextStatus || null,
        },
      });
    }

    // Compare-and-set prevents two admins from overwriting each other's updates.
    const result = await prisma.order.updateMany({
      where: {
        id: orderId,
        status: currentOrder.status,
      },
      data: {
        status: nextStatus,
      },
    });

    if (result.count !== 1) {
      return res.status(409).json({
        success: false,
        message: 'Order status changed concurrently. Refresh and try again.',
      });
    }

    const updatedOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });

    return res.json({
      success: true,
      message: `Order status updated to ${nextStatus}`,
      data: updatedOrder,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAdminOrders,
  updateOrderStatus,
};
