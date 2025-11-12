import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  Table,
  TableCell,
  TableRow,
  WidthType,
  BorderStyle,
  VerticalAlign,
  convertInchesToTwip,
  Packer,
} from "docx";
import { saveAs } from "file-saver";

const extractFormattedTextRuns = (slateValue) => {
  const textRuns = [];

  const traverse = (nodes) => {
    for (const node of nodes) {
      if (node.text !== undefined) {
        const runProperties = {
          text: node.text || " ",
          size: 24, // 12pt
          font: "Calibri",
        };

        // Check all possible highlight properties
        const highlightHex =
          node.highlight || node.backgroundColor || node.bgColor;

        if (node.bold) runProperties.bold = true;
        if (node.italic) runProperties.italics = true;
        if (node.underline) runProperties.underline = { type: "single" };

        // Apply highlight as background color with explicit text color
        if (highlightHex) {
          const highlightColor = highlightHex.replace("#", "").toUpperCase();

          // Apply background color using shading
          runProperties.shading = {
            fill: highlightColor,
            type: "solid",
            color: "000000",
          };

          // Set text color explicitly for contrast
          const brightness = isLightColor(highlightColor);
          runProperties.color = brightness ? "000000" : "FFFFFF";
        }

        textRuns.push(new TextRun(runProperties));
      }

      if (node.children) {
        traverse(node.children);
      }
    }
  };

  traverse(slateValue);
  return textRuns;
};

/**
 * Check if a color is light (for text contrast)
 */
const isLightColor = (hexColor) => {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
};

// ============================================
// DOCUMENT SECTIONS
// ============================================

/**
 * Create professional header with title and subtitle
 */
const createHeader = (title, subtitle) => {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: 56, // 28pt
          color: "1F4E78",
          font: "Calibri",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: {
        before: 400,
        after: 200,
      },
      border: {
        bottom: {
          color: "1F4E78",
          space: 8,
          style: BorderStyle.SINGLE,
          size: 24,
        },
      },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: subtitle,
          italics: true,
          size: 28, // 14pt
          color: "5B9BD5",
          font: "Calibri",
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  ];
};

/**
 * Create metadata line (export date)
 */
const createMetadata = () => {
  return new Paragraph({
    children: [
      new TextRun({
        text: `Generated: ${new Date().toLocaleString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`,
        italics: true,
        size: 20, // 10pt
        color: "7F7F7F",
        font: "Calibri",
      }),
    ],
    alignment: AlignmentType.RIGHT,
    spacing: { after: 600 },
  });
};

/**
 * Create section heading
 */
const createSectionHeading = (title) => {
  return new Paragraph({
    children: [
      new TextRun({
        text: title,
        bold: true,
        size: 32, // 16pt
        color: "1F4E78",
        font: "Calibri",
      }),
    ],
    spacing: {
      before: 480,
      after: 240,
    },
    border: {
      bottom: {
        color: "D0CECE",
        space: 4,
        style: BorderStyle.SINGLE,
        size: 12,
      },
    },
  });
};

/**
 * Create coded text section using inline table cells for Pages compatibility
 */
const createCodedTextSection = (slateValue) => {
  const sections = [createSectionHeading("Coded Text")];

  // Collect all text segments with their colors
  const segments = [];

  const traverse = (nodes) => {
    for (const node of nodes) {
      if (node.text !== undefined && node.text) {
        const highlight =
          node.highlight || node.backgroundColor || node.bgColor;
        segments.push({
          text: node.text,
          color: highlight ? highlight.replace("#", "").toUpperCase() : null,
          bold: node.bold,
          italic: node.italic,
          underline: node.underline,
        });
      }
      if (node.children) {
        traverse(node.children);
      }
    }
  };

  traverse(slateValue);

  if (segments.length === 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "No coded text available.",
            italics: true,
            size: 24,
            color: "A6A6A6",
            font: "Calibri",
          }),
        ],
        spacing: { before: 200, after: 400 },
      })
    );
    return sections;
  }

  // Create a single-row table with all text segments as cells
  const cells = segments.map((segment) => {
    const runProps = {
      text: segment.text,
      size: 24,
      font: "Calibri",
    };

    if (segment.bold) runProps.bold = true;
    if (segment.italic) runProps.italics = true;
    if (segment.underline) runProps.underline = { type: "single" };

    // Text color based on background brightness
    if (segment.color) {
      const isLight = isLightColor(segment.color);
      runProps.color = isLight ? "000000" : "FFFFFF";
    }

    return new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun(runProps)],
        }),
      ],
      shading: segment.color ? { fill: segment.color } : { fill: "FFFFFF" },
      margins: {
        top: 80,
        bottom: 80,
        left: 80,
        right: 80,
      },
      verticalAlign: VerticalAlign.CENTER,
      borders: {
        top: { style: BorderStyle.NONE, size: 0 },
        bottom: { style: BorderStyle.NONE, size: 0 },
        left: { style: BorderStyle.NONE, size: 0 },
        right: { style: BorderStyle.NONE, size: 0 },
      },
    });
  });

  const table = new Table({
    rows: [new TableRow({ children: cells })],
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    borders: {
      top: { style: BorderStyle.NONE, size: 0 },
      bottom: { style: BorderStyle.NONE, size: 0 },
      left: { style: BorderStyle.NONE, size: 0 },
      right: { style: BorderStyle.NONE, size: 0 },
      insideHorizontal: { style: BorderStyle.NONE, size: 0 },
      insideVertical: { style: BorderStyle.NONE, size: 0 },
    },
    layout: "autofit",
  });

  sections.push(table);
  sections.push(new Paragraph({ text: "", spacing: { after: 400 } }));

  return sections;
};

/**
 * Create statistics table
 */
const createStatisticsTable = (counts, wordCounts, colors = []) => {
  const hasData =
    (counts && Object.keys(counts).length > 0) ||
    (wordCounts && Object.keys(wordCounts).length > 0);

  if (!hasData) {
    return new Paragraph({
      children: [
        new TextRun({
          text: "No statistics available.",
          italics: true,
          size: 24,
          color: "A6A6A6",
          font: "Calibri",
        }),
      ],
      spacing: { before: 200, after: 400 },
    });
  }

  const rows = [];

  // Header row
  rows.push(
    new TableRow({
      height: { value: 800, rule: "atLeast" },
      tableHeader: true,
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Category",
                  bold: true,
                  size: 28,
                  color: "FFFFFF",
                  font: "Calibri",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: "1F4E78" },
          verticalAlign: VerticalAlign.CENTER,
          margins: {
            top: 150,
            bottom: 150,
            left: 200,
            right: 200,
          },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Count",
                  bold: true,
                  size: 28,
                  color: "FFFFFF",
                  font: "Calibri",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: "1F4E78" },
          verticalAlign: VerticalAlign.CENTER,
          margins: {
            top: 150,
            bottom: 150,
            left: 200,
            right: 200,
          },
        }),
      ],
    })
  );

  // Coding counts section
  if (counts && Object.keys(counts).length > 0) {
    rows.push(
      new TableRow({
        height: { value: 700, rule: "atLeast" },
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Number of Codings (Encodings per Color)",
                    bold: true,
                    size: 24,
                    color: "1F4E78",
                    font: "Calibri",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            columnSpan: 2,
            shading: { fill: "E7E6E6" },
            verticalAlign: VerticalAlign.CENTER,
            margins: {
              top: 180,
              bottom: 180,
              left: 200,
              right: 200,
            },
          }),
        ],
      })
    );

    const sortedCounts = Object.entries(counts).sort(([keyA], [keyB]) => {
      const nameA = keyA.startsWith("#")
        ? colors.find((c) => c.code === keyA)?.name || keyA
        : keyA;
      const nameB = keyB.startsWith("#")
        ? colors.find((c) => c.code === keyB)?.name || keyB
        : keyB;
      return nameA.localeCompare(nameB);
    });

    sortedCounts.forEach(([key, value], index) => {
      let displayName = key;

      if (key.startsWith("#")) {
        const colorObj = colors.find((c) => c.code === key);
        displayName = colorObj ? colorObj.name : key;
      }

      const rowColor = index % 2 === 0 ? "FFFFFF" : "F9F9F9";

      rows.push(
        new TableRow({
          height: { value: 600, rule: "atLeast" },
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: displayName,
                      size: 24,
                      font: "Calibri",
                    }),
                  ],
                }),
              ],
              shading: { fill: rowColor },
              verticalAlign: VerticalAlign.CENTER,
              margins: {
                top: 120,
                bottom: 120,
                left: 200,
                right: 200,
              },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: value.toString(),
                      bold: true,
                      size: 28,
                      color: "1F4E78",
                      font: "Calibri",
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { fill: rowColor },
              verticalAlign: VerticalAlign.CENTER,
              margins: {
                top: 120,
                bottom: 120,
                left: 200,
                right: 200,
              },
            }),
          ],
        })
      );
    });
  }

  // Word counts section
  if (wordCounts && Object.keys(wordCounts).length > 0) {
    rows.push(
      new TableRow({
        height: { value: 700, rule: "atLeast" },
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Number of Words (Words per Color)",
                    bold: true,
                    size: 24,
                    color: "C55A11",
                    font: "Calibri",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            columnSpan: 2,
            shading: { fill: "FCE4D6" },
            verticalAlign: VerticalAlign.CENTER,
            margins: {
              top: 180,
              bottom: 180,
              left: 200,
              right: 200,
            },
          }),
        ],
      })
    );

    const sortedWordCounts = Object.entries(wordCounts).sort(
      ([keyA], [keyB]) => {
        const nameA = keyA.startsWith("#")
          ? colors.find((c) => c.code === keyA)?.name || keyA
          : keyA;
        const nameB = keyB.startsWith("#")
          ? colors.find((c) => c.code === keyB)?.name || keyB
          : keyB;
        return nameA.localeCompare(nameB);
      }
    );

    sortedWordCounts.forEach(([key, value], index) => {
      let displayName = key;

      if (key.startsWith("#")) {
        const colorObj = colors.find((c) => c.code === key);
        displayName = colorObj ? `${colorObj.name} (words)` : `${key} (words)`;
      } else {
        displayName = `${key} (words)`;
      }

      const rowColor = index % 2 === 0 ? "FFFFFF" : "F9F9F9";

      rows.push(
        new TableRow({
          height: { value: 600, rule: "atLeast" },
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: displayName,
                      size: 24,
                      font: "Calibri",
                    }),
                  ],
                }),
              ],
              shading: { fill: rowColor },
              verticalAlign: VerticalAlign.CENTER,
              margins: {
                top: 120,
                bottom: 120,
                left: 200,
                right: 200,
              },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: value.toString(),
                      bold: true,
                      size: 28,
                      color: "C55A11",
                      font: "Calibri",
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              shading: { fill: rowColor },
              verticalAlign: VerticalAlign.CENTER,
              margins: {
                top: 120,
                bottom: 120,
                left: 200,
                right: 200,
              },
            }),
          ],
        })
      );
    });
  }

  return new Table({
    rows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    columnWidths: [7000, 2500],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 8, color: "1F4E78" },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: "1F4E78" },
      left: { style: BorderStyle.SINGLE, size: 8, color: "1F4E78" },
      right: { style: BorderStyle.SINGLE, size: 8, color: "1F4E78" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: "D0CECE" },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: "D0CECE" },
    },
  });
};

/**
 * Create comments section
 */
const createCommentsSection = (comments, users = []) => {
  const sections = [createSectionHeading("Comments")];

  if (!comments || comments.length === 0) {
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "No comments available.",
            italics: true,
            size: 24,
            color: "A6A6A6",
            font: "Calibri",
          }),
        ],
        spacing: { before: 200, after: 400 },
      })
    );
    return sections;
  }

  const mainComments = comments.filter((c) => !c.replyTo);

  mainComments.forEach((comment, index) => {
    const username = comment.userId?.username || "Unknown User";
    const date = new Date(comment.createdAt).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Comment header
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Comment ${index + 1}: `,
            bold: true,
            size: 26,
            color: "1F4E78",
            font: "Calibri",
          }),
          new TextRun({
            text: username,
            bold: true,
            size: 26,
            color: "5B9BD5",
            font: "Calibri",
          }),
          new TextRun({
            text: ` · ${date}`,
            italics: true,
            size: 22,
            color: "7F7F7F",
            font: "Calibri",
          }),
        ],
        spacing: { before: 300, after: 120 },
      })
    );

    // Comment text
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: comment.text,
            size: 24,
            font: "Calibri",
          }),
        ],
        spacing: { after: 200 },
        indent: { left: convertInchesToTwip(0.35) },
        border: {
          left: {
            color: "5B9BD5",
            space: 4,
            style: BorderStyle.SINGLE,
            size: 16,
          },
        },
      })
    );

    // Replies
    const replies = comments.filter((r) => r.replyTo === comment._id);

    if (replies.length > 0) {
      sections.push(
        new Paragraph({
          children: [
            new TextRun({
              text: "Replies:",
              bold: true,
              italics: true,
              size: 22,
              color: "70AD47",
              font: "Calibri",
            }),
          ],
          spacing: { before: 120, after: 100 },
          indent: { left: convertInchesToTwip(0.55) },
        })
      );

      replies.forEach((reply) => {
        const replyUsername = reply.userId?.username || "Unknown User";
        const replyDate = new Date(reply.createdAt).toLocaleString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `↪ ${replyUsername}`,
                bold: true,
                size: 22,
                color: "70AD47",
                font: "Calibri",
              }),
              new TextRun({
                text: ` (${replyDate}): `,
                italics: true,
                size: 20,
                color: "7F7F7F",
                font: "Calibri",
              }),
              new TextRun({
                text: reply.text,
                size: 22,
                font: "Calibri",
              }),
            ],
            spacing: { after: 100 },
            indent: { left: convertInchesToTwip(0.85) },
          })
        );
      });
    }
  });

  return sections;
};

// ============================================
// MAIN EXPORT FUNCTIONS
// ============================================

/**
 * Export a single copy to Word
 */
export const exportCopyToWord = async ({
  copyId,
  slateValue,
  counts,
  wordCounts,
  comments,
  colors,
  users,
  copyName = "Coded Statement",
  statementName = "",
}) => {
  try {
    const sections = [];

    // Header
    sections.push(
      ...createHeader(
        copyName,
        statementName ? `Statement: ${statementName}` : "Coding Analysis Report"
      )
    );

    // Metadata
    sections.push(createMetadata());

    // Coded text
    sections.push(...createCodedTextSection(slateValue));

    // Statistics
    sections.push(createSectionHeading("Statistics"));
    sections.push(createStatisticsTable(counts, wordCounts, colors));
    sections.push(new Paragraph({ text: "", spacing: { after: 400 } }));

    // Comments
    sections.push(...createCommentsSection(comments, users));

    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1),
              },
            },
          },
          children: sections,
        },
      ],
    });

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 10);
    const safeFileName = copyName
      .replace(/[^a-z0-9\s]/gi, "_")
      .replace(/\s+/g, "_");
    const filename = `${safeFileName}_${timestamp}.docx`;

    // Save file
    const blob = await Packer.toBlob(doc);
    saveAs(blob, filename);

    return { success: true, filename };
  } catch (error) {
    console.error("Error exporting to Word:", error);
    throw error;
  }
};

/**
 * Export comparison (two copies side by side) to Word
 */
export const exportComparisonToWord = async ({
  statementName,
  copyA,
  copyB,
  slateValueA,
  slateValueB,
  countsA,
  countsB,
  wordCountsA,
  wordCountsB,
  commentsA,
  commentsB,
  colors,
  users,
}) => {
  try {
    const sections = [];

    // Header
    sections.push(
      ...createHeader(
        "Comparison Report",
        statementName
          ? `Statement: ${statementName}`
          : "Side-by-Side Coding Analysis"
      )
    );

    // Metadata
    sections.push(createMetadata());

    // === COPY A ===
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Copy A",
            bold: true,
            size: 40,
            color: "1F4E78",
            font: "Calibri",
          }),
        ],
        spacing: { before: 480, after: 360 },
        border: {
          bottom: {
            color: "1F4E78",
            space: 8,
            style: BorderStyle.DOUBLE,
            size: 16,
          },
        },
      })
    );

    sections.push(...createCodedTextSection(slateValueA));
    sections.push(createSectionHeading("Statistics - Copy A"));
    sections.push(createStatisticsTable(countsA, wordCountsA, colors));
    sections.push(new Paragraph({ text: "", spacing: { after: 400 } }));
    sections.push(...createCommentsSection(commentsA, users));

    // Page break
    sections.push(
      new Paragraph({
        text: "",
        pageBreakBefore: true,
        spacing: { before: 480 },
      })
    );

    // === COPY B ===
    sections.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "Copy B",
            bold: true,
            size: 40,
            color: "1F4E78",
            font: "Calibri",
          }),
        ],
        spacing: { before: 480, after: 360 },
        border: {
          bottom: {
            color: "1F4E78",
            space: 8,
            style: BorderStyle.DOUBLE,
            size: 16,
          },
        },
      })
    );

    sections.push(...createCodedTextSection(slateValueB));
    sections.push(createSectionHeading("Statistics - Copy B"));
    sections.push(createStatisticsTable(countsB, wordCountsB, colors));
    sections.push(new Paragraph({ text: "", spacing: { after: 400 } }));
    sections.push(...createCommentsSection(commentsB, users));

    // Create document
    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(1),
                right: convertInchesToTwip(1),
                bottom: convertInchesToTwip(1),
                left: convertInchesToTwip(1),
              },
            },
          },
          children: sections,
        },
      ],
    });

    // Generate filename
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `Comparison_${timestamp}.docx`;

    // Save file
    const blob = await Packer.toBlob(doc);
    saveAs(blob, filename);

    return { success: true, filename };
  } catch (error) {
    console.error("Error exporting comparison to Word:", error);
    throw error;
  }
};
