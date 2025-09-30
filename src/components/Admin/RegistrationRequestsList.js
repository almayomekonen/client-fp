// src/components/Admin/RegistrationRequestsList.jsx
import React from 'react';

export default function RegistrationRequestsList({ registrationRequests, onApprove, onReject }) {
  if (registrationRequests.length === 0) {
    return <p>אין בקשות הרשמה ממתינות</p>;
  }

  const handleOnApprove = async(reqId)=> {
    await onApprove(reqId);
  }

  const handleOnReject = async(reqId)=> {
    await onReject(reqId);
  }
  return (
    <ul>
      {registrationRequests.map((req) => (
        <li key={req._id}>
          <strong>{req.username}</strong> - ביקש להיות: <strong>{req.role}</strong>
          <button onClick={() =>  handleOnApprove(req._id)}>אשר</button>
          <button onClick={() =>  handleOnReject(req._id)}>דחה</button>
        </li>
      ))}
    </ul>
  );
}
