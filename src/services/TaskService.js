//TaskService.js
import { createCopyOnServer } from "../api/CopyApi";
import { createTaskOnServer } from "../api/TaskApi";
import { fetchStatementsByExperimentId } from "../api/StatementApi";

export const addTask = async (
  copies,
  { experimentId, investigatorId, coderId, percent }
) => {
  // Validate that experiment has statements
  const statementsInExperiment = await fetchStatementsByExperimentId(
    experimentId
  );

  if (statementsInExperiment.length === 0) {
    throw new Error(
      "Cannot create task: No statements found in this experiment. Please add statements first."
    );
  }

  const newCopyIds = await copiesForTask(copies, {
    experimentId,
    coderId,
    percent,
  });

  // Validate that copies were created (unless percent is 0, which is valid)
  if (newCopyIds.length === 0 && percent > 0) {
    throw new Error(
      "Cannot create task: No copies could be created. The coder may already have copies for all statements at the requested percentage."
    );
  }

  await createTaskOnServer({
    experimentId,
    copiesId: newCopyIds,
    investigatorId,
    coderId,
  });

  return { success: true, message: "Task added successfully" };
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
  ); // ← New function in StatementContext

  const totalStatementsCount = statementsInExperiment.length;

  if (totalStatementsCount === 0) {
    return [];
  }

  if (percent === 0) {
    return [];
  }

  let bestCount = 0;
  let bestDiff = Infinity;

  for (let i = 0; i <= totalStatementsCount; i++) {
    const pct = (i / totalStatementsCount) * 100;
    const diff = Math.abs(pct - percent);
    if (diff < bestDiff) {
      bestCount = i;
      bestDiff = diff;
    }
  }

  const desiredCount = bestCount;

  // If the best count is 0, return empty array
  if (desiredCount === 0) {
    return [];
  }
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

  // All statements of this experiment
  const expId = task.experimentId;
  const statementsInExperiment = await fetchStatementsByExperimentId(expId);

  // Find all statement copies related to the task
  const taskCopies = copies.filter((c) => task.copiesId.includes(c._id));

  // Identify all unique statements in the task
  const statementIdsInTask = [...new Set(taskCopies.map((c) => c.statementId))];

  if (statementsInExperiment.length === 0) return 0;

  // Percentage of statements out of all experiment statements
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
