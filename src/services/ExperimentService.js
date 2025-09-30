
import { createTaskOnServer } from '../api/TaskApi';
import { createExperimentOnServer } from '../api/ExperimentApi';
import { updateExperimentOnServer } from '../api/ExperimentApi';



export const addExperiment = async({ name, description, investigatorId }) => {
  if (!name || !investigatorId) {
    return { success: false, message: 'נא למלא את כל שדות החובה' };
  }

  // יצירת ניסוי
  const newExperiment = await createExperimentOnServer({ name, description, investigatorId, defaultTaskId: null });
  // יצירת משימה ברירת מחדל
  const newDefaultTask = await createTaskOnServer({
    experimentId: newExperiment._id,
    copiesId: [],   
    investigatorId,
    coderId: investigatorId
  });
  // קישור המשימה לניסוי
await updateExperimentOnServer(newExperiment._id, {
  defaultTaskId: newDefaultTask._id
});

  return { success: true, message: 'הניסוי התווסף בהצלחה', newExperiment };
};


  


