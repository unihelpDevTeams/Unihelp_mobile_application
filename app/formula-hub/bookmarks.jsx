import React from 'react';
import InfoPage from '../../src/shared/screens/InfoPage';

export default function FormulaBookmarks() {
  return (
    <InfoPage
      title="Bookmarks"
      subtitle="Saved formulas and quick references."
      sections={[
        { title: 'Bookmarks', text: 'This page is ready for the same users/{uid}/bookmarks collection used by the website.' },
        { title: 'Next step', text: 'Hook this screen to fetchBookmarks() and deleteBookmark() when you want full bookmark management.' },
      ]}
    />
  );
}

