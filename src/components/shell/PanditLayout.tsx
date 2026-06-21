import { Outlet } from 'react-router-dom';
import { PhoneFrame } from './PhoneFrame';
import { PanditTabBar } from './PanditTabBar';

/** Pandit surface layout: scrollable Outlet + pinned pandit tabs. */
export function PanditLayout() {
  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <Outlet />
      </div>
      <PanditTabBar />
    </PhoneFrame>
  );
}
