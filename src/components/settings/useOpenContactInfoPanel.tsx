'use client';

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useSidePanel } from '@/components/SidePanel';
import { loadContactInfo } from './contactInfo';
import ContactInfoPanel from './ContactInfoPanel';

/**
 * Returns a callback that opens the contact info panel. It starts loading the
 * person before the panel renders, so the panel suspends on a promise that
 * outlives it. Retry reopens the panel through the same callback.
 */
export function useOpenContactInfoPanel(): () => void {
  const personId = useAppSelector((s) => s.auth.person?.personId);
  const dispatch = useAppDispatch();
  const { openRight } = useSidePanel();

  const openFor = useCallback(
    function openFor(id: string | undefined) {
      openRight(
        <ContactInfoPanel person={id ? loadContactInfo(id, dispatch) : null} onReload={openFor} />,
        { title: 'Edit Contact Info', key: `contact-info:${id ?? 'none'}` },
      );
    },
    [openRight, dispatch],
  );

  return useCallback(() => openFor(personId), [openFor, personId]);
}
