// components/Admin/ManageColors.jsx
import React, { useEffect, useState } from "react";
import { SketchPicker } from "react-color";
import { useColor } from "../../context/ColorContext";
import { useStyleSetting } from "../../context/StyleSettingContext";

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
    <div style={{ padding: 20, direction: "rtl" }}>
      <h2>ניהול צבעים ואפשרויות</h2>

      {/* 🎨 צבעים קיימים */}
      <div style={{ marginBottom: 20 }}>
        <h4>צבעים קיימים:</h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {colors.map((color) => (
            <div key={color._id} style={{ textAlign: "center" }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  backgroundColor: color.code,
                  border: "1px solid #ccc",
                  marginBottom: 4,
                }}
                title={color.name}
              />
              <button
                onClick={() => handleRemoveColor(color)}
                style={{
                  backgroundColor: "red",
                  color: "white",
                  border: "none",
                  padding: "2px 6px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                הסר
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ➕ הוספת צבע */}
      <div style={{ marginBottom: 20 }}>
        <h4>הוסף צבע חדש:</h4>
        <SketchPicker
          color={pickedColor}
          onChange={(color) => setPickedColor(color.hex)}
        />
        <button
          onClick={handleAddColor}
          style={{ marginTop: 10, padding: "5px 10px" }}
        >
          הוסף צבע לרשימה
        </button>
      </div>

      {/* ✍️ אפשרויות עיצוב */}
      <div>
        <h4>אפשרויות עיצוב:</h4>
        <label>
          <input
            type="checkbox"
            checked={styleSettings.boldEnabled || false}
            onChange={() => toggleStyle("boldEnabled")}
          />{" "}
          אפשר בולד
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={styleSettings.italicEnabled || false}
            onChange={() => toggleStyle("italicEnabled")}
          />{" "}
          אפשר איטליק
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={styleSettings.underlineEnabled || false}
            onChange={() => toggleStyle("underlineEnabled")}
          />{" "}
          אפשר קו תחתון
        </label>
      </div>
    </div>
  );
}
