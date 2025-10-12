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
  const {
    refreshCopies,
    refreshTasks,
    refreshCopyMessages,
    refreshTaskMessages,
  } = useRefresh();

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

  // שם החוקר לפי ניסוי
  const investigatorNameByExperimentId = async (experimentId) => {
    return await fetchInvestigatorNameByExperimentId(experimentId);
  };

  const deleteExperiment = async (id) => {
    const result = await deleteExperimentFromServer(id);
    // ✅ Refresh ALL related data after deletion
    await Promise.all([
      refreshCopies(),
      refreshTasks(),
      refreshCopyMessages(),
      refreshTaskMessages(),
    ]);
    return result;
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
