'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  /** Accept children from Next layouts (avoids duplicate @types/react ReactNode mismatch). */
  children: ReactNode | Iterable<ReactNode>;
}

interface State {
  hasError: boolean;
  message?: string;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 p-8 text-center">
          <h1 className="font-heading text-xl font-bold">Something went wrong</h1>
          <p className="max-w-md text-sm text-muted-foreground">
            {this.state.message ?? 'An unexpected error occurred. Try again or refresh the page.'}
          </p>
          <Button type="button" onClick={() => this.setState({ hasError: false })}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
