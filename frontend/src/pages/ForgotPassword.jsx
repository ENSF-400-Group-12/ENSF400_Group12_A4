import { useState } from "react";
import { authFetch } from "../config/api";
import AuthShellCard from "../components/AuthShellCard";
import { authFormNetworkErrorMessage } from "../lib/authFormNetworkError";

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
      if (res.ok) {
        setStatus(data.message || "If an account exists for that email, a reset link has been sent.");
      } else {
        setError(data.error || "Could not request password reset.");
      }
    } catch (err) {
      setError(authFormNetworkErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShellCard
      title="Forgot password"
      subtext="Enter your email and we will send a reset link if an account exists."
      status={status}
    >
      <form onSubmit={handleSubmit} className="signup-form" noValidate>
        {error ? <div className="form-error" role="alert">{error}</div> : null}
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
    </AuthShellCard>
  );
}

export default ForgotPassword;
