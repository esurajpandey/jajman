import { BottomSheet } from '../../../components/ui/BottomSheet';
import { AddressForm } from '../../../components/booking/AddressForm';
import { useBookingStore } from '../../../store/bookingStore';

export function AddAddressSheet({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (id: string) => void }) {
  const addAddress = useBookingStore((s) => s.addAddress);
  return (
    <BottomSheet open={open} onClose={onClose} title="Add address">
      <AddressForm
        onSave={(a) => {
          const created = addAddress(a);
          onAdded(created.id);
          onClose();
        }}
      />
    </BottomSheet>
  );
}
