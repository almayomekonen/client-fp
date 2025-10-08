import React, { useMemo, useCallback, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createEditor, Path } from "slate";
import { Slate, Editable, withReact } from "slate-react";

import { useEdit } from "../../context/EditContext";
import { useCopy } from "../../context/CopyContext";
import { useData } from "../../context/DataContext";
import { useStatement } from "../../context/StatementContext";
import { useComment } from "../../context/CommentContext";
import { useResult } from "../../context/ResultContext";
import { useColor } from "../../context/ColorContext";
import { useStyleSetting } from "../../context/StyleSettingContext";

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

  if (!value) return <div>Loading text...</div>;

  return (
    <div style={{ padding: 20, direction: "rtl" }}>
      <h2>Edit Statement</h2>

      <div style={{ marginBottom: 10, display: "flex", alignItems: "center" }}>
        {colors.map((c) => (
          <button
            key={c._id}
            onClick={() => markColor(editor, c.code)}
            title={c.name}
            style={{
              backgroundColor: c.code,
              border: "1px solid #666",
              marginRight: 5,
              width: 24,
              height: 24,
            }}
          />
        ))}

        <button
          onClick={() => removeFormatting(editor)}
          style={{ marginRight: 5 }}
        >
          Clear All Markings
        </button>
        {styleSettings.underlineEnabled && (
          <button
            onClick={() => markUnderline(editor)}
            style={{ marginRight: 5 }}
          >
            Underline
          </button>
        )}
        {styleSettings.boldEnabled && (
          <button onClick={() => markBold(editor)}>Bold</button>
        )}
        {styleSettings.italicEnabled && (
          <button onClick={() => markItalic(editor)}>Italic</button>
        )}
      </div>

      <button
        onClick={() => calculateSelectionCounts(editor, setSelectionCounts)}
        style={{ marginBottom: 10 }}
      >
        Show Markings in Selected Text
      </button>
      <button
        onClick={() =>
          setSelectionWordCounts(calculateWordCountsForSelection(editor, value))
        }
        style={{ marginBottom: 10, marginInlineStart: 10 }}
      >
        Show Words in Selected Text
      </button>

      <Slate
        key={`slate-${copy?._id}-${commentKey}`}
        editor={editor}
        initialValue={value}
        value={value}
        onChange={setValue}
      >
        <Editable
          renderLeaf={renderLeaf}
          placeholder="Edit here..."
          readOnly={true}
          style={{ minHeight: 300, border: "1px solid #ccc", padding: 10 }}
        />
      </Slate>

      <button onClick={handleSave} style={{ marginTop: 15 }}>
        Save Changes
      </button>
      <button
        onClick={handleCloseCoding}
        style={{ marginTop: 15, marginLeft: 10 }}
      >
        Close Coding
      </button>

      {/* תצוגת counts, wordCounts, selectionCounts, selectionWordCounts */}
      <div style={{ marginTop: 20 }}>
        <h4>Total Markings Count:</h4>
        {Object.entries(counts).map(([key, num]) => (
          <div
            key={key}
            style={{ display: "flex", alignItems: "center", marginBottom: 4 }}
          >
            {renderKeyLabel(key, num)}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        <h4>Word Count in Entire Text:</h4>
        {Object.entries(wordCounts).map(([key, num]) => (
          <div
            key={key}
            style={{ display: "flex", alignItems: "center", marginBottom: 4 }}
          >
            {renderKeyLabel(key, num)}
          </div>
        ))}
      </div>

      {selectionCounts && (
        <div style={{ marginTop: 20 }}>
          <h4>Markings Count in Selected Text:</h4>
          {Object.entries(selectionCounts).map(([key, num]) => (
            <div
              key={key}
              style={{ display: "flex", alignItems: "center", marginBottom: 4 }}
            >
              {renderKeyLabel(key, num)}
            </div>
          ))}
        </div>
      )}

      {selectionWordCounts && (
        <div style={{ marginTop: 20 }}>
          <h4>Word Count in Selected Text:</h4>
          <div
            style={{ display: "flex", alignItems: "center", marginBottom: 4 }}
          >
            {renderKeyLabel(
              "Words colored in any color",
              selectionWordCounts.totalColor || 0
            )}
          </div>
          {Object.entries(selectionWordCounts).map(([key, num]) => (
            <div
              key={key}
              style={{ display: "flex", alignItems: "center", marginBottom: 4 }}
            >
              {renderKeyLabel(key, num)}
            </div>
          ))}
        </div>
      )}

      {/* Add Comment */}
      <div style={{ marginTop: 20 }}>
        <h4>Add Comment:</h4>
        {!isAddingComment && (
          <button onClick={() => setIsAddingComment(true)}>Add Comment</button>
        )}
        {isAddingComment && (
          <div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add comment here"
              style={{ width: "100%", height: "80px" }}
            />
            <div style={{ marginTop: 10 }}>
              <button onClick={handleAddComment} style={{ marginRight: 5 }}>
                Save
              </button>
              <button
                onClick={() => {
                  setIsAddingComment(false);
                  setNewComment("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Display Active Comments */}
      {activeComment && (
        <div
          style={{
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: "white",
            padding: "20px",
            border: "1px solid #ccc",
            zIndex: 1000,
          }}
        >
          <h4>Comments for Selected Text:</h4>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {activeComment.map((c) => (
              <li key={c._id} style={{ marginBottom: 5 }}>
                {c.text}
                {currentUser?._id === c.userId && (
                  <button
                    onClick={() => handleRemoveComment(c._id)}
                    style={{
                      backgroundColor: "red",
                      color: "white",
                      border: "none",
                      marginInlineStart: 8,
                      cursor: "pointer",
                    }}
                  >
                    Delete
                  </button>
                )}
              </li>
            ))}
          </ul>
          <button onClick={() => setActiveComment(null)}>Close</button>
        </div>
      )}
    </div>
  );
}
