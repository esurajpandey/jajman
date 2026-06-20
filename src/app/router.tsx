import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AppLayout } from '../components/shell/AppLayout';
import { AppPlainLayout } from '../components/shell/AppPlainLayout';
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
import { SearchScreen } from '../screens/jajman/SearchScreen';
import { MapScreen } from '../screens/jajman/MapScreen';
import { CategoryBrowseScreen } from '../screens/jajman/CategoryBrowseScreen';
import { PujaBrowseScreen } from '../screens/jajman/PujaBrowseScreen';
import { PanditDetailScreen } from '../screens/jajman/PanditDetailScreen';
import { ReviewsScreen } from '../screens/jajman/ReviewsScreen';
import { AlternateSuggestionsScreen } from '../screens/jajman/AlternateSuggestionsScreen';
import { BookingFlow } from '../screens/jajman/booking/BookingFlow';
import { RequestSentScreen } from '../screens/jajman/booking/RequestSentScreen';
import { BookingDetailScreen } from '../screens/jajman/booking/BookingDetailScreen';
import { PaymentScreen } from '../screens/jajman/booking/PaymentScreen';
import { MultiPanditScreen } from '../screens/jajman/booking/MultiPanditScreen';
import { EmergencyEntryScreen } from '../screens/jajman/booking/EmergencyEntryScreen';

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
    children: [
      { path: '/app/home', element: <HomeScreen /> },
      { path: '/app/search', element: <SearchScreen /> },
    ],
  },
  {
    element: (
      <RequireAuth>
        <AppPlainLayout />
      </RequireAuth>
    ),
    children: [
      { path: '/app/map', element: <MapScreen /> },
      { path: '/app/category/:categoryId', element: <CategoryBrowseScreen /> },
      { path: '/app/puja/:pujaId', element: <PujaBrowseScreen /> },
      { path: '/app/pandit/:panditId', element: <PanditDetailScreen /> },
      { path: '/app/pandit/:panditId/reviews', element: <ReviewsScreen /> },
      { path: '/app/alternate', element: <AlternateSuggestionsScreen /> },
      { path: '/app/book/:panditId', element: <BookingFlow /> },
      { path: '/app/booking/:bookingId/sent', element: <RequestSentScreen /> },
      { path: '/app/booking/:bookingId', element: <BookingDetailScreen /> },
      { path: '/app/booking/:bookingId/pay/:kind', element: <PaymentScreen /> },
      { path: '/app/multi-pandit', element: <MultiPanditScreen /> },
      { path: '/app/urgent', element: <EmergencyEntryScreen /> },
    ],
  },
  { path: '*', element: <AuthLayout />, children: [{ path: '*', element: <NotFound /> }] },
];

export const router = createBrowserRouter(routes);
