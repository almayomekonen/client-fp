import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCopy } from "../../context/CopyContext";
import { useStatement } from "../../context/StatementContext";
import { useData } from "../../context/DataContext";
import { useExperiment } from "../../context/ExperimentContext";
import { useCopyMessage } from "../../context/CopyMessageContext";
import { useComparison } from "../../context/ComparisonContext";

export default function CoderHomePage() {
  const navigate = useNavigate();
  const { currentUser, isAuthChecked } = useData();
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

  useEffect(() => {
    if (isAuthChecked && !currentUser) {
      navigate("/", { replace: true });
    }
  }, [currentUser, isAuthChecked, navigate]);

  useEffect(() => {
    const fetchComparisons = async () => {
      const coderCopies = copiesForExperimentByCoderId(
        currentUser?._id
      ).flatMap((c) => c.copies);
      const map = {};
      for (const copy of coderCopies) {
        const comparisons = await getComparisonsForCopy(copy._id);
        map[copy._id] = comparisons;
      }
      setComparisonsMap(map);
    };

    if (currentUser) fetchComparisons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Load experiment information
  useEffect(() => {
    const fetchExperimentsInfo = async () => {
      const coderCopiesByExperiment = copiesForExperimentByCoderId(
        currentUser?._id
      );
      const map = {};
      for (const { experiment } of coderCopiesByExperiment) {
        if (!experiment) continue;
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
          console.warn(`Cannot load experiment ${experiment._id}:`, err);
        }
      }
      setExperimentsMap(map);
    };

    if (currentUser) fetchExperimentsInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Load statements asynchronously
  useEffect(() => {
    const fetchStatements = async () => {
      const coderCopies = copiesForExperimentByCoderId(
        currentUser?._id
      ).flatMap((c) => c.copies);
      const map = {};
      for (const copy of coderCopies) {
        if (!map[copy.statementId]) {
          const stmt = await statementById(copy.statementId);
          if (stmt) map[copy.statementId] = stmt;
        }
      }
      setStatementsMap(map);
    };

    if (currentUser) fetchStatements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

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

  const coderCopiesByExperiment = copiesForExperimentByCoderId(
    currentUser?._id
  );

  const handleUpdateCopyStatus = async (copyId, copyStatus) => {
    await removeAllComparisons(copyId);
    await updateCopyStatus(copyId, copyStatus);
    setComparisonsMap((prev) => ({ ...prev, [copyId]: [] }));
  };

  return (
    <div style={{ direction: "rtl", padding: 20 }}>
      <h1>Welcome, {currentUser?.username}</h1>
      <h2>Your Experiments:</h2>

      {coderCopiesByExperiment.length === 0 ? (
        <p>No experiments found for you.</p>
      ) : (
        coderCopiesByExperiment.map(({ experiment, copies }) => {
          const expInfo = experimentsMap[experiment._id] || {};
          const experimentName = expInfo.name;
          const investigatorName = expInfo.investigatorName;
          const completion = calculateCompletionPercentage(copies);
          const lastUpdate = getLastUpdateDate(copies);

          return (
            <div key={experiment._id} style={{ marginBottom: 30 }}>
              <h3>
                {experimentName} –{" "}
                <span style={{ fontSize: "0.9em", color: "gray" }}>
                  Completion: {completion}% | Last Update: {lastUpdate || "—"} |
                  Investigator: {investigatorName}
                </span>
              </h3>
              <ul>
                {copies.map((copy) => {
                  const statement = statementsMap[copy.statementId];
                  const unreadCount = getUnreadCount(
                    copy._id,
                    currentUser?._id
                  );
                  const comparisonsForThisCopy = comparisonsMap[copy._id] || [];

                  return (
                    <li
                      key={copy._id}
                      style={{
                        margin: "10px 0",
                        padding: 10,
                        border: "1px solid #ccc",
                        borderRadius: 5,
                      }}
                    >
                      <div>
                        <strong>Statement:</strong>{" "}
                        {statement?.name || "Loading..."}
                        <br />
                        <strong>Progress:</strong> {copy.status}
                        <br />
                        <strong>Last Update:</strong>{" "}
                        {copy.lastUpdate
                          ? new Date(copy.lastUpdate).toLocaleString()
                          : "—"}
                      </div>

                      {copy.status === "in progress" && (
                        <>
                          <button
                            onClick={() =>
                              navigate(`/edit-statement/${copy._id}`)
                            }
                            style={{ marginTop: 8, marginLeft: 10 }}
                          >
                            Edit Statement
                          </button>

                          <button
                            onClick={() => navigate(`/copy-chat/${copy._id}`)}
                            style={{
                              marginTop: 8,
                              backgroundColor: "#3b82f6",
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              padding: "4px 10px",
                              marginRight: 10,
                            }}
                          >
                            Chat
                            {unreadCount > 0 && (
                              <span
                                style={{ marginRight: 5, color: "#f87171" }}
                              >
                                ({unreadCount})
                              </span>
                            )}
                          </button>
                        </>
                      )}

                      {copy.status === "completed" && (
                        <>
                          <button
                            onClick={async () => {
                              handleUpdateCopyStatus(copy._id, "in progress");
                              alert(
                                "Coding marked as incomplete. You can edit again."
                              );
                            }}
                            style={{
                              marginTop: 8,
                              backgroundColor: "#fcd34d",
                              color: "black",
                              border: "1px solid #aaa",
                              borderRadius: 4,
                              padding: "4px 8px",
                              marginRight: 10,
                            }}
                          >
                            Fix Coding
                          </button>

                          <button
                            onClick={() => navigate(`/copy-chat/${copy._id}`)}
                            style={{
                              marginTop: 8,
                              backgroundColor: "#3b82f6",
                              color: "white",
                              border: "none",
                              borderRadius: 4,
                              padding: "4px 10px",
                              marginRight: 10,
                            }}
                          >
                            Chat
                            {unreadCount > 0 && (
                              <span
                                style={{ marginRight: 5, color: "#f87171" }}
                              >
                                ({unreadCount})
                              </span>
                            )}
                          </button>

                          {comparisonsForThisCopy.length > 0 && (
                            <button
                              onClick={() =>
                                navigate(`/coder-compare/${copy._id}`)
                              }
                              style={{
                                marginTop: 8,
                                backgroundColor: "#4ade80",
                                color: "white",
                                border: "none",
                                borderRadius: 4,
                                padding: "4px 10px",
                                marginRight: 10,
                              }}
                            >
                              Compare with Copies
                            </button>
                          )}
                        </>
                      )}
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
