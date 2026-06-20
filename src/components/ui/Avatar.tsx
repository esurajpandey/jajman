export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials =
    name
      .replace(/^(Pandit|Acharya)\s*/i, '')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase() || '?';
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-secondary font-semibold text-secondary-fg"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}
