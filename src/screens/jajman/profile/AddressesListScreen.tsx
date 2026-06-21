import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { Plus, MapPin } from 'lucide-react';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { Button } from '../../../components/ui/Button';
import { AddressCard } from '../../../components/profile/AddressCard';
import { useBookingStore } from '../../../store/bookingStore';

export function AddressesListScreen() {
  const navigate = useNavigate();
  const addresses = useBookingStore(useShallow((s) => s.addresses));
  const deleteAddress = useBookingStore((s) => s.deleteAddress);
  const setDefaultAddress = useBookingStore((s) => s.setDefaultAddress);

  return (
    <>
      <AppBar title="My Addresses" left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        {addresses.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <MapPin size={36} className="text-muted" />
            <p className="text-sm text-muted">Add your first address.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {addresses.map((a) => (
              <AddressCard
                key={a.id}
                address={a}
                onEdit={() => navigate(`/app/profile/addresses/${a.id}/edit`)}
                onDelete={() => deleteAddress(a.id)}
                onSetDefault={() => setDefaultAddress(a.id)}
              />
            ))}
          </div>
        )}
        <Button className="mt-4 w-full" onClick={() => navigate('/app/profile/addresses/new')}>
          <Plus size={18} /> Add new address
        </Button>
      </div>
    </>
  );
}
