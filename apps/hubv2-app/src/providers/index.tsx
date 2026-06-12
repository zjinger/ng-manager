import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { APIProvider } from '@/lib/api/provider';
import { ThemeProvider } from './theme-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <APIProvider>{children}</APIProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
