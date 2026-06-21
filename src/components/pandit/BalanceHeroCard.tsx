import { Wallet } from 'lucide-react';
import { Button } from '../ui/Button';

export function BalanceHeroCard({ available, onWithdraw, disabled = false }: { available: number; onWithdraw: () => void; disabled?: boolean }) {
  return (
    <div className="rounded-lg bg-gradient-to-br from-primary to-primary-600 p-4 text-primary-fg">
      <div className="flex items-center gap-2 text-sm opacity-90"><Wallet size={16} /> Available balance</div>
      <p className="mt-1 text-3xl font-bold">₹{available.toLocaleString('en-IN')}</p>
      <Button variant="ghost" className="mt-3 w-full bg-surface text-primary hover:bg-surface" onClick={onWithdraw} disabled={disabled}>Withdraw</Button>
    </div>
  );
}
