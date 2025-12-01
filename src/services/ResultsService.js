// src/utils/editorActions.js
import React from "react";
import { Editor, Path } from "slate";
import ColorBadge from "../components/ColorBadge";
import { getColorName, getStyleName } from "../utils/colorHelpers";

export const calculateWordCounts = (
  value,
  startOffset = null,
  endOffset = null
) => {
  const counts = {};
  let totalWords = 0;

  const fullText = [];
  const styleMap = []; // For each character: what style is there

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

    // At the end of each block (paragraph) - add newline
    fullText.push("\n");
    styleMap.push({}); // No style
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

    // Update counters
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

export const renderKeyLabel = (key, value, colors = [], styleSettings = {}) => {
  // Special totals
  if (key === "totalColor") {
    return (
      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontWeight: 500 }}>Words colored in any color:</span>
        <span style={{ fontWeight: 700, color: "#1F4E78" }}>{value}</span>
      </span>
    );
  }

  if (key === "total") {
    return (
      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontWeight: 500 }}>Total words in text:</span>
        <span style={{ fontWeight: 700, color: "#1F4E78" }}>{value}</span>
      </span>
    );
  }

  // Semantic formatting styles
  if (key === "underline") {
    const name = getStyleName("underline", styleSettings);
    return (
      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <ColorBadge type="underline" name={name} size="small" />
        <span style={{ fontWeight: 700 }}>{value}</span>
      </span>
    );
  }

  if (key === "bold") {
    const name = getStyleName("bold", styleSettings);
    return (
      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <ColorBadge type="bold" name={name} size="small" />
        <span style={{ fontWeight: 700 }}>{value}</span>
      </span>
    );
  }

  if (key === "italic") {
    const name = getStyleName("italic", styleSettings);
    return (
      <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <ColorBadge type="italic" name={name} size="small" />
        <span style={{ fontWeight: 700 }}>{value}</span>
      </span>
    );
  }

  // Color markers
  const colorName = getColorName(key, colors);
  return (
    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <ColorBadge type="color" name={colorName} color={key} size="small" />
      <span style={{ fontWeight: 700 }}>{value}</span>
    </span>
  );
};

/**
 * Build results table data for full text or selection
 * Returns structure with columns (colors + formatting) and rows (codings count, words count)
 */
export const buildResultsTable = (
  counts,
  wordCounts,
  colors = [],
  styleSettings = {}
) => {
  // Build columns list: all colors + enabled formatting options
  const columns = [];

  // Add all colors
  colors.forEach((color) => {
    columns.push({
      type: "color",
      key: color.code,
      name: color.name,
      code: color.code,
    });
  });

  // Add formatting options if enabled
  if (styleSettings.underlineEnabled) {
    columns.push({
      type: "underline",
      key: "underline",
      name: styleSettings.underlineName || "Underline",
    });
  }

  if (styleSettings.boldEnabled) {
    columns.push({
      type: "bold",
      key: "bold",
      name: styleSettings.boldName || "Bold",
    });
  }

  if (styleSettings.italicEnabled) {
    columns.push({
      type: "italic",
      key: "italic",
      name: styleSettings.italicName || "Italic",
    });
  }

  // Build rows data
  const codingsRow = {};
  const wordsRow = {};

  columns.forEach((col) => {
    codingsRow[col.key] = counts[col.key] || 0;
    wordsRow[col.key] = wordCounts[col.key] || 0;
  });

  return {
    columns,
    codingsRow,
    wordsRow,
  };
};

/**
 * Calculate additional statistics
 */
export const calculateAdditionalStats = (value, editor = null) => {
  // Full text stats
  const fullWordCounts = calculateWordCounts(value);
  const totalWordsFullText = fullWordCounts.total || 0;
  const totalColoredWordsFullText = fullWordCounts.totalColor || 0;

  // Selection stats (if editor and selection provided)
  let totalWordsSelection = 0;
  let totalColoredWordsSelection = 0;

  if (editor && editor.selection) {
    const selectionWordCounts = calculateWordCountsForSelection(editor, value);
    if (selectionWordCounts) {
      totalWordsSelection = selectionWordCounts.total || 0;
      totalColoredWordsSelection = selectionWordCounts.totalColor || 0;
    }
  }

  return {
    totalWordsFullText,
    totalColoredWordsFullText,
    totalWordsSelection,
    totalColoredWordsSelection,
  };
};
