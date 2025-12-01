//CopyContext.js

import React, { createContext, useContext } from "react";
import {
  applyHighlightsToText as applyHighlightsToTextService,
  extractHighlightsFromValue as extractHighlightsFromValueService,
  markBold as markBoldService,
  markColor as markColorService,
  markItalic as markItalicService,
  markUnderline as markUnderlineService,
  removeFormatting as removeFormattingService,
} from "../services/EditService";

const EditContext = createContext();
export const useEdit = () => useContext(EditContext);

export function EditProvider({ children }) {
  // Apply marks to text
  const applyHighlightsToText = (baseText, highlights, diffs, comments) => {
    return applyHighlightsToTextService({
      baseText,
      highlights,
      diffs,
      comments,
    });
  };

  // Extract marks from text
  const extractHighlightsFromValue = (value) => {
    return extractHighlightsFromValueService({ value });
  };

  const markColor = (editor, color) => {
    markColorService(editor, color);
  };

  const markBold = (editor) => {
    markBoldService(editor);
  };

  const markItalic = (editor) => {
    markItalicService(editor);
  };

  const markUnderline = (editor) => {
    markUnderlineService(editor);
  };

  const removeFormatting = (editor) => {
    removeFormattingService(editor);
  };
  return (
    <EditContext.Provider
      value={{
        extractHighlightsFromValue,
        applyHighlightsToText,
        markBold,
        markColor,
        markItalic,
        markUnderline,
        removeFormatting,
      }}
    >
      {children}
    </EditContext.Provider>
  );
}
