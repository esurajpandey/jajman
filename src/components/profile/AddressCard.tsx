import { Home, Users, Building2, Landmark, MapPin, type LucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import type { Address, AddressType } from '../../mock/types';

const ICONS: Record<AddressType, LucideIcon> = {
  home: Home,
  parents: Users,
  relative: Building2,
  temple: Landmark,
  custom: MapPin,
};

export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}: {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
}) {
  const Icon = ICONS[address.type];
  return (
    <Card className="p-3">
      <div className="flex items-start gap-3">
        <Icon size={20} className="mt-0.5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{address.label}</span>
            {address.isDefault && <Badge className="bg-primary/10 text-primary">Default</Badge>}
          </div>
          <p className="text-sm text-muted">{address.line}</p>
          <p className="text-xs text-muted">{address.city}</p>
          {address.notes && <p className="mt-1 text-xs text-muted">📝 {address.notes}</p>}
        </div>
      </div>
      <div className="mt-2 flex gap-3 text-xs font-medium">
        <button type="button" onClick={onEdit} className="text-primary">Edit</button>
        {!address.isDefault && (
          <button type="button" onClick={onSetDefault} className="text-primary">Set default</button>
        )}
        <button type="button" onClick={onDelete} className="ml-auto text-error">Delete</button>
      </div>
    </Card>
  );
}
