import React, { createContext, useContext } from "react";
import {
  sendVerificationCode as sendVerificationCodeService,
  verifyCode as verifyCodeService,
} from "../api/EmailVerificationApi";

const EmailVerificationContext = createContext();

export function EmailVerificationProvider({ children }) {
  // Send verification code
  const sendVerificationCode = async (email) => {
    return await sendVerificationCodeService(email);
  };

  // Verify code that user received
  const verifyCode = async (email, code) => {
    return await verifyCodeService(email, code);
  };

  return (
    <EmailVerificationContext.Provider
      value={{ sendVerificationCode, verifyCode }}
    >
      {children}
    </EmailVerificationContext.Provider>
  );
}

export const useEmailVerification = () => useContext(EmailVerificationContext);
