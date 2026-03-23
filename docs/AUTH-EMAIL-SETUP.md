# Auth Email Setup

This project supports account lifecycle email flows:

- Email verification after signup
- Resend verification email
- Forgot password request
- Password reset by token

## Required environment variables

### Core auth

- `SESSION_SECRET`  
  Long random string for session signing.
- `FRONTEND_ORIGIN`  
  Frontend origin(s) allowed by CORS, for example `http://localhost:3000`.
- `APP_BASE_URL`  
  Public frontend base URL used in verification and reset links, for example `http://localhost:3000` in local dev or your hosted app URL in production.

### Mailer

- `MAILER_MODE`  
  `log` or `resend`.
- `MAIL_FROM`  
  Sender address, for example `ClosetAI <no-reply@yourdomain.com>`.
- `RESEND_API_KEY`  
  Required when `MAILER_MODE=resend`.

### Token expiry and resend tuning (optional)

- `EMAIL_VERIFY_EXPIRY_MIN` (default `1440`)
- `EMAIL_VERIFY_RESEND_COOLDOWN_SEC` (default `60`)
- `PASSWORD_RESET_EXPIRY_MIN` (default `30`)

### Abuse protection tuning (optional)

- `AUTH_RATE_LIMIT_WINDOW_MS` (default `60000`)
- `AUTH_RATE_LIMIT_SIGNUP_MAX` (default `6`)
- `AUTH_RATE_LIMIT_LOGIN_MAX` (default `12`)
- `AUTH_RATE_LIMIT_RESEND_MAX` (default `6`)
- `AUTH_RATE_LIMIT_FORGOT_MAX` (default `8`)
- `AUTH_RATE_LIMIT_RESET_MAX` (default `10`)

## Development mode behavior

- Set `MAILER_MODE=log` in local dev to avoid real sending.
- The backend logs outgoing email subject and text to console.
- Copy the logged verification/reset link and open it in your browser.

## Production mode checklist

1. Set `MAILER_MODE=resend`.
2. Set valid `RESEND_API_KEY`.
3. Set verified sender in `MAIL_FROM`.
4. Set `APP_BASE_URL` to your public frontend URL.
5. Confirm DNS/domain setup in Resend.
