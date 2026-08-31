import { FileQuestion } from 'lucide-react';

interface EmptyStateProps {
  message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-surface-800 rounded-lg border border-subtle text-center">
      <FileQuestion className="w-12 h-12 text-slate-500 mb-4" />
      <p className="text-slate-400">{message}</p>
    </div>
  );
}
