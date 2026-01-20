import React, { useMemo, useCallback, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createEditor, Transforms, Editor } from "slate";
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
  FaFileWord,
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
import { exportCopyToWord } from "../../utils/wordExport";
import CopyChat from "../../components/CopyChat";
import ResultsTables from "../../components/ResultsTables";
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
    buildResultsTable,
    calculateAdditionalStats,
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

  const [colors, setColors] = useState([]);
  const [styleSettings, setStyleSettings] = useState({});
  const [statementsMap, setStatementsMap] = useState({});

  const [fullTextTable, setFullTextTable] = useState(null);
  const [selectionTable, setSelectionTable] = useState(null);
  const [additionalStats, setAdditionalStats] = useState(null);

  useEffect(() => {
    if (isAuthChecked && !currentUser) navigate("/", { replace: true });
  }, [currentUser, isAuthChecked, navigate]);

  useEffect(() => {
    const loadStyle = async () => {
      const data = await getStyleSetting();
      setStyleSettings(data);
    };
    loadStyle();
  }, [getStyleSetting]);

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

  useEffect(() => {
    const loadData = async () => {
      const copy = copyById(copyId);
      if (!copy) return;

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
    calculateWordCounts,
  ]);

  useEffect(() => {
    if (!socket || !copyId) return;

    const handleCommentCreated = (data) => {
      if (data.copyId === copyId) {
        setLocalComments((prevComments) => {
          const exists = prevComments.some((c) => c._id === data.comment._id);
          if (exists) return prevComments;
          return [...prevComments, data.comment];
        });
        console.log("✅ Real-time comment added:", data.comment);
      }
    };

    const handleCommentDeleted = (data) => {
      if (data.copyId === copyId) {
        setLocalComments((prevComments) =>
          prevComments.filter((c) => c._id !== data.commentId)
        );
        console.log("✅ Real-time comment deleted:", data.commentId);
      }
    };

    socket.on("commentCreated", handleCommentCreated);
    socket.on("commentDeleted", handleCommentDeleted);

    const handleCopyDeleted = (data) => {
      if (data.copyId === copyId) {
        alert("This copy has been deleted.");
        navigate("/");
      }
    };

    socket.on("copyDeleted", handleCopyDeleted);

    return () => {
      socket.off("commentCreated", handleCommentCreated);
      socket.off("commentDeleted", handleCommentDeleted);
      socket.off("copyDeleted", handleCopyDeleted);
    };
  }, [socket, copyId, navigate]);

  // Re-render Slate value when localComments change (e.g., from real-time updates)
  useEffect(() => {
    if (!copy || !localComments || !statementsMap[copy.statementId]) return;

    const statement = statementsMap[copy.statementId];
    const baseText = statement?.slateText || [
      { type: "paragraph", children: [{ text: "" }] },
    ];
    const highlights = copy?.highlights || [];

    const decoratedText = applyHighlightsToText(
      baseText,
      highlights,
      [],
      localComments
    );
    
    setValue(decoratedText);
  }, [localComments, copy, statementsMap, applyHighlightsToText]);

  useEffect(() => {
    if (!value || !colors.length || !styleSettings) return;

    const fullTable = buildResultsTable(
      counts,
      wordCounts,
      colors,
      styleSettings
    );
    setFullTextTable(fullTable);

    if (selectionCounts && selectionWordCounts) {
      const selTable = buildResultsTable(
        selectionCounts,
        selectionWordCounts,
        colors,
        styleSettings
      );
      setSelectionTable(selTable);
    } else {
      setSelectionTable(null);
    }

    const stats = calculateAdditionalStats(value, editor);
    setAdditionalStats(stats);
  }, [
    value,
    counts,
    wordCounts,
    selectionCounts,
    selectionWordCounts,
    colors,
    styleSettings,
    editor,
    buildResultsTable,
    calculateAdditionalStats,
  ]);

  const getGlobalOffsetFromSelection = () => {
    if (!editor.selection) return null;

    let globalOffset = 0;
    const { anchor } = editor.selection;

    const traverse = (nodes, path = []) => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const currentPath = [...path, i];

        if (node.text !== undefined) {
          if (
            currentPath.length === anchor.path.length &&
            currentPath.every((val, idx) => val === anchor.path[idx])
          ) {
            globalOffset += anchor.offset;
            return true; // Found
          } else {
            globalOffset += node.text.length;
          }
        }

        if (node.children) {
          if (traverse(node.children, currentPath)) return true;
        }

        if (path.length === 0 && i < nodes.length - 1) {
          globalOffset += 1;
        }
      }
      return false;
    };

    traverse(value);
    return globalOffset;
  };

  const renderLeaf = useCallback(
    ({ leaf, attributes, children }) => {
      const style = {
        backgroundColor: leaf.highlight || undefined,
        textDecoration: leaf.underline ? "underline" : undefined,
        fontWeight: leaf.bold ? "bold" : undefined,
        fontStyle: leaf.italic ? "italic" : undefined,
        outline: leaf.isDiff ? "2px solid red" : undefined,
      };

      const colorName = colors.find((c) => c.code === leaf.highlight)?.name;
      const styleNames = [];
      if (leaf.bold) styleNames.push(styleSettings.boldName || "Bold");
      if (leaf.italic) styleNames.push(styleSettings.italicName || "Italic");
      if (leaf.underline)
        styleNames.push(styleSettings.underlineName || "Underline");
      const tooltip = [colorName, ...styleNames].filter(Boolean).join(", ");

      const hasComments = leaf.comments?.length > 0;
      return (
        <span {...attributes} style={style} title={tooltip}>
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
    },
    [colors, styleSettings]
  );

  const handleMarkColor = (colorCode) => {
    markColor(editor, colorCode);

    const newValue = [...editor.children];
    setValue(newValue);

    const { colorCounts } = extractHighlightsFromValue(newValue);
    setCounts(colorCounts);
    setWordCounts(calculateWordCounts(newValue));
  };

  const handleClearAll = () => {
    Transforms.select(editor, {
      anchor: Editor.start(editor, []),
      focus: Editor.end(editor, []),
    });

    removeFormatting(editor);

    // Force update the value
    const newValue = [...editor.children];
    setValue(newValue);

    // Reset counts
    setCounts({});
    setWordCounts(calculateWordCounts(newValue));
  };

  // ✅ FIX: Mark underline and update
  const handleMarkUnderline = () => {
    markUnderline(editor);
    const newValue = [...editor.children];
    setValue(newValue);
  };

  // ✅ FIX: Mark bold and update
  const handleMarkBold = () => {
    markBold(editor);
    const newValue = [...editor.children];
    setValue(newValue);
  };

  // ✅ FIX: Mark italic and update
  const handleMarkItalic = () => {
    markItalic(editor);
    const newValue = [...editor.children];
    setValue(newValue);
  };

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
    // Clear selection after save
    editor.selection = null;
    setValue(decoratedText);
    setCommentKey((prev) => prev + 1);
    setWordCounts(calculateWordCounts(decoratedText));
  };

  const handleCloseCoding = async () => {
    if (!copy) return;
    await updateCopyStatus(copy._id, "completed");
    if (currentUser?.role === "admin") navigate("/adminHome");
    else if (currentUser?.role === "investigator")
      navigate("/investigatorHome");
    else if (currentUser?.role === "coder") navigate("/coderHome");
    else navigate("/");
  };

  const handleAddComment = async () => {
    if (!editor.selection) {
      return alert(
        "Please select a location in the text before adding a comment"
      );
    }
    if (!newComment.trim()) {
      return alert("Please enter comment text");
    }

    const offset = getGlobalOffsetFromSelection();
    if (offset === null) {
      return alert("Could not determine text position");
    }

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

    // Clear selection after adding comment
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

    // Clear selection to prevent invalid path errors
    editor.selection = null;
    setValue(decoratedText);
    setCounts(colorCounts);
    setActiveComment(null);
  };

  // Export to Word
  const handleExportToWord = async () => {
    try {
      const statement = statementsMap[copy?.statementId];
      const statementName = statement?.name || "Untitled Statement";

      await exportCopyToWord({
        copyId: copy?._id,
        slateValue: editor.children,
        counts,
        wordCounts,
        comments: localComments,
        colors,
        styleSettings,
        users: [],
        copyName: `Coding_${currentUser?.username || "User"}`,
        statementName,
      });
    } catch (error) {
      console.error("Export error:", error);
      alert("❌ Failed to export document. Please try again.");
    }
  };

  if (!value)
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div>Loading text editor...</div>
      </div>
    );

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "10px",
        boxSizing: "border-box",
      }}
    >
      {/* Header - Compact */}
      <div style={{ flexShrink: 0, marginBottom: "10px" }}>
        <h1
          style={{ fontSize: "22px", fontWeight: "600", marginBottom: "5px" }}
        >
          <FaEdit /> Coding Editor
        </h1>
        <p style={{ fontSize: "13px", color: "#666" }}>
          <FaHighlighter style={{ marginRight: "8px" }} />
          Highlight and annotate text for analysis
        </p>
      </div>

      {/* Main Content Grid - Takes remaining space */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          flex: 1,
          minHeight: "600px",
        }}
      >
        {/* Left Column - Full Height */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            overflow: "hidden",
          }}
        >
          {/* Toolbar Card - Compact */}
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "8px",
              marginBottom: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              flexShrink: 0,
            }}
          >
            <h3
              style={{
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px",
              }}
            >
              <FaPalette /> Highlighting Tools
            </h3>

            {/* Color Palette */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginBottom: "12px",
                flexWrap: "wrap",
              }}
            >
              {colors.map((c) => (
                <button
                  key={c._id}
                  onClick={() => handleMarkColor(c.code)}
                  title={c.name}
                  className="dashboard-btn btn-sm"
                  style={{
                    backgroundColor: c.code,
                    border: "2px solid #000",
                    padding: "6px 12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontWeight: "600",
                    fontSize: "13px",
                    color: (() => {
                      const hex = c.code.replace("#", "");
                      const r = parseInt(hex.substr(0, 2), 16);
                      const g = parseInt(hex.substr(2, 2), 16);
                      const b = parseInt(hex.substr(4, 2), 16);
                      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                      return brightness > 155 ? "#000000" : "#FFFFFF";
                    })(),
                  }}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button
                onClick={handleClearAll}
                className="dashboard-btn btn-danger btn-sm"
              >
                <FaEraser /> Clear
              </button>
              {styleSettings.underlineEnabled && (
                <button
                  onClick={handleMarkUnderline}
                  className="dashboard-btn btn-secondary btn-sm"
                  style={{ textDecoration: "underline" }}
                >
                  <FaUnderline /> {styleSettings.underlineName || "Underline"}
                </button>
              )}
              {styleSettings.boldEnabled && (
                <button
                  onClick={handleMarkBold}
                  className="dashboard-btn btn-secondary btn-sm"
                  style={{ fontWeight: "bold" }}
                >
                  <FaBold /> {styleSettings.boldName || "Bold"}
                </button>
              )}
              {styleSettings.italicEnabled && (
                <button
                  onClick={handleMarkItalic}
                  className="dashboard-btn btn-secondary btn-sm"
                  style={{ fontStyle: "italic" }}
                >
                  <FaItalic /> {styleSettings.italicName || "Italic"}
                </button>
              )}
            </div>
          </div>

          {/* Editor Card - Takes space */}
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "10px",
              marginBottom: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: "400px",
            }}
          >
            <h3
              style={{
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px",
                flexShrink: 0,
              }}
            >
              <FaEdit /> Text Editor
            </h3>
            <Slate
              key={`slate-${copy?._id}-${commentKey}`}
              editor={editor}
              initialValue={value}
              value={value}
              onChange={setValue}
            >
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  border: "1px solid #ddd",
                  borderRadius: "4px",
                  padding: "15px",
                  backgroundColor: "#fafafa",
                  minHeight: "350px",
                  textAlign: "right",
                }}
              >
                <Editable
                  renderLeaf={renderLeaf}
                  placeholder="Select text to highlight..."
                  readOnly={true}
                  onKeyDown={(event) => {
                    // Prevent all keyboard input that would modify text
                    if (!event.ctrlKey && !event.metaKey && !event.altKey) {
                      event.preventDefault();
                    }
                  }}
                  dir="rtl"
                  style={{
                    fontSize: "18px",
                    lineHeight: "2",
                  }}
                />
              </div>
            </Slate>

            {/* Action Buttons - Moved outside the card frame */}
          </div>

          {/* Action Buttons - Compact single row */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              marginTop: "8px",
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => {
                calculateSelectionCounts(editor, setSelectionCounts);
                const wordCounts = calculateWordCountsForSelection(
                  editor,
                  value
                );
                setSelectionWordCounts(wordCounts);
              }}
              className="dashboard-btn btn-secondary"
              style={{ flex: 1, padding: "6px 10px", fontSize: "13px" }}
            >
              <FaEye /> Analyze
            </button>
            <button
              onClick={handleSave}
              className="dashboard-btn btn-primary"
              style={{ flex: 1, padding: "6px 10px", fontSize: "13px" }}
            >
              <FaSave /> Save
            </button>
            <button
              onClick={handleCloseCoding}
              className="dashboard-btn btn-success"
              style={{ flex: 1, padding: "6px 10px", fontSize: "13px" }}
            >
              <FaCheckCircle /> Complete
            </button>
            <button
              onClick={handleExportToWord}
              className="dashboard-btn"
              style={{
                flex: 1,
                padding: "6px 10px",
                fontSize: "13px",
                backgroundColor: "#2196F3",
                color: "#fff",
              }}
            >
              <FaFileWord /> Export
            </button>
          </div>

          {/* Results Tables - Compact */}
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "8px",
              marginTop: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              flexShrink: 0,
              height: "180px",
              overflowY: "auto",
            }}
          >
            <h3
              style={{
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px",
              }}
            >
              <FaChartBar /> Results
            </h3>
            <ResultsTables
              fullTextTable={fullTextTable}
              selectionTable={selectionTable}
              additionalStats={additionalStats}
              colors={colors}
              styleSettings={styleSettings}
            />
          </div>
        </div>

        {/* Right Column - Sidebar Full Height */}
        <div
          style={{
            width: "330px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflow: "hidden",
          }}
        >
          {/* Chat - Compact fixed height */}
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "8px",
              marginBottom: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              flexShrink: 0,
            }}
          >
            <h3
              style={{
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px",
              }}
            >
              <FaComment /> Chat
            </h3>
            <CopyChat copyId={copyId} />
          </div>

          {/* Comments Section - Compact */}
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              flexShrink: 0,
            }}
          >
            <h3
              style={{
                fontSize: "14px",
                fontWeight: "600",
                marginBottom: "8px",
              }}
            >
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
        <div className="comment-modal-overlay">
          <div className="comment-modal">
            <div className="comment-modal-header">
              <h4 className="comment-modal-title">
                <FaComment /> Comments
              </h4>
              <button
                onClick={() => setActiveComment(null)}
                className="comment-modal-close"
              >
                <FaTimes />
              </button>
            </div>
            <div className="comment-modal-body">
              {activeComment.map((c) => (
                <div key={c._id} className="comment-item">
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
                  <div className="comment-text">{c.text}</div>
                  {currentUser?._id === c.userId?._id && (
                    <button
                      onClick={() => handleRemoveComment(c._id)}
                      className="comment-delete-btn"
                    >
                      <FaTrash />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
