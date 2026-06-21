import { ArrowDownLeft, ArrowUpRight, Percent, Receipt } from 'lucide-react';
import type { WalletTxn } from '../../mock/types';
import { cn } from '../../lib/cn';

const META: Record<WalletTxn['type'], { icon: typeof Receipt; label: string }> = {
  earning: { icon: ArrowDownLeft, label: 'Earning' },
  commission: { icon: Percent, label: 'Commission' },
  withdrawal: { icon: ArrowUpRight, label: 'Withdrawal' },
  refund: { icon: Receipt, label: 'Refund' },
};

export function TransactionRow({ txn, pujaName }: { txn: WalletTxn; pujaName?: string }) {
  const { icon: Icon, label } = META[txn.type];
  const credit = txn.amount > 0;
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted"><Icon size={16} /></span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{label}{pujaName ? ` · ${pujaName}` : ''}</p>
        <p className="truncate text-xs text-muted">{txn.note} · {txn.createdAt.slice(0, 10)}</p>
      </div>
      <span className={cn('shrink-0 text-sm font-semibold', credit ? 'text-success' : txn.amount === 0 ? 'text-muted line-through' : 'text-text')}>
        {credit ? '+' : txn.amount < 0 ? '−' : ''}₹{Math.abs(txn.amount).toLocaleString('en-IN')}
      </span>
    </div>
  );
}
