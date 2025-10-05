// TaskContext.js
import React, { createContext, useContext, useEffect } from "react";
import { useData } from "./DataContext";
import { useRefresh } from "./RefreshContext";
import { useTaskMessage } from "./TaskMessageContext";
import {
  tasksByInvestigatorId as tasksByInvestigatorIdService,
  tasksByCoderId as tasksByCoderIdService,
  experimentPercent as experimentPercentService,
  taskProgress as taskProgressService,
  addTask as addTaskService,
} from "../services/TaskService";

import {
  addTaskForCopy as addTaskForCopyService,
  deleteTaskFromServer as deleteTaskFromServerService,
  updateTaskOnServer as updateTaskOnServerService,
} from "../api/TaskApi";

const TaskContext = createContext();
export const useTask = () => useContext(TaskContext);

export function TaskProvider({ children }) {
  const { refreshCopies, refreshTasks } = useRefresh();
  // Import data
  const { copies, tasks, setTasks } = useData();

  // Create task
  const addTask = async (experimentId, investigatorId, coderId, percent) => {
    const result = await addTaskService(
      copies,

      { experimentId, investigatorId, coderId, percent }
    );
    await refreshTasks();
    await refreshCopies();
    return result;
  };

  // Task by investigator
  const tasksByInvestigatorId = (investigatorId) => {
    return tasksByInvestigatorIdService(tasks, { investigatorId });
  };

  // Task by coder
  const tasksByCoderId = (coderId) => {
    return tasksByCoderIdService(tasks, { coderId });
  };

  //אחוז ניסוי למשימה
  const experimentPercent = async (taskId) => {
    return experimentPercentService(copies, tasks, { taskId });
  };

  // Create task עבור יצירת העתק בודד
  const addTaskForCopy = async (
    experimentId,
    groupId,
    statementId,
    investigatorId,
    coderId
  ) => {
    await addTaskForCopyService({
      experimentId,
      groupId,
      statementId,
      investigatorId,
      coderId,
    });
    await refreshTasks();
    await refreshCopies();
  };

  const deleteTask = async (id) => {
    await deleteTaskFromServerService(id);

    setTasks((prevTasks) => prevTasks.filter((task) => task._id !== id));

    await refreshTasks();
    await refreshCopies();
  };

  const taskProgress = (taskId) => {
    return taskProgressService(copies, tasks, { taskId });
  };

  const taskById = (taskId) => {
    return tasks.find((t) => t._id === taskId);
  };

  const addCopyToTask = async (taskId, copyId) => {
    await updateTaskOnServerService(taskId, { addCopy: copyId });
    await refreshTasks();
    await refreshCopies();
  };

  const removeCopyFromTaskOnServer = async (taskId, copyId) => {
    await updateTaskOnServerService(taskId, { removeCopy: copyId });

    // ✅ עדכון state מקומי – מסיר את ה-copyId מהמשימה
    setTasks((prev) =>
      prev.map((task) =>
        task._id === taskId
          ? { ...task, copiesId: task.copiesId.filter((id) => id !== copyId) }
          : task
      )
    );
  };

  return (
    <TaskContext.Provider
      value={{
        addTask,
        tasksByInvestigatorId,
        tasksByCoderId,
        experimentPercent,
        addTaskForCopy,
        deleteTask,
        taskProgress,
        taskById,
        addCopyToTask,
        removeCopyFromTaskOnServer,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}
