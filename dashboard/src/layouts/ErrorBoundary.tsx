import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-surface-900 text-slate-200">
          <AlertTriangle className="w-16 h-16 text-danger mb-4" />
          <h1 className="text-xl font-bold mb-2">Something went wrong.</h1>
          <p className="text-slate-400 mb-6 font-mono text-sm max-w-lg truncate">{this.state.error?.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-accent-600 hover:bg-accent-500 rounded font-medium transition-colors"
          >
            Reload application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
