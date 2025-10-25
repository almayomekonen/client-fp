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
  }, []);

  // Load colors from server on mount
  useEffect(() => {
    loadColors();
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
    try {
      const newColor = await addColor(pickedColor, pickedColor);
      setColors([...colors, newColor]); // Add to local list
      alert(`✅ Color ${pickedColor} added successfully!`);
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
      alert(`🗑️ Color ${color.name} removed`);
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
                <span className="color-name">{color.code}</span>
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
          <button onClick={handleAddColor} className="add-color-btn">
            <FaPlus /> Add Color to List
          </button>
        </div>
      </div>

      {/* ✍️ Style Options */}
      <div className="style-settings-section">
        <h3 className="colors-section-title">Style Options</h3>
        <div className="style-options">
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
        </div>
      </div>
    </div>
  );
}
