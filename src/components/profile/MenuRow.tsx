import { ChevronRight, type LucideIcon } from 'lucide-react';
import { Badge } from '../ui/Badge';

export function MenuRow({
  icon: Icon,
  label,
  value,
  badge,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  badge?: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 px-4 py-3 text-left disabled:opacity-50"
    >
      <Icon size={20} className="shrink-0 text-muted" />
      <span className="flex-1 text-sm text-text">{label}</span>
      {value && <span className="text-xs text-muted">{value}</span>}
      {badge && <Badge>{badge}</Badge>}
      {!disabled && <ChevronRight size={18} className="text-muted" />}
    </button>
  );
}
