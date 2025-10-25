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

  // טעינת הצהרה ועותקים
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
      }
    };
    loadData();
  }, [statementId, statementById, copiesByStatementId, experimentById]);

  if (!statement) return <div>Statement not found</div>;

  // איחוד כל הצבעים – גם מהרשימה וגם מהעותקים
  const colorCodesFromCopies = new Set();
  copies.forEach((copy) => {
    Object.keys(copy.colorCounts || {}).forEach((code) =>
      colorCodesFromCopies.add(code)
    );
  });

  // סגנונות שמופעלים ב-styleSettings
  const commonStyles = [];
  if (styleSettings.boldEnabled)
    commonStyles.push({ key: "bold", label: "Bold" });
  if (styleSettings.italicEnabled)
    commonStyles.push({ key: "italic", label: "Italic" });
  if (styleSettings.underlineEnabled)
    commonStyles.push({ key: "underline", label: "Underline" });
  const styleKeys = commonStyles.map((s) => s.key);

  // בונים את allColors: מסירים את הסגנונות שמופעלים ב-styleSettings
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
    if (!statement || !experiment || copies.length === 0) {
      alert("Cannot export: Missing data");
      return;
    }

    const experimentName = experiment.name || "Unknown";
    const statementName = statement.name || "Unknown";
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
      "Coder",
      ...allColors.map((c) => c.name),
      ...commonStyles.map((s) => s.label),
    ];
    codingsData.push(codingsHeader);

    // Data rows
    copies.forEach((copy) => {
      const coder = userById(copy.coderId);
      const row = [
        coder?.username || "No name",
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
      ...allColors.map((c) => c.name),
      ...commonStyles.map((s) => s.label),
    ];
    wordsData.push(wordsHeader);

    // Data rows
    copies.forEach((copy) => {
      const coder = userById(copy.coderId);
      const baseText = statement.text;
      const highlights = copy?.highlights || [];
      const decoratedText = applyHighlightsToText(baseText, highlights, [], []);
      const wordCounts = calculateWordCounts(decoratedText);

      const row = [
        coder?.username || "No name",
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
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>Coder</th>
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
                key={`${type}-${s.key}`}
                style={{ border: "1px solid #ccc", padding: "8px" }}
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
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  {coder?.username || "No name"}
                </td>

                {type === "marks" && (
                  <>
                    {allColors.map((c) => (
                      <td
                        key={`mark-${copy._id}-${c._id}`}
                        style={{ border: "1px solid #ccc", padding: "8px" }}
                      >
                        {copy.colorCounts?.[c.code] || 0}
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
                  </>
                )}

                {type === "words" && (
                  <>
                    {allColors.map((c) => (
                      <td
                        key={`word-${copy._id}-${c._id}`}
                        style={{ border: "1px solid #ccc", padding: "8px" }}
                      >
                        {wordCounts?.[c.code] || 0}
                      </td>
                    ))}
                    {commonStyles.map((s) => (
                      <td
                        key={`style-${copy._id}-${s.key}`}
                        style={{ border: "1px solid #ccc", padding: "8px" }}
                      >
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
        <h2>Comparison of coders for the statement: {statement.name}</h2>
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
          disabled={!statement || !experiment || copies.length === 0}
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
