"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
          <h2 className="text-lg font-semibold text-destructive mb-2">出错了</h2>
          <p className="text-sm text-muted-foreground mb-2">
            组件渲染时发生错误，请查看控制台了解详情。
          </p>
          {this.state.error && (
            <details className="text-xs">
              <summary className="cursor-pointer text-destructive">错误详情</summary>
              <pre className="mt-2 p-2 bg-background rounded border overflow-auto">
                {this.state.error.message}
                {this.state.error.stack && `\n${this.state.error.stack}`}
              </pre>
            </details>
          )}
          <button
            className="mt-2 px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
            onClick={() => this.setState({ hasError: false, error: null })}
          >
            重试
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}