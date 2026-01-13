// src/components/Auth/LoginForm.jsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaSignInAlt, FaKey } from "react-icons/fa";

export default function LoginForm({ onSubmit }) {
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

      <div style={{ marginTop: "15px", textAlign: "center" }}>
        <Link
          to="/reset-password"
          style={{ color: "#666", textDecoration: "none", fontSize: "14px" }}
        >
          <FaKey style={{ marginRight: "5px" }} />
          Forgot Passwords
        </Link>
      </div>
    </form>
  );
}
