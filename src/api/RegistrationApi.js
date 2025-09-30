// services/registrationService.js

// רישום משתמשים
//לשנות ליצירה
export async function register(username, password, confirmPassword, role, email) {
  if (!username || !password || !confirmPassword || !role || !email) {
    return { success: false, message: 'נא למלא את כל השדות' };
  }

  if (password !== confirmPassword) {
    return { success: false, message: 'הסיסמאות אינן תואמות' };
  }

  try {
    const res = await fetch('http://localhost:5000/api/registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role, email })
    });

    const data = await res.json();
    if (!res.ok) return { success: false, message: data.message };

    return { success: true, message: data.message };
  } catch (err) {
    return { success: false, message: 'שגיאה בחיבור לשרת' };
  }
}



// אישור ודחיית משתמשים
//לשנות ליצירת משתמש ומחיקה מהרשימה
export async function approveRegistration(id) {
  await fetch(`http://localhost:5000/api/registration/${id}/approve`, { method: 'POST' });
}
//לשנות למחיקה מהרשימה
export async function rejectRegistration(id) {
  await fetch(`http://localhost:5000/api/registration/${id}`, { method: 'DELETE' });
}

export async function fetchRegistrationRequests() {
  try {
    const res = await fetch('http://localhost:5000/api/registration');
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'שגיאה בשרת');
    return data;
  } catch (err) {
    console.error(err);
    return [];
  }
}
