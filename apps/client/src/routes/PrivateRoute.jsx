import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const PrivateRoute = ({ allowedRoles, requiredResource }) => {
  const { isAuthenticated, isLoading, user, isTestMode } = useAuth();
  const { can, userRole, loading: permLoading } = usePermissions();

  if (isLoading || permLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--theme-bg-base)' }}>
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const currentPath = window.location.pathname + window.location.search;
    if (currentPath !== '/login') {
      localStorage.setItem('intendedRoute', currentPath);
    }
    return <Navigate to="/login" replace />;
  }

  // Admin bypass
  if (userRole === 'super_admin' || userRole === 'admin' || isTestMode) {
    return <Outlet />;
  }

  // 🔥 FIX: Agar koi restriction nahi di (jaise /dashboard), toh allow karo
  if (!allowedRoles && !requiredResource) {
    return <Outlet />;
  }

  // Hardcoded roles check
  if (allowedRoles && allowedRoles.length > 0) {
    if (allowedRoles.includes(user?.role)) {
      return <Outlet />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  // Dynamic permission check
  if (requiredResource) {
    if (can(requiredResource, 'view')) {
      return <Outlet />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

export default PrivateRoute;