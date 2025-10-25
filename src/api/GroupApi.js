import { API_BASE_URL } from "./config";
import { fetchWithRoleCheck } from "./fetchWithRoleCheck";

export const createGroupOnServer = async ({
  name,
  description,
  experimentId,
}) => {
  if (!name || !description) {
    return { success: false, message: "נא למלא את כל שדות החובה" };
  }

  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, description, experimentId }),
  });

  if (!res.ok) throw new Error("Error creating group");
  return await res.json();
};

export const deleteGroupFromServer = async (groupId) => {
  const res = await fetchWithRoleCheck(
    `${API_BASE_URL}/api/groups/${groupId}`,
    {
      method: "DELETE",
      credentials: "include",
    }
  );

  if (!res.ok) throw new Error("Error deleting group");
  return await res.json();
};

export const fetchGroupsFromServer = async () => {
  const res = await fetchWithRoleCheck(`${API_BASE_URL}/api/groups`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Error fetching groups");
  return await res.json();
};

export const fetchGroupsByExperimentId = async (experimentId) => {
  const res = await fetchWithRoleCheck(
    `${API_BASE_URL}/api/groups/byExperiment/${experimentId}`,
    {
      credentials: "include",
    }
  );
  if (!res.ok) {
    throw new Error("Failed to fetch groups");
  }
  return await res.json();
};
