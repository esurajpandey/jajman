import { Pencil, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { BankAccount } from '../../mock/types';

export function BankCard({ bank, onEdit, onDelete }: { bank: BankAccount; onEdit: () => void; onDelete: () => void }) {
  return (
    <Card className="flex items-center gap-3 p-3">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-medium">{bank.bankName}{bank.isDefault && <Badge className="bg-primary/10 text-primary">Default</Badge>}</p>
        <p className="text-xs text-muted"><span>{bank.accountNumberMasked}</span> · {bank.ifsc}</p>
        <p className="text-xs text-muted">{bank.holderName}</p>
      </div>
      <button type="button" aria-label={`Edit ${bank.bankName}`} onClick={onEdit} className="p-1 text-muted"><Pencil size={16} /></button>
      <button type="button" aria-label={`Delete ${bank.bankName}`} onClick={onDelete} className="p-1 text-muted"><Trash2 size={16} /></button>
    </Card>
  );
}
