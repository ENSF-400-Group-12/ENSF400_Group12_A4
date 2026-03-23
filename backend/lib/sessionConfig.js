/**
 * Session secret and cookie flags for express-session.
 * Production: SESSION_SECRET required (min length enforced).
 * Development: random secret per process start if unset (sessions reset on restart; set SESSION_SECRET for stability).
 */

const crypto = require('crypto');

const MIN_PROD_SECRET_LEN = 32;

function isProductionNodeEnv() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

/**
 * @returns {string}
 */
function resolveSessionSecret() {
  const fromEnv = process.env.SESSION_SECRET != null ? String(process.env.SESSION_SECRET).trim() : '';
  if (fromEnv) {
    if (isProductionNodeEnv() && fromEnv.length < MIN_PROD_SECRET_LEN) {
      throw new Error(
        `SESSION_SECRET must be at least ${MIN_PROD_SECRET_LEN} characters in production.`
      );
    }
    return fromEnv;
  }
  if (isProductionNodeEnv()) {
    throw new Error('SESSION_SECRET must be set in production (use a long random string).');
  }
  // eslint-disable-next-line no-console -- intentional bootstrap warning
  console.warn(
    '[session] SESSION_SECRET not set; generated ephemeral secret (logins reset when the server restarts).'
  );
  return crypto.randomBytes(32).toString('hex');
}

function sessionCookieSecure() {
  if (process.env.SESSION_COOKIE_SECURE === '1') return true;
  if (process.env.SESSION_COOKIE_SECURE === '0') return false;
  return isProductionNodeEnv();
}

function trustProxyEnabled() {
  if (process.env.TRUST_PROXY === '1') return true;
  if (process.env.TRUST_PROXY === '0') return false;
  return isProductionNodeEnv();
}

module.exports = {
  resolveSessionSecret,
  sessionCookieSecure,
  trustProxyEnabled,
  isProductionNodeEnv,
  MIN_PROD_SECRET_LEN,
};
