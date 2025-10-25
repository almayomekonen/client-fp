import { API_BASE_URL } from "./config";
import { fetchWithRoleCheck } from "./fetchWithRoleCheck";

export const deleteAllComparisonsFromServer = async (copyId) => {
  const res = await fetchWithRoleCheck(
    `${API_BASE_URL}/api/comparisons/remove-all-comparisons`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ copyId }),
    }
  );
  if (!res.ok) throw new Error("Error removing all comparisons");
  return await res.json();
};

export const deleteComparisonFromServer = async (copyId1, copyId2) => {
  const res = await fetchWithRoleCheck(
    `${API_BASE_URL}/api/comparisons/remove-comparison`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ copyId1, copyId2 }),
    }
  );
  if (!res.ok) throw new Error("Error removing comparison");
  return await res.json();
};

export const createComparisonOnServer = async (copyId1, copyId2) => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/comparisons`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ copyId1, copyId2 }),
  });
  if (!res.ok) throw new Error("Error adding comparison");
  return await res.json();
};

export const fetchComparisonsFromServer = async () => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/comparisons`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Error fetching comparisons");
  return await res.json();
};

export const fetchComparisonsFromServerForCopy = async (copyId) => {
  const res = await fetchWithRoleCheck(
    `${API_BASE_URL}/api/comparisons/copy/${copyId}`,
    {
      credentials: "include",
    }
  );
  if (!res.ok) throw new Error("Error fetching comparisons from server");
  return await res.json();
};

export const checkComparisonExistsOnServer = async (copyId1, copyId2) => {
  try {
    const res = await fetchWithRoleCheck(
      `${API_BASE_URL}/api/comparisons/check-exists`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ copyId1, copyId2 }),
      }
    );
    if (!res.ok) throw new Error("Error checking comparison existence");
    const data = await res.json();
    return data.exists;
  } catch (err) {
    console.error("Error checking comparison existence:", err);
    return false;
  }
};
