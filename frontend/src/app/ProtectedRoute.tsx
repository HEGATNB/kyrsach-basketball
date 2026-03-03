import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './providers/AuthProvider';

interface ProtectedRouteProps {
  children: JSX.Element;
  roles?: string[]; // Опционально: список разрешенных ролей
}

export const ProtectedRoute = ({ children, roles = [] }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-slate-400">Загрузка...</div>;
  }

  if (!user) {
    // Если не авторизован -> на страницу входа, но запоминаем, куда хотел попасть
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    // Если роль не подходит (например, обычный юзер лезет в админку) -> на главную
    return <Navigate to="/" replace />;
  }

  return children;
};