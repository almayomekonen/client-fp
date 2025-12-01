// components/Admin/ManageColors.jsx
import React, { useEffect, useState } from "react";
import { SketchPicker } from "react-color";
import { useColor } from "../../context/ColorContext";
import { useStyleSetting } from "../../context/StyleSettingContext";
import {
  FaPalette,
  FaPlus,
  FaTrash,
  FaBold,
  FaItalic,
  FaUnderline,
} from "react-icons/fa";
import "../../styles/ManageColors.css";

export default function ManageColors() {
  const { addColor, deleteColor, getColors } = useColor();
  const { getStyleSetting, updateStyleSetting } = useStyleSetting();

  const [pickedColor, setPickedColor] = useState("#ff0000");
  const [colorName, setColorName] = useState("");
  const [colors, setColors] = useState([]);
  const [styleSettings, setStyleSettings] = useState({});

  // Load from server
  useEffect(() => {
    const loadStyle = async () => {
      try {
        const data = await getStyleSetting();
        setStyleSettings(data);
      } catch (err) {
        alert("❌ Error loading style settings");
      }
    };
    loadStyle();
  }, [getStyleSetting]);

  // Load colors from server on mount
  useEffect(() => {
    loadColors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadColors = async () => {
    try {
      const data = await getColors();
      setColors(data);
    } catch (err) {
      alert("❌ Error loading colors");
    }
  };

  // ➕ Add color
  const handleAddColor = async () => {
    if (!colorName.trim()) {
      alert("Please enter a color name");
      return;
    }
    try {
      const newColor = await addColor(colorName.trim(), pickedColor);
      setColors([...colors, newColor]); // Add to local list
      setColorName("");
      setPickedColor("#ff0000");
    } catch (err) {
      alert("❌ Error adding color");
    }
  };

  // ➖ Delete color
  const handleRemoveColor = async (color) => {
    if (
      !window.confirm(`Are you sure you want to delete color "${color.name}"?`)
    )
      return;

    try {
      await deleteColor(color._id);
      setColors(colors.filter((c) => c._id !== color._id));
    } catch (err) {
      alert("❌ Error deleting color");
    }
  };

  // ✍️ Toggle style options (via DB through StyleSetting Context)
  const toggleStyle = async (field) => {
    try {
      const updated = { ...styleSettings, [field]: !styleSettings[field] };
      await updateStyleSetting(updated);
      setStyleSettings(updated);
    } catch (err) {
      alert("❌ Error updating style settings");
    }
  };

  // Update style name
  const updateStyleName = async (field, value) => {
    try {
      const updated = { ...styleSettings, [field]: value };
      await updateStyleSetting(updated);
      setStyleSettings(updated);
    } catch (err) {
      alert("❌ Error updating style name");
    }
  };

  return (
    <div className="manage-colors-container">
      <div className="manage-colors-header">
        <h1 className="manage-colors-title">
          <FaPalette /> Manage Colors and Style Options
        </h1>
        <p className="manage-colors-subtitle">
          Add and remove colors, and configure style options for the system
        </p>
      </div>

      {/* 🎨 Existing Colors */}
      <div className="colors-section">
        <h3 className="colors-section-title">
          <FaPalette /> Existing Colors
        </h3>
        {colors.length === 0 ? (
          <div className="colors-empty-state">
            <div className="colors-empty-icon">🎨</div>
            <p className="colors-empty-text">No colors in the system</p>
          </div>
        ) : (
          <div className="colors-grid">
            {colors.map((color) => (
              <div key={color._id} className="color-item">
                <div
                  className="color-box"
                  style={{ backgroundColor: color.code }}
                  title={color.name}
                />
                <div className="color-info">
                  <span className="color-name">{color.name}</span>
                  <span className="color-code">{color.code}</span>
                </div>
                <button
                  onClick={() => handleRemoveColor(color)}
                  className="color-remove-btn"
                >
                  <FaTrash /> Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ➕ Add New Color */}
      <div className="add-color-section">
        <h3 className="colors-section-title">
          <FaPlus /> Add New Color
        </h3>
        <div className="color-picker-container">
          <div className="color-picker-wrapper">
            <SketchPicker
              color={pickedColor}
              onChange={(color) => setPickedColor(color.hex)}
            />
          </div>
          <div className="color-input-section">
            <label className="color-input-label">
              <strong>Color Name:</strong>
              <input
                type="text"
                className="color-name-input"
                placeholder='e.g., "Important", "Key Term", "Main Idea"'
                value={colorName}
                onChange={(e) => setColorName(e.target.value)}
              />
            </label>
            <button onClick={handleAddColor} className="add-color-btn">
              <FaPlus /> Add Color to List
            </button>
          </div>
        </div>
      </div>

      {/* ✍️ Style Options */}
      <div className="style-settings-section">
        <h3 className="colors-section-title">Semantic Formatting Options</h3>
        <p className="style-section-subtitle">
          Define custom names for formatting styles (these become semantic
          markers, not just visual styling)
        </p>

        <div className="style-options">
          {/* Bold */}
          <div className="style-option-card">
            <label className="style-option">
              <input
                type="checkbox"
                className="style-checkbox"
                checked={styleSettings.boldEnabled || false}
                onChange={() => toggleStyle("boldEnabled")}
              />
              <span className="style-label">
                <FaBold className="style-label-icon" />
                Enable Bold
              </span>
            </label>
            {styleSettings.boldEnabled && (
              <div className="style-name-input-group">
                <label className="style-name-label">Custom Name:</label>
                <input
                  type="text"
                  className="style-name-input"
                  placeholder='e.g., "Key Term", "Important Concept"'
                  value={styleSettings.boldName || "Bold"}
                  onChange={(e) => updateStyleName("boldName", e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Italic */}
          <div className="style-option-card">
            <label className="style-option">
              <input
                type="checkbox"
                className="style-checkbox"
                checked={styleSettings.italicEnabled || false}
                onChange={() => toggleStyle("italicEnabled")}
              />
              <span className="style-label">
                <FaItalic className="style-label-icon" />
                Enable Italic
              </span>
            </label>
            {styleSettings.italicEnabled && (
              <div className="style-name-input-group">
                <label className="style-name-label">Custom Name:</label>
                <input
                  type="text"
                  className="style-name-input"
                  placeholder='e.g., "Participant Thought", "Quote"'
                  value={styleSettings.italicName || "Italic"}
                  onChange={(e) =>
                    updateStyleName("italicName", e.target.value)
                  }
                />
              </div>
            )}
          </div>

          {/* Underline */}
          <div className="style-option-card">
            <label className="style-option">
              <input
                type="checkbox"
                className="style-checkbox"
                checked={styleSettings.underlineEnabled || false}
                onChange={() => toggleStyle("underlineEnabled")}
              />
              <span className="style-label">
                <FaUnderline className="style-label-icon" />
                Enable Underline
              </span>
            </label>
            {styleSettings.underlineEnabled && (
              <div className="style-name-input-group">
                <label className="style-name-label">Custom Name:</label>
                <input
                  type="text"
                  className="style-name-input"
                  placeholder='e.g., "Critical Action", "Key Event"'
                  value={styleSettings.underlineName || "Underline"}
                  onChange={(e) =>
                    updateStyleName("underlineName", e.target.value)
                  }
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
