const { prisma } = require('../config/database');

function normalizeDataType(value) {
  if (
    typeof value !== 'string' ||
    !/^[A-Za-z][A-Za-z0-9_]{1,49}$/.test(value.trim())
  ) {
    return null;
  }

  return value.trim().toUpperCase();
}

async function getMyConsents(req, res, next) {
  try {
    const records = await prisma.sharingConsent.findMany({
      where: { userId: req.user.id },
      orderBy: { updatedAt: 'desc' },
    });

    return res.json({
      success: true,
      data: records,
    });
  } catch (error) {
    return next(error);
  }
}

async function setMyConsent(req, res, next) {
  try {
    const userId = req.user.id;
    const dataType = normalizeDataType(req.params.dataType);
    const isConsent = req.body?.isConsent;

    if (!dataType) {
      return res.status(400).json({
        success: false,
        message: 'Invalid dataType identifier',
      });
    }

    if (typeof isConsent !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isConsent must be a boolean',
      });
    }

    const existing = await prisma.sharingConsent.findUnique({
      where: {
        userId_dataType: { userId, dataType },
      },
    });

    const now = new Date();

    let record;

    if (!existing) {
      record = await prisma.sharingConsent.create({
        data: {
          userId,
          dataType,
          isConsent,
          grantedAt: isConsent ? now : null,
          revokedAt: null,
        },
      });
    } else {
      record = await prisma.sharingConsent.update({
        where: {
          userId_dataType: { userId, dataType },
        },
        data: {
          isConsent,
          grantedAt: isConsent ? now : existing.grantedAt,
          revokedAt: isConsent
            ? null
            : (existing.isConsent ? now : existing.revokedAt),
        },
      });
    }

    return res.json({
      success: true,
      message: isConsent
        ? 'Consent granted successfully'
        : 'Consent revoked successfully',
      data: record,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  getMyConsents,
  setMyConsent,
};
