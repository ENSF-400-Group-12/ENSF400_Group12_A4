// React Router imports
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Page imports
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";

import AddItem from "./pages/AddItem";
import GenerateOutfit from "./pages/GenerateOutfit";
import Results from "./pages/Results";
import Favorites from "./pages/Favorites";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";

import Navbar from "./components/Navbar";

function App() {

  return (

    <Router>

      <Routes>

        {/* Pages WITHOUT navbar */}
        <Route path="/" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <>
              <Navbar />
              <div className="container">
                <Dashboard />
              </div>
            </>
          }
        />

      
        <Route path="/add-item" element={<AddItem />} />
        <Route path="/generate" element={<GenerateOutfit />} />
        <Route path="/results" element={<Results />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/profile" element={<Profile />} />


      </Routes>

    </Router>

  );

}

export default App;