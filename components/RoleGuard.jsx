import React from 'react';
import { Redirect, useSegments } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { getPathFromSegments, getRedirectForRole, isRouteAllowedForRole } from '../src/shared/navigation/routePermissions';

export default function RoleGuard({ children }) {
  const { user, profile, loading } = useAuth();
  const segments = useSegments();
  const path = getPathFromSegments(segments);
  const role = profile?.role || 'university';
  const isAuthPath = path.startsWith('/(auth)');

  if (loading) {
    return null;
  }

  if (!user) {
    if (isAuthPath) {
      return children;
    }

    return <Redirect href="/(auth)/onboarding" />;
  }

  if (isAuthPath) {
    return <Redirect href={getRedirectForRole(role)} />;
  }

  if (!isRouteAllowedForRole(path, role)) {
    return <Redirect href={getRedirectForRole(role)} />;
  }

  return children;
}
