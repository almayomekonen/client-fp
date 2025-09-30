import React, { useMemo, useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { createEditor, Path } from "slate";
import { Slate, Editable, withReact } from "slate-react";
import { useCopy } from "../../context/CopyContext";
import { useStatement } from "../../context/StatementContext";
import { useData } from "../../context/DataContext";
import { useEdit } from "../../context/EditContext";
import { useComment } from "../../context/CommentContext";
import { useResult } from "../../context/ResultContext";

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
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div>טוען...</div>
      </div>
    );
  }

  if (!currentUser) return null;

  // Add comment
  const handleAddComment = async () => {
    if (!editor.selection) return alert("יש לבחור מיקום בטקסט לפני הוספת הערה");
    if (!newComment) return alert("יש להזין טקסט להערה");

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

  if (!value) return <div>טוען טקסט...</div>;

  return (
    <div style={{ padding: 20, direction: "rtl" }}>
      <h2>צפייה והוספת הערות להצהרה</h2>
      <button
        onClick={() => calculateSelectionCounts(editor, setSelectionCounts)}
        style={{ marginBottom: 10 }}
      >
        הצג סימונים בטקסט המסומן
      </button>
      <button
        onClick={() =>
          setSelectionWordCounts(calculateWordCountsForSelection(editor, value))
        }
        style={{ marginBottom: 10, marginInlineStart: 10 }}
      >
        הצג מילים בטקסט המסומן
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
          readOnly
          placeholder="אין טקסט"
          style={{ minHeight: 300, border: "1px solid #ccc", padding: 10 }}
        />
      </Slate>

      <div style={{ marginTop: 20 }}>
        <h4>כמות סימונים כללית:</h4>
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
        <h4>ספירת מילים בטקסט כולו:</h4>
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
          <h4>כמות סימונים בטקסט המסומן:</h4>
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
          <h4>ספירת מילים בטקסט המסומן:</h4>
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

      <div style={{ marginTop: 20 }}>
        <h4>הוספת הערה:</h4>
        {!isAddingComment && (
          <button onClick={() => setIsAddingComment(true)}>הוסף הערה</button>
        )}
        {isAddingComment && (
          <div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="הוסף הערה כאן"
              style={{ width: "100%", height: "80px" }}
            />
            <div style={{ marginTop: 10 }}>
              <button onClick={handleAddComment} style={{ marginRight: 5 }}>
                שמור
              </button>
              <button
                onClick={() => {
                  setIsAddingComment(false);
                  setNewComment("");
                }}
              >
                ביטול
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
            backgroundColor: "white",
            padding: 20,
            border: "1px solid #ccc",
            zIndex: 1000,
          }}
        >
          <h4>הערות לטקסט הנבחר:</h4>
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
                    מחק
                  </button>
                )}
              </li>
            ))}
          </ul>
          <button onClick={() => setActiveComment(null)}>סגור</button>
        </div>
      )}
    </div>
  );
}
