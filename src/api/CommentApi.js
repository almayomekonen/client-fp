import { API_BASE_URL } from "./config";
import { fetchWithRoleCheck } from "./fetchWithRoleCheck";

export const createCommentOnServer = async (
  userId,
  copyId,
  text,
  offset,
  replyTo = null
) => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ userId, copyId, text, offset, replyTo }),
  });

  if (!res.ok) throw new Error("Error creating comment");
  const newComment = await res.json();

  return newComment;
};

export const deleteCommentFromServer = async (commentId) => {
  const res = await fetchWithRoleCheck(
    `${API_BASE_URL}/api/comments/${commentId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  if (!res.ok) throw new Error("Error deleting comment");
  return await res.json();
};

export const fetchCommentsFromServer = async () => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/comments`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Error fetching comments");
  return await res.json();
};

export const fetchCommentsByCopyIdFromServer = async (copyId) => {
  const res = await fetchWithRoleCheck(
    `${API_BASE_URL}/api/comments/copy/${copyId}`,
    {
      credentials: "include",
    }
  );
  if (!res.ok) throw new Error("Error fetching comments by copy");
  return await res.json();
};
