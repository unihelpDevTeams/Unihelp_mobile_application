export const headerMenuSections = [
  {
    title: 'Study',
    items: [
      { label: 'Home', route: '/(tabs)' },
      { label: 'Resources', route: '/(tabs)/studyMaterials' },
      { label: 'Offline / Downloads', route: '/offline-center', icon: 'cloud-download-outline' },
      { label: 'News Feed', route: '/newsfeed' },
      { label: 'Challenge', route: '/challenge', icon: 'flash-outline' },
    ],
  },
  {
    title: 'Campus',
    items: [
      { label: 'Groups', route: '/community' },
      { label: 'Friends', route: '/friends' },
      { label: 'Find Friends', route: '/find-friends' },
      { label: 'Messages', route: '/messages' },
      { label: 'Stories', route: '/stories' },
      { label: 'My Stories', route: '/mystories', icon: 'book-outline', requiresUpload: 'stories' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { label: 'GPA & CGPA', route: '/cgpa', icon: 'stats-chart-outline' },
      { label: 'Tasks', route: '/tasks' },
      { label: 'Smart Timetable', route: '/smart-timetable' },
    ],
  },
  {
    title: 'Marketplace',
    items: [
      { label: 'Find Hostels', route: '/hostelmarketplace' },
      { label: 'Student Product Listings', route: '/studentmarketplace' },
      { label: 'My Hostels', route: '/myhostels', icon: 'home-outline', requiresUpload: 'hostels' },
      { label: 'My Listings', route: '/myproducts', icon: 'storefront-outline', requiresUpload: 'listings' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Profile', route: '/(tabs)/profile' },
      { label: 'Community Settings', route: '/community-settings' },
      { label: 'Privacy', route: '/privacy' },
      { label: 'Help Center', route: '/help-center' },
      { label: 'FAQ', route: '/faq' },
      { label: 'Contact', route: '/contact' },
    ],
  },
  
];
