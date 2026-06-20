import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppLayout } from '../components/shell/AppLayout';
import { AuthLayout } from '../components/shell/AuthLayout';
import { RequireAuth, RequireGuest } from './guards';
import { RootRedirect } from './RootRedirect';
import { NotFound } from '../screens/shared/NotFound';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { LanguageScreen } from '../screens/auth/LanguageScreen';
import { WelcomeScreen } from '../screens/auth/WelcomeScreen';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { OtpScreen } from '../screens/auth/OtpScreen';
import { PasswordLoginScreen } from '../screens/auth/PasswordLoginScreen';
import { ForgotPasswordScreen } from '../screens/auth/ForgotPasswordScreen';
import { ChangePasswordScreen } from '../screens/auth/ChangePasswordScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';
import { RoleSelectScreen } from '../screens/auth/RoleSelectScreen';
import { PermissionsScreen } from '../screens/auth/PermissionsScreen';
import { ProfileSetupScreen } from '../screens/auth/ProfileSetupScreen';
import { AdminLoginScreen } from '../screens/admin/AdminLoginScreen';
import { HomeScreen } from '../screens/jajman/HomeScreen';

export const routes: RouteObject[] = [
  { path: '/', element: <SplashScreen /> },
  { path: '/start', element: <RootRedirect /> },
  {
    element: (
      <RequireGuest>
        <AuthLayout />
      </RequireGuest>
    ),
    children: [
      { path: '/auth/language', element: <LanguageScreen /> },
      { path: '/auth/welcome', element: <WelcomeScreen /> },
      { path: '/auth/login', element: <LoginScreen /> },
      { path: '/auth/otp', element: <OtpScreen /> },
      { path: '/auth/password', element: <PasswordLoginScreen /> },
      { path: '/auth/forgot', element: <ForgotPasswordScreen /> },
      { path: '/auth/register', element: <RegisterScreen /> },
      { path: '/admin/login', element: <AdminLoginScreen /> },
    ],
  },
  // Onboarding steps require an authenticated (but maybe incomplete) account:
  {
    element: (
      <RequireAuth>
        <AuthLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/auth/role', element: <RoleSelectScreen /> },
      { path: '/auth/permissions', element: <PermissionsScreen /> },
      { path: '/auth/profile-setup', element: <ProfileSetupScreen /> },
      { path: '/auth/change-password', element: <ChangePasswordScreen /> },
    ],
  },
  {
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [{ path: '/app/home', element: <HomeScreen /> }],
  },
  { path: '*', element: <AuthLayout />, children: [{ path: '*', element: <NotFound /> }] },
];

export const router = createBrowserRouter(routes);
