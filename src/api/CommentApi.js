
export const createCommentOnServer = async (userId, copyId, text, offset) => {
  if (!text) {
    return { success: false, message: 'נא למלא את כל שדות החובה' };
  }
  const res = await fetch('http://localhost:5000/api/comments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, copyId, text, offset })
  });

  if (!res.ok) throw new Error('שגיאה ביצירת הערה');
  const newComment = await res.json();
   return { success: true, message: 'ההערה התווספה בהצלחה', newComment};
};

export const deleteCommentFromServer = async (commentId) => {
  const res = await fetch(`http://localhost:5000/api/comments/${commentId}`, {
    method: 'DELETE'
  });

  if (!res.ok) throw new Error('שגיאה במחיקת הערה');
  return await res.json();
};

export const fetchCommentsFromServer = async () => {
  const res = await fetch('http://localhost:5000/api/comments');
  if (!res.ok) throw new Error('שגיאה בקבלת הערות');
  return await res.json();
};


// api/CommentApi.js
export const fetchCommentsByCopyId = async (copyId) => {
  const res = await fetch(`http://localhost:5000/api/comments/copy/${copyId}`);
  if (!res.ok) throw new Error('שגיאה בקבלת הערות לפי העתק');
  return await res.json();
};
