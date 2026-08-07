import { getJson } from './backend';

let cache = null;
let lastFetchTime = 0;
const CACHE_DURATION = 10 * 60 * 1000;

const categorize = (text = '') => {
  const value = text.toLowerCase();
  if (value.includes('president') || value.includes('government') || value.includes('senate') || value.includes('minister')) return 'Politics';
  if (value.includes('school') || value.includes('education') || value.includes('university') || value.includes('waec') || value.includes('student')) return 'Education';
  if (value.includes('tech') || value.includes('ai') || value.includes('startup') || value.includes('app')) return 'Tech';
  if (value.includes('economy') || value.includes('bank') || value.includes('finance') || value.includes('business')) return 'Business';
  if (value.includes('football') || value.includes('sport') || value.includes('match')) return 'Sports';
  return 'General';
};

const removeDuplicates = (articles) => {
  const seen = new Set();
  return articles.filter((item) => {
    const key = (item.title || '').trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const fetchNigeriaNews = async () => {
  const now = Date.now();
  if (cache && now - lastFetchTime < CACHE_DURATION) return cache;

  const response = await getJson('/api/news/nigeria');
  let combined = Array.isArray(response?.articles) ? response.articles : [];

  combined = combined.filter((item) => {
    const text = `${item.title || ''} ${item.description || ''}`.toLowerCase();
    return (
      text.includes('nigeria') ||
      text.includes('lagos') ||
      text.includes('abuja') ||
      text.includes('student') ||
      text.includes('school') ||
      text.includes('university') ||
      text.includes('politics') ||
      text.includes('economy')
    );
  });

  const finalData = removeDuplicates(combined).map((item, index) => ({
    id: index,
    title: item.title,
    description: item.description,
    link: item.link,
    image: item.image,
    source: item.source,
    category: categorize(`${item.title} ${item.description}`),
  }));

  cache = finalData;
  lastFetchTime = now;
  return finalData;
};
