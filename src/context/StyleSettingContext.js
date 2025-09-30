// context/StyleSettingContext.js
import React, { createContext, useContext } from "react";
import { fetchStyleSettingFromServer, updateStyleSettingOnServer } from "../api/StyleSettingApi";

const StyleSettingContext = createContext();
export const useStyleSetting = () => useContext(StyleSettingContext);

export function StyleSettingProvider({ children }) {

  const getStyleSetting = async () => {
    return await fetchStyleSettingFromServer();
  };

  const updateStyleSetting = async (style) => {
    return await updateStyleSettingOnServer(style);
  };

  return (
    <StyleSettingContext.Provider value={{ getStyleSetting, updateStyleSetting }}>
      {children}
    </StyleSettingContext.Provider>
  );
}
