import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, getDocs, query, orderBy, limit, startAfter } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { NIGERIA_UNIVERSITIES } from '../../admin/nigeriaUniversities';

const PS = 50;

function filterBySearch(list, text) {
  if (!text.trim()) return list;
  const q = text.toLowerCase();
  return list.filter((u) => u.name?.toLowerCase().includes(q) || u.shortName?.toLowerCase().includes(q));
}

function filterByType(list, type) {
  if (!type || type === 'all') return list;
  return list.filter((u) => u.type === type);
}

export function useUniversities() {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [schoolType, setSchoolType] = useState('all');
  const lastRef = useRef(null);
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const fallbackRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        loadingRef.current = true; setLoading(true); setError(null);
        const snap = await getDocs(query(collection(db, 'universities'), orderBy('name'), limit(PS)));
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (cancelled) return;
        if (items.length > 0) {
          setUniversities(filterByType(filterBySearch(items, searchText), schoolType));
          lastRef.current = snap.docs[snap.docs.length - 1] || null;
          hasMoreRef.current = snap.docs.length === PS;
          fallbackRef.current = false;
        } else {
          const fb = NIGERIA_UNIVERSITIES.map((u, i) => ({ id: `fb-${i}`, ...u }));
          setUniversities(filterByType(filterBySearch(fb, searchText), schoolType));
          lastRef.current = null; hasMoreRef.current = false; fallbackRef.current = true;
        }
      } catch {
        if (!cancelled) {
          const fb = NIGERIA_UNIVERSITIES.map((u, i) => ({ id: `fb-${i}`, ...u }));
          setUniversities(filterByType(filterBySearch(fb, searchText), schoolType));
          hasMoreRef.current = false; fallbackRef.current = true;
        }
      } finally { if (!cancelled) { setLoading(false); loadingRef.current = false; } }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [searchText, schoolType]);

  const loadMore = useCallback(async () => {
    if (!hasMoreRef.current || loadingRef.current || searchText.trim() || schoolType !== 'all' || fallbackRef.current) return;
    try {
      loadingRef.current = true; setLoading(true);
      const snap = await getDocs(query(collection(db, 'universities'), orderBy('name'), startAfter(lastRef.current), limit(PS)));
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setUniversities((prev) => [...prev, ...items]);
      lastRef.current = snap.docs[snap.docs.length - 1] || null;
      hasMoreRef.current = snap.docs.length === PS;
    } catch {} finally { setLoading(false); loadingRef.current = false; }
  }, [searchText, schoolType]);

  return { universities, loading, error, hasMore: hasMoreRef.current, searchText, setSearchText, schoolType, setSchoolType, loadMore };
}