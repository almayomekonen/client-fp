import React from "react";
import { useData } from "../context/DataContext";
import { useUsers } from "../context/UserContext";
import Sidebar from "./Sidebar";
import "./Layout.css";

const Layout = ({ children }) => {
  const { currentUser } = useData();
  const { logout } = useUsers();

  if (!currentUser) {
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
