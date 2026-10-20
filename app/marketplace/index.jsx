import React from 'react';
import FeatureGridScreen from '../../src/shared/screens/FeatureGridScreen';

export default function MarketplaceHome() {
  return (
    <FeatureGridScreen
      title="Marketplace"
      subtitle="Student listings synced from the website."
      features={[
        { title: 'Student Product Listings', description: 'Browse the studentMarketplace collection shared by the website.', route: '/studentmarketplace', accent: '#0EA5E9', icon: 'wallet' },
      ]}
      showBack
    />
  );
}
