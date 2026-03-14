// Login page for ClosetAI
// Acts as the landing page for unauthenticated users

import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

function Login() {

  // React Router navigation hook
  const navigate = useNavigate();

  // Temporary login handler
  // In the future this will call the backend API
  function handleLogin() {

    // Simulate successful login
    navigate("/dashboard");

  }

  return (

    <div className="login-page">

      {/* Top hero section */}
      <div className="login-hero">

        {/* Branding text */}
        <div className="hero-text">

          <h1 className="site-title">
            ClosetAI
          </h1>

          <p className="site-tagline">
            Your personal AI-powered wardrobe assistant
          </p>

          <p className="site-description">
            Upload your clothes, generate stylish outfits,
            and always dress perfectly for any occasion.
          </p>

        </div>

        {/* Login card */}
        <div className="login-form">

          <h2>Welcome Back</h2>

          <input type="email" placeholder="Email" />

          <input type="password" placeholder="Password" />

          {/* Temporary login button */}
          <button
            className="button-primary"
            onClick={handleLogin}
          >
            Login
          </button>

          {/* Signup link */}
          <p className="signup-text">
            Don't have an account?
            <Link to="/signup"> Create one</Link>
          </p>

        </div>

      </div>

      {/* Large hero image */}
      <div className="hero-image-container">

        <img
          src="/closetpic.jpg"
          alt="Closet wardrobe"
          className="hero-image"
        />

      </div>

          {/* Project footer */}
    <div className="login-footer">
        ENSF 400 — Group 12 Project
    </div>

    </div>


  );

}

export default Login;