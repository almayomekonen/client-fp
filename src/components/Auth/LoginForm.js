// src/components/Auth/LoginForm.jsx
import React, { useState } from 'react';

export default function LoginForm({ onSubmit, onForgotPassword }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = e => {
    e.preventDefault();
    onSubmit(username, password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>שם משתמש</label><br />
        <input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
      </div>

      <div>
        <label>סיסמה</label><br />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
      </div>

      <button type="submit">התחבר</button><br /><br />
      <button type="button" onClick={onForgotPassword}>
        שכחתי סיסמה
      </button>
    </form>
  );
}
