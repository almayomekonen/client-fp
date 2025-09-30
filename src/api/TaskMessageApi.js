const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

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
  if (!res.ok) throw new Error("שגיאה בשליחת הודעת משימה");
  return await res.json();
};

export const fetchTaskMessagesFromServer = async () => {
  const res = await fetch(`${API_BASE_URL}/api/taskMessages`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("שגיאה בקבלת הודעות משימה");
  return await res.json();
};

export const deleteTaskMessageFromServer = async (messageId) => {
  const res = await fetch(`${API_BASE_URL}/api/taskMessages/${messageId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("שגיאה במחיקת הודעת משימה");
  return await res.json();
};

export const updateTaskMessageOnServer = async (messageId, updateFields) => {
  const res = await fetch(`${API_BASE_URL}/api/taskMessages/${messageId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updateFields),
  });

  if (!res.ok) throw new Error("שגיאה בעדכון ההודעה");
  return await res.json();
};
