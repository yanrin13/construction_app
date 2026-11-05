import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../providers/AuthProvider";
import type { UserRole } from "../../features/auth/api/profile";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <p>Загрузка...</p>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return <p>Не удалось загрузить профиль пользователя.</p>;
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return (
      <Navigate
        to={profile.role === "manager" ? "/objects" : "/my-tasks"}
        replace
      />
    );
  }

  return <Outlet />;
}
