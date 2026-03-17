import { Link, useNavigate } from "react-router-dom";

function Navbar() {

  const navigate = useNavigate();

  function handleLogout() {
    navigate("/");
  }

  const userRole = "user"; // change to "admin" to test

  return (

    <div className="navbar">

      {/* Left side logo */}
      <div className="nav-logo">
        ClosetAI
      </div>

      {/* Right side navigation */}
      <div className="nav-links">

        <Link to="/dashboard">Dashboard</Link>

        <Link to="/add-item">Add Item</Link>

        <Link to="/generate">Generate Outfit</Link>

        <Link to="/favorites">Favorites</Link>

        {userRole === "admin" && (
          <Link to="/admin">Admin</Link>
        )}

        <Link to="/profile">Profile</Link>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>

      </div>

    </div>

  );

}

export default Navbar;