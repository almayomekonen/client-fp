import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import {
  FaHome,
  FaTasks,
  FaUsers,
  FaPalette,
  FaMicroscope,
  FaEdit,
  FaChartBar,
  FaFileAlt,
  FaSignOutAlt,
  FaChevronLeft,
  FaChevronRight,
  FaCrown,
  FaUserTie,
  FaPencilAlt,
} from "react-icons/fa";
import "./Sidebar.css";

const Sidebar = ({ role, onLogout }) => {
  const [isOpen, setIsOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useData();

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    navigate("/");
  };

  // Define menu items based on role
  const getMenuItems = () => {
    const commonItems = [];

    if (role === "admin") {
      return [
        { path: "/adminHome", icon: <FaHome />, label: "All Experiments" },
        { path: "/task-management", icon: <FaTasks />, label: "All Tasks" },
        { path: "/admin-panel", icon: <FaUsers />, label: "User Management" },
        {
          path: "/manage-colors",
          icon: <FaPalette />,
          label: "Color Management",
        },
        {
          path: "/investigatorHome",
          icon: <FaMicroscope />,
          label: "My Experiments",
        },
        { path: "/coderHome", icon: <FaEdit />, label: "My Codings" },
        {
          path: "/task-investigator",
          icon: <FaChartBar />,
          label: "Tasks I Created",
        },
        { path: "/task-coder", icon: <FaFileAlt />, label: "My Tasks" },
      ];
    }

    if (role === "investigator") {
      return [
        {
          path: "/investigatorHome",
          icon: <FaMicroscope />,
          label: "My Experiments",
        },
        { path: "/coderHome", icon: <FaEdit />, label: "My Codings" },
        {
          path: "/task-investigator",
          icon: <FaChartBar />,
          label: "Tasks I Created",
        },
        { path: "/task-coder", icon: <FaFileAlt />, label: "My Tasks" },
      ];
    }

    if (role === "coder") {
      return [
        { path: "/coderHome", icon: <FaEdit />, label: "My Codings" },
        { path: "/task-coder", icon: <FaFileAlt />, label: "My Tasks" },
      ];
    }

    return commonItems;
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* Toggle Button */}
      <button
        className={`sidebar-toggle ${isOpen ? "open" : "closed"}`}
        onClick={toggleSidebar}
        aria-label={isOpen ? "Close menu" : "Open menu"}
      >
        {isOpen ? <FaChevronLeft /> : <FaChevronRight />}
      </button>

      {/* Sidebar */}
      <div className={`sidebar ${isOpen ? "open" : "closed"}`}>
        <div className="sidebar-header">
          {isOpen ? (
            <>
              <div className="sidebar-user-section">
                <div className="sidebar-avatar">
                  {role === "admin" && <FaCrown />}
                  {role === "investigator" && <FaUserTie />}
                  {role === "coder" && <FaPencilAlt />}
                </div>
                <div className="sidebar-user-info">
                  <div className="sidebar-username">
                    {currentUser?.username}
                  </div>
                  <div className="sidebar-role-badge">
                    {role === "admin" && "Admin"}
                    {role === "investigator" && "Researcher"}
                    {role === "coder" && "Coder"}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="sidebar-avatar-small">
              {role === "admin" && <FaCrown />}
              {role === "investigator" && <FaUserTie />}
              {role === "coder" && <FaPencilAlt />}
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item, index) => (
            <Link
              key={index}
              to={item.path}
              className={`sidebar-link ${
                location.pathname === item.path ? "active" : ""
              }`}
              title={!isOpen ? item.label : ""}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {isOpen && <span className="sidebar-label">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button
            className="sidebar-logout"
            onClick={handleLogout}
            title={!isOpen ? "Logout" : ""}
          >
            <span className="sidebar-icon">
              <FaSignOutAlt />
            </span>
            {isOpen && <span className="sidebar-label">Logout</span>}
          </button>
        </div>
      </div>

      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar} />}
    </>
  );
};

export default Sidebar;
