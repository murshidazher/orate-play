import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';
import type { Metadata } from 'next';
import './globals.css';
import { DesignSystemProvider } from '@/components/providers';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Orate Playground',
  description: 'Orate Playground | AI toolkit for speech.',
};

type RootLayoutProperties = {
  readonly children: ReactNode;
};

const RootLayout = ({ children }: RootLayoutProperties) => (
  <html lang="en" className="scroll-smooth" suppressHydrationWarning>
    <body
      className={cn(
        GeistSans.variable,
        GeistMono.variable,
        'bg-secondary font-sans antialiased dark:bg-background'
      )}
    >
      <DesignSystemProvider>{children}</DesignSystemProvider>
    </body>
  </html>
);

export default RootLayout;
