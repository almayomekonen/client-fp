import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../../context/DataContext";
import { useCopy } from "../../context/CopyContext";
import { useTask } from "../../context/TaskContext";
import { useStatement } from "../../context/StatementContext";
import { useExperiment } from "../../context/ExperimentContext";
import { useTaskMessage } from "../../context/TaskMessageContext";

export default function TaskForCoder() {
  const { users, currentUser, isAuthChecked } = useData();
  const { tasksByCoderId, taskProgress, experimentPercent } = useTask();
  const { statementById } = useStatement();
  const { copiesByTaskId } = useCopy();
  const { experimentById } = useExperiment();
  const { getUnreadCount } = useTaskMessage();

  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [experimentNames, setExperimentNames] = useState({});
  const [statementsCache, setStatementsCache] = useState({});
  const [experimentPercentMap, setExperimentPercentMap] = useState({}); // Experiment percentages

  // Use refs to track what we've already fetched
  const fetchedStatements = useRef(new Set());
  const fetchedExperiments = useRef(new Set());
  const fetchedPercents = useRef(new Set());

  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthChecked && !currentUser) navigate("/", { replace: true });
  }, [currentUser, isAuthChecked, navigate]);

  const researcherTasks = useMemo(
    () => tasksByCoderId(currentUser?._id),
    [tasksByCoderId, currentUser?._id]
  );

  const getInvestigatorName = (investigatorId) =>
    users.find((u) => u._id === investigatorId)?.username || "User not found";

  useEffect(() => {
    const fetchStatementsForTasks = async () => {
      const newCache = {};
      const promises = [];

      researcherTasks.forEach((task) => {
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

    if (currentUser && researcherTasks.length > 0) {
      fetchStatementsForTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [researcherTasks.length, currentUser?._id]);

  useEffect(() => {
    const fetchExperiments = async () => {
      const names = {};
      const promises = [];

      researcherTasks.forEach((task) => {
        if (!fetchedExperiments.current.has(task.experimentId)) {
          fetchedExperiments.current.add(task.experimentId);
          promises.push(
            experimentById(task.experimentId).then((exp) => {
              if (exp)
                names[task.experimentId] = exp.name || "Experiment not found";
            })
          );
        }
      });

      if (promises.length > 0) {
        await Promise.all(promises);
        setExperimentNames((prev) => ({ ...prev, ...names }));
      }
    };

    if (researcherTasks.length > 0) {
      fetchExperiments();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [researcherTasks.length]);

  useEffect(() => {
    const fetchExperimentPercents = async () => {
      const newMap = {};
      const promises = [];

      researcherTasks.forEach((task) => {
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

    if (researcherTasks.length > 0) {
      fetchExperimentPercents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [researcherTasks.length]);

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
        <div>Loading...</div>
      </div>
    );
  }

  if (!currentUser) return null;

  const renderCopies = (taskId) => {
    const taskCopies = copiesByTaskId(taskId);
    return (
      <ul className="ml-6 mt-2 list-disc">
        {taskCopies.map((copy) => (
          <li key={copy._id}>
            Statement {statementsCache[copy.statementId]?.name || "Loading..."}{" "}
            - Status: {copy.status}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">My Tasks</h2>
      {researcherTasks.length === 0 && <p>You don't have any tasks yet.</p>}
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
                  <strong>Experiment:</strong>{" "}
                  {experimentNames[task.experimentId] || "Loading..."}
                </p>
                <p>
                  <strong>Researcher:</strong>{" "}
                  {getInvestigatorName(task.investigatorId)}
                </p>
                <p>
                  <strong>Experiment Completion:</strong>{" "}
                  {experimentPercentMap[task._id] ?? 0}%
                </p>
                <p>
                  <strong>Progress:</strong> {taskProgress(task._id)}%
                </p>
                <p>
                  <strong>Unread Messages:</strong>{" "}
                  {getUnreadCount(task._id, currentUser._id)}
                </p>
              </div>
            </div>
            {selectedTaskId === task._id && (
              <>
                {renderCopies(task._id)}
                <button
                  onClick={() => navigate(`/task-chat/${task._id}`)}
                  className="text-blue-600 underline text-sm ml-4"
                >
                  Go to Chat
                </button>
                <button
                  onClick={() => navigate(`/task-summary/${task._id}`)}
                  className="text-green-600 underline text-sm"
                >
                  Task Summary
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
