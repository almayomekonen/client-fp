//CommentContext.js

import React, { createContext, useContext } from "react";
import {
  createCommentOnServer as createCommentOnServerService,
  deleteCommentFromServer as deleteCommentFromServerService,
  fetchCommentsByCopyIdFromServer as fetchCommentsByCopyIdService,
} from "../api/CommentApi";

const CommentContext = createContext();
export const useComment = () => useContext(CommentContext);

export function CommentProvider({ children }) {
  //יצירת הערה
  const addComment = async (userId, copyId, text, offset) => {
    const r = await createCommentOnServerService(userId, copyId, text, offset);
    return r.newComment;
  };

  //מחיקת הערה
  const deleteComment = async (commentId) => {
    await deleteCommentFromServerService(commentId);
  };

  const fetchCommentsByCopyId = async (copyId) => {
    return await fetchCommentsByCopyIdService(copyId);
  };

  return (
    <CommentContext.Provider
      value={{ addComment, deleteComment, fetchCommentsByCopyId }}
    >
      {children}
    </CommentContext.Provider>
  );
}
