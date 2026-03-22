import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="navbar">
      <div className="nav-logo">
        <Link to="/dashboard">
          <img src="/ClosetAI-logo-transparent.png" alt="" aria-hidden="true" />
          <span>ClosetAI</span>
        </Link>
      </div>

      <div className="nav-links">
        <Link to="/dashboard" className="nav-link nav-link--primary">Wardrobe</Link>
        <Link to="/favorites" className="nav-link">Favorites</Link>
        <Link to="/profile" className="nav-link">Profile</Link>
        {user?.email && (
          <span className="nav-user-email" title={user.email}>
            {user.email}
          </span>
        )}
        <button type="button" className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

export default Navbar;
