import type { Metadata } from 'next';
import { StoreProvider } from '@/store/provider';
import AuthProvider from '@/components/AuthProvider';
import Notifications from '@/components/Notifications';
import './globals.css';

export const metadata: Metadata = {
  title: 'Arcus Smart Home',
  description: 'Arcus Smart Home Web Interface',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-[var(--font-family-base)] text-coot bg-crane">
        <StoreProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
          <Notifications />
        </StoreProvider>
      </body>
    </html>
  );
}
