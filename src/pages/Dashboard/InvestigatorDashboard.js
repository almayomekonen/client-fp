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
  FaTimes,
  FaSave,
  FaUsers,
  FaChevronLeft,
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
  } = useExperiment();
  const { groupsByExperimentId, addGroup, deleteGroup } = useGroup();
  const { statementsByGroupId, addStatement, deleteStatement } = useStatement();
  const { copiesByStatementId, deleteCopy, addCopy } = useCopy();
  const { addTask, addTaskForCopy, addCopyToTask } = useTask();
  const { users, currentUser, isAuthChecked } = useData();
  const { getUnreadCount } = useCopyMessage();

  const [relevantExperiments, setRelevantExperiments] = useState([]);

  // Navigation State
  const [currentView, setCurrentView] = useState("experiments"); // experiments, groups, statements, copies
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

  // Load Experiments
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
  }, [isAuthChecked, currentUser, experimentsByInvestigatorId]);

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

    const duplicateExp = relevantExperiments.find(
      (exp) => exp.name.toLowerCase() === expName.trim().toLowerCase()
    );

    if (duplicateExp) {
      return alert(
        "Experiment name already exists. Please choose a different name."
      );
    }

    const newExp = await addExperiment(expName, expDesc, currentUser._id);
    if (newExp) {
      // Refetch experiments to get the updated list
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

    const duplicateGroup = groups.find(
      (g) => g.name.toLowerCase() === groupName.trim().toLowerCase()
    );

    if (duplicateGroup) {
      return alert(
        "Group name already exists in this experiment. Please choose a different name."
      );
    }

    const newGroup = await addGroup(
      selectedExperiment._id,
      groupName,
      groupDesc
    );
    if (newGroup) setGroups((prev) => [...prev, newGroup]);
    setGroupName("");
    setGroupDesc("");
    setShowGroupForm(false);
  };

  const handleCreateStatement = async (e) => {
    e.preventDefault();
    if (!statementName.trim() || !statementText.trim())
      return alert("Please fill in all fields");

    const duplicateStatement = statements.find(
      (stmt) => stmt.name.toLowerCase() === statementName.trim().toLowerCase()
    );

    if (duplicateStatement) {
      return alert(
        "Statement name already exists in this group. Please choose a different name."
      );
    }

    const newStatement = await addStatement(
      statementName,
      statementText,
      selectedGroup._id,
      selectedExperiment._id
    );

    setStatements((prev) => [...prev, newStatement]);

    // Auto-create copy for researcher? (Matches old logic)
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
    if (!taskCoderId) return alert("Select coder first");
    if (taskPercent < 0 || taskPercent > 100)
      return alert("Invalid percentage");

    await addTask(
      selectedExperiment._id,
      currentUser._id,
      taskCoderId,
      taskPercent
    );
    setTaskCoderId("");
    setTaskPercent(100);
    setShowTaskModal(false);
    alert("Task created successfully!");
  };

  const handleDeleteExperiment = async (e, experimentId) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this experiment?")) {
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
    if (window.confirm("Delete this group?")) {
      const success = await deleteGroup(groupId);
      if (success) setGroups((prev) => prev.filter((g) => g._id !== groupId));
    }
  };

  const handleDeleteStatement = async (e, statementId) => {
    e.stopPropagation();
    if (window.confirm("Delete this statement?")) {
      await deleteStatement(statementId);
      setStatements((prev) => prev.filter((s) => s._id !== statementId));
    }
  };

  const handleDeleteCopy = async (copyId) => {
    if (window.confirm("Delete this copy?")) await deleteCopy(copyId);
  };

  // --- Render Helpers ---

  // Breadcrumbs
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
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          <FaMicroscope /> Experiments of {currentUser.username}
        </h1>
        <p className="dashboard-subtitle">Manage your research hierarchy</p>
      </div>

      {/* Navigation Bar */}
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

            <div className="list-layout">
              {statements.map((stmt) => (
                <div
                  key={stmt._id}
                  className="list-item-card"
                  onClick={() => {
                    setSelectedStatement(stmt);
                    setCurrentView("copies");
                  }}
                >
                  <div className="list-item-content">
                    <FaBalanceScale className="list-icon" />
                    <span className="list-title">{stmt.name}</span>
                  </div>
                  <div className="list-actions">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/statement-summary/${stmt._id}`);
                      }}
                      className="text-btn"
                    >
                      <FaChartLine /> Summary
                    </button>
                    <button
                      onClick={(e) => handleDeleteStatement(e, stmt._id)}
                      className="icon-btn delete"
                    >
                      <FaTrash />
                    </button>
                  </div>
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

      {/* Task Creation Modal */}
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
