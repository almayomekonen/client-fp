import React from "react";
import { Navigate } from "react-router-dom";
import { useData } from "../context/DataContext";

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { currentUser, isAuthChecked } = useData();

  // If still checking authentication, show loading
  if (!isAuthChecked) {
    return (
      <div
        className="loading-container"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
        }}
      >
        <div>Loading...</div>
      </div>
    );
  }

  // If no user logged in, redirect to login
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // If specific role required and user doesn't have it
  if (requiredRole && currentUser.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
