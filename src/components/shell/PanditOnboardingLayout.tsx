import { Outlet } from 'react-router-dom';
import { PhoneFrame } from './PhoneFrame';

/** Onboarding wizard layout: no bottom tabs; children own the scroll + sticky footer. */
export function PanditOnboardingLayout() {
  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Outlet />
      </div>
    </PhoneFrame>
  );
}
