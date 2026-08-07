import React from 'react';
import DocumentLibraryScreen from '../src/shared/screens/DocumentLibraryScreen';
import { fetchNotes } from '../services/firestoreSync';

export default function LectureNotesMarketplace() {
  const [notes, setNotes] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchNotes()
      .then(setNotes)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DocumentLibraryScreen
      title="Lecture Notes Marketplace"
      subtitle="Browse notes from the shared collection."
      items={notes}
      loading={loading}
      showBack
      emptyTitle="No lecture notes yet"
      emptyDescription="Lecture notes published on the website will appear here."
      detailRoute="/view/[type]/[id]"
      detailParams={(item) => ({ type: 'note', id: item.id })}
      icon="library-outline"
      accent="#10B981"
      uploadLabel="Upload"
      uploadRoute="/upload?type=note"
    />
  );
}
