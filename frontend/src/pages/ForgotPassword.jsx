import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authFetch } from "../config/api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    document.body.classList.add("signup-page-open");
    return () => document.body.classList.remove("signup-page-open");
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setStatus("");
    setLoading(true);
    try {
      const res = await authFetch("/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not request password reset.");
      } else {
        setStatus(data.message || "If an account exists for that email, a reset link has been sent.");
      }
    } catch (err) {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-theme signup-page">
      <div className="auth-page-background" aria-hidden="true">
        <img src="/closetpic.png" alt="" />
      </div>
      <div className="signup-card">
        <div className="auth-logo-lockup">
          <img src="/ClosetAI-logo-transparent.png" alt="" className="auth-logo-icon" />
          <img src="/ClosetAI-transparent.png" alt="ClosetAI" className="auth-logo-wordmark" />
        </div>
        <h1>Forgot password</h1>
        <p className="signup-subtext">
          Enter your email and we will send a reset link if an account exists.
        </p>
        <form onSubmit={handleSubmit} className="signup-form" noValidate>
          {error && <div className="form-error" role="alert">{error}</div>}
          <input
            type="email"
            className="input-field"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={loading}
          />
          <button type="submit" className="button-primary button-full" disabled={loading}>
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>
        {status && <p className="verify-note" role="status">{status}</p>}
        <p className="signup-text">
          <Link to="/">Back to login</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
