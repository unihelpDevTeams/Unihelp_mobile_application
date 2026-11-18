import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';
import {
  addPlayUpdateInstallListener,
  checkPlayStoreUpdate,
  completeFlexiblePlayUpdate,
  isPlayUpdateCheckSupported,
  PLAY_UPDATE_INSTALL_STATUS_DOWNLOADED,
  startFlexiblePlayUpdate,
} from '../services/playStoreUpdateService';

const PACKAGE_ID = 'com.zenithdev.unihelp';
const CHECK_INTERVAL_MS = 20 * 60 * 1000;

async function openPlayStoreListing() {
  const marketUrl = `market://details?id=${PACKAGE_ID}`;
  try {
    await Linking.openURL(marketUrl);
  } catch {
    await Linking.openURL(`https://play.google.com/store/apps/details?id=${PACKAGE_ID}`);
  }
}

export function useAppUpdate({ enabled, spotlightReady }) {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [promptVisible, setPromptVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const checkInFlightRef = useRef(false);
  const lastCheckAtRef = useRef(0);
  const promptConsumedRef = useRef(false);
  const completionPromptShownRef = useRef(false);

  useEffect(() => {
    if (!enabled || Platform.OS !== 'android' || !isPlayUpdateCheckSupported) return undefined;
    let active = true;
    const installSubscription = addPlayUpdateInstallListener((event) => {
      if (event?.status === PLAY_UPDATE_INSTALL_STATUS_DOWNLOADED) setUpdateDownloaded(true);
    });

    const check = async (force = false) => {
      if (checkInFlightRef.current || AppState.currentState !== 'active') return;
      if (!force && Date.now() - lastCheckAtRef.current < CHECK_INTERVAL_MS) return;
      checkInFlightRef.current = true;
      lastCheckAtRef.current = Date.now();
      try {
        const result = await checkPlayStoreUpdate();
        if (active) {
          const downloaded = result?.installStatus === PLAY_UPDATE_INSTALL_STATUS_DOWNLOADED;
          setUpdateDownloaded(downloaded);
          setUpdateAvailable(!downloaded && result?.isAvailable === true);
        }
      } catch {
        if (active) setUpdateAvailable(false);
      } finally {
        checkInFlightRef.current = false;
      }
    };

    check(true);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check();
    });

    return () => {
      active = false;
      subscription.remove();
      installSubscription?.remove?.();
    };
  }, [enabled]);

  useEffect(() => {
    if (updateAvailable && !updateDownloaded && spotlightReady && !promptConsumedRef.current) {
      promptConsumedRef.current = true;
      setPromptVisible(true);
    }
  }, [spotlightReady, updateAvailable, updateDownloaded]);

  useEffect(() => {
    if (!updateDownloaded || !spotlightReady || completionPromptShownRef.current) return;
    completionPromptShownRef.current = true;
    Alert.alert(
      'Update ready to install',
      'UniHelp has downloaded the update. Restart now to finish installing it.',
      [
        { text: 'Later', style: 'cancel' },
        {
          text: 'Restart now',
          onPress: () => completeFlexiblePlayUpdate().catch(() => {}),
        },
      ]
    );
  }, [spotlightReady, updateDownloaded]);

  const maybeLater = useCallback(() => {
    promptConsumedRef.current = true;
    setPromptVisible(false);
  }, []);

  const updateNow = useCallback(async () => {
    setUpdating(true);
    try {
      await startFlexiblePlayUpdate();
      setPromptVisible(false);
    } catch {
      try {
        await openPlayStoreListing();
      } catch {
        setPromptVisible(false);
      } finally {
        setPromptVisible(false);
      }
    } finally {
      setUpdating(false);
    }
  }, []);

  return { promptVisible, updating, maybeLater, updateNow };
}