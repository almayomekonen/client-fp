import React from "react";
import { Navigate } from "react-router-dom";
import { useData } from "../context/DataContext";

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { currentUser, isAuthChecked } = useData();

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

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && currentUser.role !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;
