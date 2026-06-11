import React from 'react';
import { APIProvider } from '@/lib/api/provider';
import { ThemeProvider } from './theme-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <APIProvider>{children}</APIProvider>
    </ThemeProvider>
  );
}
