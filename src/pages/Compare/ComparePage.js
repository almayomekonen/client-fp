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
import ResultsTables from "../../components/ResultsTables";
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
    renderKeyLabel,
    buildResultsTable,
    calculateAdditionalStats,
  } = useResult();

  const {
    createComparison,
    deleteComparison,
    compareCopies,
    checkComparisonExists,
  } = useComparison();
  const { statementById } = useStatement();
  const { currentUser, users } = useData();
  const { getColors } = useColor(); // Add this function from ColorContext
  const { getStyleSetting } = useStyleSetting();
  const { socket } = useSocket();

  const { addComment, deleteComment, fetchCommentsByCopyId } = useComment();

  const [valueA, setValueA] = useState(null);
  const [countsA, setCountsA] = useState({});
  const [wordCountsA, setWordCountsA] = useState({});
  const [selectionCountsA, setSelectionCountsA] = useState(null);
  const [copyA, setCopyA] = useState(null);
  const [localCommentsA, setLocalCommentsA] = useState([]);
  const [activeCommentA, setActiveCommentA] = useState(null);
  const [commentKeyA, setCommentKeyA] = useState(0);
  const [isAddingCommentA, setIsAddingCommentA] = useState(false);
  const [newCommentA, setNewCommentA] = useState("");

  const [valueB, setValueB] = useState(null);
  const [countsB, setCountsB] = useState({});
  const [wordCountsB, setWordCountsB] = useState({});
  const [selectionCountsB, setSelectionCountsB] = useState(null);
  const [copyB, setCopyB] = useState(null);
  const [localCommentsB, setLocalCommentsB] = useState([]);
  const [activeCommentB, setActiveCommentB] = useState(null);
  const [commentKeyB, setCommentKeyB] = useState(0);
  const [isAddingCommentB, setIsAddingCommentB] = useState(false);
  const [newCommentB, setNewCommentB] = useState("");

  const [copies, setCopies] = useState([]);
  const [statement, setStatement] = useState(null);
  const [diffs, setDiffs] = useState([]);
  const [diffKey, setDiffKey] = useState(0);

  const [colors, setColors] = useState([]);
  const [styleSettings, setStyleSettings] = useState({});
  const [isCompared, setIsCompared] = useState(false);

  // ✅ New State for Editing Target
  const [editTarget, setEditTarget] = useState("A");

  // ✅ Automatically set edit target based on user
  useEffect(() => {
    if (
      currentUser?._id === copyB?.coderId &&
      currentUser?._id !== copyA?.coderId
    ) {
      setEditTarget("B");
    } else {
      setEditTarget("A");
    }
  }, [currentUser, copyA, copyB]);

  // New state for results tables
  const [fullTextTableA, setFullTextTableA] = useState(null);
  const [selectionTableA, setSelectionTableA] = useState(null);
  const [additionalStatsA, setAdditionalStatsA] = useState(null);
  const [fullTextTableB, setFullTextTableB] = useState(null);
  const [selectionTableB, setSelectionTableB] = useState(null);
  const [additionalStatsB, setAdditionalStatsB] = useState(null);

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

  // When loading page, check if comparison exists
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

  // 🔴 Real-time comment synchronization for both copies
  useEffect(() => {
    if (!socket || !copyA || !copyB) return;

    const handleCommentCreated = (data) => {
      // Update comments for Copy A
      if (data.copyId === copyA._id) {
        setLocalCommentsA((prevComments) => {
          const exists = prevComments.some((c) => c._id === data.comment._id);
          if (exists) return prevComments;
          return [...prevComments, data.comment];
        });
        console.log("✅ Real-time comment added to Copy A:", data.comment);
      }
      // Update comments for Copy B
      if (data.copyId === copyB._id) {
        setLocalCommentsB((prevComments) => {
          const exists = prevComments.some((c) => c._id === data.comment._id);
          if (exists) return prevComments;
          return [...prevComments, data.comment];
        });
        console.log("✅ Real-time comment added to Copy B:", data.comment);
      }
    };

    const handleCommentDeleted = (data) => {
      // Delete comment from Copy A
      if (data.copyId === copyA._id) {
        setLocalCommentsA((prevComments) =>
          prevComments.filter((c) => c._id !== data.commentId)
        );
        console.log(
          "✅ Real-time comment deleted from Copy A:",
          data.commentId
        );
      }
      // Delete comment from Copy B
      if (data.copyId === copyB._id) {
        setLocalCommentsB((prevComments) =>
          prevComments.filter((c) => c._id !== data.commentId)
        );
        console.log(
          "✅ Real-time comment deleted from Copy B:",
          data.commentId
        );
      }
    };

    socket.on("commentCreated", handleCommentCreated);
    socket.on("commentDeleted", handleCommentDeleted);

    const handleCopyDeleted = (data) => {
      const deletedId = data.copyId;

      // Check if it affects current comparison
      if (
        (copyA && copyA._id === deletedId) ||
        (copyB && copyB._id === deletedId)
      ) {
        alert("One of the copies being compared has been deleted.");
        navigate("/coderHome");
        return;
      }

      // Update the options list
      setCopies((prevCopies) => prevCopies.filter((c) => c._id !== deletedId));
    };

    socket.on("copyDeleted", handleCopyDeleted);

    const handleCopyUpdated = (data) => {
      const updatedCopy = data.copy;

      // If active copy status changed from completed
      if (
        (updatedCopy._id === copyA?._id || updatedCopy._id === copyB?._id) &&
        updatedCopy.status !== "completed"
      ) {
        alert("A copy being compared has been reopened for editing.");
        navigate("/coderHome");
        return;
      }

      // Update copies list (will automatically update dropdown via filter)
      setCopies((prev) =>
        prev.map((c) => (c._id === updatedCopy._id ? updatedCopy : c))
      );

      // Update active copies if they are still completed
      if (updatedCopy._id === copyA?._id) setCopyA(updatedCopy);
      if (updatedCopy._id === copyB?._id) setCopyB(updatedCopy);
    };

    socket.on("copyUpdated", handleCopyUpdated);

    return () => {
      socket.off("commentCreated", handleCommentCreated);
      socket.off("commentDeleted", handleCommentDeleted);
      socket.off("copyDeleted", handleCopyDeleted);
      socket.off("copyUpdated", handleCopyUpdated);
    };
  }, [socket, copyA, copyB, navigate]);

  // Update results tables for Copy A
  useEffect(() => {
    if (!valueA || !colors.length || !styleSettings) return;

    const fullTable = buildResultsTable(
      countsA,
      wordCountsA,
      colors,
      styleSettings
    );
    setFullTextTableA(fullTable);

    if (selectionCountsA) {
      const wordCounts = calculateWordCounts(valueA);
      const selTable = buildResultsTable(
        selectionCountsA,
        wordCounts,
        colors,
        styleSettings
      );
      setSelectionTableA(selTable);
    } else {
      setSelectionTableA(null);
    }

    const stats = calculateAdditionalStats(valueA, editorA);
    setAdditionalStatsA(stats);
  }, [
    valueA,
    countsA,
    wordCountsA,
    selectionCountsA,
    colors,
    styleSettings,
    editorA,
    buildResultsTable,
    calculateAdditionalStats,
    calculateWordCounts,
  ]);

  // Update results tables for Copy B
  useEffect(() => {
    if (!valueB || !colors.length || !styleSettings) return;

    const fullTable = buildResultsTable(
      countsB,
      wordCountsB,
      colors,
      styleSettings
    );
    setFullTextTableB(fullTable);

    if (selectionCountsB) {
      const wordCounts = calculateWordCounts(valueB);
      const selTable = buildResultsTable(
        selectionCountsB,
        wordCounts,
        colors,
        styleSettings
      );
      setSelectionTableB(selTable);
    } else {
      setSelectionTableB(null);
    }

    const stats = calculateAdditionalStats(valueB, editorB);
    setAdditionalStatsB(stats);
  }, [
    valueB,
    countsB,
    wordCountsB,
    selectionCountsB,
    colors,
    styleSettings,
    editorB,
    buildResultsTable,
    calculateAdditionalStats,
    calculateWordCounts,
  ]);

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

      const colorName = colors.find((c) => c.code === leaf.highlight)?.name;
      const styleNames = [];
      if (leaf.bold) styleNames.push(styleSettings.boldName || "Bold");
      if (leaf.italic) styleNames.push(styleSettings.italicName || "Italic");
      if (leaf.underline) styleNames.push(styleSettings.underlineName || "Underline");
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
    } else {
      await createComparison(copyA._id, copyB._id);
      setIsCompared(true);
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

      {/* Main Layout Grid: Comparison Editors + Sidebar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 350px",
          gap: "20px",
        }}
      >
        {/* Left: Side-by-Side Comparison */}
        <div>
          <div className="comparison-container" style={{ flexWrap: "nowrap" }}>
            {/* Editor A */}
            <div
              className="coding-block dashboard-card"
              style={{ flex: 1, minWidth: 0 }}
            >
              {/* ✅ Navigation for Copy A Title */}
              <div className="card-header">
                <h3 className="card-title" style={{ fontSize: "16px" }}>
                  <FaUser /> Coding A -{" "}
                  <span
                    onClick={() =>
                      copyA && navigate(`/view-statement/${copyA._id}`)
                    }
                    style={{ cursor: "pointer", textDecoration: "underline" }}
                    title="View Full Page"
                  >
                    {users.find((user) => user._id === copyA?.coderId)
                      ?.username || "Unknown"}
                  </span>
                </h3>
              </div>
              <div className="card-body" style={{ padding: "12px" }}>
                <Slate
                  key={`slate-A-${copyA?._id}-${diffKey}-${commentKeyA}`}
                  editor={editorA}
                  initialValue={valueA}
                  value={valueA}
                  onChange={setValueA}
                >
                  <div
                    ref={scrollContainerA}
                    onScroll={handleScrollA}
                    style={{
                      minHeight: "500px",
                      maxHeight: "700px",
                      overflowY: "auto",
                      border: "2px solid #e0e0e0",
                      borderRadius: "8px",
                      padding: "16px",
                      backgroundColor: "#fafafa",
                    }}
                  >
                    <Editable
                      renderLeaf={getRenderLeaf(setActiveCommentA)}
                      placeholder="Coding A"
                      readOnly={currentUser?._id !== copyA?.coderId}
                      dir="auto"
                      style={{
                        fontSize: "16px",
                        lineHeight: "1.8",
                      }}
                    />
                  </div>
                </Slate>
              </div>
            </div>

            {/* Editor B */}
            <div
              className="coding-block dashboard-card"
              style={{ flex: 1, minWidth: 0 }}
            >
              {/* ✅ Navigation for Copy B Title */}
              <div className="card-header">
                <h3 className="card-title" style={{ fontSize: "16px" }}>
                  <FaUser /> Coding B -{" "}
                  <span
                    onClick={() =>
                      copyB && navigate(`/view-statement/${copyB._id}`)
                    }
                    style={{ cursor: "pointer", textDecoration: "underline" }}
                    title="View Full Page"
                  >
                    {users.find((user) => user._id === copyB?.coderId)
                      ?.username || "Unknown"}
                  </span>
                </h3>
              </div>
              <div className="card-body" style={{ padding: "12px" }}>
                <Slate
                  key={`slate-B-${copyB?._id}-${diffKey}-${commentKeyB}`}
                  editor={editorB}
                  initialValue={valueB}
                  value={valueB}
                  onChange={setValueB}
                >
                  <div
                    ref={scrollContainerB}
                    onScroll={handleScrollB}
                    style={{
                      minHeight: "500px",
                      maxHeight: "700px",
                      overflowY: "auto",
                      border: "2px solid #e0e0e0",
                      borderRadius: "8px",
                      padding: "16px",
                      backgroundColor: "#fafafa",
                    }}
                  >
                    <Editable
                      renderLeaf={getRenderLeaf(setActiveCommentB)}
                      placeholder="Coding B"
                      readOnly={currentUser?._id !== copyB?.coderId}
                      dir="auto"
                      style={{
                        fontSize: "16px",
                        lineHeight: "1.8",
                      }}
                    />
                  </div>
                </Slate>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Toolbar & Stats Sidebar */}
        <div
          style={{
            position: "sticky",
            top: "20px",
            alignSelf: "start",
            maxHeight: "calc(100vh - 100px)",
            overflowY: "auto",
          }}
        >
          {/* ✅ Editing Tools with Target Toggle */}
          {(currentUser?._id === copyA?.coderId ||
            currentUser?._id === copyB?.coderId ||
            ["investigator", "admin"].includes(currentUser?.role)) && (
            <div className="dashboard-card" style={{ marginBottom: "20px" }}>
              <h3
                className="card-title"
                style={{ fontSize: "16px", marginBottom: "12px" }}
              >
                <FaPalette /> Edit Coding {editTarget}
              </h3>

              {/* Target Toggle for Admin/Investigator */}
              {["investigator", "admin"].includes(currentUser?.role) && (
                <div
                  style={{ display: "flex", gap: "5px", marginBottom: "10px" }}
                >
                  <button
                    className={`dashboard-btn btn-sm ${
                      editTarget === "A" ? "btn-primary" : "btn-secondary"
                    }`}
                    onClick={() => setEditTarget("A")}
                    style={{ flex: 1 }}
                  >
                    Copy A
                  </button>
                  <button
                    className={`dashboard-btn btn-sm ${
                      editTarget === "B" ? "btn-primary" : "btn-secondary"
                    }`}
                    onClick={() => setEditTarget("B")}
                    style={{ flex: 1 }}
                  >
                    Copy B
                  </button>
                </div>
              )}

              {/* Color Palette */}
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  marginBottom: "12px",
                  flexWrap: "wrap",
                }}
              >
                {colors.map((color) => (
                  <button
                    key={color._id}
                    onClick={() =>
                      markColor(
                        editTarget === "A" ? editorA : editorB,
                        color.code
                      )
                    }
                    style={{
                      backgroundColor: color.code,
                      border: "2px solid #000",
                      borderRadius: "4px",
                      cursor: "pointer",
                      padding: "4px 10px",
                      fontWeight: "600",
                      fontSize: "12px",
                      color: (() => {
                        const hex = color.code.replace("#", "");
                        const r = parseInt(hex.substr(0, 2), 16);
                        const g = parseInt(hex.substr(2, 2), 16);
                        const b = parseInt(hex.substr(4, 2), 16);
                        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                        return brightness > 155 ? "#000000" : "#FFFFFF";
                      })(),
                    }}
                    title={color.name}
                  >
                    {color.name}
                  </button>
                ))}
              </div>

              {/* Action Buttons */}
              <div
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              >
                <button
                  onClick={() =>
                    removeFormatting(editTarget === "A" ? editorA : editorB)
                  }
                  className="dashboard-btn btn-secondary btn-sm"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <FaEraser /> Remove All
                </button>
                {styleSettings.underlineEnabled && (
                  <button
                    onClick={() =>
                      markUnderline(editTarget === "A" ? editorA : editorB)
                    }
                    className="dashboard-btn btn-secondary btn-sm"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      textDecoration: "underline",
                    }}
                  >
                    <FaUnderline /> {styleSettings.underlineName || "Underline"}
                  </button>
                )}
                {styleSettings.boldEnabled && (
                  <button
                    onClick={() =>
                      markBold(editTarget === "A" ? editorA : editorB)
                    }
                    className="dashboard-btn btn-secondary btn-sm"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      fontWeight: "bold",
                    }}
                  >
                    <FaBold /> {styleSettings.boldName || "Bold"}
                  </button>
                )}
                {styleSettings.italicEnabled && (
                  <button
                    onClick={() =>
                      markItalic(editTarget === "A" ? editorA : editorB)
                    }
                    className="dashboard-btn btn-secondary btn-sm"
                    style={{
                      width: "100%",
                      justifyContent: "center",
                      fontStyle: "italic",
                    }}
                  >
                    <FaItalic /> {styleSettings.italicName || "Italic"}
                  </button>
                )}
                <button
                  onClick={() =>
                    handleSave(
                      editTarget === "A" ? editorA : editorB,
                      editTarget === "A" ? copyA : copyB,
                      editTarget === "A" ? valueA : valueB,
                      editTarget === "A" ? setCountsA : setCountsB
                    )
                  }
                  className="dashboard-btn btn-primary btn-sm"
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  <FaSave /> Save Changes
                </button>
              </div>
            </div>
          )}

          {/* Results for A */}
          <div className="dashboard-card" style={{ marginBottom: "20px" }}>
            <h3
              className="card-title"
              style={{ fontSize: "14px", marginBottom: "12px" }}
            >
              <FaChartBar /> Results A
            </h3>
            <button
              onClick={() =>
                calculateSelectionCounts(editorA, setSelectionCountsA)
              }
              className="dashboard-btn btn-secondary btn-sm"
              style={{ width: "100%", marginBottom: "12px", fontSize: "12px" }}
            >
              <FaChartBar /> Analyze Selection
            </button>
            <div style={{ fontSize: "11px" }}>
              <ResultsTables
                fullTextTable={fullTextTableA}
                selectionTable={selectionTableA}
                additionalStats={additionalStatsA}
                colors={colors}
                styleSettings={styleSettings}
              />
            </div>
          </div>

          {/* Results for B */}
          <div className="dashboard-card" style={{ marginBottom: "20px" }}>
            <h3
              className="card-title"
              style={{ fontSize: "14px", marginBottom: "12px" }}
            >
              <FaChartBar /> Results B
            </h3>
            <button
              onClick={() =>
                calculateSelectionCounts(editorB, setSelectionCountsB)
              }
              className="dashboard-btn btn-secondary btn-sm"
              style={{ width: "100%", marginBottom: "12px", fontSize: "12px" }}
            >
              <FaChartBar /> Analyze Selection
            </button>
            <div style={{ fontSize: "11px" }}>
              <ResultsTables
                fullTextTable={fullTextTableB}
                selectionTable={selectionTableB}
                additionalStats={additionalStatsB}
                colors={colors}
                styleSettings={styleSettings}
              />
            </div>
          </div>

          {/* Comments Section for Copy A */}
          {copyA && (
            <div className="dashboard-card" style={{ marginBottom: "20px" }}>
              <h3
                className="card-title"
                style={{ fontSize: "14px", marginBottom: "12px" }}
              >
                <FaComment /> Comments A
              </h3>
              {!isAddingCommentA && (
                <button
                  onClick={() => setIsAddingCommentA(true)}
                  className="dashboard-btn btn-primary btn-sm"
                  style={{ width: "100%", fontSize: "12px" }}
                >
                  <FaPlus /> Add Comment to A
                </button>
              )}
              {isAddingCommentA && (
                <div>
                  <textarea
                    value={newCommentA}
                    onChange={(e) => setNewCommentA(e.target.value)}
                    placeholder="Select text in A and add comment..."
                    className="form-textarea"
                    style={{
                      marginBottom: "8px",
                      minHeight: "80px",
                      fontSize: "12px",
                    }}
                  />
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => {
                        handleAddComment(
                          editorA,
                          valueA,
                          setNewCommentA,
                          localCommentsA,
                          setLocalCommentsA,
                          setValueA,
                          copyA._id,
                          statement,
                          setCommentKeyA,
                          newCommentA
                        );
                        setIsAddingCommentA(false);
                      }}
                      className="dashboard-btn btn-success btn-sm"
                      style={{ flex: 1, fontSize: "11px" }}
                    >
                      <FaSave /> Save
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingCommentA(false);
                        setNewCommentA("");
                      }}
                      className="dashboard-btn btn-secondary btn-sm"
                      style={{ flex: 1, fontSize: "11px" }}
                    >
                      <FaTimes /> Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Comments Section for Copy B */}
          {copyB && (
            <div className="dashboard-card" style={{ marginBottom: "20px" }}>
              <h3
                className="card-title"
                style={{ fontSize: "14px", marginBottom: "12px" }}
              >
                <FaComment /> Comments B
              </h3>
              {!isAddingCommentB && (
                <button
                  onClick={() => setIsAddingCommentB(true)}
                  className="dashboard-btn btn-primary btn-sm"
                  style={{ width: "100%", fontSize: "12px" }}
                >
                  <FaPlus /> Add Comment to B
                </button>
              )}
              {isAddingCommentB && (
                <div>
                  <textarea
                    value={newCommentB}
                    onChange={(e) => setNewCommentB(e.target.value)}
                    placeholder="Select text in B and add comment..."
                    className="form-textarea"
                    style={{
                      marginBottom: "8px",
                      minHeight: "80px",
                      fontSize: "12px",
                    }}
                  />
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => {
                        handleAddComment(
                          editorB,
                          valueB,
                          setNewCommentB,
                          localCommentsB,
                          setLocalCommentsB,
                          setValueB,
                          copyB._id,
                          statement,
                          setCommentKeyB,
                          newCommentB
                        );
                        setIsAddingCommentB(false);
                      }}
                      className="dashboard-btn btn-success btn-sm"
                      style={{ flex: 1, fontSize: "11px" }}
                    >
                      <FaSave /> Save
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingCommentB(false);
                        setNewCommentB("");
                      }}
                      className="dashboard-btn btn-secondary btn-sm"
                      style={{ flex: 1, fontSize: "11px" }}
                    >
                      <FaTimes /> Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Comment Modals */}
      {activeCommentA && (
        <div className="comment-modal-overlay">
          <div className="comment-modal">
            <div className="comment-modal-header">
              <h4 className="comment-modal-title">
                <FaComment /> Comments A
              </h4>
              <button
                onClick={() => setActiveCommentA(null)}
                className="comment-modal-close"
              >
                <FaTimes />
              </button>
            </div>
            <div className="comment-modal-body">
              {/* Add Comment Section */}
              {!isAddingCommentA && (
                <button
                  onClick={() => setIsAddingCommentA(true)}
                  className="dashboard-btn btn-primary btn-sm"
                  style={{ width: "100%", marginBottom: "16px" }}
                >
                  <FaPlus /> Add Comment
                </button>
              )}
              {isAddingCommentA && (
                <div style={{ marginBottom: "16px" }}>
                  <textarea
                    value={newCommentA}
                    onChange={(e) => setNewCommentA(e.target.value)}
                    placeholder="Write a comment..."
                    className="dashboard-input"
                    style={{
                      width: "100%",
                      minHeight: "80px",
                      marginBottom: "8px",
                    }}
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => {
                        handleAddComment(
                          editorA,
                          valueA,
                          setNewCommentA,
                          localCommentsA,
                          setLocalCommentsA,
                          setValueA,
                          copyA._id,
                          statement,
                          setCommentKeyA,
                          newCommentA
                        );
                        setIsAddingCommentA(false);
                      }}
                      className="dashboard-btn btn-primary btn-sm"
                    >
                      <FaSave /> Save
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingCommentA(false);
                        setNewCommentA("");
                      }}
                      className="dashboard-btn btn-secondary btn-sm"
                    >
                      <FaTimes /> Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Existing Comments */}
              {activeCommentA.map((c) => (
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
                      onClick={() => {
                        if (window.confirm("Delete this comment?")) {
                          handleRemoveComment(
                            c._id,
                            localCommentsA,
                            setLocalCommentsA,
                            setValueA,
                            statement,
                            valueA,
                            setCommentKeyA,
                            editorA,
                            setActiveCommentA
                          );
                          const updated = localCommentsA.filter(
                            (cm) => cm._id !== c._id
                          );
                          if (updated.length === 0) setActiveCommentA(null);
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

      {activeCommentB && (
        <div className="comment-modal-overlay">
          <div className="comment-modal">
            <div className="comment-modal-header">
              <h4 className="comment-modal-title">
                <FaComment /> Comments B
              </h4>
              <button
                onClick={() => setActiveCommentB(null)}
                className="comment-modal-close"
              >
                <FaTimes />
              </button>
            </div>
            <div className="comment-modal-body">
              {/* Add Comment Section */}
              {!isAddingCommentB && (
                <button
                  onClick={() => setIsAddingCommentB(true)}
                  className="dashboard-btn btn-primary btn-sm"
                  style={{ width: "100%", marginBottom: "16px" }}
                >
                  <FaPlus /> Add Comment
                </button>
              )}
              {isAddingCommentB && (
                <div style={{ marginBottom: "16px" }}>
                  <textarea
                    value={newCommentB}
                    onChange={(e) => setNewCommentB(e.target.value)}
                    placeholder="Write a comment..."
                    className="dashboard-input"
                    style={{
                      width: "100%",
                      minHeight: "80px",
                      marginBottom: "8px",
                    }}
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => {
                        handleAddComment(
                          editorB,
                          valueB,
                          setNewCommentB,
                          localCommentsB,
                          setLocalCommentsB,
                          setValueB,
                          copyB._id,
                          statement,
                          setCommentKeyB,
                          newCommentB
                        );
                        setIsAddingCommentB(false);
                      }}
                      className="dashboard-btn btn-primary btn-sm"
                    >
                      <FaSave /> Save
                    </button>
                    <button
                      onClick={() => {
                        setIsAddingCommentB(false);
                        setNewCommentB("");
                      }}
                      className="dashboard-btn btn-secondary btn-sm"
                    >
                      <FaTimes /> Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Existing Comments */}
              {activeCommentB.map((c) => (
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
                      onClick={() => {
                        if (window.confirm("Delete this comment?")) {
                          handleRemoveComment(
                            c._id,
                            localCommentsB,
                            setLocalCommentsB,
                            setValueB,
                            statement,
                            valueB,
                            setCommentKeyB,
                            editorB,
                            setActiveCommentB
                          );
                          const updated = localCommentsB.filter(
                            (cm) => cm._id !== c._id
                          );
                          if (updated.length === 0) setActiveCommentB(null);
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
  );
}
