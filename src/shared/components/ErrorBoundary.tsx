import { Component, type ErrorInfo, type ReactNode } from 'react';

import { IS_DEV } from '@/shared/config/env';
import { logger } from '@/shared/lib/logger';

interface Props {
  children: ReactNode;
  /** Optional custom fallback; defaults to the built-in panel below. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  error: Error | null;
  componentStack?: string | null | undefined;
}

/**
 * Catches render-phase crashes anywhere below it.
 *
 * Without a boundary, a single throw unmounts the whole React tree and leaves
 * a blank white page with no recovery path and no report. Still a class
 * component because React has no hook equivalent for componentDidCatch.
 *
 * Note this catches render/lifecycle errors only - not errors inside event
 * handlers or async callbacks. Those surface through TanStack Query's
 * `isError` instead.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    logger.error(error, { componentStack: info.componentStack });
    this.setState({ componentStack: info.componentStack ?? null });
  }

  private readonly handleReset = (): void => {
    this.setState({ error: null, componentStack: null });
  };

  override render(): ReactNode {
    const { error } = this.state;
    if (!error) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback(error, this.handleReset);
    }

    return (
      <div
        role="alert"
        data-testid="error-boundary-fallback"
        className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center"
      >
        <h1 className="text-2xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="max-w-md text-slate-600">
          The dashboard hit an unexpected problem. You can try again below.
        </p>

        {/* The raw message can contain internal detail, so it is dev-only. */}
        {IS_DEV ? (
          <div className="max-w-2xl text-left w-full">
            <pre className="overflow-auto rounded bg-slate-100 p-4 text-xs font-mono text-red-700 whitespace-pre-wrap">
              {error.message}
            </pre>
            {this.state.componentStack && (
              <pre className="mt-2 max-h-60 overflow-auto rounded bg-slate-50 p-4 text-[11px] font-mono text-slate-600">
                {this.state.componentStack}
              </pre>
            )}
          </div>
        ) : null}

        <button
          type="button"
          onClick={this.handleReset}
          className="rounded bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-700"
        >
          Try again
        </button>
      </div>
    );
  }
}
