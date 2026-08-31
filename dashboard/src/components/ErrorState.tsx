import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-surface-800 rounded-lg border border-subtle border-danger/20 text-center">
      <AlertCircle className="w-10 h-10 text-danger mb-4" />
      <p className="text-slate-200 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-surface-700 hover:bg-surface-600 rounded transition-colors text-sm font-medium"
        >
          Retry
        </button>
      )}
    </div>
  );
}
