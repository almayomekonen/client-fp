import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useData } from "../context/DataContext";
import { useRefresh } from "../context/RefreshContext";
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
  const [isOpen] = useState(true); // Always open, removed toggle
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useData();
  const { refreshAll } = useRefresh();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
    navigate("/");
  };

  const handleNavigation = async (path) => {
    if (location.pathname === path) {
      // Already on this page, refresh data
      await refreshAll();
    } else {
      // Navigate to new page
      navigate(path);
    }
  };

  // Define menu items based on role
  const getMenuItems = () => {
    const commonItems = [];

    if (role === "admin") {
      return [
        { path: "/adminHome", icon: <FaHome />, label: "All Experiments" },
        {
          path: "/investigatorHome",
          icon: <FaMicroscope />,
          label: "My Experiments",
        },
        { path: "/coderHome", icon: <FaEdit />, label: "My Codings" },
        { path: "/task-management", icon: <FaTasks />, label: "All Tasks" },
        {
          path: "/task-investigator",
          icon: <FaChartBar />,
          label: "Tasks I Created",
        },
        { path: "/task-coder", icon: <FaFileAlt />, label: "My Tasks" },
        { path: "/admin-panel", icon: <FaUsers />, label: "User Management" },
        {
          path: "/manage-colors",
          icon: <FaPalette />,
          label: "Color Management",
        },
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

  // Get role display name and icon
  const getRoleInfo = () => {
    if (role === "admin") {
      return { name: "Admin", icon: <FaCrown /> };
    } else if (role === "investigator") {
      return { name: "Researcher", icon: <FaUserTie /> };
    } else if (role === "coder") {
      return { name: "Coder", icon: <FaPencilAlt /> };
    }
    return { name: "User", icon: <FaUserTie /> };
  };

  const roleInfo = getRoleInfo();

  return (
    <>
      {/* Sidebar - Always Open */}
      <div className={`sidebar ${isOpen ? "open" : "closed"}`}>
        {/* User Info Header */}
        <div className="sidebar-user-info">
          <div className="sidebar-user-icon">{roleInfo.icon}</div>
          <div className="sidebar-user-details">
            <div className="sidebar-user-name">{currentUser?.username || "User"}</div>
            <div className="sidebar-user-role">{roleInfo.name}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item, index) => (
            <div
              key={index}
              onClick={() => handleNavigation(item.path)}
              className={`sidebar-link ${
                location.pathname === item.path ? "active" : ""
              }`}
              title={!isOpen ? item.label : ""}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleNavigation(item.path);
                }
              }}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {isOpen && <span className="sidebar-label">{item.label}</span>}
            </div>
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
    </>
  );
};

export default Sidebar;
