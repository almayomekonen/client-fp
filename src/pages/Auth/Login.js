import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useUsers } from "../../context/UserContext";
import { useData } from "../../context/DataContext";
import LoginForm from "../../components/Auth/LoginForm";
import "../../styles/Auth.css";

export default function LoginPage() {
  const { login } = useUsers();
  const { currentUser, isAuthChecked } = useData();

  const navigate = useNavigate();
  const location = useLocation();

  const [message, setMessage] = useState("");

  // Check if there's a message from registration redirect
  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message);
      // Clear the state so message doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // If user is already authenticated, redirect to their home page
  useEffect(() => {
    if (isAuthChecked && currentUser) {
      switch (currentUser.role) {
        case "coder":
          navigate("/coderHome", { replace: true });
          break;
        case "investigator":
          navigate("/investigatorHome", { replace: true });
          break;
        case "admin":
          navigate("/adminHome", { replace: true });
          break;
        default:
          break;
      }
    }
  }, [currentUser, isAuthChecked, navigate]);

  const handleLogin = async (username, password) => {
    const result = await login(username, password);
    if (!result.success) {
      setMessage(result.message);
    } else {
      // The login function already sets currentUser and localStorage
      // Just navigate to the appropriate page based on role
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
          <h1 className="auth-title">Login</h1>
          <p className="auth-subtitle">Enter the Coding System</p>
        </div>

        <LoginForm
          onSubmit={handleLogin}
          onForgotPassword={handleForgotPassword}
        />

        {message && (
          <div
            className={`auth-message ${
              message.toLowerCase().includes("error") ? "error" : "info"
            }`}
          >
            {message}
          </div>
        )}

        <div className="auth-link">
          Don't have an account?{" "}
          <Link to="/register">Click here to register</Link>
        </div>
      </div>
    </div>
  );
}
