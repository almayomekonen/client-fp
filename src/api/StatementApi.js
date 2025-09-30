//StatementService.js

export const createStatementOnServer = async ({  name, text, groupId, experimentId }) => {

    if (!name || !text) {
    return { success: false, message: 'נא למלא את כל שדות החובה' };
  }

    const slateText =  // אם כבר קיבלנו מערך (Slate) – לא נוגעים
     [
        {
          type: "paragraph",
          children: [{ text }],
        },
      ];
  
  const res = await fetch('http://localhost:5000/api/statements', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, slateText, groupId, experimentId}),
  });

  if (!res.ok) throw new Error('שגיאה ביצירת הצהרה');
  return await res.json();
};

export const deleteStatementFromServer = async (id) => {
  const res = await fetch(`http://localhost:5000/api/statements/${id}`, {
    method: 'DELETE'
  });

  if (!res.ok) throw new Error('שגיאה במחיקת הצהרה');
  return await res.json();
};

export const fetchStatementsFromServer = async () => {
  const res = await fetch('http://localhost:5000/api/statements');
  if (!res.ok) throw new Error('שגיאה בקבלת הצהרות');
  return await res.json();
};





// מחזיר את כל ההצהרות של קבוצה ספציפית
export const fetchStatementsByGroupId = async (groupId) => {
  const res = await fetch(`http://localhost:5000/api/statements/group/${groupId}`);
  if (!res.ok) throw new Error('שגיאה בטעינת הצהרות הקבוצה');
  return await res.json();
};

// מחזיר הצהרה לפי ID
export const fetchStatementById = async (statementId) => {
  const res = await fetch(`http://localhost:5000/api/statements/${statementId}`);
  if (!res.ok) throw new Error('שגיאה בטעינת הצהרה');
  return await res.json();
};


// מחזיר את כל ההצהרות של ניסוי ספציפי
export const fetchStatementsByExperimentId = async (experimentId) => {
  const res = await fetch(`http://localhost:5000/api/statements/experiment/${experimentId}`);
  if (!res.ok) throw new Error('שגיאה בטעינת הצהרות הניסוי');
  return await res.json();
};


