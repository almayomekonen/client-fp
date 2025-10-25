import React, { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { API_BASE_URL } from "../api/config";

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(API_BASE_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });

    socketInstance.on("connect", () => {
      console.log("✅ Socket.io connected:", socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on("disconnect", () => {
      console.log("❌ Socket.io disconnected");
      setIsConnected(false);
    });

    socketInstance.on("connect_error", (error) => {
      console.error("❌ Socket.io connection error:", error);
      setIsConnected(false);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        console.log("🔌 Cleaning up socket connection");
        socketInstance.disconnect();
      }
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}
