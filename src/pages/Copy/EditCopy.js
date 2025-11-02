import React, { useMemo, useCallback, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createEditor, Path } from "slate";
import { Slate, Editable, withReact } from "slate-react";
import {
  FaEdit,
  FaSave,
  FaCheckCircle,
  FaPalette,
  FaEraser,
  FaUnderline,
  FaBold,
  FaItalic,
  FaChartBar,
  FaComment,
  FaTimes,
  FaPlus,
  FaTrash,
  FaEye,
  FaHighlighter,
  FaUser,
} from "react-icons/fa";

import { useEdit } from "../../context/EditContext";
import { useCopy } from "../../context/CopyContext";
import { useData } from "../../context/DataContext";
import { useStatement } from "../../context/StatementContext";
import { useComment } from "../../context/CommentContext";
import { useResult } from "../../context/ResultContext";
import { useColor } from "../../context/ColorContext";
import { useStyleSetting } from "../../context/StyleSettingContext";
import { useSocket } from "../../context/SocketContext";
import "../../styles/Dashboard.css";

export default function StatementEditor() {
  const { copyId } = useParams();
  const navigate = useNavigate();

  const editor = useMemo(() => withReact(createEditor()), []);
  const { copyById, saveCopyWithHighlights, updateCopyStatus } = useCopy();
  const {
    applyHighlightsToText,
    extractHighlightsFromValue,
    markColor,
    markUnderline,
    removeFormatting,
    markBold,
    markItalic,
  } = useEdit();
  const {
    calculateSelectionCounts,
    calculateWordCounts,
    calculateWordCountsForSelection,
    renderKeyLabel,
  } = useResult();
  const { statementById } = useStatement();
  const { currentUser, isAuthChecked } = useData();
  const { getColors } = useColor();
  const { addComment, deleteComment, fetchCommentsByCopyId } = useComment();
  const { getStyleSetting } = useStyleSetting();
  const { socket } = useSocket();

  const [value, setValue] = useState(null);
  const [counts, setCounts] = useState({});
  const [wordCounts, setWordCounts] = useState({});
  const [selectionCounts, setSelectionCounts] = useState(null);
  const [selectionWordCounts, setSelectionWordCounts] = useState(null);
  const [copy, setCopy] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [localComments, setLocalComments] = useState([]);
  const [commentKey, setCommentKey] = useState(0);
  const [activeComment, setActiveComment] = useState(null);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState("");

  const [colors, setColors] = useState([]);
  const [styleSettings, setStyleSettings] = useState({});
  const [statementsMap, setStatementsMap] = useState({});

  // User check
  useEffect(() => {
    if (isAuthChecked && !currentUser) navigate("/", { replace: true });
  }, [currentUser, isAuthChecked, navigate]);

  // Load Style Settings
  useEffect(() => {
    const loadStyle = async () => {
      const data = await getStyleSetting();
      setStyleSettings(data);
    };
    loadStyle();
  }, [getStyleSetting]);

  // Load colors
  useEffect(() => {
    const loadColors = async () => {
      try {
        const fetchedColors = await getColors();
        setColors(fetchedColors);
      } catch (err) {
        console.error("Error loading colors", err);
      }
    };
    loadColors();
  }, [getColors]);

  // Load Copy data and statement asynchronously
  useEffect(() => {
    const loadData = async () => {
      const copy = copyById(copyId);
      if (!copy) return;

      // Get statement from server if it doesn't exist in state
      let statement = statementsMap[copy.statementId];

      if (!statement) {
        statement = await statementById(copy.statementId);
        setStatementsMap((prev) => ({
          ...prev,
          [copy.statementId]: statement,
        }));
      }

      const baseText = statement?.slateText || [
        { type: "paragraph", children: [{ text: "" }] },
      ];

      const highlights = copy?.highlights || [];
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
      setCounts(copy?.colorCounts || {});
      setCopy(copy);
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

  // Calculate global offset
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
              marginInlineStart: "5px",
              display: "inline-block",
              verticalAlign: "middle",
              zIndex: 10,
            }}
          >
            📝
          </span>
        )}
      </span>
    );
  }, []);

  const handleSave = async () => {
    if (!copy || !value) return;
    const editorValue = editor.children;
    const { highlights, colorCounts } = extractHighlightsFromValue(editorValue);
    await saveCopyWithHighlights(copy._id, highlights, colorCounts);
    setCounts(colorCounts);

    let statement = statementsMap[copy.statementId];
    if (!statement) {
      statement = await statementById(copy.statementId);
      setStatementsMap((prev) => ({ ...prev, [copy.statementId]: statement }));
    }
    const baseText = statement?.slateText || [
      { type: "paragraph", children: [{ text: "" }] },
    ];
    const decoratedText = applyHighlightsToText(
      baseText,
      highlights,
      [],
      localComments
    );
    editor.selection = null;
    setValue(decoratedText);
    setCommentKey((prev) => prev + 1);
    setWordCounts(calculateWordCounts(decoratedText));
    alert("Changes saved successfully!");
  };

  const handleCloseCoding = async () => {
    if (!copy) return;
    await updateCopyStatus(copy._id, "completed");
    alert("Coding completed!");
    if (currentUser?.role === "admin") navigate("/adminHome");
    else if (currentUser?.role === "investigator")
      navigate("/investigatorHome");
    else if (currentUser?.role === "coder") navigate("/coderHome");
    else navigate("/");
  };

  const handleAddComment = async () => {
    if (!editor.selection)
      return alert(
        "Please select a location in the text before adding a comment"
      );
    if (!newComment) return alert("Please enter comment text");
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

    let statement = statementsMap[copy.statementId];
    if (!statement) {
      statement = await statementById(copy.statementId);
      setStatementsMap((prev) => ({ ...prev, [copy.statementId]: statement }));
    }
    const baseText = statement?.slateText || [
      { type: "paragraph", children: [{ text: "" }] },
    ];
    const { highlights, colorCounts } = extractHighlightsFromValue(value);
    const decoratedText = applyHighlightsToText(
      baseText,
      highlights,
      [],
      updatedLocalComments
    );
    editor.selection = null;

    setValue(decoratedText);
    setNewComment("");
    setCounts(colorCounts);
    setIsAddingComment(false);
  };

  const handleRemoveComment = async (commentId) => {
    await deleteComment(commentId);
    const updatedLocalComments = localComments.filter(
      (c) => c._id !== commentId
    );
    setLocalComments(updatedLocalComments);
    setCommentKey((prev) => prev + 1);

    let statement = statementsMap[copy.statementId];
    if (!statement) {
      statement = await statementById(copy.statementId);
      setStatementsMap((prev) => ({ ...prev, [copy.statementId]: statement }));
    }
    const baseText = statement?.slateText || [
      { type: "paragraph", children: [{ text: "" }] },
    ];
    const { highlights, colorCounts } = extractHighlightsFromValue(value);
    const decoratedText = applyHighlightsToText(
      baseText,
      highlights,
      [],
      updatedLocalComments
    );
    editor.selection = null;

    setValue(decoratedText);
    setCounts(colorCounts);
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
        <div>Loading text editor...</div>
      </div>
    );

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          <FaEdit />
          Coding Editor
        </h1>
        <p className="dashboard-subtitle">
          <FaHighlighter style={{ marginRight: "8px" }} />
          Highlight and annotate text for analysis
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
        {/* Left Column - Editor */}
        <div>
          {/* Toolbar Card */}
          <div className="dashboard-card" style={{ marginBottom: "20px" }}>
            <h3 className="card-title" style={{ marginBottom: "16px" }}>
              <FaPalette /> Highlighting Tools
            </h3>

            {/* Color Palette */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "16px",
                flexWrap: "wrap",
              }}
            >
              {colors.map((c) => (
                <button
                  key={c._id}
                  onClick={() => markColor(editor, c.code)}
                  title={c.name}
                  className="dashboard-btn btn-sm"
                  style={{
                    backgroundColor: c.code,
                    border: "2px solid #000",
                    width: "40px",
                    height: "40px",
                    padding: 0,
                    minWidth: "40px",
                  }}
                />
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                onClick={() => removeFormatting(editor)}
                className="dashboard-btn btn-danger btn-sm"
              >
                <FaEraser /> Clear All
              </button>
              {styleSettings.underlineEnabled && (
                <button
                  onClick={() => markUnderline(editor)}
                  className="dashboard-btn btn-secondary btn-sm"
                >
                  <FaUnderline /> Underline
                </button>
              )}
              {styleSettings.boldEnabled && (
                <button
                  onClick={() => markBold(editor)}
                  className="dashboard-btn btn-secondary btn-sm"
                >
                  <FaBold /> Bold
                </button>
              )}
              {styleSettings.italicEnabled && (
                <button
                  onClick={() => markItalic(editor)}
                  className="dashboard-btn btn-secondary btn-sm"
                >
                  <FaItalic /> Italic
                </button>
              )}
            </div>
          </div>

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

          {/* Editor Card */}
          <div className="dashboard-card">
            <h3 className="card-title" style={{ marginBottom: "16px" }}>
              <FaEdit /> Text Editor
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
                placeholder="Select text to highlight..."
                readOnly={true}
                dir="auto"
                style={{
                  minHeight: "400px",
                  border: "2px solid #e0e0e0",
                  borderRadius: "8px",
                  padding: "20px",
                  fontSize: "16px",
                  lineHeight: "1.8",
                  backgroundColor: "#fafafa",
                }}
              />
            </Slate>

            {/* Action Buttons */}
            <div style={{ marginTop: "20px", display: "flex", gap: "12px" }}>
              <button
                onClick={handleSave}
                className="dashboard-btn btn-primary"
              >
                <FaSave /> Save Changes
              </button>
              <button
                onClick={handleCloseCoding}
                className="dashboard-btn btn-success"
              >
                <FaCheckCircle /> Complete Coding
              </button>
            </div>
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
                  <div style={{ marginBottom: "8px" }}>
                    {renderKeyLabel(
                      "Words colored in any color",
                      selectionWordCounts.totalColor || 0
                    )}
                  </div>
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
