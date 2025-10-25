import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTask } from "../../context/TaskContext";
import { useCopy } from "../../context/CopyContext";
import { useStatement } from "../../context/StatementContext";
import { useEdit } from "../../context/EditContext";
import { useResult } from "../../context/ResultContext";
import { useColor } from "../../context/ColorContext";
import { useStyleSetting } from "../../context/StyleSettingContext";

export default function TaskSummary() {
  const { taskId } = useParams();
  const navigate = useNavigate();

  const { taskById } = useTask();
  const { copyById } = useCopy();
  const { statementById } = useStatement();
  const { applyHighlightsToText } = useEdit();
  const { calculateWordCounts } = useResult();
  const { getColors } = useColor();
  const { getStyleSetting } = useStyleSetting();

  const [styleSettings, setStyleSettings] = useState({});
  const [colors, setColors] = useState([]);
  const [task, setTask] = useState(null);
  const [copies, setCopies] = useState([]);
  const [statementsCache, setStatementsCache] = useState({});

  // טעינת סגנון
  useEffect(() => {
    const loadStyle = async () => {
      const data = await getStyleSetting();
      setStyleSettings(data);
    };
    loadStyle();
  }, [getStyleSetting]);

  // טעינת צבעים
  useEffect(() => {
    const loadColors = async () => {
      try {
        const data = await getColors();
        setColors(data);
      } catch (err) {
        alert("❌ Error loading colors");
      }
    };
    loadColors();
  }, [getColors]);

  // קבלת משימה ועותקים
  useEffect(() => {
    const t = taskById(taskId);
    setTask(t || null);
    if (t) {
      const completedCopies = t.copiesId
        .map(copyById)
        .filter((copy) => copy.status === "completed");
      setCopies(completedCopies);
    }
  }, [taskById, copyById, taskId]);

  // טעינת הצהרות אסינכרונית
  useEffect(() => {
    const loadStatements = async () => {
      if (copies.length === 0) return;

      setStatementsCache((prevCache) => {
        const newCache = { ...prevCache };
        const missingStatements = copies.filter(
          (c) => !newCache[c.statementId]
        );

        // אם הכל כבר קיים – אין צורך לעדכן
        if (missingStatements.length === 0) return prevCache;

        (async () => {
          for (const copy of missingStatements) {
            const stmt = await statementById(copy.statementId);
            if (stmt) {
              setStatementsCache((prev) => ({
                ...prev,
                [copy.statementId]: stmt,
              }));
            }
          }
        })();

        return newCache;
      });
    };

    loadStatements();
  }, [copies, statementById]);

  if (!task) return <div>Task not found</div>;

  // בודקים את כל הקודים שנמצאים ב-colorCounts
  const colorCodesFromCopies = new Set();
  copies.forEach((copy) => {
    Object.keys(copy.colorCounts || {}).forEach((code) =>
      colorCodesFromCopies.add(code)
    );
  });

  // מגדירים סגנונות מה-styleSettings
  const commonStyles = [];
  if (styleSettings.boldEnabled) commonStyles.push({ key: "bold", label: "B" });
  if (styleSettings.italicEnabled)
    commonStyles.push({ key: "italic", label: "I" });
  if (styleSettings.underlineEnabled)
    commonStyles.push({ key: "underline", label: "U" });
  const styleKeys = commonStyles.map((s) => s.key);

  // בונים את allColors
  const allColors = [
    ...colors,
    ...Array.from(colorCodesFromCopies)
      .filter((code) => !colors.some((c) => c.code === code))
      .map((code) => ({
        _id: code,
        code,
        name: styleKeys.includes(code) ? null : code,
      })),
  ].filter((c) => c.name !== null);

  const renderTable = (type) => (
    <div style={{ overflowX: "auto", marginBottom: 30 }}>
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          textAlign: "center",
          minWidth: 600,
        }}
      >
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>
              Statement
            </th>
            {allColors.map((c) => (
              <th
                key={`${type}-${c._id}`}
                style={{
                  border: "1px solid #ccc",
                  padding: "8px",
                  backgroundColor: c.code,
                }}
              >
                {c.name}
              </th>
            ))}
            {commonStyles.map((s) => (
              <th
                key={s.key}
                style={{ border: "1px solid #ccc", padding: "8px" }}
              >
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {copies.map((copy) => {
            const statement = statementsCache[copy.statementId];
            const baseText = statement?.text || [
              { type: "paragraph", children: [{ text: "" }] },
            ];
            const decoratedText = applyHighlightsToText(
              baseText,
              copy.highlights || [],
              [],
              []
            );
            const wordCounts = calculateWordCounts(decoratedText);

            return (
              <tr key={copy._id}>
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  {statement?.name || "No name"}
                </td>
                {allColors.map((c) => (
                  <td
                    key={`val-${copy._id}-${c._id}`}
                    style={{ border: "1px solid #ccc", padding: "8px" }}
                  >
                    {type === "marks"
                      ? copy.colorCounts?.[c.code] || 0
                      : wordCounts?.[c.code] || 0}
                  </td>
                ))}
                {commonStyles.map((s) => (
                  <td
                    key={`style-${copy._id}-${s.key}`}
                    style={{ border: "1px solid #ccc", padding: "8px" }}
                  >
                    {copy.colorCounts?.[s.key] || 0}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <div style={{ padding: 20, direction: "rtl" }}>
      <h2>Task Summary</h2>
      <h3>Symbols</h3>
      {renderTable("marks")}
      <h3>Words</h3>
      {renderTable("words")}
      <button style={{ marginTop: 20 }} onClick={() => navigate(-1)}>
        Back
      </button>
    </div>
  );
}
