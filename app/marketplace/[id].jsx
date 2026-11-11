import { Redirect, useLocalSearchParams } from 'expo-router';

export default function MarketplaceListingRoute() {
  const { id } = useLocalSearchParams();
  const listingId = Array.isArray(id) ? id[0] : id;

  if (!listingId) return <Redirect href="/studentmarketplace" />;

  return (
    <Redirect
      href={{
        pathname: '/view/[type]/[id]',
        params: { type: 'listing', id: listingId },
      }}
    />
  );
}
