/**
 * Session secret and cookie flags for express-session.
 * Production: SESSION_SECRET required (min length enforced).
 * Development: random secret per process start if unset (sessions reset on restart; set SESSION_SECRET for stability).
 *
 * Scaling note: express-session defaults to an in-memory store. That is fine for one Railway
 * instance. Multiple instances or zero-downtime deploys need a shared session store (for example Redis)
 * and sticky sessions or shared cookies across instances. This pass keeps the simplest single-node setup.
 */

const crypto = require('node:crypto');

const MIN_PROD_SECRET_LEN = 32;

function isProductionNodeEnv() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

/**
 * @returns {string}
 */
function resolveSessionSecret() {
  const fromEnvRaw = process.env.SESSION_SECRET;
  const fromEnv = fromEnvRaw == null ? '' : String(fromEnvRaw).trim();
  if (fromEnv.length > 0) {
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

/**
 * Cross-site deployments (for example Vercel frontend + Railway backend) need SameSite=None.
 * Keep Lax by default for local development safety.
 * @returns {'lax'|'none'|'strict'}
 */
function sessionCookieSameSite() {
  const raw = String(process.env.SESSION_COOKIE_SAME_SITE || '').trim().toLowerCase();
  if (raw === 'none') return 'none';
  if (raw === 'strict') return 'strict';
  if (raw === 'lax') return 'lax';
  return isProductionNodeEnv() ? 'none' : 'lax';
}

function trustProxyEnabled() {
  if (process.env.TRUST_PROXY === '1') return true;
  if (process.env.TRUST_PROXY === '0') return false;
  return isProductionNodeEnv();
}

module.exports = {
  resolveSessionSecret,
  sessionCookieSecure,
  sessionCookieSameSite,
  trustProxyEnabled,
  isProductionNodeEnv,
  MIN_PROD_SECRET_LEN,
};
