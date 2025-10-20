import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUsers } from "../../context/UserContext";
import { useData } from "../../context/DataContext";
import LoginForm from "../../components/Auth/LoginForm";
import "../../styles/Auth.css";

export default function LoginPage() {
  const { login } = useUsers();
  const { setCurrentUser } = useData();

  const navigate = useNavigate();

  const [message, setMessage] = useState("");

  const handleLogin = async (username, password) => {
    const result = await login(username, password);
    if (!result.success) {
      setMessage(result.message);
    } else {
      setCurrentUser(result.user);

      localStorage.setItem("currentUser", JSON.stringify(result.user));

      switch (result.user.role) {
        case "coder":
          navigate("/coderHome");
          break;
        case "investigator":
          navigate("/investigatorHome");
          break;
        case "admin":
          navigate("/adminHome");
          break;
        default:
          navigate("/");
      }
    }
  };

  const handleForgotPassword = () => {
    navigate("/reset-password");
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">🔐</div>
          <h1 className="auth-title">התחברות</h1>
          <p className="auth-subtitle">היכנס למערכת הקידוד</p>
        </div>

        <LoginForm
          onSubmit={handleLogin}
          onForgotPassword={handleForgotPassword}
        />

        {message && (
          <div
            className={`auth-message ${
              message.includes("שגיאה") ? "error" : "info"
            }`}
          >
            {message}
          </div>
        )}

        <div className="auth-link">
          אין לך חשבון? <Link to="/register">לחץ כאן להרשמה</Link>
        </div>
      </div>
    </div>
  );
}
