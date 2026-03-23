import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import UserSelection from "./components/UserSelection";
import StudentDashboard from "./components/StudentDashboard";
import AdminDashboard from "./components/AdminDashboard";
import NotesPage from "./components/NotesPage";
import LoginPage from "./components/LoginPage";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLoginPage from "./components/AdminLoginPage";
import AdminOverview from "./components/AdminOverview";


function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UserSelection />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin-login" element={<AdminLoginPage />} />

        <Route
          path="/student"
          element={
            <ProtectedRoute>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notes/:subject"
          element={
            <ProtectedRoute>
              <NotesPage />
            </ProtectedRoute>
          }
        />

        <Route
         path="/admin-dashboard"
         element={
           <ProtectedRoute>
             <AdminOverview />
           </ProtectedRoute>
         }
       />
      </Routes>
    </Router>
  );
}

export default App;
