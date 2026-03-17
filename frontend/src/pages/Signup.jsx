// Signup page for creating new accounts

import { useNavigate } from "react-router-dom";

function Signup() {

  const navigate = useNavigate();

  function handleSignup() {


    // For now we simulate success
    navigate("/dashboard");

  }

  return (

    <div className="signup-page">

      <div className="signup-card">

        <h1>Create Your ClosetAI Account</h1>

        <p className="signup-subtext">
          Start building your digital wardrobe and get AI outfit recommendations.
        </p>

        <input type="email" placeholder="Email" />

        <input type="password" placeholder="Password" />

        <input type="password" placeholder="Confirm Password" />

        <button
          className="button-primary"
          onClick={handleSignup}
        >
          Create Account
        </button>

      </div>

    </div>

  );

}

export default Signup;