import { colors } from './theme';

export const featureCatalog = [
  {
    key: 'study',
    title: 'Study',
    description: 'Notes, past questions, announcements, AI help, and revision tools.',
    route: '/(tabs)/lectureNotes',
    accent: '#4F46E5',
    icon: 'library-outline',
    items: [
      { title: 'Lecture Notes', route: '/(tabs)/lectureNotes' },
      { title: 'Past Questions', route: '/(tabs)/pastQuestions' },
      { title: 'Announcements', route: '/announcements' },
      { title: 'AI Assistance', route: '/ai' },
      { title: 'Formula Hub', route: '/formula-hub' },
      { title: 'Challenge', route: '/challenge' },
    ],
  },
  {
    key: 'challenge',
    title: 'Challenge',
    description: 'Daily questions, streaks, XP, leaderboards, achievements, and study momentum.',
    route: '/challenge',
    accent: colors.brand,
    icon: 'flash-outline',
    items: [
      { title: 'Daily Challenge', route: '/challenge' },
      { title: 'Categories', route: '/challenge/categories' },
      { title: 'Leaderboard', route: '/challenge/leaderboard' },
      { title: 'Achievements', route: '/challenge/achievements' },
    ],
  },
  {
    key: 'community',
    title: 'Community',
    description: 'Groups, messages, and notifications that match the website data model.',
    route: '/community',
    accent: '#0EA5E9',
    icon: 'people-outline',
    items: [
      { title: 'Study Groups', route: '/community' },
      { title: 'Messages', route: '/messages' },
      { title: 'Notifications', route: '/notifications' },
      { title: 'Community Settings', route: '/help-center' },
    ],
  },
  {
    key: 'marketplace',
    title: 'Marketplace',
    description: 'Hostels and student listings shared from the same content source.',
    route: '/marketplace',
    accent: '#10B981',
    icon: 'storefront-outline',
    items: [
      { title: 'Hostels', route: '/hostelmarketplace' },
      { title: 'Student Listings', route: '/studentmarketplace' },
    ],
  },
  {
    key: 'stories',
    title: 'Stories',
    description: 'Read, publish, and bookmark stories with the same structure as the website.',
    route: '/stories',
    accent: '#F97316',
    icon: 'book-outline',
    items: [
      { title: 'Story Feed', route: '/stories' },
      { title: 'Create Story', route: '/create-story' },
    ],
  },
  {
    key: 'support',
    title: 'Support',
    description: 'FAQ, contact, privacy, and reporting pages with the same content family.',
    route: '/faq',
    accent: '#8B5CF6',
    icon: 'help-circle-outline',
    items: [
      { title: 'FAQ', route: '/faq' },
      { title: 'About', route: '/about' },
      { title: 'Help Center', route: '/help-center' },
      { title: 'Privacy', route: '/privacy' },
      { title: 'Terms', route: '/terms' },
      { title: 'Contact', route: '/contact' },
      { title: 'Report', route: '/report' },
    ],
  },
];

export const tabShortcuts = [
  { title: 'Home', route: '/(tabs)', icon: 'home' },
  { title: 'Notes', route: '/(tabs)/lectureNotes', icon: 'book' },
  { title: 'Questions', route: '/(tabs)/pastQuestions', icon: 'clipboard' },
  { title: 'Groups', route: '/(tabs)/groups', icon: 'people' },
  { title: 'Profile', route: '/(tabs)/profile', icon: 'person' },
];
