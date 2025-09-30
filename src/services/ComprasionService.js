
export const compareCopies = ( coderA, coderB, fullText, range ) => {
  const diffs = [];

  const collectOffsets = (highlights) => {
    const offsets = new Set();
    (highlights || []).forEach(({ startOffset, endOffset }) => {
      offsets.add(startOffset);
      offsets.add(endOffset);
    });
    return offsets;
  };

  const offsets = new Set([
    ...collectOffsets(coderA.highlights),
    ...collectOffsets(coderB.highlights),
    0,
    fullText.length,
  ]);

  const sortedOffsets = Array.from(offsets).sort((a, b) => a - b);

  const minimalRanges = [];
  for (let i = 0; i < sortedOffsets.length - 1; i++) {
    const start = sortedOffsets[i];
    const end = sortedOffsets[i + 1];
    if (start < end) {
      minimalRanges.push([start, end]);
    }
  }

  const isInRange = ([start, end]) => {
    if (!range) return true;
    return start < range.end && end > range.start;
  };

  const getMarks = (highlights, start, end) => {
    return (highlights || []).filter(
      (h) => h.startOffset < end && h.endOffset > start
    );
  };

  for (const [start, end] of minimalRanges.filter(isInRange)) {
    const word = fullText.slice(start, end);

    const aMarks = getMarks(coderA.highlights, start, end);
    const bMarks = getMarks(coderB.highlights, start, end);

    const props = ["color", "underline", "bold", "italic"];

    props.forEach((prop) => {
      const aMark = aMarks.find(mark => mark[prop]);
      const bMark = bMarks.find(mark => mark[prop]);

      const valA =
        prop === "color" ? aMark?.color || null : Boolean(aMark?.[prop]);
      const valB =
        prop === "color" ? bMark?.color || null : Boolean(bMark?.[prop]);

      if (valA !== valB) {
        const diffObj = {
          word,
          startOffset: start,
          endOffset: end,
        };

        if (prop === "color") {
          diffObj.coderAColor = valA;
          diffObj.coderBColor = valB;
        } else if (prop === "underline") {
          diffObj.coderAUnderline = valA;
          diffObj.coderBUnderline = valB;
        } else if (prop === "bold") {
          diffObj.coderABold = valA;
          diffObj.coderBBold = valB;
        } else if (prop === "italic") {
          diffObj.coderAItalic = valA;
          diffObj.coderBItalic = valB;
        }

        diffs.push(diffObj);
      }
    });
  }

  return diffs;
};



export const getComparisonsForCopy = (comparisons, copyId) => {
  return comparisons
    .filter(c => c.copyA === copyId || c.copyB === copyId)
    .map(c => (c.copyA === copyId ? c.copyB : c.copyA));
};

