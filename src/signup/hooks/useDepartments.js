import { useState, useEffect, useCallback, useRef } from 'react';
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
 * Fetch departments for a selected university.
 * Now exclusively uses the common departments list to save Firebase reads.
 */
export function useDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedUniversityId, setSelectedUniversityId] = useState(null);
  const [searchText, setSearchText] = useState('');
  const fallbackShownRef = useRef(true);

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
    try {
      setLoading(true);
      setError(null);
      
      // Simulate network request for UI consistency
      await new Promise((r) => setTimeout(r, 150));
      
      setDepartments(filterDepts(commonDepartments, search));
      fallbackShownRef.current = true;
    } catch (_err) {
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
    setSelectedUniversityId((previousId) => (previousId === universityId ? previousId : universityId));
    setSearchText((previousSearch) => (previousSearch ? '' : previousSearch));
    setDepartments((previousDepartments) => (previousDepartments.length === 0 ? previousDepartments : []));
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
