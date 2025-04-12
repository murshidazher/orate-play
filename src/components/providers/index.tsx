import type { ThemeProviderProps } from 'next-themes';
import { Toaster } from '../ui/sonner';
import { TooltipProvider } from '../ui/tooltip';
import { ThemeProvider } from './theme';

type DesignSystemProviderProperties = ThemeProviderProps;

export const DesignSystemProvider = ({
  children,
  ...properties
}: DesignSystemProviderProperties) => (
  <ThemeProvider {...properties}>
    <TooltipProvider>{children}</TooltipProvider>
    <Toaster />
  </ThemeProvider>
);
