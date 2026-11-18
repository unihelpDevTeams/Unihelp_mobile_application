/* eslint-disable react-hooks/set-state-in-effect */
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
  const [decisionComplete, setDecisionComplete] = useState(false);
  const [decisionUserId, setDecisionUserId] = useState(null);
  const visibleRef = useRef(false);
  const loadingRef = useRef(false);
  const interactionLockedRef = useRef(false);
  const launchLoadedRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const backgroundedAtRef = useRef(null);

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  const loadPromoForOpen = useCallback(async () => {
    if (visibleRef.current || loadingRef.current) return;
    loadingRef.current = true;
    setDecisionUserId(user?.uid || null);
    setDecisionComplete(false);
    try {
      const nextPromo = await fetchNextPromoSpotlight();
      if (!nextPromo) {
        setPromo(null);
        setVisible(false);
        return;
      }
      interactionLockedRef.current = false;
      setPromo(nextPromo);
      setVisible(true);
      markPromoSpotlightShown(nextPromo.id).catch(() => {});
      trackPromoSpotlightEvent('promo_impression', nextPromo);
    } catch (error) {
      console.log('PromoSpotlight load skipped:', error?.message);
    } finally {
      loadingRef.current = false;
      setDecisionComplete(true);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (loading) return undefined;

    if (!user || !user.emailVerified) {
      launchLoadedRef.current = false;
      setPromo(null);
      setVisible(false);
      return undefined;
    }

    if (launchLoadedRef.current) return () => {};
    launchLoadedRef.current = true;
    loadPromoForOpen();
    return undefined;
  }, [loadPromoForOpen, loading, user]);

  useEffect(() => {
    if (loading || !user || !user.emailVerified) return undefined;

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

  return {
    promo,
    visible,
    decisionComplete: !loading && (
      !user?.emailVerified
      || (decisionUserId === user?.uid && decisionComplete)
    ),
    dismiss,
    markClicked,
  };
}
