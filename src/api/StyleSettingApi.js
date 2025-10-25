import { API_BASE_URL } from "./config";
import { fetchWithRoleCheck } from "./fetchWithRoleCheck";

export const fetchStyleSettingFromServer = async () => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/styles`, {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Error fetching style settings");
  return await res.json();
};

export const updateStyleSettingOnServer = async (style) => {
  if (!style) {
    return { success: false, message: "Please define style settings" };
  }
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/styles`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(style),
  });
  if (!res.ok) throw new Error("Error updating style settings");
  return await res.json();
};
