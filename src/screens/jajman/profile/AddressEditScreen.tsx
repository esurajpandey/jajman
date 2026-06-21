import { useNavigate, useParams } from 'react-router-dom';
import { AppBar } from '../../../components/ui/AppBar';
import { BackButton } from '../../../components/ui/BackButton';
import { AddressForm } from '../../../components/booking/AddressForm';
import { useBookingStore } from '../../../store/bookingStore';

export function AddressEditScreen() {
  const navigate = useNavigate();
  const { id } = useParams();
  const existing = useBookingStore((s) => (id ? s.getAddress(id) : undefined));
  const addAddress = useBookingStore((s) => s.addAddress);
  const updateAddress = useBookingStore((s) => s.updateAddress);
  const editing = Boolean(id);

  return (
    <>
      <AppBar title={editing ? 'Edit Address' : 'Add Address'} left={<BackButton />} />
      <div className="flex-1 overflow-y-auto p-4">
        <AddressForm
          initial={existing}
          submitLabel={editing ? 'Save changes' : 'Add address'}
          onSave={(a) => {
            if (editing && id) updateAddress(id, a);
            else addAddress(a);
            navigate('/app/profile/addresses', { replace: true });
          }}
        />
      </div>
    </>
  );
}
