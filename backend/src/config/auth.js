const JWT_ISSUER = 'veloce-api';
const JWT_AUDIENCE = 'veloce-client';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be configured and at least 32 characters long'
    );
  }

  return secret;
}

module.exports = {
  getJwtSecret,
  JWT_ISSUER,
  JWT_AUDIENCE,
};