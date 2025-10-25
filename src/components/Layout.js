import React from "react";
import { useData } from "../context/DataContext";
import { useUsers } from "../context/UserContext";
import Sidebar from "./Sidebar";
import "./Layout.css";

const Layout = ({ children }) => {
  const { currentUser, isAuthChecked } = useData();
  const { logout } = useUsers();

  // Don't show sidebar until auth is checked to prevent flash of wrong UI
  if (!isAuthChecked || !currentUser) {
    return <div className="main-content">{children}</div>;
  }

  return (
    <div className="layout-container">
      <Sidebar role={currentUser.role} onLogout={logout} />
      <div className="main-content-with-sidebar">{children}</div>
    </div>
  );
};

export default Layout;
