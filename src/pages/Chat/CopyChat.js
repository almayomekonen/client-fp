import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import CopyChat from '../../components/CopyChat';

export default function CopyChatPage() {
  const { copyId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useData();

  useEffect(() => {
    if (!currentUser) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">צ'אט להעתק</h2>
      <CopyChat copyId={copyId} />
    </div>
  );
}
