import { Transforms } from "slate";

export const applyHighlightsToText = ({
  baseText,
  highlights,
  diffs = [],
  comments = [],
}) => {
  const fullText = baseText
    .map((node) => node.children.map((c) => c.text).join(""))
    .join("\n");

  const highlightOnly = highlights.filter((h) => h.color);
  const underlineOnly = highlights.filter((h) => h.underline && !h.color);
  const boldOnly = highlights.filter((h) => h.bold && !h.color && !h.underline);
  const italicOnly = highlights.filter(
    (h) => h.italic && !h.color && !h.underline
  );

  const fragments = [];
  let currentIndex = 0;

  const sorted = [...highlightOnly].sort(
    (a, b) => a.startOffset - b.startOffset
  );

  sorted.forEach(({ color, startOffset, endOffset }) => {
    if (startOffset > currentIndex) {
      fragments.push({
        text: fullText.slice(currentIndex, startOffset),
        startOffset: currentIndex,
        endOffset: startOffset,
      });
    }

    fragments.push({
      text: fullText.slice(startOffset, endOffset),
      highlight: color,
      startOffset,
      endOffset,
    });

    currentIndex = endOffset;
  });

  if (currentIndex < fullText.length) {
    fragments.push({
      text: fullText.slice(currentIndex),
      startOffset: currentIndex,
      endOffset: fullText.length,
    });
  }

  // 🔷 General function to add layers
  const addLayerToFragments = (fragments, layerOnly, property) => {
    return fragments.flatMap((fragment) => {
      if (fragment.startOffset === fragment.endOffset) return [fragment];

      const overlaps = layerOnly.filter(
        (h) =>
          !(
            h.endOffset <= fragment.startOffset ||
            h.startOffset >= fragment.endOffset
          )
      );

      if (overlaps.length === 0) return [fragment];

      const subFragments = [];
      let start = fragment.startOffset;

      overlaps.forEach(({ startOffset, endOffset }) => {
        if (startOffset > start) {
          subFragments.push({
            ...fragment,
            text: fullText.slice(start, startOffset),
            startOffset: start,
            endOffset: startOffset,
          });
        }

        subFragments.push({
          ...fragment,
          text: fullText.slice(
            Math.max(start, startOffset),
            Math.min(fragment.endOffset, endOffset)
          ),
          startOffset: Math.max(start, startOffset),
          endOffset: Math.min(fragment.endOffset, endOffset),
          [property]: true,
        });

        start = Math.min(fragment.endOffset, endOffset);
      });

      if (start < fragment.endOffset) {
        subFragments.push({
          ...fragment,
          text: fullText.slice(start, fragment.endOffset),
          startOffset: start,
          endOffset: fragment.endOffset,
        });
      }

      return subFragments;
    });
  };

  let fragmentsWithLayers = fragments;
  fragmentsWithLayers = addLayerToFragments(
    fragmentsWithLayers,
    underlineOnly,
    "underline"
  );
  fragmentsWithLayers = addLayerToFragments(
    fragmentsWithLayers,
    boldOnly,
    "bold"
  );
  fragmentsWithLayers = addLayerToFragments(
    fragmentsWithLayers,
    italicOnly,
    "italic"
  );

  // 🔷 Split by diffs
  const splitFragmentsByDiffs = (fragments, diffs) => {
    const offsets = new Set();
    diffs.forEach((d) => {
      offsets.add(d.startOffset);
      offsets.add(d.endOffset);
    });

    const sortedOffsets = Array.from(offsets).sort((a, b) => a - b);

    const result = [];

    fragments.forEach((fragment) => {
      const { startOffset, endOffset, text } = fragment;

      if (startOffset === endOffset) {
        result.push(fragment);
        return;
      }

      const innerOffsets = sortedOffsets.filter(
        (o) => o > startOffset && o < endOffset
      );

      if (innerOffsets.length === 0) {
        const isDiff = diffs.some(
          (d) => !(d.endOffset <= startOffset || d.startOffset >= endOffset)
        );
        result.push({ ...fragment, isDiff });
        return;
      }

      let prev = startOffset;
      innerOffsets.push(endOffset);

      for (let i = 0; i < innerOffsets.length; i++) {
        const next = innerOffsets[i];
        const subText = text.slice(prev - startOffset, next - startOffset);

        const isDiff = diffs.some(
          (d) => !(d.endOffset <= prev || d.startOffset >= next)
        );

        result.push({
          ...fragment,
          text: subText,
          startOffset: prev,
          endOffset: next,
          isDiff,
        });

        prev = next;
      }
    });

    return result;
  };

  const fragmentsWithDiffs = splitFragmentsByDiffs(fragmentsWithLayers, diffs);

  // 🔷 Split by comments
  const splitFragmentsByComments = (fragments, comments) => {
    if (!comments || comments.length === 0) return fragments;

    const allOffsets = [...new Set(comments.map(c => c.offset))].sort((a, b) => a - b);
    console.log("🔧 splitFragmentsByComments called with:", {
      fragmentCount: fragments.length,
      commentCount: comments.length,
      uniqueOffsets: allOffsets.length,
      offsets: allOffsets
    });
    
    console.log("🔧 Fragments:", fragments.map(f => ({
      start: f.startOffset,
      end: f.endOffset,
      textLength: f.text?.length || 0
    })));

    const result = [];
    let handledOffsets = new Set();

    // 🔷 Handle comments at offset 0 (start of text) that might not be in any fragment
    const minOffset = fragments[0]?.startOffset || 0;
    // Group start comments to ensure they are merged
    const commentsAtStart = comments.filter((c) => c.offset === minOffset);
    
    if (commentsAtStart.length > 0 && minOffset === 0) {
      // Check if offset 0 will be handled by the first fragment
      const firstFragment = fragments[0];
      if (!firstFragment || firstFragment.startOffset > 0 || (firstFragment.startOffset === 0 && firstFragment.endOffset === 0)) {
        // Offset 0 won't be handled by loop, add it here
        result.push({
          text: "\u200B", // ✅ Use Zero Width Space to prevent Slate normalization
          startOffset: 0,
          endOffset: 0,
          comments: commentsAtStart,
        });
        handledOffsets.add(0);
      }
    }

    fragments.forEach((fragment, fragIndex) => {
      const { startOffset, endOffset, text } = fragment;

      // ✅ Deduplicate offsets to avoid creating duplicate comment fragments
      // ✅ Use <= to include comments at exact endOffset
      const commentsInRange = comments.filter(
        (c) => c.offset >= startOffset && c.offset <= endOffset && !handledOffsets.has(c.offset)
      );
      
      console.log(`🔧 Fragment ${fragIndex} [${startOffset}-${endOffset}] - filtering:`, {
        totalComments: comments.length,
        commentsInRange: commentsInRange.length,
        allOffsets: comments.map(c => c.offset),
        rangeOffsets: commentsInRange.map(c => c.offset),
        alreadyHandled: [...handledOffsets]
      });
      
      const uniqueOffsets = new Set(commentsInRange.map((c) => c.offset));
      const offsetsInThisFragment = Array.from(uniqueOffsets).sort((a, b) => a - b);
      
      console.log(`🔧 Fragment ${fragIndex} [${startOffset}-${endOffset}]:`, {
        textLength: text?.length,
        offsetsInFragment: offsetsInThisFragment.length,
        offsets: offsetsInThisFragment
      });

      if (offsetsInThisFragment.length === 0) {
        result.push(fragment);
        return;
      }

      let prevOffset = startOffset;

      offsetsInThisFragment.forEach((offset) => {
        if (offset > prevOffset) {
          result.push({
            ...fragment,
            text: text.slice(prevOffset - startOffset, offset - startOffset),
            startOffset: prevOffset,
            endOffset: offset,
          });
        }

        const commentsAtOffset = comments.filter((c) => c.offset === offset);
        handledOffsets.add(offset);

        result.push({
          ...fragment,
          text: "\u200B", // ✅ Use Zero Width Space
          startOffset: offset,
          endOffset: offset,
          comments: commentsAtOffset,
        });

        prevOffset = offset;
      });

      if (prevOffset < endOffset) {
        result.push({
          ...fragment,
          text: text.slice(prevOffset - startOffset),
          startOffset: prevOffset,
          endOffset,
        });
      }
    });

    const maxOffset = fragments[fragments.length - 1].endOffset;
    
    // ✅ Group comments at the very end of the text
    const endComments = comments.filter(
      (c) => c.offset === maxOffset && !handledOffsets.has(maxOffset)
    );
    
    if (endComments.length > 0) {
      result.push({
        text: "\u200B", // ✅ Use Zero Width Space
        startOffset: maxOffset,
        endOffset: maxOffset,
        comments: endComments,
      });
      handledOffsets.add(maxOffset);
    }

    const resultWithComments = result.filter(r => r.comments && r.comments.length > 0);
    console.log("🔧 splitFragmentsByComments result:", {
      totalFragments: result.length,
      fragmentsWithComments: resultWithComments.length,
      commentOffsets: resultWithComments.map(r => ({
        offset: r.startOffset,
        count: r.comments.length
      }))
    });

    return result;
  };

  const fragmentsWithComments = splitFragmentsByComments(
    fragmentsWithDiffs,
    comments
  );

  // 🔷 Split into paragraphs
  const paragraphs = [];
  let currentParagraph = [];

  fragmentsWithComments.forEach((fragment) => {
    const parts = fragment.text.split("\n");
    let offset = fragment.startOffset;

    parts.forEach((part, idx) => {
      const obj = {
        text: part,
        startOffset: offset,
        endOffset: offset + part.length,
      };

      if (fragment.highlight) obj.highlight = fragment.highlight;
      if (fragment.underline) obj.underline = true;
      if (fragment.bold) obj.bold = true;
      if (fragment.italic) obj.italic = true;
      if (fragment.isDiff) obj.isDiff = true;
      if (fragment.comments) obj.comments = fragment.comments;

      offset += part.length + 1;

      currentParagraph.push(obj);

      if (idx < parts.length - 1) {
        paragraphs.push({
          type: "paragraph",
          children: currentParagraph,
        });
        currentParagraph = [];
      }
    });
  });

  if (currentParagraph.length > 0) {
    paragraphs.push({
      type: "paragraph",
      children: currentParagraph,
    });
  }

  return paragraphs;
};

export const extractHighlightsFromValue = ({ value }) => {
  const highlights = [];
  const colorCounts = {};
  const underlineCounts = {};
  const boldCounts = {};
  const italicCounts = {};

  let globalOffset = 0;

  // ✅ Helper to ignore text length of comment placeholders
  const getEffectiveTextLength = (node) => {
    if (!node) return 0;
    // If it's a comment leaf (has comments), treat text length as 0
    if (node.comments && node.comments.length > 0) return 0;
    return node.text ? node.text.length : 0;
  };
  
  // ✅ Helper to get text content excluding comment placeholders
  const getEffectiveText = (node) => {
    if (!node) return "";
    if (node.comments && node.comments.length > 0) return "";
    return node.text || "";
  };

  for (let i = 0; i < value.length; i++) {
    const children = value[i].children;

    // ---------- Colors ----------
    let colorStartIndex = 0;
    let currentColor = children[0]?.highlight || null;

    for (let j = 0; j <= children.length; j++) {
      const child = children[j];
      const nextColor = child?.highlight || null;

      if (j === children.length || nextColor !== currentColor) {
        if (currentColor) {
          const startOffset =
            globalOffset +
            children
              .slice(0, colorStartIndex)
              .reduce((acc, c) => acc + getEffectiveTextLength(c), 0);
          const endOffset =
            startOffset +
            children
              .slice(colorStartIndex, j)
              .reduce((acc, c) => acc + getEffectiveTextLength(c), 0);
          const text = children
            .slice(colorStartIndex, j)
            .map((c) => getEffectiveText(c))
            .join("");

          // Only add highlight if it spans actual text
          if (text.length > 0) {
            highlights.push({
              color: currentColor,
              underline: false,
              bold: false,
              italic: false,
              innerText: text,
              startOffset,
              endOffset,
            });

            colorCounts[currentColor] = (colorCounts[currentColor] || 0) + 1;
          }
        }
        colorStartIndex = j;
        currentColor = nextColor;
      }
    }

    const handleLayer = (property, counts) => {
      let startIndex = null;
      let buffer = "";

      for (let j = 0; j <= children.length; j++) {
        const child = children[j];
        const active = child?.[property];
        const text = getEffectiveText(child);

        // Skip comment nodes completely for start index detection if they break continuity? 
        // No, they should just be "invisible". 
        // If we have Bold(He)[Comment]Bold(llo), it should be one Bold(Hello).
        // With text="", it works naturally.

        if (active && startIndex === null) {
          startIndex = j;
          buffer = text;
        } else if (active && startIndex !== null) {
          buffer += text;
        } else if (!active && startIndex !== null) {
          // Check if this "inactive" node is just a comment placeholder inside a highlighted section
          // If a comment is inserted inside bold text, it might NOT have bold mark if we didn't copy marks.
          // In splitFragmentsByComments, we spread ...fragment, so marks ARE copied.
          // So the comment placeholder WILL have 'bold' if inserted in bold text.
          // So logic holds.
          
          const startOffset =
            globalOffset +
            children
              .slice(0, startIndex)
              .reduce((acc, c) => acc + getEffectiveTextLength(c), 0);
          const endOffset = startOffset + buffer.length;

          if (buffer.length > 0) {
            highlights.push({
              color: null,
              underline: property === "underline",
              bold: property === "bold",
              italic: property === "italic",
              innerText: buffer,
              startOffset,
              endOffset,
            });

            counts[property] = (counts[property] || 0) + 1;
          }

          startIndex = null;
          buffer = "";
        }
      }

      if (startIndex !== null && buffer) {
        const startOffset =
          globalOffset +
          children
            .slice(0, startIndex)
            .reduce((acc, c) => acc + getEffectiveTextLength(c), 0);
        const endOffset = startOffset + buffer.length;

        if (buffer.length > 0) {
          highlights.push({
            color: null,
            underline: property === "underline",
            bold: property === "bold",
            italic: property === "italic",
            innerText: buffer,
            startOffset,
            endOffset,
          });

          counts[property] = (counts[property] || 0) + 1;
        }
      }
    };

    handleLayer("underline", underlineCounts);
    handleLayer("bold", boldCounts);
    handleLayer("italic", italicCounts);

    globalOffset += children.reduce((acc, c) => acc + getEffectiveTextLength(c), 0) + 1;
  }

  return {
    highlights,
    colorCounts: {
      ...colorCounts,
      ...underlineCounts,
      ...boldCounts,
      ...italicCounts,
    },
  };
};

// Mark color in text
export const markColor = (editor, color) => {
  if (!editor?.selection) return;
  Transforms.setNodes(
    editor,
    { highlight: color },
    { match: (n) => typeof n.text === "string", split: true }
  );
};

// Mark underline
export const markUnderline = (editor) => {
  if (!editor?.selection) return;
  Transforms.setNodes(
    editor,
    { underline: true },
    { match: (n) => typeof n.text === "string", split: true }
  );
};

// Remove all formatting

export const removeFormatting = (editor) => {
  if (!editor?.selection) return;

  Transforms.setNodes(
    editor,
    {
      highlight: null,
      underline: null,
      bold: null,
      italic: null,
    },
    { match: (n) => typeof n.text === "string", split: true }
  );

  Transforms.deselect(editor);
};

export const markBold = (editor) => {
  if (!editor.selection) return;
  editor.addMark("bold", true);
};

export const markItalic = (editor) => {
  if (!editor.selection) return;
  editor.addMark("italic", true);
};
