import React, { createContext, useContext } from 'react';
import {
  createComparison as createComparisonService,
  removeAllComparisons as removeAllComparisonsService,
  deleteComparison as deleteComparisonService,
  getComparisonsForCopyFromServer,
  checkComparisonExists as checkComparisonExistsService
} from '../api/ComprasionApi';
import{  compareCopies as compareCopiesService } from '../services/ComprasionService';

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
    // פונקציה חדשה שמביאה ישירות מהשרת
    return await getComparisonsForCopyFromServer(copyId);
  };

  const checkComparisonExists = async (copyId1, copyId2) => {
    // פונקציה חדשה שמביאה ישירות מהשרת
    return await checkComparisonExistsService(copyId1, copyId2);
  };

  return (
    <ComparisonContext.Provider value={{
      createComparison,
      deleteComparison,
      removeAllComparisons,
      getComparisonsForCopy,
      checkComparisonExists,
      compareCopies
    }}>
      {children}
    </ComparisonContext.Provider>
  );
}
