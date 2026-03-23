import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Splash from './pages/Splash'; 
import HomePage from './pages/HomePage'; 
import Signup from "./pages/Signup";

//import DashboardPage from './components/VeridianDashboard'; // Assuming you keep the dashboard component for later

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. Define the root path ("/") to show the new FrontPage */}
        <Route path="/" element={<Splash />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/signup" element={<Signup />} />

        {/* Optional: Catch-all route for 404s */}
        <Route 
          path="*" 
          element={
            <div className="text-center p-20">
              <h1 className="text-4xl">404 - Page Not Found</h1>
            </div>
          } 
        />
      </Routes>
    </BrowserRouter>
  );
};

export default App;