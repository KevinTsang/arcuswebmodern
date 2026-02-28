'use client';

/**
 * Notifications — toast notification display.
 *
 * Reads from the uiSlice notifications array and renders stacked toasts
 * with auto-dismiss. Ports the pattern from src/plugins/notifications.js.
 */

import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { removeNotification } from '@/store/slices/uiSlice';

const AUTO_DISMISS_MS = 5000;

const TYPE_STYLES: Record<string, string> = {
  info: 'bg-peacock text-crane',
  success: 'bg-honeycreeper text-crane',
  warning: 'bg-canary text-raven',
  error: 'bg-cardinal text-crane',
};

export default function Notifications() {
  const dispatch = useAppDispatch();
  const notifications = useAppSelector((s) => s.ui.notifications);

  // Auto-dismiss notifications after timeout
  useEffect(() => {
    if (notifications.length === 0) return;

    const timers = notifications.map((n) => {
      return setTimeout(() => {
        dispatch(removeNotification(n.id));
      }, AUTO_DISMISS_MS);
    });

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [notifications, dispatch]);

  const handleDismiss = useCallback(
    (id: string) => {
      dispatch(removeNotification(id));
    },
    [dispatch],
  );

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[var(--z-notifications)] flex flex-col gap-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            px-4 py-3 rounded-[var(--border-radius-base)] shadow-lg
            flex items-start gap-3 animate-[slideIn_0.3s_ease-out]
            ${TYPE_STYLES[notification.type] ?? TYPE_STYLES.info}
          `}
          role="alert"
        >
          <p className="flex-1 text-sm">{notification.message}</p>
          <button
            onClick={() => handleDismiss(notification.id)}
            className="opacity-70 hover:opacity-100 text-inherit flex-shrink-0"
            aria-label="Dismiss"
          >
            &times;
          </button>
        </div>
      ))}
    </div>
  );
}
