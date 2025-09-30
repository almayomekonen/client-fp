// UserContext.js

import React, { createContext, useContext } from 'react';
import { useData } from './DataContext';
import { useRefresh } from './RefreshContext';

import {
updateUserOnServer as updateUserOnServerService,
  deleteUserFromServer as deleteUserFromServerService,
    login as loginService,
    logout as logoutService
} from '../api/UserApi';
const UserContext = createContext();

export function UserProvider({ children }) {
  const {refreshUsers} = useRefresh();

  //ייבוא דאטה
  const { 
    users, 
    setCurrentUser,
  } = useData();




  //התחברות
  const login = async(username, password) => {
    return await loginService( username, password );
  };
  


  const resetPassword = async(userId, password) => {
    const result = await updateUserOnServerService(userId, {newPassword: password});
    await refreshUsers();
    return result;
}
  

  //התנתקות
  const logout = () => {
    logoutService(setCurrentUser);
  };




  const deleteUser = async (id) => {
    return await deleteUserFromServerService(id);
  };



  const userById = (userId) => {
    return users.find(u => u._id === userId);
  };

  const updateUserRole = async(userId, newRole) => {
  await updateUserOnServerService (userId, {role: newRole});
  await refreshUsers();
};




  return (
    <UserContext.Provider
      value={{
        login,
resetPassword,
        logout,
        deleteUser,
        userById,
        updateUserRole
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUsers = () => useContext(UserContext);
