const crypto = require('node:crypto');

function createRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken || '')).digest('hex');
}

function expiresAtIso(minutesFromNow) {
  const minutes = Number(minutesFromNow) || 0;
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

function isExpired(expiryIso) {
  if (!expiryIso) return true;
  const ts = Date.parse(expiryIso);
  if (Number.isNaN(ts)) return true;
  return ts <= Date.now();
}

module.exports = {
  createRawToken,
  hashToken,
  expiresAtIso,
  isExpired,
};
