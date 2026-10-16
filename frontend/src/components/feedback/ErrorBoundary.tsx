import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/** Still a class: there is no hook equivalent for catching render errors. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled render error", error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div role="alert" className="mx-auto max-w-md p-8 text-center">
        <h1 className="text-lg font-semibold text-content">Something went wrong</h1>
        <p className="mt-2 text-sm text-content-muted">{error.message}</p>
        <Button className="mt-4" onClick={() => this.setState({ error: null })}>
          Try again
        </Button>
      </div>
    );
  }
}
