import { Suspense } from 'react';

/**
 * The API keys page reads `?placeId=` with useSearchParams, which must sit
 * under a Suspense boundary so the route can still be prerendered.
 */
export default function ApiKeysLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
