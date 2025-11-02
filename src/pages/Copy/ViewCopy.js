import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createEditor, Path } from "slate";
import { Slate, Editable, withReact } from "slate-react";
import {
  FaEye,
  FaChartBar,
  FaComment,
  FaTimes,
  FaPlus,
  FaTrash,
  FaSave,
  FaFileAlt,
  FaUser,
} from "react-icons/fa";
import { useCopy } from "../../context/CopyContext";
import { useStatement } from "../../context/StatementContext";
import { useData } from "../../context/DataContext";
import { useEdit } from "../../context/EditContext";
import { useComment } from "../../context/CommentContext";
import { useResult } from "../../context/ResultContext";
import { useSocket } from "../../context/SocketContext";
import "../../styles/Dashboard.css";

export default function ViewStatementWithComments() {
  const { copyId } = useParams();
  const navigate = useNavigate();
  const editor = useMemo(() => withReact(createEditor()), []);

  const { copyById } = useCopy();
  const { statementById } = useStatement();
  const { currentUser, isAuthChecked } = useData();
  const { applyHighlightsToText } = useEdit();
  const {
    calculateSelectionCounts,
    calculateWordCounts,
    calculateWordCountsForSelection,
    renderKeyLabel,
  } = useResult();
  const { addComment, deleteComment, fetchCommentsByCopyId } = useComment();
  const { socket } = useSocket();

  const [value, setValue] = useState(null);
  const [counts, setCounts] = useState({});
  const [wordCounts, setWordCounts] = useState({});
  const [selectionCounts, setSelectionCounts] = useState(null);
  const [selectionWordCounts, setSelectionWordCounts] = useState(null);
  const [copy, setCopy] = useState(null);
  const [localComments, setLocalComments] = useState([]);
  const [commentKey, setCommentKey] = useState(0);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [activeComment, setActiveComment] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [statementsMap, setStatementsMap] = useState({}); // statementId -> statement

  // Redirect if no user - only after auth check is complete
  useEffect(() => {
    if (isAuthChecked && !currentUser) navigate("/", { replace: true });
  }, [currentUser, isAuthChecked, navigate]);

  // Load copy, statement, and comments
  useEffect(() => {
    const loadData = async () => {
      const copyData = copyById(copyId);
      if (!copyData) return;
      setCopy(copyData);

      // Load statement asynchronously
      let statement = statementsMap[copyData.statementId];
      if (!statement) {
        statement = await statementById(copyData.statementId);
        setStatementsMap((prev) => ({
          ...prev,
          [copyData.statementId]: statement,
        }));
      }

      const baseText = statement?.text || [
        { type: "paragraph", children: [{ text: "" }] },
      ];
      const highlights = copyData?.highlights || [];

      const commentsForCopy = await fetchCommentsByCopyId(copyId);
      setLocalComments(commentsForCopy);

      const decoratedText = applyHighlightsToText(
        baseText,
        highlights,
        [],
        commentsForCopy
      );
      editor.selection = null;
      setValue(decoratedText);
      setCounts(copyData?.colorCounts || {});
      setWordCounts(calculateWordCounts(decoratedText));
    };

    if (currentUser) loadData();
  }, [
    copyId,
    copyById,
    statementById,
    statementsMap,
    applyHighlightsToText,
    fetchCommentsByCopyId,
    currentUser,
    editor,
    calculateWordCounts,
  ]);

  useEffect(() => {
    if (!socket || !copyId) return;

    const handleCommentCreated = (data) => {
      // Only update if the comment is for this copy
      if (data.copyId === copyId) {
        setLocalComments((prevComments) => {
          // Avoid duplicates
          const exists = prevComments.some((c) => c._id === data.comment._id);
          if (exists) return prevComments;
          return [...prevComments, data.comment];
        });
        console.log("✅ Real-time comment added:", data.comment);
      }
    };

    const handleCommentDeleted = (data) => {
      // Only update if the comment is for this copy
      if (data.copyId === copyId) {
        setLocalComments((prevComments) =>
          prevComments.filter((c) => c._id !== data.commentId)
        );
        console.log("✅ Real-time comment deleted:", data.commentId);
      }
    };

    socket.on("commentCreated", handleCommentCreated);
    socket.on("commentDeleted", handleCommentDeleted);

    return () => {
      socket.off("commentCreated", handleCommentCreated);
      socket.off("commentDeleted", handleCommentDeleted);
    };
  }, [socket, copyId]);

  // Calculate global offset from Slate selection
  const getGlobalOffsetFromValue = (value, anchorPath, anchorOffset) => {
    let globalOffset = 0;
    const traverse = (nodes, path = []) => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const currentPath = [...path, i];
        if (node.text !== undefined) {
          if (Path.equals(currentPath, anchorPath)) {
            globalOffset += anchorOffset;
            throw "FOUND"; // eslint-disable-line no-throw-literal
          } else {
            globalOffset += node.text.length;
          }
        }
        if (node.children) traverse(node.children, currentPath);
        if (path.length === 0 && i < nodes.length - 1) globalOffset += 1;
      }
    };
    try {
      traverse(value);
    } catch (e) {
      if (e !== "FOUND") throw e;
    }
    return globalOffset;
  };

  // Render leaf for Slate
  const renderLeaf = useCallback(({ leaf, attributes, children }) => {
    const style = {
      backgroundColor: leaf.highlight || undefined,
      textDecoration: leaf.underline ? "underline" : undefined,
      fontWeight: leaf.bold ? "bold" : undefined,
      fontStyle: leaf.italic ? "italic" : undefined,
      outline: leaf.isDiff ? "2px solid red" : undefined,
    };
    const hasComments = leaf.comments?.length > 0;
    return (
      <span {...attributes} style={style}>
        {leaf.text !== "" ? children : "\u200B"}
        {hasComments && (
          <span
            onClick={() => setActiveComment(leaf.comments)}
            style={{
              cursor: "pointer",
              color: "blue",
              fontWeight: "bold",
              marginInlineStart: 4,
            }}
          >
            📝
          </span>
        )}
      </span>
    );
  }, []);

  // Show loading while checking auth
  if (!isAuthChecked) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div>Loading...</div>
      </div>
    );
  }

  if (!currentUser) return null;

  // Add comment
  const handleAddComment = async () => {
    if (!editor.selection)
      return alert(
        "Please select a location in the text before adding a comment"
      );
    if (!newComment) return alert("Please enter text for the comment");

    const { anchor } = editor.selection;
    const offset = getGlobalOffsetFromValue(value, anchor.path, anchor.offset);

    const createdComment = await addComment(
      currentUser._id,
      copyId,
      newComment,
      offset
    );
    const updatedLocalComments = [...localComments, createdComment];
    setLocalComments(updatedLocalComments);
    setCommentKey((prev) => prev + 1);

    const statement = statementsMap[copy.statementId];
    const baseText = statement?.text || [
      { type: "paragraph", children: [{ text: "" }] },
    ];
    const highlights = copy?.highlights || [];

    const decoratedText = applyHighlightsToText(
      baseText,
      highlights,
      [],
      updatedLocalComments
    );
    editor.selection = null;
    setValue(decoratedText);
    setNewComment("");
    setIsAddingComment(false);
  };

  // Remove comment
  const handleRemoveComment = async (commentId) => {
    await deleteComment(commentId);
    const updatedLocalComments = localComments.filter(
      (c) => c._id !== commentId
    );
    setLocalComments(updatedLocalComments);
    setCommentKey((prev) => prev + 1);

    const statement = statementsMap[copy.statementId];
    const baseText = statement?.text || [
      { type: "paragraph", children: [{ text: "" }] },
    ];
    const highlights = copy?.highlights || [];

    const decoratedText = applyHighlightsToText(
      baseText,
      highlights,
      [],
      updatedLocalComments
    );
    editor.selection = null;
    setValue(decoratedText);
    setActiveComment(null);
  };

  // Reply to comment
  const handleReplyToComment = async (parentCommentId) => {
    if (!replyText.trim()) return alert("Please enter reply text");

    // For replies, use the parent comment's offset
    const parentComment = localComments.find((c) => c._id === parentCommentId);
    const offset = parentComment ? parentComment.offset : null;

    const createdReply = await addComment(
      currentUser._id,
      copyId,
      replyText,
      offset,
      parentCommentId
    );
    const updatedLocalComments = [...localComments, createdReply];
    setLocalComments(updatedLocalComments);
    setCommentKey((prev) => prev + 1);
    setReplyingTo(null);
    setReplyText("");
  };

  if (!value)
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div>Loading statement...</div>
      </div>
    );

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          <FaEye />
          Statement Viewer
        </h1>
        <p className="dashboard-subtitle">
          <FaFileAlt style={{ marginRight: "8px" }} />
          View coded statement and add comments
        </p>
      </div>

      {/* Main Content Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 400px",
          gap: "20px",
        }}
      >
        {/* Left Column - Viewer */}
        <div>
          {/* Analysis Tools */}
          <div className="dashboard-card" style={{ marginBottom: "20px" }}>
            <h3 className="card-title" style={{ marginBottom: "16px" }}>
              <FaChartBar /> Analysis Tools
            </h3>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                onClick={() =>
                  calculateSelectionCounts(editor, setSelectionCounts)
                }
                className="dashboard-btn btn-secondary btn-sm"
              >
                <FaEye /> Show Selection Codings
              </button>
              <button
                onClick={() =>
                  setSelectionWordCounts(
                    calculateWordCountsForSelection(editor, value)
                  )
                }
                className="dashboard-btn btn-secondary btn-sm"
              >
                <FaChartBar /> Show Selection Words
              </button>
            </div>
          </div>

          {/* Viewer Card */}
          <div className="dashboard-card">
            <h3 className="card-title" style={{ marginBottom: "16px" }}>
              <FaFileAlt /> Statement Content
            </h3>
            <Slate
              key={`slate-${copy?._id}-${commentKey}`}
              editor={editor}
              initialValue={value}
              value={value}
              onChange={setValue}
            >
              <Editable
                renderLeaf={renderLeaf}
                readOnly
                dir="auto"
                placeholder="No text available"
                style={{
                  minHeight: "500px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  padding: "20px",
                  fontSize: "16px",
                  lineHeight: "1.8",
                  backgroundColor: "#fafafa",
                }}
              />
            </Slate>
          </div>
        </div>

        {/* Right Column - Statistics & Comments */}
        <div>
          {/* Total Statistics */}
          <div className="dashboard-card" style={{ marginBottom: "20px" }}>
            <h3 className="card-title" style={{ marginBottom: "16px" }}>
              <FaChartBar /> Total Statistics
            </h3>

            <div style={{ marginBottom: "20px" }}>
              <h4
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  marginBottom: "12px",
                  color: "#666",
                }}
              >
                Codings Count:
              </h4>
              {Object.entries(counts).length > 0 ? (
                Object.entries(counts).map(([key, num]) => (
                  <div key={key} style={{ marginBottom: "8px" }}>
                    {renderKeyLabel(key, num)}
                  </div>
                ))
              ) : (
                <p style={{ color: "#999", fontSize: "14px" }}>
                  No codings yet
                </p>
              )}
            </div>

            <div>
              <h4
                style={{
                  fontSize: "14px",
                  fontWeight: "600",
                  marginBottom: "12px",
                  color: "#666",
                }}
              >
                Word Count:
              </h4>
              {Object.entries(wordCounts).length > 0 ? (
                Object.entries(wordCounts).map(([key, num]) => (
                  <div key={key} style={{ marginBottom: "8px" }}>
                    {renderKeyLabel(key, num)}
                  </div>
                ))
              ) : (
                <p style={{ color: "#999", fontSize: "14px" }}>
                  No word counts
                </p>
              )}
            </div>
          </div>

          {/* Selection Statistics */}
          {(selectionCounts || selectionWordCounts) && (
            <div className="dashboard-card" style={{ marginBottom: "20px" }}>
              <h3 className="card-title" style={{ marginBottom: "16px" }}>
                <FaEye /> Selection Statistics
              </h3>

              {selectionCounts && (
                <div style={{ marginBottom: "20px" }}>
                  <h4
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      marginBottom: "12px",
                      color: "#666",
                    }}
                  >
                    Codings in Selection:
                  </h4>
                  {Object.entries(selectionCounts).map(([key, num]) => (
                    <div key={key} style={{ marginBottom: "8px" }}>
                      {renderKeyLabel(key, num)}
                    </div>
                  ))}
                </div>
              )}

              {selectionWordCounts && (
                <div>
                  <h4
                    style={{
                      fontSize: "14px",
                      fontWeight: "600",
                      marginBottom: "12px",
                      color: "#666",
                    }}
                  >
                    Words in Selection:
                  </h4>
                  {Object.entries(selectionWordCounts).map(([key, num]) => (
                    <div key={key} style={{ marginBottom: "8px" }}>
                      {renderKeyLabel(key, num)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Comments Section */}
          <div className="dashboard-card">
            <h3 className="card-title" style={{ marginBottom: "16px" }}>
              <FaComment /> Comments
            </h3>

            {!isAddingComment && (
              <button
                onClick={() => setIsAddingComment(true)}
                className="dashboard-btn btn-primary btn-sm"
                style={{ width: "100%" }}
              >
                <FaPlus /> Add Comment
              </button>
            )}

            {isAddingComment && (
              <div>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Select text location and add your comment..."
                  className="form-textarea"
                  style={{ marginBottom: "12px", minHeight: "100px" }}
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={handleAddComment}
                    className="dashboard-btn btn-success btn-sm"
                    style={{ flex: 1 }}
                  >
                    <FaSave /> Save
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingComment(false);
                      setNewComment("");
                    }}
                    className="dashboard-btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                  >
                    <FaTimes /> Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Comment Modal */}
      {activeComment && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setActiveComment(null)}
        >
          <div
            className="dashboard-card"
            style={{
              maxWidth: "500px",
              width: "90%",
              maxHeight: "70vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="card-header">
              <h3 className="card-title">
                <FaComment /> Comments
              </h3>
              <button
                onClick={() => setActiveComment(null)}
                className="dashboard-btn btn-secondary btn-sm"
              >
                <FaTimes /> Close
              </button>
            </div>

            <ul className="dashboard-list">
              {activeComment
                .filter((c) => !c.replyTo)
                .map((c) => {
                  const replies = activeComment.filter(
                    (r) => r.replyTo === c._id
                  );
                  return (
                    <li key={c._id} className="list-item">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "start",
                          gap: "12px",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                              marginBottom: "6px",
                              fontSize: "0.85rem",
                              color: "#666",
                            }}
                          >
                            <FaUser style={{ fontSize: "0.75rem" }} />
                            <strong>{c.userId?.username || "Unknown"}</strong>
                            <span>•</span>
                            <span>
                              {new Date(c.createdAt).toLocaleDateString()}{" "}
                              {new Date(c.createdAt).toLocaleTimeString()}
                            </span>
                          </div>
                          <p style={{ margin: 0, marginBottom: "8px" }}>
                            {c.text}
                          </p>

                          {/* Reply button */}
                          <button
                            onClick={() => setReplyingTo(c._id)}
                            className="dashboard-btn btn-secondary btn-sm"
                            style={{ fontSize: "0.75rem", padding: "4px 8px" }}
                          >
                            <FaComment style={{ marginRight: "4px" }} /> Reply
                          </button>

                          {/* Reply input */}
                          {replyingTo === c._id && (
                            <div style={{ marginTop: "12px" }}>
                              <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Write a reply..."
                                className="dashboard-input"
                                style={{
                                  width: "100%",
                                  minHeight: "60px",
                                  marginBottom: "8px",
                                }}
                              />
                              <div style={{ display: "flex", gap: "8px" }}>
                                <button
                                  onClick={() => handleReplyToComment(c._id)}
                                  className="dashboard-btn btn-primary btn-sm"
                                >
                                  Send Reply
                                </button>
                                <button
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setReplyText("");
                                  }}
                                  className="dashboard-btn btn-secondary btn-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Display replies */}
                          {replies.length > 0 && (
                            <div
                              style={{
                                marginTop: "12px",
                                marginLeft: "24px",
                                paddingLeft: "12px",
                                borderLeft: "3px solid #e0e0e0",
                              }}
                            >
                              {replies.map((reply) => (
                                <div
                                  key={reply._id}
                                  style={{ marginBottom: "12px" }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "8px",
                                      marginBottom: "4px",
                                      fontSize: "0.85rem",
                                      color: "#666",
                                    }}
                                  >
                                    <FaUser style={{ fontSize: "0.75rem" }} />
                                    <strong>
                                      {reply.userId?.username || "Unknown"}
                                    </strong>
                                    <span>•</span>
                                    <span>
                                      {new Date(
                                        reply.createdAt
                                      ).toLocaleDateString()}{" "}
                                      {new Date(
                                        reply.createdAt
                                      ).toLocaleTimeString()}
                                    </span>
                                  </div>
                                  <p style={{ margin: 0, fontSize: "0.95rem" }}>
                                    {reply.text}
                                  </p>
                                  {currentUser?._id === reply.userId?._id && (
                                    <button
                                      onClick={() =>
                                        handleRemoveComment(reply._id)
                                      }
                                      className="dashboard-btn btn-danger btn-sm"
                                      style={{
                                        fontSize: "0.75rem",
                                        padding: "2px 6px",
                                        marginTop: "4px",
                                      }}
                                    >
                                      <FaTrash />
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {currentUser?._id === c.userId?._id && (
                          <button
                            onClick={() => handleRemoveComment(c._id)}
                            className="dashboard-btn btn-danger btn-sm"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
