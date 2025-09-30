import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
} from "react";
import { useData } from "./DataContext";
import { fetchCopiesFromServer } from "../api/CopyApi";
import { fetchTasksFromServer } from "../api/TaskApi";
import { fetchUsersFromServer } from "../api/UserApi";
import { fetchCopyMessagesFromServer } from "../api/CopyMessageApi";
import { fetchTaskMessagesFromServer } from "../api/TaskMessageApi";
import { fetchRegistrationRequests } from "../api/RegistrationApi";

const RefreshContext = createContext();
export const useRefresh = () => useContext(RefreshContext);

export function RefreshProvider({ children }) {
  const {
    setCopies,
    setTasks,
    setUsers,
    setRegistrationRequests,
    setCopyMessages,
    setTaskMessages,
    currentUser,
    isAuthChecked,
  } = useData();

  const refreshCopies = useCallback(async () => {
    try {
      const copies = await fetchCopiesFromServer();
      setCopies(copies);
    } catch (error) {
      console.error("Error fetching copies:", error);
      setCopies([]);
    }
  }, [setCopies]);

  const refreshTasks = useCallback(async () => {
    try {
      const tasks = await fetchTasksFromServer();
      setTasks(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setTasks([]);
    }
  }, [setTasks]);

  const refreshUsers = useCallback(async () => {
    try {
      const users = await fetchUsersFromServer();
      setUsers(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      setUsers([]);
    }
  }, [setUsers]);

  const refreshRegistrationRequests = useCallback(async () => {
    try {
      const registrationRequests = await fetchRegistrationRequests();
      setRegistrationRequests(registrationRequests);
    } catch (error) {
      console.error("Error fetching registration requests:", error);
      setRegistrationRequests([]);
    }
  }, [setRegistrationRequests]);

  const refreshCopyMessages = useCallback(async () => {
    try {
      const copyMessages = await fetchCopyMessagesFromServer();
      setCopyMessages(copyMessages);
    } catch (error) {
      console.error("Error fetching copy messages:", error);
      setCopyMessages([]);
    }
  }, [setCopyMessages]);

  const refreshTaskMessages = useCallback(async () => {
    try {
      const taskMessages = await fetchTaskMessagesFromServer();
      setTaskMessages(taskMessages);
    } catch (error) {
      console.error("Error fetching task messages:", error);
      setTaskMessages([]);
    }
  }, [setTaskMessages]);

  useEffect(() => {
    // רק אם האותנטיקציה נבדקה והמשתמש מחובר
    if (isAuthChecked && currentUser) {
      refreshCopies();
      refreshTasks();
      refreshUsers();
      refreshRegistrationRequests();
      refreshCopyMessages();
      refreshTaskMessages();
    }
  }, [
    isAuthChecked,
    currentUser,
    refreshCopies,
    refreshTasks,
    refreshUsers,
    refreshRegistrationRequests,
    refreshCopyMessages,
    refreshTaskMessages,
  ]);

  return (
    <RefreshContext.Provider
      value={{
        refreshCopies,
        refreshTasks,
        refreshUsers,
        refreshRegistrationRequests,
        refreshCopyMessages,
        refreshTaskMessages,
      }}
    >
      {children}
    </RefreshContext.Provider>
  );
}
