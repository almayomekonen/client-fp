import React, { useState } from "react";

export default function ResetPasswordForm({ onSubmit }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      alert("Passwords do not match");
      return;
    }
    onSubmit(newPassword);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>New Password</label>
        <br />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>

      <div>
        <label>Confirm New Password</label>
        <br />
        <input
          type="password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
        />
      </div>

      <button type="submit">Change Password</button>
    </form>
  );
}
