const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

export const createGroupOnServer = async ({
  name,
  description,
  experimentId,
}) => {
  if (!name || !description) {
    return { success: false, message: "נא למלא את כל שדות החובה" };
  }

  const res = await fetch(`${API_BASE_URL}/api/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, experimentId }),
  });

  if (!res.ok) throw new Error("שגיאה ביצירת קבוצה");
  return await res.json();
};

export const deleteGroupFromServer = async (groupId) => {
  const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}`, {
    method: "DELETE",
  });

  if (!res.ok) throw new Error("שגיאה במחיקת קבוצה");
  return await res.json();
};

export const fetchGroupsFromServer = async () => {
  const res = await fetch(`${API_BASE_URL}/api/groups`);
  if (!res.ok) throw new Error("שגיאה בקבלת קבוצות");
  return await res.json();
};

export const fetchGroupsByExperimentId = async (experimentId) => {
  const res = await fetch(
    `${API_BASE_URL}/api/groups/byExperiment/${experimentId}`
  );
  if (!res.ok) {
    throw new Error("Failed to fetch groups");
  }
  return await res.json();
};
