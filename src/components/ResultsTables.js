import React from "react";
import ColorBadge from "./ColorBadge";

export default function ResultsTables({
  fullTextTable,
  selectionTable,
  additionalStats,
  colors = [],
  styleSettings = {},
}) {
  const renderTable = (tableData, title) => {
    if (!tableData || !tableData.columns || tableData.columns.length === 0) {
      return null;
    }

    const { columns, codingsRow, wordsRow } = tableData;

    return (
      <div style={{ marginBottom: "24px" }}>
        <h4
          style={{
            fontSize: "14px",
            fontWeight: "600",
            marginBottom: "12px",
            color: "#444",
          }}
        >
          {title}
        </h4>
        <div
          style={{
            width: "100%",
            borderRadius: "8px",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "14px",
              border: "1px solid #e0e0e0",
              tableLayout: "auto",
            }}
          >
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th
                  style={{
                    padding: "12px",
                    textAlign: "left",
                    borderBottom: "2px solid #ccc",
                    fontWeight: "600",
                    width: "30%",
                  }}
                >
                  Metric
                </th>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      borderBottom: "2px solid #ccc",
                      fontWeight: "600",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {col.type === "color" ? (
                        <ColorBadge
                          type="color"
                          name={col.name}
                          color={col.code}
                          size="small"
                        />
                      ) : (
                        <ColorBadge
                          type={col.type}
                          name={col.name}
                          size="small"
                        />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Row 1: Number of codings */}
              <tr style={{ backgroundColor: "#ffffff" }}>
                <td
                  style={{
                    padding: "12px",
                    borderBottom: "1px solid #e0e0e0",
                    fontWeight: "500",
                  }}
                >
                  Number of codings
                </td>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      borderBottom: "1px solid #e0e0e0",
                      fontWeight: "700",
                      color: "#1F4E78",
                      fontSize: "15px",
                    }}
                  >
                    {codingsRow[col.key] || 0}
                  </td>
                ))}
              </tr>
              {/* Row 2: Number of words */}
              <tr style={{ backgroundColor: "#fafafa" }}>
                <td
                  style={{
                    padding: "12px",
                    borderBottom: "1px solid #e0e0e0",
                    fontWeight: "500",
                  }}
                >
                  Number of words
                </td>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: "12px",
                      textAlign: "center",
                      borderBottom: "1px solid #e0e0e0",
                      fontWeight: "700",
                      color: "#1F4E78",
                      fontSize: "15px",
                    }}
                  >
                    {wordsRow[col.key] || 0}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Additional Statistics - displayed before tables */}
      {additionalStats && (
        <div
          style={{
            marginBottom: "20px",
            padding: "15px",
            backgroundColor: "#f9f9f9",
            borderRadius: "8px",
            border: "1px solid #e0e0e0",
          }}
        >
          <h4
            style={{
              fontSize: "15px",
              fontWeight: "600",
              marginBottom: "12px",
              color: "#444",
            }}
          >
            Additional Statistics
          </h4>
          <div style={{ display: "grid", gap: "10px", fontSize: "14px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
              }}
            >
              <span style={{ fontWeight: "500" }}>
                Total words in entire text:
              </span>
              <span style={{ fontWeight: "700", color: "#1F4E78" }}>
                {additionalStats.totalWordsFullText || 0}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
              }}
            >
              <span style={{ fontWeight: "500" }}>
                Total colored words in entire text:
              </span>
              <span style={{ fontWeight: "700", color: "#1F4E78" }}>
                {additionalStats.totalColoredWordsFullText || 0}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
                borderTop: "1px solid #ddd",
                paddingTop: "12px",
                marginTop: "8px",
              }}
            >
              <span style={{ fontWeight: "500" }}>
                Total words in selected segment:
              </span>
              <span style={{ fontWeight: "700", color: "#1F4E78" }}>
                {additionalStats.totalWordsSelection || 0}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "6px 0",
              }}
            >
              <span style={{ fontWeight: "500" }}>
                Total colored words in selected segment:
              </span>
              <span style={{ fontWeight: "700", color: "#1F4E78" }}>
                {additionalStats.totalColoredWordsSelection || 0}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Table 1: Full Text Results */}
      {renderTable(fullTextTable, "Table 1 — Full Text Results")}

      {/* Table 2: Selected Segment Results */}
      {selectionTable &&
        renderTable(selectionTable, "Table 2 — Selected Segment Results")}
    </div>
  );
}
