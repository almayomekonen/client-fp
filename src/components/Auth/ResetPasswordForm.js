import React, { useState } from "react";
import { FaSave } from "react-icons/fa";
import "../../styles/Auth.css";

export default function ResetPasswordForm({ onSubmit }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage(""); // Clear previous errors

    if (newPassword !== confirmNewPassword) {
      setErrorMessage("❌ Passwords do not match");
      return;
    }

    const regex = /^(?=.*[a-z])(?=.*[A-Z]).{8,}$/;
    if (!regex.test(newPassword)) {
      setErrorMessage(
        "❌ Password must be at least 8 characters long and contain both uppercase and lowercase English letters."
      );
      return;
    }

    onSubmit(newPassword);
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="auth-form-group">
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="New Password"
          className="auth-input"
          required
        />
      </div>

      <div className="auth-form-group">
        <input
          type="password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          placeholder="Confirm New Password"
          className="auth-input"
          required
        />
      </div>

      <button type="submit" className="auth-btn">
        <FaSave /> Change Password
      </button>

      {errorMessage && (
        <div className="auth-message error" style={{ marginTop: "15px" }}>
          {errorMessage}
        </div>
      )}
    </form>
  );
}
