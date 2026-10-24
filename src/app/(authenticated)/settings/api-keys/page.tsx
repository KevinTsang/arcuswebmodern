'use client';

import { Suspense, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { usePlaceAccess } from '@/hooks/usePlaceAccess';
import { ApiKeyManager } from '@/components/api-keys/ApiKeyManager';

/** Only the account owner can manage a place's API keys (the platform enforces the same). */
const OWNER_ROLE = 'OWNER';

// ── Page Content (uses useSearchParams, must be inside Suspense) ──────

function ApiKeysPageContent() {
  // Keys belong to the place named by ?placeId= (the place card the user came
  // from); fall back to the active place when the param is absent.
  const searchParams = useSearchParams();
  const activePlaceId = useAppSelector((s) => s.place.placeId);
  const placeId = searchParams.get('placeId') || activePlaceId;
  const access = usePlaceAccess(placeId);
  // A role means the person has access, so the place exists even if unnamed.
  const placeName = access.name || (access.role ? 'Unnamed Place' : '');

  let body: ReactNode;
  if (!placeId || access.status === 'loading') {
    body = <p className="text-sm text-grouse">Loading...</p>;
  } else if (access.status === 'failed') {
    body = (
      <p data-testid="apikeys-unavailable" className="text-sm text-grouse">
        Couldn&apos;t load this place. Try again later.
      </p>
    );
  } else if (access.role !== OWNER_ROLE) {
    body = (
      <p data-testid="apikeys-not-owner" className="text-sm text-grouse">
        Only the account owner can manage API keys{placeName && ` for ${placeName}`}.
      </p>
    );
  } else {
    // Keyed so another place starts fresh and drops the old place's responses.
    body = <ApiKeyManager key={placeId} placeId={placeId} placeName={placeName} />;
  }

  return (
    <div className="p-[var(--gutter)]">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/settings"
          className="text-peacock hover:underline text-sm"
        >
          Settings
        </Link>
        <span className="text-grouse text-sm">/</span>
        <h2 data-testid="apikeys-title" className="text-[length:var(--font-size-h2)] font-[var(--heading-font-weight)] text-swift">
          API Keys
        </h2>
        {placeName && (
          <span data-testid="apikeys-place" className="text-sm text-grouse">
            for <span className="font-medium text-swift">{placeName}</span>
          </span>
        )}
      </div>
      {body}
    </div>
  );
}

export default function ApiKeysPage() {
  return (
    <Suspense fallback={<p className="p-[var(--gutter)] text-sm text-grouse">Loading...</p>}>
      <ApiKeysPageContent />
    </Suspense>
  );
}
