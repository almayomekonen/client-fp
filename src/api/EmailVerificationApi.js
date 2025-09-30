
export async function sendVerificationCode(email) {
  if (!email) {
    return { success: false, message: 'נא להזין אימייל' };
  }

  try {
    const res = await fetch('http://localhost:5000/api/email-verification/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    const data = await res.json();

    if (!res.ok) return { success: false, message: data.message };

    // אין לנו גישה לקוד עצמו מהשרת (למטרות ביטחון)
    return { success: true, message: data.message };
  } catch (err) {
    return { success: false, message: 'שגיאה בשליחת קוד אימות' };
  }
}

// אימות הקוד שהמשתמש קיבל
export async function verifyCode(email, code) {
  if (!email || !code) {
    return { success: false, message: 'נא להזין מייל וקוד' };
  }

  try {
    const res = await fetch('http://localhost:5000/api/email-verification/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });

    const data = await res.json();
    if (!res.ok) return { success: false, message: data.message };
    
    return { success: true, message: data.message };
  } catch (err) {
    return { success: false, message: 'שגיאה באימות הקוד' };
  }
}