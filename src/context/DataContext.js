//DataContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { checkAuth } from "../api/UserApi";
import { roleChangeDetector } from "../services/RoleChangeDetector";

const DataContext = createContext();
export const useData = () => useContext(DataContext);

export function DataProvider({ children }) {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [registrationRequests, setRegistrationRequests] = useState([]);
  const [copies, setCopies] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskMessages, setTaskMessages] = useState([]);
  const [copyMessages, setCopyMessages] = useState([]);
  const [isAuthChecked, setIsAuthChecked] = useState(false);

  // ✅ Start role change detection when user logs in
  useEffect(() => {
    if (currentUser && currentUser.role) {
      roleChangeDetector.start(currentUser.role);
    } else {
      roleChangeDetector.stop();
    }

    // Cleanup on unmount
    return () => {
      roleChangeDetector.stop();
    };
    // Only run when the role actually changes, not when the user object changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.role]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedUser = localStorage.getItem("currentUser");
        if (storedUser) {
          try {
            JSON.parse(storedUser); // Just validate it's valid JSON
          } catch (e) {
            console.warn("⚠️ Invalid stored user data, clearing...");
            localStorage.removeItem("currentUser");
          }
        }

        // ✅ Server is single source of truth - check auth first
        const authResult = await checkAuth();

        if (authResult.success) {
          setCurrentUser(authResult.user);
          localStorage.setItem("currentUser", JSON.stringify(authResult.user));
        } else {
          setCurrentUser(null);
          localStorage.removeItem("currentUser");
        }
      } catch (error) {
        console.error("💥 Error checking auth:", error);
        setCurrentUser(null);
        localStorage.removeItem("currentUser");
      } finally {
        setIsAuthChecked(true);
      }
    };

    initAuth();
  }, []);

  return (
    <DataContext.Provider
      value={{
        users,
        setUsers,
        currentUser,
        setCurrentUser,
        registrationRequests,
        setRegistrationRequests,
        copies,
        setCopies,
        tasks,
        setTasks,
        taskMessages,
        setTaskMessages,
        copyMessages,
        setCopyMessages,
        isAuthChecked,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}
