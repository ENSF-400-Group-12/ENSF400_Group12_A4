import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const MIN_PASSWORD = 6;

function Signup() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signup } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, user, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setError("Email is required.");
      return;
    }
    if (password.length < MIN_PASSWORD) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await signup(emailTrimmed, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="auth-theme auth-loading">
        <div className="auth-loading-spinner" aria-hidden="true" />
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="auth-theme signup-page">
      <div className="signup-card">
        <img
          src="/closetai-horizontal.png"
          alt="ClosetAI"
          className="auth-logo auth-logo-inline"
        />
        <h1>Create Your ClosetAI Account</h1>
        <p className="signup-subtext">
          Start building your digital wardrobe and get AI outfit recommendations.
        </p>

        <form onSubmit={handleSubmit} className="signup-form" noValidate>
          {error && <div className="form-error" role="alert">{error}</div>}
          <input
            type="email"
            placeholder="Email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            disabled={loading}
            aria-invalid={!!error}
          />
          <input
            type="password"
            placeholder="Password (min 6 characters)"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            disabled={loading}
            aria-invalid={!!error}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            className="input-field"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            disabled={loading}
            aria-invalid={!!error}
          />
          <button
            type="submit"
            className="button-primary button-full"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="signup-text">
          Already have an account?
          <Link to="/"> Log in</Link>
        </p>
      </div>
    </div>
  );
}

export default Signup;
