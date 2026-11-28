import React from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import ManageUploadsScreen from '../../src/shared/screens/ManageUploadsScreen';
import { useAuth } from '../../context/AuthContext';

const VALID_TYPES = ['listings'];

export default function ManageTypeScreen() {
  const params = useLocalSearchParams();
  const { user, loading } = useAuth();
  const rawType = Array.isArray(params.type) ? params.type[0] : params.type;
  const type = VALID_TYPES.includes(rawType) ? rawType : 'listings';

  if (loading) return null;
  if (!user?.uid) return <Redirect href="/studentmarketplace" />;

  return <ManageUploadsScreen type={type} />;
}
