'use client';

/**
 * Authenticated layout — wraps all pages that require authentication.
 *
 * Provides the Header, SidePanel system, and a loading gate that
 * waits for place data to be ready before rendering children.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { loadPlaceDataThunk } from '@/store/thunks/loadPlaceDataThunk';
import { getDefaultPlaceId, type SessionPlace } from '@/store/thunks/placeSelection';
import Header from '@/components/Header';
import { SidePanelProvider } from '@/components/SidePanel';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { authenticated, authenticating, person } = useAppSelector((s) => s.auth);
  const { placeId, ready } = useAppSelector((s) => s.place);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authenticating && !authenticated) {
      router.replace('/login');
    }
  }, [authenticated, authenticating, router]);

  // Load place data when authenticated but no placeId set yet.
  // SessionCreated payload has { personId, places[] }, not person model attributes.
  useEffect(() => {
    if (authenticated && person && !placeId) {
      const personId = person.personId as string;
      const places = (person.places ?? []) as SessionPlace[];
      const defaultPlaceId = getDefaultPlaceId(places, personId);
      if (defaultPlaceId) {
        dispatch(loadPlaceDataThunk(defaultPlaceId));
      }
    }
  }, [authenticated, person, placeId, dispatch]);

  // Show loading while authenticating or loading place data
  if (authenticating || !authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-grouse text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <SidePanelProvider>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          {!ready ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-grouse text-lg">Loading place data...</div>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </SidePanelProvider>
  );
}
