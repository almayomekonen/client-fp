export const getColorName = (colorCode, colors = []) => {
  if (!colorCode) return "";
  const color = colors.find((c) => c.code === colorCode);
  return color ? color.name : colorCode;
};

export const getStyleName = (styleType, styleSettings = {}) => {
  const defaultNames = {
    bold: "Bold",
    italic: "Italic",
    underline: "Underline",
  };

  switch (styleType) {
    case "bold":
      return styleSettings.boldName || defaultNames.bold;
    case "italic":
      return styleSettings.italicName || defaultNames.italic;
    case "underline":
      return styleSettings.underlineName || defaultNames.underline;
    default:
      return styleType;
  }
};

export const isLightColor = (hexColor) => {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
};

export const getFormattingMarkers = ({
  colors = [],
  styleSettings = {},
  counts = {},
}) => {
  const markers = [];

  // Add colors
  colors.forEach((color) => {
    if (counts[color.code] !== undefined) {
      markers.push({
        key: color.code,
        name: color.name,
        type: "color",
        color: color.code,
        value: counts[color.code],
      });
    }
  });

  // Add style markers if enabled and have counts
  if (styleSettings.boldEnabled && counts.bold !== undefined) {
    markers.push({
      key: "bold",
      name: styleSettings.boldName || "Bold",
      type: "bold",
      value: counts.bold,
    });
  }

  if (styleSettings.italicEnabled && counts.italic !== undefined) {
    markers.push({
      key: "italic",
      name: styleSettings.italicName || "Italic",
      type: "italic",
      value: counts.italic,
    });
  }

  if (styleSettings.underlineEnabled && counts.underline !== undefined) {
    markers.push({
      key: "underline",
      name: styleSettings.underlineName || "Underline",
      type: "underline",
      value: counts.underline,
    });
  }

  return markers;
};
