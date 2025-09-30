import React from 'react';

export default function UserListForDeletion({ users, onDelete, onUpdateRole }) {
  const handleOnDelete = async(userId)=> {
    await onDelete(userId);
  }

  const handleOnUpdateRole = async(userId, role)=> {
    await onUpdateRole(userId, role);
  }

  return (
    <div>
      {users.map((user) => (
        <div
          key={user.username}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            gap: '8px',
          }}
        >
          <span>{user.username} ({user.role})</span>

          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              value={user.role}
              onChange={(e) => handleOnUpdateRole(user._id, e.target.value)}
            >
              <option value="admin">מנהל</option>
              <option value="investigator">חוקר</option>
              <option value="coder">מקודד</option>
            </select>

            <button
              onClick={() => handleOnDelete(user._id)}
              style={{ backgroundColor: 'red', color: 'white' }}
            >
              מחק משתמש
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
