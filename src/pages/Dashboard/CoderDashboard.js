import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCopy } from "../../context/CopyContext";
import { useStatement } from "../../context/StatementContext";
import { useData } from "../../context/DataContext";
import { useExperiment } from "../../context/ExperimentContext";
import { useCopyMessage } from "../../context/CopyMessageContext";
import { useComparison } from "../../context/ComparisonContext";
import {
  FaUserCircle,
  FaMicroscope,
  FaFileAlt,
  FaClock,
  FaEdit,
  FaCheckCircle,
  FaRedo,
  FaCodeBranch,
  FaChartLine,
  FaUser,
} from "react-icons/fa";
import "../../styles/Dashboard.css";

export default function CoderHomePage() {
  const navigate = useNavigate();
  const { currentUser, isAuthChecked, copies } = useData();
  const {
    copiesForExperimentByCoderId,
    calculateCompletionPercentage,
    getLastUpdateDate,
    updateCopyStatus,
  } = useCopy();
  const { removeAllComparisons, getComparisonsForCopy } = useComparison();
  const { statementById } = useStatement();
  const { experimentById, investigatorNameByExperimentId } = useExperiment();
  const { getUnreadCount } = useCopyMessage();

  const [comparisonsMap, setComparisonsMap] = useState({});
  const [experimentsMap, setExperimentsMap] = useState({});
  const [statementsMap, setStatementsMap] = useState({});

  const fetchedComparisons = useRef(new Set());
  const fetchedExperiments = useRef(new Set());
  const fetchedStatements = useRef(new Set());

  useEffect(() => {
    if (isAuthChecked && !currentUser) {
      navigate("/", { replace: true });
    }
  }, [currentUser, isAuthChecked, navigate]);

  useEffect(() => {
    const fetchComparisons = async () => {
      // Wait for auth check to complete
      if (!isAuthChecked || !currentUser || !copies || copies.length === 0)
        return;

      const coderCopies = copiesForExperimentByCoderId(currentUser._id).flatMap(
        (c) => c.copies
      );

      if (coderCopies.length === 0) return;

      const map = {};
      const promises = [];

      coderCopies.forEach((copy) => {
        if (!fetchedComparisons.current.has(copy._id)) {
          fetchedComparisons.current.add(copy._id);
          promises.push(
            getComparisonsForCopy(copy._id).then((comparisons) => {
              map[copy._id] = comparisons;
            })
          );
        }
      });

      if (promises.length > 0) {
        await Promise.all(promises);
        setComparisonsMap((prev) => ({ ...prev, ...map }));
      }
    };

    fetchComparisons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?._id, copies, isAuthChecked]);

  // Load experiment information
  useEffect(() => {
    const fetchExperimentsInfo = async () => {
      if (!isAuthChecked || !currentUser || !copies || copies.length === 0)
        return;

      const coderCopiesByExperiment = copiesForExperimentByCoderId(
        currentUser._id
      );

      if (coderCopiesByExperiment.length === 0) return;

      const map = {};
      const promises = [];

      coderCopiesByExperiment.forEach(({ experiment }) => {
        if (!experiment || fetchedExperiments.current.has(experiment._id))
          return;

        fetchedExperiments.current.add(experiment._id);
        promises.push(
          (async () => {
            try {
              const expData = await experimentById(experiment._id);
              const investigatorName = await investigatorNameByExperimentId(
                experiment._id
              );
              map[experiment._id] = {
                name: expData?.name || `Experiment ${experiment._id}`,
                investigatorName: investigatorName || "Unknown",
              };
            } catch (err) {
              console.warn(`Could not load experiment ${experiment._id}:`, err);

              map[experiment._id] = {
                name: `Experiment ${experiment._id}`,
                investigatorName: "Unknown",
              };
            }
          })()
        );
      });

      if (promises.length > 0) {
        await Promise.all(promises);
        setExperimentsMap((prev) => ({ ...prev, ...map }));
      }
    };

    fetchExperimentsInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?._id, copies, isAuthChecked]);

  // Load statements asynchronously
  useEffect(() => {
    const fetchStatements = async () => {
      // Wait for auth check to complete
      if (!isAuthChecked || !currentUser || !copies || copies.length === 0)
        return;

      const coderCopies = copiesForExperimentByCoderId(currentUser._id).flatMap(
        (c) => c.copies
      );

      if (coderCopies.length === 0) return;

      const map = {};
      const promises = [];

      coderCopies.forEach((copy) => {
        if (!fetchedStatements.current.has(copy.statementId)) {
          fetchedStatements.current.add(copy.statementId);
          promises.push(
            statementById(copy.statementId)
              .then((stmt) => {
                if (stmt) map[copy.statementId] = stmt;
              })
              .catch((err) => {
                console.warn(
                  `Failed to load statement ${copy.statementId}:`,
                  err
                );
                map[copy.statementId] = {
                  name: "Statement deleted",
                  _id: copy.statementId,
                };
              })
          );
        }
      });

      if (promises.length > 0) {
        await Promise.all(promises);
        setStatementsMap((prev) => ({ ...prev, ...map }));
      }
    };

    fetchStatements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?._id, copies, isAuthChecked]);

  // If still checking authentication, show loading
  if (!isAuthChecked) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div>Loading your dashboard...</div>
      </div>
    );
  }

  if (!currentUser) return null;

  const coderCopiesByExperiment = copiesForExperimentByCoderId(
    currentUser?._id
  );

  const handleUpdateCopyStatus = async (copyId, copyStatus) => {
    await removeAllComparisons(copyId);
    await updateCopyStatus(copyId, copyStatus);
    setComparisonsMap((prev) => ({ ...prev, [copyId]: [] }));
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          <FaUserCircle />
          Codings of {currentUser?.username}
        </h1>
        <p className="dashboard-subtitle">
          <FaMicroscope style={{ marginRight: "8px" }} />
          Your Coding Assignments
        </p>
      </div>

      {/* Content */}
      {coderCopiesByExperiment.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">
            No experiments assigned to you yet.
          </div>
        </div>
      ) : (
        coderCopiesByExperiment.map(({ experiment, copies }) => {
          const expInfo = experimentsMap[experiment._id] || {};
          const experimentName = expInfo.name || "Loading...";
          const investigatorName = expInfo.investigatorName || "Unknown";
          const completion = calculateCompletionPercentage(copies);
          const lastUpdate = getLastUpdateDate(copies);

          return (
            <div key={experiment._id} className="dashboard-card">
              {/* Experiment Header */}
              <div className="card-header">
                <h2 className="card-title">
                  <FaMicroscope />
                  {experimentName}
                </h2>
                <div
                  style={{ display: "flex", gap: "12px", alignItems: "center" }}
                >
                  <span className="dashboard-badge badge-info">
                    <FaUser /> {investigatorName}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="progress-bar-container">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${completion}%` }}
                >
                  {completion > 10 && `${completion}%`}
                </div>
              </div>

              {/* Last Update */}
              <div
                style={{
                  marginBottom: "20px",
                  color: "#666",
                  fontSize: "14px",
                }}
              >
                <FaClock style={{ marginRight: "8px" }} />
                Last Update: {lastUpdate || "—"}
              </div>

              {/* Copies List */}
              <ul className="dashboard-list">
                {copies.map((copy) => {
                  const statement = statementsMap[copy.statementId];
                  const unreadCount = getUnreadCount(
                    copy._id,
                    currentUser?._id
                  );
                  const comparisonsForThisCopy = comparisonsMap[copy._id] || [];
                  const isCompleted = copy.status === "completed";
                  const isInProgress = copy.status === "in progress";

                  return (
                    <li key={copy._id} className="list-item">
                      {/* Copy Info */}
                      <div className="list-item-header">
                        <div>
                          <div className="list-item-title">
                            <FaFileAlt />
                            {statement?.name || "Loading..."}
                          </div>
                          <div className="list-item-meta">
                            <span
                              className={`dashboard-badge ${
                                isCompleted
                                  ? "badge-success"
                                  : isInProgress
                                  ? "badge-warning"
                                  : "badge-info"
                              }`}
                              style={{ marginRight: "10px" }}
                            >
                              {isCompleted ? (
                                <>
                                  <FaCheckCircle /> Completed
                                </>
                              ) : isInProgress ? (
                                <>
                                  <FaClock /> In Progress
                                </>
                              ) : (
                                copy.status
                              )}
                            </span>
                            <FaClock style={{ marginRight: "6px" }} />
                            {copy.lastUpdate
                              ? new Date(copy.lastUpdate).toLocaleString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )
                              : "—"}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div
                        className="list-item-actions"
                        style={{ marginTop: "12px" }}
                      >
                        {isInProgress && (
                          <>
                            <button
                              onClick={() =>
                                navigate(`/edit-statement/${copy._id}`)
                              }
                              className="dashboard-btn btn-primary btn-sm"
                            >
                              <FaEdit /> Edit Coding
                            </button>

                            {unreadCount > 0 && (
                              <span
                                style={{
                                  color: "#dc3545",
                                  fontSize: "14px",
                                  fontWeight: "600",
                                }}
                              >
                                ({unreadCount} unread messages)
                              </span>
                            )}
                          </>
                        )}

                        {isCompleted && (
                          <>
                            <button
                              onClick={async () => {
                                if (
                                  window.confirm(
                                    "Mark this coding as incomplete? You'll be able to edit it again."
                                  )
                                ) {
                                  await handleUpdateCopyStatus(
                                    copy._id,
                                    "in progress"
                                  );
                                }
                              }}
                              className="dashboard-btn btn-secondary btn-sm"
                            >
                              <FaRedo /> Reopen for Editing
                            </button>

                            {unreadCount > 0 && (
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  color: "#dc3545",
                                  fontWeight: "600",
                                  fontSize: "14px",
                                }}
                              >
                                <span>💬 {unreadCount} unread messages</span>
                              </div>
                            )}

                            {comparisonsForThisCopy.length > 0 && (
                              <button
                                onClick={() =>
                                  navigate(`/coder-compare/${copy._id}`)
                                }
                                className="dashboard-btn btn-success btn-sm"
                              >
                                <FaCodeBranch /> Compare Copies
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
}
