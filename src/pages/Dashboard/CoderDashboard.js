import React, { useEffect, useState, useRef } from "react";
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

  // Use refs to track what we've already fetched
  const fetchedComparisons = useRef(new Set());
  const fetchedExperiments = useRef(new Set());
  const fetchedStatements = useRef(new Set());
  const hasFetched = useRef(false);

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
      const promises = [];

      coderCopies.forEach((copy) => {
        if (!fetchedComparisons.current.has(copy._id)) {
          fetchedComparisons.current.add(copy._id);
          promises.push(
            getComparisonsForCopy(copy._id).then((comparisons) => {
              map[copy._id] = comparisons;
            })
          );
        }
      });

      if (promises.length > 0) {
        await Promise.all(promises);
        setComparisonsMap((prev) => ({ ...prev, ...map }));
      }
    };

    if (currentUser && !hasFetched.current) {
      hasFetched.current = true;
      fetchComparisons();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?._id]);

  // טען מידע על ניסויים
  useEffect(() => {
    const fetchExperimentsInfo = async () => {
      const coderCopiesByExperiment = copiesForExperimentByCoderId(
        currentUser?._id
      );
      const map = {};
      const promises = [];

      coderCopiesByExperiment.forEach(({ experiment }) => {
        if (!experiment || fetchedExperiments.current.has(experiment._id))
          return;

        fetchedExperiments.current.add(experiment._id);
        promises.push(
          (async () => {
            try {
              const expData = await experimentById(experiment._id);
              const investigatorName = await investigatorNameByExperimentId(
                experiment._id
              );
              map[experiment._id] = {
                name: expData?.name || `ניסוי ${experiment._id}`,
                investigatorName: investigatorName || "לא ידוע",
              };
            } catch (err) {
              console.warn(`לא ניתן לטעון ניסוי ${experiment._id}:`, err);
            }
          })()
        );
      });

      if (promises.length > 0) {
        await Promise.all(promises);
        setExperimentsMap((prev) => ({ ...prev, ...map }));
      }
    };

    if (currentUser) fetchExperimentsInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?._id]);

  // טען הצהרות אסינכרוני
  useEffect(() => {
    const fetchStatements = async () => {
      const coderCopies = copiesForExperimentByCoderId(
        currentUser?._id
      ).flatMap((c) => c.copies);
      const map = {};
      const promises = [];

      coderCopies.forEach((copy) => {
        if (!fetchedStatements.current.has(copy.statementId)) {
          fetchedStatements.current.add(copy.statementId);
          promises.push(
            statementById(copy.statementId).then((stmt) => {
              if (stmt) map[copy.statementId] = stmt;
            })
          );
        }
      });

      if (promises.length > 0) {
        await Promise.all(promises);
        setStatementsMap((prev) => ({ ...prev, ...map }));
      }
    };

    if (currentUser) fetchStatements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?._id]);

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
      <h1>ברוך הבא, {currentUser?.username}</h1>
      <h2>הניסויים שלך:</h2>

      {coderCopiesByExperiment.length === 0 ? (
        <p>לא נמצאו ניסויים עבורך.</p>
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
                  השלמה: {completion}% | עדכון אחרון: {lastUpdate || "—"} |
                  חוקר: {investigatorName}
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
                        <strong>הצהרה:</strong> {statement?.name || "טוען..."}
                        <br />
                        <strong>התקדמות:</strong> {copy.status}
                        <br />
                        <strong>עדכון אחרון:</strong>{" "}
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
                            ערוך הצהרה
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
                            צ'אט
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
                              alert("הקידוד סומן כלא הושלם. תוכל לערוך שוב.");
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
                            תקן קידוד
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
                            צ'אט
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
                              השווה עם עותקים
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
