import { useState, useEffect, useCallback, useRef } from 'react';
import { NIGERIA_UNIVERSITIES } from '../../admin/nigeriaUniversities';

const PS = 50;

function filterBySearch(list, text) {
  if (!text.trim()) return list;
  const q = text.toLowerCase();
  return list.filter((u) => 
    u.name?.toLowerCase().includes(q) || 
    u.shortName?.toLowerCase().includes(q) ||
    u.aliases?.some(alias => alias.toLowerCase().includes(q))
  );
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
  const fallbackRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      try {
        setLoading(true); setError(null);
        // Simulate a small delay for realistic UI loading behavior
        await new Promise((r) => setTimeout(r, 200));
        if (cancelled) return;
        
        const fb = NIGERIA_UNIVERSITIES.map((u, i) => ({ id: `fb-${i}`, ...u }));
        setUniversities(filterByType(filterBySearch(fb, searchText), schoolType));
        fallbackRef.current = true;
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load universities');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [searchText, schoolType]);

  const loadMore = useCallback(async () => {
    // Pagination is not needed for local data since everything is loaded instantly
  }, []);

  return { universities, loading, error, hasMore: false, searchText, setSearchText, schoolType, setSchoolType, loadMore };
}