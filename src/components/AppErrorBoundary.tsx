import React from "react";
import { Button } from "@/components/ui/button";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
  message?: string;
  stack?: string;
};

export default class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    return { hasError: true, message, stack };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[app-error-boundary] Caught error", { error, info });
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
        <div className="w-full max-w-2xl rounded-lg border bg-card p-6 shadow-sm">
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The app hit an unexpected runtime error. Check the console for details.
          </p>

          <div className="mt-4 rounded-md bg-muted p-3">
            <div className="text-sm font-medium">Error</div>
            <div className="mt-1 text-sm font-mono break-words">
              {this.state.message}
            </div>
          </div>

          {this.state.stack ? (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-muted-foreground">
                Stack trace
              </summary>
              <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs">
                {this.state.stack}
              </pre>
            </details>
          ) : null}

          <div className="mt-6 flex gap-2">
            <Button onClick={this.handleReload}>Reload</Button>
          </div>
        </div>
      </div>
    );
  }
}
