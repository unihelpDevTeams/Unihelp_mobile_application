import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'campusflow_cache_';

export const setCache = async (key, data, ttl = 1000 * 60 * 10) => {
  const item = {
    data,
    expiry: Date.now() + ttl,
  };

  try {
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
  } catch (err) {
    // ignore storage errors
  }
};

export const getCache = async (key) => {
  try {
    const item = await AsyncStorage.getItem(CACHE_PREFIX + key);
    if (!item) return null;

    const parsed = JSON.parse(item);

    if (Date.now() > parsed.expiry) {
      await AsyncStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }

    return parsed.data;
  } catch (err) {
    return null;
  }
};