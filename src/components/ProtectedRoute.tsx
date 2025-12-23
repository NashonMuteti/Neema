"use client";

import React, { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate, Outlet } from 'react-router-dom';

interface ProtectedRouteProps {
  allowedRoles?: string[]; // Optional: specify roles that can access this route
  children?: ReactNode; // Add children prop
}

// Changed from React.FC to explicit props
const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
  const { session, isLoading, currentUser } = useAuth();
  console.log("ProtectedRoute: Rendering. isLoading:", isLoading, "session:", !!session, "currentUser:", !!currentUser);

  if (isLoading) {
    console.log("ProtectedRoute: Still loading auth state.");
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) {
    console.log("ProtectedRoute: No session found, redirecting to /login.");
    return <Navigate to="/login" replace />;
  }

  // If allowedRoles are specified, check if the user has one of them
  if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role)) {
    console.log("ProtectedRoute: User authenticated but unauthorized role, redirecting to /.");
    return <Navigate to="/" replace />; // Redirect to dashboard for unauthorized roles
  }

  console.log("ProtectedRoute: User authenticated and authorized, rendering children/outlet.");
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;