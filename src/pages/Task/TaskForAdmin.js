import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../../context/DataContext";
import { useTask } from "../../context/TaskContext";
import { useStatement } from "../../context/StatementContext";
import { useCopy } from "../../context/CopyContext";
import { useExperiment } from "../../context/ExperimentContext";
import { useTaskMessage } from "../../context/TaskMessageContext";

export default function TaskManagementPage() {
  const { users, tasks, currentUser, isAuthChecked } = useData();
  const { deleteTask, taskProgress, experimentPercent } = useTask();
  const { statementById } = useStatement();
  const { copiesByTaskId } = useCopy();
  const { experimentById } = useExperiment();
  const { getUnreadCount } = useTaskMessage();

  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [experimentNames, setExperimentNames] = useState({});
  const [statementsCache, setStatementsCache] = useState({});
  const [experimentPercentMap, setExperimentPercentMap] = useState({});

  // Use refs to track what we've already fetched
  const fetchedExperiments = useRef(new Set());
  const fetchedStatements = useRef(new Set());
  const fetchedPercents = useRef(new Set());

  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthChecked && !currentUser) navigate("/", { replace: true });
  }, [currentUser, isAuthChecked, navigate]);

  useEffect(() => {
    const fetchExperiments = async () => {
      const expNames = {};
      const promises = [];

      tasks.forEach((task) => {
        if (!fetchedExperiments.current.has(task.experimentId)) {
          fetchedExperiments.current.add(task.experimentId);
          promises.push(
            experimentById(task.experimentId).then((exp) => {
              if (exp)
                expNames[task.experimentId] = exp.name || "ניסוי לא נמצא";
            })
          );
        }
      });

      if (promises.length > 0) {
        await Promise.all(promises);
        setExperimentNames((prev) => ({ ...prev, ...expNames }));
      }
    };

    if (tasks.length > 0) {
      fetchExperiments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.length]);

  // --- טעינת הצהרות עבור כל המשימות ---
  useEffect(() => {
    const fetchStatementsForTasks = async () => {
      const newCache = {};
      const promises = [];

      tasks.forEach((task) => {
        const copies = copiesByTaskId(task._id);
        copies.forEach((copy) => {
          if (!fetchedStatements.current.has(copy.statementId)) {
            fetchedStatements.current.add(copy.statementId);
            promises.push(
              statementById(copy.statementId).then((stmt) => {
                if (stmt) newCache[copy.statementId] = stmt;
              })
            );
          }
        });
      });

      if (promises.length > 0) {
        await Promise.all(promises);
        setStatementsCache((prev) => ({ ...prev, ...newCache }));
      }
    };

    if (tasks.length > 0) {
      fetchStatementsForTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.length]);

  // --- חישוב אחוזי ניסוי אסינכרוניים ---
  useEffect(() => {
    const fetchPercents = async () => {
      const newMap = {};
      const promises = [];

      tasks.forEach((task) => {
        if (!fetchedPercents.current.has(task._id)) {
          fetchedPercents.current.add(task._id);
          promises.push(
            experimentPercent(task._id).then((percent) => {
              newMap[task._id] = percent;
            })
          );
        }
      });

      if (promises.length > 0) {
        await Promise.all(promises);
        setExperimentPercentMap((prev) => ({ ...prev, ...newMap }));
      }
    };

    if (tasks.length > 0) {
      fetchPercents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.length]);

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
      <h2 className="text-2xl font-bold mb-4">ניהול משימות</h2>
      {tasks.length === 0 && <p>אין משימות להצגה.</p>}
      <ul className="space-y-4">
        {tasks.map((task) => (
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
