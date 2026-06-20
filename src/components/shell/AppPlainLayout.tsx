import { Outlet } from 'react-router-dom';
import { PhoneFrame } from './PhoneFrame';

/** Drill-down/detail layout for the Jajman surface: scrollable Outlet, no bottom tab bar. */
export function AppPlainLayout() {
  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <Outlet />
      </div>
    </PhoneFrame>
  );
}
