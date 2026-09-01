import { type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  noPad?: boolean;
}

export function Panel({ children, className = '', noPad }: Props) {
  return (
    <div
      className={`bg-[#16161e] border border-[#22222e] rounded-lg ${noPad ? '' : 'p-4'} ${className}`}
    >
      {children}
    </div>
  );
}
