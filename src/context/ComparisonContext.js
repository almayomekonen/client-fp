import React, { createContext, useContext } from "react";
import {
  createComparisonOnServer as createComparisonService,
  deleteAllComparisonsFromServer as removeAllComparisonsService,
  deleteComparisonFromServer as deleteComparisonService,
  fetchComparisonsFromServerForCopy as getComparisonsForCopyFromServer,
  checkComparisonExistsOnServer as checkComparisonExistsService,
} from "../api/ComprasionApi";
import { compareCopies as compareCopiesService } from "../services/ComprasionService";

const ComparisonContext = createContext();
export const useComparison = () => useContext(ComparisonContext);

export function ComparisonProvider({ children }) {
  const compareCopies = (coderA, coderB, fullText, range = null) => {
    return compareCopiesService(coderA, coderB, fullText, range);
  };

  const createComparison = async (copyId1, copyId2) => {
    await createComparisonService(copyId1, copyId2);
  };

  const deleteComparison = async (copyId1, copyId2) => {
    await deleteComparisonService(copyId1, copyId2);
  };

  const removeAllComparisons = async (copyId) => {
    await removeAllComparisonsService(copyId);
  };

  const getComparisonsForCopy = async (copyId) => {
    // New function that fetches directly from server
    return await getComparisonsForCopyFromServer(copyId);
  };

  const checkComparisonExists = async (copyId1, copyId2) => {
    // New function that fetches directly from server
    return await checkComparisonExistsService(copyId1, copyId2);
  };

  return (
    <ComparisonContext.Provider
      value={{
        createComparison,
        deleteComparison,
        removeAllComparisons,
        getComparisonsForCopy,
        checkComparisonExists,
        compareCopies,
      }}
    >
      {children}
    </ComparisonContext.Provider>
  );
}
