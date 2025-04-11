import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/authContext";

const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>; // Show loading state
  }

  if (!currentUser) {
    // Redirect to login but remember where they came from
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;