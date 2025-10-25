// src/components/Admin/RegistrationRequestsList.jsx
import React from "react";

export default function RegistrationRequestsList({
  registrationRequests,
  onApprove,
  onReject,
}) {
  if (registrationRequests.length === 0) {
    return <p>No pending registration requests</p>;
  }

  const handleOnApprove = async (reqId) => {
    await onApprove(reqId);
  };

  const handleOnReject = async (reqId) => {
    await onReject(reqId);
  };
  return (
    <ul>
      {registrationRequests.map((req) => (
        <li key={req._id}>
          <strong>{req.username}</strong> - Requested to be:{" "}
          <strong>{req.role}</strong>
          <button onClick={() => handleOnApprove(req._id)}>Approve</button>
          <button onClick={() => handleOnReject(req._id)}>Reject</button>
        </li>
      ))}
    </ul>
  );
}
