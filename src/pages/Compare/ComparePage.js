import React, { useMemo, useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { createEditor, Path } from "slate";
import { Slate, Editable, withReact } from "slate-react";
import { useNavigate } from "react-router-dom";

import { useEdit } from "../../context/EditContext";
import { useCopy } from "../../context/CopyContext";
import { useStatement } from "../../context/StatementContext";
import { useData } from "../../context/DataContext";
import { useComment } from "../../context/CommentContext";
import { useComparison } from "../../context/ComparisonContext";
import { useResult } from "../../context/ResultContext";
import { useColor } from "../../context/ColorContext";
import { useStyleSetting } from "../../context/StyleSettingContext";

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

  if (!valueA || !valueB || !statement) return <div>Loading texts...</div>;

  return (
    <div style={{ direction: "rtl", padding: 20 }}>
      <h2>Edit and Compare Two Copies</h2>
      <div style={{ marginTop: 20 }}>
        <button onClick={handleToggleComparison}>
          {isCompared
            ? "Cancel comparison between copies"
            : "Confirm that copies are compared against each other"}
        </button>
      </div>

      <div>
        <label>Select copy for editor A:</label>
        <select
          value={copyA?._id || ""}
          onChange={(e) => handleCopySelection("A", e.target.value)}
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
                {users.find((user) => user._id === copy.coderId)?.username ||
                  copy.coderId}
              </option>
            ))}
        </select>
      </div>

      <div>
        <label>Select copy for editor B:</label>
        <select
          value={copyB?._id || ""}
          onChange={(e) => handleCopySelection("B", e.target.value)}
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
                {users.find((user) => user._id === copy.coderId)?.username ||
                  copy.coderId}
              </option>
            ))}
        </select>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <button onClick={handleCompareSelectionA}>
          Compare selected range in editor A
        </button>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <button onClick={handleCompareSelectionB}>
          Compare selected range in editor B
        </button>
      </div>

      <div style={{ display: "flex", gap: "40px" }}>
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
            <div key={name} style={{ flex: 1 }}>
              <h3>Copy {name}</h3>

              {currentUser?._id === copy?.coderId && (
                <>
                  <div
                    style={{
                      marginBottom: 10,
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 5,
                    }}
                  >
                    {colors.map((color) => (
                      <button
                        key={color._id}
                        onClick={() => markColor(editor, color.code)}
                        style={{
                          backgroundColor: color.code,
                          border: "1px solid #666",
                          width: 24,
                          height: 24,
                        }}
                        title={color.name}
                      />
                    ))}
                    <button onClick={() => removeFormatting(editor)}>
                      Remove all marking
                    </button>
                    {styleSettings.underlineEnabled && (
                      <button
                        onClick={() => markUnderline(editor)}
                        style={{ marginRight: 5 }}
                      >
                        Underline
                      </button>
                    )}{" "}
                    {styleSettings.boldEnabled && (
                      <button onClick={() => markBold(editor)}>Bold</button>
                    )}
                    {styleSettings.italicEnabled && (
                      <button onClick={() => markItalic(editor)}>Italic</button>
                    )}
                  </div>

                  <button
                    onClick={() => handleSave(editor, copy, value, setCounts)}
                    style={{ marginTop: 10 }}
                  >
                    Save changes
                  </button>
                </>
              )}

              <Slate
                key={`slate-${name}-${copy?._id}-${diffKey}-${commentKey}`}
                editor={editor}
                initialValue={value}
                value={value}
                onChange={setValue}
              >
                <Editable
                  renderLeaf={getRenderLeaf(setActiveComment)}
                  placeholder={`Copy ${name}`}
                  readOnly={true}
                  style={{
                    minHeight: 300,
                    border: "1px solid #ccc",
                    padding: 10,
                  }}
                />
              </Slate>

              <button
                onClick={() =>
                  calculateSelectionCounts(editor, setSelectionCounts)
                }
              >
                Show markings in selected text
              </button>
              <button
                onClick={() =>
                  setSelectionWordCounts(
                    calculateWordCountsForSelection(editor, value)
                  )
                }
              >
                Show words in selected text
              </button>

              <div style={{ marginTop: 20 }}>
                <h4>Overall marking count:</h4>
                {Object.entries(counts).map(([key, num]) => (
                  <div
                    key={key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    {renderKeyLabel(key, num)}
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 20 }}>
                <h4>Word count in entire text:</h4>
                {Object.entries(name === "A" ? wordCountsA : wordCountsB).map(
                  ([key, num]) => (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      {renderKeyLabel(key, num)}
                    </div>
                  )
                )}
              </div>

              {selectionCounts && (
                <div style={{ marginTop: 20 }}>
                  <h4>Marking count in selected text:</h4>
                  {Object.entries(selectionCounts).map(([key, num]) => (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      {renderKeyLabel(key, num)}
                    </div>
                  ))}
                </div>
              )}

              {selectionWordCounts && (
                <div style={{ marginTop: 20 }}>
                  <h4>Word count in selected range:</h4>
                  {Object.entries(selectionWordCounts).map(([key, num]) => (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      {renderKeyLabel(key, num)}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 20 }}>
                <h4>Add comment:</h4>
                {!showInput && (
                  <button onClick={() => setShowInput(true)}>
                    Open comment input box
                  </button>
                )}
                {showInput && (
                  <div>
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write comment"
                      style={{ width: "100%", height: 80 }}
                    />
                    <div style={{ marginTop: 10 }}>
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
                      >
                        Save comment
                      </button>
                      <button onClick={() => setShowInput(false)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {activeComment && (
                <div
                  style={{
                    position: "fixed",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    backgroundColor: "#fff",
                    padding: 20,
                    border: "1px solid #ccc",
                    zIndex: 1000,
                    maxWidth: 400,
                  }}
                >
                  <h4>Comments in this area:</h4>
                  {activeComment.map((c) => (
                    <div
                      key={c._id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 5,
                      }}
                    >
                      <span>{c.text}</span>
                      {currentUser?._id === c.userId && (
                        <button
                          style={{ backgroundColor: "red", color: "#fff" }}
                          onClick={() => {
                            handleRemoveComment(
                              c._id,
                              localComments,
                              setLocalComments,
                              setValue,
                              statement,
                              value,
                              name === "A" ? setCommentKeyA : setCommentKeyB,
                              editor,
                              setActiveComment
                            );
                            const updated = localComments.filter(
                              (cm) => cm._id !== c._id
                            );
                            if (updated.length === 0) setActiveComment(null);
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  ))}

                  <button onClick={() => setActiveComment(null)}>Close</button>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}
