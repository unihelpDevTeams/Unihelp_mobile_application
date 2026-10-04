import { fetchChallengeDashboard } from './service';

const TTL_MS = 90 * 1000;

export const EMPTY_DASHBOARD = Object.freeze({ stats: {}, history: [], leaderboard: [] });

const cache = new Map(); // key -> { data, ts }
const inflight = new Map(); // key -> Promise
const keyEpoch = new Map(); // key -> number (bumped on invalidate)
let globalEpoch = 0;

const epochOf = (key) => globalEpoch + (keyEpoch.get(key) || 0);

export const getCachedDashboard = (key) => cache.get(key)?.data ?? null;

/**
 * Drop cached data (call after finishing a challenge).
 * Any request already in flight is also discarded, so it can't write stale data back
 * into the cache after the invalidation.
 */
export function invalidateChallengeDashboard(uid) {
  if (uid) {
    cache.delete(uid);
    inflight.delete(uid);
    keyEpoch.set(uid, (keyEpoch.get(uid) || 0) + 1);
  } else {
    cache.clear();
    inflight.clear();
    globalEpoch += 1;
  }
}

export function loadDashboard(key, snapshot, force = false) {
  const cached = cache.get(key);
  if (!force && cached && Date.now() - cached.ts < TTL_MS) return Promise.resolve(cached.data);

  const existing = inflight.get(key);
  if (existing) return existing;

  const epoch = epochOf(key);
  const request = fetchChallengeDashboard(snapshot)
    .then((data) => {
      const safe = data || EMPTY_DASHBOARD;
      if (epoch === epochOf(key)) cache.set(key, { data: safe, ts: Date.now() });
      return safe;
    })
    .finally(() => {
      if (inflight.get(key) === request) inflight.delete(key);
    });

  inflight.set(key, request);
  return request;
}