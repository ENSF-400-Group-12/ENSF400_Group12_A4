import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";

function Login() {

  const navigate = useNavigate();

  function handleLogin() {
    navigate("/dashboard");
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

          <input
            type="email"
            placeholder="Email"
            className="input-field"
          />

          <input
            type="password"
            placeholder="Password"
            className="input-field"
          />

          <button
            className="button-primary"
            onClick={handleLogin}
          >
            Login
          </button>

          <p className="signup-text">
            Don't have an account?
            <Link to="/signup"> Create one</Link>
          </p>

        </div>

      </div>


      {/* Background image */}
      <div className="login-background">

        <img
          src="/closetpic.png"
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