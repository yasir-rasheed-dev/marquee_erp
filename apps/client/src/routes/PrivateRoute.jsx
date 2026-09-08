// routes/PrivateRoute.jsx
// COMPLETE FIXED - With bookings fallback

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const PrivateRoute = ({ allowedRoles, requiredResource }) => {
  const { isAuthenticated, isLoading, user, isTestMode } = useAuth();
  const { can, userRole, loading: permLoading, permissions } = usePermissions();

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

  // Agar koi restriction nahi di
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

  // ✅ FIX: Dynamic permission check with bookings fallback
  if (requiredResource) {
    let resourceToCheck = requiredResource;
    let resourcesToCheck = [requiredResource];
    
    // ✅ BOOKINGS FALLBACK
    if (requiredResource === 'bookings') {
      resourcesToCheck = ['bookings', 'bookings_list', 'bookings_create', 'bookings_calendar'];
    }
    
    // ✅ Check any of the resources
    const hasAccess = resourcesToCheck.some(res => can(res, 'view'));
    
    if (hasAccess) {
      return <Outlet />;
    }
    
    console.log(`❌ Access denied for ${requiredResource}. Available perms:`, permissions.map(p => `${p.resource}:${p.action}`));
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

export default PrivateRoute;