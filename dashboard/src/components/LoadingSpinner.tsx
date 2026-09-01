interface Props {
  lines?: number;
}

export function Skeleton({ lines = 1 }: Props) {
  return (
    <div className="space-y-2 animate-fade-in">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 rounded skeleton"
          style={{ width: `${85 - i * 10}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-[#16161e] border border-[#22222e] rounded-lg p-4 space-y-3">
      <div className="h-3 w-20 rounded skeleton" />
      <div className="h-7 w-32 rounded skeleton" />
      <div className="h-3 w-24 rounded skeleton" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex gap-4 items-center py-2.5 border-b border-[#1a1a24]">
      <div className="h-3 w-12 rounded skeleton flex-shrink-0" />
      <div className="h-3 w-8 rounded skeleton flex-shrink-0" />
      <div className="h-3 flex-1 rounded skeleton" />
      <div className="h-3 w-20 rounded skeleton flex-shrink-0" />
      <div className="h-3 w-16 rounded skeleton flex-shrink-0" />
    </div>
  );
}
