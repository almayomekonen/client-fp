import React, { createContext, useContext } from "react";
import { useRefresh } from "./RefreshContext";
import {
  register as registerService,
  approveRegistration as approveRegistrationService,
  rejectRegistration as rejectRegistrationService,
} from "../api/RegistrationApi";

const RegistrationContext = createContext();

export function RegistrationProvider({ children }) {
  const { refreshUsers, refreshRegistrationRequests } = useRefresh();

  // Register
  const register = async (username, password, confirmPassword, role, email) => {
    const result = await registerService(
      username,
      password,
      confirmPassword,
      role,
      email
    );

    if (result.success) {
      await refreshRegistrationRequests();
    }

    return result;
  };

  // Approve registration
  const approveRegistration = async (userId) => {
    await approveRegistrationService(userId);
    await refreshRegistrationRequests();
    await refreshUsers();
  };

  // Reject registration
  const rejectRegistration = async (userId) => {
    await rejectRegistrationService(userId);
    await refreshRegistrationRequests();
  };

  return (
    <RegistrationContext.Provider
      value={{
        register,
        approveRegistration,
        rejectRegistration,
      }}
    >
      {children}
    </RegistrationContext.Provider>
  );
}

export const useRegistrations = () => useContext(RegistrationContext);
