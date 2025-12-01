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
  FaChevronRight,
  FaFolderOpen,
  FaFileAlt,
  FaBalanceScale,
  FaChartLine,
  FaPlus,
  FaTrash,
  FaTimes,
  FaSave,
  FaUsers,
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
  const [groups, setGroups] = useState([]);
  const [statements, setStatements] = useState([]);

  const [expandedExperimentId, setExpandedExperimentId] = useState(null);
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [expandedStatementId, setExpandedStatementId] = useState(null);
  const [selectedUserIdForCopy, setSelectedUserIdForCopy] = useState("");
  const [selectedUserIdForTask, setSelectedUserIdForTask] = useState("");

  const [showExpForm, setShowExpForm] = useState(false);
  const [expName, setExpName] = useState("");
  const [expDesc, setExpDesc] = useState("");

  const [showGroupForm, setShowGroupForm] = useState(null);
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");

  const [showStatementForm, setShowStatementForm] = useState(null);
  const [statementName, setStatementName] = useState("");
  const [statementText, setStatementText] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthChecked && !currentUser) {
      navigate("/", { replace: true });
    }
  }, [currentUser, isAuthChecked, navigate]);

  useEffect(() => {
    const fetchExperiments = async () => {
      if (!isAuthChecked || !currentUser?._id) {
        return;
      }

      try {
        const exps = await experimentsByInvestigatorId(currentUser._id);
        setRelevantExperiments(exps);
      } catch (err) {
        console.error("❌ Error loading experiments:", err);
        alert(
          `❌ Error loading experiments: ${err.message || "Unknown error"}`
        );
      }
    };
    fetchExperiments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthChecked, currentUser]);

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

  const toggleGroup = async (groupId) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      setStatements([]);
      return;
    }

    setExpandedGroupId(groupId);
    try {
      const loadedStatements = await statementsByGroupId(groupId);
      setStatements(loadedStatements);
    } catch {
      alert("❌ Error loading statements");
    }
  };

  const toggleStatement = (id) => {
    setExpandedStatementId(expandedStatementId === id ? null : id);
  };

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
    if (newExp) setRelevantExperiments((prev) => [...prev, newExp]);
    setExpName("");
    setExpDesc("");
    setShowExpForm(false);
  };

  const handleDeleteExperiment = async (experimentId) => {
    if (window.confirm("Are you sure you want to delete this experiment?")) {
      const success = await deleteExperiment(experimentId);
      if (success) {
        setRelevantExperiments((prev) =>
          prev.filter((exp) => exp._id !== experimentId)
        );
        if (expandedExperimentId === experimentId) setGroups([]);
      }
    }
  };

  const handleCreateGroup = async (e, experimentId) => {
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

    const newGroup = await addGroup(experimentId, groupName, groupDesc);
    if (newGroup) setGroups((prev) => [...prev, newGroup]);
    setGroupName("");
    setGroupDesc("");
    setShowGroupForm(null);
  };

  const handleDeleteGroup = async (groupId) => {
    if (window.confirm("Delete this group?")) {
      const success = await deleteGroup(groupId);
      if (success) setGroups((prev) => prev.filter((g) => g._id !== groupId));
    }
  };

  const handleCreateStatement = async (e, experimentId, groupId) => {
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
      groupId,
      experimentId
    );

    setStatements((prev) => [...prev, newStatement]);
    const r = await addCopy(
      newStatement._id,
      groupId,
      experimentId,
      currentUser._id
    );
    const newCopyId = r.newCopy._id;
    const experiment = await experimentById(experimentId);
    if (experiment?.defaultTaskId)
      await addCopyToTask(experiment.defaultTaskId, newCopyId);

    setStatementName("");
    setStatementText("");
    setShowStatementForm(null);
  };

  const handleDeleteStatement = async (statementId) => {
    if (window.confirm("Delete this statement?")) {
      await deleteStatement(statementId);
      setStatements((prev) => prev.filter((s) => s._id !== statementId));
    }
  };

  const handleDeleteCopy = async (copyId) => {
    if (window.confirm("Delete this copy?")) await deleteCopy(copyId);
  };

  const handleCreateCopy = async (experimentId, groupId, statementId) => {
    if (!selectedUserIdForCopy) return alert("Select coder first");
    await addTaskForCopy(
      experimentId,
      groupId,
      statementId,
      currentUser._id,
      selectedUserIdForCopy
    );
    setSelectedUserIdForCopy("");
  };

  const handleCreateTask = async (experimentId) => {
    if (!selectedUserIdForTask) return alert("Select coder first");
    const percentStr = window.prompt(
      "What percentage of experiment statements to assign to this coder? (0-100)"
    );
    if (!percentStr) return;
    const percent = parseFloat(percentStr);
    if (isNaN(percent) || percent < 0 || percent > 100)
      return alert(
        "Invalid percentage. Please enter a number between 0 and 100"
      );
    await addTask(
      experimentId,
      currentUser._id,
      selectedUserIdForTask,
      percent
    );
    setSelectedUserIdForTask("");
  };

  // --- JSX ---
  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          <FaMicroscope /> My Experiments
        </h1>
        <p className="dashboard-subtitle">
          Manage and view all experiments I created
        </p>
      </div>

      {!showExpForm ? (
        <button
          onClick={() => setShowExpForm(true)}
          className="investigator-add-btn"
        >
          <FaPlus /> Add New Experiment
        </button>
      ) : (
        <form onSubmit={handleCreateExperiment} className="investigator-form">
          <div className="investigator-form-group">
            <label className="form-label">Experiment Name</label>
            <input
              value={expName}
              onChange={(e) => setExpName(e.target.value)}
              className="investigator-form-input"
              placeholder="Enter experiment name"
            />
          </div>
          <div className="investigator-form-group">
            <label className="form-label">Experiment Description</label>
            <textarea
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
              className="investigator-form-textarea"
              placeholder="Enter experiment description"
            />
          </div>
          <div className="investigator-form-actions">
            <button type="submit" className="investigator-add-btn">
              <FaSave /> Save
            </button>
            <button
              type="button"
              onClick={() => setShowExpForm(false)}
              className="btn-secondary"
            >
              <FaTimes /> Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="investigator-experiments-list">
        {relevantExperiments.map((exp) => (
          <li key={exp._id} className="investigator-experiment-item">
            <div className="investigator-experiment-header">
              <div
                onClick={() => toggleExperiment(exp._id)}
                className="investigator-experiment-title"
              >
                <FaFileAlt /> {exp.name}
              </div>
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <button
                  onClick={() => handleDeleteExperiment(exp._id)}
                  className="investigator-delete-btn"
                >
                  <FaTrash /> Delete Experiment
                </button>
              </div>
            </div>

            {expandedExperimentId === exp._id && (
              <div className="mt-4">
                {/* Task creation UI - once per experiment */}
                <div
                  className="mt-4"
                  style={{
                    marginBottom: "20px",
                    padding: "15px",
                    backgroundColor: "#f0f8ff",
                    borderRadius: "8px",
                    border: "1px solid #b0d4f1",
                  }}
                >
                  <h4 style={{ marginBottom: "10px", color: "#333" }}>
                    Create Task for Experiment
                  </h4>
                  <select
                    value={selectedUserIdForTask}
                    onChange={(e) => setSelectedUserIdForTask(e.target.value)}
                    className="investigator-select"
                    style={{ marginBottom: "10px" }}
                  >
                    <option value="">Select coder for task</option>
                    {users.map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.username}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleCreateTask(exp._id)}
                    className="btn-primary"
                  >
                    <FaUsers /> Create Task for Experiment
                  </button>
                </div>
                {showGroupForm !== exp._id ? (
                  <button
                    onClick={() => setShowGroupForm(exp._id)}
                    className="investigator-add-btn"
                  >
                    <FaFolderOpen /> Add Group
                  </button>
                ) : (
                  <form
                    onSubmit={(e) => handleCreateGroup(e, exp._id)}
                    className="investigator-form"
                  >
                    <input
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="investigator-form-input"
                      placeholder="Group Name"
                    />
                    <textarea
                      value={groupDesc}
                      onChange={(e) => setGroupDesc(e.target.value)}
                      className="investigator-form-textarea"
                      placeholder="Description"
                    />
                    <div className="investigator-form-actions">
                      <button type="submit" className="investigator-add-btn">
                        <FaSave /> Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowGroupForm(null)}
                        className="btn-secondary"
                      >
                        <FaTimes /> Cancel
                      </button>
                    </div>
                  </form>
                )}

                {groups.map((group) => (
                  <div key={group._id} className="investigator-group-item">
                    <div className="investigator-group-header">
                      <div
                        onClick={() => toggleGroup(group._id)}
                        className="investigator-experiment-title"
                      >
                        <FaChevronRight /> {group.name}
                      </div>
                      <button
                        onClick={() => handleDeleteGroup(group._id)}
                        className="investigator-delete-btn"
                      >
                        <FaTrash /> Delete Group
                      </button>
                    </div>

                    {expandedGroupId === group._id && (
                      <div className="mt-4">
                        {showStatementForm !== group._id ? (
                          <button
                            onClick={() => setShowStatementForm(group._id)}
                            className="investigator-add-btn"
                          >
                            <FaFileAlt /> Add Statement
                          </button>
                        ) : (
                          <form
                            onSubmit={(e) =>
                              handleCreateStatement(e, exp._id, group._id)
                            }
                            className="investigator-form"
                          >
                            <input
                              value={statementName}
                              onChange={(e) => setStatementName(e.target.value)}
                              className="investigator-form-input"
                              placeholder="Statement Name"
                            />
                            <textarea
                              value={statementText}
                              onChange={(e) => setStatementText(e.target.value)}
                              className="investigator-form-textarea"
                              placeholder="Statement Content"
                            />
                            <div className="investigator-form-actions">
                              <button
                                type="submit"
                                className="investigator-add-btn"
                              >
                                <FaSave /> Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setShowStatementForm(null)}
                                className="btn-secondary"
                              >
                                <FaTimes /> Cancel
                              </button>
                            </div>
                          </form>
                        )}

                        {statements.map((statement) => (
                          <div
                            key={statement._id}
                            className="investigator-statement-item"
                          >
                            <div className="investigator-group-header">
                              <div
                                onClick={() => toggleStatement(statement._id)}
                                className="investigator-experiment-title"
                              >
                                <FaBalanceScale /> {statement.name}
                              </div>
                              <div className="flex items-center space-x-2">
                                {copiesByStatementId(statement._id).filter(
                                  (copy) => copy.status === "completed"
                                ).length >= 2 && (
                                  <button
                                    onClick={() =>
                                      navigate(`/compare/${statement._id}`)
                                    }
                                    className="text-blue-500 hover:text-blue-700 underline"
                                  >
                                    <FaChartLine /> Compare Codings
                                  </button>
                                )}
                                <button
                                  onClick={() =>
                                    navigate(
                                      `/statement-summary/${statement._id}`
                                    )
                                  }
                                  className="text-green-500 hover:text-green-700 underline"
                                >
                                  <FaFileAlt /> Statement Summary
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteStatement(statement._id)
                                  }
                                  className="investigator-delete-btn text-sm"
                                >
                                  <FaTrash /> Delete
                                </button>
                              </div>
                            </div>

                            {expandedStatementId === statement._id && (
                              <div className="mt-4">
                                <select
                                  value={selectedUserIdForCopy}
                                  onChange={(e) =>
                                    setSelectedUserIdForCopy(e.target.value)
                                  }
                                  className="investigator-select"
                                >
                                  <option value="">Select Coder</option>
                                  {users.map((user) => (
                                    <option key={user._id} value={user._id}>
                                      {user.username}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() =>
                                    handleCreateCopy(
                                      exp._id,
                                      group._id,
                                      statement._id
                                    )
                                  }
                                  className="investigator-add-btn"
                                >
                                  <FaPlus /> Add Copy
                                </button>

                                {copiesByStatementId(statement._id).map(
                                  (copy) => (
                                    <div
                                      key={copy._id}
                                      className="investigator-copy-item"
                                    >
                                      <div
                                        onClick={() => {
                                          if (copy.status === "completed")
                                            navigate(
                                              `/view-statement/${copy._id}`
                                            );
                                          else
                                            alert(
                                              "Cannot view statement before coding is completed"
                                            );
                                        }}
                                        className={`cursor-pointer ${
                                          copy.status === "completed"
                                            ? "text-gray-800 hover:text-purple-600"
                                            : "text-gray-400 cursor-not-allowed"
                                        }`}
                                      >
                                        {users.find(
                                          (user) => user._id === copy.coderId
                                        )?.username || "Unknown"}
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        {getUnreadCount(
                                          copy._id,
                                          currentUser._id
                                        ) > 0 && (
                                          <span
                                            style={{
                                              color: "#dc3545",
                                              fontSize: "14px",
                                              fontWeight: "600",
                                            }}
                                          >
                                            ({getUnreadCount(
                                              copy._id,
                                              currentUser._id
                                            )}{" "}
                                            unread messages)
                                          </span>
                                        )}
                                        <button
                                          onClick={() =>
                                            handleDeleteCopy(copy._id)
                                          }
                                          className="investigator-delete-btn text-sm"
                                        >
                                          <FaTrash /> Delete
                                        </button>
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
    </div>
  );
}
