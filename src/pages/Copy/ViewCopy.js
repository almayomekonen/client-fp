import React, {
  useMemo,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createEditor, Path, Transforms, Editor } from "slate";
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
  FaFileWord,
} from "react-icons/fa";
import { useCopy } from "../../context/CopyContext";
import { useStatement } from "../../context/StatementContext";
import { useData } from "../../context/DataContext";
import { useEdit } from "../../context/EditContext";
import { useComment } from "../../context/CommentContext";
import { useResult } from "../../context/ResultContext";
import { useColor } from "../../context/ColorContext";
import { useStyleSetting } from "../../context/StyleSettingContext";
import { useSocket } from "../../context/SocketContext";
import { exportCopyToWord } from "../../utils/wordExport";
import CopyChat from "../../components/CopyChat";
import ResultsTables from "../../components/ResultsTables";
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
    buildResultsTable,
    calculateAdditionalStats,
  } = useResult();
  const { addComment, deleteComment, fetchCommentsByCopyId } = useComment();
  const { getColors } = useColor();
  const { getStyleSetting } = useStyleSetting();
  const { socket } = useSocket();

  const [value, setValue] = useState(null);
  const [counts, setCounts] = useState({});
  const [wordCounts, setWordCounts] = useState({});
  const [selectionCounts, setSelectionCounts] = useState(null);
  const [selectionWordCounts, setSelectionWordCounts] = useState(null);
  const [copy, setCopy] = useState(null);
  const [localComments, setLocalComments] = useState([]);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [activeComment, setActiveComment] = useState(null);

  // ✅ Track comment count to force re-renders
  const prevCommentCountRef = useRef(0);
  const [statementsMap, setStatementsMap] = useState({}); // statementId -> statement
  const [colors, setColors] = useState([]);
  const [styleSettings, setStyleSettings] = useState({});

  // New state for results tables
  const [fullTextTable, setFullTextTable] = useState(null);
  const [selectionTable, setSelectionTable] = useState(null);
  const [additionalStats, setAdditionalStats] = useState(null);

  // Redirect if no user - only after auth check is complete
  useEffect(() => {
    if (isAuthChecked && !currentUser) navigate("/", { replace: true });
  }, [currentUser, isAuthChecked, navigate]);

  // Load style settings
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
        commentsForCopy,
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

    // ✅ CRITICAL: Real-time comment handlers with proper logging
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

    const handleCopyUpdated = (data) => {
      if (data.copy._id === copyId && data.copy.status !== "completed") {
        alert("This copy has been reopened for editing.");
        navigate("/");
      }
    };

    socket.on("copyUpdated", handleCopyUpdated);

    return () => {
      socket.off("commentCreated", handleCommentCreated);
      socket.off("commentDeleted", handleCommentDeleted);
      socket.off("copyDeleted", handleCopyDeleted);
      socket.off("copyUpdated", handleCopyUpdated);
    };
  }, [socket, copyId, navigate]);

  // ✅ CRITICAL FIX: IMMEDIATE re-render when comments change
  // Forces LIVE update of UI with latest highlights and comments
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

    console.log("🔄 Re-rendering viewer with comments:", {
      commentCount: currentCommentCount,
      copyId: copy._id,
      hasStatement: !!statementsMap[copy.statementId],
      commentCountChanged,
    });

    const statement = statementsMap[copy.statementId];
    const baseText = statement?.text || [
      { type: "paragraph", children: [{ text: "" }] },
    ];
    const highlights = copy?.highlights || [];

    console.log("🎨 Applying highlights and comments:", {
      highlights: highlights.length,
      comments: currentCommentCount,
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
    // This ensures immediate rendering without needing page reload
    if (commentCountChanged) {
      console.log("🔄 Updating editor with Transforms API");
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
      "✅ Viewer updated with decorated text - LIVE rendering complete",
    );
  }, [localComments, copy, statementsMap, applyHighlightsToText, editor]);

  // Update results tables when data changes
  useEffect(() => {
    if (!value || !colors.length || !styleSettings) return;

    // Build full text table
    const fullTable = buildResultsTable(
      counts,
      wordCounts,
      colors,
      styleSettings,
    );
    setFullTextTable(fullTable);

    // Build selection table if we have selection data
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

    // Calculate additional stats
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

  // ✅ Calculate global offset from Slate selection - IGNORES comment markers
  const getGlobalOffsetFromValue = (value, anchorPath, anchorOffset) => {
    let globalOffset = 0;
    const traverse = (nodes, path = []) => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const currentPath = [...path, i];
        if (node.text !== undefined) {
          // ✅ CRITICAL: Skip comment marker nodes (zero-width spaces with comments)
          const isCommentMarker = node.comments && node.comments.length > 0;

          if (Path.equals(currentPath, anchorPath)) {
            if (!isCommentMarker) {
              globalOffset += anchorOffset;
            }
            console.log(
              "✅ Offset calculated (excluding comment markers):",
              globalOffset,
            );
            throw "FOUND"; // eslint-disable-line no-throw-literal
          } else {
            // Not the target node, add its length if it's not a comment marker
            if (!isCommentMarker) {
              globalOffset += node.text.length;
            }
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

  // ✅ CRITICAL FIX: Simplified comment addition - refresh from backend
  const handleAddComment = async () => {
    if (!editor.selection)
      return alert(
        "Please select a location in the text before adding a comment",
      );
    if (!newComment) return alert("Please enter text for the comment");

    const { anchor } = editor.selection;
    const offset = getGlobalOffsetFromValue(value, anchor.path, anchor.offset);

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
        slateValue: value,
        counts,
        wordCounts,
        comments: localComments,
        colors,
        styleSettings,
        users: [],
        copyName: `Statement_View_${currentUser?.username || "User"}`,
        statementName,
        totalWordsInText: additionalStats?.totalWordsFullText || 0,
        totalColoredWords: additionalStats?.totalColoredWordsFullText || 0,
      });
    } catch (error) {
      console.error("❌ Export error:", error);
      alert("❌ Failed to export document. Please try again.");
    }
  };

  if (!value)
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div>Loading statement...</div>
      </div>
    );

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "20px 10px 10px 10px",
        boxSizing: "border-box",
      }}
    >
      {/* Header - Compact */}
      <div style={{ marginBottom: "10px", flexShrink: 0 }}>
        <h1
          style={{
            fontSize: "22px",
            fontWeight: "600",
            marginBottom: "5px",
            marginTop: "0",
          }}
        >
          <FaEye /> Statement Viewer
        </h1>
        <p style={{ fontSize: "13px", color: "#666" }}>
          <FaFileAlt style={{ marginRight: "8px" }} />
          View coded statement and add comments
        </p>
      </div>

      {/* Main Content Grid - Takes remaining space */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
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
          {/* Viewer Card - Takes space */}
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
              <FaFileAlt /> Statement Content
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
                  readOnly
                  onKeyDown={(event) => {
                    // Prevent all keyboard input that would modify text
                    if (!event.ctrlKey && !event.metaKey && !event.altKey) {
                      event.preventDefault();
                    }
                  }}
                  // ✅ Critical: Auto-detect text direction for LTR/RTL support
                  dir="auto"
                  placeholder="No text available"
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
          </div>

          {/* Action Buttons - Compact */}
          <div
            style={{
              display: "flex",
              gap: "6px",
              marginBottom: "8px",
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
              padding: "10px",
              marginTop: "8px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              flex: "1 1 auto",
              minHeight: "300px",
              maxHeight: "calc(100vh - 50vh - 120px)", // Remaining space after viewer
              overflowY: "auto", // Scrollable
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
