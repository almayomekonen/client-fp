import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useData } from "../../context/DataContext";
import { FaComments, FaArrowRight } from "react-icons/fa";
import CopyChat from "../../components/CopyChat";
import "../../styles/Chat.css";

export default function CopyChatPage() {
  const { copyId } = useParams();
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
          <FaComments /> Copy Chat
        </h1>
        <p className="chat-page-subtitle">Conversation about the copy</p>
      </div>

      <div className="chat-wrapper">
        <CopyChat copyId={copyId} />
      </div>
    </div>
  );
}
