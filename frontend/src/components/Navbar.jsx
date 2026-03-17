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
        <Link to="/dashboard">ClosetAI</Link>
      </div>

      <div className="nav-links">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/add-item">Add Item</Link>
        <Link to="/generate">Generate Outfit</Link>
        <Link to="/favorites">Favorites</Link>
        <Link to="/admin">Admin</Link>
        <Link to="/profile">Profile</Link>
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
