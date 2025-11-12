import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  FaTrash,
} from "react-icons/fa";

import { useData } from "../../context/DataContext";
import { useCopy } from "../../context/CopyContext";
import { useTask } from "../../context/TaskContext";
import { useStatement } from "../../context/StatementContext";
import { useExperiment } from "../../context/ExperimentContext";
import { useTaskMessage } from "../../context/TaskMessageContext";
import "../../styles/Dashboard.css";
import "./TaskManagement.css";

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

  // Use refs to track what we've already fetched
  const fetchedStatements = useRef(new Set());
  const fetchedExperiments = useRef(new Set());
  const fetchedPercents = useRef(new Set());

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

    if (researcherTasks.length > 0) {
      fetchStatementsForTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [researcherTasks.length]);

  useEffect(() => {
    const fetchPercents = async () => {
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
      fetchPercents();
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

  const getCoderName = (coderId) =>
    users.find((u) => u._id === coderId)?.username || "User not found";

  const handleDeleteTask = async (taskId) => {
    await deleteTask(taskId);
  };

  const renderCopies = (taskId) => {
    const taskCopies = copiesByTaskId(taskId);
    return (
      <div
        style={{
          marginTop: "16px",
          paddingTop: "16px",
          borderTop: "1px solid #e0e0e0",
        }}
      >
        <h4
          style={{
            fontSize: "0.95rem",
            fontWeight: 600,
            marginBottom: "12px",
            color: "#555",
          }}
        >
          <FaFileAlt style={{ marginRight: "8px" }} />
          Copies in this Task:
        </h4>
        <ul className="dashboard-list" style={{ marginLeft: 0 }}>
          {taskCopies.map((copy) => (
            <li
              key={copy._id}
              className="list-item"
              style={{ fontSize: "0.9rem" }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>
                  <strong>
                    {statementsCache[copy.statementId]?.name || "Loading..."}
                  </strong>
                </span>
                <span
                  style={{
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    backgroundColor:
                      copy.status === "completed"
                        ? "#4caf50"
                        : copy.status === "in_progress"
                        ? "#ff9800"
                        : "#9e9e9e",
                    color: "white",
                  }}
                >
                  {copy.status === "completed" ? (
                    <>
                      <FaCheckCircle /> Completed
                    </>
                  ) : copy.status === "in_progress" ? (
                    <>
                      <FaClock /> In Progress
                    </>
                  ) : (
                    "Not Started"
                  )}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          <FaTasks /> Tasks I Created
        </h1>
        <p className="dashboard-subtitle">
          Manage and track all tasks you've assigned to coders
        </p>
      </div>

      {researcherTasks.length === 0 ? (
        <div
          className="dashboard-card"
          style={{ textAlign: "center", padding: "60px 20px" }}
        >
          <FaTasks
            style={{ fontSize: "64px", color: "#ddd", marginBottom: "20px" }}
          />
          <h3 style={{ color: "#666", fontSize: "1.2rem", fontWeight: 500 }}>
            No Tasks Created Yet
          </h3>
          <p style={{ color: "#999", marginTop: "8px" }}>
            You haven't created any tasks yet. Start by creating your first
            task!
          </p>
        </div>
      ) : (
        <ul className="dashboard-list">
          {researcherTasks.map((task) => {
            const isExpanded = selectedTaskId === task._id;
            const unreadCount = getUnreadCount(task._id, currentUser._id);
            const progress = taskProgress(task._id);

            return (
              <li key={task._id} className="list-item task-card">
                <div
                  className="task-header"
                  onClick={() =>
                    setSelectedTaskId(isExpanded ? null : task._id)
                  }
                  style={{ cursor: "pointer" }}
                >
                  <div className="task-main-info">
                    <div className="task-expand-icon">
                      {isExpanded ? (
                        <FaChevronDown
                          style={{ fontSize: "0.9rem", color: "#2196F3" }}
                        />
                      ) : (
                        <FaChevronRight
                          style={{ fontSize: "0.9rem", color: "#999" }}
                        />
                      )}
                    </div>
                    <div className="task-details">
                      <div className="task-row">
                        <FaMicroscope style={{ color: "#2196F3" }} />
                        <span className="task-label">Experiment:</span>
                        <span className="task-value">
                          {experimentNames[task.experimentId] || "Loading..."}
                        </span>
                      </div>
                      <div className="task-row">
                        <FaUser style={{ color: "#ff9800" }} />
                        <span className="task-label">Coder:</span>
                        <span className="task-value">
                          {getCoderName(task.coderId)}
                        </span>
                      </div>
                      <div className="task-stats">
                        <div className="stat-badge">
                          <FaChartLine />
                          <span>
                            {experimentPercentMap[task._id] ?? 0}% of experiment
                          </span>
                        </div>
                        <div className="stat-badge">
                          <FaCheckCircle />
                          <span>{progress}% completed</span>
                        </div>
                        {unreadCount > 0 && (
                          <div className="stat-badge unread">
                            <FaEnvelope />
                            <span>{unreadCount} unread</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        window.confirm(
                          "Are you sure you want to delete this task? This action cannot be undone."
                        )
                      ) {
                        handleDeleteTask(task._id);
                      }
                    }}
                    className="delete-btn"
                    title="Delete Task"
                  >
                    <FaTrash /> Delete
                  </button>
                </div>

                {isExpanded && (
                  <div className="task-expanded-content">
                    {renderCopies(task._id)}
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        marginTop: "20px",
                        paddingTop: "16px",
                        borderTop: "1px solid #e0e0e0",
                      }}
                    >
                      <button
                        onClick={() => navigate(`/task-chat/${task._id}`)}
                        className="action-btn primary"
                      >
                        <FaComments /> Open Chat
                      </button>
                      <button
                        onClick={() => navigate(`/task-summary/${task._id}`)}
                        className="action-btn secondary"
                      >
                        <FaChartLine /> View Summary
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
