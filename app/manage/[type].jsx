import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import ManageUploadsScreen from '../../src/shared/screens/ManageUploadsScreen';

const VALID_TYPES = ['hostels', 'listings', 'stories'];

export default function ManageTypeScreen() {
  const params = useLocalSearchParams();
  const rawType = Array.isArray(params.type) ? params.type[0] : params.type;
  const type = VALID_TYPES.includes(rawType) ? rawType : 'listings';

  return <ManageUploadsScreen type={type} />;
}
