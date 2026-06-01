'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { YOUTH_ROUTES } from '@/lib/youth/routes';

interface Props {
  children: ReactNode | Iterable<ReactNode>;
}

interface State {
  hasError: boolean;
  message?: string;
}

export class YouthErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[YouthErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] items-center justify-center p-6" role="alert">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden />
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <p>We could not load this youth section. Try refreshing or return to the hub.</p>
              {this.state.message && (
                <p className="rounded bg-muted px-2 py-1 font-mono text-xs">{this.state.message}</p>
              )}
              <div className="flex gap-2">
                <Button type="button" onClick={() => this.setState({ hasError: false })}>
                  Try again
                </Button>
                <Button asChild variant="outline">
                  <Link href={YOUTH_ROUTES.hub}>Youth hub</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
