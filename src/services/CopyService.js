// src/services/CopyService.js


export const copiesByStatementId = (copies, { statementId }) => {
  return copies.filter(copy => copy.statementId === statementId);
};

export const copyById = (copies, { copyId }) => {
  return copies.find(c => c._id === copyId);
};

export const copiesForExperimentByCoderId = (copies, { coderId }) => {
  const userCopies = copies.filter(copy => copy.coderId === coderId);

  const experimentsMap = {};
  userCopies.forEach(copy => {
    if (!experimentsMap[copy.experimentId]) {
      experimentsMap[copy.experimentId] = {
        experiment: {
          _id: copy.experimentId,
        },
        copies: []
      };
    }
    experimentsMap[copy.experimentId].copies.push(copy);
  });

  return Object.values(experimentsMap);
}

export  const copyByStatementAndUser = (copies, { statementId, userId }) => {
    return copies.find(c => c.statementId === statementId && c.coderId === userId);
};


export const copiesByTaskId = ( copies, tasks, { taskId }) => {
  const task = tasks.find(t => t._id === taskId);
  return copies.filter(c => task.copiesId.includes(c._id));
};



export const calculateCompletionPercentage = ({ relevantCopies }) => {
    if (!relevantCopies.length) return 0;
    const completed = relevantCopies.filter(copy => copy.status === 'completed').length;
    return Math.round((completed / relevantCopies.length) * 100);
  };

export const getLastUpdateDate = ({ relevantCopies }) => {
    const dates = relevantCopies
      .map(copy => new Date(copy.lastUpdate))
      .filter(date => !isNaN(date));
    if (!dates.length) return null;
    const latest = new Date(Math.max(...dates));
    return latest.toLocaleString();
  };

