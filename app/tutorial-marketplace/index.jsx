import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';

export default function TutorialMarketplaceAlias() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/marketplace/tutorials');
  }, [router]);

  return null;
}
