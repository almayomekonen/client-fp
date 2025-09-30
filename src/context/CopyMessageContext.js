/*import React, { createContext, useContext } from 'react';
import {
  createCopyMessageOnServer,
  deleteCopyMessageFromServer,
  updateCopyMessageOnServer,
  fetchMessagesForCopy,
  fetchUnreadCount,
  fetchMessageById
} from '../api/CopyMessageApi';

const CopyMessageContext = createContext();
export const useCopyMessage = () => useContext(CopyMessageContext);

export function CopyMessageProvider({ children }) {
  const sendMessage = async (copyId, senderId, text, replyToMessageId = null) => {
    return await createCopyMessageOnServer(copyId, senderId, text, replyToMessageId);
  };

  const markAsRead = async (messageId, userId) => {
    return await updateCopyMessageOnServer(messageId, { addToReadBy: userId });
  };

  const deleteMessage = async (messageId) => {
    return await deleteCopyMessageFromServer(messageId);
  };

  const getMessagesForCopy = async (copyId) => {
    return await fetchMessagesForCopy(copyId);
  };

  const getUnreadCount = async (copyId, userId) => {
    return await fetchUnreadCount(copyId, userId);
  };

  const messageById = async (messageId) => {
    return await fetchMessageById(messageId);
  };

  return (
    <CopyMessageContext.Provider
      value={{
        sendMessage,
        markAsRead,
        deleteMessage,
        getMessagesForCopy,
        getUnreadCount,
        messageById,
      }}
    >
      {children}
    </CopyMessageContext.Provider>
  );
}


*/

import React, { createContext, useContext } from 'react';
import { useData } from './DataContext';
import { useRefresh } from './RefreshContext';
import {
  createCopyMessageOnServer,
  deleteCopyMessageFromServer,
  updateCopyMessageOnServer as updateCopyMessageOnServerService
} from '../api/CopyMessageApi';

const CopyMessageContext = createContext();
export const useCopyMessage = () => useContext(CopyMessageContext);

export function CopyMessageProvider({ children }) {
  const { copyMessages } = useData();
  const { refreshCopyMessages } = useRefresh();

  const sendMessage = async (copyId, senderId, text, replyToMessageId = null) => {
    await createCopyMessageOnServer(copyId, senderId, text, replyToMessageId);
    await refreshCopyMessages();
  };

  const markAsRead = async (messageId, userId) => {
await updateCopyMessageOnServerService(messageId, { addToReadBy: userId });
    await refreshCopyMessages();
  };

  const getMessagesForCopy = (copyId) => {
    return copyMessages
      .filter(m => m.copyId === copyId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  };

  const getUnreadCount = (copyId, userId) => {
    return copyMessages
      .filter(m => m.copyId === copyId && !m.readBy.includes(userId))
      .length;
  };

  const messageById = (messageId) => {
    return copyMessages.find(m => m._id === messageId) || null;
  };

  const deleteCopyMessage = async (messageId) => {
    await deleteCopyMessageFromServer(messageId);
  };


  return (
    <CopyMessageContext.Provider
      value={{
        sendMessage,
        markAsRead,
        getMessagesForCopy,
        getUnreadCount,
        messageById,
        deleteCopyMessage,
      }}
    >
      {children}
    </CopyMessageContext.Provider>
  );
}