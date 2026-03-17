import React from 'react';
import ReactDOM from 'react-dom/client';


// Main App component
import App from "./App";

// Global styling for the entire app
import "./styles/main.css";

// Render the React app inside the root div from index.html
const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);