import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCopy } from "../../context/CopyContext";
import { useStatement } from "../../context/StatementContext";
import { useEdit } from "../../context/EditContext";
import { useUsers } from "../../context/UserContext";
import { useResult } from "../../context/ResultContext";
import { useColor } from "../../context/ColorContext";
import { useStyleSetting } from "../../context/StyleSettingContext";

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

  const [styleSettings, setStyleSettings] = useState({});
  const [colors, setColors] = useState([]);
  const [statement, setStatement] = useState(null);
  const [copies, setCopies] = useState([]);

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
      }
    };
    loadData();
  }, [statementId, statementById, copiesByStatementId]);

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
      <h2>Comparison of coders for the statement: {statement.name}</h2>

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
