
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/database');

const {
  getJwtSecret,
  JWT_ISSUER,
  JWT_AUDIENCE,
} = require('../config/auth');

function safeUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    city: user.city,
    role: user.role,
    referralCode: user.referralCode,
  };
}

function createToken(userId) {
  return jwt.sign(
    {},
    getJwtSecret(),
    {
      subject: userId,
      expiresIn: process.env.JWT_EXPIRES_IN || '1d',
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );
}

function makeReferralCode(userId) {
  return `VLC-${userId.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

function optionalText(value, field, maxLength) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`${field} must be text`);
  }

  const normalized = value.trim();

  if (normalized.length > maxLength) {
    throw new Error(`${field} is too long`);
  }

  return normalized || undefined;
}

function validateCredentials(email, password) {
  if (typeof email !== 'string' || typeof password !== 'string') {
    return 'Email and password are required';
  }

  if (!email.trim() || email.length > 254) {
    return 'Enter a valid email address';
  }

  const normalizedEmail = email.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalizedEmail)) {
    return 'Enter a valid email address';
  }

  if (
    password.length < 8 ||
    Buffer.byteLength(password, 'utf8') > 72
  ) {
    return 'Password must be at least 8 characters and no more than 72 bytes';
  }

  return null;
}

async function register(req, res, next) {
  try {
    const { email, password } = req.body || {};

    const validationError = validateCredentials(email, password);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const name = optionalText(req.body.name, 'Name', 100);
    const phone = optionalText(req.body.phone, 'Phone', 25);
    const city = optionalText(req.body.city, 'City', 100);

    const passwordHash = await bcrypt.hash(password, 12);
    const referralCodeInput = optionalText(
      req.body.referralCode,
      'Referral code',
      32
    )?.toUpperCase();

    const referrer = referralCodeInput
      ? await prisma.user.findUnique({
          where: { referralCode: referralCodeInput },
          select: { id: true },
        })
      : null;

    if (referralCodeInput && !referrer) {
      return res.status(400).json({
        success: false,
        message: 'Referral code is not valid',
      });
    }

    const updatedUser = await prisma.$transaction(async tx => {
      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          name,
          phone,
          city,
          referredById: referrer?.id,
        },
      });
      const userWithCode = await tx.user.update({
        where: { id: createdUser.id },
        data: { referralCode: makeReferralCode(createdUser.id) },
      });

      if (referrer) {
        await tx.rewardLedger.createMany({
          data: [
            {
              userId: referrer.id,
              points: 100,
              action: 'REFERRAL_BONUS',
              reference: `REFERRAL-NEW-${createdUser.id}`,
            },
            {
              userId: createdUser.id,
              points: 50,
              action: 'WELCOME_REFERRAL',
              reference: `REFERRAL-JOIN-${createdUser.id}`,
            },
          ],
        });
      }

      return userWithCode;
    });

    const token = createToken(updatedUser.id);

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: safeUser(updatedUser),
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists',
      });
    }

    if (
      error.message?.includes('must be text') ||
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

async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== 'string' ||
      typeof password !== 'string' ||
      !email.trim() ||
      email.length > 254
    ) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        city: true,
        role: true,
        referralCode: true,
        passwordHash: true,
      },
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const token = createToken(user.id);

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: safeUser(user),
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function getMe(req, res) {
  return res.json({
    success: true,
    data: {
      user: safeUser(req.user),
    },
  });
}

async function updateMe(req, res, next) {
  try {
    const name = optionalText(req.body?.name, 'Name', 100);
    const phone = optionalText(req.body?.phone, 'Phone', 25);
    const city = optionalText(req.body?.city, 'City', 100);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, phone, city },
    });

    return res.json({
      success: true,
      message: 'Profile updated',
      data: { user: safeUser(user) },
    });
  } catch (error) {
    if (
      error.message?.includes('must be text') ||
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

module.exports = {
  register,
  login,
  getMe,
  updateMe,
};
