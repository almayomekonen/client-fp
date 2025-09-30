//CopyContext.js

import React, { createContext, useContext } from 'react';
import { 
    calculateSelectionCounts as calculateSelectionCountsService,
    calculateWordCounts as calculateWordCountsService,
    calculateWordCountsForSelection as calculateWordCountsForSelectionService,
    renderKeyLabel as renderKeyLabelService
} from '../services/ResultsService';

const ResultContext = createContext();
export const useResult = () => useContext(ResultContext);

export function ResultProvider({ children }) {


  //לשים סימונים על טקסט
  const calculateSelectionCounts =  (editor, setSelectionCounts) => {
    return calculateSelectionCountsService (editor, setSelectionCounts);
  };

  //לשאוב סימונים מטקסט
  const calculateWordCounts = (value, startOffset = null, endOffset = null) => {
    return calculateWordCountsService(value, startOffset = null, endOffset = null);
  };


    const calculateWordCountsForSelection = (editor, value) => {
    return calculateWordCountsForSelectionService(editor, value);
  };

  const renderKeyLabel = (key, value) => {
    return renderKeyLabelService(key, value);
  };
  


  return (
    <ResultContext.Provider value={{ 
      calculateSelectionCounts,
       calculateWordCounts,
       calculateWordCountsForSelection,
       renderKeyLabel
     }}>
      {children}
    </ResultContext.Provider>
  );
}

