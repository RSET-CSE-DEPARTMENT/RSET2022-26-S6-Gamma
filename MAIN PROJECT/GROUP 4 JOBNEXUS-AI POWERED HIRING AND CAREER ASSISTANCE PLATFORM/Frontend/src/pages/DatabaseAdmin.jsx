import React from "react";
import { Navigate } from "react-router-dom";

export default function DatabaseAdmin() {
  return <Navigate to="/database-admin/users" replace />;
}
