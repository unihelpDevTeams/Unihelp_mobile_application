import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import {
  fetchNextPromoSpotlight,
  markPromoSpotlightClicked,
  markPromoSpotlightDismissed,
  markPromoSpotlightShown,
  trackPromoSpotlightEvent,
} from '../services/promoSpotlightService';

export function usePromoSpotlight() {
  const { user, loading } = useAuth();
  const [promo, setPromo] = useState(null);
  const [visible, setVisible] = useState(false);
  const impressedPromoIdRef = useRef(null);
  const interactionLockedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    if (loading || !user) {
      setPromo(null);
      setVisible(false);
      return () => {};
    }

    timer = setTimeout(async () => {
      try {
        const nextPromo = await fetchNextPromoSpotlight();
        if (cancelled || !nextPromo) return;
        interactionLockedRef.current = false;
        setPromo(nextPromo);
        setVisible(true);
        if (impressedPromoIdRef.current !== nextPromo.id) {
          impressedPromoIdRef.current = nextPromo.id;
          markPromoSpotlightShown(nextPromo.id).catch(() => {});
          trackPromoSpotlightEvent('promo_impression', nextPromo);
        }
      } catch (error) {
        console.log('PromoSpotlight load skipped:', error?.message);
      }
    }, 700);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [loading, user]);

  const dismiss = useCallback(async () => {
    const current = promo;
    if (!current?.id || interactionLockedRef.current) return;
    interactionLockedRef.current = true;
    setVisible(false);
    setPromo(null);
    await markPromoSpotlightDismissed(current.id).catch(() => {});
    trackPromoSpotlightEvent('promo_dismiss', current);
  }, [promo]);

  const markClicked = useCallback(async () => {
    const current = promo;
    if (!current?.id || interactionLockedRef.current) return;
    interactionLockedRef.current = true;
    setVisible(false);
    setPromo(null);
    await markPromoSpotlightClicked(current.id).catch(() => {});
    trackPromoSpotlightEvent('promo_click', current);
  }, [promo]);

  return { promo, visible, dismiss, markClicked };
}
