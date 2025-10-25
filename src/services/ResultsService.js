// src/utils/editorActions.js
import { Editor, Path } from "slate";

export const calculateWordCounts = (
  value,
  startOffset = null,
  endOffset = null
) => {
  const counts = {};
  let totalWords = 0;

  const fullText = [];
  const styleMap = []; // לכל תו: איזה סגנון יש שם

  const buildMaps = (nodes) => {
    for (const node of nodes) {
      if (node.text !== undefined) {
        const text = node.text;
        for (let i = 0; i < text.length; i++) {
          fullText.push(text[i]);
          styleMap.push({
            highlight: node.highlight || null,
            underline: !!node.underline,
            bold: !!node.bold,
            italic: !!node.italic,
          });
        }
      }

      if (node.children) {
        buildMaps(node.children);
      }
    }

    // בסיום כל בלוק (פסקה) — הוספת שורה חדשה
    fullText.push("\n");
    styleMap.push({}); // בלי סטייל
  };

  buildMaps(value);

  const joinedText = fullText.join("");
  const wordRegex = /\S+/g;

  let match;
  while ((match = wordRegex.exec(joinedText)) !== null) {
    const wordStart = match.index;
    const wordEnd = wordStart + match[0].length;

    if (startOffset !== null && wordEnd <= startOffset) continue;
    if (endOffset !== null && wordStart >= endOffset) break;

    const effectiveStart = Math.max(wordStart, startOffset ?? 0);
    const effectiveEnd = Math.min(wordEnd, endOffset ?? joinedText.length);

    let foundHighlights = new Set();
    let foundUnderline = false;
    let foundBold = false;
    let foundItalic = false;

    for (let i = effectiveStart; i < effectiveEnd; i++) {
      const s = styleMap[i];
      if (s.highlight) {
        foundHighlights.add(s.highlight);
      }
      if (s.underline) {
        foundUnderline = true;
      }
      if (s.bold) {
        foundBold = true;
      }
      if (s.italic) {
        foundItalic = true;
      }
    }

    // עדכון מונים
    if (foundHighlights.size > 0) {
      counts["totalColor"] = (counts["totalColor"] || 0) + 1;
    }

    for (const color of foundHighlights) {
      counts[color] = (counts[color] || 0) + 1;
    }

    if (foundUnderline) {
      counts["underline"] = (counts["underline"] || 0) + 1;
    }
    if (foundBold) {
      counts["bold"] = (counts["bold"] || 0) + 1;
    }
    if (foundItalic) {
      counts["italic"] = (counts["italic"] || 0) + 1;
    }

    totalWords++;
  }

  counts["total"] = totalWords;
  return counts;
};

export const calculateWordCountsForSelection = (editor, value) => {
  if (!editor.selection) {
    alert("Please select a text segment before");
    return;
  }
  if (!value) return null;

  const { anchor, focus } = editor.selection;

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

        if (path.length === 0 && i < nodes.length - 1) {
          globalOffset += 1; // '\n'
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

  const start = getGlobalOffsetFromValue(value, anchor.path, anchor.offset);
  const end = getGlobalOffsetFromValue(value, focus.path, focus.offset);

  const startOffset = Math.min(start, end);
  const endOffset = Math.max(start, end);

  return calculateWordCounts(value, startOffset, endOffset);
};

export const calculateSelectionCounts = (editor, setSelectionCounts) => {
  if (!editor.selection) {
    alert("Please select a text segment before");
    return;
  }

  const fragment = Editor.fragment(editor, editor.selection);
  const tempCounts = {};

  for (const node of fragment) {
    if (!node.children) continue;

    let prevHighlight = null;
    let prevUnderline = null;
    let prevBold = null;
    let prevItalic = null;

    for (const child of node.children) {
      if (typeof child.text !== "string") continue;

      const currentHighlight = child.highlight || null;
      const currentUnderline = !!child.underline;
      const currentBold = !!child.bold;
      const currentItalic = !!child.italic;

      if (currentHighlight !== prevHighlight && currentHighlight) {
        tempCounts[currentHighlight] = (tempCounts[currentHighlight] || 0) + 1;
      }

      if (currentUnderline !== prevUnderline && currentUnderline) {
        tempCounts["underline"] = (tempCounts["underline"] || 0) + 1;
      }

      if (currentBold !== prevBold && currentBold) {
        tempCounts["bold"] = (tempCounts["bold"] || 0) + 1;
      }

      if (currentItalic !== prevItalic && currentItalic) {
        tempCounts["italic"] = (tempCounts["italic"] || 0) + 1;
      }

      prevHighlight = currentHighlight;
      prevUnderline = currentUnderline;
      prevBold = currentBold;
      prevItalic = currentItalic;
    }
  }

  setSelectionCounts(tempCounts);
};

export const renderKeyLabel = (key, value) => {
  let label = "";

  if (key === "totalColor") {
    label = "Words colored in any color";
  } else if (key === "total") {
    label = "Total words in text";
  } else if (key === "underline") {
    label = "Underline";
  } else if (key === "bold") {
    label = "Bold";
  } else if (key === "italic") {
    label = "Italic";
  }

  const isKnownKey =
    key === "totalColor" ||
    key === "total" ||
    key === "underline" ||
    key === "bold" ||
    key === "italic";

  if (isKnownKey) {
    // Known => Description + Number
    return (
      <span style={{ display: "flex", alignItems: "center" }}>
        <span>
          {label}: {value}
        </span>
      </span>
    );
  } else {
    // Color => Color square + Number
    return (
      <span style={{ display: "flex", alignItems: "center" }}>
        <span
          style={{
            display: "inline-block",
            width: 12,
            height: 12,
            backgroundColor: key,
            marginRight: 6,
            border: "1px solid #333",
          }}
        />
        <span>{value}</span>
      </span>
    );
  }
};
