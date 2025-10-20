import React, { useState } from "react";
import { FaSave } from "react-icons/fa";

export default function ResetPasswordForm({ onSubmit }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      alert("הסיסמאות אינן תואמות");
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
          placeholder="סיסמה חדשה"
          className="auth-input"
          required
        />
      </div>

      <div className="auth-form-group">
        <input
          type="password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
          placeholder="אימות סיסמה חדשה"
          className="auth-input"
          required
        />
      </div>

      <button type="submit" className="auth-btn">
        <FaSave /> שנה סיסמה
      </button>
    </form>
  );
}
