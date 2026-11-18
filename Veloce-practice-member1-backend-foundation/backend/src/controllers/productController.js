const { prisma } = require('../config/database');

function positiveInteger(value, fallback, maximum) {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) return null;
  return Math.min(parsed, maximum);
}

function priceBound(value) {
  if (value === undefined) return null;
  if (
    typeof value !== 'string' ||
    !/^\d+(?:\.\d+)?$/.test(value) ||
    !Number.isFinite(Number(value))
  ) {
    return undefined;
  }
  return Number(value);
}

async function getProducts(req, res, next) {
  try {
    const {
      q,
      category,
      city,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20,
    } = req.query;

    const parsedPage = positiveInteger(page, 1, 1000000);
    const parsedLimit = positiveInteger(limit, 20, 100);
    const parsedMinPrice = priceBound(minPrice);
    const parsedMaxPrice = priceBound(maxPrice);

    if (
      parsedPage === null ||
      parsedLimit === null ||
      parsedMinPrice === undefined ||
      parsedMaxPrice === undefined ||
      (parsedMinPrice !== null &&
        parsedMaxPrice !== null &&
        parsedMinPrice > parsedMaxPrice)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pagination or price filter',
      });
    }

    for (const [field, value] of Object.entries({ q, category, city })) {
      if (
        value !== undefined &&
        (typeof value !== 'string' || value.length > (field === 'q' ? 200 : 100))
      ) {
        return res.status(400).json({
          success: false,
          message: `${field} must be text within its maximum length`,
        });
      }
    }

    const skip = (parsedPage - 1) * parsedLimit;
    const take = parsedLimit;

    const where = {
      isActive: true,
    };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { brand: { contains: q, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = category;
    }

    if (city) {
      where.city = city;
    }

    if (parsedMinPrice !== null || parsedMaxPrice !== null) {
      where.price = {};
      if (parsedMinPrice !== null) where.price.gte = parsedMinPrice;
      if (parsedMaxPrice !== null) where.price.lte = parsedMaxPrice;
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          description: true,
          category: true,
          brand: true,
          city: true,
          price: true,
          wholesalePrice: true,
          wholesaleQty: true,
          stock: true,
          images: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getProductById(req, res, next) {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        reviews: {
          include: {
            user: {
              select: {
                name: true,
                id: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getProducts,
  getProductById,
};