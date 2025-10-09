import React, { useState } from 'react';

export default function ResetPasswordForm({ onSubmit }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) {
      alert('הסיסמאות אינן תואמות');
      return;
    }
    onSubmit(newPassword);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>סיסמה חדשה</label><br />
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>

      <div>
        <label>אימות סיסמה חדשה</label><br />
        <input
          type="password"
          value={confirmNewPassword}
          onChange={(e) => setConfirmNewPassword(e.target.value)}
        />
      </div>

      <button type="submit">שנה סיסמה</button>
    </form>
  );
}
