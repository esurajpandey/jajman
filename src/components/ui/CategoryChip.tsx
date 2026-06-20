export function CategoryChip({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex w-16 shrink-0 flex-col items-center gap-1">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 text-2xl">
        {icon}
      </span>
      <span className="text-center text-xs leading-tight text-text">{label}</span>
    </button>
  );
}
