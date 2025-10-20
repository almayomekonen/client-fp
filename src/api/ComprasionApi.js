import { API_BASE_URL } from "./config";
import { fetchWithRoleCheck } from "./fetchWithRoleCheck";

export const removeAllComparisons = async (copyId) => {
  const res = await fetchWithRoleCheck(
    `${API_BASE_URL}/api/comparisons/remove-all-comparisons`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ copyId }),
    }
  );
  if (!res.ok) throw new Error("שגיאה בהסרת כל ההשוואות");
  return await res.json();
};

export const deleteComparison = async (copyId1, copyId2) => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/comparisons/remove-comparison`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ copyId1, copyId2 }),
  });
  if (!res.ok) throw new Error("שגיאה בהסרת השוואה");
  return await res.json();
};

export const createComparison = async (copyId1, copyId2) => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/comparisons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ copyId1, copyId2 }),
  });
  if (!res.ok) throw new Error("שגיאה בהוספת השוואה");
  return await res.json();
};

export const fetchComparisonsFromServer = async () => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/comparisons`, {
    method: "GET",
    credentials: "include",
  });
  if (!res.ok) throw new Error("שגיאה בקבלת השוואות");
  return await res.json();
};

export const getComparisonsForCopyFromServer = async (copyId) => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/comparisons/copy/${copyId}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("שגיאה בקבלת השוואות מהשרת");
  return await res.json();
};

export const checkComparisonExists = async (copyId1, copyId2) => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/comparisons/check-exists`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ copyId1, copyId2 }),
  });
  if (!res.ok) throw new Error("שגיאה בבדיקת השוואה");
  const data = await res.json();
  return data.exists;
};
