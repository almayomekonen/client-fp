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
  const [statements, setStatements] = useState([]); // ← state חדש להצהרות
  const [expandedExperimentId, setExpandedExperimentId] = useState(null);
  const [expandedGroupId, setExpandedGroupId] = useState(null);
  const [expandedStatementId, setExpandedStatementId] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    // רק אחרי שבדיקת האותנטיקציה הושלמה
    if (isAuthChecked && !currentUser) {
      navigate("/", { replace: true });
    }
  }, [currentUser, isAuthChecked, navigate]);

  // טעינת ניסויים
  useEffect(() => {
    const loadExperiments = async () => {
      try {
        const data = await fetchExperiments();
        const dataWithInvestigatorNames = await Promise.all(
          data.map(async (exp) => {
            const name = await investigatorNameByExperimentId(exp._id);
            return { ...exp, investigatorName: name || "לא ידוע" };
          })
        );
        setExperiments(dataWithInvestigatorNames);
      } catch {
        alert("❌ שגיאה בטעינת ניסויים");
      }
    };
    loadExperiments();
  }, [fetchExperiments, investigatorNameByExperimentId]);

  // אם עדיין בודקים אותנטיקציה, הצג טעינה
  if (!isAuthChecked) {
    return (
      <div className="loading-container">
        <div>טוען</div>
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (!currentUser) return null;

  // פתיחת/סגירת ניסוי
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

  // פתיחת/סגירת קבוצה → טענת הצהרות מהשרת
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
      alert("❌ שגיאה בטעינת הצהרות");
    }
  };

  const toggleStatement = (id) => {
    setExpandedStatementId(expandedStatementId === id ? null : id);
  };

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          <FaMicroscope /> ניהול ניסויים
        </h1>
        <p className="dashboard-subtitle">צפייה וניהול של כל הניסויים במערכת</p>
      </div>

      {experiments.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📊</div>
          <p className="empty-state-text">אין ניסויים במערכת</p>
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
                    חוקר: {exp.investigatorName || "לא ידוע"}
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
                                      <FaBalanceScale /> השווה קידודים
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
                                    <FaChartLine /> סיכום הצהרה
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
                                                "לא ניתן לצפות בהצהרה לפני שהקידוד הושלם"
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
                                          )?.username || "לא ידוע"}
                                        </div>

                                        <div className="copy-actions">
                                          <button
                                            onClick={() =>
                                              navigate(`/copy-chat/${copy._id}`)
                                            }
                                            className="btn-dashboard btn-chat"
                                          >
                                            <FaComments /> צ'אט
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
