// src/components/Auth/LoginForm.jsx
import React, { useState } from "react";

export default function LoginForm({ onSubmit, onForgotPassword }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(username, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Username</label>
        <br />
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div>
        <label>Password</label>
        <br />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button type="submit">Login</button>
      <br />
      <br />
      <button type="button" onClick={onForgotPassword}>
        Forgot Password
      </button>
    </form>
  );
}
