import React from 'react';
import FeatureGridScreen from '../../src/shared/screens/FeatureGridScreen';

export default function MarketplaceHome() {
  return (
    <FeatureGridScreen
      title="Marketplace"
      subtitle="Hostels, tutorials, and student listings synced from the website."
      features={[
        { title: 'Find Hostels', description: 'Find accommodation listings from the hostels collection.', route: '/hostelmarketplace', accent: '#10B981', icon: 'home' },
        { title: 'Student Product Listings', description: 'Browse the studentMarketplace collection shared by the website.', route: '/studentmarketplace', accent: '#0EA5E9', icon: 'wallet' },
      ]}
      showBack
    />
  );
}
