import { fetchChallengeLeaderboard } from './service';

const TTL_MS = 60 * 1000;

export const EMPTY_ROWS = Object.freeze([]);

const cache = new Map(); // `${uid}:${scope}` -> { rows, ts }
const inflight = new Map();
let epoch = 0;

/** Returns cached rows even when stale, so the UI can paint instantly and revalidate. */
export const getCachedLeaderboard = (key) => cache.get(key)?.rows ?? null;

/**
 * Call this whenever the user earns XP (for example next to invalidateChallengeDashboard),
 * so the leaderboard doesn't keep showing the old standings.
 */
export function invalidateChallengeLeaderboard() {
  cache.clear();
  inflight.clear();
  epoch += 1;
}

export function loadLeaderboard(key, params, force = false) {
  const cached = cache.get(key);
  if (!force && cached && Date.now() - cached.ts < TTL_MS) return Promise.resolve(cached.rows);

  const existing = inflight.get(key);
  if (existing) return existing;

  const startedAt = epoch;
  const request = fetchChallengeLeaderboard(params)
    .then((data) => {
      const rows = Array.isArray(data) ? data : EMPTY_ROWS;
      if (startedAt === epoch) cache.set(key, { rows, ts: Date.now() });
      return rows;
    })
    .finally(() => {
      if (inflight.get(key) === request) inflight.delete(key);
    });

  inflight.set(key, request);
  return request;
}