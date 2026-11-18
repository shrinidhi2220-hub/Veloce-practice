const { prisma } = require('../config/database');
const { randomBytes } = require('crypto');

function requiredText(value, field, maxLength = 150) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${field} is required`);
  }

  const result = value.trim();

  if (result.length > maxLength) {
    throw new Error(`${field} is too long`);
  }

  return result;
}

const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  city: true,
};

async function createResaleListing(req, res, next) {
  try {
    const userId = req.user.id;

    const productName = requiredText(req.body?.productName, 'Product name', 150);
    const condition = requiredText(req.body?.condition, 'Condition', 50);
    const city = requiredText(req.body?.city, 'City', 100);

    const askingPrice = Number(req.body?.askingPrice);

    if (!Number.isFinite(askingPrice) || askingPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Asking price must be greater than zero',
      });
    }

    const description =
      req.body?.description === undefined ? null : req.body.description;

    if (
      description !== null &&
      (typeof description !== 'string' || description.length > 2000)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Description must be text with a maximum of 2000 characters',
      });
    }

    const images = req.body?.images === undefined ? [] : req.body.images;

    if (
      !Array.isArray(images) ||
      images.length > 10 ||
      !images.every(
        image => typeof image === 'string' && image.length <= 2048
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Images must be an array of up to 10 valid strings',
      });
    }

    const listing = await prisma.resaleListing.create({
      data: {
        userId,
        productName,
        condition,
        askingPrice,
        city,
        description,
        images,
        status: 'PENDING',
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Resale listing submitted for approval',
      data: listing,
    });
  } catch (error) {
    if (
      error.message?.includes('is required') ||
      error.message?.includes('is too long')
    ) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    return next(error);
  }
}

// Public: only approved resale listings are visible.
async function getResaleListings(req, res, next) {
  try {
    const listings = await prisma.resaleListing.findMany({
      where: { status: 'APPROVED' },
      include: {
        user: {
          select: {
            name: true,
            id: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return res.json({
      success: true,
      data: listings,
    });
  } catch (error) {
    return next(error);
  }
}

// Admin: view listings by status with pagination.
async function getAdminResaleListings(req, res, next) {
  try {
    const requestedStatus =
      req.query.status === undefined ? 'PENDING' : req.query.status;

    const allowedStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'ALL'];

    if (
      typeof requestedStatus !== 'string' ||
      !allowedStatuses.includes(requestedStatus.toUpperCase())
    ) {
      return res.status(400).json({
        success: false,
        message: 'Status must be PENDING, APPROVED, REJECTED, or ALL',
      });
    }

    const status = requestedStatus.toUpperCase();

    function parsePositiveInteger(value, fallback, maximum) {
      if (value === undefined) return fallback;
      if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;

      const parsed = Number(value);

      if (!Number.isSafeInteger(parsed) || parsed < 1) return null;

      return Math.min(parsed, maximum);
    }

    const page = parsePositiveInteger(req.query.page, 1, 1000000);
    const limit = parsePositiveInteger(req.query.limit, 20, 100);

    if (page === null || limit === null) {
      return res.status(400).json({
        success: false,
        message: 'Page and limit must be positive integers',
      });
    }

    const where = status === 'ALL' ? {} : { status };
    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      prisma.resaleListing.findMany({
        where,
        include: {
          user: {
            select: adminUserSelect,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.resaleListing.count({ where }),
    ]);

    return res.json({
      success: true,
      data: listings,
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

// Only a PENDING listing can transition to APPROVED or REJECTED.
async function changeResaleListingStatus(req, res, next, nextStatus) {
  try {
    const id = req.params.id;

    if (typeof id !== 'string' || !id.trim() || id.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'A valid listing ID is required',
      });
    }

    const result = await prisma.resaleListing.updateMany({
      where: {
        id: id.trim(),
        status: 'PENDING',
      },
      data: {
        status: nextStatus,
      },
    });

    if (result.count === 0) {
      const existing = await prisma.resaleListing.findUnique({
        where: { id: id.trim() },
        select: {
          id: true,
          status: true,
        },
      });

      if (!existing) {
        return res.status(404).json({
          success: false,
          message: 'Resale listing not found',
        });
      }

      return res.status(409).json({
        success: false,
        message: `This listing is already ${existing.status} and cannot be moderated again`,
        data: existing,
      });
    }

    const updatedListing = await prisma.resaleListing.findUnique({
      where: { id: id.trim() },
      include: {
        user: {
          select: adminUserSelect,
        },
      },
    });

    return res.json({
      success: true,
      message: `Resale listing ${nextStatus.toLowerCase()} successfully`,
      data: updatedListing,
    });
  } catch (error) {
    return next(error);
  }
}

function approveResaleListing(req, res, next) {
  return changeResaleListingStatus(req, res, next, 'APPROVED');
}

function rejectResaleListing(req, res, next) {
  return changeResaleListingStatus(req, res, next, 'REJECTED');
}

async function purchaseResaleListing(req, res, next) {
  try {
    const listingId = req.params.id;
    const input = req.body?.shippingAddress;

    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return res.status(400).json({
        success: false,
        message: 'A valid shippingAddress is required',
      });
    }

    const fields = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'postalCode', 'country'];
    const shippingAddress = {};
    for (const field of fields) {
      const value = input[field];
      if (typeof value !== 'string' || !value.trim() || value.trim().length > 200) {
        return res.status(400).json({
          success: false,
          message: `${field} is required and must be 200 characters or fewer`,
        });
      }
      shippingAddress[field] = value.trim();
    }

    const phoneDigits = shippingAddress.phone.replace(/\D/g, '');
    if (phoneDigits.length < 7 || phoneDigits.length > 15) {
      return res.status(400).json({ success: false, message: 'Enter a valid phone number' });
    }

    const purchase = await prisma.$transaction(async tx => {
      const listing = await tx.resaleListing.findUnique({ where: { id: listingId } });
      if (!listing) return { error: { status: 404, message: 'Listing not found' } };
      if (listing.userId === req.user.id) {
        return { error: { status: 400, message: 'You cannot purchase your own listing' } };
      }

      const changed = await tx.resaleListing.updateMany({
        where: { id: listingId, status: 'APPROVED' },
        data: { status: 'SOLD', buyerId: req.user.id, purchasedAt: new Date() },
      });
      if (changed.count !== 1) {
        return { error: { status: 409, message: 'This listing is no longer available' } };
      }

      const orderNumber = `RSL-${Date.now()}-${randomBytes(4).toString('hex').toUpperCase()}`;
      const order = await tx.resalePurchase.create({
        data: {
          listingId,
          buyerId: req.user.id,
          orderNumber,
          totalAmount: listing.askingPrice,
          paymentMethod: 'COD',
          shippingAddress,
          status: 'CONFIRMED',
        },
      });
      return { order };
    });

    if (purchase.error) {
      return res.status(purchase.error.status).json({
        success: false,
        message: purchase.error.message,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Resale order placed with cash on delivery',
      data: purchase.order,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'This listing has already been purchased',
      });
    }
    return next(error);
  }
}

module.exports = {
  createResaleListing,
  getResaleListings,
  getAdminResaleListings,
  approveResaleListing,
  rejectResaleListing,
  purchaseResaleListing,
};
