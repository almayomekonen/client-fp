// StatementContext.js

import React, { createContext, useContext } from "react";
import { useRefresh } from "./RefreshContext";
import {
  createStatementOnServer as createStatementOnServerService,
  deleteStatementFromServer as deleteStatementFromServerService,
  fetchStatementsByGroupId as fetchStatementsByGroupIdService,
  fetchStatementById as fetchStatementByIdService,
} from "../api/StatementApi";

const StatementContext = createContext();
export const useStatement = () => useContext(StatementContext);

export function StatementProvider({ children }) {
  const {
    refreshCopies,
    refreshTasks,
    refreshCopyMessages,
    refreshTaskMessages,
  } = useRefresh();

  // --- יצירת הצהרה ---
  const addStatement = async (name, text, groupId, experimentId) => {
    return await createStatementOnServerService({
      name,
      text,
      groupId,
      experimentId,
    });
  };

  // --- הצהרות לפי קבוצה ---
  const statementsByGroupId = async (groupId) => {
    return await fetchStatementsByGroupIdService(groupId);
  };

  // --- הצהרה לפי ID ---
  const statementById = async (statementId) => {
    return await fetchStatementByIdService(statementId);
  };

  // --- מחיקת הצהרה ---
  const deleteStatement = async (id) => {
    await deleteStatementFromServerService(id);
    // ✅ Refresh ALL related data after deletion
    await Promise.all([
      refreshCopies(),
      refreshTasks(),
      refreshCopyMessages(),
      refreshTaskMessages(),
    ]);
  };

  return (
    <StatementContext.Provider
      value={{
        addStatement,
        statementsByGroupId,
        statementById,
        deleteStatement,
      }}
    >
      {children}
    </StatementContext.Provider>
  );
}
