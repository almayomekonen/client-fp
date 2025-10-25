import React, { useMemo, useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { createEditor, Path } from "slate";
import { Slate, Editable, withReact } from "slate-react";
import { useNavigate } from "react-router-dom";
import {
  FaCodeBranch,
  FaPalette,
  FaEraser,
  FaUnderline,
  FaBold,
  FaItalic,
  FaSave,
  FaChartBar,
  FaComment,
  FaTimes,
  FaPlus,
  FaTrash,
  FaUser,
  FaCheckCircle,
  FaTimesCircle,
} from "react-icons/fa";

import { useEdit } from "../../context/EditContext";
import { useCopy } from "../../context/CopyContext";
import { useStatement } from "../../context/StatementContext";
import { useData } from "../../context/DataContext";
import { useComment } from "../../context/CommentContext";
import { useComparison } from "../../context/ComparisonContext";
import { useResult } from "../../context/ResultContext";
import { useColor } from "../../context/ColorContext";
import { useStyleSetting } from "../../context/StyleSettingContext";
import { useSocket } from "../../context/SocketContext";
import "../../styles/Dashboard.css";

export default function ComparePage() {
  const { statementId } = useParams();
  const editorA = useMemo(() => withReact(createEditor()), []);
  const editorB = useMemo(() => withReact(createEditor()), []);

  const { copiesByStatementId, saveCopyWithHighlights } = useCopy();
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

  const {
    createComparison,
    deleteComparison,
    compareCopies,
    checkComparisonExists,
  } = useComparison();
  const { statementById } = useStatement();
  const { currentUser, users } = useData();
  const { getColors } = useColor(); // מוסיפים את הפונקציה הזו מה־ColorContext
  const { getStyleSetting } = useStyleSetting();
  const { socket } = useSocket();

  const { addComment, deleteComment, fetchCommentsByCopyId } = useComment();

  const [valueA, setValueA] = useState(null);
  const [countsA, setCountsA] = useState({});
  const [wordCountsA, setWordCountsA] = useState({});
  const [selectionCountsA, setSelectionCountsA] = useState(null);
  const [selectionWordCountsA, setSelectionWordCountsA] = useState(null);
  const [copyA, setCopyA] = useState(null);
  const [newCommentA, setNewCommentA] = useState("");
  const [localCommentsA, setLocalCommentsA] = useState([]);
  const [activeCommentA, setActiveCommentA] = useState(null);
  const [commentKeyA, setCommentKeyA] = useState(0);
  const [showInputA, setShowInputA] = useState(false);

  const [valueB, setValueB] = useState(null);
  const [countsB, setCountsB] = useState({});
  const [wordCountsB, setWordCountsB] = useState({});
  const [selectionCountsB, setSelectionCountsB] = useState(null);
  const [selectionWordCountsB, setSelectionWordCountsB] = useState(null);
  const [copyB, setCopyB] = useState(null);
  const [newCommentB, setNewCommentB] = useState("");
  const [localCommentsB, setLocalCommentsB] = useState([]);
  const [activeCommentB, setActiveCommentB] = useState(null);
  const [commentKeyB, setCommentKeyB] = useState(0);
  const [showInputB, setShowInputB] = useState(false);

  const [copies, setCopies] = useState([]);
  const [statement, setStatement] = useState(null);
  const [diffs, setDiffs] = useState([]);
  const [diffKey, setDiffKey] = useState(0);

  const [colors, setColors] = useState([]);
  const [styleSettings, setStyleSettings] = useState({});
  const [isCompared, setIsCompared] = useState(false);

  const navigate = useNavigate();

  // Refs for scroll syncing
  const scrollContainerA = useRef(null);
  const scrollContainerB = useRef(null);
  const isScrollingA = useRef(false);
  const isScrollingB = useRef(false);

  // Scroll sync handlers
  const handleScrollA = () => {
    if (isScrollingB.current) return;
    isScrollingA.current = true;
    if (scrollContainerA.current && scrollContainerB.current) {
      scrollContainerB.current.scrollTop = scrollContainerA.current.scrollTop;
    }
    setTimeout(() => {
      isScrollingA.current = false;
    }, 100);
  };

  const handleScrollB = () => {
    if (isScrollingA.current) return;
    isScrollingB.current = true;
    if (scrollContainerA.current && scrollContainerB.current) {
      scrollContainerA.current.scrollTop = scrollContainerB.current.scrollTop;
    }
    setTimeout(() => {
      isScrollingB.current = false;
    }, 100);
  };

  // בעת טעינת העמוד, בודקים אם ההשוואה קיימת
  useEffect(() => {
    const checkComparison = async () => {
      if (copyA && copyB) {
        const exists = await checkComparisonExists(copyA._id, copyB._id);
        setIsCompared(exists);
      }
    };
    checkComparison();
  }, [copyA, copyB, checkComparisonExists]);

  // Poll to check if comparison still exists - redirect if canceled
  useEffect(() => {
    if (!copyA || !copyB || !isCompared) return;

    const pollInterval = setInterval(async () => {
      try {
        const exists = await checkComparisonExists(copyA._id, copyB._id);
        if (!exists) {
          clearInterval(pollInterval);
          alert(
            "The comparison was canceled by the investigator. You are being redirected to the home page."
          );
          navigate("/coderHome");
        }
      } catch (err) {
        console.error("Error checking comparison existence:", err);
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(pollInterval);
  }, [copyA, copyB, isCompared, navigate, checkComparisonExists]);

  // Real-time listener for comparison cancellation (instant notification via Socket.io)
  useEffect(() => {
    if (!socket || !copyA || !copyB) return;

    const handleComparisonCancelled = (data) => {
      const { copyId1, copyId2, message } = data;

      // Check if this is the comparison being viewed
      const isViewingCancelledComparison =
        (copyA._id === copyId1 && copyB._id === copyId2) ||
        (copyA._id === copyId2 && copyB._id === copyId1);

      if (isViewingCancelledComparison) {
        console.log("🔔 Comparison cancelled event received");
        alert(
          message || "This comparison has been cancelled by the researcher."
        );
        navigate("/coderHome");
      }
    };

    socket.on("comparisonCancelled", handleComparisonCancelled);

    return () => {
      socket.off("comparisonCancelled", handleComparisonCancelled);
    };
  }, [socket, copyA, copyB, navigate]);

  useEffect(() => {
    if (!currentUser) {
      navigate("/", { replace: true });
    }
  }, [currentUser, navigate]);

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
        const fetchedColors = await getColors(); // Call to server via ColorContext
        setColors(fetchedColors);
      } catch (err) {
        console.error("Error loading colors", err);
      }
    };
    loadColors();
  }, [getColors]);

  useEffect(() => {
    async function fetchData() {
      const s = await statementById(statementId);
      const c = await copiesByStatementId(statementId);
      setStatement(s);
      setCopies(c);

      const completedCopies = c.filter((copy) => copy.status === "completed");

      if (completedCopies.length >= 2) {
        setCopyA(completedCopies[0]);
        setCopyB(completedCopies[1]);

        const fullText = s.text[0].children[0].text;
        const comparison = compareCopies(
          completedCopies[0],
          completedCopies[1],
          fullText
        );
        setDiffs(comparison);

        const baseText = s?.text || [
          { type: "paragraph", children: [{ text: "" }] },
        ];

        const commentsForA = completedCopies[0]
          ? await fetchCommentsByCopyId(completedCopies[0]._id)
          : [];
        const commentsForB = completedCopies[1]
          ? await fetchCommentsByCopyId(completedCopies[1]._id)
          : [];
        setLocalCommentsA(commentsForA);
        setLocalCommentsB(commentsForB);

        const valueA = applyHighlightsToText(
          baseText,
          completedCopies[0].highlights || [],
          comparison,
          commentsForA
        );
        const valueB = applyHighlightsToText(
          baseText,
          completedCopies[1].highlights || [],
          comparison,
          commentsForB
        );

        editorA.selection = null;
        editorB.selection = null;

        setValueA(valueA);
        setCountsA(completedCopies[0].colorCounts || {});
        setValueB(valueB);
        setCountsB(completedCopies[1].colorCounts || {});
        const wordCountsResultA = calculateWordCounts(valueA);
        setWordCountsA(wordCountsResultA);
        const wordCountsResultB = calculateWordCounts(valueB);
        setWordCountsB(wordCountsResultB);
      }
    }

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statementId]);

  const getRenderLeaf =
    (setActiveComment) =>
    ({ leaf, attributes, children }) => {
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
                verticalAlign: "middle",
              }}
            >
              📝
            </span>
          )}
        </span>
      );
    };

  const getGlobalOffsetFromValue = (value, anchorPath, anchorOffset) => {
    let globalOffset = 0;

    const traverse = (nodes, path = []) => {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const currentPath = [...path, i];

        if (node.text !== undefined) {
          if (Path.equals(currentPath, anchorPath)) {
            globalOffset += anchorOffset;
            throw new Error("FOUND");
          } else {
            globalOffset += node.text.length;
          }
        }

        if (node.children) {
          traverse(node.children, currentPath);
        }

        if (path.length === 0 && i < nodes.length - 1) {
          globalOffset += 1;
        }
      }
    };

    try {
      traverse(value);
    } catch (e) {
      if (e.message !== "FOUND") throw e;
    }

    return globalOffset;
  };

  const handleAddComment = async (
    editor,
    value,
    setNewComment,
    localComments,
    setLocalComments,
    setValue,
    copyId,
    statement,
    setCommentKey,
    newComment
  ) => {
    if (!editor.selection) {
      alert("Please select a location in the text before adding a comment");
      return;
    }

    if (!newComment) {
      alert("Please enter text for the comment");
      return;
    }

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

    const { highlights } = extractHighlightsFromValue(value);

    const decoratedText = applyHighlightsToText(
      statement?.text || [{ type: "paragraph", children: [{ text: "" }] }],
      highlights,
      diffs,
      updatedLocalComments
    );
    editor.selection = null;

    setValue(decoratedText);
    setNewComment("");
  };

  const handleRemoveComment = async (
    commentId,
    localComments,
    setLocalComments,
    setValue,
    statement,
    value,
    setCommentKey,
    editor,
    setActiveComment
  ) => {
    await deleteComment(commentId);
    const updatedLocalComments = localComments.filter(
      (c) => c._id !== commentId
    );
    setLocalComments(updatedLocalComments);
    setCommentKey((prev) => prev + 1);

    const { highlights } = extractHighlightsFromValue(value);

    const decoratedText = applyHighlightsToText(
      statement?.text || [{ type: "paragraph", children: [{ text: "" }] }],
      highlights,
      diffs,
      updatedLocalComments
    );
    editor.selection = null;

    setValue(decoratedText);
    setActiveComment(null);
  };

  const handleSave = async (editor, copy, value, setCounts) => {
    if (!copy || !value || !statement) return;
    const editorValue = editor?.children;

    const { highlights, colorCounts } = extractHighlightsFromValue(editorValue);
    await saveCopyWithHighlights(copy._id, highlights, colorCounts);
    setCounts(colorCounts);
    alert("Saved successfully!");

    const updatedCopy = { ...copy, highlights, colorCounts };
    const nextCopyA = copy._id === copyA?._id ? updatedCopy : copyA;
    const nextCopyB = copy._id === copyB?._id ? updatedCopy : copyB;

    if (copy._id === copyA?._id) setCopyA(updatedCopy);
    if (copy._id === copyB?._id) setCopyB(updatedCopy);

    setCopies((prev) =>
      prev.map((c) => (c._id === copy._id ? updatedCopy : c))
    );

    const fullText = statement.text[0].children[0].text;
    const updatedDiffs = compareCopies(nextCopyA, nextCopyB, fullText);
    setDiffs(updatedDiffs);
    setDiffKey((prev) => prev + 1);

    const baseText = statement.text;
    const newValueA = applyHighlightsToText(
      baseText,
      nextCopyA.highlights || [],
      updatedDiffs,
      localCommentsA
    );
    const newValueB = applyHighlightsToText(
      baseText,
      nextCopyB.highlights || [],
      updatedDiffs,
      localCommentsB
    );
    editorA.selection = null;
    editorB.selection = null;

    setValueA(newValueA);
    setValueB(newValueB);

    const wordCountsResultA = calculateWordCounts(newValueA);
    const wordCountsResultB = calculateWordCounts(newValueB);

    setWordCountsA(wordCountsResultA);
    setWordCountsB(wordCountsResultB);

    setCommentKeyA((prev) => prev + 1);
    setCommentKeyB((prev) => prev + 1);
  };

  const handleCompareSelectionA = async () => {
    if (!copyA || !copyB || !statement || !editorA.selection) {
      alert("Please select a text range in editor A");
      return;
    }

    const { selection } = editorA;

    if (
      !selection ||
      (selection.anchor.offset === selection.focus.offset &&
        Path.equals(selection.anchor.path, selection.focus.path))
    ) {
      alert("Selection is empty");
      return;
    }

    const startOffset = Math.min(
      getGlobalOffsetFromValue(
        valueA,
        selection.anchor.path,
        selection.anchor.offset
      ),
      getGlobalOffsetFromValue(
        valueA,
        selection.focus.path,
        selection.focus.offset
      )
    );

    const endOffset = Math.max(
      getGlobalOffsetFromValue(
        valueA,
        selection.anchor.path,
        selection.anchor.offset
      ),
      getGlobalOffsetFromValue(
        valueA,
        selection.focus.path,
        selection.focus.offset
      )
    );

    const updatedDiffs = compareCopies(
      copyA,
      copyB,
      statement.text[0].children[0].text,
      { start: startOffset, end: endOffset }
    );

    const baseText = statement.text;

    const newValueA = applyHighlightsToText(
      baseText,
      copyA.highlights || [],
      updatedDiffs,
      localCommentsA
    );

    const newValueB = applyHighlightsToText(
      baseText,
      copyB.highlights || [],
      updatedDiffs,
      localCommentsB
    );

    editorA.selection = null;
    editorB.selection = null;

    setValueA(newValueA);
    setValueB(newValueB);
    setDiffs(updatedDiffs);
    setDiffKey((prev) => prev + 1);
  };

  const handleCompareSelectionB = () => {
    if (!copyA || !copyB || !statement || !editorB.selection) {
      alert("Please select a text range in editor B");
      return;
    }

    const { selection } = editorB;

    if (
      !selection ||
      (selection.anchor.offset === selection.focus.offset &&
        Path.equals(selection.anchor.path, selection.focus.path))
    ) {
      alert("Selection is empty");
      return;
    }

    const startOffset = Math.min(
      getGlobalOffsetFromValue(
        valueB,
        selection.anchor.path,
        selection.anchor.offset
      ),
      getGlobalOffsetFromValue(
        valueB,
        selection.focus.path,
        selection.focus.offset
      )
    );

    const endOffset = Math.max(
      getGlobalOffsetFromValue(
        valueB,
        selection.anchor.path,
        selection.anchor.offset
      ),
      getGlobalOffsetFromValue(
        valueB,
        selection.focus.path,
        selection.focus.offset
      )
    );

    const updatedDiffs = compareCopies(
      copyA,
      copyB,
      statement.text[0].children[0].text,
      { start: startOffset, end: endOffset }
    );

    const baseText = statement.text;

    const newValueA = applyHighlightsToText(
      baseText,
      copyA.highlights || [],
      updatedDiffs,
      localCommentsA
    );

    const newValueB = applyHighlightsToText(
      baseText,
      copyB.highlights || [],
      updatedDiffs,
      localCommentsB
    );

    editorA.selection = null;
    editorB.selection = null;

    setValueA(newValueA);
    setValueB(newValueB);
    setDiffs(updatedDiffs);
    setDiffKey((prev) => prev + 1);
  };

  const handleCopySelection = async (editorName, copyId) => {
    if (!statement) return;

    const selectedCopy = copies.find((c) => c._id === copyId);
    if (!selectedCopy) return;

    if (
      (editorName === "A" && selectedCopy._id === copyB?._id) ||
      (editorName === "B" && selectedCopy._id === copyA?._id)
    ) {
      alert("Cannot select the same copy for both editors");
      return;
    }

    const baseText = statement.text;
    const nextCopyA = editorName === "A" ? selectedCopy : copyA;
    const nextCopyB = editorName === "B" ? selectedCopy : copyB;

    const updatedDiffs = compareCopies(
      nextCopyA,
      nextCopyB,
      baseText[0].children[0].text
    );

    const commentsForA = nextCopyA
      ? await fetchCommentsByCopyId(nextCopyA._id)
      : [];
    const commentsForB = nextCopyB
      ? await fetchCommentsByCopyId(nextCopyB._id)
      : [];

    setLocalCommentsA(commentsForA);
    setLocalCommentsB(commentsForB);

    const newValueA = applyHighlightsToText(
      baseText,
      nextCopyA.highlights || [],
      updatedDiffs,
      commentsForA
    );
    const newValueB = applyHighlightsToText(
      baseText,
      nextCopyB.highlights || [],
      updatedDiffs,
      commentsForB
    );

    setCopyA(nextCopyA);
    setCopyB(nextCopyB);

    editorA.selection = null;
    editorB.selection = null;

    setValueA(newValueA);
    setValueB(newValueB);

    setCommentKeyA((prev) => prev + 1);
    setCommentKeyB((prev) => prev + 1);

    setCountsA(nextCopyA.colorCounts || {});
    setCountsB(nextCopyB.colorCounts || {});

    // ⭐ Recalculate word counts for each copy
    const wordCountsResultA = calculateWordCounts(newValueA);
    const wordCountsResultB = calculateWordCounts(newValueB);
    setWordCountsA(wordCountsResultA);
    setWordCountsB(wordCountsResultB);

    setDiffs(updatedDiffs);
    setDiffKey((prev) => prev + 1);
  };

  const handleToggleComparison = async () => {
    if (!copyA || !copyB) return;

    const alreadyCompared = await checkComparisonExists(copyA._id, copyB._id);

    if (alreadyCompared) {
      await deleteComparison(copyA._id, copyB._id);
      setIsCompared(false);
      alert("Comparison canceled successfully");
    } else {
      await createComparison(copyA._id, copyB._id);
      setIsCompared(true);
      alert("Comparison created successfully");
    }
  };

  if (!valueA || !valueB || !statement) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-loading">
          <div className="loading-spinner"></div>
          <p>Loading comparison...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            <FaCodeBranch /> Compare Copies
          </h1>
          <p className="dashboard-subtitle">
            Edit and compare two coding copies
          </p>
        </div>
      </div>

      {/* Comparison Control */}
      <div className="dashboard-card" style={{ marginBottom: "20px" }}>
        <div className="card-header">
          <h3 className="card-title">
            <FaCodeBranch /> Comparison Control
          </h3>
        </div>
        <div className="card-body">
          <button
            onClick={handleToggleComparison}
            className={`dashboard-btn ${
              isCompared ? "dashboard-btn-danger" : "dashboard-btn-primary"
            }`}
            style={{ width: "100%" }}
          >
            {isCompared ? (
              <>
                <FaTimesCircle /> Cancel Comparison
              </>
            ) : (
              <>
                <FaCheckCircle /> Activate Comparison
              </>
            )}
          </button>
        </div>
      </div>

      {/* Copy Selection */}
      <div className="comparison-container" style={{ marginBottom: "20px" }}>
        <div className="coding-block dashboard-card">
          <div className="card-header">
            <h3 className="card-title">
              <FaUser /> Coding A
            </h3>
          </div>
          <div className="card-body">
            <label className="form-label">Select Coder:</label>
            <select
              value={copyA?._id || ""}
              onChange={(e) => handleCopySelection("A", e.target.value)}
              className="form-select"
            >
              {!copyA && <option value="">--Select copy--</option>}
              {copyA && (
                <option value={copyA._id}>
                  {users.find((user) => user._id === copyA.coderId)?.username ||
                    copyA.coderId}
                </option>
              )}
              {copies
                .filter(
                  (copy) =>
                    copy.status === "completed" &&
                    copy._id !== copyA?._id &&
                    copy._id !== copyB?._id
                )
                .map((copy) => (
                  <option key={copy._id} value={copy._id}>
                    {users.find((user) => user._id === copy.coderId)
                      ?.username || copy.coderId}
                  </option>
                ))}
            </select>
            <button
              onClick={handleCompareSelectionA}
              className="dashboard-btn dashboard-btn-secondary"
              style={{ marginTop: "10px", width: "100%" }}
            >
              <FaChartBar /> Compare Selected Range
            </button>
          </div>
        </div>

        <div className="coding-block dashboard-card">
          <div className="card-header">
            <h3 className="card-title">
              <FaUser /> Coding B
            </h3>
          </div>
          <div className="card-body">
            <label className="form-label">Select Coder:</label>
            <select
              value={copyB?._id || ""}
              onChange={(e) => handleCopySelection("B", e.target.value)}
              className="form-select"
            >
              {!copyB && <option value="">--Select copy--</option>}
              {copyB && (
                <option value={copyB._id}>
                  {users.find((user) => user._id === copyB.coderId)?.username ||
                    copyB.coderId}
                </option>
              )}
              {copies
                .filter(
                  (copy) =>
                    copy.status === "completed" &&
                    copy._id !== copyB?._id &&
                    copy._id !== copyA?._id
                )
                .map((copy) => (
                  <option key={copy._id} value={copy._id}>
                    {users.find((user) => user._id === copy.coderId)
                      ?.username || copy.coderId}
                  </option>
                ))}
            </select>
            <button
              onClick={handleCompareSelectionB}
              className="dashboard-btn dashboard-btn-secondary"
              style={{ marginTop: "10px", width: "100%" }}
            >
              <FaChartBar /> Compare Selected Range
            </button>
          </div>
        </div>
      </div>

      {/* Comparison Container - Side by Side */}
      <div className="comparison-container">
        {[
          {
            name: "A",
            editor: editorA,
            value: valueA,
            setValue: setValueA,
            copy: copyA,
            counts: countsA,
            setCounts: setCountsA,
            selectionCounts: selectionCountsA,
            setSelectionCounts: setSelectionCountsA,
            activeComment: activeCommentA,
            setActiveComment: setActiveCommentA,
            commentKey: commentKeyA,
            newComment: newCommentA,
            setNewComment: setNewCommentA,
            localComments: localCommentsA,
            setLocalComments: setLocalCommentsA,
            showInput: showInputA,
            setShowInput: setShowInputA,
            selectionWordCounts: selectionWordCountsA,
            setSelectionWordCounts: setSelectionWordCountsA,
          },
          {
            name: "B",
            editor: editorB,
            value: valueB,
            setValue: setValueB,
            copy: copyB,
            counts: countsB,
            setCounts: setCountsB,
            selectionCounts: selectionCountsB,
            setSelectionCounts: setSelectionCountsB,
            activeComment: activeCommentB,
            setActiveComment: setActiveCommentB,
            commentKey: commentKeyB,
            newComment: newCommentB,
            setNewComment: setNewCommentB,
            localComments: localCommentsB,
            setLocalComments: setLocalCommentsB,
            showInput: showInputB,
            setShowInput: setShowInputB,
            selectionWordCounts: selectionWordCountsB,
            setSelectionWordCounts: setSelectionWordCountsB,
          },
        ].map(
          ({
            name,
            editor,
            value,
            setValue,
            copy,
            counts,
            setCounts,
            selectionCounts,
            setSelectionCounts,
            activeComment,
            setActiveComment,
            commentKey,
            newComment,
            setNewComment,
            localComments,
            setLocalComments,
            showInput,
            setShowInput,
            selectionWordCounts,
            setSelectionWordCounts,
          }) => (
            <div key={name} className="coding-block dashboard-card">
              <div className="card-header">
                <h3 className="card-title">
                  <FaUser /> Coding {name} -{" "}
                  {users.find((user) => user._id === copy?.coderId)?.username ||
                    "Unknown"}
                </h3>
              </div>

              {currentUser?._id === copy?.coderId && (
                <div
                  className="card-body"
                  style={{ borderBottom: "1px solid #e5e7eb" }}
                >
                  {/* Highlighting Tools */}
                  <div className="tool-section">
                    <h4 className="tool-title">
                      <FaPalette /> Highlighting Tools
                    </h4>
                    <div className="color-palette">
                      {colors.map((color) => (
                        <button
                          key={color._id}
                          onClick={() => markColor(editor, color.code)}
                          className="color-btn"
                          style={{ backgroundColor: color.code }}
                          title={color.name}
                        />
                      ))}
                    </div>
                    <div className="tool-buttons">
                      <button
                        onClick={() => removeFormatting(editor)}
                        className="tool-btn"
                      >
                        <FaEraser /> Remove All Markings
                      </button>
                      {styleSettings.underlineEnabled && (
                        <button
                          onClick={() => markUnderline(editor)}
                          className="tool-btn"
                        >
                          <FaUnderline /> Underline
                        </button>
                      )}
                      {styleSettings.boldEnabled && (
                        <button
                          onClick={() => markBold(editor)}
                          className="tool-btn"
                        >
                          <FaBold /> Bold
                        </button>
                      )}
                      {styleSettings.italicEnabled && (
                        <button
                          onClick={() => markItalic(editor)}
                          className="tool-btn"
                        >
                          <FaItalic /> Italic
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => handleSave(editor, copy, value, setCounts)}
                      className="dashboard-btn dashboard-btn-primary"
                      style={{ width: "100%" }}
                    >
                      <FaSave /> Save Changes
                    </button>
                  </div>
                </div>
              )}

              <div className="card-body">
                <Slate
                  key={`slate-${name}-${copy?._id}-${diffKey}-${commentKey}`}
                  editor={editor}
                  initialValue={value}
                  value={value}
                  onChange={setValue}
                >
                  <div
                    ref={name === "A" ? scrollContainerA : scrollContainerB}
                    onScroll={name === "A" ? handleScrollA : handleScrollB}
                    style={{
                      minHeight: "400px",
                      maxHeight: "600px",
                      overflowY: "auto",
                    }}
                  >
                    <Editable
                      renderLeaf={getRenderLeaf(setActiveComment)}
                      placeholder={`Coding ${name}`}
                      readOnly={currentUser?._id !== copy?.coderId}
                      dir="auto"
                      className="slate-editor"
                    />
                  </div>
                </Slate>
              </div>

              <div
                className="card-body"
                style={{ borderTop: "1px solid #e5e7eb" }}
              >
                {/* Analysis Tools */}
                <div className="tool-section">
                  <h4 className="tool-title">
                    <FaChartBar /> Analysis Tools
                  </h4>
                  <div className="tool-buttons">
                    <button
                      onClick={() =>
                        calculateSelectionCounts(editor, setSelectionCounts)
                      }
                      className="tool-btn"
                    >
                      <FaChartBar /> Show Codings in Selected Text
                    </button>
                    <button
                      onClick={() =>
                        setSelectionWordCounts(
                          calculateWordCountsForSelection(editor, value)
                        )
                      }
                      className="tool-btn"
                    >
                      <FaChartBar /> Show Words in Selected Text
                    </button>
                  </div>
                </div>

                {/* Statistics */}
                <div className="stats-grid">
                  <div className="stat-card">
                    <h4 className="stat-title">Total Codings Count</h4>
                    <div className="stat-list">
                      {Object.entries(counts).map(([key, num]) => (
                        <div key={key} className="stat-item">
                          {renderKeyLabel(key, num)}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="stat-card">
                    <h4 className="stat-title">Total Word Count</h4>
                    <div className="stat-list">
                      {Object.entries(
                        name === "A" ? wordCountsA : wordCountsB
                      ).map(([key, num]) => (
                        <div key={key} className="stat-item">
                          {renderKeyLabel(key, num)}
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectionCounts && (
                    <div className="stat-card">
                      <h4 className="stat-title">Selection Codings Count</h4>
                      <div className="stat-list">
                        {Object.entries(selectionCounts).map(([key, num]) => (
                          <div key={key} className="stat-item">
                            {renderKeyLabel(key, num)}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectionWordCounts && (
                    <div className="stat-card">
                      <h4 className="stat-title">Selection Word Count</h4>
                      <div className="stat-list">
                        {Object.entries(selectionWordCounts).map(
                          ([key, num]) => (
                            <div key={key} className="stat-item">
                              {renderKeyLabel(key, num)}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Comments Section */}
                <div className="tool-section">
                  <h4 className="tool-title">
                    <FaComment /> Comments
                  </h4>
                  {!showInput && (
                    <button
                      onClick={() => setShowInput(true)}
                      className="dashboard-btn dashboard-btn-secondary"
                      style={{ width: "100%" }}
                    >
                      <FaPlus /> Add Comment
                    </button>
                  )}
                  {showInput && (
                    <div className="comment-input-section">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write your comment here..."
                        className="comment-textarea"
                      />
                      <div className="comment-actions">
                        <button
                          onClick={() => {
                            handleAddComment(
                              editor,
                              value,
                              setNewComment,
                              localComments,
                              setLocalComments,
                              setValue,
                              copy._id,
                              statement,
                              name === "A" ? setCommentKeyA : setCommentKeyB,
                              newComment
                            );
                            setShowInput(false);
                          }}
                          className="dashboard-btn dashboard-btn-primary"
                        >
                          <FaPlus /> Save Comment
                        </button>
                        <button
                          onClick={() => setShowInput(false)}
                          className="dashboard-btn dashboard-btn-secondary"
                        >
                          <FaTimes /> Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

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
                          <div className="comment-text">{c.text}</div>
                          {currentUser?._id === c.userId && (
                            <button
                              onClick={() => {
                                if (window.confirm("Delete this comment?")) {
                                  handleRemoveComment(
                                    c._id,
                                    localComments,
                                    setLocalComments,
                                    setValue,
                                    statement,
                                    value,
                                    name === "A"
                                      ? setCommentKeyA
                                      : setCommentKeyB,
                                    editor,
                                    setActiveComment
                                  );
                                  const updated = localComments.filter(
                                    (cm) => cm._id !== c._id
                                  );
                                  if (updated.length === 0)
                                    setActiveComment(null);
                                }
                              }}
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
          )
        )}
      </div>
    </div>
  );
}
