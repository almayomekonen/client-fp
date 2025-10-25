import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useData } from "../../context/DataContext";
import { useTask } from "../../context/TaskContext";
import { useStatement } from "../../context/StatementContext";
import { useCopy } from "../../context/CopyContext";
import { useExperiment } from "../../context/ExperimentContext";
import { useTaskMessage } from "../../context/TaskMessageContext";
import {
  FaTasks,
  FaMicroscope,
  FaUser,
  FaChartLine,
  FaComments,
  FaTrash,
  FaFileAlt,
  FaCheckCircle,
  FaClock,
  FaEnvelope,
  FaChevronDown,
  FaChevronRight,
} from "react-icons/fa";
import "./TaskManagement.css";

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
                expNames[task.experimentId] =
                  exp.name || "Experiment not found";
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

  // --- Load statements for all tasks ---
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

  // --- Calculate experiment percentages asynchronously ---
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
      <div className="task-loading">
        <div className="task-loading-spinner"></div>
        <div className="task-loading-text">Loading...</div>
      </div>
    );
  }

  if (!currentUser) return null;

  const getCoderName = (coderId) =>
    users.find((u) => u._id === coderId)?.username || "User not found";

  const handleDeleteTask = async (taskId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this task? This action cannot be undone."
      )
    ) {
      return;
    }
    await deleteTask(taskId);
  };

  const renderCopies = (taskId) => {
    const taskCopies = copiesByTaskId(taskId);
    return (
      <ul className="task-copies-list">
        {taskCopies.map((copy) => (
          <li key={copy._id} className="task-copy-item">
            <div className="task-copy-info">
              <div className="task-copy-icon">
                <FaFileAlt />
              </div>
              <div>
                <div className="task-copy-name">
                  {statementsCache[copy.statementId]?.name || "Loading..."}
                </div>
              </div>
            </div>
            <span
              className={`task-copy-status ${
                copy.status === "completed"
                  ? "status-completed"
                  : copy.status === "in-progress"
                  ? "status-in-progress"
                  : "status-pending"
              }`}
            >
              {copy.status === "completed" && <FaCheckCircle />}
              {copy.status === "in-progress" && <FaClock />}
              {copy.status}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="task-management-container">
      <div className="task-header">
        <h1 className="task-title">
          <FaTasks /> Task Management
        </h1>
        <p className="task-subtitle">View and manage all tasks in the system</p>
      </div>

      {tasks.length === 0 ? (
        <div className="task-empty-state">
          <div className="task-empty-icon">📋</div>
          <p className="task-empty-text">No tasks to display</p>
          <p className="task-empty-subtext">
            Tasks will appear here once they are created
          </p>
        </div>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => {
            const progress = taskProgress(task._id);
            const unreadCount = getUnreadCount(task._id, currentUser._id);
            const isExpanded = selectedTaskId === task._id;

            return (
              <li key={task._id} className="task-card">
                <div className="task-card-header">
                  <div
                    className="task-info"
                    onClick={() =>
                      setSelectedTaskId(isExpanded ? null : task._id)
                    }
                  >
                    <div className="task-experiment">
                      {isExpanded ? <FaChevronDown /> : <FaChevronRight />}
                      <FaMicroscope />
                      {experimentNames[task.experimentId] || "Loading..."}
                    </div>

                    <div className="task-meta">
                      <div className="task-meta-item">
                        <FaUser />
                        <strong>Coder:</strong> {getCoderName(task.coderId)}
                      </div>
                      <div className="task-meta-item">
                        <FaChartLine />
                        <strong>Experiment %:</strong>{" "}
                        {experimentPercentMap[task._id] ?? 0}%
                      </div>
                      {unreadCount > 0 && (
                        <div className="task-meta-item">
                          <FaEnvelope />
                          <span className="task-badge badge-unread">
                            {unreadCount} unread
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="task-progress">
                      <div className="progress-label">
                        Task Progress: {progress}%
                      </div>
                      <div className="progress-bar-container">
                        <div
                          className="progress-bar-fill"
                          style={{ width: `${progress}%` }}
                        >
                          {progress > 0 && `${progress}%`}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="task-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTask(task._id);
                      }}
                      className="task-btn task-btn-delete"
                    >
                      <FaTrash /> Delete
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="task-details">
                    {renderCopies(task._id)}
                    <div className="task-details-actions">
                      <button
                        onClick={() => navigate(`/task-chat/${task._id}`)}
                        className="task-btn task-btn-chat"
                      >
                        <FaComments /> Go to Chat
                      </button>
                      <button
                        onClick={() => navigate(`/task-summary/${task._id}`)}
                        className="task-btn task-btn-summary"
                      >
                        <FaChartLine /> Task Summary
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
