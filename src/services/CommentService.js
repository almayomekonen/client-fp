//CommentService.js

export const commentById = (comments, { commentId }) => {
    return comments.find(c => c._id === commentId);
};


