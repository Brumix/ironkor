import { Component, useState } from "react";

import AppErrorScreen from "@/features/errors/AppErrorScreen";
import { resolveStartupErrorMessage } from "@/features/errors/startupErrors";

import type { ErrorInfo, ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryInnerProps extends AppErrorBoundaryProps {
  onRetry: () => void;
}

interface AppErrorBoundaryState {
  error: Error | null;
}

class AppErrorBoundaryInner extends Component<
  AppErrorBoundaryInnerProps,
  AppErrorBoundaryState
> {
  state: AppErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[app] Unhandled render error", error, errorInfo.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <AppErrorScreen
          eyebrow="App error"
          message={resolveStartupErrorMessage(
            this.state.error,
            "An unexpected screen error interrupted Ironkor. Try loading it again.",
          )}
          primaryAction={{
            label: "Reload app shell",
            onPress: this.props.onRetry,
            variant: "accent",
          }}
          title="Ironkor ran into a screen error"
        />
      );
    }

    return this.props.children;
  }
}

export default function AppErrorBoundary({ children }: AppErrorBoundaryProps) {
  const [resetKey, setResetKey] = useState(0);

  return (
    <AppErrorBoundaryInner
      key={resetKey}
      onRetry={() => {
        setResetKey((current) => current + 1);
      }}
    >
      {children}
    </AppErrorBoundaryInner>
  );
}
