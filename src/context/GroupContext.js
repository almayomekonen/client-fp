//GroupContext.js

import React, { createContext, useContext,  } from 'react';
import { 
  createGroupOnServer as createGroupOnServerpService,
  deleteGroupFromServer as deleteGroupFromServerService,
    fetchGroupsByExperimentId as groupsByExperimentIdService,

} from '../api/GroupApi';

const GroupContext = createContext();
export const useGroup = () => useContext(GroupContext);

export function GroupProvider({ children }) {




  //יצירת קבוצה
  const addGroup = async(experimentId, name, description) => {
    return await createGroupOnServerpService( {experimentId, name, description} );
  }

  //קבוצות לפי ניסוי
  const groupsByExperimentId = async(experimentId) => {

    return await groupsByExperimentIdService(experimentId );


  };


  const deleteGroup = async (id) => {
    return await deleteGroupFromServerService(id);
  };


  return (
    <GroupContext.Provider value={{ addGroup, groupsByExperimentId, deleteGroup }}>
      {children}
    </GroupContext.Provider>
  );
}