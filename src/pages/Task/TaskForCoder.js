import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../../context/DataContext";
import { useCopy } from "../../context/CopyContext";
import { useTask } from "../../context/TaskContext";
import { useStatement } from "../../context/StatementContext";
import { useExperiment } from "../../context/ExperimentContext";
import { useTaskMessage } from "../../context/TaskMessageContext";
import {
  FaTasks,
  FaMicroscope,
  FaUser,
  FaChartLine,
  FaComments,
  FaFileAlt,
  FaCheckCircle,
  FaClock,
  FaEnvelope,
  FaChevronDown,
  FaChevronRight,
} from "react-icons/fa";
import "./TaskManagement.css";

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
      <div className="task-loading">
        <div className="task-loading-spinner"></div>
        <div className="task-loading-text">Loading...</div>
      </div>
    );
  }

  if (!currentUser) return null;

  const renderCopies = (taskId) => {
    const taskCopies = copiesByTaskId(taskId);
    return (
      <ul className="task-copies-list">
        {taskCopies.map((copy) => {
          const statement = statementsCache[copy.statementId];
          const isCompleted = copy.status === "completed";

          return (
            <li key={copy._id} className="task-copy-item">
              <div className="task-copy-info">
                <FaFileAlt className="task-copy-icon" />
                <span className="task-copy-name">
                  {statement?.name || "Loading..."}
                </span>
              </div>
              <span
                className={`task-copy-status ${
                  isCompleted ? "status-completed" : "status-in-progress"
                }`}
              >
                {isCompleted ? (
                  <>
                    <FaCheckCircle /> Completed
                  </>
                ) : (
                  <>
                    <FaClock /> In Progress
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="task-management-container">
      {/* Header */}
      <div className="task-header">
        <h1 className="task-title">
          <FaTasks />
          Tasks of '{currentUser?.username}'
        </h1>
        <p className="task-subtitle">
          <FaUser style={{ marginRight: "8px" }} />
          Your assigned coding tasks
        </p>
      </div>

      {/* Empty State */}
      {researcherTasks.length === 0 && (
        <div className="task-empty-state">
          📋 You don't have any tasks assigned yet.
        </div>
      )}

      {/* Tasks List */}
      <div className="task-list">
        {researcherTasks.map((task) => {
          const isExpanded = selectedTaskId === task._id;
          const progress = taskProgress(task._id);
          const expPercent = experimentPercentMap[task._id] ?? 0;
          const unreadCount = getUnreadCount(task._id, currentUser._id);

          return (
            <div key={task._id} className="task-card">
              {/* Task Header */}
              <div
                className="task-card-header"
                onClick={() => setSelectedTaskId(isExpanded ? null : task._id)}
              >
                <div className="task-info">
                  <div className="task-experiment">
                    {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                    <FaMicroscope />
                    {experimentNames[task.experimentId] || "Loading..."}
                  </div>
                  <div className="task-meta">
                    <span className="task-meta-item">
                      <FaUser />
                      Researcher: {getInvestigatorName(task.investigatorId)}
                    </span>
                    <span className="task-meta-item">
                      <FaChartLine />
                      Experiment Completion: {expPercent}%
                    </span>
                    {unreadCount > 0 && (
                      <span className="task-meta-item">
                        <FaEnvelope />
                        <span className="task-badge badge-unread">
                          {unreadCount} unread
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                <div
                  className="task-header-actions"
                  style={{ display: "flex", gap: "10px", alignItems: "center" }}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/task-chat/${task._id}`);
                    }}
                    className="task-btn task-btn-chat"
                    style={{ fontSize: "12px", padding: "8px 16px" }}
                  >
                    <FaComments /> Chat
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/task-summary/${task._id}`);
                    }}
                    className="task-btn task-btn-summary"
                    style={{ fontSize: "12px", padding: "8px 16px" }}
                  >
                    <FaChartLine /> Summary
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="task-progress">
                <div className="progress-label">Task Progress: {progress}%</div>
                <div className="progress-bar-container">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${progress}%` }}
                  >
                    {progress > 0 && `${progress}%`}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="task-details">
                  {/* Copies List */}
                  {renderCopies(task._id)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
