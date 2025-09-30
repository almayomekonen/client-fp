//DataContext.js
import React, { createContext, useContext, useState, useEffect } from "react";
import { checkAuth } from "../api/UserApi";

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

  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedUser = localStorage.getItem("currentUser");
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          setCurrentUser(userData);
        } else {
        }

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
