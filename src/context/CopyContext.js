import React, { createContext, useContext } from "react";
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
  // Import data
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

  // Copies by statement
  const copiesByStatementId = (statementId) => {
    return copiesByStatementIdService(copies, { statementId });
  };

  // Copies by task
  const copiesByTaskId = (taskId) => {
    return copiesByTaskIdService(copies, tasks, { taskId });
  };

  // Copies for experiment by coder
  const copiesForExperimentByCoderId = (coderId) => {
    return copiesForExperimentByCoderIdService(copies, { coderId });
  };

  // Copy by ID
  const copyById = (copyId) => {
    return copyByIdService(copies, { copyId });
  };

  // Save highlights and counts
  const saveCopyWithHighlights = async (copyId, highlights, colorCounts) => {
    const r = await UpdateCopyOnServerService(copyId, {
      highlights,
      colorCounts,
    });
    await refreshCopies();
    return r;
  };

  // Update copy status
  const updateCopyStatus = async (copyId, status) => {
    await UpdateCopyOnServerService(copyId, { status });
    await refreshCopies();
  };

  // Copy by statement and coder
  const copyByStatementAndUser = (statementId, userId) => {
    return copyByStatementAndUserService(copies, { statementId, userId });
  };

  // Completion percentage of codings
  const calculateCompletionPercentage = (relevantCopies) => {
    return calculateCompletionPercentageService({ relevantCopies });
  };

  // Last update date from copies update dates
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
