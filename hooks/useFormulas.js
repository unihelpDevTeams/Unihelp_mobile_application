import { useState, useEffect } from 'react';

// Cache to prevent refetching multiple times when switching between pages
let cachedFormulas = null;

export const useFormulas = () => {
  const [formulas, setFormulas] = useState(cachedFormulas || []);
  const [loading, setLoading] = useState(!cachedFormulas);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (cachedFormulas) {
      setFormulas(cachedFormulas);
      setLoading(false);
      return;
    }

    const fetchFormulas = async () => {
      try {
        const response = await fetch('https://unihelp-backend-vdps.onrender.com/api/formulas');
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        const data = await response.json();
        cachedFormulas = data.formulas || data;
        setFormulas(cachedFormulas);
      } catch (err) {
        console.error('Failed to fetch formulas:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchFormulas();
  }, []);

  return { formulas, loading, error };
};
