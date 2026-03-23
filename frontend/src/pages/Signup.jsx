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

  // Lock body scroll so the signup page never shows a scrollbar
  useEffect(() => {
    document.body.classList.add("signup-page-open");
    return () => document.body.classList.remove("signup-page-open");
  }, []);

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
      const data = await signup(emailTrimmed, password);
      if (data.verificationRequired || (data.user && !data.user.emailVerified)) {
        navigate("/verify-email", { replace: true });
      } else {
        navigate("/dashboard", { replace: true });
      }
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
      <div className="auth-page-background" aria-hidden="true">
        <img src="/closetpic.png" alt="" />
      </div>
      <div className="signup-card">
        <div className="auth-logo-lockup">
          <img
            src="/ClosetAI-logo-transparent.png"
            alt=""
            className="auth-logo-icon"
          />
          <img
            src="/ClosetAI-transparent.png"
            alt="ClosetAI"
            className="auth-logo-wordmark"
          />
        </div>
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
