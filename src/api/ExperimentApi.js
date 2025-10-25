import { API_BASE_URL } from "./config";
import { fetchWithRoleCheck } from "./fetchWithRoleCheck";

export const createExperimentOnServer = async ({
  name,
  description,
  investigatorId,
  defaultTaskId,
}) => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/experiments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, description, investigatorId, defaultTaskId }),
  });

  if (!res.ok) throw new Error("Error creating experiment");
  return await res.json();
};

export const deleteExperimentFromServer = async (experimentId) => {
  const res = await fetchWithRoleCheck(
    `${API_BASE_URL}/api/experiments/${experimentId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  if (!res.ok) throw new Error("Error deleting experiment");
  return await res.json();
};

export const fetchExperimentsFromServer = async () => {
  try {
    const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/experiments`, {
      credentials: "include",
    });

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ message: "Unknown error" }));
      console.error("❌ Server error:", res.status, errorData);
      throw new Error(
        errorData.message || `Error getting experiments (${res.status})`
      );
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.error("❌ Error fetching experiments:", err);
    throw err;
  }
};

export async function updateExperimentOnServer(experimentId, updateFields) {
  const response = await fetchWithRoleCheck(
    `${API_BASE_URL}/api/experiments/${experimentId}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(updateFields),
    }
  );

  if (!response.ok) {
    throw new Error("Error updating experiment");
  }

  return await response.json();
}

export const fetchExperimentById = async (experimentId) => {
  const res = await fetchWithRoleCheck(
    `${API_BASE_URL}/api/experiments/${experimentId}`,
    {
      credentials: "include",
    }
  );
  if (!res.ok) throw new Error("Error getting experiment");
  return await res.json();
};

export const fetchExperimentsByInvestigatorId = async (investigatorId) => {
  const res = await fetchWithRoleCheck(
    `${API_BASE_URL}/api/experiments/by-investigator-id/${investigatorId}`,
    {
      credentials: "include",
    }
  );
  if (!res.ok) throw new Error("Error getting experiments by investigator");
  return await res.json();
};

export const fetchInvestigatorNameByExperimentId = async (experimentId) => {
  try {
    const res = await fetchWithRoleCheck(
      `${API_BASE_URL}/api/experiments/${experimentId}/investigatorName`,
      {
        credentials: "include",
      }
    );

    if (!res.ok) {
      const errorData = await res
        .json()
        .catch(() => ({ message: "Unknown error" }));
      throw new Error(errorData.message || "Error getting investigator name");
    }

    return await res.json();
  } catch (err) {
    console.error(`❌ Error fetching investigator name:`, err);
    throw err;
  }
};
