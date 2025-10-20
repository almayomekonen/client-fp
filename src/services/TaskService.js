//TaskService.js
import { createCopyOnServer } from "../api/CopyApi";
import { createTaskOnServer } from "../api/TaskApi";
import { fetchStatementsByExperimentId } from "../api/StatementApi";

export const addTask = async (
  copies,
  { experimentId, investigatorId, coderId, percent }
) => {
  const newCopyIds = await copiesForTask(copies, {
    experimentId,
    coderId,
    percent,
  });

  await createTaskOnServer({
    experimentId,
    copiesId: newCopyIds,
    investigatorId,
    coderId,
  });

  return { success: true, message: "המשימה התווספה בהצלחה" };
};

export const tasksByInvestigatorId = (tasks, { investigatorId }) => {
  return tasks.filter((task) => task.investigatorId === investigatorId);
};

export const tasksByCoderId = (tasks, { coderId }) => {
  return tasks.filter((task) => task.coderId === coderId);
};

export const copiesForTask = async (
  copies,

  { experimentId, coderId, percent }
) => {
  const statementsInExperiment = await fetchStatementsByExperimentId(
    experimentId
  ); // ← פונקציה חדשה ב-StatementContext

  const totalStatementsCount = statementsInExperiment.length;

  if (totalStatementsCount === 0) {
    return [];
  }

  if (percent === 0) {
    return [];
  }

  let bestCount = 1;
  let bestDiff = Math.abs((1 / totalStatementsCount) * 100 - percent);

  for (let i = 2; i <= totalStatementsCount; i++) {
    const pct = (i / totalStatementsCount) * 100;
    const diff = Math.abs(pct - percent);
    if (diff < bestDiff) {
      bestCount = i;
      bestDiff = diff;
    }
  }

  const desiredCount = bestCount;
  const copyCountsByStatementId = {};

  for (const s of statementsInExperiment) {
    const copyCount = copies.filter((c) => c.statementId === s._id).length;
    copyCountsByStatementId[s._id] = copyCount;
  }

  const statementsWithoutCoderCopy = [];
  const statementsWithCoderCopy = [];

  for (const s of statementsInExperiment) {
    const hasCopyForCoder = copies.some(
      (c) => c.statementId === s._id && c.coderId === coderId
    );
    if (!hasCopyForCoder) {
      statementsWithoutCoderCopy.push(s);
    } else {
      statementsWithCoderCopy.push(s);
    }
  }

  const groupCounters = {};
  statementsInExperiment.forEach((s) => {
    groupCounters[s.groupId] = 0;
  });

  const sortByGroupAndCopies = (arr) => {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.sort((a, b) => {
      if (groupCounters[a.groupId] !== groupCounters[b.groupId]) {
        return groupCounters[a.groupId] - groupCounters[b.groupId];
      }
      return copyCountsByStatementId[a._id] - copyCountsByStatementId[b._id];
    });
  };

  let availableStatements = [
    ...statementsWithoutCoderCopy,
    ...statementsWithCoderCopy,
  ];
  const newCopyIds = [];

  while (newCopyIds.length < desiredCount) {
    const sorted = sortByGroupAndCopies(availableStatements);
    if (sorted.length === 0) break;

    const s = sorted[0];

    const result = await createCopyOnServer({
      statementId: s._id,
      groupId: s.groupId,
      experimentId,
      coderId,
    });

    if (result.success && result.newCopy) {
      newCopyIds.push(result.newCopy._id);

      groupCounters[s.groupId] = (groupCounters[s.groupId] || 0) + 1;
      availableStatements = availableStatements.filter(
        (st) => st._id !== s._id
      );
    } else {
      availableStatements = availableStatements.filter(
        (st) => st._id !== s._id
      );
    }
  }

  return newCopyIds;
};

export const experimentPercent = async (copies, tasks, { taskId }) => {
  const task = tasks.find((t) => t._id === taskId);
  if (!task.copiesId || task.copiesId.length === 0) return 0;

  // כל ההצהרות של הניסוי הזה
  const expId = task.experimentId;
  const statementsInExperiment = await fetchStatementsByExperimentId(expId);

  // מוצאים את כל העתקי ההצהרות שקשורים למשימה
  const taskCopies = copies.filter((c) => task.copiesId.includes(c._id));

  // מזהים את כל ההצהרות הייחודיות במשימה
  const statementIdsInTask = [...new Set(taskCopies.map((c) => c.statementId))];

  if (statementsInExperiment.length === 0) return 0;

  // אחוז ההצהרות מתוך כלל הצהרות הניסוי
  const percent =
    (statementIdsInTask.length / statementsInExperiment.length) * 100;
  return percent.toFixed(0);
};

export const taskProgress = (copies, tasks, { taskId }) => {
  const task = tasks.find((t) => t._id === taskId);
  if (!task.copiesId || task.copiesId.length === 0) return 0;
  const taskCopies = copies.filter((c) => task.copiesId.includes(c._id));
  const completed = taskCopies.filter((c) => c.status === "completed").length;
  return ((completed / task.copiesId.length) * 100).toFixed(0);
};
