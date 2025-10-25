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
  const { refreshUsers } = useRefresh(); // Refresh the users list
  const navigate = useNavigate(); // Navigate to the previous page

  const { users, setCurrentUser } = useData(); // Get the users list and set the current user

  const login = async (username, password) => {
    const result = await loginService(username, password); // Login the user

    if (result.success) {
      setCurrentUser(result.user); // Set the current user
      localStorage.setItem("currentUser", JSON.stringify(result.user));
    }

    return result; // Return the result
  };
  const resetPassword = async (userId, password) => {
    const result = await updateUserOnServerService(userId, {
      newPassword: password,
    }); // Reset the password
    await refreshUsers(); // Refresh the users list
    return result; // Return the result
  };

  const logout = () => {
    logoutService(setCurrentUser, navigate); // Logout the user
  };

  const deleteUser = async (id) => {
    try {
      console.log("🗑️ Deleting user:", id); // Delete the user
      const result = await deleteUserFromServerService(id); // Delete the user from the server
      console.log("✅ User deleted successfully:", result);

      // Wait a tiny bit for the server to finish the cascade delete
      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait a tiny bit for the server to finish the cascade delete

      // Refresh the users list
      console.log("🔄 Refreshing users list...");
      try {
        await refreshUsers();
        console.log("✅ Users list refreshed");
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
