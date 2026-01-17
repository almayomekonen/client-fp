import React, { useState, useEffect, useMemo } from "react";
import { useExperiment } from "../../context/ExperimentContext";
import { useGroup } from "../../context/GroupContext";
import { useStatement } from "../../context/StatementContext";
import { useCopy } from "../../context/CopyContext";
import { useData } from "../../context/DataContext";
import { useNavigate } from "react-router-dom";
import { useCopyMessage } from "../../context/CopyMessageContext";
import {
  FaMicroscope,
  FaArrowLeft,
  FaFolderOpen,
  FaFileAlt,
  FaBalanceScale,
  FaChartLine,
  FaUsers,
  FaComment,
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
  const [statements, setStatements] = useState([]);

  // Navigation State
  const [currentView, setCurrentView] = useState("experiments");
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedStatement, setSelectedStatement] = useState(null);

  // Sorting States
  const [experimentSort, setExperimentSort] = useState("name");

  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthChecked && !currentUser) {
      navigate("/", { replace: true });
    }
  }, [currentUser, isAuthChecked, navigate]);

  // Load Experiments
  useEffect(() => {
    const loadExperiments = async () => {
      if (!isAuthChecked || !currentUser) return;

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
  }, [isAuthChecked, currentUser]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load Groups when Experiment Selected
  useEffect(() => {
    if (selectedExperiment) {
      const fetchGroups = async () => {
        try {
          const loadedGroups = await groupsByExperimentId(
            selectedExperiment._id
          );
          setGroups(loadedGroups);
        } catch {
          alert("❌ Error loading groups");
        }
      };
      fetchGroups();
    }
  }, [selectedExperiment, groupsByExperimentId]);

  // Load Statements when Group Selected
  useEffect(() => {
    if (selectedGroup) {
      const fetchStatements = async () => {
        try {
          const loadedStatements = await statementsByGroupId(selectedGroup._id);
          setStatements(loadedStatements);
        } catch {
          alert("❌ Error loading statements");
        }
      };
      fetchStatements();
    }
  }, [selectedGroup, statementsByGroupId]);

  // Sorted Experiments
  const sortedExperiments = useMemo(() => {
    return [...experiments].sort((a, b) => {
      if (experimentSort === "name") return a.name.localeCompare(b.name);
      if (experimentSort === "date") {
        return (
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime()
        );
      }
      return 0;
    });
  }, [experiments, experimentSort]);

  if (!isAuthChecked) {
    return (
      <div className="loading-container">
        <div>Loading</div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!currentUser) return null;

  // Breadcrumbs Navigation
  const renderBreadcrumbs = () => {
    const crumbs = [];
    crumbs.push(
      <span
        key="experiments"
        onClick={() => {
          setCurrentView("experiments");
          setSelectedExperiment(null);
          setSelectedGroup(null);
          setSelectedStatement(null);
        }}
        style={{
          cursor: currentView !== "experiments" ? "pointer" : "default",
          color: currentView !== "experiments" ? "#2196f3" : "#666",
          textDecoration:
            currentView !== "experiments" ? "underline" : "none",
        }}
      >
        Experiments
      </span>
    );

    if (selectedExperiment) {
      crumbs.push(" > ");
      crumbs.push(
        <span
          key="groups"
          onClick={() => {
            setCurrentView("groups");
            setSelectedGroup(null);
            setSelectedStatement(null);
          }}
          style={{
            cursor: currentView !== "groups" ? "pointer" : "default",
            color: currentView !== "groups" ? "#2196f3" : "#666",
            textDecoration: currentView !== "groups" ? "underline" : "none",
          }}
        >
          {selectedExperiment.name}
        </span>
      );
    }

    if (selectedGroup) {
      crumbs.push(" > ");
      crumbs.push(
        <span
          key="statements"
          onClick={() => {
            setCurrentView("statements");
            setSelectedStatement(null);
          }}
          style={{
            cursor: currentView !== "statements" ? "pointer" : "default",
            color: currentView !== "statements" ? "#2196f3" : "#666",
            textDecoration:
              currentView !== "statements" ? "underline" : "none",
          }}
        >
          {selectedGroup.name}
        </span>
      );
    }

    if (selectedStatement) {
      crumbs.push(" > ");
      crumbs.push(
        <span key="copies" style={{ color: "#666" }}>
          {selectedStatement.name}
        </span>
      );
    }

    return <div className="investigator-breadcrumbs">{crumbs}</div>;
  };

  // Back Button
  const renderBackButton = () => {
    if (currentView === "experiments") return null;

    return (
      <button
        onClick={() => {
          if (currentView === "copies") {
            setCurrentView("statements");
            setSelectedStatement(null);
          } else if (currentView === "statements") {
            setCurrentView("groups");
            setSelectedGroup(null);
          } else if (currentView === "groups") {
            setCurrentView("experiments");
            setSelectedExperiment(null);
            setGroups([]);
          }
        }}
        className="back-btn"
      >
        <FaArrowLeft /> Back
      </button>
    );
  };

  return (
    <div className="admin-dashboard">
      {/* Top Navigation Bar */}
      <div className="investigator-nav-bar">
        {renderBackButton()}
        {renderBreadcrumbs()}
      </div>

      <div className="dashboard-content">
        {/* VIEW 1: EXPERIMENTS */}
        {currentView === "experiments" && (
          <>
            <div className="section-title-row">
              <h2 style={{ marginBottom: "20px" }}>
                <FaMicroscope /> All Experiments
              </h2>
              <div className="sort-controls">
                <span>Sort by:</span>
                <button
                  className={`sort-btn ${
                    experimentSort === "name" ? "active" : ""
                  }`}
                  onClick={() => setExperimentSort("name")}
                >
                  Name
                </button>
                <button
                  className={`sort-btn ${
                    experimentSort === "date" ? "active" : ""
                  }`}
                  onClick={() => setExperimentSort("date")}
                >
                  Date
                </button>
              </div>
            </div>

            <div className="grid-layout">
              {sortedExperiments.map((exp) => (
                <div
                  key={exp._id}
                  className="folder-card experiment-card"
                  onClick={() => {
                    setSelectedExperiment(exp);
                    setCurrentView("groups");
                  }}
                >
                  <div className="card-top">
                    <FaMicroscope className="card-icon" />
                  </div>
                  <h3 className="card-title">{exp.name}</h3>
                  <p className="card-desc">
                    Researcher: {exp.investigatorName || "Unknown"}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* VIEW 2: GROUPS */}
        {currentView === "groups" && (
          <>
            <h2 style={{ marginBottom: "20px" }}>
              <FaFolderOpen /> Groups in {selectedExperiment.name}
            </h2>

            <div className="grid-layout">
              {groups.map((group) => (
                <div
                  key={group._id}
                  className="folder-card group-card"
                  onClick={() => {
                    setSelectedGroup(group);
                    setCurrentView("statements");
                  }}
                >
                  <div className="card-top">
                    <FaFolderOpen className="card-icon" />
                  </div>
                  <h3 className="card-title">{group.name}</h3>
                  <p className="card-desc">
                    {group.description || "No description"}
                  </p>
                </div>
              ))}
              {groups.length === 0 && (
                <div className="empty-message">
                  No groups found in this experiment.
                </div>
              )}
            </div>
          </>
        )}

        {/* VIEW 3: STATEMENTS */}
        {currentView === "statements" && (
          <>
            <h2 style={{ marginBottom: "20px" }}>
              <FaFileAlt /> Statements in {selectedGroup.name}
            </h2>

            <div className="grid-layout">
              {statements.map((stmt) => (
                <div
                  key={stmt._id}
                  className="folder-card statement-card"
                  onClick={() => {
                    setSelectedStatement(stmt);
                    setCurrentView("copies");
                  }}
                >
                  <div className="card-top">
                    <FaFileAlt className="card-icon" />
                  </div>
                  <h3 className="card-title">{stmt.name}</h3>
                  <p className="card-desc">{stmt.content || "No content"}</p>
                </div>
              ))}
              {statements.length === 0 && (
                <div className="empty-message">
                  No statements found in this group.
                </div>
              )}
            </div>
          </>
        )}

        {/* VIEW 4: COPIES */}
        {currentView === "copies" && (
          <>
            <h2 style={{ marginBottom: "20px" }}>
              <FaUsers /> Copies for {selectedStatement.name}
            </h2>

            {/* Compare Button - Always visible */}
            <div style={{ marginBottom: "16px", display: "flex", gap: "8px" }}>
              <button
                onClick={() => {
                  const completedCopies = copiesByStatementId(
                    selectedStatement._id
                  ).filter((copy) => copy.status === "completed");

                  if (completedCopies.length < 2) {
                    alert(
                      "❌ Cannot compare: At least 2 completed copies are required to compare this statement."
                    );
                    return;
                  }

                  navigate(`/compare/${selectedStatement._id}`);
                }}
                disabled={
                  copiesByStatementId(selectedStatement._id).filter(
                    (copy) => copy.status === "completed"
                  ).length < 2
                }
                className="btn-primary"
                style={{
                  opacity:
                    copiesByStatementId(selectedStatement._id).filter(
                      (copy) => copy.status === "completed"
                    ).length < 2
                      ? 0.5
                      : 1,
                  cursor:
                    copiesByStatementId(selectedStatement._id).filter(
                      (copy) => copy.status === "completed"
                    ).length < 2
                      ? "not-allowed"
                      : "pointer",
                }}
                title={
                  copiesByStatementId(selectedStatement._id).filter(
                    (copy) => copy.status === "completed"
                  ).length < 2
                    ? "At least 2 completed copies required"
                    : "Compare completed copies"
                }
              >
                <FaBalanceScale /> Compare Copies
              </button>

              <button
                onClick={() =>
                  navigate(`/statement-summary/${selectedStatement._id}`)
                }
                className="btn-secondary"
              >
                <FaChartLine /> View Summary
              </button>
            </div>

            <div className="copies-grid">
              {copiesByStatementId(selectedStatement._id).map((copy) => {
                const unread = getUnreadCount(copy._id, currentUser._id);
                const coderName =
                  users.find((u) => u._id === copy.coderId)?.username ||
                  "Unknown";

                return (
                  <div key={copy._id} className="copy-card">
                    <div className="copy-info">
                      <span className="copy-coder">
                        <FaUsers /> {coderName}
                      </span>
                      <span
                        className={`copy-status status-${copy.status.replace(
                          " ",
                          "-"
                        )}`}
                      >
                        {copy.status}
                      </span>
                    </div>

                    <div className="copy-actions">
                      <button
                        onClick={() => {
                          if (copy.status === "completed") {
                            navigate(`/view-statement/${copy._id}`);
                          } else {
                            alert(
                              "❌ Cannot view statement before coding is completed"
                            );
                          }
                        }}
                        className={`action-btn view-btn ${
                          copy.status !== "completed" ? "disabled" : ""
                        }`}
                      >
                        View Coding
                      </button>

                      {unread > 0 && (
                        <span className="unread-badge">
                          <FaComment /> {unread} unread
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {copiesByStatementId(selectedStatement._id).length === 0 && (
                <div className="empty-message">No coders assigned yet.</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
