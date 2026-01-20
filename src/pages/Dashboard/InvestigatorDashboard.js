import React, { useState, useEffect } from "react";
import { useExperiment } from "../../context/ExperimentContext";
import { useGroup } from "../../context/GroupContext";
import { useStatement } from "../../context/StatementContext";
import { useCopy } from "../../context/CopyContext";
import { useTask } from "../../context/TaskContext";
import { useNavigate } from "react-router-dom";
import { useData } from "../../context/DataContext";
import { useCopyMessage } from "../../context/CopyMessageContext";
import {
  FaMicroscope,
  FaFolderOpen,
  FaFileAlt,
  FaBalanceScale,
  FaChartLine,
  FaPlus,
  FaTrash,
  FaUsers,
  FaChevronRight,
  FaArrowLeft,
  FaComment,
} from "react-icons/fa";
import "../../styles/Dashboard.css";
import "./InvestigatorDashboard.css";

export default function InvestigatorHomePage() {
  const {
    addExperiment,
    experimentsByInvestigatorId,
    deleteExperiment,
    experimentById,
    fetchExperiments,
  } = useExperiment();
  const { groupsByExperimentId, addGroup, deleteGroup, fetchAllGroups } = useGroup();
  const { statementsByGroupId, addStatement, deleteStatement, fetchAllStatements } = useStatement();
  const { copiesByStatementId, deleteCopy, addCopy } = useCopy();
  const { addTask, addTaskForCopy, addCopyToTask } = useTask();
  const { users, currentUser, isAuthChecked } = useData();
  const { getUnreadCount } = useCopyMessage();

  const [relevantExperiments, setRelevantExperiments] = useState([]);
  
  // Global data for uniqueness checks
  const [allExperiments, setAllExperiments] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [allStatements, setAllStatements] = useState([]);

  // Navigation State
  const [currentView, setCurrentView] = useState("experiments"); 
  const [selectedExperiment, setSelectedExperiment] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedStatement, setSelectedStatement] = useState(null);

  // Data State for current view
  const [groups, setGroups] = useState([]);
  const [statements, setStatements] = useState([]);

  // Task Creation Modal State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskCoderId, setTaskCoderId] = useState("");
  const [taskPercent, setTaskPercent] = useState(100);

  // Forms State
  const [showExpForm, setShowExpForm] = useState(false);
  const [expName, setExpName] = useState("");
  const [expDesc, setExpDesc] = useState("");

  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");

  const [showStatementForm, setShowStatementForm] = useState(false);
  const [statementName, setStatementName] = useState("");
  const [statementText, setStatementText] = useState("");

  const [showCopyForm, setShowCopyForm] = useState(false);
  const [copyCoderId, setCopyCoderId] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthChecked && !currentUser) {
      navigate("/", { replace: true });
    }
  }, [isAuthChecked, currentUser, navigate]);

  useEffect(() => {
    const fetchExperiments = async () => {
      if (!isAuthChecked || !currentUser?._id) return;
      try {
        const exps = await experimentsByInvestigatorId(currentUser._id);
        setRelevantExperiments(exps);
      } catch (err) {
        console.error("❌ Error loading experiments:", err);
      }
    };
    fetchExperiments();
  }, [isAuthChecked, currentUser, experimentsByInvestigatorId, users]);

  // Fetch ALL experiments, groups, and statements for global uniqueness checks
  useEffect(() => {
    const fetchAllData = async () => {
      if (!isAuthChecked || !currentUser) return;
      try {
        const [exps, grps, stmts] = await Promise.all([
          fetchExperiments(),
          fetchAllGroups(),
          fetchAllStatements(),
        ]);
        setAllExperiments(exps);
        setAllGroups(grps);
        setAllStatements(stmts);
      } catch (err) {
        console.error("❌ Error loading global data:", err);
      }
    };
    fetchAllData();
  }, [isAuthChecked, currentUser, fetchExperiments, fetchAllGroups, fetchAllStatements]);

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

  if (!isAuthChecked) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div>Loading...</div>
      </div>
    );
  }

  if (!currentUser) return null;

  // --- Handlers ---

  const handleCreateExperiment = async (e) => {
    e.preventDefault();
    if (!expName.trim()) return alert("Please enter an experiment name");

    // Check globally across ALL experiments, not just the current user's
    const duplicateExp = allExperiments.find(
      (exp) => exp.name.toLowerCase() === expName.trim().toLowerCase()
    );

    if (duplicateExp) {
      return alert(
        "Experiment name already exists. Please choose a different name."
      );
    }

    const newExp = await addExperiment(expName, expDesc, currentUser._id);
    if (newExp) {
      const exps = await experimentsByInvestigatorId(currentUser._id);
      setRelevantExperiments(exps);
    }
    setExpName("");
    setExpDesc("");
    setShowExpForm(false);
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) return alert("Please enter a group name");

    // Check globally across ALL groups, not just the current experiment's
    const duplicateGroup = allGroups.find(   
      (g) => g.name.toLowerCase() === groupName.trim().toLowerCase()
    );

    if (duplicateGroup) {
      return alert(
        "Group name already exists. Please choose a different name."
      );
    }

    const newGroup = await addGroup(
      selectedExperiment._id,
      groupName,
      groupDesc
    );
    if (newGroup) {
      setGroups((prev) => [...prev, newGroup]);
      setAllGroups((prev) => [...prev, newGroup]); // ✅ Update global groups list
    }
    setGroupName("");
    setGroupDesc("");
    setShowGroupForm(false);
  };

  const handleCreateStatement = async (e) => {
    e.preventDefault();
    if (!statementName.trim() || !statementText.trim())
      return alert("Please fill in all fields");

    // Check globally across ALL statements, not just the current group's
    const duplicateStatement = allStatements.find(
      (stmt) => stmt.name.toLowerCase() === statementName.trim().toLowerCase()
    );

    if (duplicateStatement) {
      return alert(
        "Statement name already exists. Please choose a different name."
      );
    }

    const newStatement = await addStatement(
      statementName,
      statementText,
      selectedGroup._id,
      selectedExperiment._id
    );

    setStatements((prev) => [...prev, newStatement]);

    const r = await addCopy(
      newStatement._id,
      selectedGroup._id,
      selectedExperiment._id,
      currentUser._id
    );
    const newCopyId = r.newCopy._id;
    const experiment = await experimentById(selectedExperiment._id);
    if (experiment?.defaultTaskId)
      await addCopyToTask(experiment.defaultTaskId, newCopyId);

    setStatementName("");
    setStatementText("");
    setShowStatementForm(false);
  };

  const handleCreateCopy = async (e) => {
    e.preventDefault();
    if (!copyCoderId) return alert("Select coder first");

    await addTaskForCopy(
      selectedExperiment._id,
      selectedGroup._id,
      selectedStatement._id,
      currentUser._id,
      copyCoderId
    );
    setCopyCoderId("");
    setShowCopyForm(false);
  };

  const handleCreateTask = async () => {
    if (!taskCoderId) return alert("❌ Please select a coder first");
    if (taskPercent < 0 || taskPercent > 100)
      return alert("❌ Invalid percentage (must be 0-100)");

    try {
      const result = await addTask(
        selectedExperiment._id,
        currentUser._id,
        taskCoderId,
        taskPercent
      );

      if (!result.success) {
        alert("❌ Failed to create task. Please try again.");
        return;
      }

      setTaskCoderId("");
      setTaskPercent(100);
      setShowTaskModal(false);
    } catch (err) {
      console.error("Error creating task:", err);
      alert(`❌ ${err.message || "Error creating task. Please try again."}`);
    }
  };

  const handleDeleteExperiment = async (e, experimentId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this experiment? This will delete all associated groups, declarations, copies, and tasks.")) {
      const success = await deleteExperiment(experimentId);
      if (success) {
        setRelevantExperiments((prev) =>
          prev.filter((exp) => exp._id !== experimentId)
        );
      }
    }
  };

  const handleDeleteGroup = async (e, groupId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this group? This will delete all associated declarations, copies, and tasks.")) {
      try {
        await deleteGroup(groupId);
        setGroups((prev) => prev.filter((g) => g._id !== groupId));
        setAllGroups((prev) => prev.filter((g) => g._id !== groupId)); // ✅ Update global groups list
        if (selectedGroup && selectedGroup._id === groupId) {
          setSelectedGroup(null);
          setStatements([]);
          setCurrentView("groups");
        }
      } catch (err) {
        console.error("Error deleting group:", err);
        alert("Failed to delete group. Please try again.");
      }
    }
  };

  const handleDeleteStatement = async (e, statementId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this declaration? This will delete all associated copies and comparisons.")) {
      await deleteStatement(statementId);
      setStatements((prev) => prev.filter((s) => s._id !== statementId));
    }
  };

  const handleDeleteCopy = async (copyId) => {
    if (window.confirm("Are you sure you want to delete this copy? This action cannot be undone.")) await deleteCopy(copyId);
  };

  const renderBreadcrumbs = () => (
    <div className="breadcrumbs">
      <span
        className="breadcrumb-link"
        onClick={() => {
          setSelectedExperiment(null);
          setSelectedGroup(null);
          setSelectedStatement(null);
          setCurrentView("experiments");
        }}
      >
        Experiments
      </span>
      {selectedExperiment && (
        <>
          <FaChevronRight className="breadcrumb-icon" />
          <span
            className="breadcrumb-link"
            onClick={() => {
              setSelectedGroup(null);
              setSelectedStatement(null);
              setCurrentView("groups");
            }}
          >
            {selectedExperiment.name}
          </span>
        </>
      )}
      {selectedGroup && (
        <>
          <FaChevronRight className="breadcrumb-icon" />
          <span
            className="breadcrumb-link"
            onClick={() => {
              setSelectedStatement(null);
              setCurrentView("statements");
            }}
          >
            {selectedGroup.name}
          </span>
        </>
      )}
      {selectedStatement && (
        <>
          <FaChevronRight className="breadcrumb-icon" />
          <span className="breadcrumb-current">{selectedStatement.name}</span>
        </>
      )}
    </div>
  );

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          <FaMicroscope /> Experiments of {currentUser.username}
        </h1>
        <p className="dashboard-subtitle">Manage your research hierarchy</p>
      </div>

      <div className="investigator-nav-bar">
        {currentView !== "experiments" && (
          <button
            onClick={() => {
              if (currentView === "groups") {
                setSelectedExperiment(null);
                setCurrentView("experiments");
              } else if (currentView === "statements") {
                setSelectedGroup(null);
                setCurrentView("groups");
              } else if (currentView === "copies") {
                setSelectedStatement(null);
                setCurrentView("statements");
              }
            }}
            className="back-btn"
          >
            <FaArrowLeft /> Back
          </button>
        )}
        {renderBreadcrumbs()}

        {/* Contextual Add Buttons */}
        <div className="nav-actions">
          {currentView === "experiments" && !showExpForm && (
            <button
              onClick={() => setShowExpForm(true)}
              className="investigator-add-btn"
            >
              <FaPlus /> Add Experiment
            </button>
          )}
          {currentView === "groups" && !showGroupForm && (
            <button
              onClick={() => setShowGroupForm(true)}
              className="investigator-add-btn"
            >
              <FaFolderOpen /> Add Group
            </button>
          )}
          {currentView === "statements" && !showStatementForm && (
            <button
              onClick={() => setShowStatementForm(true)}
              className="investigator-add-btn"
            >
              <FaFileAlt /> Add Statement
            </button>
          )}
          {currentView === "copies" && !showCopyForm && (
            <button
              onClick={() => setShowCopyForm(true)}
              className="investigator-add-btn"
            >
              <FaPlus /> Add Copy
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="investigator-content">
        {/* VIEW 1: EXPERIMENTS */}
        {currentView === "experiments" && (
          <>
            {showExpForm && (
              <div className="form-card">
                <h3>Create New Experiment</h3>
                <form
                  onSubmit={handleCreateExperiment}
                  className="investigator-form"
                >
                  <input
                    value={expName}
                    onChange={(e) => setExpName(e.target.value)}
                    className="investigator-form-input"
                    placeholder="Experiment Name"
                    autoFocus
                  />
                  <textarea
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                    className="investigator-form-textarea"
                    placeholder="Description"
                  />
                  <div className="form-actions">
                    <button type="submit" className="btn-primary">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowExpForm(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid-layout">
              {relevantExperiments.map((exp) => (
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
                    <div className="card-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedExperiment(exp);
                          setShowTaskModal(true);
                        }}
                        className="icon-btn"
                        title="Create Task"
                      >
                        <FaUsers />
                      </button>
                      <button
                        onClick={(e) => handleDeleteExperiment(e, exp._id)}
                        className="icon-btn delete"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                  <h3 className="card-title">{exp.name}</h3>
                  <p className="card-desc">
                    {exp.description || "No description"}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}

        {/* VIEW 2: GROUPS */}
        {currentView === "groups" && (
          <>
            {showGroupForm && (
              <div className="form-card">
                <h3>Create New Group in {selectedExperiment.name}</h3>
                <form
                  onSubmit={handleCreateGroup}
                  className="investigator-form"
                >
                  <input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="investigator-form-input"
                    placeholder="Group Name"
                    autoFocus
                  />
                  <textarea
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    className="investigator-form-textarea"
                    placeholder="Description"
                  />
                  <div className="form-actions">
                    <button type="submit" className="btn-primary">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowGroupForm(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

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
                    <button
                      onClick={(e) => handleDeleteGroup(e, group._id)}
                      className="icon-btn delete"
                    >
                      <FaTrash />
                    </button>
                  </div>
                  <h3 className="card-title">{group.name}</h3>
                  <p className="card-desc">
                    {group.description || "No description"}
                  </p>
                </div>
              ))}
              {groups.length === 0 && !showGroupForm && (
                <div className="empty-message">
                  No groups found. Create one to get started.
                </div>
              )}
            </div>
          </>
        )}

        {/* VIEW 3: STATEMENTS */}
        {currentView === "statements" && (
          <>
            {showStatementForm && (
              <div className="form-card">
                <h3>Add Declaration to {selectedGroup.name}</h3>
                <form
                  onSubmit={handleCreateStatement}
                  className="investigator-form"
                >
                  <input
                    value={statementName}
                    onChange={(e) => setStatementName(e.target.value)}
                    className="investigator-form-input"
                    placeholder="Declaration Name"
                    autoFocus
                  />
                  <textarea
                    value={statementText}
                    onChange={(e) => setStatementText(e.target.value)}
                    className="investigator-form-textarea"
                    placeholder="Declaration Content"
                  />
                  <div className="form-actions">
                    <button type="submit" className="btn-primary">
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowStatementForm(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

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
                    <div className="card-actions">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/statement-summary/${stmt._id}`);
                        }}
                        className="icon-btn"
                        title="View Summary"
                      >
                        <FaChartLine />
                      </button>
                      <button
                        onClick={(e) => handleDeleteStatement(e, stmt._id)}
                        className="icon-btn delete"
                        title="Delete"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                  <h3 className="card-title">{stmt.name}</h3>
                  <p className="card-desc">
                    {stmt.content}
                  </p>
                </div>
              ))}
              {statements.length === 0 && !showStatementForm && (
                <div className="empty-message">
                  No declarations found. Add one to continue.
                </div>
              )}
            </div>
          </>
        )}

        {/* VIEW 4: COPIES */}
        {currentView === "copies" && (
          <>
            {showCopyForm && (
              <div className="form-card">
                <h3>Assign Coder to {selectedStatement.name}</h3>
                <form onSubmit={handleCreateCopy} className="investigator-form">
                  <select
                    value={copyCoderId}
                    onChange={(e) => setCopyCoderId(e.target.value)}
                    className="investigator-select"
                  >
                    <option value="">Select Coder</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.username}
                      </option>
                    ))}
                  </select>
                  <div className="form-actions">
                    <button type="submit" className="btn-primary">
                      Assign
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCopyForm(false)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

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
                className={`dashboard-btn ${
                  copiesByStatementId(selectedStatement._id).filter(
                    (copy) => copy.status === "completed"
                  ).length < 2
                    ? "btn-secondary"
                    : "btn-primary"
                }`}
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
                              "Cannot view statement before coding is completed"
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

                      <button
                        onClick={() => handleDeleteCopy(copy._id)}
                        className="action-btn delete-btn"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                );
              })}
              {copiesByStatementId(selectedStatement._id).length === 0 &&
                !showCopyForm && (
                  <div className="empty-message">No coders assigned yet.</div>
                )}
            </div>
          </>
        )}
      </div>

      {showTaskModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Create Task for {selectedExperiment?.name}</h3>
            <div className="modal-body">
              <div className="form-group">
                <label>Select Coder:</label>
                <select
                  value={taskCoderId}
                  onChange={(e) => setTaskCoderId(e.target.value)}
                  className="investigator-select"
                >
                  <option value="">-- Choose Coder --</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.username}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Percentage of Statements ({taskPercent}%):</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={taskPercent}
                  onChange={(e) => setTaskPercent(e.target.value)}
                  className="slider"
                />
              </div>
            </div>
            <div className="modal-actions">
              <button onClick={handleCreateTask} className="btn-primary">
                Create Task
              </button>
              <button
                onClick={() => setShowTaskModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
