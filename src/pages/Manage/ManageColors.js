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

  // טוען מהשרת
  useEffect(() => {
    const loadStyle = async () => {
      try {
        const data = await getStyleSetting();
        setStyleSettings(data);
      } catch (err) {
        alert("❌ שגיאה בטעינת הגדרות עיצוב");
      }
    };
    loadStyle();
  }, []);
  // טוען צבעים מהשרת כשעולים
  useEffect(() => {
    loadColors();
  }, []);

  const loadColors = async () => {
    try {
      const data = await getColors();
      setColors(data);
    } catch (err) {
      alert("❌ שגיאה בטעינת צבעים");
    }
  };

  // ➕ הוספת צבע
  const handleAddColor = async () => {
    try {
      const newColor = await addColor(pickedColor, pickedColor);
      setColors([...colors, newColor]); // מוסיף לרשימה המקומית
      alert(`✅ הצבע ${pickedColor} נוסף בהצלחה!`);
    } catch (err) {
      alert("❌ שגיאה בהוספת צבע");
    }
  };

  // ➖ מחיקת צבע
  const handleRemoveColor = async (color) => {
    try {
      await deleteColor(color._id);
      setColors(colors.filter((c) => c._id !== color._id));
      alert(`🗑️ הצבע ${color.name} הוסר`);
    } catch (err) {
      alert("❌ שגיאה במחיקת צבע");
    }
  };

  // ✍️ שינוי אפשרויות עיצוב (עדיין מול DB דרך ה־Context של StyleSetting)
  const toggleStyle = async (field) => {
    try {
      const updated = { ...styleSettings, [field]: !styleSettings[field] };
      await updateStyleSetting(updated);
      setStyleSettings(updated);
    } catch (err) {
      alert("❌ שגיאה בעדכון ההגדרות");
    }
  };

  return (
    <div className="manage-colors-container">
      <div className="manage-colors-header">
        <h1 className="manage-colors-title">
          <FaPalette /> ניהול צבעים ואפשרויות עיצוב
        </h1>
        <p className="manage-colors-subtitle">
          הוספה ומחיקה של צבעים, והגדרת אפשרויות עיצוב למערכת
        </p>
      </div>

      {/* 🎨 צבעים קיימים */}
      <div className="colors-section">
        <h3 className="colors-section-title">
          <FaPalette /> צבעים קיימים
        </h3>
        {colors.length === 0 ? (
          <div className="colors-empty-state">
            <div className="colors-empty-icon">🎨</div>
            <p className="colors-empty-text">אין צבעים במערכת</p>
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
                  <FaTrash /> הסר
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ➕ הוספת צבע */}
      <div className="add-color-section">
        <h3 className="colors-section-title">
          <FaPlus /> הוסף צבע חדש
        </h3>
        <div className="color-picker-container">
          <div className="color-picker-wrapper">
            <SketchPicker
              color={pickedColor}
              onChange={(color) => setPickedColor(color.hex)}
            />
          </div>
          <button onClick={handleAddColor} className="add-color-btn">
            <FaPlus /> הוסף צבע לרשימה
          </button>
        </div>
      </div>

      {/* ✍️ אפשרויות עיצוב */}
      <div className="style-settings-section">
        <h3 className="colors-section-title">אפשרויות עיצוב</h3>
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
              אפשר בולד (מודגש)
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
              אפשר איטליק (נטוי)
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
              אפשר קו תחתון
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
