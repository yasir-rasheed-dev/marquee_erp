import React from 'react';
import { usePermissions } from '../../hooks/usePermissions';

/**
 * PermissionGuard component
 * Conditionally renders children if the user has the required permission.
 * 
 * Usage:
 * <PermissionGuard resource="bookings" action="edit">
 *   <button>Edit Booking</button>
 * </PermissionGuard>
 * 
 * <PermissionGuard resource="bookings" action="delete">
 *   <button>Delete Booking</button>
 * </PermissionGuard>
 */
export default function PermissionGuard({ resource, action = 'view', fallback = null, children }) {
  const { can, loading } = usePermissions();

  if (loading) return null;

  if (can(resource, action)) {
    return <>{children}</>;
  }

  return fallback;
}
