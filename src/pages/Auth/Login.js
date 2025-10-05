// src/pages/LoginPage.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUsers } from "../../context/UserContext";
import { useData } from "../../context/DataContext";
import LoginForm from "../../components/Auth/LoginForm";

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
    <div className="login-page">
      <h2>Login</h2>

      <LoginForm
        onSubmit={handleLogin}
        onForgotPassword={handleForgotPassword}
      />

      {message && <p className="form-message">{message}</p>}

      <p>
        Don't have an account?{" "}
        <Link to="/register">Click here to register</Link>
      </p>
    </div>
  );
}
