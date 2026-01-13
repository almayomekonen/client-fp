//DataContext.js
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { useNavigate } from "react-router-dom";
import { checkAuth } from "../api/UserApi";
import { roleChangeDetector } from "../services/RoleChangeDetector";
import { useSocket } from "./SocketContext";

const DataContext = createContext();
export const useData = () => useContext(DataContext);

export function DataProvider({ children }) {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [registrationRequests, setRegistrationRequests] = useState([]);
  const [copies, setCopies] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskMessages, setTaskMessages] = useState([]);
  const [copyMessages, setCopyMessages] = useState([]);
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const { socket } = useSocket();

  // Keep ref to currentUser for socket listeners to avoid stale closures
  const currentUserRef = useRef(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

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

  // 🔴 Real-time Socket.io listeners for copies and tasks
  useEffect(() => {
    if (!socket) {
      console.log("⚠️ Socket not available yet in DataContext");
      return;
    }

    console.log("✅ Socket.io listeners ACTIVE in DataContext", {
      socketId: socket.id,
      connected: socket.connected,
    });

    // Copy events
    const handleCopyCreated = ({ copy }) => {
      console.log("🔴 Copy created:", copy);
      setCopies((prev) => [...prev, copy]);
    };

    const handleCopyUpdated = ({ copy }) => {
      console.log("🔴 Copy updated:", copy);
      setCopies((prev) => prev.map((c) => (c._id === copy._id ? copy : c)));
    };

    const handleCopyDeleted = ({ copyId }) => {
      console.log("🔴 Copy deleted:", copyId);
      setCopies((prev) => prev.filter((c) => c._id !== copyId));
    };

    // Task events
    const handleTaskCreated = ({ task }) => {
      console.log("🔴🔴🔴 [REAL-TIME] Task CREATED via Socket.io:", task);
      setTasks((prev) => {
        const newTasks = [...prev, task];
        console.log(
          `✅ Task added! Total tasks: ${prev.length} → ${newTasks.length}`
        );
        return newTasks;
      });
    };

    const handleTaskUpdated = ({ task }) => {
      console.log("🔴🔴🔴 [REAL-TIME] Task UPDATED via Socket.io:", task);
      setTasks((prev) => {
        const updated = prev.map((t) => (t._id === task._id ? task : t));
        console.log(`✅ Task updated! ID: ${task._id}`);
        return updated;
      });
    };

    const handleTaskDeleted = ({ taskId }) => {
      console.log("🔴🔴🔴 [REAL-TIME] Task DELETED via Socket.io:", taskId);
      setTasks((prev) => {
        const filtered = prev.filter((t) => t._id !== taskId);
        console.log(
          `✅ Task deleted! Total tasks: ${prev.length} → ${filtered.length}`
        );
        return filtered;
      });
    };

    // CopyMessage events
    const handleCopyMessageCreated = ({ message }) => {
      console.log("🔴 Copy message created:", message);
      setCopyMessages((prev) => [...prev, message]);
    };

    const handleCopyMessageUpdated = ({ message }) => {
      console.log("🔴 Copy message updated:", message);
      setCopyMessages((prev) =>
        prev.map((m) => (m._id === message._id ? message : m))
      );
    };

    const handleCopyMessageDeleted = ({ messageId }) => {
      console.log("🔴 Copy message deleted:", messageId);
      setCopyMessages((prev) => prev.filter((m) => m._id !== messageId));
    };

    // TaskMessage events
    const handleTaskMessageCreated = ({ message }) => {
      console.log("🔴 Task message created:", message);
      setTaskMessages((prev) => [...prev, message]);
    };

    const handleTaskMessageUpdated = ({ message }) => {
      console.log("🔴 Task message updated:", message);
      setTaskMessages((prev) =>
        prev.map((m) => (m._id === message._id ? message : m))
      );
    };

    const handleTaskMessageDeleted = ({ messageId }) => {
      console.log("🔴 Task message deleted:", messageId);
      setTaskMessages((prev) => prev.filter((m) => m._id !== messageId));
    };

    // Registration Request events
    const handleRegistrationRequestCreated = ({ request }) => {
      console.log("🔴🔴🔴 [REAL-TIME] Registration Request CREATED:", request);
      setRegistrationRequests((prev) => {
        const newRequests = [...prev, request];
        console.log(
          `✅ Registration request added! Total: ${prev.length} → ${newRequests.length}`
        );
        return newRequests;
      });
    };

    const handleRegistrationRequestApproved = ({ requestId }) => {
      console.log(
        "🔴🔴🔴 [REAL-TIME] Registration Request APPROVED:",
        requestId
      );
      setRegistrationRequests((prev) => {
        const filtered = prev.filter((r) => r._id !== requestId);
        console.log(
          `✅ Registration request removed! Total: ${prev.length} → ${filtered.length}`
        );
        return filtered;
      });
    };

    const handleRegistrationRequestRejected = ({ requestId }) => {
      console.log(
        "🔴🔴🔴 [REAL-TIME] Registration Request REJECTED:",
        requestId
      );
      setRegistrationRequests((prev) => {
        const filtered = prev.filter((r) => r._id !== requestId);
        console.log(
          `✅ Registration request removed! Total: ${prev.length} → ${filtered.length}`
        );
        return filtered;
      });
    };

    // User events
    const handleUserCreated = ({ user }) => {
      console.log("🔴🔴🔴 [REAL-TIME] User CREATED:", user);
      setUsers((prev) => {
        const newUsers = [...prev, user];
        console.log(
          `✅ User added! Total users: ${prev.length} → ${newUsers.length}`
        );
        return newUsers;
      });
    };

    const handleUserDeleted = ({ userId }) => {
      console.log("🔴🔴🔴 [REAL-TIME] User DELETED:", userId);

      // Update users list
      setUsers((prev) => prev.filter((u) => u._id !== userId));

      // Check if current user is the one deleted
      if (currentUserRef.current && currentUserRef.current._id === userId) {
        console.warn("⚠️ Current logged-in user was deleted. Logging out...");
        alert("Your account has been deleted by an administrator.");
        setCurrentUser(null);
        localStorage.removeItem("currentUser");
        navigate("/");
      }
    };

    // Register listeners
    socket.on("copyCreated", handleCopyCreated);
    socket.on("copyUpdated", handleCopyUpdated);
    socket.on("copyDeleted", handleCopyDeleted);
    socket.on("taskCreated", handleTaskCreated);
    socket.on("taskUpdated", handleTaskUpdated);
    socket.on("taskDeleted", handleTaskDeleted);
    socket.on("copyMessageCreated", handleCopyMessageCreated);
    socket.on("copyMessageUpdated", handleCopyMessageUpdated);
    socket.on("copyMessageDeleted", handleCopyMessageDeleted);
    socket.on("taskMessageCreated", handleTaskMessageCreated);
    socket.on("taskMessageUpdated", handleTaskMessageUpdated);
    socket.on("taskMessageDeleted", handleTaskMessageDeleted);
    socket.on("registrationRequestCreated", handleRegistrationRequestCreated);
    socket.on("registrationRequestApproved", handleRegistrationRequestApproved);
    socket.on("registrationRequestRejected", handleRegistrationRequestRejected);
    socket.on("userCreated", handleUserCreated);
    socket.on("userDeleted", handleUserDeleted);

    // Cleanup
    return () => {
      socket.off("copyCreated", handleCopyCreated);
      socket.off("copyUpdated", handleCopyUpdated);
      socket.off("copyDeleted", handleCopyDeleted);
      socket.off("taskCreated", handleTaskCreated);
      socket.off("taskUpdated", handleTaskUpdated);
      socket.off("taskDeleted", handleTaskDeleted);
      socket.off("copyMessageCreated", handleCopyMessageCreated);
      socket.off("copyMessageUpdated", handleCopyMessageUpdated);
      socket.off("copyMessageDeleted", handleCopyMessageDeleted);
      socket.off("taskMessageCreated", handleTaskMessageCreated);
      socket.off("taskMessageUpdated", handleTaskMessageUpdated);
      socket.off("taskMessageDeleted", handleTaskMessageDeleted);
      socket.off(
        "registrationRequestCreated",
        handleRegistrationRequestCreated
      );
      socket.off(
        "registrationRequestApproved",
        handleRegistrationRequestApproved
      );
      socket.off(
        "registrationRequestRejected",
        handleRegistrationRequestRejected
      );
      socket.off("userCreated", handleUserCreated);
      socket.off("userDeleted", handleUserDeleted);
    };
  }, [socket]);

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
