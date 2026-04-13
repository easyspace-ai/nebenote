"use client";

import { AlertCircle } from "lucide-react";

interface ArtifactErrorProps {
  error: Error;
  onRetry?: () => void;
}

export function ArtifactError({ error, onRetry }: ArtifactErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      <AlertCircle className="h-12 w-12 text-destructive mb-4" />
      <h3 className="text-lg font-semibold mb-2">产物加载失败</h3>
      <p className="text-sm text-muted-foreground mb-4">
        无法加载产物内容，请检查网络连接或联系支持。
      </p>
      {error.message && (
        <details className="text-xs max-w-md">
          <summary className="cursor-pointer text-muted-foreground">错误详情</summary>
          <pre className="mt-2 p-2 bg-muted rounded text-left overflow-auto">
            {error.message}
          </pre>
        </details>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
        >
          重试
        </button>
      )}
    </div>
  );
}