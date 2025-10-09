import { API_BASE_URL } from "./config";

export const fetchStyleSettingFromServer = async () => {
  const res = await fetch(`${API_BASE_URL}/api/styles`, {
    method: "GET",
  });
  if (!res.ok) throw new Error("שגיאה בקבלת הגדרות עיצוב");
  return await res.json();
};

export const updateStyleSettingOnServer = async (style) => {
  if (!style) {
    return { success: false, message: "נא להגדיר עיצוב" };
  }
  const res = await fetch(`${API_BASE_URL}/api/styles`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(style),
  });
  if (!res.ok) throw new Error("שגיאה בעדכון הגדרות עיצוב");
  return await res.json();
};
