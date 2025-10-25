// context/ColorContext.js
import React, { createContext, useContext } from "react";
import {
  createColorOnServer,
  deleteColorFromServer,
  fetchColorsFromServer,
} from "../api/ColorApi";

const ColorContext = createContext();
export const useColor = () => useContext(ColorContext);

export function ColorProvider({ children }) {
  const addColor = async (code, name) => {
    return await createColorOnServer(code, name);
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
