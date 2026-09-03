const universityOnlyRoutes = [
  '/cgpa',
  '/tasks',
  '/smart-timetable',
  '/create-tutorial',
  '/my-tutorials',
  '/tutor-dashboard',
  '/student-purchases',
  '/adminpanel',
  '/admin-withdrawals',
  '/admin-tutorial-payments',
  '/(tabs)',
  '/community',
  '/marketplace',
  '/hostelmarketplace',
  '/studentmarketplace',
  '/stories',
  '/messages',
  '/friends',
  '/find-friends',
  '/premium',
  '/upload',
  '/uploadquestion',
  '/create',
  '/create-story',
  '/create-chapter',
  '/formula-hub/bookmarks',
  '/marketplace/tutorials',
  '/search',
  '/requests',
];

const sharedRoutes = ['/profile', '/privacy', '/contact', '/formula-hub', '/challenge', '/help-center', '/about', '/newsfeed', '/formula-hub/subjects', '/notifications', '/announcements', '/report', '/faq'];

export const getPathFromSegments = (segments) => {
  const parts = segments.filter(Boolean);
  return parts.length ? `/${parts.join('/')}` : '/';
};

export const getRedirectForRole = (role) => {
  return '/(tabs)';
};

export const getAllowedRolesForPath = (path) => {
  if (path.startsWith('/(auth)')) {
    return ['university'];
  }

  if (sharedRoutes.some((route) => path === route || path.startsWith(`${route}/`))) {
    return ['university'];
  }

  if (path === '/' || path === '/(tabs)' || path.startsWith('/(tabs)/')) {
    return ['university'];
  }

  if (universityOnlyRoutes.some((route) => path === route || path.startsWith(`${route}/`))) {
    return ['university'];
  }

  return ['university'];
};

export const isRouteAllowedForRole = (path, role) => {
  if (!role) return false;
  const allowedRoles = getAllowedRolesForPath(path);
  return allowedRoles.includes(role);
};

export const filterFeatureCatalogByRole = (catalog, role) => {
  if (!role) return [];
  return catalog
    .map((group) => {
      const allowedItems = group.items.filter((item) => isRouteAllowedForRole(item.route, role));
      return {
        ...group,
        items: allowedItems,
      };
    })
    .filter((group) => group.items.length > 0);
};

export const filterMenuSectionsByRole = (sections, role) => {
  if (!role) return sections;
  return sections.map((section) => {
      const allowedItems = section.items.filter((item) => isRouteAllowedForRole(item.route, role));
      return {
        ...section,
        items: allowedItems,
      };
    })
    .filter((section) => section.items.length > 0);
};
