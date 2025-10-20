import { API_BASE_URL } from "./config";
import { fetchWithRoleCheck } from "./fetchWithRoleCheck";

export const createCommentOnServer = async (userId, copyId, text, offset) => {
  if (!text) {
    return { success: false, message: "נא למלא את כל שדות החובה" };
  }
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ userId, copyId, text, offset }),
  });

  if (!res.ok) throw new Error("שגיאה ביצירת הערה");
  const newComment = await res.json();
  return { success: true, message: "ההערה התווספה בהצלחה", newComment };
};

export const deleteCommentFromServer = async (commentId) => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/comments/${commentId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) throw new Error("שגיאה במחיקת הערה");
  return await res.json();
};

export const fetchCommentsFromServer = async () => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/comments`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("שגיאה בקבלת הערות");
  return await res.json();
};

export const fetchCommentsByCopyId = async (copyId) => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/comments/copy/${copyId}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("שגיאה בקבלת הערות לפי העתק");
  return await res.json();
};
