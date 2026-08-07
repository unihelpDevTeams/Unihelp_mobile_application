import React from 'react';
import InfoPage from '../../../src/shared/screens/InfoPage';
import { useLocalSearchParams } from 'expo-router';

export default function ReadStoryPage() {
  const { storyId, chapterId } = useLocalSearchParams();

  return (
    <InfoPage
      title="Read Story"
      subtitle={`${storyId}/${chapterId}`}
      sections={[
        { title: 'Story', text: 'This route mirrors the website path /read-story/:storyId/:chapterId.' },
        { title: 'Next step', text: 'Connect this screen to the shared stories collection and chapter subcollection.' },
      ]}
    />
  );
}

