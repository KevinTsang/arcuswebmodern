'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch } from '@/store/hooks';
import { loadPlaceDataThunk } from '@/store/thunks/loadPlaceDataThunk';
import { logoutThunk } from '@/store/thunks/logoutThunk';
import { useCreateAccount } from './CreateAccountContext';

export default function WelcomeStep() {
  const { state, dispatch } = useCreateAccount();
  const router = useRouter();
  const reduxDispatch = useAppDispatch();

  const { firstName, placeId, loading, error } = state;

  const handleFinish = useCallback(async () => {
    if (!placeId) {
      dispatch({ type: 'SET_ERROR', error: 'Account setup incomplete. Please log in to try again.' });
      return;
    }

    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'CLEAR_ERROR' });
    try {
      await reduxDispatch(loadPlaceDataThunk(placeId)).unwrap();
      router.replace('/');
    } catch {
      dispatch({ type: 'SET_ERROR', error: 'Failed to load your place data. Please log in to try again.' });
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, [placeId, reduxDispatch, router, dispatch]);

  const handleBackToLogin = useCallback(async () => {
    await reduxDispatch(logoutThunk());
    router.replace('/login');
  }, [reduxDispatch, router]);

  return (
    <div className="text-center py-6 space-y-4">
      <div className="text-4xl">&#127968;</div>
      <h3 data-testid="welcome-title" className="text-xl font-semibold text-swift">
        Welcome{firstName ? `, ${firstName}` : ''}!
      </h3>
      <p className="text-sm text-grouse">
        Your Arcus Smart Home account is ready. Start by pairing your hub and devices.
      </p>
      {error ? (
        <button
          onClick={handleBackToLogin}
          className="w-full py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90"
        >
          Back to Login
        </button>
      ) : (
        <button
          onClick={handleFinish}
          data-testid="welcome-finish"
          disabled={loading}
          className="w-full py-2.5 bg-peacock text-crane rounded-[var(--border-radius-base)] text-sm font-medium hover:bg-peacock/90 disabled:opacity-50"
        >
          {loading ? 'Loading\u2026' : 'Go to Dashboard'}
        </button>
      )}
    </div>
  );
}
