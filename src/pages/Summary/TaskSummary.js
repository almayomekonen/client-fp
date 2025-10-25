import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { useTask } from "../../context/TaskContext";
import { useCopy } from "../../context/CopyContext";
import { useStatement } from "../../context/StatementContext";
import { useEdit } from "../../context/EditContext";
import { useResult } from "../../context/ResultContext";
import { useColor } from "../../context/ColorContext";
import { useStyleSetting } from "../../context/StyleSettingContext";
import { useExperiment } from "../../context/ExperimentContext";
import { useData } from "../../context/DataContext";

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
  const { experimentById } = useExperiment();
  const { users } = useData();

  const [styleSettings, setStyleSettings] = useState({});
  const [colors, setColors] = useState([]);
  const [task, setTask] = useState(null);
  const [copies, setCopies] = useState([]);
  const [statementsCache, setStatementsCache] = useState({});
  const [experiment, setExperiment] = useState(null);

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
    const loadTaskData = async () => {
      const t = taskById(taskId);
      setTask(t || null);
      if (t) {
        const completedCopies = t.copiesId
          .map(copyById)
          .filter((copy) => copy.status === "completed");
        setCopies(completedCopies);

        // Load experiment
        if (t.experimentId) {
          const exp = await experimentById(t.experimentId);
          setExperiment(exp);
        }
      }
    };
    loadTaskData();
  }, [taskById, copyById, taskId, experimentById]);

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

  // Export to Excel function
  const handleExportToExcel = () => {
    if (!task || !experiment || copies.length === 0) {
      alert("Cannot export: Missing data");
      return;
    }

    // Get coder name from task
    const coder = users.find((u) => u._id === task.coderId);
    const coderName = coder?.username || "Unknown";
    const experimentName = experiment.name || "Unknown";
    const exportDate = new Date()
      .toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\//g, "-");

    // Prepare data for Codings sheet
    const codingsData = [];

    // Header row
    const codingsHeader = [
      "Statement",
      ...allColors.map((c) => c.name),
      ...commonStyles.map((s) => s.label),
    ];
    codingsData.push(codingsHeader);

    // Data rows
    copies.forEach((copy) => {
      const statement = statementsCache[copy.statementId];
      const row = [
        statement?.name || "No name",
        ...allColors.map((c) => copy.colorCounts?.[c.code] || 0),
        ...commonStyles.map((s) => copy.colorCounts?.[s.key] || 0),
      ];
      codingsData.push(row);
    });

    // Prepare data for Words sheet
    const wordsData = [];

    // Header row
    const wordsHeader = [
      "Statement",
      ...allColors.map((c) => c.name),
      ...commonStyles.map((s) => s.label),
    ];
    wordsData.push(wordsHeader);

    // Data rows
    copies.forEach((copy) => {
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

      const row = [
        statement?.name || "No name",
        ...allColors.map((c) => wordCounts?.[c.code] || 0),
        ...commonStyles.map((s) => wordCounts?.[s.key] || 0),
      ];
      wordsData.push(row);
    });

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create Codings sheet
    const codingsSheet = XLSX.utils.aoa_to_sheet(codingsData);
    XLSX.utils.book_append_sheet(wb, codingsSheet, "Codings");

    // Create Words sheet
    const wordsSheet = XLSX.utils.aoa_to_sheet(wordsData);
    XLSX.utils.book_append_sheet(wb, wordsSheet, "Words");

    // Generate filename
    const filename = `${experimentName} - ${coderName} - ${exportDate}.xlsx`;

    // Save file
    XLSX.writeFile(wb, filename);
  };

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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <h2>Task Summary</h2>
        <button
          onClick={handleExportToExcel}
          style={{
            padding: "10px 20px",
            backgroundColor: "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: "bold",
          }}
          disabled={!task || !experiment || copies.length === 0}
        >
          📊 Export to Excel
        </button>
      </div>
      <h3>Codings</h3>
      {renderTable("marks")}
      <h3>Words</h3>
      {renderTable("words")}
      <button style={{ marginTop: 20 }} onClick={() => navigate(-1)}>
        Back
      </button>
    </div>
  );
}
