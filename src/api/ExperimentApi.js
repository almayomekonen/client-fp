import { API_BASE_URL } from "./config";

export const createExperimentOnServer = async ({
  name,
  description,
  investigatorId,
  defaultTaskId,
}) => {
  const res = await fetch(`${API_BASE_URL}/api/experiments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, description, investigatorId, defaultTaskId }),
  });

  if (!res.ok) throw new Error("שגיאה ביצירת ניסוי");
  return await res.json();
};

export const deleteExperimentFromServer = async (experimentId) => {
  const res = await fetch(`${API_BASE_URL}/api/experiments/${experimentId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!res.ok) throw new Error("שגיאה במחיקת ניסוי");
  return await res.json();
};

export const fetchExperimentsFromServer = async () => {
  const res = await fetch(`${API_BASE_URL}/api/experiments`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("שגיאה בקבלת ניסויים");
  return await res.json();
};

export async function updateExperimentOnServer(experimentId, updateFields) {
  const response = await fetch(
    `${API_BASE_URL}/api/experiments/${experimentId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updateFields),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update experiment");
  }

  return await response.json();
}

export const fetchExperimentById = async (experimentId) => {
  const res = await fetch(`${API_BASE_URL}/api/experiments/${experimentId}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("שגיאה בקבלת ניסוי");
  return await res.json();
};

export const fetchExperimentsByInvestigatorId = async (investigatorId) => {
  const res = await fetch(
    `${API_BASE_URL}/api/experiments/by-investigator-id/${investigatorId}`,
    {
      credentials: "include",
    }
  );
  if (!res.ok) throw new Error("שגיאה בקבלת ניסויים של החוקר");
  return await res.json();
};

export const fetchInvestigatorNameByExperimentId = async (experimentId) => {
  const res = await fetch(
    `${API_BASE_URL}/api/experiments/${experimentId}/investigatorName`,
    {
      credentials: "include",
    }
  );
  if (!res.ok) throw new Error("שגיאה בקבלת שם החוקר");
  return await res.json();
};
