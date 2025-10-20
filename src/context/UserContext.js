import React, { createContext, useContext } from "react";
import { useData } from "./DataContext";
import { useRefresh } from "./RefreshContext";

import {
  updateUserOnServer as updateUserOnServerService,
  deleteUserFromServer as deleteUserFromServerService,
  login as loginService,
  logout as logoutService,
} from "../api/UserApi";
const UserContext = createContext();

export function UserProvider({ children }) {
  const { refreshUsers } = useRefresh();

  const { users, setCurrentUser } = useData();

  const login = async (username, password) => {
    const result = await loginService(username, password);

    if (result.success) {
      setCurrentUser(result.user);
      localStorage.setItem("currentUser", JSON.stringify(result.user));
    }

    return result;
  };
  const resetPassword = async (userId, password) => {
    const result = await updateUserOnServerService(userId, {
      newPassword: password,
    });
    await refreshUsers();
    return result;
  };

  const logout = () => {
    logoutService(setCurrentUser);
  };

  const deleteUser = async (id) => {
    const result = await deleteUserFromServerService(id);
    await refreshUsers();
    return result;
  };

  const userById = (userId) => {
    return users.find((u) => u._id === userId);
  };

  const updateUserRole = async (userId, newRole) => {
    await updateUserOnServerService(userId, { role: newRole });
    await refreshUsers();
  };

  return (
    <UserContext.Provider
      value={{
        login,
        resetPassword,
        logout,
        deleteUser,
        userById,
        updateUserRole,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUsers = () => useContext(UserContext);
