'use client';

import { useState, useCallback } from 'react';

interface CreatedKeyBannerProps {
  /** The new key's token. The platform only returns it once, at creation. */
  token: string;
  onDismiss: () => void;
}

/** One-time banner showing a newly created API key, with Copy and Dismiss. */
export function CreatedKeyBanner({ token, onDismiss }: CreatedKeyBannerProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [token]);

  return (
    <div data-testid="apikey-created" className="mb-4 bg-honeycreeper/5 border border-honeycreeper/20 rounded-[var(--border-radius-base)] px-4 py-3">
      <p className="text-sm font-medium text-swift mb-1">
        API key created. Copy it now — it will not be shown again.
      </p>
      <div className="flex items-center gap-2">
        <code data-testid="apikey-token" className="flex-1 text-sm bg-pigeon/30 px-3 py-1.5 rounded font-mono break-all">
          {token}
        </code>
        <button
          onClick={handleCopy}
          data-testid="apikey-copy"
          className="px-3 py-1.5 text-sm bg-peacock text-crane rounded-[var(--border-radius-base)] hover:bg-peacock/90 flex-shrink-0"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <button
        onClick={onDismiss}
        data-testid="apikey-dismiss"
        className="mt-2 text-xs text-grouse hover:underline"
      >
        Dismiss
      </button>
    </div>
  );
}
