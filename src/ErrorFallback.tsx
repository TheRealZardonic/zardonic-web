import { Alert, AlertTitle, AlertDescription } from "./components/ui/alert";
import { Button } from "./components/ui/button";

import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";
import type { FallbackProps } from "react-error-boundary";

export const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  // In development, rethrow so the React dev overlay shows the full stack trace.
  if (import.meta.env.DEV) throw error;

  // In production never expose internal error details — they may contain stack
  // traces, module paths, or other implementation details.
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangleIcon />
          <AlertTitle>An error has occurred</AlertTitle>
          <AlertDescription>
            Something unexpected happened. Please try again or reload the page.
          </AlertDescription>
        </Alert>
        
        <Button 
          onClick={resetErrorBoundary} 
          className="w-full"
          variant="outline"
        >
          <RefreshCwIcon />
          Try Again
        </Button>
      </div>
    </div>
  );
}
