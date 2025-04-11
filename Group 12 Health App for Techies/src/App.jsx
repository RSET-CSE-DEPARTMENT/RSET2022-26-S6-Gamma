import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/authContext";
import RootLayout from "./layout/RootLayout";
import Dashboard from "./pages/Dashboard";
import PostureCorrector from "./components/PostureCorrector";
import PredictiveAnalytics from "./pages/PredictiveAnalytics";
import SettingsPage from "./pages/SettingsPage";
import Ergonomics from "./components/Ergonomics";
import IntroPage from "./components/IntroPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";

import './App.css';

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!currentUser) {
    // Redirect to login but remember where they came from
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

const AuthWrapper = ({ children }) => {
  const { loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">
      <LoadingSpinner />
    </div>;
  }

  return children;
};
function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<IntroPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          
          {/* Protected routes wrapped in RootLayout */}
          <Route element={
            <ProtectedRoute>
              <RootLayout />
            </ProtectedRoute>
          }>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/posture" element={<PostureCorrector />} />
            <Route path="/analytics" element={<PredictiveAnalytics />} />
            <Route path="/ergonomics" element={<Ergonomics />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}
export default App;