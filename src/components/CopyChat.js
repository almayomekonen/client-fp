/*import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useCopyMessage } from '../context/CopyMessageContext';

export default function CopyChat({ copyId }) {
  const { currentUser, users } = useData();
  const {
    getMessagesForCopy,
    sendMessage,
    markAsRead,
    messageById,
    deleteMessage,
  } = useCopyMessage();

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);

  // טוען הודעות מהשרת
  useEffect(() => {
    const loadMessages = async () => {
      const msgs = await getMessagesForCopy(copyId);
      setMessages(msgs);

      // מסמן כנקרא
      if (msgs.length > 0 && currentUser?._id) {
        for (const m of msgs) {
          if (!m.readBy.includes(currentUser._id)) {
            await markAsRead(m._id, currentUser._id);
          }
        }
      }
    };

    loadMessages();
  }, [copyId, currentUser?._id, getMessagesForCopy, markAsRead]);

  // שליחת הודעה חדשה
  const handleSend = async () => {
    if (!newMessage.trim()) return;
    await sendMessage(copyId, currentUser?._id, newMessage, replyTo?._id || null);
    setNewMessage('');
    setReplyTo(null);

    const msgs = await getMessagesForCopy(copyId);
    setMessages(msgs);
  };

  // מחיקת הודעה
  const handleDeleteMessage = async (msgId) => {
    await deleteMessage(msgId);
    const msgs = await getMessagesForCopy(copyId);
    setMessages(msgs);
  };

  // השגת שם משתמש
  const getUserName = (userId) => {
    const user = users.find((u) => u._id === userId);
    return user ? user.username : 'לא ידוע';
  };

  // פורמט תאריך
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // השבתה להודעה
  const handleReply = async (msgId) => {
    const msg = await messageById(msgId);
    if (msg) setReplyTo(msg);
  };

  const cancelReply = () => setReplyTo(null);

  return (
    <div className="border rounded p-4 bg-gray-50">
      <div className="h-64 overflow-y-auto mb-4 border p-2 bg-white">
        {messages.map((msg) => (
          <div key={msg._id} className="mb-3 border-b pb-2">
            {msg.replyToMessageId && (
              <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 mb-1 rounded">
                תגובה ל:{' '}
                <strong>{getUserName(messages.find(m => m._id === msg.replyToMessageId)?.senderId)}:</strong>{' '}
                {messages.find(m => m._id === msg.replyToMessageId)?.text || 'הודעה לא זמינה'}
              </div>
            )}
            <div>
              <strong>{getUserName(msg.senderId)}:</strong> {msg.text}
            </div>
            <div className="text-xs text-gray-500 flex justify-between">
              <span>{formatTimestamp(msg.createdAt)}</span>
              <span>
                <button
                  onClick={() => handleReply(msg._id)}
                  className="text-blue-500 text-xs ml-2"
                >
                  השב
                </button>
                {msg.senderId === currentUser?._id && (
                  <button
                    onClick={() => handleDeleteMessage(msg._id)}
                    className="text-red-500 text-xs ml-2"
                  >
                    מחק
                  </button>
                )}
              </span>
            </div>
          </div>
        ))}
      </div>

      {replyTo && (
        <div className="mb-2 bg-yellow-100 p-2 rounded text-sm">
          תגובה ל: <strong>{getUserName(replyTo.senderId)}:</strong> {replyTo.text}
          <button onClick={cancelReply} className="ml-4 text-red-600 text-xs">
            ביטול
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="border flex-1 p-2"
          placeholder="כתוב הודעה…"
        />
        <button
          onClick={handleSend}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          שלח
        </button>
      </div>
    </div>
  );
}

*/


import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useCopy } from '../context/CopyContext';
import { useCopyMessage } from '../context/CopyMessageContext';

export default function CopyChat({ copyId }) {
  const { currentUser, users } = useData();
  const { getMessagesForCopy, sendMessage, markAsRead, messageById, deleteCopyMessage } = useCopyMessage();

  const copyMessages = getMessagesForCopy(copyId);

  const [newMessage, setNewMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);

  useEffect(() => {
    if (copyMessages.length > 0) {
      copyMessages.forEach(m => {
        if (!m.readBy.includes(currentUser?._id)) {
          markAsRead(m?._id, currentUser?._id);
        }
      });
    }
  }, [copyMessages, currentUser?._id, markAsRead]);

  const handleSend = async() => {
    if (!newMessage.trim()) return;
    await sendMessage(copyId, currentUser?._id, newMessage, replyTo?._id || null);
    setNewMessage('');
    setReplyTo(null);
  };

    const handleDeleteMessage = async(msgId) => {
    await deleteCopyMessage(msgId);
   }

  const getUserName = (userId) => {
    const user = users.find(u => u._id === userId);
    return user ? user.username : 'לא ידוע';
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp).toLocaleString('he-IL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleReply = (msgId) => {
    const msg = messageById(msgId);
    if (msg) setReplyTo(msg);
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  return (
    <div className="border rounded p-4 bg-gray-50">
      <div className="h-64 overflow-y-auto mb-4 border p-2 bg-white">
        {copyMessages.map((msg) => (
          <div key={msg?._id} className="mb-3 border-b pb-2">
            {msg.replyToMessageId && (
              <div className="text-xs text-gray-600 bg-gray-100 px-2 py-1 mb-1 rounded">
                תגובה ל: <strong>{getUserName(messageById(msg.replyToMessageId)?.senderId)}:</strong>{' '}
                {messageById(msg.replyToMessageId)?.text || 'הודעה לא זמינה'}
              </div>
            )}
            <div>
              <strong>{getUserName(msg?.senderId)}:</strong> {msg?.text}
            </div>
            <div className="text-xs text-gray-500 flex justify-between">
              <span>{formatTimestamp(msg?.createdAt)}</span>
              <span>
                <button
                  onClick={() => handleReply(msg._id)}
                  className="text-blue-500 text-xs ml-2"
                >
                  השב
                </button>
                {msg.senderId === currentUser?._id && (
                  <button
                    onClick={() => handleDeleteMessage(msg._id)}
                    className="text-red-500 text-xs ml-2"
                  >
                    מחק
                  </button>
                )}
              </span>
            </div>
          </div>
        ))}
      </div>

      {replyTo && (
        <div className="mb-2 bg-yellow-100 p-2 rounded text-sm">
          תגובה ל: <strong>{getUserName(replyTo.senderId)}:</strong> {replyTo.text}
          <button onClick={cancelReply} className="ml-4 text-red-600 text-xs">
            ביטול
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          className="border flex-1 p-2"
          placeholder="כתוב הודעה…"
        />
        <button onClick={handleSend} className="bg-blue-500 text-white px-4 py-2 rounded">
          שלח
        </button>
      </div>
    </div>
  );
}