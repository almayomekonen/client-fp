import React, { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useUsers } from "../context/UserContext";
import { useData } from "../context/DataContext";
import "./Navbar.css";

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useUsers();
  const { currentUser, isAuthChecked } = useData();

  const publicPaths = ["/", "/register", "/reset-password"];
  const isPublicPage = publicPaths.includes(location.pathname);

  useEffect(() => {
    if (isAuthChecked && !currentUser && !isPublicPage) {
      navigate("/");
    }
  }, [currentUser, isAuthChecked, location.pathname, navigate, isPublicPage]);

  if (isPublicPage) return null;

  const handleLogout = () => {
    logout();
  };

  const getRoleName = (role) => {
    if (role === "admin") return "👑 Admin";
    if (role === "investigator") return "🔬 Researcher";
    if (role === "coder") return "✏️ Coder";
    return "";
  };

  const renderLinks = () => {
    const role = currentUser?.role;
    const links = [];

    if (role === "admin") {
      links.push(
        <Link key="adminHome" to="/adminHome" className="navbar-link">
          <span className="navbar-icon">🏠</span>
          <span className="navbar-text">Home</span>
        </Link>,
        <Link
          key="investigatorHome"
          to="/investigatorHome"
          className="navbar-link"
        >
          <span className="navbar-icon">🔬</span>
          <span className="navbar-text">My Experiments</span>
        </Link>,
        <Link key="coderHome" to="/coderHome" className="navbar-link">
          <span className="navbar-icon">✏️</span>
          <span className="navbar-text">My Codings</span>
        </Link>,
        <Link key="admin-panel" to="/admin-panel" className="navbar-link">
          <span className="navbar-icon">👥</span>
          <span className="navbar-text">User Management</span>
        </Link>,
        <Link
          key="task-management"
          to="/task-management"
          className="navbar-link"
        >
          <span className="navbar-icon">📋</span>
          <span className="navbar-text">All Tasks</span>
        </Link>,
        <Link
          key="task-investigator"
          to="/task-investigator"
          className="navbar-link"
        >
          <span className="navbar-icon">📊</span>
          <span className="navbar-text">Tasks I Created</span>
        </Link>,
        <Link key="manage-colors" to="/manage-colors" className="navbar-link">
          <span className="navbar-icon">🎨</span>
          <span className="navbar-text">Color Management</span>
        </Link>,
        <Link key="task-coder" to="/task-coder" className="navbar-link">
          <span className="navbar-icon">📝</span>
          <span className="navbar-text">My Tasks</span>
        </Link>
      );
    }

    if (role === "investigator") {
      links.push(
        <Link
          key="investigatorHome"
          to="/investigatorHome"
          className="navbar-link"
        >
          <span className="navbar-icon">🏠</span>
          <span className="navbar-text">Home</span>
        </Link>,
        <Link key="coderHome" to="/coderHome" className="navbar-link">
          <span className="navbar-icon">✏️</span>
          <span className="navbar-text">My Codings</span>
        </Link>,
        <Link
          key="task-investigator"
          to="/task-investigator"
          className="navbar-link"
        >
          <span className="navbar-icon">📊</span>
          <span className="navbar-text">Tasks I Created</span>
        </Link>,
        <Link key="task-coder" to="/task-coder" className="navbar-link">
          <span className="navbar-icon">📝</span>
          <span className="navbar-text">My Tasks</span>
        </Link>
      );
    }

    if (role === "coder") {
      links.push(
        <Link key="coderHome" to="/coderHome" className="navbar-link">
          <span className="navbar-icon">🏠</span>
          <span className="navbar-text">Home</span>
        </Link>,
        <Link key="task-coder" to="/task-coder" className="navbar-link">
          <span className="navbar-icon">📝</span>
          <span className="navbar-text">My Tasks</span>
        </Link>
      );
    }

    return links;
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <span className="logo-icon">📊</span>
          <span className="logo-text">Coding System</span>
        </div>

        <div className="navbar-links">{renderLinks()}</div>

        <div className="navbar-user">
          {currentUser && (
            <>
              <div className="navbar-user-info">
                <span className="navbar-username">{currentUser.username}</span>
                <span className="navbar-role">
                  {getRoleName(currentUser.role)}
                </span>
              </div>
              <button onClick={handleLogout} className="navbar-logout-btn">
                <span className="navbar-icon">🚪</span>
                <span className="navbar-text">Logout</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
