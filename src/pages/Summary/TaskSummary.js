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
import { fetchGroupById } from "../../api/GroupApi";
import { FaChartBar, FaFileExcel, FaArrowLeft, FaUser } from "react-icons/fa";
import "../../styles/Dashboard.css";

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
  const [groupsCache, setGroupsCache] = useState({});
  const [experiment, setExperiment] = useState(null);

  // Load style settings
  useEffect(() => {
    const loadStyle = async () => {
      const data = await getStyleSetting();
      setStyleSettings(data);
    };
    loadStyle();
  }, [getStyleSetting]);

  // Load colors
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

  // Get task and copies
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

  // Load statements asynchronously
  useEffect(() => {
    const loadStatements = async () => {
      if (copies.length === 0) return;

      setStatementsCache((prevCache) => {
        const newCache = { ...prevCache };
        const missingStatements = copies.filter(
          (c) => !newCache[c.statementId]
        );

        // If everything exists already, no need to update
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

  // Load groups asynchronously
  useEffect(() => {
    const loadGroups = async () => {
      if (Object.keys(statementsCache).length === 0) return;

      const uniqueGroupIds = [
        ...new Set(
          Object.values(statementsCache)
            .map((stmt) => stmt.groupId)
            .filter(Boolean)
        ),
      ];

      for (const groupId of uniqueGroupIds) {
        if (!groupsCache[groupId]) {
          try {
            const group = await fetchGroupById(groupId);
            if (group) {
              setGroupsCache((prev) => ({
                ...prev,
                [groupId]: group,
              }));
            }
          } catch (error) {
            console.error(`Error loading group ${groupId}:`, error);
          }
        }
      }
    };

    loadGroups();
  }, [statementsCache, groupsCache]);

  if (!task) return <div>Task not found</div>;

  // Check all codes found in colorCounts
  const colorCodesFromCopies = new Set();
  copies.forEach((copy) => {
    Object.keys(copy.colorCounts || {}).forEach((code) =>
      colorCodesFromCopies.add(code)
    );
  });

  // Define styles from styleSettings
  const commonStyles = [];
  if (styleSettings.boldEnabled)
    commonStyles.push({ key: "bold", label: styleSettings.boldName || "Bold" });
  if (styleSettings.italicEnabled)
    commonStyles.push({
      key: "italic",
      label: styleSettings.italicName || "Italic",
    });
  if (styleSettings.underlineEnabled)
    commonStyles.push({
      key: "underline",
      label: styleSettings.underlineName || "Underline",
    });
  const styleKeys = commonStyles.map((s) => s.key);

  // Build allColors
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

  // Helper function to get export metadata
  const getExportMetadata = () => {
    const coder = users.find((u) => u._id === task.coderId);
    const coderName = coder?.username || "Unknown";
    const experimentName = experiment?.name || "Unknown";
    const exportDate = new Date()
      .toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\//g, "-");
    return { coderName, experimentName, exportDate };
  };

  // Export to Excel function
  const handleExportToExcel = () => {
    try {
      if (!task || !experiment || copies.length === 0) {
        alert("Cannot export: Missing data");
        return;
      }

      const { coderName, experimentName, exportDate } = getExportMetadata();

      // Prepare data for Codings sheet
      const codingsData = [];

      // Header row
      const codingsHeader = [
        "Statement",
        "Experiment Condition",
        ...allColors.map((c) => c.name),
        ...commonStyles.map((s) => s.label),
      ];
      codingsData.push(codingsHeader);

      // Data rows
      copies.forEach((copy) => {
        const statement = statementsCache[copy.statementId];
        const group = statement?.groupId
          ? groupsCache[statement.groupId]
          : null;
        const row = [
          statement?.name || "No name",
          group?.name || "No group",
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
        "Experiment Condition",
        "Word Count",
        ...allColors.map((c) => c.name),
        ...commonStyles.map((s) => s.label),
      ];
      wordsData.push(wordsHeader);

      // Data rows
      copies.forEach((copy) => {
        const statement = statementsCache[copy.statementId];
        const group = statement?.groupId
          ? groupsCache[statement.groupId]
          : null;
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
          group?.name || "No group",
          wordCounts?.total || 0,
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
    } catch (error) {
      console.error("❌ Excel export error:", error);
      alert(`Export failed: ${error.message}`);
    }
  };

  const renderTable = (type) => (
    <div className="dashboard-card" style={{ marginBottom: "20px" }}>
      <h3 className="card-title" style={{ marginBottom: "20px" }}>
        {type === "marks" ? "Codings" : "Words"}
      </h3>
      <div style={{ overflowX: "auto" }}>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Statement</th>
              <th>Experiment Condition</th>
              {type === "words" && <th>Word Count</th>}
              {allColors.map((c) => (
                <th
                  key={`${type}-${c._id}`}
                  style={{
                    backgroundColor: c.code,
                    color: (() => {
                      const hex = c.code.replace("#", "");
                      const r = parseInt(hex.substr(0, 2), 16);
                      const g = parseInt(hex.substr(2, 2), 16);
                      const b = parseInt(hex.substr(4, 2), 16);
                      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
                      return brightness > 155 ? "#000000" : "#FFFFFF";
                    })(),
                  }}
                >
                  {c.name}
                </th>
              ))}
              {commonStyles.map((s) => (
                <th
                  key={s.key}
                  style={{
                    fontWeight: s.key === "bold" ? "bold" : "normal",
                    fontStyle: s.key === "italic" ? "italic" : "normal",
                    textDecoration: s.key === "underline" ? "underline" : "none",
                  }}
                >
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {copies.map((copy) => {
              const statement = statementsCache[copy.statementId];
              const group = statement?.groupId
                ? groupsCache[statement.groupId]
                : null;
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
                  <td>{statement?.name || "No name"}</td>
                  <td>{group?.name || "No group"}</td>
                  {type === "words" && <td>{wordCounts?.total || 0}</td>}
                  {allColors.map((c) => (
                    <td key={`val-${copy._id}-${c._id}`}>
                      {type === "marks"
                        ? copy.colorCounts?.[c.code] || 0
                        : wordCounts?.[c.code] || 0}
                    </td>
                  ))}
                  {commonStyles.map((s) => (
                    <td key={`style-${copy._id}-${s.key}`}>
                      {type === "marks"
                        ? copy.colorCounts?.[s.key] || 0
                        : wordCounts?.[s.key] || 0}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const coder = users.find((u) => u._id === task.coderId);
  const coderName = coder?.username || "Unknown";

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            <FaChartBar /> Task Summary
          </h1>
          <p className="dashboard-subtitle">
            <FaUser style={{ marginRight: "8px" }} />
            Coder: {coderName}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {copies.length === 0 && (
            <div className="auth-message error" style={{ margin: 0 }}>
              ⚠️ No completed copies to export. Please complete at least one
              copy first.
            </div>
          )}
          <button
            onClick={handleExportToExcel}
            className="dashboard-btn btn-success"
            disabled={!task || !experiment || copies.length === 0}
            style={{
              opacity: !task || !experiment || copies.length === 0 ? 0.5 : 1,
              cursor:
                !task || !experiment || copies.length === 0
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            <FaFileExcel /> Export to Excel
          </button>
          <button onClick={() => navigate(-1)} className="dashboard-btn">
            <FaArrowLeft /> Back
          </button>
        </div>
      </div>

      {renderTable("marks")}
      {renderTable("words")}
    </div>
  );
}
