//CopyContext.js

import React, { createContext, useContext } from "react";
import {
  calculateSelectionCounts as calculateSelectionCountsService,
  calculateWordCounts as calculateWordCountsService,
  calculateWordCountsForSelection as calculateWordCountsForSelectionService,
  renderKeyLabel as renderKeyLabelService,
  buildResultsTable as buildResultsTableService,
  calculateAdditionalStats as calculateAdditionalStatsService,
} from "../services/ResultsService";

const ResultContext = createContext();
export const useResult = () => useContext(ResultContext);

export function ResultProvider({ children }) {
  // Calculate marks on text
  const calculateSelectionCounts = (editor, setSelectionCounts) => {
    return calculateSelectionCountsService(editor, setSelectionCounts);
  };

  // Extract marks from text
  const calculateWordCounts = (value, startOffset = null, endOffset = null) => {
    return calculateWordCountsService(
      value,
      (startOffset = null),
      (endOffset = null)
    );
  };

  const calculateWordCountsForSelection = (editor, value) => {
    return calculateWordCountsForSelectionService(editor, value);
  };

  const renderKeyLabel = (key, value) => {
    return renderKeyLabelService(key, value);
  };

  const buildResultsTable = (counts, wordCounts, colors, styleSettings) => {
    return buildResultsTableService(counts, wordCounts, colors, styleSettings);
  };

  const calculateAdditionalStats = (value, editor) => {
    return calculateAdditionalStatsService(value, editor);
  };

  return (
    <ResultContext.Provider
      value={{
        calculateSelectionCounts,
        calculateWordCounts,
        calculateWordCountsForSelection,
        renderKeyLabel,
        buildResultsTable,
        calculateAdditionalStats,
      }}
    >
      {children}
    </ResultContext.Provider>
  );
}
