import React, { createContext, useContext } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate(); 

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

  const logout = async () => {
    await logoutService(setCurrentUser, navigate); 
  };

  const deleteUser = async (id) => {
    try {
   
      const result = await deleteUserFromServerService(id); 
      await new Promise((resolve) => setTimeout(resolve, 100)); 
      try {
        await refreshUsers();
      } catch (refreshError) {
        console.error(
          "⚠️ Error refreshing users list (but deletion succeeded):",
          refreshError
        );
      }

      return result;
    } catch (err) {
      console.error("❌ Error deleting user:", err);
      alert(`Error deleting user: ${err.message}`);
      throw err;
    }
  };

  const userById = (userId) => {
    return users.find((u) => u._id === userId);
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      await updateUserOnServerService(userId, { role: newRole });
      await refreshUsers();
    } catch (err) {
      console.error("Error updating user role:", err);
      throw err;
    }
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
