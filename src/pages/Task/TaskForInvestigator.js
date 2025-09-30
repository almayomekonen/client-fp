import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useData } from "../../context/DataContext";
import { useCopy } from "../../context/CopyContext";
import { useTask } from "../../context/TaskContext";
import { useStatement } from "../../context/StatementContext";
import { useExperiment } from "../../context/ExperimentContext";
import { useTaskMessage } from "../../context/TaskMessageContext";

export default function TaskForInvestigator() {
  const { users, currentUser, isAuthChecked } = useData();
  const { experimentPercent, tasksByInvestigatorId, deleteTask, taskProgress } =
    useTask();
  const { statementById } = useStatement();
  const { copiesByTaskId } = useCopy();
  const { experimentById } = useExperiment();
  const { getUnreadCount } = useTaskMessage();

  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [experimentNames, setExperimentNames] = useState({});
  const [statementsCache, setStatementsCache] = useState({});
  const [experimentPercentMap, setExperimentPercentMap] = useState({});

  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthChecked && !currentUser) navigate("/", { replace: true });
  }, [currentUser, isAuthChecked, navigate]);

  const researcherTasks = useMemo(
    () => tasksByInvestigatorId(currentUser?._id),
    [tasksByInvestigatorId, currentUser?._id]
  );

  useEffect(() => {
    const fetchExperiments = async () => {
      const names = {};
      for (const task of researcherTasks) {
        if (!experimentNames[task.experimentId]) {
          const exp = await experimentById(task.experimentId);
          names[task.experimentId] = exp?.name || "ניסוי לא נמצא";
        }
      }
      if (Object.keys(names).length > 0) {
        setExperimentNames((prev) => ({ ...prev, ...names }));
      }
    };
    if (researcherTasks.length > 0) fetchExperiments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [researcherTasks, experimentById]);

  useEffect(() => {
    const fetchStatementsForTasks = async () => {
      const newCache = { ...statementsCache };
      for (const task of researcherTasks) {
        const copies = copiesByTaskId(task._id);
        for (const copy of copies) {
          if (!newCache[copy.statementId]) {
            const stmt = await statementById(copy.statementId);
            if (stmt) newCache[copy.statementId] = stmt;
          }
        }
      }
      setStatementsCache(newCache);
    };
    if (researcherTasks.length > 0) fetchStatementsForTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [researcherTasks, copiesByTaskId, statementById]);

  useEffect(() => {
    const fetchPercents = async () => {
      const newMap = {};
      for (const task of researcherTasks) {
        const percent = await experimentPercent(task._id);
        newMap[task._id] = percent;
      }
      setExperimentPercentMap(newMap);
    };
    if (researcherTasks.length > 0) fetchPercents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [researcherTasks, experimentPercent]);

  if (!isAuthChecked) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <div>טוען...</div>
      </div>
    );
  }

  if (!currentUser) return null;

  const getCoderName = (coderId) =>
    users.find((u) => u._id === coderId)?.username || "משתמש לא נמצא";

  const handleDeleteTask = async (taskId) => {
    await deleteTask(taskId);
  };

  const renderCopies = (taskId) => {
    const taskCopies = copiesByTaskId(taskId);
    return (
      <ul className="ml-6 mt-2 list-disc">
        {taskCopies.map((copy) => (
          <li key={copy._id}>
            הצהרה {statementsCache[copy.statementId]?.name || "טוען..."} -
            סטטוס: {copy.status}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">המשימות שיצרתי</h2>
      {researcherTasks.length === 0 && <p>לא יצרת משימות עדיין.</p>}
      <ul className="space-y-4">
        {researcherTasks.map((task) => (
          <li
            key={task._id}
            className="border rounded-xl p-4 shadow-md bg-white"
          >
            <div className="flex justify-between items-center">
              <div
                className="cursor-pointer"
                onClick={() =>
                  setSelectedTaskId(
                    selectedTaskId === task._id ? null : task._id
                  )
                }
              >
                <p>
                  <strong>ניסוי:</strong>{" "}
                  {experimentNames[task.experimentId] || "טוען..."}
                </p>
                <p>
                  <strong>מקודד:</strong> {getCoderName(task.coderId)}
                </p>
                <p>
                  <strong>אחוז מהניסוי:</strong>{" "}
                  {experimentPercentMap[task._id] ?? 0}%
                </p>
                <p>
                  <strong>התקדמות:</strong> {taskProgress(task._id)}%
                </p>
                <p>
                  <strong>הודעות שלא נקראו:</strong>{" "}
                  {getUnreadCount(task._id, currentUser._id)}
                </p>
              </div>
              <button
                onClick={() => handleDeleteTask(task._id)}
                className="text-red-600 underline text-sm ml-4"
              >
                מחק משימה
              </button>
            </div>
            {selectedTaskId === task._id && (
              <>
                {renderCopies(task._id)}
                <button
                  onClick={() => navigate(`/task-chat/${task._id}`)}
                  className="text-blue-600 underline text-sm ml-4"
                >
                  עבור לצ'אט
                </button>
                <button
                  onClick={() => navigate(`/task-summary/${task._id}`)}
                  className="text-green-600 underline text-sm"
                >
                  סיכום משימה
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
