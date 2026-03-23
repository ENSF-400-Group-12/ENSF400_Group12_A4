import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { authFetch } from "../config/api";
import AuthShellCard from "../components/AuthShellCard";
import { authFormNetworkErrorMessage } from "../lib/authFormNetworkError";

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
      if (res.ok) {
        setStatus(data.message || "Password reset successful. Please log in.");
      } else {
        setError(data.error || "Could not reset password.");
      }
    } catch (err) {
      setError(authFormNetworkErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShellCard title="Reset password" subtext="Set a new password for your account." status={status}>
      <form onSubmit={handleSubmit} className="signup-form" noValidate>
        {error ? <div className="form-error" role="alert">{error}</div> : null}
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
    </AuthShellCard>
  );
}

export default ResetPassword;
