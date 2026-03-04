'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';

export default function Home() {
  const router = useRouter();
  const { authenticated, authenticating } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (!authenticating) {
      router.replace(authenticated ? '/home' : '/login');
    }
  }, [authenticated, authenticating, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-grouse text-lg">Loading...</div>
    </div>
  );
}
