const { prisma } = require('../config/database');

async function getMyRewards(req, res, next) {
  try {
    const userId = req.user.id;

    const [entries, aggregate, total] = await Promise.all([
      prisma.rewardLedger.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.rewardLedger.aggregate({
        where: { userId },
        _sum: { points: true },
      }),
      prisma.rewardLedger.count({
        where: { userId },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        totalPoints: aggregate._sum.points || 0,
        entries,
        totalEntries: total,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function adminAwardPoints(req, res, next) {
  try {
    const userId = req.body?.userId;
    const points = req.body?.points;
    const action = req.body?.action;
    const reference = req.body?.reference;

    if (
      typeof userId !== 'string' ||
      !userId.trim() ||
      userId.length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: 'A valid userId is required',
      });
    }

    if (
      !Number.isSafeInteger(points) ||
      points < 1 ||
      points > 100000
    ) {
      return res.status(400).json({
        success: false,
        message: 'Points must be a positive integer up to 100000',
      });
    }

    if (
      typeof action !== 'string' ||
      !/^[A-Z][A-Z0-9_]{1,79}$/.test(action)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Action must be an uppercase identifier',
      });
    }

    if (
      typeof reference !== 'string' ||
      !reference.trim() ||
      reference.trim().length > 150
    ) {
      return res.status(400).json({
        success: false,
        message: 'A unique award reference is required',
      });
    }

    const normalizedUserId = userId.trim();
    const normalizedReference = reference.trim();

    const user = await prisma.user.findUnique({
      where: { id: normalizedUserId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Customer account not found',
      });
    }

    // Prevent accidental sequential duplicate awards.
    const existing = await prisma.rewardLedger.findFirst({
      where: {
        userId: normalizedUserId,
        action,
        reference: normalizedReference,
      },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A reward with this action and reference already exists',
        data: existing,
      });
    }

    const entry = await prisma.rewardLedger.create({
      data: {
        userId: normalizedUserId,
        points,
        action,
        reference: normalizedReference,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Reward points awarded successfully',
      data: {
        entry,
        customer: user,
      },
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMyRewards,
  adminAwardPoints,
};
