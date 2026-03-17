import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || "/dashboard";

  useEffect(() => {
    if (!authLoading && user) {
      navigate(from, { replace: true });
    }
  }, [authLoading, user, navigate, from]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="auth-loading-spinner" aria-hidden="true" />
        <p>Loading…</p>
      </div>
    );
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="hero-text">
          <h1 className="site-title">ClosetAI</h1>
          <h2 className="hero-heading">Style Smarter.</h2>
          <p className="site-description">
            Upload your wardrobe, generate AI-powered outfits,
            and always dress perfectly for every occasion.
          </p>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <h2>Welcome Back</h2>
          <p className="login-subtext">Log in to access your digital wardrobe</p>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
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
              placeholder="Password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
              aria-invalid={!!error}
            />
            <button
              type="submit"
              className="button-primary button-full"
              disabled={loading}
            >
              {loading ? "Signing in…" : "Login"}
            </button>
          </form>

          <p className="signup-text">
            Don&apos;t have an account?
            <Link to="/signup"> Create one</Link>
          </p>
        </div>
      </div>

      <div className="login-background">
        <img src="/closetpic.jpg" alt="" />
      </div>

      <div className="login-footer">ENSF 400 — Group 12 Project</div>
    </div>
  );
}

export default Login;
