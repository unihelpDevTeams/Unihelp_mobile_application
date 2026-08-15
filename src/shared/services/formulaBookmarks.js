import AsyncStorage from '@react-native-async-storage/async-storage';

const FORMULA_BOOKMARKS_KEY = '@unihelp_formula_bookmarks_v1';

const normalizeBookmark = (formula = {}) => ({
  id: String(formula.id || formula._id || formula.slug || formula.title || ''),
  title: formula.title || formula.name || 'Untitled Formula',
  subject: formula.subject || 'General',
  category: formula.category || 'Formula',
  formula: formula.formula || formula.expression || formula.equation || formula.latex || '',
  explanation: formula.explanation || formula.description || formula.body || '',
  variables: Array.isArray(formula.variables) ? formula.variables : [],
  example: formula.example || '',
  savedAt: formula.savedAt || new Date().toISOString(),
});

async function readBookmarksMap() {
  const raw = await AsyncStorage.getItem(FORMULA_BOOKMARKS_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.reduce((map, item) => {
        const bookmark = normalizeBookmark(item);
        if (bookmark.id) map[bookmark.id] = bookmark;
        return map;
      }, {});
    }
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeBookmarksMap(nextMap) {
  await AsyncStorage.setItem(FORMULA_BOOKMARKS_KEY, JSON.stringify(nextMap));
}

export async function getFormulaBookmarks() {
  const map = await readBookmarksMap();
  return Object.values(map).sort((a, b) => String(b.savedAt || '').localeCompare(String(a.savedAt || '')));
}

export async function isFormulaBookmarked(id) {
  if (!id) return false;
  const map = await readBookmarksMap();
  return Boolean(map[String(id)]);
}

export async function saveFormulaBookmark(formula) {
  const bookmark = normalizeBookmark(formula);
  if (!bookmark.id) throw new Error('Cannot bookmark formula without an id.');

  const map = await readBookmarksMap();
  map[bookmark.id] = { ...map[bookmark.id], ...bookmark, savedAt: new Date().toISOString() };
  await writeBookmarksMap(map);
  return map[bookmark.id];
}

export async function removeFormulaBookmark(id) {
  if (!id) return;
  const map = await readBookmarksMap();
  delete map[String(id)];
  await writeBookmarksMap(map);
}

export async function toggleFormulaBookmark(formula) {
  const id = String(formula?.id || '');
  if (!id) throw new Error('Cannot bookmark formula without an id.');

  const map = await readBookmarksMap();
  if (map[id]) {
    delete map[id];
    await writeBookmarksMap(map);
    return { bookmarked: false };
  }

  map[id] = normalizeBookmark(formula);
  map[id].savedAt = new Date().toISOString();
  await writeBookmarksMap(map);
  return { bookmarked: true, bookmark: map[id] };
}
