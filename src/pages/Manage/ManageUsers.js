// src/pages/RequestsApprovalPanel.jsx
import React, { useEffect } from "react";
import { useUsers } from "../../context/UserContext";
import { useData } from "../../context/DataContext";
import { useNavigate } from "react-router-dom";
import { FaUsers, FaUserCheck, FaUserTimes } from "react-icons/fa";
import RegistrationRequestsList from "../../components/Admin/RegistrationRequestsList";
import UserListForDeletion from "../../components/Admin/UserListForDeletion";
import { useRegistrations } from "../../context/RegistrationContext";
import "../../styles/Dashboard.css";

export default function RequestsApprovalPanel() {
  const { deleteUser, updateUserRole } = useUsers();

  const { approveRegistration, rejectRegistration } = useRegistrations();

  const { users, registrationRequests, currentUser, isAuthChecked } = useData();

  const deletableUsers = users.filter((u) => u.role !== "admin");

  const navigate = useNavigate();

  useEffect(() => {
    // Only redirect after auth check is complete
    if (isAuthChecked && !currentUser) {
      navigate("/", { replace: true });
    }
  }, [currentUser, isAuthChecked, navigate]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          <FaUsers /> User Management
        </h1>
        <p className="dashboard-subtitle">
          Approve registration requests and manage existing users
        </p>
      </div>

      <div className="dashboard-card">
        <div className="card-header">
          <h2 className="card-title">
            <FaUserCheck /> Pending Registration Requests
          </h2>
        </div>
        <div className="card-content">
          <RegistrationRequestsList
            registrationRequests={registrationRequests}
            onApprove={approveRegistration}
            onReject={rejectRegistration}
          />
        </div>
      </div>

      <div className="dashboard-card">
        <div className="card-header">
          <h2 className="card-title">
            <FaUserTimes /> Manage Existing Users
          </h2>
        </div>
        <div className="card-content">
          <UserListForDeletion
            users={deletableUsers}
            onDelete={deleteUser}
            onUpdateRole={updateUserRole}
          />
        </div>
      </div>
    </div>
  );
}
