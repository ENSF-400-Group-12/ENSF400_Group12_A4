import { useState } from "react";
import { Link } from "react-router-dom";
import { authFetch } from "../config/api";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

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
    <div className="verify-card-wrap">
      <div className="verify-card">
        <h1>Forgot password</h1>
        <p>Enter your email and we will send a password reset link if an account exists.</p>
        <form onSubmit={handleSubmit} className="signup-form" noValidate>
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
        {error && <p className="form-error" role="alert">{error}</p>}
        <p className="verify-sub-actions">
          <Link to="/">Back to login</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
