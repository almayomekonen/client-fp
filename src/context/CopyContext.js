//CopyContext.js

import React, { createContext, useContext, useEffect } from "react";
import { useData } from "./DataContext";
import { useRefresh } from "./RefreshContext";
import {
  copiesByStatementId as copiesByStatementIdService,
  copiesForExperimentByCoderId as copiesForExperimentByCoderIdService,
  copiesByTaskId as copiesByTaskIdService,
  copyById as copyByIdService,
  copyByStatementAndUser as copyByStatementAndUserService,
  calculateCompletionPercentage as calculateCompletionPercentageService,
  getLastUpdateDate as getLastUpdateDateService,
} from "../services/CopyService";

import {
  createCopyOnServer as createCopyOnServerService,
  apiSaveHighlights as apiSaveHighlightsService,
  apiUpdateStatus as apiUpdateStatusService,
  deleteCopyFromServer as deleteCopyFromServerService,
  UpdateCopyOnServer as UpdateCopyOnServerService,
} from "../api/CopyApi";

const CopyContext = createContext();
export const useCopy = () => useContext(CopyContext);

export function CopyProvider({ children }) {
  //ייבוא דאטה
  const { copies, tasks } = useData();

  const { refreshCopies } = useRefresh();

  const addCopy = async (statementId, groupId, experimentId, coderId) => {
    const result = await createCopyOnServerService({
      statementId,
      groupId,
      experimentId,
      coderId,
    });
    await refreshCopies();
    return result;
  };

  const deleteCopy = async (id) => {
    const result = await deleteCopyFromServerService(id);
    // ✅ Refresh ALL related data after deletion
    await refreshCopies();
    return result;
  };

  //העתקים לפי הצהרה
  const copiesByStatementId = (statementId) => {
    return copiesByStatementIdService(copies, { statementId });
  };

  //העתקים לפי משימה
  const copiesByTaskId = (taskId) => {
    return copiesByTaskIdService(copies, tasks, { taskId });
  };

  //העתקים לניסוי לפי מקודד
  const copiesForExperimentByCoderId = (coderId) => {
    return copiesForExperimentByCoderIdService(copies, { coderId });
  };

  //העתק לפי ID
  const copyById = (copyId) => {
    return copyByIdService(copies, { copyId });
  };

  //שמירת סימונים וכמויות
  const saveCopyWithHighlights = async (copyId, highlights, colorCounts) => {
    const r = await UpdateCopyOnServerService(copyId, {
      highlights,
      colorCounts,
    });
    await refreshCopies();
    return r;
  };

  //עדכון סטטוס של העתק
  const updateCopyStatus = async (copyId, status) => {
    await UpdateCopyOnServerService(copyId, { status });
    await refreshCopies();
  };

  //העתק לפי הצהרה ומקודד
  const copyByStatementAndUser = (statementId, userId) => {
    return copyByStatementAndUserService(copies, { statementId, userId });
  };

  //אחוזי סיום קידודים
  const calculateCompletionPercentage = (relevantCopies) => {
    return calculateCompletionPercentageService({ relevantCopies });
  };

  //תאריך אחרון מבין תאריכי העדכון של ההעתקים
  const getLastUpdateDate = (relevantCopies) => {
    return getLastUpdateDateService({ relevantCopies });
  };

  return (
    <CopyContext.Provider
      value={{
        addCopy,
        copiesByStatementId,
        copiesForExperimentByCoderId,
        copyById,
        deleteCopy,
        copiesByTaskId,
        saveCopyWithHighlights,
        updateCopyStatus,
        copyByStatementAndUser,
        calculateCompletionPercentage,
        getLastUpdateDate,
      }}
    >
      {children}
    </CopyContext.Provider>
  );
}
