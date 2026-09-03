export const COLLECTIONS = {
  users: 'users',
  announcements: 'announcements',
  notes: 'notes',
  questions: 'questions',
  groups: 'groups',
  notifications: 'notifications',
  conversations: 'conversations',
  friendRequests: 'friendRequests',
  friends: 'friends',
  messageRequests: 'messageRequests',
  blockedUsers: 'blockedUsers',
  hostels: 'hostels',
  studentMarketplace: 'studentMarketplace',
  tutorials: 'tutorials',
  studyMaterials: 'study_materials',
  purchases: 'purchases',
  stories: 'stories',
  formulas: 'formulas',
  subscriptions: 'subscriptions',
  tutorialUploads: 'tutorialUploads',
  bookmarks: 'bookmarks',
  activity: 'activity',
  contactMessages: 'contactMessages',
  reports: 'reports',
  suggestions: 'suggestions',
  supportNotes: 'supportNotes',
  noteRequests: 'noteRequests',
  questionRequests: 'questionRequests',
  promoSpotlights: 'promoSpotlights',
  promoSpotlightEvents: 'promoSpotlightEvents',
};

export const userSubcollections = {
  bookmarks: (uid) => `users/${uid}/bookmarks`,
  activity: (uid) => `users/${uid}/activity`,
  groups: (uid) => `users/${uid}/groups`,
  notifications: (uid) => `notifications/${uid}/items`,
};

export const groupSubcollections = {
  members: (groupId) => `groups/${groupId}/members`,
  joinRequests: (groupId) => `groups/${groupId}/joinRequests`,
  posts: (groupId) => `groups/${groupId}/posts`,
  messages: (groupId) => `groups/${groupId}/messages`,
};

export const conversationSubcollections = {
  messages: (conversationId) => `conversations/${conversationId}/messages`,
};

export const profileDefaults = (user, overrides = {}) => {
  const username = overrides.username || user.displayName || user.email?.split('@')[0] || 'Student';

  return {
    uid: user.uid,
    username,
    usernameLower: username.trim().toLowerCase(),
    email: user.email || '',
    role: overrides.role || 'university',
    photo: user.photoURL || '',
    provider: overrides.provider || 'email',
    school: overrides.school || '',
    department: overrides.department || '',
    level: overrides.level || '',
    bio: overrides.bio || '',
    location: overrides.location || '',
    notificationsEnabled: overrides.notificationsEnabled ?? true,
    dmPolicy: overrides.dmPolicy || 'open',
    privacy: {
      friendRequests: overrides.privacy?.friendRequests || 'everyone',
      messageRequests: overrides.privacy?.messageRequests || 'everyone',
    },
    streakCount: 0,
    lastActiveDate: '',
    streakDates: [],
    createdAt: overrides.createdAt || null,
  };
};

export const collectionLabels = {
  [COLLECTIONS.announcements]: 'Announcements',
  [COLLECTIONS.notes]: 'Lecture Notes',
  [COLLECTIONS.questions]: 'Past Questions',
  [COLLECTIONS.groups]: 'Study Groups',
  [COLLECTIONS.hostels]: 'Hostels',
  [COLLECTIONS.studentMarketplace]: 'Marketplace',
  [COLLECTIONS.tutorials]: 'Tutorials',
  [COLLECTIONS.studyMaterials]: 'Study Materials',
  [COLLECTIONS.purchases]: 'Tutorial Purchases',
  [COLLECTIONS.stories]: 'Stories',
  [COLLECTIONS.formulas]: 'Formula Hub',
  [COLLECTIONS.subscriptions]: 'Subscriptions',
  [COLLECTIONS.promoSpotlights]: 'Promo Spotlights',
  [COLLECTIONS.promoSpotlightEvents]: 'Promo Spotlight Events',
};
