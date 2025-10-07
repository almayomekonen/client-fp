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
  const { refreshCopies } = useRefresh();

  //יצירת קבוצה
  const addGroup = async (experimentId, name, description) => {
    return await createGroupOnServerpService({
      experimentId,
      name,
      description,
    });
  };

  //קבוצות לפי ניסוי
  const groupsByExperimentId = async (experimentId) => {
    return await groupsByExperimentIdService(experimentId);
  };

  const deleteGroup = async (id) => {
    try {
      await deleteGroupFromServerService(id);
      // ✅ רענן את רשימת ה-copies אחרי המחיקה
      await refreshCopies();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.message || "שגיאה במחיקת קבוצה",
      };
    }
  };

  return (
    <GroupContext.Provider
      value={{ addGroup, groupsByExperimentId, deleteGroup }}
    >
      {children}
    </GroupContext.Provider>
  );
}
