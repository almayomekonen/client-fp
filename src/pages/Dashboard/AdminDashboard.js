import React, { useState, useEffect } from "react";
import { useExperiment } from "../../context/ExperimentContext";
import { useGroup } from "../../context/GroupContext";
import { useStatement } from "../../context/StatementContext";
import { useCopy } from "../../context/CopyContext";
import { useData } from "../../context/DataContext";
import { useNavigate } from "react-router-dom";
import { useCopyMessage } from "../../context/CopyMessageContext";
import {
  FaMicroscope,
  FaChevronRight,
  FaFolderOpen,
  FaFileAlt,
  FaBalanceScale,
  FaChartLine,
  FaComments,
  FaEnvelope,
} from "react-icons/fa";
import "./AdminDashboard.css";

export default function AdminHomePage() {
  const { users, currentUser, isAuthChecked } = useData();
  const { fetchExperiments, investigatorNameByExperimentId } = useExperiment();
  const { groupsByExperimentId } = useGroup();
  const { statementsByGroupId } = useStatement();
  const { copiesByStatementId } = useCopy();
  const { getUnreadCount } = useCopyMessage();

  const [experiments, setExperiments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [statements, setStatements] = useState([]); // New state for statements
  const [expandedExperimentId, setExpandedExperimentId] = useState(null);
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [expandedStatementId, setExpandedStatementId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthChecked && !currentUser) {
      navigate("/", { replace: true });
    }
  }, [currentUser, isAuthChecked, navigate]);

  useEffect(() => {
    const loadExperiments = async () => {
      if (!isAuthChecked || !currentUser) {
        return;
      }

      try {
        const data = await fetchExperiments();
        const dataWithInvestigatorNames = await Promise.all(
          data.map(async (exp) => {
            try {
              const name = await investigatorNameByExperimentId(exp._id);
              return { ...exp, investigatorName: name || "Unknown" };
            } catch (nameErr) {
              console.warn(
                `Could not get investigator name for experiment ${exp._id}`
              );
              return { ...exp, investigatorName: "Unknown" };
            }
          })
        );
        setExperiments(dataWithInvestigatorNames);
      } catch (err) {
        console.error("❌ Error loading experiments:", err);
        alert(
          `❌ Error loading experiments: ${err.message || "Unknown error"}`
        );
      }
    };
    loadExperiments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthChecked, currentUser]);

  // If still checking authentication, show loading
  if (!isAuthChecked) {
    return (
      <div className="loading-container">
        <div>Loading</div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!currentUser) return null;

  // Open/close experiment
  const toggleExperiment = async (id) => {
    if (expandedExperimentId === id) {
      setExpandedExperimentId(null);
      setGroups([]);
      return;
    }

    setExpandedExperimentId(id);
    try {
      const loadedGroups = await groupsByExperimentId(id);
      setGroups(loadedGroups);
    } catch {
      alert("❌ Error loading groups");
    }
  };

  // Open/close group → load statements from server
  const toggleGroup = async (id) => {
    if (expandedGroupId === id) {
      setExpandedGroupId(null);
      setStatements([]);
      return;
    }

    setExpandedGroupId(id);
    try {
      const loadedStatements = await statementsByGroupId(id);
      setStatements(loadedStatements);
    } catch {
      alert("❌ Error loading statements");
    }
  };

  const toggleStatement = (id) => {
    setExpandedStatementId(expandedStatementId === id ? null : id);
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          <FaMicroscope /> Experiment Management
        </h1>
        <p className="dashboard-subtitle">
          View and manage all experiments in the system
        </p>
      </div>

      {experiments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <p className="empty-state-text">No experiments in the system</p>
        </div>
      ) : (
        <ul className="experiments-list">
          {experiments.map((exp) => (
            <li key={exp._id} className="experiment-card">
              <div
                onClick={() => toggleExperiment(exp._id)}
                className="experiment-header"
              >
                <div className="experiment-info">
                  <div className="experiment-name">{exp.name}</div>
                  <div className="experiment-investigator">
                    Researcher: {exp.investigatorName || "Unknown"}
                  </div>
                </div>
                <div
                  className={`expand-icon ${
                    expandedExperimentId === exp._id ? "expanded" : ""
                  }`}
                >
                  <FaChevronRight />
                </div>
              </div>

              {expandedExperimentId === exp._id && (
                <div className="groups-container">
                  {groups.map((group) => (
                    <div key={group._id} className="group-item">
                      <div
                        onClick={() => toggleGroup(group._id)}
                        className="group-header"
                      >
                        <FaFolderOpen /> {group.name}
                      </div>

                      {expandedGroupId === group._id && (
                        <div className="statements-container">
                          {statements.map((statement) => (
                            <div key={statement._id} className="statement-item">
                              <div className="statement-header">
                                <div
                                  onClick={() => toggleStatement(statement._id)}
                                  className="statement-name"
                                >
                                  <FaFileAlt
                                    style={{
                                      display: "inline",
                                      marginLeft: "8px",
                                    }}
                                  />
                                  {statement.name}
                                </div>
                                <div className="statement-actions">
                                  {copiesByStatementId(statement._id).filter(
                                    (copy) => copy.status === "completed"
                                  ).length >= 2 && (
                                    <button
                                      onClick={() =>
                                        navigate(`/compare/${statement._id}`)
                                      }
                                      className="btn-dashboard btn-compare"
                                    >
                                      <FaBalanceScale /> Compare Codings
                                    </button>
                                  )}
                                  <button
                                    onClick={() =>
                                      navigate(
                                        `/statement-summary/${statement._id}`
                                      )
                                    }
                                    className="btn-dashboard btn-summary"
                                  >
                                    <FaChartLine /> Statement Summary
                                  </button>
                                </div>
                              </div>

                              {expandedStatementId === statement._id && (
                                <div className="copies-container">
                                  {copiesByStatementId(statement._id).map(
                                    (copy) => (
                                      <div key={copy._id} className="copy-item">
                                        <div
                                          onClick={() => {
                                            if (copy.status === "completed") {
                                              navigate(
                                                `/view-statement/${copy._id}`
                                              );
                                            } else {
                                              alert(
                                                "Cannot view statement before coding is completed"
                                              );
                                            }
                                          }}
                                          className={`copy-name ${
                                            copy.status === "completed"
                                              ? "completed"
                                              : "incomplete"
                                          }`}
                                        >
                                          {users.find(
                                            (user) => user._id === copy.coderId
                                          )?.username || "Unknown"}
                                        </div>

                                        <div className="copy-actions">
                                          <button
                                            onClick={() =>
                                              navigate(`/copy-chat/${copy._id}`)
                                            }
                                            className="btn-dashboard btn-chat"
                                          >
                                            <FaComments /> Chat
                                          </button>

                                          {getUnreadCount(
                                            copy._id,
                                            currentUser?._id
                                          ) > 0 && (
                                            <span className="unread-badge">
                                              <FaEnvelope
                                                style={{
                                                  display: "inline",
                                                  marginLeft: "4px",
                                                }}
                                              />
                                              {getUnreadCount(
                                                copy._id,
                                                currentUser?._id
                                              )}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
