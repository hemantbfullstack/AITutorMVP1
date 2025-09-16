import React from "react";
import { useAuth } from "@/hooks/useAuth";

interface RoleBasedAccessProps {
  children: React.ReactNode;
  allowedRoles: string[];
  fallback?: React.ReactNode;
}

export const RoleBasedAccess: React.FC<RoleBasedAccessProps> = ({
  children,
  allowedRoles,
  fallback = null,
}) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return fallback;
  }

  return <>{children}</>;
};

// Usage examples:
// <RoleBasedAccess allowedRoles={['admin']}>
//   <AdminOnlyContent />
// </RoleBasedAccess>

// <RoleBasedAccess allowedRoles={['admin', 'teacher']}>
//   <TeacherAndAdminContent />
// </RoleBasedAccess>
