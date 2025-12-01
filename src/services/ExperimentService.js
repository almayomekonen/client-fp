import { createTaskOnServer } from "../api/TaskApi";
import { createExperimentOnServer } from "../api/ExperimentApi";
import { updateExperimentOnServer } from "../api/ExperimentApi";

export const addExperiment = async ({ name, description, investigatorId }) => {
  if (!name || !investigatorId) {
    return { success: false, message: "Please fill in all required fields" };
  }

  // Create experiment
  const newExperiment = await createExperimentOnServer({
    name,
    description,
    investigatorId,
    defaultTaskId: null,
  });
  // Create default task
  const newDefaultTask = await createTaskOnServer({
    experimentId: newExperiment._id,
    copiesId: [],
    investigatorId,
    coderId: investigatorId,
  });
  // Link task to experiment
  await updateExperimentOnServer(newExperiment._id, {
    defaultTaskId: newDefaultTask._id,
  });

  return {
    success: true,
    message: "Experiment added successfully",
    newExperiment,
  };
};
