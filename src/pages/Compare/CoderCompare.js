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
  FaTrash,
  FaEye,
  FaUser,
} from "react-icons/fa";

import { useEdit } from "../../context/EditContext";
import { useComparison } from "../../context/ComparisonContext";
import { useCopy } from "../../context/CopyContext";
import { useStatement } from "../../context/StatementContext";
import { useData } from "../../context/DataContext";
import { useComment } from "../../context/CommentContext";
import { useResult } from "../../context/ResultContext";
import { useColor } from "../../context/ColorContext";
import { useStyleSetting } from "../../context/StyleSettingContext";
import { useSocket } from "../../context/SocketContext";
import ResultsTables from "../../components/ResultsTables";
import "../../styles/Dashboard.css";

export default function CoderComparePage() {
  const { copyId } = useParams();
  const editorA = useMemo(() => withReact(createEditor()), []);
  const editorB = useMemo(() => withReact(createEditor()), []);

  const { copyById, saveCopyWithHighlights } = useCopy();
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

  const { getComparisonsForCopy, compareCopies } = useComparison();
  const { currentUser, users, isAuthChecked, copies } = useData();
  const { statementById } = useStatement();
  const { deleteComment, fetchCommentsByCopyId } = useComment();
  const { getColors } = useColor(); // Add this function from ColorContext
  const { socket } = useSocket();

  const { getStyleSetting } = useStyleSetting();

  const [valueA, setValueA] = useState(null);
  const [countsA, setCountsA] = useState({});
  const [wordCountsA, setWordCountsA] = useState({});
  const [selectionCountsA, setSelectionCountsA] = useState(null);
  const [selectionWordCountsA, setSelectionWordCountsA] = useState(null);
  const [copyA, setCopyA] = useState(null);
  const [localCommentsA, setLocalCommentsA] = useState([]);
  const [activeCommentA, setActiveCommentA] = useState(null);
  const [commentKeyA, setCommentKeyA] = useState(0);

  const [valueB, setValueB] = useState(null);
  const [countsB, setCountsB] = useState({});
  const [wordCountsB, setWordCountsB] = useState({});
  const [selectionCountsB, setSelectionCountsB] = useState(null);
  const [selectionWordCountsB, setSelectionWordCountsB] = useState(null);
  const [copyB, setCopyB] = useState(null);
  const [localCommentsB, setLocalCommentsB] = useState([]);
  const [activeCommentB, setActiveCommentB] = useState(null);
  const [commentKeyB, setCommentKeyB] = useState(0);

  const [statement, setStatement] = useState(null);
  const [diffs, setDiffs] = useState([]);
  const [diffKey, setDiffKey] = useState(0);
  const [availableCopies, setAvailableCopies] = useState([]);

  const [colors, setColors] = useState([]);
  const [styleSettings, setStyleSettings] = useState({});

  // New state for results tables
  const [fullTextTableA, setFullTextTableA] = useState(null);
  const [selectionTableA, setSelectionTableA] = useState(null);
  const [additionalStatsA, setAdditionalStatsA] = useState(null);
  const [fullTextTableB, setFullTextTableB] = useState(null);
  const [selectionTableB, setSelectionTableB] = useState(null);
  const [additionalStatsB, setAdditionalStatsB] = useState(null);

  // Refs for scroll syncing
  const scrollContainerA = useRef(null);
  const scrollContainerB = useRef(null);
  const isScrollingA = useRef(false);
  const isScrollingB = useRef(false);

  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthChecked && !currentUser) {
      navigate("/", { replace: true });
    }
  }, [currentUser, isAuthChecked, navigate]);

  useEffect(() => {
    const loadStyle = async () => {
      const data = await getStyleSetting();
      setStyleSettings(data);
    };
    loadStyle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadColors = async () => {
      try {
        const fetchedColors = await getColors(); // Call server through ColorContext
        setColors(fetchedColors);
      } catch (err) {
        console.error("Error loading colors", err);
      }
    };
    loadColors();
  }, [getColors]);

  // Real-time listener for comparison cancellation
  useEffect(() => {
    if (!socket || !copyA || !copyB) return;

    const handleComparisonCancelled = (data) => {
      const { copyId1, copyId2, message } = data;

      // Check if this coder is viewing the cancelled comparison
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
    if (!isAuthChecked || !currentUser) return;

    // Wait for copies to be loaded
    const mainCopy = copyById(copyId);
    if (!mainCopy) {
      console.log("⏳ Waiting for copy data to load...");
      return;
    }

    async function fetchInitialData() {
      const s = await statementById(mainCopy.statementId);
      if (!s) {
        console.error("Statement not found:", mainCopy.statementId);
        return;
      }

      const comparisonIds = (await getComparisonsForCopy(mainCopy._id)) || [];
      const comparisonCopies = await Promise.all(
        comparisonIds.map((id) => copyById(id))
      );
      const filteredCopies = comparisonCopies.filter((c) => !!c);

      const completedForB =
        filteredCopies.find((c) => c.status === "completed") || null;

      setStatement(s);
      setCopyA(mainCopy);
      setCopyB(completedForB);
      setAvailableCopies(filteredCopies);

      const fullText = s.text[0].children[0].text;
      const comparison = compareCopies(mainCopy, completedForB, fullText);
      setDiffs(comparison);

      editorA.selection = null;
      editorB.selection = null;

      const baseText = s?.text || [
        { type: "paragraph", children: [{ text: "" }] },
      ];
      const commentsForA = mainCopy
        ? await fetchCommentsByCopyId(mainCopy._id)
        : [];
      const commentsForB = completedForB
        ? await fetchCommentsByCopyId(completedForB._id)
        : [];
      setLocalCommentsA(commentsForA);
      setLocalCommentsB(commentsForB);

      const decoratedTextA = applyHighlightsToText(
        baseText,
        mainCopy.highlights || [],
        comparison,
        commentsForA
      );

      setValueA(decoratedTextA);
      setCountsA(mainCopy.colorCounts || {});

      const wordCountsResultA = calculateWordCounts(decoratedTextA);
      setWordCountsA(wordCountsResultA);

      if (completedForB) {
        const decoratedTextB = applyHighlightsToText(
          baseText,
          completedForB.highlights || [],
          comparison,
          commentsForB
        );
        setValueB(decoratedTextB);
        setCountsB(completedForB.colorCounts || {});
        const wordCountsResultB = calculateWordCounts(decoratedTextB);
        setWordCountsB(wordCountsResultB);
      }
    }

    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copyId, isAuthChecked, currentUser, copies]);

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

      // If the main copy (copyA) is deleted, we must leave
      if (copyA && copyA._id === deletedId) {
        alert("Your copy has been deleted.");
        navigate("/coderHome");
        return;
      }

      // If the compared copy (copyB) is deleted
      if (copyB && copyB._id === deletedId) {
        alert("The copy you are comparing with has been deleted.");
        navigate("/coderHome");
        return;
      }

      // If it's in the available list, remove it
      setAvailableCopies((prev) => prev.filter((c) => c._id !== deletedId));
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

      // Update available copies
      // If status is not completed, remove from available
      // If status IS completed, update/add it?
      // Logic: If in list, update it. If not completed, remove it.
      setAvailableCopies((prev) => {
        if (updatedCopy.status !== "completed") {
          return prev.filter((c) => c._id !== updatedCopy._id);
        }
        return prev.map((c) => (c._id === updatedCopy._id ? updatedCopy : c));
      });

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

  // Re-render Slate value A when localCommentsA change (e.g., from real-time updates)
  useEffect(() => {
    if (!copyA || !localCommentsA || !statement || !valueA) return;

    const baseText = statement?.text || [
      { type: "paragraph", children: [{ text: "" }] },
    ];
    
    // Extract current highlights from the existing value to preserve user's work
    const { highlights: highlightsA } = extractHighlightsFromValue(valueA);

    const decoratedTextA = applyHighlightsToText(
      baseText,
      highlightsA,
      diffs,
      localCommentsA
    );
    
    setValueA(decoratedTextA);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localCommentsA, commentKeyA]); // Only re-render when comments actually change

  // Re-render Slate value B when localCommentsB change (e.g., from real-time updates)
  useEffect(() => {
    if (!copyB || !localCommentsB || !statement || !valueB) return;

    const baseText = statement?.text || [
      { type: "paragraph", children: [{ text: "" }] },
    ];
    
    // Extract current highlights from the existing value to preserve user's work
    const { highlights: highlightsB } = extractHighlightsFromValue(valueB);

    const decoratedTextB = applyHighlightsToText(
      baseText,
      highlightsB,
      diffs,
      localCommentsB
    );
    
    setValueB(decoratedTextB);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localCommentsB, commentKeyB]); // Only re-render when comments actually change

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

    if (selectionCountsA && selectionWordCountsA) {
      const selTable = buildResultsTable(
        selectionCountsA,
        selectionWordCountsA,
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
    selectionWordCountsA,
    colors,
    styleSettings,
    editorA,
    buildResultsTable,
    calculateAdditionalStats,
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

    if (selectionCountsB && selectionWordCountsB) {
      const selTable = buildResultsTable(
        selectionCountsB,
        selectionWordCountsB,
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
    selectionWordCountsB,
    colors,
    styleSettings,
    editorB,
    buildResultsTable,
    calculateAdditionalStats,
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
            throw "FOUND"; // eslint-disable-line no-throw-literal
          } else {
            globalOffset += node.text.length;
          }
        }

        if (node.children) {
          traverse(node.children, currentPath);
        }

        // 🔷 Add '\n' after each paragraph/block
        if (
          path.length === 0 && // At paragraph level
          i < nodes.length - 1
        ) {
          globalOffset += 1; // Count '\n'
        }
      }
    };

    try {
      traverse(value);
    } catch (e) {
      if (e !== "FOUND") throw e;
    }

    return globalOffset;
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

  const handleCopyASelection = async (id) => {
    const selected = availableCopies.find((c) => c._id === id);
    if (!selected || !statement) return;
    
    // Only allow selecting copies that belong to the current user
    if (selected.coderId !== currentUser?._id) {
      alert("You can only edit your own codings");
      return;
    }

    const baseText = statement.text;

    const nextCopyA = selected;
    const nextCopyB = copyB;

    const updatedDiffs = compareCopies(
      nextCopyA,
      nextCopyB,
      baseText[0].children[0].text
    );
    setDiffs(updatedDiffs);
    setDiffKey((prev) => prev + 1);

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
    editorA.selection = null;
    editorB.selection = null;
    setValueA(newValueA);
    setValueB(newValueB);

    setCommentKeyA((prev) => prev + 1);
    setCommentKeyB((prev) => prev + 1);

    setCopyA(nextCopyA);
    setCountsA(nextCopyA.colorCounts || {});

    const wordCountsResultA = calculateWordCounts(newValueA);
    setWordCountsA(wordCountsResultA);
  };

  const handleCopyBSelection = async (id) => {
    const selected = availableCopies.find((c) => c._id === id);
    if (!selected || !statement) return;

    const baseText = statement.text;

    const nextCopyA = copyA;
    const nextCopyB = selected;

    const updatedDiffs = compareCopies(
      nextCopyA,
      nextCopyB,
      baseText[0].children[0].text
    );
    setDiffs(updatedDiffs);
    setDiffKey((prev) => prev + 1);

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
    editorA.selection = null;
    editorB.selection = null;
    setValueA(newValueA);
    setValueB(newValueB);

    setCommentKeyA((prev) => prev + 1);
    setCommentKeyB((prev) => prev + 1);

    setCopyB(nextCopyB);
    setCountsB(nextCopyB.colorCounts || {});

    const wordCountsResultB = calculateWordCounts(newValueB);
    setWordCountsB(wordCountsResultB);
  };

  const handleCompareSelectionA = () => {
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

  // Scroll sync handler
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

  if (!valueA || !valueB || !statement)
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div>Loading comparison...</div>
      </div>
    );

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          <FaCodeBranch />
          Coding Comparison
        </h1>
        <p className="dashboard-subtitle">
          <FaEye style={{ marginRight: "8px" }} />
          Compare two codings side-by-side
        </p>
      </div>

      {/* Copy Selector */}
      <div className="dashboard-card" style={{ marginBottom: "20px" }}>
        <h3 className="card-title">
          <FaUser /> Select Codings for Comparison
        </h3>
        
        {/* Select Copy A */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginTop: "16px",
            marginBottom: "12px",
          }}
        >
          <label style={{ fontWeight: "600", minWidth: "150px" }}>
            Copy A:
          </label>
          <select
            value={copyA?._id || ""}
            onChange={(e) => handleCopyASelection(e.target.value)}
            className="form-select"
            style={{ flex: 1, maxWidth: "400px" }}
          >
            {!copyA && <option value="">-- Select Copy A --</option>}
            {availableCopies
              .filter((c) => c.coderId === currentUser?._id)
              .map((c) => (
                <option key={c._id} value={c._id}>
                  {users.find((u) => u._id === c.coderId)?.username ||
                    "Unknown Coder"}
                </option>
              ))}
          </select>
        </div>
        
        {/* Select Copy B */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <label style={{ fontWeight: "600", minWidth: "150px" }}>
            Copy B:
          </label>
          <select
            value={copyB?._id || ""}
            onChange={(e) => handleCopyBSelection(e.target.value)}
            className="form-select"
            style={{ flex: 1, maxWidth: "400px" }}
          >
            {!copyB && <option value="">-- Select Copy B --</option>}
            {availableCopies
              .filter((c) => c._id !== copyA?._id)
              .map((c) => (
                <option key={c._id} value={c._id}>
                  {users.find((u) => u._id === c.coderId)?.username ||
                    "Unknown Coder"}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Compare Tools */}
      <div className="dashboard-card" style={{ marginBottom: "20px" }}>
        <h3 className="card-title">
          <FaChartBar /> Comparison Tools
        </h3>
        <div
          style={{
            display: "flex",
            gap: "12px",
            marginTop: "16px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={handleCompareSelectionA}
            className="dashboard-btn btn-secondary btn-sm"
          >
            <FaEye /> Compare Selection in Left Editor
          </button>
          <button
            onClick={handleCompareSelectionB}
            className="dashboard-btn btn-secondary btn-sm"
          >
            <FaEye /> Compare Selection in Right Editor
          </button>
        </div>
      </div>

      {/* Top Section: Editing Tools and Comments */}
      <div style={{ display: "flex", gap: "20px", marginBottom: "20px" }}>
        {/* Editing Tools (only for user's own copy) */}
        {currentUser?._id === copyA?.coderId && (
          <div className="dashboard-card" style={{ flex: 1, minWidth: "350px", padding: "20px" }}>
            <h3
              className="card-title"
              style={{ fontSize: "16px", marginBottom: "16px" }}
            >
              <FaPalette /> Edit Your Coding
            </h3>

            {/* Color Buttons Row */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                alignItems: "center",
                marginBottom: "12px",
              }}
            >
              {/* Color Palette Buttons */}
              {colors.map((color) => (
                <button
                  key={color._id}
                  onClick={() => markColor(editorA, color.code)}
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

            {/* Formatting Buttons Row */}
            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {/* Style Buttons */}
              {styleSettings.underlineEnabled && (
                <button
                  onClick={() => markUnderline(editorA)}
                  className="dashboard-btn btn-secondary btn-sm"
                  style={{
                    textDecoration: "underline",
                  }}
                >
                  <FaUnderline /> {styleSettings.underlineName || "Underline"}
                </button>
              )}
              {styleSettings.boldEnabled && (
                <button
                  onClick={() => markBold(editorA)}
                  className="dashboard-btn btn-secondary btn-sm"
                  style={{
                    fontWeight: "bold",
                  }}
                >
                  <FaBold /> {styleSettings.boldName || "Bold"}
                </button>
              )}
              {styleSettings.italicEnabled && (
                <button
                  onClick={() => markItalic(editorA)}
                  className="dashboard-btn btn-secondary btn-sm"
                  style={{
                    fontStyle: "italic",
                  }}
                >
                  <FaItalic /> {styleSettings.italicName || "Italic"}
                </button>
              )}

              {/* Clear and Save Buttons */}
              <button
                onClick={() => removeFormatting(editorA)}
                className="dashboard-btn btn-secondary btn-sm"
                style={{
                  padding: "6px 12px",
                  fontSize: "13px",
                  color: "#dc3545",
                  fontWeight: "500",
                }}
              >
                <FaEraser /> Clear
              </button>
              <button
                onClick={() => handleSave(editorA, copyA, valueA, setCountsA)}
                className="dashboard-btn btn-primary btn-sm"
                style={{
                  padding: "6px 12px",
                  fontSize: "13px",
                  fontWeight: "500",
                }}
              >
                <FaSave /> Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Middle Section: Text Editors Side by Side */}
      <div>
        <div
          className="comparison-container"
          style={{ flexWrap: "nowrap", marginBottom: "20px" }}
        >
          {/* Editor A */}
          <div
            className="coding-block dashboard-card"
            style={{ flex: 1, minWidth: 0 }}
          >
            <div className="card-header">
              <h3 className="card-title" style={{ fontSize: "16px" }}>
                <FaUser /> Coding A -{" "}
                {users.find((user) => user._id === copyA?.coderId)?.username ||
                  "Your Coding"}
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
                    height: "400px",
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
                    readOnly={true}
                    onKeyDown={(event) => {
                      // Prevent all keyboard input that would modify text
                      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
                        event.preventDefault();
                      }
                    }}
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
            <div className="card-header">
              <h3 className="card-title" style={{ fontSize: "16px" }}>
                <FaUser /> Coding B -{" "}
                {users.find((user) => user._id === copyB?.coderId)?.username ||
                  "Comparison"}
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
                    height: "400px",
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
                    readOnly={true}
                    onKeyDown={(event) => {
                      // Prevent all keyboard input that would modify text
                      if (!event.ctrlKey && !event.metaKey && !event.altKey) {
                        event.preventDefault();
                      }
                    }}
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

      {/* Bottom Section: Results Side by Side */}
      <div style={{ display: "flex", gap: "20px" }}>
        {/* Results for A */}
        <div
          className="dashboard-card"
          style={{ flex: 1, maxHeight: "500px", overflowY: "auto" }}
        >
          <h3
            className="card-title"
            style={{ fontSize: "14px", marginBottom: "12px" }}
          >
            <FaChartBar /> Results A
          </h3>
          <button
            onClick={() => {
              calculateSelectionCounts(editorA, setSelectionCountsA);
              const wordCounts = calculateWordCountsForSelection(
                editorA,
                valueA
              );
              setSelectionWordCountsA(wordCounts);
            }}
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
        <div
          className="dashboard-card"
          style={{ flex: 1, maxHeight: "500px", overflowY: "auto" }}
        >
          <h3
            className="card-title"
            style={{ fontSize: "14px", marginBottom: "12px" }}
          >
            <FaChartBar /> Results B
          </h3>
          <button
            onClick={() => {
              calculateSelectionCounts(editorB, setSelectionCountsB);
              const wordCounts = calculateWordCountsForSelection(
                editorB,
                valueB
              );
              setSelectionWordCountsB(wordCounts);
            }}
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
