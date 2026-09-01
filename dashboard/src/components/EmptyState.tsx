import type { ReactNode } from 'react';

interface Props {
  icon?: ReactNode;
  title?: string;
  message?: string;
}

export function EmptyState({
  icon,
  title = 'No data',
  message = 'Nothing to display yet',
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center animate-fade-in">
      {icon ? (
        <div className="w-10 h-10 rounded-full bg-[#16161e] border border-[#22222e] flex items-center justify-center text-[#55556a]">
          {icon}
        </div>
      ) : (
        <div className="w-10 h-10 rounded-full bg-[#16161e] border border-[#22222e] flex items-center justify-center">
          <svg className="w-4 h-4 text-[#55556a]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-[#8888a0]">{title}</p>
        <p className="text-xs text-[#55556a] mt-0.5">{message}</p>
      </div>
    </div>
  );
}
