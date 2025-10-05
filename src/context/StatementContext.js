// StatementContext.js

import React, { createContext, useContext } from "react";
import {
  createStatementOnServer as createStatementOnServerService,
  deleteStatementFromServer as deleteStatementFromServerService,
  fetchStatementsByGroupId as fetchStatementsByGroupIdService,
  fetchStatementById as fetchStatementByIdService,
} from "../api/StatementApi";

const StatementContext = createContext();
export const useStatement = () => useContext(StatementContext);

export function StatementProvider({ children }) {
  // --- Create statement ---
  const addStatement = async (name, text, groupId, experimentId) => {
    return await createStatementOnServerService({
      name,
      text,
      groupId,
      experimentId,
    });
  };

  // --- Statements by group ---
  const statementsByGroupId = async (groupId) => {
    return await fetchStatementsByGroupIdService(groupId);
  };

  // --- Statement by ID ---
  const statementById = async (statementId) => {
    return await fetchStatementByIdService(statementId);
  };

  // --- Delete statement ---
  const deleteStatement = async (id) => {
    await deleteStatementFromServerService(id);
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
