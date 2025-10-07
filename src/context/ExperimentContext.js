import React, { createContext, useContext } from "react";
import { useRefresh } from "./RefreshContext";
import {
  deleteExperimentFromServer,
  fetchExperimentsFromServer,
  updateExperimentOnServer,
  fetchExperimentById,
  fetchExperimentsByInvestigatorId,
  fetchInvestigatorNameByExperimentId,
} from "../api/ExperimentApi";

import { addExperiment as addExperimentService } from "../services/ExperimentService";

const ExperimentContext = createContext();
export const useExperiment = () => useContext(ExperimentContext);

export function ExperimentProvider({ children }) {
  const { refreshCopies, refreshTasks } = useRefresh();

  // יצירת ניסוי חדש
  const addExperiment = async (name, description, investigatorId) => {
    const r = await addExperimentService({ name, description, investigatorId });
    return r.newExperiment;
  };

  const fetchExperiments = async () => {
    return await fetchExperimentsFromServer();
  };

  // ניסוי לפי מזהה
  const experimentById = async (experimentId) => {
    return await fetchExperimentById(experimentId);
  };

  // ניסויים לפי מזהה חוקר
  const experimentsByInvestigatorId = async (investigatorId) => {
    return await fetchExperimentsByInvestigatorId(investigatorId);
  };

  const investigatorNameByExperimentId = async (experimentId) => {
    return await fetchInvestigatorNameByExperimentId(experimentId);
  };

  const deleteExperiment = async (experimentId) => {
    try {
      await deleteExperimentFromServer(experimentId);
      // ✅ רענן את כל הדאטה אחרי מחיקת ניסוי
      await refreshCopies();
      await refreshTasks();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.message || "שגיאה במחיקת ניסוי",
      };
    }
  };

  const updateExperiment = async (experimentId, updateFields) => {
    return await updateExperimentOnServer(experimentId, updateFields);
  };

  return (
    <ExperimentContext.Provider
      value={{
        addExperiment,
        experimentById,
        experimentsByInvestigatorId,
        deleteExperiment,
        investigatorNameByExperimentId,
        fetchExperiments,
        updateExperiment,
      }}
    >
      {children}
    </ExperimentContext.Provider>
  );
}
