
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');

const {
  getJwtSecret,
  JWT_ISSUER,
  JWT_AUDIENCE,
} = require('../config/auth');

async function loadAuthenticatedUser(req) {
  const authorization = req.get('authorization');

  if (!authorization) return null;

  const match = authorization.match(/^Bearer\s+(\S+)$/i);

  if (!match) return null;

  let payload;

  try {
    payload = jwt.verify(match[1], getJwtSecret(), {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
  } catch (error) {
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError ||
      error instanceof jwt.NotBeforeError
    ) {
      return null;
    }

    throw error;
  }

  if (!payload || typeof payload.sub !== 'string') {
    return null;
  }

  // Read the current role from the database rather than trusting
  // an older role value embedded in the JWT.
  return prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      city: true,
      role: true,
    },
  });
}

async function authenticate(req, res, next) {
  try {
    const user = await loadAuthenticatedUser(req);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required or token is invalid',
      });
    }

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

async function optionalAuthenticate(req, res, next) {
  if (!req.get('authorization')) {
    req.user = null;
    return next();
  }

  return authenticate(req, res, next);
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource',
      });
    }

    return next();
  };
}

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorizeRoles,
};
