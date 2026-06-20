import { Outlet } from 'react-router-dom';
import { PhoneFrame } from './PhoneFrame';
import { BottomTabBar } from './BottomTabBar';

/** Jajman surface layout: scrollable Outlet body + pinned bottom tabs. */
export function AppLayout() {
  return (
    <PhoneFrame>
      <div className="flex flex-1 flex-col overflow-y-auto">
        <Outlet />
      </div>
      <BottomTabBar />
    </PhoneFrame>
  );
}
