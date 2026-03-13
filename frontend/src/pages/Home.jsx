import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="home">

      <div className="hero">

        <h1>Style Smarter with ClosetAI</h1>

        <p>
          Upload your wardrobe and let AI create
          the perfect outfit for any occasion.
        </p>

        <div className="hero-buttons">

          <Link to="/signup">
            <button className="button-primary">
              Get Started
            </button>
          </Link>

          <Link to="/login">
            <button className="button-secondary">
              Log In
            </button>
          </Link>

        </div>

      </div>

    </div>
  );
}

export default Home;