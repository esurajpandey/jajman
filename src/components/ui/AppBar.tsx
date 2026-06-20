import type { ReactNode } from 'react';

export function AppBar({
  title,
  left,
  right,
}: {
  title?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-border bg-surface/80 px-4 backdrop-blur">
      {left}
      <div className="min-w-0 flex-1 truncate text-base font-semibold">{title}</div>
      {right}
    </header>
  );
}
