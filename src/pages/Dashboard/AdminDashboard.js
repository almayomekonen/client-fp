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
  FaChevronRight,
  FaFolderOpen,
  FaFileAlt,
  FaBalanceScale,
  FaChartLine,
  FaUsers,
  FaSort,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaTasks,
} from "react-icons/fa";
import "./AdminDashboard.css";

export default function AdminHomePage() {
  const { users, currentUser, isAuthChecked, copies } = useData();
  const { fetchExperiments, investigatorNameByExperimentId } = useExperiment();
  const { groupsByExperimentId } = useGroup();
  const { statementsByGroupId } = useStatement();
  const { copiesByStatementId } = useCopy();
  const { getUnreadCount } = useCopyMessage();

  const [experiments, setExperiments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [statements, setStatements] = useState([]);
  const [expandedExperimentId, setExpandedExperimentId] = useState(null);
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [expandedStatementId, setExpandedStatementId] = useState(null);

  // Sorting States
  const [userSort, setUserSort] = useState("name"); // name, lastLogin, completed, active
  const [experimentSort, setExperimentSort] = useState("name"); // name, date, status, coders
  const [showUsers, setShowUsers] = useState(false); // Toggle to show/hide users list

  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthChecked && !currentUser) {
      navigate("/", { replace: true });
    }
  }, [currentUser, isAuthChecked, navigate]);

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

  // Helper: Get derived data for sorting experiments
  const getExperimentStats = (expId) => {
    // This is expensive to calculate on the fly for all experiments if we don't have the tree loaded.
    // However, 'copies' from useData contains ALL copies. We can filter by experimentId.
    // But copies don't have experimentId directly? They do! (See Copy model or createCopy)
    // Let's check Copy model structure in memory.
    // Assuming copies have experimentId.
    const expCopies = copies.filter((c) => c.experimentId === expId);
    const completedCount = expCopies.filter(
      (c) => c.status === "completed"
    ).length;
    const isCompleted =
      expCopies.length > 0 && completedCount === expCopies.length;
    const isActive = expCopies.length > 0 && !isCompleted;
    const uniqueCoders = new Set(expCopies.map((c) => c.coderId)).size;

    return { isCompleted, isActive, uniqueCoders, createdDate: expId }; // approximation if createdAt missing
  };

  // Sorted Users
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      if (userSort === "name") return a.username.localeCompare(b.username);
      if (userSort === "lastLogin") {
        return (
          new Date(b.lastLogin || 0).getTime() -
          new Date(a.lastLogin || 0).getTime()
        );
      }
      if (userSort === "completed") {
        const aCount = copies.filter(
          (c) => c.coderId === a._id && c.status === "completed"
        ).length;
        const bCount = copies.filter(
          (c) => c.coderId === b._id && c.status === "completed"
        ).length;
        return bCount - aCount;
      }
      if (userSort === "active") {
        const aCount = copies.filter(
          (c) => c.coderId === a._id && c.status !== "completed"
        ).length;
        const bCount = copies.filter(
          (c) => c.coderId === b._id && c.status !== "completed"
        ).length;
        return bCount - aCount;
      }
      return 0;
    });
  }, [users, userSort, copies]);

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
      if (experimentSort === "coders") {
        const aStats = getExperimentStats(a._id);
        const bStats = getExperimentStats(b._id);
        return bStats.uniqueCoders - aStats.uniqueCoders;
      }
      if (experimentSort === "status") {
        const aStats = getExperimentStats(a._id);
        const bStats = getExperimentStats(b._id);
        // Completed > Active > Empty
        const getScore = (s) => (s.isCompleted ? 2 : s.isActive ? 1 : 0);
        return getScore(bStats) - getScore(aStats);
      }
      return 0;
    });
  }, [experiments, experimentSort, copies]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isAuthChecked) {
    return (
      <div className="loading-container">
        <div>Loading</div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!currentUser) return null;

  // Stats
  const totalExperiments = experiments.length;
  const totalUsers = users.length;
  const totalCoders = users.filter((u) => u.role === "coder").length;

  // Toggle helpers
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
          <FaMicroscope /> Administration
        </h1>
        <p className="dashboard-subtitle">
          Manage system experiments and users
        </p>
      </div>

      {/* Statistics Bar */}
      <div className="stats-bar">
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: "#e3f2fd", color: "#2196f3" }}
          >
            <FaMicroscope />
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalExperiments}</span>
            <span className="stat-label">Total Experiments</span>
          </div>
        </div>
        <div className="stat-card">
          <div
            className="stat-icon"
            style={{ backgroundColor: "#f3e5f5", color: "#9c27b0" }}
          >
            <FaUsers />
          </div>
          <div className="stat-info">
            <span className="stat-value">{totalUsers}</span>
            <span className="stat-label">
              Total Users ({totalCoders} Coders)
            </span>
          </div>
        </div>
      </div>

      {/* Users Section */}
      <div className="section-container">
        <div className="section-header">
          <h2>
            <FaUsers /> Users Management
            <button
              className="toggle-btn"
              onClick={() => setShowUsers(!showUsers)}
            >
              {showUsers ? "Hide" : "Show"}
            </button>
          </h2>
          {showUsers && (
            <div className="sort-controls">
              <span>Sort by:</span>
              <button
                className={`sort-btn ${userSort === "name" ? "active" : ""}`}
                onClick={() => setUserSort("name")}
              >
                Name
              </button>
              <button
                className={`sort-btn ${
                  userSort === "lastLogin" ? "active" : ""
                }`}
                onClick={() => setUserSort("lastLogin")}
              >
                Last Connection
              </button>
              <button
                className={`sort-btn ${
                  userSort === "completed" ? "active" : ""
                }`}
                onClick={() => setUserSort("completed")}
              >
                Completed
              </button>
              <button
                className={`sort-btn ${userSort === "active" ? "active" : ""}`}
                onClick={() => setUserSort("active")}
              >
                Active
              </button>
            </div>
          )}
        </div>

        {showUsers && (
          <div className="users-list">
            {sortedUsers.map((user) => {
              // Calculate stats for display
              const completedCount = copies.filter(
                (c) => c.coderId === user._id && c.status === "completed"
              ).length;
              const activeCount = copies.filter(
                (c) => c.coderId === user._id && c.status !== "completed"
              ).length;

              return (
                <div key={user._id} className="user-card-row">
                  <div className="user-info-main">
                    <div className="user-avatar">
                      <FaUsers />
                    </div>
                    <div className="user-details">
                      <div className="user-name">{user.username}</div>
                      <div className="user-role">{user.role}</div>
                    </div>
                  </div>
                  <div className="user-stats">
                    <div className="stat-pill" title="Last Login">
                      <FaClock />{" "}
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleDateString()
                        : "Never"}
                    </div>
                    <div
                      className="stat-pill success"
                      title="Completed Assignments"
                    >
                      <FaCheckCircle /> {completedCount} Completed
                    </div>
                    <div
                      className="stat-pill warning"
                      title="Active Assignments"
                    >
                      <FaTasks /> {activeCount} Active
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Experiments Section */}
      <div className="section-container">
        <div className="section-header">
          <h2>
            <FaFolderOpen /> All Experiments
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
            <button
              className={`sort-btn ${
                experimentSort === "status" ? "active" : ""
              }`}
              onClick={() => setExperimentSort("status")}
            >
              Status
            </button>
            <button
              className={`sort-btn ${
                experimentSort === "coders" ? "active" : ""
              }`}
              onClick={() => setExperimentSort("coders")}
            >
              Coders
            </button>
          </div>
        </div>

        {sortedExperiments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <p className="empty-state-text">No experiments in the system</p>
          </div>
        ) : (
          <ul className="experiments-list">
            {sortedExperiments.map((exp) => (
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
                    {/* Add Experiment Stats Badges here if desired */}
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
                              <div
                                key={statement._id}
                                className="statement-item"
                              >
                                <div className="statement-header">
                                  <div
                                    onClick={() =>
                                      toggleStatement(statement._id)
                                    }
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
                                        <FaBalanceScale /> Compare
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
                                      <FaChartLine /> Summary
                                    </button>
                                  </div>
                                </div>

                                {expandedStatementId === statement._id && (
                                  <div className="copies-container">
                                    {copiesByStatementId(statement._id).map(
                                      (copy) => (
                                        <div
                                          key={copy._id}
                                          className="copy-item"
                                        >
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
                                              (user) =>
                                                user._id === copy.coderId
                                            )?.username || "Unknown"}
                                          </div>

                                          <div className="copy-actions">
                                            {getUnreadCount(
                                              copy._id,
                                              currentUser?._id
                                            ) > 0 && (
                                              <div className="unread-badge">
                                                <span>
                                                  💬{" "}
                                                  {getUnreadCount(
                                                    copy._id,
                                                    currentUser?._id
                                                  )}{" "}
                                                  unread messages
                                                </span>
                                              </div>
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
    </div>
  );
}
