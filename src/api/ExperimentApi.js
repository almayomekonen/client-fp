const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
export const createExperimentOnServer = async ({
  name,
  description,
  investigatorId,
  defaultTaskId,
}) => {
  const res = await fetch(`${API_BASE_URL}/api/experiments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, description, investigatorId, defaultTaskId }),
  });

  if (!res.ok) throw new Error("שגיאה ביצירת ניסוי");
  return await res.json();
};

export const deleteExperimentFromServer = async (experimentId) => {
  const res = await fetch(`${API_BASE_URL}/api/experiments/${experimentId}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || "שגיאה במחיקת ניסוי");
  }
  return await res.json();
};

export const fetchExperimentsFromServer = async () => {
  const res = await fetch(`${API_BASE_URL}/api/experiments`);
  if (!res.ok) throw new Error("שגיאה בקבלת ניסויים");
  return await res.json();
};

export async function updateExperimentOnServer(experimentId, updateFields) {
  const response = await fetch(
    `${API_BASE_URL}/api/experiments/${experimentId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateFields),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update experiment");
  }

  return await response.json();
}

// קבלת ניסוי לפי מזהה
export const fetchExperimentById = async (experimentId) => {
  const res = await fetch(`${API_BASE_URL}/api/experiments/${experimentId}`);
  if (!res.ok) throw new Error("שגיאה בקבלת ניסוי");
  return await res.json();
};

// קבלת ניסויים לפי מזהה חוקר
export const fetchExperimentsByInvestigatorId = async (investigatorId) => {
  const res = await fetch(
    `${API_BASE_URL}/api/experiments/by-investigator-id/${investigatorId}`
  );
  if (!res.ok) throw new Error("שגיאה בקבלת ניסויים של החוקר");
  return await res.json();
};

// קבלת שם החוקר לפי מזהה ניסוי
export const fetchInvestigatorNameByExperimentId = async (experimentId) => {
  const res = await fetch(
    `${API_BASE_URL}/api/experiments/${experimentId}/investigatorName`
  );
  if (!res.ok) throw new Error("שגיאה בקבלת שם החוקר");
  return await res.json(); // { username: '...' }
};
