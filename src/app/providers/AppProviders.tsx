import { QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider } from 'antd';
import { type ReactNode, useState } from 'react';

import { createQueryClient } from '@/shared/api/queryClient';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';

interface Props {
  children: ReactNode;
}

/**
 * Every app-wide provider, composed in one place so main.tsx stays a
 * three-line entrypoint and tests can wrap components in the same stack.
 *
 * Order matters: ErrorBoundary is outermost so it still catches a crash thrown
 * while a provider below it is initialising.
 */
export function AppProviders({ children }: Props) {
  // `useState` rather than a module-level `createQueryClient()` call: a
  // module-level client is shared by every test file in the same process and
  // leaks cached data between tests. This gives one client per mount, created
  // once and never recreated on re-render.
  const [queryClient] = useState(createQueryClient);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          theme={{
            token: {
              // Mirrors --ui-primary / --ui-font in src/styles/ui.css.
              colorPrimary: '#1f63e0',
              fontFamily: "'Inter', system-ui, sans-serif",
              borderRadius: 8,
            },
          }}
        >
          <AntApp>{children}</AntApp>
        </ConfigProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
