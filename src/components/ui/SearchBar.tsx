import { Search } from 'lucide-react';

export function SearchBar({
  placeholder = 'Search pandits, pujas…',
  onClick,
}: {
  placeholder?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center gap-2 rounded-md bg-surface-2 px-3 text-sm text-muted"
    >
      <Search size={18} />
      <span>{placeholder}</span>
    </button>
  );
}
