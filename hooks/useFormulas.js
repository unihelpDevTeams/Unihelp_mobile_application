import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { getJson } from '../src/shared/services/backend';
import { getStoredFormulas, saveDownloadedFormulas } from '../src/shared/offline/offlineLearningService';

let cachedFormulas = null;

const firstText = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
};

const getFormulaId = (item = {}) =>
  firstText(item.id, item._id, item.formulaId, item.slug, item.title);

const getFormulaTitle = (item = {}) =>
  firstText(
    item.title,
    item.name,
    item.formulaTitle,
    item.label,
    item.question,
    item.question?.text,
    item.question?.prompt,
    item.prompt
  );

const getFormulaExpression = (item = {}) =>
  firstText(
    item.formula,
    item.formula?.expression,
    item.formula?.equation,
    item.formula?.latex,
    item.formula?.value,
    item.expression,
    item.equation,
    item.latex,
    item.formulaExpression,
    item.value,
    item.answer
  );

const normalizeFormula = (item = {}) => {
  const formulaValue = getFormulaExpression(item);
  const title = getFormulaTitle(item);

  return {
    ...item,
    id: String(getFormulaId(item) || ''),
    formula: formulaValue,
    title: title || 'Untitled Formula',
    subject: item.subject || 'General',
    category: item.category || 'Formula',
    explanation: firstText(item.explanation, item.description, item.body),
    variables: Array.isArray(item.variables) ? item.variables : [],
  };
};

const unwrapFormula = (data) => {
  if (!data) return {};
  if (Array.isArray(data)) return data[0] || {};
  if (data.formula && typeof data.formula === 'object') return unwrapFormula(data.formula);
  if (data.data && typeof data.data === 'object') return unwrapFormula(data.data);
  if (data.item && typeof data.item === 'object') return unwrapFormula(data.item);
  if (data.record && typeof data.record === 'object') return unwrapFormula(data.record);
  return data;
};

const mergeFormula = (cachedFormula, remoteFormula) => {
  if (!cachedFormula) return remoteFormula;
  if (!remoteFormula) return cachedFormula;

  return {
    ...cachedFormula,
    ...remoteFormula,
    title:
      remoteFormula.title && remoteFormula.title !== 'Untitled Formula'
        ? remoteFormula.title
        : cachedFormula.title,
    formula: remoteFormula.formula || cachedFormula.formula,
    explanation: remoteFormula.explanation || cachedFormula.explanation,
    subject: remoteFormula.subject || cachedFormula.subject,
    category: remoteFormula.category || cachedFormula.category,
    variables: remoteFormula.variables?.length ? remoteFormula.variables : cachedFormula.variables,
  };
};

const unwrapFormulas = (data) => {
  const list = Array.isArray(data)
    ? data
    : Array.isArray(data?.formulas)
      ? data.formulas
      : Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.data?.formulas)
            ? data.data.formulas
            : [];
  return Array.isArray(list) ? list.map(normalizeFormula).filter((item) => item.id) : [];
};

export const fetchFormulasFromApi = async () => unwrapFormulas(await getJson('/api/formulas'));

export const fetchFormulaByIdFromApi = async (id) => {
  const normalizedId = String(id);
  const cachedFormula = cachedFormulas?.find((item) => String(item.id) === normalizedId);

  try {
    const data = await getJson(`/api/formulas/${encodeURIComponent(normalizedId)}`);
    const remoteFormula = normalizeFormula(unwrapFormula(data));
    return mergeFormula(cachedFormula, remoteFormula);
  } catch (error) {
    if (cachedFormula) return cachedFormula;
    throw error;
  }
};

export const useFormulas = (refreshKey = 0) => {
  const [formulas, setFormulas] = useState(cachedFormulas || []);
  const [loading, setLoading] = useState(!cachedFormulas);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const hydrateOfflineFirst = async () => {
      setLoading(true);
      setError(null);

      try {
        const localFormulas = await getStoredFormulas();
        if (localFormulas?.length && !cancelled) {
          cachedFormulas = unwrapFormulas(localFormulas);
          setFormulas(cachedFormulas);
        } else if (cachedFormulas && !refreshKey && !cancelled) {
          setFormulas(cachedFormulas);
        }
      } catch {
        // ignore local hydrate failures and continue to remote fallback
      }

      const netState = await NetInfo.fetch();
      const online = Boolean(netState?.isConnected) && netState?.isInternetReachable !== false;

      if (!online && !cancelled) {
        setLoading(false);
        return;
      }

      try {
        const nextFormulas = await fetchFormulasFromApi();
        if (!cancelled) {
          cachedFormulas = nextFormulas;
          setFormulas(nextFormulas);
        }
        await saveDownloadedFormulas(nextFormulas);
      } catch (err) {
        console.error('Failed to fetch formulas:', err);
        if (!cancelled) {
          setError(err?.message || 'Failed to fetch formulas.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    hydrateOfflineFirst();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { formulas, loading, error };
};
