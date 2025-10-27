import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useRef,
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
      console.error("❌ Error fetching copies:", error.message || error);
      // Don't clear data on error - keep existing data
    }
  }, [setCopies]);

  const refreshTasks = useCallback(async () => {
    try {
      const tasks = await fetchTasksFromServer();
      setTasks(tasks);
    } catch (error) {
      console.error("❌ Error fetching tasks:", error.message || error);
      // Don't clear data on error
    }
  }, [setTasks]);

  const refreshUsers = useCallback(async () => {
    try {
      const users = await fetchUsersFromServer();
      setUsers(users);
      return users;
    } catch (error) {
      console.error("❌ Error fetching users:", error);
      // Don't clear the users list on error - keep the old data
      // This prevents the UI from showing empty while there's an error
      throw error; // Re-throw so caller knows there was an error
    }
  }, [setUsers]);

  const refreshRegistrationRequests = useCallback(async () => {
    try {
      const registrationRequests = await fetchRegistrationRequests();
      setRegistrationRequests(registrationRequests);
    } catch (error) {
      console.error(
        "❌ Error fetching registration requests:",
        error.message || error
      );
      // Don't clear data on error
    }
  }, [setRegistrationRequests]);

  const refreshCopyMessages = useCallback(async () => {
    try {
      const copyMessages = await fetchCopyMessagesFromServer();
      setCopyMessages(copyMessages);
    } catch (error) {
      console.error("❌ Error fetching copy messages:", error.message || error);
      // Don't clear data on error
    }
  }, [setCopyMessages]);

  const refreshTaskMessages = useCallback(async () => {
    try {
      const taskMessages = await fetchTaskMessagesFromServer();
      setTaskMessages(taskMessages);
    } catch (error) {
      console.error("❌ Error fetching task messages:", error.message || error);
      // Don't clear data on error
    }
  }, [setTaskMessages]);

  // Track if data has been loaded to prevent duplicate loads
  const hasLoadedData = useRef(false);
  const currentUserId = useRef(null);

  useEffect(() => {
    // רק אם האותנטיקציה נבדקה והמשתמש מחובר
    if (isAuthChecked && currentUser?._id) {
      // Only load if we haven't loaded for this user yet
      if (currentUserId.current !== currentUser._id) {
        currentUserId.current = currentUser._id;
        hasLoadedData.current = false;
      }

      if (!hasLoadedData.current) {
        hasLoadedData.current = true;
        console.log("🔄 Loading initial data for user:", currentUser._id);

        // Load data sequentially with small delays to avoid overwhelming the server
        const loadData = async () => {
          try {
            await refreshUsers();
            await refreshCopies();
            await refreshTasks();
            await refreshRegistrationRequests();
            await refreshCopyMessages();
            await refreshTaskMessages();
            console.log("✅ Initial data loaded successfully");
          } catch (err) {
            console.error("❌ Error loading initial data:", err);
            hasLoadedData.current = false; // Reset on error so it can retry
          }
        };
        loadData();
      }
    } else if (!currentUser) {
      // Reset when user logs out
      hasLoadedData.current = false;
      currentUserId.current = null;
    }
    // Only run when auth state changes, not when functions change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthChecked, currentUser?._id]);

  const refreshAll = useCallback(async () => {
    console.log("🔄 Refreshing all data...");
    await Promise.all([
      refreshCopies(),
      refreshTasks(),
      refreshUsers(),
      refreshRegistrationRequests(),
      refreshCopyMessages(),
      refreshTaskMessages(),
    ]);
    console.log("✅ All data refreshed");
  }, [
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
        refreshAll,
      }}
    >
      {children}
    </RefreshContext.Provider>
  );
}
