import React from "react";
import { FaBold, FaItalic, FaUnderline } from "react-icons/fa";
import "../styles/ColorBadge.css";

/**
 * ColorBadge Component
 * Displays a color or formatting marker with its semantic name
 */
const ColorBadge = ({
  type,
  name,
  color,
  size = "medium",
  showIcon = true,
}) => {
  const renderIcon = () => {
    switch (type) {
      case "bold":
        return <FaBold />;
      case "italic":
        return <FaItalic />;
      case "underline":
        return <FaUnderline />;
      default:
        return null;
    }
  };

  const getBackgroundColor = () => {
    if (type === "color" && color) {
      return color;
    }
    // Default backgrounds for semantic markers
    switch (type) {
      case "bold":
        return "#000000";
      case "italic":
        return "#4A90E2";
      case "underline":
        return "#F5A623";
      default:
        return "#CCCCCC";
    }
  };

  const getTextColor = () => {
    if (type === "color" && color) {
      // Calculate if text should be dark or light based on background
      const hex = color.replace("#", "");
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      return brightness > 155 ? "#000000" : "#FFFFFF";
    }
    return "#FFFFFF";
  };

  const backgroundColor = getBackgroundColor();
  const textColor = getTextColor();

  return (
    <span
      className={`color-badge color-badge-${size}`}
      style={{
        backgroundColor,
        color: textColor,
      }}
      title={name}
    >
      {showIcon && type !== "color" && (
        <span className="color-badge-icon">{renderIcon()}</span>
      )}
      <span className="color-badge-name">{name}</span>
    </span>
  );
};

export default ColorBadge;
