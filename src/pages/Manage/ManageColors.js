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
  // Load colors from server when loading
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
    try {
      await deleteColor(color._id);
      setColors(colors.filter((c) => c._id !== color._id));
      alert(`🗑️ Color ${color.name} removed`);
    } catch (err) {
      alert("❌ Error deleting color");
    }
  };

  // ✍️ Change style options (still against DB through StyleSetting Context)
  const toggleStyle = async (field) => {
    try {
      const updated = { ...styleSettings, [field]: !styleSettings[field] };
      await updateStyleSetting(updated);
      setStyleSettings(updated);
    } catch (err) {
      alert("❌ Error updating settings");
    }
  };

  return (
    <div style={{ padding: 20, direction: "rtl" }}>
      <h2>Color and Options Management</h2>

      {/* 🎨 Existing colors */}
      <div style={{ marginBottom: 20 }}>
        <h4>Existing Colors:</h4>
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
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ➕ Add color */}
      <div style={{ marginBottom: 20 }}>
        <h4>Add New Color:</h4>
        <SketchPicker
          color={pickedColor}
          onChange={(color) => setPickedColor(color.hex)}
        />
        <button
          onClick={handleAddColor}
          style={{ marginTop: 10, padding: "5px 10px" }}
        >
          Add Color to List
        </button>
      </div>

      {/* ✍️ Style options */}
      <div>
        <h4>Style Options:</h4>
        <label>
          <input
            type="checkbox"
            checked={styleSettings.boldEnabled || false}
            onChange={() => toggleStyle("boldEnabled")}
          />{" "}
          Enable Bold
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={styleSettings.italicEnabled || false}
            onChange={() => toggleStyle("italicEnabled")}
          />{" "}
          Enable Italic
        </label>
        <br />
        <label>
          <input
            type="checkbox"
            checked={styleSettings.underlineEnabled || false}
            onChange={() => toggleStyle("underlineEnabled")}
          />{" "}
          Enable Underline
        </label>
      </div>
    </div>
  );
}
