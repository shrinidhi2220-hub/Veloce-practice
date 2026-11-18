const { prisma } = require('../config/database');

const transitions = {
  PENDING: ['PROCESSING', 'REJECTED'],
  PROCESSING: ['COMPLETED', 'REJECTED'],
};

const userSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  city: true,
};

function positiveInteger(value, fallback, maximum) {
  if (value === undefined) return fallback;

  if (typeof value !== 'string' || !/^\d+$/.test(value)) {
    return null;
  }

  const number = Number(value);

  if (!Number.isSafeInteger(number) || number < 1) {
    return null;
  }

  return Math.min(number, maximum);
}

async function getAdminSurprises(req, res, next) {
  try {
    const requestedStatus =
      req.query.status === undefined ? 'PENDING' : req.query.status;

    const allowedStatuses = [
      'PENDING',
      'PROCESSING',
      'COMPLETED',
      'REJECTED',
      'ALL',
    ];

    if (
      typeof requestedStatus !== 'string' ||
      !allowedStatuses.includes(requestedStatus.toUpperCase())
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid surprise request status',
      });
    }

    const status = requestedStatus.toUpperCase();

    const page = positiveInteger(req.query.page, 1, 1000000);
    const limit = positiveInteger(req.query.limit, 20, 100);

    if (page === null || limit === null) {
      return res.status(400).json({
        success: false,
        message: 'Page and limit must be positive integers',
      });
    }

    const where = status === 'ALL' ? {} : { status };
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      prisma.surpriseRequest.findMany({
        where,
        include: {
          user: {
            select: userSelect,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.surpriseRequest.count({ where }),
    ]);

    return res.json({
      success: true,
      data: requests,
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

async function updateSurpriseStatus(req, res, next) {
  try {
    const id = req.params.id;
    const requestedStatus = req.body?.status;

    if (typeof id !== 'string' || !id.trim() || id.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'A valid surprise request ID is required',
      });
    }

    if (typeof requestedStatus !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'A valid next status is required',
      });
    }

    const nextStatus = requestedStatus.trim().toUpperCase();

    if (!['PROCESSING', 'COMPLETED', 'REJECTED'].includes(nextStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be PROCESSING, COMPLETED, or REJECTED',
      });
    }

    const requestId = id.trim();

    const current = await prisma.surpriseRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!current) {
      return res.status(404).json({
        success: false,
        message: 'Surprise request not found',
      });
    }

    const permitted = transitions[current.status] || [];

    if (!permitted.includes(nextStatus)) {
      return res.status(409).json({
        success: false,
        message: `Invalid surprise request transition from ${current.status} to ${nextStatus}`,
        data: {
          currentStatus: current.status,
          allowedNextStatuses: permitted,
        },
      });
    }

    const result = await prisma.surpriseRequest.updateMany({
      where: {
        id: requestId,
        status: current.status,
      },
      data: {
        status: nextStatus,
      },
    });

    if (result.count !== 1) {
      return res.status(409).json({
        success: false,
        message: 'Request status changed concurrently. Refresh and try again.',
      });
    }

    const updated = await prisma.surpriseRequest.findUnique({
      where: { id: requestId },
      include: {
        user: {
          select: userSelect,
        },
      },
    });

    return res.json({
      success: true,
      message: `Surprise request updated to ${nextStatus}`,
      data: updated,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getAdminSurprises,
  updateSurpriseStatus,
};
