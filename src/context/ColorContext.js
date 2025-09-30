// context/ColorContext.js
import React, { createContext, useContext } from "react";
import {
  addColorToServer,
  deleteColorFromServer,
  fetchColorsFromServer,
} from "../api/ColorApi";

const ColorContext = createContext();
export const useColor = () => useContext(ColorContext);

export function ColorProvider({ children }) {
  const addColor = async (name, code) => {
    return await addColorToServer(name, code);
  };

  const deleteColor = async (id) => {
    return await deleteColorFromServer(id);
  };

  const getColors = async () => {
    return await fetchColorsFromServer();
  };

  return (
    <ColorContext.Provider value={{ addColor, deleteColor, getColors }}>
      {children}
    </ColorContext.Provider>
  );
}
