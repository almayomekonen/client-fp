import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { createEditor, Path } from 'slate';
import { Slate, Editable, withReact } from 'slate-react';
import { useNavigate } from 'react-router-dom';

import { useEdit } from '../../context/EditContext';
import { useComparison } from '../../context/ComparisonContext';
import { useCopy } from '../../context/CopyContext';
import { useStatement } from '../../context/StatementContext';
import { useData } from '../../context/DataContext';
import { useComment } from '../../context/CommentContext';
import { useResult } from '../../context/ResultContext';
import { useColor } from '../../context/ColorContext';
import { useStyleSetting } from "../../context/StyleSettingContext";



export default function CoderComparePage() {
  const { copyId } = useParams();
  const editorA = useMemo(() => withReact(createEditor()), []);
  const editorB = useMemo(() => withReact(createEditor()), []);

  const {
    copyById,
    saveCopyWithHighlights,
  } = useCopy();
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
      renderKeyLabel
  } = useResult();
  
  const { getComparisonsForCopy, compareCopies } = useComparison();
  const { currentUser, users} = useData();
  const { statementById } = useStatement();
  const { addComment, deleteComment, fetchCommentsByCopyId } = useComment();
  const { getColors } = useColor();  // מוסיפים את הפונקציה הזו מה־ColorContext
  
  const { getStyleSetting } = useStyleSetting();

  const [valueA, setValueA] = useState(null);
  const [countsA, setCountsA] = useState({});
  const [wordCountsA, setWordCountsA] = useState({});
  const [selectionCountsA, setSelectionCountsA] = useState(null);
  const [selectionWordCountsA, setSelectionWordCountsA] = useState(null);
  const [copyA, setCopyA] = useState(null);
  const [newCommentA, setNewCommentA] = useState('');
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
  const [newCommentB, setNewCommentB] = useState('');
  const [localCommentsB, setLocalCommentsB] = useState([]);
  const [activeCommentB, setActiveCommentB] = useState(null);
  const [commentKeyB, setCommentKeyB] = useState(0);
  const [showInputB, setShowInputB] = useState(false);
    



  const [statement, setStatement] = useState(null);
  const [diffs, setDiffs] = useState([]);
  const [diffKey, setDiffKey] = useState(0);
  const [availableCopies, setAvailableCopies] = useState([]);


    const [colors, setColors] = useState([]);
    const [styleSettings, setStyleSettings] = useState({});


    const navigate = useNavigate();

   useEffect(() => {
      if (!currentUser) {
        navigate('/', { replace: true });
      }
    }, [currentUser, navigate]);


      useEffect(() => {
      const loadStyle = async () => {
        const data = await getStyleSetting();
        setStyleSettings(data);
      };
      loadStyle();
    }, []);
    
    useEffect(() => {
      const loadColors = async () => {
        try {
          const fetchedColors = await getColors(); // קריאה לשרת דרך ColorContext
          setColors(fetchedColors);
        } catch (err) {
          console.error("שגיאה בטעינת צבעים", err);
        }
      };
      loadColors();
    }, [getColors]);

useEffect(() => {
  async function fetchInitialData() {
    const mainCopy = await copyById(copyId);
    const s = await statementById(mainCopy.statementId);

    const comparisonIds = await getComparisonsForCopy(mainCopy._id) || [];
    const comparisonCopies = await Promise.all(comparisonIds.map(id => copyById(id)));
    const filteredCopies = comparisonCopies.filter(c => !!c);

    // בוחרים עותק ראשון שהוא completed
    const completedForB = filteredCopies.find(c => c.status === 'completed') || null;

    setStatement(s);
    setCopyA(mainCopy);
    setCopyB(completedForB);
    setAvailableCopies(filteredCopies);

    const fullText = s.text[0].children[0].text;
    const comparison = compareCopies(mainCopy, completedForB, fullText);
    setDiffs(comparison);

    editorA.selection = null;
    editorB.selection = null;

    const baseText = s?.text || [{ type: 'paragraph', children: [{ text: '' }] }];
    const commentsForA = mainCopy ? await fetchCommentsByCopyId( mainCopy._id) : [];
    const commentsForB = completedForB ? await fetchCommentsByCopyId( completedForB._id) : [];
    setLocalCommentsA(commentsForA);
    setLocalCommentsB(commentsForB);

    const decoratedTextA = applyHighlightsToText(baseText, mainCopy.highlights || [], comparison, commentsForA);

    setValueA(decoratedTextA);
    setCountsA(mainCopy.colorCounts || {});
    
          const wordCountsResultA = calculateWordCounts(decoratedTextA);
setWordCountsA(wordCountsResultA);

    if (completedForB) {
      const decoratedTextB = applyHighlightsToText(baseText, completedForB.highlights || [], comparison, commentsForB);
      setValueB(decoratedTextB);
      setCountsB(completedForB.colorCounts || {});
      const wordCountsResultB = calculateWordCounts(decoratedTextB);
setWordCountsB(wordCountsResultB);
    }


  }

  fetchInitialData();
}, [copyId]);


const getRenderLeaf = (setActiveComment) => ({ leaf, attributes, children }) => {
  const style = {
    backgroundColor: leaf.highlight || undefined,
    textDecoration: leaf.underline ? 'underline' : undefined,
    fontWeight: leaf.bold ? 'bold' : undefined,
    fontStyle: leaf.italic ? 'italic' : undefined,
    outline: leaf.isDiff ? '2px solid red' : undefined,
  };

  const hasComments = leaf.comments?.length > 0;

  return (
    <span {...attributes} style={style}>
      {leaf.text !== '' ? children : '\u200B'}

      {hasComments && (
        <span
          onClick={() => setActiveComment(leaf.comments)}
          style={{
            cursor: 'pointer',
            color: 'blue',
            fontWeight: 'bold',
            marginInlineStart: '5px',
            verticalAlign: 'middle',
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
           throw 'FOUND';
         } else {
           globalOffset += node.text.length;
         }
       }
 
       if (node.children) {
         traverse(node.children, currentPath);
       }
 
       // 🔷 הוספת '\n' אחרי כל פסקה/בלוק
       if (
         path.length === 0 && // כלומר ברמת הפסקאות
         i < nodes.length - 1
       ) {
         globalOffset += 1; // ספירת '\n'
       }
     }
   };
 
   try {
     traverse(value);
   } catch (e) {
     if (e !== 'FOUND') throw e;
   }
 
   return globalOffset;
 };


    
const handleAddComment = async(editor, value, setNewComment, localComments, setLocalComments, setValue, copyId, statement, setCommentKey, newComment
) => {
  if (!editor.selection) {
  alert('יש לבחור מיקום בטקסט לפני הוספת הערה');
  return;
}

  if (!newComment) {
    alert('יש להזין טקסט להערה');
    return;
  }

  const { anchor } = editor.selection;
  const offset = getGlobalOffsetFromValue(value, anchor.path, anchor.offset);

  const createdComment = await addComment(currentUser._id, copyId, newComment, offset);
  const updatedLocalComments = [...localComments, createdComment];
  setLocalComments(updatedLocalComments);
      setCommentKey(prev => prev + 1);

const { highlights } = extractHighlightsFromValue(value);

  const decoratedText = applyHighlightsToText(
    statement?.text || [{ type: 'paragraph', children: [{ text: '' }] }],
    highlights,
    diffs,
    updatedLocalComments
  );
editor.selection = null;

  setValue(decoratedText);
  setNewComment('');
};

const handleRemoveComment = async(commentId, localComments, setLocalComments, setValue, statement, value, setCommentKey, editor, setActiveComment) => {
  await deleteComment(commentId);
  const updatedLocalComments = localComments.filter(c => c._id !== commentId);
  setLocalComments(updatedLocalComments);
      setCommentKey(prev => prev + 1);

const { highlights } = extractHighlightsFromValue(value);

  const decoratedText = applyHighlightsToText(
    statement?.text || [{ type: 'paragraph', children: [{ text: '' }] }],
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
  alert('נשמר בהצלחה!');

    const updatedCopy = { ...copy, highlights, colorCounts };
    const nextCopyA = copy._id === copyA?._id ? updatedCopy : copyA;
    const nextCopyB = copy._id === copyB?._id ? updatedCopy : copyB;

    if (copy._id === copyA?._id) setCopyA(updatedCopy);
    if (copy._id === copyB?._id) setCopyB(updatedCopy);
    

    const fullText = statement.text[0].children[0].text;
    const updatedDiffs = compareCopies(nextCopyA, nextCopyB, fullText);
    setDiffs(updatedDiffs);
    setDiffKey(prev => prev + 1);

    const baseText = statement.text;
  const newValueA = applyHighlightsToText(baseText, nextCopyA.highlights || [], updatedDiffs, localCommentsA);
  const newValueB = applyHighlightsToText(baseText, nextCopyB.highlights || [], updatedDiffs, localCommentsB);

          editorA.selection = null;
editorB.selection = null;

  setValueA(newValueA);
  setValueB(newValueB);

  
  const wordCountsResultA = calculateWordCounts(newValueA);
  const wordCountsResultB = calculateWordCounts(newValueB);
  
  setWordCountsA(wordCountsResultA);
  setWordCountsB(wordCountsResultB);

      setCommentKeyA(prev => prev + 1);
      setCommentKeyB(prev => prev + 1);

  };

   

const handleCopyBSelection = async (id) => {
  const selected = availableCopies.find(c => c._id === id);
  if (!selected || !statement) return;

  const baseText = statement.text;

  const nextCopyA = copyA;
  const nextCopyB = selected;

  const updatedDiffs = compareCopies(nextCopyA, nextCopyB, baseText[0].children[0].text);
  setDiffs(updatedDiffs);
  setDiffKey(prev => prev + 1);

  const commentsForA = nextCopyA ? await fetchCommentsByCopyId( nextCopyA._id) : [];
  const commentsForB = nextCopyB ? await fetchCommentsByCopyId(nextCopyB._id) : [];
  setLocalCommentsA(commentsForA);
  setLocalCommentsB(commentsForB);


  const newValueA = applyHighlightsToText(baseText, nextCopyA.highlights || [], updatedDiffs, commentsForA);
  const newValueB = applyHighlightsToText(baseText, nextCopyB.highlights || [], updatedDiffs, commentsForB);
          editorA.selection = null;
editorB.selection = null;
  setValueA(newValueA);
  setValueB(newValueB);

  
  setCommentKeyA(prev => prev + 1);
  setCommentKeyB(prev => prev + 1);

  setCopyB(nextCopyB);
  setCountsB(nextCopyB.colorCounts || {});

  const wordCountsResultB = calculateWordCounts(newValueB);
  setWordCountsB(wordCountsResultB);
};



  

const handleCompareSelectionA = () => {
  if (!copyA || !copyB || !statement || !editorA.selection) {
    alert("יש לבחור טווח טקסט בעורך A");
    return;
  }

  const { selection } = editorA;

  if (!selection || (selection.anchor.offset === selection.focus.offset && Path.equals(selection.anchor.path, selection.focus.path))) {
    alert("הבחירה ריקה");
    return;
  }

  const startOffset = Math.min(
    getGlobalOffsetFromValue(valueA, selection.anchor.path, selection.anchor.offset),
    getGlobalOffsetFromValue(valueA, selection.focus.path, selection.focus.offset)
  );

  const endOffset = Math.max(
    getGlobalOffsetFromValue(valueA, selection.anchor.path, selection.anchor.offset),
    getGlobalOffsetFromValue(valueA, selection.focus.path, selection.focus.offset)
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
  setDiffKey(prev => prev + 1);
};

const handleCompareSelectionB = () => {
  if (!copyA || !copyB || !statement || !editorB.selection) {
    alert("יש לבחור טווח טקסט בעורך B");
    return;
  }

  const { selection } = editorB;

  if (!selection || (selection.anchor.offset === selection.focus.offset && Path.equals(selection.anchor.path, selection.focus.path))) {
    alert("הבחירה ריקה");
    return;
  }

  const startOffset = Math.min(
    getGlobalOffsetFromValue(valueB, selection.anchor.path, selection.anchor.offset),
    getGlobalOffsetFromValue(valueB, selection.focus.path, selection.focus.offset)
  );

  const endOffset = Math.max(
    getGlobalOffsetFromValue(valueB, selection.anchor.path, selection.anchor.offset),
    getGlobalOffsetFromValue(valueB, selection.focus.path, selection.focus.offset)
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
  setDiffKey(prev => prev + 1);
};

  if (!valueA || !valueB || !statement) return <div>טוען טקסטים...</div>;

  return (
    <div style={{ direction: 'rtl', padding: 20 }}>
      <h2>השוואת עותקים</h2>

      <div style={{ marginBottom: 20 }}>
        <label>בחר עותק להשוואה (B): </label>
        <select value={copyB?._id || ''} onChange={(e) => handleCopyBSelection(e.target.value)}>
          {!copyB && <option value="">--בחר עותק--</option>}
          {availableCopies
            .filter(c => c._id !== copyA?._id)
            .map(c => (
              <option key={c._id} value={c._id}>
                {users.find(u => u._id === c.coderId)?.username || c.coderId}
              </option>
            ))}
        </select>
      </div>

            <div style={{ marginBottom: '20px' }}>
  <button onClick={handleCompareSelectionA}>השווה טווח המסומן בעורך A</button>
</div>

 <div style={{ marginBottom: '20px' }}>
  <button onClick={handleCompareSelectionB}>השווה טווח המסומן בעורך B</button>
</div>

      <div style={{ display: 'flex', gap: '40px' }}>
        {[{ name: 'A', editor: editorA, value: valueA, setValue: setValueA, copy: copyA, counts: countsA, setCounts: setCountsA, selectionCounts: selectionCountsA, setSelectionCounts: setSelectionCountsA ,activeComment: activeCommentA, setActiveComment: setActiveCommentA, commentKey: commentKeyA, newComment: newCommentA, setNewComment: setNewCommentA, localComments: localCommentsA, setLocalComments: setLocalCommentsA, showInput: showInputA, setShowInput: setShowInputA, selectionWordCounts: selectionWordCountsA, setSelectionWordCounts: setSelectionWordCountsA  },
          { name: 'B', editor: editorB, value: valueB, setValue: setValueB, copy: copyB, counts: countsB, setCounts: setCountsB, selectionCounts: selectionCountsB, setSelectionCounts: setSelectionCountsB ,activeComment: activeCommentB, setActiveComment: setActiveCommentB, commentKey: commentKeyB, newComment: newCommentB, setNewComment: setNewCommentB, localComments: localCommentsB, setLocalComments: setLocalCommentsB, showInput: showInputB, setShowInput: setShowInputB, selectionWordCounts: selectionWordCountsB, setSelectionWordCounts: setSelectionWordCountsB  }
        ].map(({ name, editor, value, setValue, copy, counts, setCounts, selectionCounts, setSelectionCounts,activeComment, setActiveComment, commentKey, newComment, setNewComment, localComments, setLocalComments, showInput, setShowInput,selectionWordCounts, setSelectionWordCounts  }) => (
          <div key={name} style={{ flex: 1 }}>
            <h3>עותק {name}</h3>

            {currentUser?._id === copy?.coderId && (
              <>
                <div style={{ marginBottom: 10, display: 'flex', flexWrap: 'wrap', gap: 5 }}>
{colors.map(color => (
  <button
    key={color._id}
    onClick={() => markColor(editor, color.code)}
    style={{ backgroundColor: color.code, border: '1px solid #666', width: 24, height: 24 }}
    title={color.name}
  />
))}

                  <button onClick={() => removeFormatting(editor)}>בטל כל סימון</button>
{ styleSettings.underlineEnabled && (
  <button onClick={() => markUnderline(editor)} style={{ marginRight: 5 }}>
    קו תחתון
  </button>
)}                  
{ styleSettings.boldEnabled && (
  <button onClick={() => markBold(editor)}>בולד</button>
)}
{ styleSettings.italicEnabled && (
  <button onClick={() => markItalic(editor)}>איטליק</button>
)}

                </div>

                <button onClick={() => handleSave(editor, copy, value, setCounts)} style={{ marginTop: 10 }}>שמור שינויים</button>
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
                placeholder={`עותק ${name}`}
                 readOnly={true}

                style={{ minHeight: 300, border: '1px solid #ccc', padding: 10 }}
              />
            </Slate>
                  <button onClick={() => calculateSelectionCounts(editor, setSelectionCounts)}>הצג סימונים בטקסט המסומן</button>
      <button onClick={() => setSelectionWordCounts(calculateWordCountsForSelection(editor, value))}>הצג מילים בטקסט המסומן</button>

      
                  <div style={{ marginTop: 20 }}>
                    <h4>כמות סימונים כללית:</h4>
            {Object.entries(counts).map(([key, num]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                {renderKeyLabel(key, num)}
              </div>
            ))}
            
                  </div>
                  <div style={{ marginTop: 20 }}>
  <h4>כמות מילים בטקסט:</h4>
  {Object.entries(name === 'A' ? wordCountsA : wordCountsB).map(([key, num]) => (
    <div key={key} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
      {renderKeyLabel(key, num)}
    </div>
  ))}
</div>

            
               
            
                  {selectionCounts && (
                    <div style={{ marginTop: 20 }}>
                      <h4>כמות סימונים בטקסט המסומן:</h4>
                      {Object.entries(selectionCounts).map(([key, num]) => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                {renderKeyLabel(key, num)}
              </div>
            ))}
            
                    </div>
                  )}
          
{(selectionWordCounts) && (
  <div style={{ marginTop: 20 }}>
    <h4>ספירת מילים בטווח המסומן:</h4>
    {Object.entries(selectionWordCounts).map(([key, num]) => (
      <div key={key} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
        {renderKeyLabel(key, num)}
      </div>
    ))}
  </div>
)}
              <div style={{ marginTop: 20 }}>
        <h4>הוספת הערה:</h4>
        {!showInput && (
          <button onClick={() => setShowInput(true)}>פתח תיבת הוספת הערה</button>
        )}
        {showInput && (
          <div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="כתוב הערה"
              style={{ width: '100%', height: 80 }}
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
                    name === 'A' ? setCommentKeyA : setCommentKeyB,
                    newComment
                  );
                  setShowInput(false);
                }}
              >
                שמור הערה
              </button>
              <button onClick={() => setShowInput(false)}>בטל</button>
            </div>
          </div>
        )}
      </div>

      {activeComment && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#fff',
            padding: 20,
            border: '1px solid #ccc',
            zIndex: 1000,
            maxWidth: 400,
          }}
        >
          <h4>הערות באזור זה:</h4>
          {activeComment.map((c) => (
            <div
              key={c._id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 5,
              }}
            >
              <span>{c.text}</span>
              {currentUser?._id === c.userId && (
  <button
    style={{ backgroundColor: 'red', color: '#fff' }}
    onClick={() => {
      handleRemoveComment(
        c._id,
        localComments,
        setLocalComments,
        setValue,
        statement,
        value,
        name === 'A' ? setCommentKeyA : setCommentKeyB,
        editor,
        setActiveComment
      );
      const updated = localComments.filter((cm) => cm._id !== c._id);
      if (updated.length === 0) setActiveComment(null);
    }}
  >
    מחק
  </button>
)}

            </div>
          ))}
          <button onClick={() => setActiveComment(null)}>סגור</button>
        </div>
      )}
           
            
          </div>
        ))}
      </div>
    </div>
  );
}