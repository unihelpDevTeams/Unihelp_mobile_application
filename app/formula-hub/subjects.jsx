import React, { useMemo } from 'react';
import FeatureGridScreen from '../../src/shared/screens/FeatureGridScreen';
import { formulas as sampleFormulas } from '../../assets/data/sampleFormulas';

const subjectAccentMap = {
  Mathematics: '#4F46E5',
  Physics: '#0EA5E9',
  Chemistry: '#10B981',
  Biology: '#F97316',
  Economics: '#8B5CF6',
  Thermodynamics: '#EF4444',
};

const subjectIconMap = {
  Mathematics: 'calculator',
  Physics: 'flash',
  Chemistry: 'flask',
  Biology: 'leaf',
  Economics: 'cash',
  Thermodynamics: 'thermometer',
};

export default function FormulaSubjectsPage() {
  const subjects = useMemo(() => {
    const uniqueSubjects = Array.from(new Set(sampleFormulas.map((item) => item.subject).filter(Boolean)));

    return uniqueSubjects.map((subject) => {
      const count = sampleFormulas.filter((item) => item.subject === subject).length;
      const label = subject || 'General';
      return {
        title: label,
        description: `${count} formula${count === 1 ? '' : 's'} available for ${label.toLowerCase()}.`,
        route: `/formula-hub/subject/${encodeURIComponent(label.toLowerCase())}`,
        accent: subjectAccentMap[label] || '#64748B',
        icon: subjectIconMap[label] || 'library',
      };
    });
  }, []);

  return (
    <FeatureGridScreen
      title="Formula Subjects"
      subtitle="Subject-based formula shortcuts."
      features={subjects}
      showBack
    />
  );
}

