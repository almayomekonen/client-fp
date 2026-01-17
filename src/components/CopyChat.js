

import React, { useState, useEffect, useRef } from "react";
import { useData } from "../context/DataContext";
import { useCopyMessage } from "../context/CopyMessageContext";
import { FaPaperPlane, FaReply, FaTrash, FaTimes } from "react-icons/fa";

export default function CopyChat({ copyId }) {
  const { currentUser, users } = useData();
  const {
    getMessagesForCopy,
    sendMessage,
    markAsRead,
    messageById,
    deleteCopyMessage,
  } = useCopyMessage();
  const messagesEndRef = useRef(null);
  const markedAsReadRef = useRef(new Set()); // Track messages already marked as read

  const copyMessages = getMessagesForCopy(copyId);

  const [newMessage, setNewMessage] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [isSending, setIsSending] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (copyMessages.length > 0 && currentUser?._id) {
      copyMessages.forEach((m) => {
        // Only mark as read if not already in the user's readBy array
        // AND we haven't already called markAsRead for this message in this session
        if (!m.readBy.includes(currentUser._id) && !markedAsReadRef.current.has(m._id)) {
          markedAsReadRef.current.add(m._id); // Mark as processed to prevent duplicate calls
          markAsRead(m._id, currentUser._id);
        }
      });
      scrollToBottom();
    }
  }, [copyMessages, currentUser?._id, markAsRead]);

  const handleSend = async () => {
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);

    try {
      await sendMessage(
        copyId,
        currentUser?._id,
        newMessage,
        replyTo?._id || null
      );
      setNewMessage("");
      setReplyTo(null);
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm("Are you sure you want to delete this message?")) {
      return;
    }

    try {
      await deleteCopyMessage(msgId);
    } catch (error) {
      console.error("Error deleting message:", error);
      alert("Failed to delete message. Please try again.");
    }
  };

  const getUserName = (userId) => {
    const user = users.find((u) => u._id === userId);
    return user ? user.username : "Unknown";
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReply = (msgId) => {
    const msg = messageById(msgId);
    if (msg) setReplyTo(msg);
  };

  const cancelReply = () => {
    setReplyTo(null);
  };

  return (
    <div className="copy-chat-container">
      <div className="chat-messages-area">
        {copyMessages.length === 0 ? (
          <div className="chat-empty-state">
            <div className="chat-empty-icon">💬</div>
            <div className="chat-empty-text">
              No messages yet. Start the conversation!
            </div>
          </div>
        ) : (
          <>
            {copyMessages.map((msg) => {
              const isOwnMessage = msg.senderId === currentUser?._id;
              return (
                <div
                  key={msg?._id}
                  className={`chat-message ${
                    isOwnMessage ? "own-message" : "other-message"
                  }`}
                >
                  {msg.replyToMessageId && (
                    <div className="message-reply-preview">
                      <FaReply style={{ fontSize: "10px" }} />
                      <span>
                        Reply to{" "}
                        {getUserName(
                          messageById(msg.replyToMessageId)?.senderId
                        )}
                        :{" "}
                      </span>
                      <span>
                        {messageById(msg.replyToMessageId)?.text ||
                          "Message unavailable"}
                      </span>
                    </div>
                  )}
                  <div className="message-header">
                    <span className="message-author">
                      {getUserName(msg?.senderId)}
                    </span>
                    <span className="message-time">
                      {formatTimestamp(msg?.createdAt)}
                    </span>
                  </div>
                  <div className="message-bubble">
                    {msg?.text}
                    <div className="message-actions">
                      {!isOwnMessage && (
                        <button
                          onClick={() => handleReply(msg._id)}
                          className="message-action-btn"
                          title="Reply"
                        >
                          <FaReply />
                        </button>
                      )}
                      {isOwnMessage && (
                        <button
                          onClick={() => handleDeleteMessage(msg._id)}
                          className="message-action-btn"
                          title="Delete"
                        >
                          <FaTrash />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {replyTo && (
        <div className="chat-reply-bar">
          <div className="reply-info">
            <FaReply />
            <span>
              Replying to <strong>{getUserName(replyTo.senderId)}</strong>:{" "}
              {replyTo.text}
            </span>
          </div>
          <button onClick={cancelReply} className="reply-cancel-btn">
            <FaTimes />
          </button>
        </div>
      )}

      <div className="chat-input-area">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          className="chat-input"
          placeholder="Type a message..."
          disabled={isSending}
        />
        <button
          onClick={handleSend}
          className="chat-send-btn"
          disabled={!newMessage.trim() || isSending}
        >
          {isSending ? (
            <>
              <span>Sending</span>
            </>
          ) : (
            <>
              <FaPaperPlane size={20} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
