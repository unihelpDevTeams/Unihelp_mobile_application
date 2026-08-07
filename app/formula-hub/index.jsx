import React, { useEffect, useState } from 'react';
import FeatureGridScreen from '../../src/shared/screens/FeatureGridScreen';
import { fetchFormulas } from '../../services/firestoreSync';

export default function FormulaHubHome() {
  const [formulas, setFormulas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFormulas()
      .then(setFormulas)
      .finally(() => setLoading(false));
  }, []);

  const grouped = [
    { title: 'Formula Library', description: 'Browse the formula collection from the shared library.', route: '/formula-hub/subjects', accent: '#4F46E5', icon: 'library' },
    { title: 'Bookmarks', description: 'Open your saved formulas and quick references.', route: '/formula-hub/bookmarks', accent: '#F97316', icon: 'bookmark' },
  ];

  return (
    <FeatureGridScreen
      title="Formula Hub"
      subtitle={`Loaded ${formulas.length} formulas from the shared library.`}
      features={grouped}
      loading={loading}
      showBack
    />
  );
}

