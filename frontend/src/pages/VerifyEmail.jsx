import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const RESEND_COOLDOWN_SEC = 60;

function VerifyEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading, verifyEmail, resendVerification, logout } = useAuth();
  const token = useMemo(() => String(searchParams.get("token") || "").trim(), [searchParams]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);

  useEffect(() => {
    if (resendSecondsLeft <= 0) return undefined;
    const t = setTimeout(() => setResendSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearTimeout(t);
  }, [resendSecondsLeft]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError("");
      setStatus("Verifying your email...");
      try {
        await verifyEmail(token);
        if (cancelled) return;
        setStatus("Email verified. Redirecting to your wardrobe...");
        setTimeout(() => navigate("/dashboard", { replace: true }), 900);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Verification failed.");
          setStatus("");
        }
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, verifyEmail, navigate]);

  if (loading) {
    return (
      <div className="auth-theme auth-loading">
        <div className="auth-loading-spinner" aria-hidden="true" />
        <p>Loading…</p>
      </div>
    );
  }

  if (!user) {
    return <NavigateToLogin />;
  }

  if (user.emailVerified) {
    return (
      <div className="verify-card-wrap">
        <div className="verify-card">
          <h1>Email verified</h1>
          <p>Your account is verified and ready to use.</p>
          <button type="button" className="button-primary" onClick={() => navigate("/dashboard")}>
            Go to wardrobe
          </button>
        </div>
      </div>
    );
  }

  async function handleResend() {
    setError("");
    setStatus("");
    setBusy(true);
    try {
      const data = await resendVerification();
      setStatus(data.message || "Verification email sent.");
      setResendSecondsLeft(RESEND_COOLDOWN_SEC);
    } catch (err) {
      setError(err.message || "Could not send verification email.");
    } finally {
      setBusy(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="verify-card-wrap">
      <div className="verify-card">
        <h1>Verify your email</h1>
        <p>
          We sent a verification link to <strong>{user.email}</strong>. Verify your email to continue using ClosetAI.
        </p>
        {!token && (
          <button
            type="button"
            className="button-primary button-full"
            disabled={busy || resendSecondsLeft > 0}
            onClick={handleResend}
          >
            {resendSecondsLeft > 0 ? `Resend in ${resendSecondsLeft}s` : (busy ? "Sending..." : "Resend verification email")}
          </button>
        )}
        {status && <p className="verify-note" role="status">{status}</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        <p className="verify-sub-actions">
          Wrong email? <Link to="/profile">Check your account</Link> or{" "}
          <button type="button" className="verify-link-btn" onClick={handleLogout}>
            log out
          </button>
          .
        </p>
      </div>
    </div>
  );
}

function NavigateToLogin() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/", { replace: true });
  }, [navigate]);
  return null;
}

export default VerifyEmail;
