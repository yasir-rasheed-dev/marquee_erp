// components/PermissionGuard.jsx
import React from 'react';
import { usePermissions } from '../hooks/usePermissions';

const PermissionGuard = ({ resource, action = 'view', children, fallback = null }) => {
  const { can, userRole, loading } = usePermissions();

  if (loading) return null;
  if (userRole === 'super_admin' || userRole === 'admin') return children;

  const actions = Array.isArray(action) ? action : [action];
  const hasPermission = actions.some(a => can(resource, a));

  if (!hasPermission) return fallback;
  return children;
};

export default PermissionGuard;