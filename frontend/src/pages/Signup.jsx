// Signup page for creating new accounts

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { authFetch } from "../config/api";

function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch("/api/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Signup failed.");
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
    <div className="signup-page">
      <div className="signup-card">
        <h1>Create Your ClosetAI Account</h1>
        <p className="signup-subtext">
          Start building your digital wardrobe and get AI outfit recommendations.
        </p>
        <form onSubmit={handleSignup}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
          {error && <p className="signup-error" role="alert">{error}</p>}
          <button
            type="submit"
            className="button-primary"
            disabled={loading}
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Signup;