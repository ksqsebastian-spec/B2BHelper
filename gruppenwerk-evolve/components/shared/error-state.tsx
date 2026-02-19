'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

// Fehleranzeige mit optionalem Retry-Button
export function ErrorState({
  message = 'Ein Fehler ist aufgetreten.',
  onRetry,
  className,
}: ErrorStateProps): React.ReactNode {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-4 py-16 text-center', className)}>
      <AlertCircle className="h-12 w-12 text-destructive" />
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">Fehler</h3>
        <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <RefreshCw className="h-4 w-4" />
          Erneut versuchen
        </button>
      )}
    </div>
  );
}
