const { Resend } = require('resend');

function resolveMailerMode() {
  const mode = String(process.env.MAILER_MODE || '').trim().toLowerCase();
  if (mode === 'resend') return 'resend';
  return 'log';
}

function requiredSender() {
  const from = String(process.env.MAIL_FROM || '').trim();
  if (from) return from;
  return 'ClosetAI <no-reply@example.com>';
}

async function sendMail(message) {
  const mode = resolveMailerMode();
  if (mode === 'resend') {
    const apiKey = String(process.env.RESEND_API_KEY || '').trim();
    if (!apiKey) {
      throw new Error('MAILER_MODE is resend but RESEND_API_KEY is missing.');
    }
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: requiredSender(),
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });
    return { delivered: true, mode };
  }

  // Development-safe fallback: log instead of sending.
  // eslint-disable-next-line no-console
  console.log('[mailer:log] to=%s subject=%s', message.to, message.subject);
  // eslint-disable-next-line no-console
  console.log('[mailer:log] text=%s', message.text || '');
  return { delivered: false, mode };
}

function frontendBaseUrl() {
  const envUrl = String(process.env.APP_BASE_URL || '').trim();
  if (envUrl) return envUrl.replace(/\/$/, '');
  const fe = String(process.env.FRONTEND_ORIGIN || '').trim();
  return (fe || 'http://localhost:3000').replace(/\/$/, '');
}

module.exports = {
  sendMail,
  frontendBaseUrl,
  resolveMailerMode,
};
