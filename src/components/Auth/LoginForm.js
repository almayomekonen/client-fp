// src/components/Auth/LoginForm.jsx
import React, { useState } from "react";
import { FaSignInAlt, FaKey } from "react-icons/fa";

export default function LoginForm({ onSubmit, onForgotPassword }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(username, password);
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="auth-form-group">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="auth-input"
          required
        />
      </div>

      <div className="auth-form-group">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="auth-input"
          required
        />
      </div>

      <button type="submit" className="auth-btn">
        <FaSignInAlt /> Login
      </button>

      <button
        type="button"
        onClick={onForgotPassword}
        className="auth-btn"
        style={{ marginTop: "12px", background: "#666666" }}
      >
        <FaKey /> Forgot Password
      </button>
    </form>
  );
}
