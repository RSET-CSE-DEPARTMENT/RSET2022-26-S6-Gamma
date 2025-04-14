import { Buffer } from 'buffer';
import process from 'process';
import { Transform } from 'stream-browserify';
import React, { useState, useEffect } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios"; // Make sure to import axios
import Login from "./Login";
import Dashboard from "./Dashboard";
import AgreementDetails from "./agreementDetails";

window.Buffer = Buffer
window.process = process
window.Transform = Transform

// Configure axios defaults
axios.defaults.withCredentials = true;
axios.defaults.baseURL = 'http://localhost:5001';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is already logged in when the app loads
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get('/check-auth');
        if (response.data.authenticated) {
          // If authenticated, try to fetch user data
          try {
            const userResponse = await axios.get('/users/me');
            if (userResponse.data && userResponse.data.success) {
              setUserData(userResponse.data.user);
              setIsLoggedIn(true);
            }
          } catch (userError) {
            console.error("Failed to fetch user data:", userError);
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const handleUpdateUserData = (updatedData) => {
    setUserData(updatedData);
  };

  const handleLogout = async () => {
    try {
      await axios.post('/logout', {}, { withCredentials: true });
      setUserData(null);
      setIsLoggedIn(false);
      // Redirect to login page
      return <Navigate to="/" />;
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleLoginSuccess = (data) => {
    setIsLoggedIn(true);
    setUserData(data);
  };

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_WEB3AUTH_CLIENT_ID}>
      <Router>
        {isLoggedIn && userData ? (
          <Routes>
            <Route path="/" element={<Dashboard userData={userData} onLogout={handleLogout} onUpdateUserData={handleUpdateUserData} />} />
            <Route path="/dashboard" element={<Dashboard userData={userData} onLogout={handleLogout} onUpdateUserData={handleUpdateUserData} />} />
            <Route path="/agreements/:id" element={<AgreementDetails userData={userData} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        ) : (
          <Login onLoginSuccess={handleLoginSuccess} />
        )}
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;