// src/pages/RequestsApprovalPanel.jsx
import React, { useEffect } from 'react';
import { useUsers } from '../../context/UserContext';
import { useData } from '../../context/DataContext';
import { useNavigate } from 'react-router-dom';

import RegistrationRequestsList from '../../components/Admin/RegistrationRequestsList';
import UserListForDeletion from '../../components/Admin/UserListForDeletion';
import { useRegistrations } from '../../context/RegistrationContext';

export default function RequestsApprovalPanel() {
  const {

    deleteUser,
    updateUserRole
  } = useUsers();

  const {
    approveRegistration,
    rejectRegistration,
  } = useRegistrations();

  const { users, registrationRequests, currentUser } = useData();

  const deletableUsers = users.filter((u) => u.role !== 'admin'); 

    const navigate = useNavigate();

   useEffect(() => {
      if (!currentUser) {
        navigate('/', { replace: true });
      }
    }, [currentUser, navigate]);

  return (
    <div>
      <h2>בקשות הרשמה ממתינות</h2>
      <RegistrationRequestsList
        registrationRequests={registrationRequests}
        onApprove={approveRegistration}
        onReject={rejectRegistration}
      />

      <hr />

      <h2>מחיקת משתמשים ושינוי תפקיד</h2>
      <UserListForDeletion
        users={deletableUsers}
        onDelete={deleteUser}
        onUpdateRole={updateUserRole}
      />
    </div>
  );
}
