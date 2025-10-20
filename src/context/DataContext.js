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
  }, [currentUser]);

  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log("🔍 Checking authentication...");

        // 🔥 תמיד בודק עם השרת, לא תלוי ב-localStorage
        const authResult = await checkAuth();

        if (authResult.success) {
          console.log("✅ User authenticated:", authResult.user);
          setCurrentUser(authResult.user);
          // שמור ב-localStorage רק לשיפור UX (לא מקור האמת!)
          localStorage.setItem("currentUser", JSON.stringify(authResult.user));
        } else {
          console.log("❌ User not authenticated");
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
