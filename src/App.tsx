import { RouterProvider } from 'react-router-dom';
import { router } from './app/router';
import { ThemeApplier } from './theme/ThemeApplier';

export default function App() {
  return (
    <>
      <ThemeApplier />
      <RouterProvider router={router} />
    </>
  );
}
