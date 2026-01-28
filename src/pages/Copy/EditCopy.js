import React, {
  useMemo,
  useCallback,
  useState,
  useEffect,
  useRef,
} from "react";
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
  const [activeComment, setActiveComment] = useState(null);
  const [isAddingComment, setIsAddingComment] = useState(false);

  // ✅ Track comment count to force re-renders
  const prevCommentCountRef = useRef(0);

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

  // ✅ Initial data loading with proper comment handling
  useEffect(() => {
    const loadData = async () => {
      const copy = copyById(copyId);
      if (!copy) {
        console.warn("⚠️ Copy not found:", copyId);
        return;
      }

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

      console.log("✅ Initial load:", {
        highlights: highlights.length,
        comments: commentsForCopy.length,
        copyId,
      });

      // ✅ Set comments first to trigger proper rendering
      setLocalComments(commentsForCopy);

      const decoratedText = applyHighlightsToText(
        baseText,
        highlights,
        [],
        commentsForCopy,
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

    // ✅ CRITICAL: Real-time comment handlers with proper state updates
    const handleCommentCreated = (data) => {
      if (data.copyId === copyId) {
        setLocalComments((prevComments) => {
          const exists = prevComments.some((c) => c._id === data.comment._id);
          if (exists) {
            console.log("⚠️ Duplicate comment ignored:", data.comment._id);
            return prevComments;
          }
          console.log("✅ Real-time comment added:", {
            id: data.comment._id,
            offset: data.comment.offset,
            total: prevComments.length + 1,
          });
          return [...prevComments, data.comment];
        });
      }
    };

    const handleCommentDeleted = (data) => {
      if (data.copyId === copyId) {
        setLocalComments((prevComments) => {
          const filtered = prevComments.filter((c) => c._id !== data.commentId);
          console.log("✅ Real-time comment deleted:", {
            id: data.commentId,
            remaining: filtered.length,
          });
          return filtered;
        });
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

  // ✅ CRITICAL FIX: IMMEDIATE re-render when comments change
  // Forces LIVE update of UI with latest editor state and comments
  useEffect(() => {
    // Early exit checks
    if (!copy || !statementsMap[copy.statementId]) return;
    if (localComments === null || localComments === undefined) return;

    // ✅ Detect if comment count changed (added or removed)
    const currentCommentCount = localComments.length;
    const prevCommentCount = prevCommentCountRef.current;
    const commentCountChanged = currentCommentCount !== prevCommentCount;

    if (commentCountChanged) {
      console.log(
        "🔄 LIVE UPDATE: Comment count changed from",
        prevCommentCount,
        "to",
        currentCommentCount,
      );
    }

    console.log("🔄 Re-rendering editor with comments:", {
      commentCount: currentCommentCount,
      copyId: copy._id,
      hasStatement: !!statementsMap[copy.statementId],
      commentCountChanged,
    });

    const statement = statementsMap[copy.statementId];
    const baseText = statement?.slateText || [
      { type: "paragraph", children: [{ text: "" }] },
    ];

    // ✅ CRITICAL: Extract highlights from CURRENT editor state
    // This preserves unsaved annotations when adding comments
    const currentEditorState = editor.children;
    const { highlights } = extractHighlightsFromValue(currentEditorState);

    console.log("🎨 Applying highlights and comments:", {
      highlights: highlights.length,
      comments: currentCommentCount,
      editorNodes: currentEditorState.length,
    });

    // ✅ Log all comment offsets to debug grouping issues
    const commentsByOffset = {};
    localComments.forEach((c) => {
      if (!commentsByOffset[c.offset]) {
        commentsByOffset[c.offset] = [];
      }
      commentsByOffset[c.offset].push(c);
    });
    console.log("📍 Comments grouped by offset:", {
      uniqueOffsets: Object.keys(commentsByOffset).length,
      offsetGroups: Object.entries(commentsByOffset).map(
        ([offset, comments]) => ({
          offset: parseInt(offset),
          count: comments.length,
          ids: comments.map((c) => c._id.substring(c._id.length - 4)),
        }),
      ),
    });

    // ✅ CRITICAL: Apply highlights AND comments to create decorated text
    const decoratedText = applyHighlightsToText(
      baseText,
      highlights,
      [],
      localComments,
    );

    // ✅ Log decorated text structure with offsets
    console.log("📄 Decorated text structure:", {
      paragraphs: decoratedText.length,
      totalLeaves: decoratedText.reduce(
        (sum, para) => sum + (para.children?.length || 0),
        0,
      ),
      leavesWithComments: decoratedText.reduce((sum, para) => {
        return (
          sum +
          (para.children?.filter((child) => child.comments?.length > 0)
            .length || 0)
        );
      }, 0),
    });

    // ✅ Log each leaf with comments
    decoratedText.forEach((para, paraIndex) => {
      para.children?.forEach((leaf, leafIndex) => {
        if (leaf.comments?.length > 0) {
          console.log(`📝 Leaf [${paraIndex},${leafIndex}]:`, {
            text: leaf.text || "[empty]",
            startOffset: leaf.startOffset,
            endOffset: leaf.endOffset,
            comments: leaf.comments.map((c) => ({
              id: c._id,
              offset: c.offset,
              text: c.text.substring(0, 30) + (c.text.length > 30 ? "..." : ""),
            })),
          });
        }
      });
    });

    // ✅ CRITICAL: Use Slate Transforms to properly update editor content
    // This is better than setValue as it maintains editor state
    if (commentCountChanged) {
      // Replace all children at once
      Transforms.delete(editor, {
        at: {
          anchor: Editor.start(editor, []),
          focus: Editor.end(editor, []),
        },
      });
      Transforms.insertNodes(editor, decoratedText, { at: [0] });
    }

    // Also update the value state for other parts of the component
    setValue(decoratedText);

    // Update ref for next comparison
    prevCommentCountRef.current = currentCommentCount;

    console.log(
      "✅ Editor updated with decorated text - LIVE rendering complete",
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localComments, copy, statementsMap]);

  useEffect(() => {
    if (!value || !colors.length || !styleSettings) return;

    const fullTable = buildResultsTable(
      counts,
      wordCounts,
      colors,
      styleSettings,
    );
    setFullTextTable(fullTable);

    if (selectionCounts && selectionWordCounts) {
      const selTable = buildResultsTable(
        selectionCounts,
        selectionWordCounts,
        colors,
        styleSettings,
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

  // ✅ CRITICAL FIX: Robust offset calculation that IGNORES comment markers
  const getGlobalOffsetFromSelection = useCallback(() => {
    if (!editor.selection) return null;

    // ✅ ALWAYS use Slate's selection and skip comment markers
    let globalOffset = 0;
    const { anchor } = editor.selection;

    const traverse = (nodes, path = []) => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const currentPath = [...path, i];

        if (node.text !== undefined) {
          // ✅ CRITICAL: Skip comment marker nodes (zero-width spaces with comments)
          const isCommentMarker = node.comments && node.comments.length > 0;

          if (
            currentPath.length === anchor.path.length &&
            currentPath.every((val, idx) => val === anchor.path[idx])
          ) {
            // Found the target node
            if (!isCommentMarker) {
              globalOffset += anchor.offset;
            }
            console.log(
              "✅ Offset calculated (excluding comment markers):",
              globalOffset,
            );
            return true; // Found
          } else {
            // Not the target node, add its length if it's not a comment marker
            if (!isCommentMarker) {
              globalOffset += node.text.length;
            }
          }
        }

        if (node.children) {
          if (traverse(node.children, currentPath)) return true;
        }

        // Add newline between paragraphs
        if (path.length === 0 && i < nodes.length - 1) {
          globalOffset += 1;
        }
      }
      return false;
    };

    traverse(editor.children);
    return globalOffset;
  }, [editor]);

  // ✅ CRITICAL: Enhanced renderLeaf with offset tracking and comment merging
  // Supports character-level comment rendering for LTR/RTL text
  const renderLeaf = useCallback(
    ({ leaf, attributes, children }) => {
      // ✅ Extract offset information from leaf (set by applyHighlightsToText)
      const startOffset =
        leaf.startOffset !== undefined ? leaf.startOffset : null;
      const endOffset = leaf.endOffset !== undefined ? leaf.endOffset : null;
      const hasComments = leaf.comments?.length > 0;
      const commentCount = leaf.comments?.length || 0;

      // ✅ Log leaf rendering with comments
      if (hasComments) {
        console.log("📝 Rendering leaf with comments:", {
          text: leaf.text,
          startOffset,
          endOffset,
          commentCount,
          comments: leaf.comments.map((c) => ({
            id: c._id,
            text: c.text.substring(0, 20),
          })),
        });
      }

      const style = {
        backgroundColor: (leaf.text !== "" && leaf.highlight) || undefined,
        textDecoration: leaf.underline ? "underline" : undefined,
        fontWeight: leaf.bold ? "bold" : undefined,
        fontStyle: leaf.italic ? "italic" : undefined,
        outline: leaf.text !== "" && leaf.isDiff ? "2px solid red" : undefined,
        // ✅ Critical: Ensure text is selectable at character level
        userSelect: "text",
        WebkitUserSelect: "text",
        MozUserSelect: "text",
        msUserSelect: "text",
        cursor: "text",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      };

      const colorName = colors.find((c) => c.code === leaf.highlight)?.name;
      const styleNames = [];
      if (leaf.bold) styleNames.push(styleSettings.boldName || "Bold");
      if (leaf.italic) styleNames.push(styleSettings.italicName || "Italic");
      if (leaf.underline)
        styleNames.push(styleSettings.underlineName || "Underline");
      const tooltip = [colorName, ...styleNames].filter(Boolean).join(", ");

      // ✅ Build data attributes for offset tracking and comment detection
      const dataAttributes = {
        "data-slate-leaf": "true",
        ...(startOffset !== null && { "data-start-offset": startOffset }),
        ...(endOffset !== null && { "data-end-offset": endOffset }),
        ...(hasComments && {
          "data-has-comments": "true",
          "data-comment-count": commentCount,
        }),
      };

      return (
        <span {...attributes} {...dataAttributes} style={style} title={tooltip}>
          {leaf.text !== "" ? children : "\u200B"}
          {hasComments && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                console.log("💬 Opening comments:", leaf.comments);
                setActiveComment(leaf.comments);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation();
                  setActiveComment(leaf.comments);
                }
              }}
              style={{
                cursor: "pointer",
                color: "blue",
                fontWeight: "bold",
                marginInlineStart: "5px",
                display: "inline-block",
                verticalAlign: "middle",
                zIndex: 10,
                userSelect: "none",
                // ✅ Stack multiple comments vertically
                ...(commentCount > 1 && {
                  position: "relative",
                  padding: "2px 4px",
                  background: "rgba(255, 255, 255, 0.9)",
                  borderRadius: "3px",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                }),
              }}
              aria-label={`View ${commentCount} comment${commentCount > 1 ? "s" : ""}`}
              title={`${commentCount} comment${commentCount > 1 ? "s" : ""} at offset ${startOffset}`}
            >
              📝
              {commentCount > 1 && (
                <sup style={{ fontSize: "10px" }}>{commentCount}</sup>
              )}
            </span>
          )}
        </span>
      );
    },
    [colors, styleSettings],
  );

  // ✅ Enhanced: Mark color with improved selection handling
  const handleMarkColor = (colorCode) => {
    if (!editor.selection) {
      alert("Please select text to highlight");
      return;
    }

    // Use Slate's transform to apply the color
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

  // ✅ Enhanced: Mark underline with selection check
  const handleMarkUnderline = () => {
    if (!editor.selection) {
      alert("Please select text to underline");
      return;
    }
    markUnderline(editor);
    const newValue = [...editor.children];
    setValue(newValue);
  };

  // ✅ Enhanced: Mark bold with selection check
  const handleMarkBold = () => {
    if (!editor.selection) {
      alert("Please select text to make bold");
      return;
    }
    markBold(editor);
    const newValue = [...editor.children];
    setValue(newValue);
  };

  // ✅ Enhanced: Mark italic with selection check
  const handleMarkItalic = () => {
    if (!editor.selection) {
      alert("Please select text to make italic");
      return;
    }
    markItalic(editor);
    const newValue = [...editor.children];
    setValue(newValue);
  };

  // ✅ Enhanced: Save with proper state management
  const handleSave = async () => {
    if (!copy || !value) return;

    try {
      const editorValue = editor.children;
      const { highlights, colorCounts } =
        extractHighlightsFromValue(editorValue);

      // Save to backend
      await saveCopyWithHighlights(copy._id, highlights, colorCounts);

      // Update local counts
      setCounts(colorCounts);

      // Update word counts
      setWordCounts(calculateWordCounts(editorValue));

      // Clear selection
      editor.selection = null;

      // ✅ Re-apply with current state to refresh display
      const statement = statementsMap[copy.statementId];
      const baseText = statement?.slateText || [
        { type: "paragraph", children: [{ text: "" }] },
      ];
      const decoratedText = applyHighlightsToText(
        baseText,
        highlights,
        [],
        localComments,
      );
      setValue(decoratedText);

      console.log("✅ Saved successfully:", {
        highlights: highlights.length,
        comments: localComments.length,
      });
    } catch (error) {
      console.error("❌ Error saving:", error);
      alert("Failed to save. Please try again.");
    }
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

  // ✅ CRITICAL FIX: Simplified comment addition - let socket handle state update
  const handleAddComment = async () => {
    if (!editor.selection) {
      return alert(
        "Please select a location in the text before adding a comment",
      );
    }
    if (!newComment.trim()) {
      return alert("Please enter comment text");
    }

    const offset = getGlobalOffsetFromSelection();
    if (offset === null) {
      return alert("Could not determine text position");
    }

    console.log("📝 Adding comment at offset:", offset, "Text:", newComment);

    try {
      // ✅ Save to backend - socket will handle state update for all clients
      await addComment(currentUser._id, copyId, newComment, offset);

      // Clear selection and form
      editor.selection = null;
      setNewComment("");
      setIsAddingComment(false);

      console.log("✅ Comment saved to backend at offset:", offset);

      // ✅ Force refresh comments from backend to ensure consistency
      const refreshedComments = await fetchCommentsByCopyId(copyId);
      setLocalComments(refreshedComments);
      console.log(
        "✅ Comments refreshed from backend:",
        refreshedComments.length,
      );
    } catch (error) {
      console.error("❌ Error adding comment:", error);
      alert("Failed to add comment. Please try again.");
    }
  };

  // ✅ CRITICAL FIX: Simplified comment removal - refresh from backend
  const handleRemoveComment = async (commentId) => {
    try {
      await deleteComment(commentId);

      // Clear selection and modal
      editor.selection = null;
      setActiveComment(null);

      console.log("✅ Comment removed:", commentId);

      // ✅ Force refresh comments from backend to ensure consistency
      const refreshedComments = await fetchCommentsByCopyId(copyId);
      setLocalComments(refreshedComments);
      console.log(
        "✅ Comments refreshed from backend:",
        refreshedComments.length,
      );
    } catch (error) {
      console.error("❌ Error removing comment:", error);
      alert("Failed to remove comment. Please try again.");
    }
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
        totalWordsInText: additionalStats?.totalWordsFullText || 0,
        totalColoredWords: additionalStats?.totalColoredWordsFullText || 0,
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
              flex: "0 1 45%",
              minHeight: "250px",
              maxHeight: "60vh",
              display: "flex",
              flexDirection: "column",
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
              key={`slate-${copy?._id}`}
              editor={editor}
              initialValue={value}
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
                  textAlign: "left",
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
                  // ✅ Critical: Auto-detect text direction for LTR/RTL support
                  dir="auto"
                  // ✅ Enable perfect character-level selection
                  data-slate-editor="true"
                  style={{
                    fontSize: "18px",
                    lineHeight: "2",
                    // ✅ Ensure every character is selectable
                    userSelect: "text",
                    WebkitUserSelect: "text",
                    MozUserSelect: "text",
                    msUserSelect: "text",
                    cursor: "text",
                    // ✅ Better text rendering for accurate clicks
                    textRendering: "geometricPrecision",
                    // ✅ Prevent layout shift during selection
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
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
                  value,
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
              flex: "1 1 auto",
              minHeight: "300px",
              maxHeight: "calc(100vh - 70vh - 120px)", // Remaining space after viewer
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
