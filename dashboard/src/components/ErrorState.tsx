interface Props {
  message?: string;
  retry?: () => void;
  requestId?: string;
}

export function ErrorState({ message = 'Failed to load data', retry, requestId }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center animate-fade-in">
      <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
        <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <div>
        <p className="text-sm text-[#f0f0f4] font-medium">{message}</p>
        {requestId && (
          <p className="text-xs text-[#55556a] font-mono mt-1">{requestId}</p>
        )}
      </div>
      {retry && (
        <button
          onClick={retry}
          className="px-3 py-1.5 text-xs font-medium rounded border border-[#22222e] text-[#8888a0] hover:text-[#f0f0f4] hover:border-[#6366f1] transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
