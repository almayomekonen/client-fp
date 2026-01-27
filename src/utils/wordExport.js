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
import JSZip from "jszip";

const isLightColor = (hexColor) => {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
};

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

  // Right-to-Left Mark and Override characters
  const RLM = "\u200F"; // Right-to-Left Mark
  const RLO = "\u202E"; // Right-to-Left Override

  // Convert Slate structure to Word paragraphs
  const traverse = (nodes) => {
    for (const node of nodes) {
      if (node.type === "paragraph" && node.children) {
        const textRuns = [];

        // Extract all text first to detect RTL
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

        // Add RLM at the start of RTL paragraphs
        if (isRTL) {
          textRuns.push(new TextRun({ text: RLM, size: 24, font: "Arial" }));
        }

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

        // Create paragraph with RTL properties
        if (textRuns.length > 0) {
          sections.push(
            new Paragraph({
              children: textRuns,
              spacing: { before: 120, after: 120 },
              alignment: isRTL ? AlignmentType.RIGHT : AlignmentType.LEFT,
              bidirectional: isRTL,
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
  totalWordsInText = 0,
  totalColoredWords = 0,
) => {
  // Show table if there are defined colors OR if there's any data
  const hasData =
    colors.length > 0 ||
    (counts && Object.keys(counts).length > 0) ||
    (wordCounts && Object.keys(wordCounts).length > 0) ||
    styleSettings.boldName ||
    styleSettings.italicName ||
    styleSettings.underlineName;

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

  // Get ALL defined categories - including those not used
  const allCategories = [];

  // Add all colors from the colors array (system-defined colors)
  colors.forEach((color) => {
    allCategories.push({ key: color.code, name: color.name, type: "color" });
  });

  // Add style categories (bold, italic, underline) if they exist in settings
  if (styleSettings.boldName) {
    allCategories.push({
      key: "bold",
      name: styleSettings.boldName,
      type: "style",
    });
  }
  if (styleSettings.italicName) {
    allCategories.push({
      key: "italic",
      name: styleSettings.italicName,
      type: "style",
    });
  }
  if (styleSettings.underlineName) {
    allCategories.push({
      key: "underline",
      name: styleSettings.underlineName,
      type: "style",
    });
  }

  const rows = [];

  // Scale font sizes based on number of categories for professional look
  const numCategories = allCategories.length;
  const headerFontSize = numCategories > 12 ? 16 : numCategories > 8 ? 18 : 20;
  const dataFontSize = numCategories > 12 ? 16 : numCategories > 8 ? 18 : 20;

  // HEADER ROW: Metric | Color1 | Color2 | Color3 | ...
  const headerCells = [
    new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: "Metric",
              bold: true,
              size: 24,
              font: "Calibri",
            }),
          ],
        }),
      ],
      shading: { fill: "F0F0F0" },
      margins: { top: 150, bottom: 150, left: 200, right: 200 },
    }),
  ];

  // Add column header for each category - NO bidirectional to avoid Word rendering issues
  allCategories.forEach((category) => {
    headerCells.push(
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: category.name,
                bold: true,
                size: headerFontSize,
                font: "Arial",
              }),
            ],
            alignment: AlignmentType.CENTER,
            wordWrap: false, // Prevent text wrapping
          }),
        ],
        shading: { fill: "F0F0F0" },
        margins: { top: 150, bottom: 150, left: 80, right: 80 },
      }),
    );
  });

  rows.push(new TableRow({ children: headerCells }));

  // ROW 1: Number of codings
  const codingsCells = [
    new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: "Number of codings",
              size: dataFontSize,
              font: "Arial",
            }),
          ],
        }),
      ],
      margins: { top: 100, bottom: 100, left: 200, right: 200 },
    }),
  ];

  // Add count for each category (NO Total column)
  allCategories.forEach((category) => {
    const countValue = counts?.[category.key] || 0;
    codingsCells.push(
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: countValue.toString(),
                size: dataFontSize,
                font: "Calibri",
              }),
            ],
            alignment: AlignmentType.CENTER,
            wordWrap: false,
          }),
        ],
        margins: { top: 100, bottom: 100, left: 80, right: 80 },
      }),
    );
  });

  rows.push(new TableRow({ children: codingsCells }));

  // ROW 2: Number of words
  const wordsCells = [
    new TableCell({
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: "Number of words",
              size: dataFontSize,
              font: "Arial",
            }),
          ],
        }),
      ],
      margins: { top: 100, bottom: 100, left: 200, right: 200 },
    }),
  ];

  // Add word count for each category (NO Total column)
  allCategories.forEach((category) => {
    const wordCountValue = wordCounts?.[category.key] || 0;
    wordsCells.push(
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: wordCountValue.toString(),
                size: dataFontSize,
                font: "Calibri",
              }),
            ],
            alignment: AlignmentType.CENTER,
            wordWrap: false,
          }),
        ],
        margins: { top: 100, bottom: 100, left: 80, right: 80 },
      }),
    );
  });

  rows.push(new TableRow({ children: wordsCells }));

  // ROW 3: Total words in entire text
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Total words in entire text",
                  size: dataFontSize,
                  font: "Arial",
                }),
              ],
            }),
          ],
          margins: { top: 100, bottom: 100, left: 200, right: 200 },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: totalWordsInText.toString(),
                  bold: true,
                  size: dataFontSize,
                  font: "Calibri",
                }),
              ],
              alignment: AlignmentType.CENTER,
              wordWrap: false,
            }),
          ],
          margins: { top: 100, bottom: 100, left: 80, right: 80 },
          columnSpan: allCategories.length,
        }),
      ],
    }),
  );

  // ROW 4: Total colored words in entire text
  rows.push(
    new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "Total colored words in entire text",
                  size: dataFontSize,
                  font: "Arial",
                }),
              ],
            }),
          ],
          margins: { top: 100, bottom: 100, left: 200, right: 200 },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: totalColoredWords.toString(),
                  bold: true,
                  size: dataFontSize,
                  font: "Calibri",
                }),
              ],
              alignment: AlignmentType.CENTER,
              wordWrap: false,
            }),
          ],
          margins: { top: 100, bottom: 100, left: 80, right: 80 },
          columnSpan: allCategories.length,
        }),
      ],
    }),
  );

  // Calculate column widths dynamically: wider columns to prevent text breaking
  const numColumns = allCategories.length + 1; // +1 for Metric column

  // First column width (Metric) - wider to fit "Total colored words in entire text"
  const firstColumnWidth = 3500;

  // Calculate minimum width needed per column to prevent wrapping
  // Aim for at least 1000 twips per column, scale down if too many columns
  const totalAvailableWidth = 12000; // Increased total width
  const remainingWidth = totalAvailableWidth - firstColumnWidth;
  const minColumnWidth = 1000; // Minimum to prevent "Underline" breaking
  const idealColumnWidth = Math.max(
    minColumnWidth,
    Math.floor(remainingWidth / allCategories.length),
  );

  const columnWidths = [firstColumnWidth];
  for (let i = 0; i < allCategories.length; i++) {
    columnWidths.push(idealColumnWidth);
  }

  return new Table({
    rows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
    columnWidths,
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
  totalWordsInText = 0,
  totalColoredWords = 0,
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
      createStatisticsTable(
        counts,
        wordCounts,
        colors,
        styleSettings,
        totalWordsInText,
        totalColoredWords,
      ),
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

    // Save file with manual RTL XML patching
    const blob = await Packer.toBlob(doc);

    // WORKAROUND: Manually add RTL support by patching the XML
    try {
      const zip = await JSZip.loadAsync(blob);

      // Read the document.xml file
      const documentXml = await zip.file("word/document.xml").async("string");

      // Patch: Add <w:bidi/> to paragraph properties that need RTL
      // Find all <w:pPr> and add <w:bidi/> right after it
      const patchedXml = documentXml.replace(
        /(<w:pPr>)(?![\s\S]*?<w:bidi\/>)/g,
        "$1<w:bidi/>",
      );

      // Update the file in the zip
      zip.file("word/document.xml", patchedXml);

      // Generate the patched blob
      const patchedBlob = await zip.generateAsync({ type: "blob" });
      saveAs(patchedBlob, filename);
    } catch (patchError) {
      console.error("Error patching RTL:", patchError);
      // Fallback to original blob if patching fails
      saveAs(blob, filename);
    }

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
  totalWordsInTextA = 0,
  totalColoredWordsA = 0,
  totalWordsInTextB = 0,
  totalColoredWordsB = 0,
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
      createStatisticsTable(
        countsA,
        wordCountsA,
        colors,
        styleSettings,
        totalWordsInTextA,
        totalColoredWordsA,
      ),
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
      createStatisticsTable(
        countsB,
        wordCountsB,
        colors,
        styleSettings,
        totalWordsInTextB,
        totalColoredWordsB,
      ),
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

    // Save file with manual RTL XML patching
    const blob = await Packer.toBlob(doc);

    // WORKAROUND: Manually add RTL support by patching the XML
    try {
      const zip = await JSZip.loadAsync(blob);

      // Read the document.xml file
      const documentXml = await zip.file("word/document.xml").async("string");

      // Patch: Add <w:bidi/> to paragraph properties that need RTL
      const patchedXml = documentXml.replace(
        /(<w:pPr>)(?![\s\S]*?<w:bidi\/>)/g,
        "$1<w:bidi/>",
      );

      // Update the file in the zip
      zip.file("word/document.xml", patchedXml);

      // Generate the patched blob
      const patchedBlob = await zip.generateAsync({ type: "blob" });
      saveAs(patchedBlob, filename);
    } catch (patchError) {
      console.error("Error patching RTL:", patchError);
      // Fallback to original blob if patching fails
      saveAs(blob, filename);
    }

    return { success: true, filename };
  } catch (error) {
    console.error("Error exporting comparison to Word:", error);
    throw error;
  }
};
