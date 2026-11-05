import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider, useAuth } from "../providers/AuthProvider";

import { ProtectedRoute } from "./ProtectedRoute";

import LoginPage from "../../features/auth/pages/LoginPage";
import ObjectsPage from "../../pages/ObjectsPage";
import MyTasksPage from "../../pages/MyTasksPage";
import TaskPage from "../../features/tasks/pages/TaskPage";
import NotFoundPage from "../../pages/NotFoundPage";

function HomeRedirect() {
  const { session, profile, loading } = useAuth();

  if (loading) return <p>Загрузка...</p>;

  if (!session) return <Navigate to="/login" replace />;

  if (!profile) return <p>Не удалось загрузить профиль.</p>;

  return (
    <Navigate
      to={profile.role === "manager" ? "/objects" : "/my-tasks"}
      replace
    />
  );
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<ProtectedRoute allowedRoles={["manager"]} />}>
            <Route path="/objects" element={<ObjectsPage />} />
          </Route>

          <Route element={<ProtectedRoute allowedRoles={["executor"]} />}>
            <Route path="/my-tasks" element={<MyTasksPage />} />
          </Route>

          <Route
            element={<ProtectedRoute allowedRoles={["manager", "executor"]} />}
          >
            <Route path="/tasks/:taskId" element={<TaskPage />} />
          </Route>

          <Route path="/" element={<HomeRedirect />} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
