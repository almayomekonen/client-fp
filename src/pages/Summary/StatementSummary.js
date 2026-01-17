import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import { useCopy } from "../../context/CopyContext";
import { useStatement } from "../../context/StatementContext";
import { useEdit } from "../../context/EditContext";
import { useUsers } from "../../context/UserContext";
import { useResult } from "../../context/ResultContext";
import { useColor } from "../../context/ColorContext";
import { useStyleSetting } from "../../context/StyleSettingContext";
import { useExperiment } from "../../context/ExperimentContext";
import { fetchGroupById } from "../../api/GroupApi";
import { FaChartBar, FaFileExcel, FaArrowLeft, FaFileAlt } from "react-icons/fa";
import "../../styles/Dashboard.css";

export default function StatementSummary() {
  const { statementId } = useParams();
  const navigate = useNavigate();

  const { statementById } = useStatement();
  const { copiesByStatementId } = useCopy();
  const { applyHighlightsToText } = useEdit();
  const { calculateWordCounts } = useResult();
  const { userById } = useUsers();
  const { getStyleSetting } = useStyleSetting();
  const { getColors } = useColor();
  const { experimentById } = useExperiment();

  const [styleSettings, setStyleSettings] = useState({});
  const [colors, setColors] = useState([]);
  const [statement, setStatement] = useState(null);
  const [copies, setCopies] = useState([]);
  const [experiment, setExperiment] = useState(null);
  const [group, setGroup] = useState(null);

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

  // Load statement and copies
  useEffect(() => {
    const loadData = async () => {
      const stmt = await statementById(statementId);
      setStatement(stmt || null);
      if (stmt) {
        const completedCopies = copiesByStatementId(statementId).filter(
          (copy) => copy.status === "completed"
        );
        setCopies(completedCopies);

        // Load experiment
        if (stmt.experimentId) {
          const exp = await experimentById(stmt.experimentId);
          setExperiment(exp);
        }

        // Load group
        if (stmt.groupId) {
          try {
            const grp = await fetchGroupById(stmt.groupId);
            setGroup(grp);
          } catch (error) {
            console.error("Error loading group:", error);
          }
        }
      }
    };
    loadData();
  }, [statementId, statementById, copiesByStatementId, experimentById]);

  if (!statement) return <div>Statement not found</div>;

  // Combine all colors from both list and copies
  const colorCodesFromCopies = new Set();
  copies.forEach((copy) => {
    Object.keys(copy.colorCounts || {}).forEach((code) =>
      colorCodesFromCopies.add(code)
    );
  });

  // Styles enabled in styleSettings
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

  // Build allColors: remove styles enabled in styleSettings
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
    const experimentName = experiment?.name || "Unknown";
    const statementName = statement?.name || "Unknown";
    const exportDate = new Date()
      .toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\//g, "-");
    return { experimentName, statementName, exportDate };
  };

  // Export to Excel function
  const handleExportToExcel = () => {
    try {
      if (!statement || !experiment || copies.length === 0) {
        alert("Cannot export: Missing data");
        return;
      }

      const { experimentName, statementName, exportDate } = getExportMetadata();

      // Prepare data for Codings sheet
      const codingsData = [];

      // Header row
      const codingsHeader = [
        "Coder",
        "Experiment Condition",
        ...allColors.map((c) => c.name),
        ...commonStyles.map((s) => s.label),
      ];
      codingsData.push(codingsHeader);

      // Data rows
      copies.forEach((copy) => {
        const coder = userById(copy.coderId);
        const row = [
          coder?.username || "No name",
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
        "Coder",
        "Experiment Condition",
        ...allColors.map((c) => c.name),
        ...commonStyles.map((s) => s.label),
      ];
      wordsData.push(wordsHeader);

      // Data rows
      copies.forEach((copy) => {
        const coder = userById(copy.coderId);
        const baseText = statement.text;
        const highlights = copy?.highlights || [];
        const decoratedText = applyHighlightsToText(
          baseText,
          highlights,
          [],
          []
        );
        const wordCounts = calculateWordCounts(decoratedText);

        const row = [
          coder?.username || "No name",
          group?.name || "No group",
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
      const filename = `${experimentName} - ${statementName} - ${exportDate}.xlsx`;

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
              <th>Coder</th>
              <th>Experiment Condition</th>
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
                  key={`${type}-${s.key}`}
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
              const baseText = statement.text;
              const highlights = copy?.highlights || [];
              const coder = userById(copy.coderId);
              const decoratedText = applyHighlightsToText(
                baseText,
                highlights,
                [],
                []
              );
              const wordCounts = calculateWordCounts(decoratedText);

              return (
                <tr key={copy._id}>
                  <td>{coder?.username || "No name"}</td>
                  <td>{group?.name || "No group"}</td>

                  {type === "marks" && (
                    <>
                      {allColors.map((c) => (
                        <td key={`mark-${copy._id}-${c._id}`}>
                          {copy.colorCounts?.[c.code] || 0}
                        </td>
                      ))}
                      {commonStyles.map((s) => (
                        <td key={`style-${copy._id}-${s.key}`}>
                          {copy.colorCounts?.[s.key] || 0}
                        </td>
                      ))}
                    </>
                  )}

                  {type === "words" && (
                    <>
                      {allColors.map((c) => (
                        <td key={`word-${copy._id}-${c._id}`}>
                          {wordCounts?.[c.code] || 0}
                        </td>
                      ))}
                      {commonStyles.map((s) => (
                        <td key={`style-${copy._id}-${s.key}`}>
                          {wordCounts?.[s.key] || 0}
                        </td>
                      ))}
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="dashboard-title">
            <FaChartBar /> Statement Summary
          </h1>
          <p className="dashboard-subtitle">
            <FaFileAlt style={{ marginRight: "8px" }} />
            Statement: {statement.name}
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            onClick={handleExportToExcel}
            className="dashboard-btn btn-success"
            disabled={!statement || !experiment || copies.length === 0}
            style={{
              opacity:
                !statement || !experiment || copies.length === 0 ? 0.5 : 1,
              cursor:
                !statement || !experiment || copies.length === 0
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
