import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchNextPromoSpotlight,
  markPromoSpotlightShown,
  trackPromoSpotlightEvent,
} from '../services/promoSpotlightService';

const OPEN_FROM_BACKGROUND_MS = 60 * 1000;

export function usePromoSpotlight() {
  const { user, loading } = useAuth();
  const [promo, setPromo] = useState(null);
  const [visible, setVisible] = useState(false);
  const visibleRef = useRef(false);
  const interactionLockedRef = useRef(false);
  const launchLoadedRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const backgroundedAtRef = useRef(null);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const loadPromoForOpen = useCallback(async () => {
    try {
      if (visibleRef.current) return;
      const nextPromo = await fetchNextPromoSpotlight();
      if (!nextPromo) return;
      interactionLockedRef.current = false;
      setPromo(nextPromo);
      setVisible(true);
      markPromoSpotlightShown(nextPromo.id).catch(() => {});
      trackPromoSpotlightEvent('promo_impression', nextPromo);
    } catch (error) {
      console.log('PromoSpotlight load skipped:', error?.message);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    if (loading || !user) {
      launchLoadedRef.current = false;
      setPromo(null);
      setVisible(false);
      return () => {};
    }

    if (launchLoadedRef.current) return () => {};
    launchLoadedRef.current = true;

    timer = setTimeout(async () => {
      if (!cancelled) await loadPromoForOpen();
    }, 700);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [loadPromoForOpen, loading, user]);

  useEffect(() => {
    if (loading || !user) return undefined;

    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState === 'background' || nextState === 'inactive') {
        backgroundedAtRef.current = Date.now();
        return;
      }

      const openedFromBackground =
        nextState === 'active' && previousState?.match(/inactive|background/);
      const awayForMs = backgroundedAtRef.current ? Date.now() - backgroundedAtRef.current : 0;

      if (openedFromBackground && awayForMs >= OPEN_FROM_BACKGROUND_MS) {
        loadPromoForOpen();
      }
    });

    return () => subscription.remove();
  }, [loadPromoForOpen, loading, user]);

  const dismiss = useCallback(async () => {
    const current = promo;
    if (!current?.id || interactionLockedRef.current) return;
    interactionLockedRef.current = true;
    setVisible(false);
    setPromo(null);
    trackPromoSpotlightEvent('promo_dismiss', current);
  }, [promo]);

  const markClicked = useCallback(async () => {
    const current = promo;
    if (!current?.id || interactionLockedRef.current) return;
    interactionLockedRef.current = true;
    setVisible(false);
    setPromo(null);
    trackPromoSpotlightEvent('promo_click', current);
  }, [promo]);

  return { promo, visible, dismiss, markClicked };
}
