import React from 'react';
import InfoPage from '../../src/shared/screens/InfoPage';
import { useLocalSearchParams } from 'expo-router';

export default function CreateChapterPage() {
  const { storyId } = useLocalSearchParams();

  return (
    <InfoPage
      title="Create Chapter"
      subtitle={storyId}
      sections={[
        { title: 'Chapter builder', text: 'This route mirrors the website path /create-chapter/:storyId.' },
        { title: 'Next step', text: 'Hook this up to create chapter documents under the story record.' },
      ]}
    />
  );
}

