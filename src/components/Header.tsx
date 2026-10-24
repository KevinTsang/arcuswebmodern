'use client';

/**
 * Header — main navigation bar.
 *
 * Ported from src/components/header/. Includes desktop nav links,
 * mobile hamburger menu, greeting, place selector trigger, and add menu trigger.
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Person } from '@arcus/core';
import { useAppSelector } from '@/store/hooks';
import { useSidePanel } from '@/components/SidePanel';
import PlaceSelector from '@/components/PlaceSelector';
import { ArcusLogo } from '@/components/shared/ArcusLogo';

const NAV_LINKS = [
  { href: '/home', label: 'Dashboard', matchPrefix: '/home' },
  { href: '/scenes', label: 'Scenes', matchPrefix: '/scenes' },
  { href: '/rules', label: 'Rules', matchPrefix: '/rules' },
  { href: '/devices', label: 'Devices', matchPrefix: '/devices' },
  { href: '/settings', label: 'Settings', matchPrefix: '/settings' },
];

export default function Header() {
  const pathname = usePathname();
  const person = useAppSelector((s) => s.auth.person);
  const account = useAppSelector((s) => s.auth.account);
  const { openRight } = useSidePanel();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const isAccountLoading = account === null;
  const firstName = person?.[Person.ATTR_FIRSTNAME] ?? '';

  const handlePlaceSelector = useCallback(() => {
    if (isAccountLoading) return;
    openRight(<PlaceSelector />);
  }, [isAccountLoading, openRight]);

  const toggleMobileNav = useCallback(() => {
    setMobileNavOpen((prev) => !prev);
  }, []);

  const closeMobileNav = useCallback(() => {
    setMobileNavOpen(false);
  }, []);

  return (
    <>
      <header
        className={`
          sticky top-0 z-[var(--z-navbar)] bg-crane border-b border-heron
          flex items-center h-14 px-4
          ${isAccountLoading ? 'pointer-events-none opacity-60' : ''}
        `}
      >
        {/* Mobile menu toggle */}
        <button
          onClick={toggleMobileNav}
          className="md:hidden mr-3 text-xl text-swift"
          aria-label="Toggle menu"
        >
          &#9776;
        </button>

        {/* Logo */}
        <Link href="/home" className="flex items-center gap-2 font-bold text-lg text-peacock mr-8 flex-shrink-0">
          <ArcusLogo className="w-7 h-7" />
          Arcus
        </Link>

        {/* Desktop navigation */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname.startsWith(link.matchPrefix);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  px-3 py-1.5 rounded-[var(--border-radius-base)] text-sm font-medium
                  transition-colors
                  ${isActive
                    ? 'text-peacock bg-peacock/10'
                    : 'text-coot hover:text-swift hover:bg-pigeon'}
                `}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right utilities */}
        <div className="flex items-center gap-4 ml-auto">
          {firstName && (
            <span data-testid="header-greeting" className="hidden sm:inline text-sm text-grouse">
              Hello, {firstName}
            </span>
          )}
          <button
            onClick={handlePlaceSelector}
            data-testid="header-places"
            className="text-coot hover:text-swift transition-colors"
            aria-label="Places & Logout"
            title="Places & Logout"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile navigation overlay */}
      {mobileNavOpen && (
        <>
          <div
            className="fixed inset-0 bg-raven/30 z-[calc(var(--z-navbar)-1)] md:hidden"
            onClick={closeMobileNav}
          />
          <nav className="fixed top-0 left-0 h-full w-64 bg-crane shadow-xl z-[var(--z-navbar)] md:hidden">
            <div className="flex items-center justify-between p-4 border-b border-heron">
              <span className="font-bold text-lg text-peacock">Arcus</span>
              <button
                onClick={closeMobileNav}
                className="text-2xl text-grouse hover:text-swift"
                aria-label="Close menu"
              >
                &times;
              </button>
            </div>
            <ul className="p-4 space-y-1">
              {NAV_LINKS.map((link) => {
                const isActive = pathname.startsWith(link.matchPrefix);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={closeMobileNav}
                      className={`
                        block px-3 py-2.5 rounded-[var(--border-radius-base)] text-sm font-medium
                        transition-colors
                        ${isActive
                          ? 'text-peacock bg-peacock/10'
                          : 'text-coot hover:text-swift hover:bg-pigeon'}
                      `}
                    >
                      {link.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </>
      )}
    </>
  );
}
