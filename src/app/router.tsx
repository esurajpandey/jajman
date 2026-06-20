import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PhoneFrame } from '../components/shell/PhoneFrame';
import { HomeScreen } from '../screens/jajman/HomeScreen';
import { NotFound } from '../screens/shared/NotFound';

// P0: auth/guards arrive in Phase 1; for now the root sends straight to Home.
function RootRedirect() {
  return <Navigate to="/app/home" replace />;
}

export const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  {
    path: '/app/home',
    element: (
      <PhoneFrame>
        <HomeScreen />
      </PhoneFrame>
    ),
  },
  {
    path: '*',
    element: (
      <PhoneFrame>
        <NotFound />
      </PhoneFrame>
    ),
  },
]);
