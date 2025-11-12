import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  WidthType,
  TextRun,
} from "docx";
import { saveAs } from "file-saver";
import { useCopy } from "../../context/CopyContext";
import { useStatement } from "../../context/StatementContext";
import { useEdit } from "../../context/EditContext";
import { useUsers } from "../../context/UserContext";
import { useResult } from "../../context/ResultContext";
import { useColor } from "../../context/ColorContext";
import { useStyleSetting } from "../../context/StyleSettingContext";
import { useExperiment } from "../../context/ExperimentContext";
import { fetchGroupById } from "../../api/GroupApi";

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

  // Helper function to get export metadata
  const getExportMetadata = () => {
    const experimentName = experiment.name || "Unknown";
    const statementName = statement.name || "Unknown";
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
        "Group Name",
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
        "Group Name",
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

  // Export to Word function
  const handleExportToWord = async () => {
    try {
      if (!statement || !experiment || copies.length === 0) {
        alert("Cannot export: Missing data");
        return;
      }

      const { experimentName, statementName, exportDate } = getExportMetadata();

      // Create header row for table
      const headerRow = new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Coder", bold: true })],
              }),
            ],
            width: { size: 2500, type: WidthType.DXA },
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Group Name", bold: true })],
              }),
            ],
            width: { size: 2000, type: WidthType.DXA },
          }),
          ...allColors.map(
            (c) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: c.name, bold: true })],
                  }),
                ],
                width: { size: 1500, type: WidthType.DXA },
              })
          ),
          ...commonStyles.map(
            (s) =>
              new TableCell({
                children: [
                  new Paragraph({
                    children: [new TextRun({ text: s.label, bold: true })],
                  }),
                ],
                width: { size: 1000, type: WidthType.DXA },
              })
          ),
        ],
      });

      // Create data rows for Codings
      const codingsDataRows = copies.map((copy) => {
        const coder = userById(copy.coderId);
        return new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph(coder?.username || "No name")],
            }),
            new TableCell({
              children: [new Paragraph(group?.name || "No group")],
            }),
            ...allColors.map(
              (c) =>
                new TableCell({
                  children: [
                    new Paragraph((copy.colorCounts?.[c.code] || 0).toString()),
                  ],
                })
            ),
            ...commonStyles.map(
              (s) =>
                new TableCell({
                  children: [
                    new Paragraph((copy.colorCounts?.[s.key] || 0).toString()),
                  ],
                })
            ),
          ],
        });
      });

      // Create data rows for Words
      const wordsDataRows = copies.map((copy) => {
        const coder = userById(copy.coderId);
        const baseText = statement.text;
        const decoratedText = applyHighlightsToText(
          baseText,
          copy.highlights || [],
          [],
          []
        );
        const wordCounts = calculateWordCounts(decoratedText);

        return new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph(coder?.username || "No name")],
            }),
            new TableCell({
              children: [new Paragraph(group?.name || "No group")],
            }),
            ...allColors.map(
              (c) =>
                new TableCell({
                  children: [
                    new Paragraph((wordCounts?.[c.code] || 0).toString()),
                  ],
                })
            ),
            ...commonStyles.map(
              (s) =>
                new TableCell({
                  children: [
                    new Paragraph((wordCounts?.[s.key] || 0).toString()),
                  ],
                })
            ),
          ],
        });
      });

      // Create tables
      const codingsTable = new Table({
        rows: [headerRow, ...codingsDataRows],
        width: { size: 100, type: WidthType.PERCENTAGE },
      });

      const wordsTable = new Table({
        rows: [headerRow, ...wordsDataRows],
        width: { size: 100, type: WidthType.PERCENTAGE },
      });

      // Create document
      const doc = new Document({
        sections: [
          {
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Codings", bold: true, size: 32 }),
                ],
                spacing: { after: 200 },
              }),
              codingsTable,
              new Paragraph({
                text: "",
                spacing: { before: 400, after: 200 },
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: "Words", bold: true, size: 32 }),
                ],
                spacing: { after: 200 },
              }),
              wordsTable,
            ],
          },
        ],
      });

      // Generate filename
      const filename = `${experimentName} - ${statementName} - ${exportDate}.docx`;

      // Save file
      const blob = await Packer.toBlob(doc);
      saveAs(blob, filename);
    } catch (error) {
      console.error("❌ Word export error:", error);
      alert(`Export failed: ${error.message}`);
    }
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
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>
              Group Name
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
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  {group?.name || "No group"}
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
        <div style={{ display: "flex", gap: "10px" }}>
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
          <button
            onClick={handleExportToWord}
            style={{
              padding: "10px 20px",
              backgroundColor: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
            disabled={!statement || !experiment || copies.length === 0}
          >
            📄 Export to Word
          </button>
        </div>
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
