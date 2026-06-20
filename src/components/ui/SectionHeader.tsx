import type { ReactNode } from 'react';

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-5 flex items-center justify-between px-4">
      <h2 className="text-[15px] font-semibold">{title}</h2>
      {action}
    </div>
  );
}
