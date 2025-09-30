const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export const createCopyMessageOnServer = async (
  copyId,
  senderId,
  text,
  replyToMessageId = null
) => {
  const res = await fetch(`${API_BASE_URL}/api/copyMessages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ copyId, senderId, text, replyToMessageId }),
  });
  if (!res.ok) throw new Error("שגיאה בשליחת הודעה");
  return await res.json();
};

export const fetchCopyMessagesFromServer = async () => {
  const res = await fetch(`${API_BASE_URL}/api/copyMessages`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("שגיאה בקבלת הודעות");
  return await res.json();
};

export const deleteCopyMessageFromServer = async (messageId) => {
  const res = await fetch(`${API_BASE_URL}/api/copyMessages/${messageId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error("שגיאה במחיקת הודעה");
  return await res.json();
};

export const updateCopyMessageOnServer = async (messageId, updateFields) => {
  const res = await fetch(`${API_BASE_URL}/api/copyMessages/${messageId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(updateFields),
  });

  if (!res.ok) throw new Error("שגיאה בעדכון ההודעה");
  return await res.json();
};

// קבלת הודעות לפי copyId
export const fetchMessagesForCopy = async (copyId) => {
  const res = await fetch(`${API_BASE_URL}/api/copyMessages/byCopy/${copyId}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("שגיאה בקבלת הודעות להעתק");
  return await res.json();
};

// קבלת מספר הודעות שלא נקראו
export const fetchUnreadCount = async (copyId, userId) => {
  const res = await fetch(
    `${API_BASE_URL}/api/copyMessages/unreadCount/${copyId}/${userId}`,
    {
      credentials: "include",
    }
  );
  if (!res.ok) throw new Error("שגיאה בקבלת מספר הודעות לא נקראו");
  return await res.json();
};

// קבלת הודעה לפי ID
export const fetchMessageById = async (messageId) => {
  const res = await fetch(
    `${API_BASE_URL}/api/copyMessages/byId/${messageId}`,
    {
      credentials: "include",
    }
  );
  if (!res.ok) throw new Error("שגיאה בקבלת הודעה");
  return await res.json();
};
