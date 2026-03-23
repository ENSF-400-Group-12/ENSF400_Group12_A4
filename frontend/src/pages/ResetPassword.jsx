import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { authFetch } from "../config/api";

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => String(searchParams.get("token") || "").trim(), [searchParams]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setStatus("");
    if (!token) {
      setError("Reset token is missing from this link.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not reset password.");
      } else {
        setStatus(data.message || "Password reset successful. Please log in.");
      }
    } catch (_) {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="verify-card-wrap">
      <div className="verify-card">
        <h1>Reset password</h1>
        <p>Set a new password for your account.</p>
        <form onSubmit={handleSubmit} className="signup-form" noValidate>
          <input
            type="password"
            className="input-field"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            disabled={loading}
          />
          <input
            type="password"
            className="input-field"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            disabled={loading}
          />
          <button type="submit" className="button-primary button-full" disabled={loading}>
            {loading ? "Updating..." : "Reset password"}
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

export default ResetPassword;
