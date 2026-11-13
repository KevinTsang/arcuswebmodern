'use client';

/**
 * Login page — ported from src/pages/login/.
 *
 * A thin router over the login views in `src/components/login/`, chosen by
 * the `view` search param, inside the branding layout:
 *   /login                — login form (default)
 *   /login?view=send-code — forgot password step 1
 *   /login?view=reset-password — forgot password step 2
 *   /login?view=reset-confirmation — forgot password step 3
 */

import { Suspense, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { ArcusLogo } from '@/components/shared/ArcusLogo';
import { LoginForm } from '@/components/login/LoginForm';
import { SendCodeForm } from '@/components/login/SendCodeForm';
import { ResetPasswordForm } from '@/components/login/ResetPasswordForm';
import { ResetConfirmation } from '@/components/login/ResetConfirmation';

// ── Page Content (uses useSearchParams, must be inside Suspense) ──────

function LoginPageContent() {
  const searchParams = useSearchParams();
  const view = searchParams.get('view');

  let content: ReactNode;
  switch (view) {
    case 'send-code':
      content = <SendCodeForm />;
      break;
    case 'reset-password':
      content = <ResetPasswordForm />;
      break;
    case 'reset-confirmation':
      content = <ResetConfirmation />;
      break;
    default:
      content = <LoginForm />;
  }

  return (
    <main className="flex min-h-screen">
      {/* Branding panel */}
      <div className="hidden md:flex flex-col items-center justify-center flex-[0_0_35%] bg-gradient-to-b from-crane to-heron border-r border-grouse px-8">
        <ArcusLogo className="w-28 h-28 mb-6" />
        <div className="text-2xl font-bold text-swift mb-2">Arcus</div>
        <div className="text-sm text-grouse uppercase tracking-wider">
          Smart Home
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-[var(--gutter)]">
        {content}
      </div>
    </main>
  );
}

// ── Page Component ────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Loading...</div>}>
      <LoginPageContent />
    </Suspense>
  );
}
