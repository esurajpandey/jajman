import { Outlet } from 'react-router-dom';
import { PhoneFrame } from './PhoneFrame';

export function AuthLayout() {
  return (
    <PhoneFrame>
      <Outlet />
    </PhoneFrame>
  );
}
