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

  if (isLoading) {
    // Still checking auth state, render a loading indicator or null
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!session) {
    // Not authenticated, redirect to login
    return <Navigate to="/login" replace />;
  }

  // If allowedRoles are specified, check if the user has one of them
  if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role)) {
    // User is authenticated but doesn't have the required role, redirect to a forbidden page or dashboard
    return <Navigate to="/" replace />; // Redirect to dashboard for unauthorized roles
  }

  // Authenticated and authorized, render the children if provided, otherwise render nested routes via Outlet
  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;