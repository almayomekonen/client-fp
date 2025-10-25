import React, { createContext, useContext } from "react";
import { useData } from "./DataContext";
import { useRefresh } from "./RefreshContext";
import {
  createTaskMessageOnServer,
  deleteTaskMessageFromServer,
  markTaskMessageAsReadOnServer,
  updateTaskMessageOnServer as updateTaskMessageOnServerService,
} from "../api/TaskMessageApi";

const TaskMessageContext = createContext();
export const useTaskMessage = () => useContext(TaskMessageContext);

export function TaskMessageProvider({ children }) {
  const { taskMessages, setTaskMessages } = useData();
  const { refreshTaskMessages } = useRefresh();

  const sendMessage = async (
    taskId,
    senderId,
    text,
    replyToMessageId = null
  ) => {
    await createTaskMessageOnServer(taskId, senderId, text, replyToMessageId);
    await refreshTaskMessages();
  };

  const markAsRead = async (messageId, userId) => {
    await updateTaskMessageOnServerService(messageId, { addToReadBy: userId });
    await refreshTaskMessages();
  };

  const getMessagesForTask = (taskId) => {
    return taskMessages
      .filter((m) => m.taskId === taskId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  };

  const getUnreadCount = (taskId, userId) => {
    return taskMessages.filter(
      (m) => m.taskId === taskId && !m.readBy.includes(userId)
    ).length;
  };

  const messageById = (messageId) => {
    return taskMessages.find((m) => m._id === messageId) || null;
  };

  const deleteTaskMessage = async (messageId) => {
    try {
      await deleteTaskMessageFromServer(messageId);
      await refreshTaskMessages();
    } catch (error) {
      console.error("Error deleting message:", error);
      throw error;
    }
  };

  return (
    <TaskMessageContext.Provider
      value={{
        sendMessage,
        markAsRead,
        getMessagesForTask,
        getUnreadCount,
        messageById,
        deleteTaskMessage,
      }}
    >
      {children}
    </TaskMessageContext.Provider>
  );
}
