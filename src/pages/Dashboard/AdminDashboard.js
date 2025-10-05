import React, { useState, useEffect } from "react";
import { useExperiment } from "../../context/ExperimentContext";
import { useGroup } from "../../context/GroupContext";
import { useStatement } from "../../context/StatementContext";
import { useCopy } from "../../context/CopyContext";
import { useData } from "../../context/DataContext";
import { useNavigate } from "react-router-dom";
import { useCopyMessage } from "../../context/CopyMessageContext";

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
    // Only after authentication check is completed
    if (isAuthChecked && !currentUser) {
      navigate("/", { replace: true });
    }
  }, [currentUser, isAuthChecked, navigate]);

  // Load experiments
  useEffect(() => {
    const loadExperiments = async () => {
      try {
        const data = await fetchExperiments();
        const dataWithInvestigatorNames = await Promise.all(
          data.map(async (exp) => {
            const name = await investigatorNameByExperimentId(exp._id);
            return { ...exp, investigatorName: name || "Unknown" };
          })
        );
        setExperiments(dataWithInvestigatorNames);
      } catch {
        alert("❌ Error loading experiments");
      }
    };
    loadExperiments();
  }, [fetchExperiments, investigatorNameByExperimentId]);

  // If still checking authentication, show loading
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
        <div>Loading...</div>
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
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">
        Experiment Management (Read Only)
      </h1>

      <ul className="mt-4">
        {experiments.map((exp) => (
          <li key={exp._id} className="mt-2 border p-2">
            <div
              onClick={() => toggleExperiment(exp._id)}
              className="cursor-pointer font-semibold hover:text-blue-600"
            >
              {exp.name}
              <span className="text-sm text-gray-500">
                {" "}
                (Investigator: {exp.investigatorName || "Unknown"})
              </span>
            </div>

            {expandedExperimentId === exp._id && (
              <div className="ml-4 mt-2">
                {groups.map((group) => (
                  <div key={group._id} className="mt-1 ml-2">
                    <div
                      onClick={() => toggleGroup(group._id)}
                      className="cursor-pointer hover:text-blue-600"
                    >
                      {group.name}
                    </div>

                    {expandedGroupId === group._id && (
                      <div className="ml-4 mt-1">
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
                                    Compare Codings
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
                                  Statement Summary
                                </button>
                              </div>
                            </div>

                            {expandedStatementId === statement._id && (
                              <div className="ml-4 mt-1">
                                {copiesByStatementId(statement._id).map(
                                  (copy) => (
                                    <div
                                      key={copy._id}
                                      className="flex justify-between items-center ml-2"
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
                                        <button
                                          onClick={() =>
                                            navigate(`/copy-chat/${copy._id}`)
                                          }
                                          className="text-blue-500 text-xs"
                                        >
                                          Chat
                                        </button>

                                        <span className="text-xs text-red-600">
                                          (
                                          {getUnreadCount(
                                            copy._id,
                                            currentUser?._id
                                          )}{" "}
                                          unread)
                                        </span>
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
