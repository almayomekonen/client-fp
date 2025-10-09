import React, { useState, useEffect } from "react";
import { useExperiment } from "../../context/ExperimentContext";
import { useGroup } from "../../context/GroupContext";
import { useStatement } from "../../context/StatementContext";
import { useCopy } from "../../context/CopyContext";
import { useTask } from "../../context/TaskContext";
import { useNavigate } from "react-router-dom";
import { useData } from "../../context/DataContext";
import { useCopyMessage } from "../../context/CopyMessageContext";

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
    // רק אחרי שבדיקת האותנטיקציה הושלמה
    if (isAuthChecked && !currentUser) {
      navigate("/", { replace: true });
    }
  }, [currentUser, isAuthChecked, navigate]);

  useEffect(() => {
    const fetchExperiments = async () => {
      if (currentUser?._id) {
        const exps = await experimentsByInvestigatorId(currentUser._id);
        setRelevantExperiments(exps);
      }
    };
    fetchExperiments();
  }, [currentUser, experimentsByInvestigatorId]);

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
      alert("❌ שגיאה בטעינת קבוצות");
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
      alert("❌ שגיאה בטעינת הצהרות");
    }
  };

  const toggleStatement = (id) => {
    setExpandedStatementId(expandedStatementId === id ? null : id);
  };

  // אם עדיין בודקים אותנטיקציה, הצג טעינה
  if (!isAuthChecked) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "18px",
        }}
      >
        <div>טוען...</div>
      </div>
    );
  }

  if (!currentUser) return null;

  // --- פונקציות CRUD ---
  const handleCreateExperiment = async (e) => {
    e.preventDefault();
    if (!expName.trim()) return alert("נא למלא שם לניסוי");

    const newExp = await addExperiment(expName, expDesc, currentUser._id);
    if (newExp) setRelevantExperiments((prev) => [...prev, newExp]);
    setExpName("");
    setExpDesc("");
    setShowExpForm(false);
  };

  const handleDeleteExperiment = async (experimentId) => {
    if (window.confirm("האם אתה בטוח שברצונך למחוק את הניסוי?")) {
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
    if (!groupName.trim()) return alert("נא למלא שם לקבוצה");
    const newGroup = await addGroup(experimentId, groupName, groupDesc);
    if (newGroup) setGroups((prev) => [...prev, newGroup]);
    setGroupName("");
    setGroupDesc("");
    setShowGroupForm(null);
  };

  const handleDeleteGroup = async (groupId) => {
    if (window.confirm("האם למחוק את הקבוצה?")) {
      const success = await deleteGroup(groupId);
      if (success) setGroups((prev) => prev.filter((g) => g._id !== groupId));
    }
  };

  const handleCreateStatement = async (e, experimentId, groupId) => {
    e.preventDefault();
    if (!statementName.trim() || !statementText.trim())
      return alert("נא למלא את כל השדות");

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
    if (window.confirm("האם למחוק את ההצהרה?")) {
      await deleteStatement(statementId);
      setStatements((prev) => prev.filter((s) => s._id !== statementId));
    }
  };

  const handleDeleteCopy = async (copyId) => {
    if (window.confirm("האם למחוק את העתק?")) await deleteCopy(copyId);
  };

  const handleCreateCopy = async (experimentId, groupId, statementId) => {
    if (!selectedUserIdForCopy) return alert("בחר מקודד קודם");
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
    if (!selectedUserIdForTask) return alert("בחר מקודד קודם");
    const percentStr = window.prompt(
      "כמה אחוז מהצהרות הניסוי לשייך למקודד זה? (0-100)"
    );
    if (!percentStr) return;
    const percent = parseFloat(percentStr);
    if (isNaN(percent) || percent < 0 || percent > 100)
      return alert("אחוזים לא חוקיים. יש להזין מספר בין 0 ל-100");
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
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">הניסויים שלי</h1>

      {!showExpForm ? (
        <button
          onClick={() => setShowExpForm(true)}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          הוסף ניסוי
        </button>
      ) : (
        <form
          onSubmit={handleCreateExperiment}
          className="bg-gray-100 p-4 rounded shadow-md w-80 mb-4"
        >
          <label className="block text-sm font-semibold">שם הניסוי</label>
          <input
            value={expName}
            onChange={(e) => setExpName(e.target.value)}
            className="border w-full mb-2 px-2 py-1 rounded"
          />
          <label className="block text-sm font-semibold">תיאור הניסוי</label>
          <textarea
            value={expDesc}
            onChange={(e) => setExpDesc(e.target.value)}
            className="border w-full mb-2 px-2 py-1 rounded"
          />
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setShowExpForm(false)}
              className="px-3 py-1 bg-gray-300 rounded"
            >
              ביטול
            </button>
            <button
              type="submit"
              className="px-3 py-1 bg-green-500 text-white rounded"
            >
              שמור
            </button>
          </div>
        </form>
      )}

      <ul className="mt-4">
        {relevantExperiments.map((exp) => (
          <li key={exp._id} className="mt-2 border p-2">
            <div className="flex justify-between items-center">
              <div
                onClick={() => toggleExperiment(exp._id)}
                className="cursor-pointer font-semibold hover:text-blue-600"
              >
                {exp.name}
              </div>
              <button
                onClick={() => handleDeleteExperiment(exp._id)}
                className="text-red-500 text-sm ml-2"
              >
                מחק ניסוי
              </button>
            </div>

            {expandedExperimentId === exp._id && (
              <div className="ml-4 mt-2">
                {showGroupForm !== exp._id ? (
                  <button
                    onClick={() => setShowGroupForm(exp._id)}
                    className="text-green-600 text-sm"
                  >
                    הוסף קבוצה
                  </button>
                ) : (
                  <form
                    onSubmit={(e) => handleCreateGroup(e, exp._id)}
                    className="bg-gray-100 p-2 rounded shadow-md w-72 mb-2"
                  >
                    <input
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      placeholder="שם הקבוצה"
                      className="border w-full mb-1 px-2 py-1 rounded text-sm"
                    />
                    <textarea
                      value={groupDesc}
                      onChange={(e) => setGroupDesc(e.target.value)}
                      placeholder="תיאור"
                      className="border w-full mb-1 px-2 py-1 rounded text-sm"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => setShowGroupForm(null)}
                        className="px-2 py-1 bg-gray-300 text-xs rounded"
                      >
                        ביטול
                      </button>
                      <button
                        type="submit"
                        className="px-2 py-1 bg-green-500 text-white text-xs rounded"
                      >
                        שמור
                      </button>
                    </div>
                  </form>
                )}

                {groups.map((group) => (
                  <div key={group._id} className="mt-1 ml-2">
                    <div className="flex justify-between">
                      <div
                        onClick={() => toggleGroup(group._id)}
                        className="cursor-pointer hover:text-blue-600"
                      >
                        {group.name}
                      </div>
                      <button
                        onClick={() => handleDeleteGroup(group._id)}
                        className="text-red-500 text-sm"
                      >
                        מחק קבוצה
                      </button>
                    </div>

                    {expandedGroupId === group._id && (
                      <div className="ml-4 mt-1">
                        {showStatementForm !== group._id ? (
                          <button
                            onClick={() => setShowStatementForm(group._id)}
                            className="text-green-600 text-sm"
                          >
                            הוסף הצהרה
                          </button>
                        ) : (
                          <form
                            onSubmit={(e) =>
                              handleCreateStatement(e, exp._id, group._id)
                            }
                            className="bg-gray-100 p-2 rounded shadow-md w-72 mb-2"
                          >
                            <input
                              value={statementName}
                              onChange={(e) => setStatementName(e.target.value)}
                              placeholder="שם ההצהרה"
                              className="border w-full mb-1 px-2 py-1 rounded text-sm"
                            />
                            <textarea
                              value={statementText}
                              onChange={(e) => setStatementText(e.target.value)}
                              placeholder="תוכן ההצהרה"
                              className="border w-full mb-1 px-2 py-1 rounded text-sm"
                            />
                            <div className="flex justify-end space-x-2">
                              <button
                                type="button"
                                onClick={() => setShowStatementForm(null)}
                                className="px-2 py-1 bg-gray-300 text-xs rounded"
                              >
                                ביטול
                              </button>
                              <button
                                type="submit"
                                className="px-2 py-1 bg-green-500 text-white text-xs rounded"
                              >
                                שמור
                              </button>
                            </div>
                          </form>
                        )}

                        {statements.map((statement) => (
                          <div key={statement._id} className="mt-1 ml-2">
                            <div className="flex justify-between items-center">
                              <div
                                onClick={() => toggleStatement(statement._id)}
                                className="cursor-pointer hover:text-blue-600"
                              >
                                {statement.name}
                              </div>
                              <div className="flex items-center space-x-2">
                                {copiesByStatementId(statement._id).filter(
                                  (copy) => copy.status === "completed"
                                ).length >= 2 && (
                                  <button
                                    onClick={() =>
                                      navigate(`/compare/${statement._id}`)
                                    }
                                    className="text-sm text-blue-500 hover:text-blue-700 underline"
                                  >
                                    השווה קידודים
                                  </button>
                                )}
                                <button
                                  onClick={() =>
                                    navigate(
                                      `/statement-summary/${statement._id}`
                                    )
                                  }
                                  className="text-sm text-green-500 hover:text-green-700 underline"
                                >
                                  סיכום הצהרה
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteStatement(statement._id)
                                  }
                                  className="text-red-500 text-sm"
                                >
                                  מחק הצהרה
                                </button>
                              </div>
                            </div>

                            {expandedStatementId === statement._id && (
                              <div className="ml-4 mt-1">
                                <select
                                  value={selectedUserIdForCopy}
                                  onChange={(e) =>
                                    setSelectedUserIdForCopy(e.target.value)
                                  }
                                  className="border text-sm px-2 py-1 rounded"
                                >
                                  <option value="">בחר מקודד</option>
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
                                  className="text-green-600 text-sm ml-2"
                                >
                                  הוסף העתק
                                </button>

                                {copiesByStatementId(statement._id).map(
                                  (copy) => (
                                    <div
                                      key={copy._id}
                                      className="flex justify-between items-center ml-2"
                                    >
                                      <div
                                        onClick={() => {
                                          if (copy.status === "completed")
                                            navigate(
                                              `/view-statement/${copy._id}`
                                            );
                                          else
                                            alert(
                                              "לא ניתן לצפות בהצהרה לפני שהקידוד הושלם"
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
                                        )?.username || "לא ידוע"}
                                      </div>
                                      <div className="flex items-center space-x-2">
                                        <button
                                          onClick={() =>
                                            navigate(`/copy-chat/${copy._id}`)
                                          }
                                          className="text-blue-500 text-xs"
                                        >
                                          צ'אט
                                        </button>
                                        <span className="text-xs text-red-600">
                                          (
                                          {getUnreadCount(
                                            copy._id,
                                            currentUser._id
                                          )}{" "}
                                          לא נקראו)
                                        </span>
                                        <button
                                          onClick={() =>
                                            handleDeleteCopy(copy._id)
                                          }
                                          className="text-red-500 text-xs"
                                        >
                                          מחק העתק
                                        </button>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            )}
                          </div>
                        ))}

                        <div className="mt-2">
                          <select
                            value={selectedUserIdForTask}
                            onChange={(e) =>
                              setSelectedUserIdForTask(e.target.value)
                            }
                            className="border text-sm px-2 py-1 rounded"
                          >
                            <option value="">בחר מקודד למשימה</option>
                            {users.map((user) => (
                              <option key={user._id} value={user._id}>
                                {user.username}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleCreateTask(exp._id)}
                            className="bg-purple-500 text-white px-2 py-1 rounded text-sm ml-2"
                          >
                            צור משימה לניסוי
                          </button>
                        </div>
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
