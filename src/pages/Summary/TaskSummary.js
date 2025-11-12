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

  // טעינת קבוצות אסינכרונית
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

  // Helper function to get export metadata
  const getExportMetadata = () => {
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
        "Group Name",
        ...allColors.map((c) => c.name),
        ...commonStyles.map((s) => s.label),
      ];
      codingsData.push(codingsHeader);

      // Data rows
      copies.forEach((copy) => {
        const statement = statementsCache[copy.statementId];
        const group = statement?.groupId ? groupsCache[statement.groupId] : null;
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
        "Group Name",
        ...allColors.map((c) => c.name),
        ...commonStyles.map((s) => s.label),
      ];
      wordsData.push(wordsHeader);

      // Data rows
      copies.forEach((copy) => {
        const statement = statementsCache[copy.statementId];
        const group = statement?.groupId ? groupsCache[statement.groupId] : null;
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

  // Export to Word function
  const handleExportToWord = async () => {
    try {
      if (!task || !experiment || copies.length === 0) {
        alert("Cannot export: Missing data");
        return;
      }

      const { coderName, experimentName, exportDate } = getExportMetadata();

      // Create header rows for table
      const headerRow = new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Statement", bold: true })],
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
        const statement = statementsCache[copy.statementId];
        const group = statement?.groupId ? groupsCache[statement.groupId] : null;
        return new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph(statement?.name || "No name")],
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
        const statement = statementsCache[copy.statementId];
        const group = statement?.groupId ? groupsCache[statement.groupId] : null;
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

        return new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph(statement?.name || "No name")],
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
      const filename = `${experimentName} - ${coderName} - ${exportDate}.docx`;

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
            <th style={{ border: "1px solid #ccc", padding: "8px" }}>
              Statement
            </th>
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
            const group = statement?.groupId ? groupsCache[statement.groupId] : null;
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
                <td style={{ border: "1px solid #ccc", padding: "8px" }}>
                  {group?.name || "No group"}
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
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {copies.length === 0 && (
            <div
              style={{
                fontSize: "13px",
                color: "#d32f2f",
                backgroundColor: "#ffebee",
                padding: "8px 12px",
                borderRadius: "4px",
                border: "1px solid #ef5350",
                flex: "1 1 100%",
              }}
            >
              ⚠️ No completed copies to export. Please complete at least one
              copy first.
            </div>
          )}
          <button
            onClick={handleExportToExcel}
            style={{
              padding: "10px 20px",
              backgroundColor:
                !task || !experiment || copies.length === 0
                  ? "#999"
                  : "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor:
                !task || !experiment || copies.length === 0
                  ? "not-allowed"
                  : "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
            disabled={!task || !experiment || copies.length === 0}
          >
            📊 Export to Excel
          </button>
          <button
            onClick={handleExportToWord}
            style={{
              padding: "10px 20px",
              backgroundColor:
                !task || !experiment || copies.length === 0
                  ? "#999"
                  : "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor:
                !task || !experiment || copies.length === 0
                  ? "not-allowed"
                  : "pointer",
              fontSize: "14px",
              fontWeight: "bold",
            }}
            disabled={!task || !experiment || copies.length === 0}
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
