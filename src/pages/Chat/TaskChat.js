import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import TaskChat from '../../components/TaskChat';

export default function TaskChatPage() {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useData();

  useEffect(() => {
    if (!currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">צ'אט למשימה</h2>
      <TaskChat taskId={taskId} />
    </div>
  );
}
