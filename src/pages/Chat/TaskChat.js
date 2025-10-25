import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useData } from "../../context/DataContext";
import { FaComments, FaArrowRight } from "react-icons/fa";
import TaskChat from "../../components/TaskChat";
import "../../styles/Chat.css";

export default function TaskChatPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useData();

  useEffect(() => {
    if (!currentUser) {
      navigate("/", { replace: true });
    }
  }, [currentUser, navigate]);

  return (
    <div className="chat-page-container">
      <button onClick={() => navigate(-1)} className="chat-back-btn">
        <FaArrowRight /> Back
      </button>

      <div className="chat-page-header">
        <h1 className="chat-page-title">
          <FaComments /> Task Chat
        </h1>
        <p className="chat-page-subtitle">Conversation about the task</p>
      </div>

      <div className="chat-wrapper">
        <TaskChat taskId={taskId} />
      </div>
    </div>
  );
}
