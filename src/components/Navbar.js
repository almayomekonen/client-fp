import React, { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useUsers } from "../context/UserContext";
import { useData } from "../context/DataContext";

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

  const renderLinks = () => {
    const role = currentUser?.role;
    const links = [];

    if (role === "admin") {
      links.push(
        <Link key="adminHome" to="/adminHome" style={{ marginLeft: "10px" }}>
          בית
        </Link>,
        <Link
          key="investigatorHome"
          to="/investigatorHome"
          style={{ marginLeft: "10px" }}
        >
          הניסויים שלי
        </Link>,
        <Link key="coderHome" to="/coderHome" style={{ marginLeft: "10px" }}>
          הקידודים שלי
        </Link>,
        <Link
          key="admin-panel"
          to="/admin-panel"
          style={{ marginLeft: "10px" }}
        >
          ניהול משתמשים
        </Link>,
        <Link
          key="task-management"
          to="/task-management"
          style={{ marginLeft: "10px" }}
        >
          כל המשימות
        </Link>,
        <Link
          key="task-investigator"
          to="/task-investigator"
          style={{ marginLeft: "10px" }}
        >
          המשימות שיצרתי
        </Link>,
        <Link
          key="manage-colors"
          to="/manage-colors"
          style={{ marginLeft: "10px" }}
        >
          {" "}
          ניהול צבעים
        </Link>,
        <Link key="task-coder" to="/task-coder" style={{ marginLeft: "10px" }}>
          המשימות שלי
        </Link>
      );
    }

    if (role === "investigator") {
      links.push(
        <Link
          key="investigatorHome"
          to="/investigatorHome"
          style={{ marginLeft: "10px" }}
        >
          בית
        </Link>,
        <Link key="coderHome" to="/coderHome" style={{ marginLeft: "10px" }}>
          הקידודים שלי
        </Link>,
        <Link
          key="task-investigator"
          to="/task-investigator"
          style={{ marginLeft: "10px" }}
        >
          המשימות שיצרתי
        </Link>,
        <Link key="task-coder" to="/task-coder" style={{ marginLeft: "10px" }}>
          המשימות שלי
        </Link>
      );
    }

    if (role === "coder") {
      links.push(
        <Link key="coderHome" to="/coderHome" style={{ marginLeft: "10px" }}>
          בית
        </Link>,
        <Link key="task-coder" to="/task-coder" style={{ marginLeft: "10px" }}>
          המשימות שלי
        </Link>
      );
    }

    return links;
  };

  return (
    <nav
      style={{
        padding: "10px",
        background: "#eee",
        display: "flex",
        alignItems: "center",
      }}
    >
      {renderLinks()}

      {currentUser && (
        <button
          onClick={handleLogout}
          style={{ marginLeft: "auto", padding: "5px 10px" }}
        >
          התנתק
        </button>
      )}
    </nav>
  );
}

export default Navbar;
