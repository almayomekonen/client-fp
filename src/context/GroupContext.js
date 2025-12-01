//GroupContext.js

import React, { createContext, useContext } from "react";
import { useRefresh } from "./RefreshContext";
import {
  createGroupOnServer as createGroupOnServerpService,
  deleteGroupFromServer as deleteGroupFromServerService,
  fetchGroupsByExperimentId as groupsByExperimentIdService,
} from "../api/GroupApi";

const GroupContext = createContext();
export const useGroup = () => useContext(GroupContext);

export function GroupProvider({ children }) {
  const {
    refreshCopies,
    refreshTasks,
    refreshCopyMessages,
    refreshTaskMessages,
  } = useRefresh();

  // Create group
  const addGroup = async (experimentId, name, description) => {
    return await createGroupOnServerpService({
      experimentId,
      name,
      description,
    });
  };

  // Groups by experiment
  const groupsByExperimentId = async (experimentId) => {
    return await groupsByExperimentIdService(experimentId);
  };

  const deleteGroup = async (id) => {
    const result = await deleteGroupFromServerService(id);
    // ✅ Refresh ALL related data after deletion
    await Promise.all([
      refreshCopies(),
      refreshTasks(),
      refreshCopyMessages(),
      refreshTaskMessages(),
    ]);
    return result;
  };

  return (
    <GroupContext.Provider
      value={{ addGroup, groupsByExperimentId, deleteGroup }}
    >
      {children}
    </GroupContext.Provider>
  );
}
