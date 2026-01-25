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
  convertInchesToTwip,
  Packer,
} from "docx";
import { saveAs } from "file-saver";

const isLightColor = (hexColor) => {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
};

/**
 * Detect if text contains Hebrew characters (RTL)
 */
const isHebrewText = (text) => {
  if (!text) return false;
  // Hebrew Unicode range: \u0590-\u05FF
  const hebrewRegex = /[\u0590-\u05FF]/;
  return hebrewRegex.test(text);
};

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
 * Create coded text section with proper paragraph structure and RTL support
 */
const createCodedTextSection = (slateValue) => {
  const sections = [createSectionHeading("Coded Text")];

  if (!slateValue || slateValue.length === 0) {
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
      }),
    );
    return sections;
  }

  // Convert Slate structure to Word paragraphs
  const traverse = (nodes) => {
    for (const node of nodes) {
      if (node.type === "paragraph" && node.children) {
        const textRuns = [];

        // Process all text nodes in this paragraph
        const processChildren = (children) => {
          for (const child of children) {
            if (child.text !== undefined) {
              const runProps = {
                text: child.text || " ",
                size: 24,
                font: "Arial",
              };

              const highlight =
                child.highlight || child.backgroundColor || child.bgColor;

              if (child.bold) runProps.bold = true;
              if (child.italic) runProps.italics = true;
              if (child.underline) runProps.underline = { type: "single" };

              // Apply highlight as background color
              if (highlight) {
                const highlightColor = highlight.replace("#", "").toUpperCase();
                runProps.shading = {
                  fill: highlightColor,
                  type: "clear",
                };
                const brightness = isLightColor(highlightColor);
                runProps.color = brightness ? "000000" : "FFFFFF";
              } else {
                runProps.color = "000000";
              }

              textRuns.push(new TextRun(runProps));
            }
            if (child.children) {
              processChildren(child.children);
            }
          }
        };

        processChildren(node.children);

        // Create paragraph with all text runs
        if (textRuns.length > 0) {
          // Extract ALL text from the entire paragraph recursively to detect RTL
          const extractText = (children) => {
            let text = "";
            for (const child of children) {
              if (child.text !== undefined) {
                text += child.text;
              }
              if (child.children) {
                text += extractText(child.children);
              }
            }
            return text;
          };

          const paragraphText = extractText(node.children);
          const isRTL = isHebrewText(paragraphText);

          // PURE RTL setup - just bidirectional and right alignment
          sections.push(
            new Paragraph({
              children: textRuns,
              spacing: { before: 120, after: 120 },
              alignment: AlignmentType.RIGHT,
              bidirectional: true,
            }),
          );
        }
      } else if (node.children) {
        traverse(node.children);
      }
    }
  };

  traverse(slateValue);

  sections.push(new Paragraph({ text: "", spacing: { after: 400 } }));

  return sections;
};

const createStatisticsTable = (
  counts,
  wordCounts,
  colors = [],
  styleSettings = {},
) => {
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

  // Header row with 3 columns: Category, Count, Words
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Category",
                  bold: true,
                  size: 24,
                  font: "Calibri",
                }),
              ],
            }),
          ],
          shading: { fill: "F0F0F0" },
          margins: {
            top: 100,
            bottom: 100,
            left: 150,
            right: 150,
          },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Number of Codings",
                  bold: true,
                  size: 24,
                  font: "Calibri",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: "F0F0F0" },
          margins: {
            top: 100,
            bottom: 100,
            left: 150,
            right: 150,
          },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Number of Words",
                  bold: true,
                  size: 24,
                  font: "Calibri",
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          shading: { fill: "F0F0F0" },
          margins: {
            top: 100,
            bottom: 100,
            left: 150,
            right: 150,
          },
        }),
      ],
    }),
  );

  // Get all unique categories from both counts and wordCounts
  const allCategories = new Set([
    ...Object.keys(counts || {}),
    ...Object.keys(wordCounts || {}),
  ]);

  // Sort categories
  const sortedCategories = Array.from(allCategories).sort((keyA, keyB) => {
    const nameA = keyA.startsWith("#")
      ? colors.find((c) => c.code === keyA)?.name || keyA
      : keyA;
    const nameB = keyB.startsWith("#")
      ? colors.find((c) => c.code === keyB)?.name || keyB
      : keyB;
    return nameA.localeCompare(nameB);
  });

  // Create rows with category name, count, and word count
  sortedCategories.forEach((key) => {
    let displayName = key;

    if (key.startsWith("#")) {
      const colorObj = colors.find((c) => c.code === key);
      displayName = colorObj ? colorObj.name : key;
    } else if (key === "bold") {
      displayName = styleSettings.boldName || "Bold";
    } else if (key === "italic") {
      displayName = styleSettings.italicName || "Italic";
    } else if (key === "underline") {
      displayName = styleSettings.underlineName || "Underline";
    }

    const isNameRTL = isHebrewText(displayName);
    const countValue = counts?.[key] || 0;
    const wordCountValue = wordCounts?.[key] || 0;

    rows.push(
      new TableRow({
        children: [
          // Category name cell
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: displayName,
                    size: 22,
                    font: "Arial",
                  }),
                ],
                alignment: isNameRTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
                bidirectional: isNameRTL,
              }),
            ],
            margins: {
              top: 80,
              bottom: 80,
              left: 150,
              right: 150,
            },
          }),
          // Count cell
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: countValue.toString(),
                    size: 22,
                    font: "Calibri",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            margins: {
              top: 80,
              bottom: 80,
              left: 150,
              right: 150,
            },
          }),
          // Word count cell
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: wordCountValue.toString(),
                    size: 22,
                    font: "Calibri",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            margins: {
              top: 80,
              bottom: 80,
              left: 150,
              right: 150,
            },
          }),
        ],
      }),
    );
  });

  return new Table({
    rows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    columnWidths: [5000, 2500, 2500],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      left: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      right: { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "DDDDDD" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "DDDDDD" },
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
      }),
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
      }),
    );

    // Comment text
    const isCommentRTL = isHebrewText(comment.text);

    const commentParagraphProps = {
      children: [
        new TextRun({
          text: comment.text,
          size: 24,
          font: "Arial",
          ...(isCommentRTL && { rightToLeft: true }),
        }),
      ],
      spacing: { after: 200 },
      indent: { left: convertInchesToTwip(0.35) },
      alignment: isCommentRTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
      bidirectional: isCommentRTL, // CORRECT PROPERTY for RTL paragraphs
      border: {
        left: {
          color: "5B9BD5",
          space: 4,
          style: BorderStyle.SINGLE,
          size: 16,
        },
      },
    };

    sections.push(new Paragraph(commentParagraphProps));

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
        }),
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

        const isReplyRTL = isHebrewText(reply.text);

        const replyParagraphProps = {
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
              font: "Arial",
              ...(isReplyRTL && { rightToLeft: true }),
            }),
          ],
          spacing: { after: 100 },
          indent: { left: convertInchesToTwip(0.85) },
          alignment: isReplyRTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
          bidirectional: isReplyRTL, // CORRECT PROPERTY for RTL paragraphs
        };

        sections.push(new Paragraph(replyParagraphProps));
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
  styleSettings = {},
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
        statementName
          ? `Statement: ${statementName}`
          : "Coding Analysis Report",
      ),
    );

    // Metadata
    sections.push(createMetadata());

    // Coded text
    sections.push(...createCodedTextSection(slateValue));

    // Statistics
    sections.push(createSectionHeading("Statistics"));
    sections.push(
      createStatisticsTable(counts, wordCounts, colors, styleSettings),
    );
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
            // Enable bidirectional text at section level for Word to recognize RTL
            bidirectional: true,
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
  styleSettings = {},
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
          : "Side-by-Side Coding Analysis",
      ),
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
      }),
    );

    sections.push(...createCodedTextSection(slateValueA));
    sections.push(createSectionHeading("Statistics - Copy A"));
    sections.push(
      createStatisticsTable(countsA, wordCountsA, colors, styleSettings),
    );
    sections.push(new Paragraph({ text: "", spacing: { after: 400 } }));
    sections.push(...createCommentsSection(commentsA, users));

    // Page break
    sections.push(
      new Paragraph({
        text: "",
        pageBreakBefore: true,
        spacing: { before: 480 },
      }),
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
      }),
    );

    sections.push(...createCodedTextSection(slateValueB));
    sections.push(createSectionHeading("Statistics - Copy B"));
    sections.push(
      createStatisticsTable(countsB, wordCountsB, colors, styleSettings),
    );
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
            // Enable bidirectional text at section level for Word to recognize RTL
            bidirectional: true,
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
