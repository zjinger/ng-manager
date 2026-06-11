import React from 'react';
import { APIProvider } from '@/lib/api/provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return <APIProvider>{children}</APIProvider>;
}
