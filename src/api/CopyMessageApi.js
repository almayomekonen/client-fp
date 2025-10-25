import { API_BASE_URL } from "./config";
import { fetchWithRoleCheck } from "./fetchWithRoleCheck";

export const createCopyMessageOnServer = async (
  copyId,
  senderId,
  text,
  replyToMessageId = null
) => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/copyMessages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ copyId, senderId, text, replyToMessageId }),
  });
  if (!res.ok) throw new Error("Error sending message");
  return await res.json();
};

export const fetchCopyMessagesFromServer = async () => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/copyMessages`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Error fetching messages");
  return await res.json();
};

export const deleteCopyMessageFromServer = async (messageId) => {
  const res = await fetchWithRoleCheck(
    `${API_BASE_URL}/api/copyMessages/${messageId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Error deleting message");
  }
  return await res.json();
};

export const updateCopyMessageOnServer = async (messageId, updateFields) => {
  const res = await fetchWithRoleCheck(
    `${API_BASE_URL}/api/copyMessages/${messageId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updateFields),
    }
  );

  if (!res.ok) throw new Error("Error updating message");
  return await res.json();
};

export const fetchMessagesForCopy = async (copyId) => {
  const res = await fetchWithRoleCheck(
    `${API_BASE_URL}/api/copyMessages/byCopy/${copyId}`,
    {
      credentials: "include",
    }
  );
  if (!res.ok) throw new Error("Error fetching copy messages");
  return await res.json();
};

export const fetchUnreadCount = async (copyId, userId) => {
  const res = await fetchWithRoleCheck(
    `${API_BASE_URL}/api/copyMessages/unreadCount/${copyId}/${userId}`,
    {
      credentials: "include",
    }
  );
  if (!res.ok) throw new Error("Error fetching unread count");
  return await res.json();
};

export const fetchMessageById = async (messageId) => {
  const res = await fetchWithRoleCheck(
    `${API_BASE_URL}/api/copyMessages/byId/${messageId}`,
    {
      credentials: "include",
    }
  );
  if (!res.ok) throw new Error("Error fetching message");
  return await res.json();
};
