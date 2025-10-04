import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/Auth/Login";
import RegisterPage from "./pages/Auth/Register";
import AdminPanel from "./pages/Manage/ManageUsers";
import ResetPasswordPage from "./pages/Auth/ResetPassword";
import CoderHomePage from "./pages/Dashboard/CoderDashboard";
import InvestigatorHomePage from "./pages/Dashboard/InvestigatorDashboard";
import AdminHomePage from "./pages/Dashboard/AdminDashboard";
import Navbar from "./components/Navbar";
import StatementEditor from "./pages/Copy/EditCopy";
import ComparePage from "./pages/Compare/ComparePage";
import TaskManagementPage from "./pages/Task/TaskForAdmin";
import TaskForInvestigator from "./pages/Task/TaskForInvestigator";
import CoderCompare from "./pages/Compare/CoderCompare";
import View from "./pages/Copy/ViewCopy";
import ManageColors from "./pages/Manage/ManageColors";
import TaskForCoder from "./pages/Task/TaskForCoder";
import TaskChatPage from "./pages/Chat/TaskChat";
import CopyChatPage from "./pages/Chat/CopyChat";
import TaskSummary from "./pages/Summary/TaskSummary";
import StatementSummary from "./pages/Summary/StatementSummary";

import { DataProvider } from "./context/DataContext";
import { UserProvider } from "./context/UserContext";
import { ExperimentProvider } from "./context/ExperimentContext";
import { GroupProvider } from "./context/GroupContext";
import { StatementProvider } from "./context/StatementContext";
import { CopyProvider } from "./context/CopyContext";
import { TaskProvider } from "./context/TaskContext";
import { CommentProvider } from "./context/CommentContext";
import { TaskMessageProvider } from "./context/TaskMessageContext";
import { CopyMessageProvider } from "./context/CopyMessageContext";
import { RefreshProvider } from "./context/RefreshContext";
import { ColorProvider } from "./context/ColorContext";
import { StyleSettingProvider } from "./context/StyleSettingContext";
import { RegistrationProvider } from "./context/RegistrationContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { ComparisonProvider } from "./context/ComparisonContext";
import { EmailVerificationProvider } from "./context/EmailVerificationContext";
import { EditProvider } from "./context/EditContext";
import { ResultProvider } from "./context/ResultContext";

function App() {
  return (
    <Router>
      <DataProvider>
        <RefreshProvider>
          <EmailVerificationProvider>
            <EditProvider>
              <ResultProvider>
                <RegistrationProvider>
                  <ColorProvider>
                    <StyleSettingProvider>
                      <TaskMessageProvider>
                        <TaskProvider>
                          <CommentProvider>
                            <CopyMessageProvider>
                              <ComparisonProvider>
                                <CopyProvider>
                                  <StatementProvider>
                                    <GroupProvider>
                                      <ExperimentProvider>
                                        <UserProvider>
                                          <Navbar />

                                          <Routes>
                                            <Route
                                              path="/"
                                              element={<LoginPage />}
                                            />
                                            <Route
                                              path="/register"
                                              element={<RegisterPage />}
                                            />
                                            <Route
                                              path="/reset-password"
                                              element={<ResetPasswordPage />}
                                            />
                                            <Route
                                              path="/admin-panel"
                                              element={
                                                <ProtectedRoute requiredRole="admin">
                                                  <AdminPanel />
                                                </ProtectedRoute>
                                              }
                                            />
                                            <Route
                                              path="/coderHome"
                                              element={
                                                <ProtectedRoute>
                                                  <CoderHomePage />
                                                </ProtectedRoute>
                                              }
                                            />
                                            <Route
                                              path="/investigatorHome"
                                              element={
                                                <ProtectedRoute>
                                                  <InvestigatorHomePage />
                                                </ProtectedRoute>
                                              }
                                            />
                                            <Route
                                              path="/adminHome"
                                              element={
                                                <ProtectedRoute requiredRole="admin">
                                                  <AdminHomePage />
                                                </ProtectedRoute>
                                              }
                                            />
                                            <Route
                                              path="/edit-statement/:copyId"
                                              element={<StatementEditor />}
                                            />
                                            <Route
                                              path="/compare/:statementId"
                                              element={<ComparePage />}
                                            />
                                            <Route
                                              path="/task-management"
                                              element={
                                                <ProtectedRoute requiredRole="admin">
                                                  <TaskManagementPage />
                                                </ProtectedRoute>
                                              }
                                            />
                                            <Route
                                              path="/task-investigator"
                                              element={
                                                <ProtectedRoute>
                                                  <TaskForInvestigator />
                                                </ProtectedRoute>
                                              }
                                            />
                                            <Route
                                              path="/coder-compare/:copyId"
                                              element={<CoderCompare />}
                                            />
                                            <Route
                                              path="/view-statement/:copyId"
                                              element={<View />}
                                            />
                                            <Route
                                              path="/manage-colors"
                                              element={
                                                <ProtectedRoute requiredRole="admin">
                                                  <ManageColors />
                                                </ProtectedRoute>
                                              }
                                            />
                                            <Route
                                              path="/task-coder"
                                              element={
                                                <ProtectedRoute>
                                                  <TaskForCoder />
                                                </ProtectedRoute>
                                              }
                                            />
                                            <Route
                                              path="/task-chat/:taskId"
                                              element={<TaskChatPage />}
                                            />
                                            <Route
                                              path="/copy-chat/:copyId"
                                              element={<CopyChatPage />}
                                            />
                                            <Route
                                              path="/task-summary/:taskId"
                                              element={<TaskSummary />}
                                            />
                                            <Route
                                              path="/statement-summary/:statementId"
                                              element={<StatementSummary />}
                                            />
                                          </Routes>
                                        </UserProvider>
                                      </ExperimentProvider>
                                    </GroupProvider>
                                  </StatementProvider>
                                </CopyProvider>
                              </ComparisonProvider>
                            </CopyMessageProvider>
                          </CommentProvider>
                        </TaskProvider>
                      </TaskMessageProvider>
                    </StyleSettingProvider>
                  </ColorProvider>
                </RegistrationProvider>
              </ResultProvider>
            </EditProvider>
          </EmailVerificationProvider>
        </RefreshProvider>
      </DataProvider>
    </Router>
  );
}

export default App;
