import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Orate Playground',
  description: 'Orate Playground',
};

type RootLayoutProps = {
  children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProps) => (
  <html lang="en" className="scroll-smooth" suppressHydrationWarning>
    <body
      className={cn(
        GeistSans.variable,
        GeistMono.variable,
        'bg-secondary font-sans antialiased dark:bg-background'
      )}
    >
      {children}
    </body>
  </html>
);

export default RootLayout;
