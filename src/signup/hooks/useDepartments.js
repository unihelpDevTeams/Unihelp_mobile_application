import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '../../../firebase/config';
import { COMMON_DEPARTMENTS } from '../../admin/commonDepartments';

const commonDepartments = COMMON_DEPARTMENTS.map((d, i) => ({ id: `common-dept-${i}`, ...d }));

const mergeDepartments = (primary = []) => {
  const seen = new Set();
  return [...primary, ...commonDepartments]
    .filter((item) => item?.name)
    .filter((item) => {
      const key = item.name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};

/**
 * Fetch departments for a selected university from Firestore with search.
 * Falls back to a common departments list when Firestore is empty or on error.
 */
export function useDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUniversityId, setSelectedUniversityId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const cachedRef = useRef({});
  const fallbackShownRef = useRef(false);

  const filterDepts = (list, search) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (d) =>
        d.name?.toLowerCase().includes(q) ||
        d.faculty?.toLowerCase().includes(q) ||
        d.aliases?.some?.((alias) => alias.toLowerCase().includes(q))
    );
  };

  const fetchDepartments = useCallback(async (universityId, search = '') => {
    if (!universityId) {
      setDepartments(filterDepts(commonDepartments, search));
      return;
    }

    const cacheKey = `${universityId}`;
    if (cachedRef.current[cacheKey] && !search.trim()) {
      setDepartments(cachedRef.current[cacheKey]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const constraints = [where('universityId', '==', universityId), orderBy('name'), limit(200)];
      const q = query(collection(db, 'departments'), ...constraints);
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      if (items.length > 0) {
        // Firestore has data — use it with client-side search filter
        const merged = mergeDepartments(items);
        const filtered = filterDepts(merged, search);
        if (!cachedRef.current[cacheKey]) cachedRef.current[cacheKey] = merged;
        setDepartments(filtered);
        fallbackShownRef.current = false;
      } else {
        // Firestore is empty — fall back to common departments list
        setDepartments(filterDepts(commonDepartments, search));
        fallbackShownRef.current = true;
      }
    } catch (_err) {
      // Network error — show fallback
      setDepartments(filterDepts(commonDepartments, search));
      fallbackShownRef.current = true;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUniversityId) {
      fetchDepartments(selectedUniversityId, searchText);
    } else {
      setDepartments(filterDepts(commonDepartments, searchText));
    }
  }, [selectedUniversityId, searchText, fetchDepartments]);

  const selectUniversity = useCallback((universityId) => {
    setSelectedUniversityId(universityId);
    setSearchText('');
    setDepartments([]);
  }, []);

  return {
    departments,
    loading,
    error,
    selectedUniversityId,
    searchText,
    setSearchText,
    selectUniversity,
    setSelectedUniversityId,
    fetchDepartments,
  };
}
