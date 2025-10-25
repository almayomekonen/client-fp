import { API_BASE_URL } from "./config";

export const createTaskMessageOnServer = async (
  taskId,
  senderId,
  text,
  replyToMessageId = null
) => {
  const res = await fetch(`${API_BASE_URL}/api/taskMessages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ taskId, senderId, text, replyToMessageId }),
  });
  if (!res.ok) throw new Error("Error sending task message");
  return await res.json();
};

export const fetchTaskMessagesFromServer = async () => {
  const res = await fetch(`${API_BASE_URL}/api/taskMessages`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Error fetching task messages");
  return await res.json();
};

export const deleteTaskMessageFromServer = async (messageId) => {
  const res = await fetch(`${API_BASE_URL}/api/taskMessages/${messageId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Error deleting task message");
  }
  return await res.json();
};

export const updateTaskMessageOnServer = async (messageId, updateFields) => {
  const res = await fetch(`${API_BASE_URL}/api/taskMessages/${messageId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updateFields),
  });

  if (!res.ok) throw new Error("Error updating task message");
  return await res.json();
};
