import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authFetch } from "../config/api";

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await authFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed.");
        setLoading(false);
        return;
      }
      navigate("/dashboard");
    } catch (err) {
      setError("Could not reach the server.");
      setLoading(false);
    }
  }

  return (

    <div className="login-page">

      {/* LEFT SIDE - Branding */}
      <div className="login-left">

        <div className="hero-text">

          <h1 className="site-title">
            ClosetAI
          </h1>

          <h2 className="hero-heading">
            Style Smarter.
          </h2>

          <p className="site-description">
            Upload your wardrobe, generate AI-powered outfits,
            and always dress perfectly for every occasion.
          </p>

        </div>

      </div>


      {/* RIGHT SIDE - Login Card */}
      <div className="login-right">

        <div className="login-card">

          <h2>Welcome Back</h2>

          <p className="login-subtext">
            Log in to access your digital wardrobe
          </p>

          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              type="password"
              placeholder="Password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && <p className="login-error" role="alert">{error}</p>}
            <button
              type="submit"
              className="button-primary"
              disabled={loading}
            >
              {loading ? "Logging in…" : "Login"}
            </button>
          </form>

          <p className="signup-text">
            Don't have an account?
            <Link to="/signup"> Create one</Link>
          </p>

        </div>

      </div>


      {/* Background image */}
      <div className="login-background">

        <img
          src="/closetpic.jpg"
          alt="Closet wardrobe"
        />

      </div>


      {/* Footer */}
      <div className="login-footer">
        ENSF 400 — Group 12 Project
      </div>

    </div>

  );

}

export default Login;