import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar">

      <div className="logo">
        ClosetAI
      </div>

      <div className="nav-links">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/generate">Generate Outfit</Link>
        <Link to="/favorites">Favorites</Link>
      </div>

    </nav>
  );
}

export default Navbar;