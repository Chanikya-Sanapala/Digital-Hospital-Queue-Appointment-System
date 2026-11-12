import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layouts
import { AuthLayout } from './layouts/AuthLayout';
import { CustomerLayout } from './layouts/CustomerLayout';
import { AdminLayout } from './layouts/AdminLayout';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Register } from './pages/auth/Register';
import { OTPVerification } from './pages/auth/OTPVerification';
import { ForgotPassword } from './pages/auth/ForgotPassword';

// Customer Pages
import { CustomerDashboard } from './pages/customer/CustomerDashboard';
import { BookAppointment } from './pages/customer/BookAppointment';
import { MyTicket } from './pages/customer/MyTicket';
import { LiveQueue } from './pages/customer/LiveQueue';
import { AppointmentHistory } from './pages/customer/AppointmentHistory';
import { Profile } from './pages/customer/Profile';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { QueueManagement } from './pages/admin/QueueManagement';
import { OrganizationManagement } from './pages/admin/OrganizationManagement';
import { DepartmentManagement } from './pages/admin/DepartmentManagement';
import { AdminAppointments } from './pages/admin/AdminAppointments';
import { CustomerManagement } from './pages/admin/CustomerManagement';
import { AdminAnalytics } from './pages/admin/AdminAnalytics';
import { AdminSettings } from './pages/admin/AdminSettings';

const queryClient = new QueryClient();

// Route Protection Guards
const ProtectedRoute: React.FC<{ children: React.ReactNode; requiredRole?: 'customer' | 'admin' }> = ({
  children,
  requiredRole,
}) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5F7] text-xs text-gray-500">
        Loading QueueSense session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole === 'admin' && user?.role !== 'admin' && user?.role !== 'staff') {
    return <Navigate to="/customer" replace />;
  }

  return <>{children}</>;
};

// Root Redirect helper
const RootRedirect: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) return null;

  if (isAuthenticated) {
    if (user?.role === 'admin' || user?.role === 'staff') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/customer" replace />;
  }

  return <Navigate to="/login" replace />;
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />

            {/* Auth Layout & Pages */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/verify-email" element={<OTPVerification />} />
              <Route path="/verify-otp" element={<Navigate to="/verify-email" replace />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
            </Route>

            {/* Customer Layout & Pages */}
            <Route
              path="/customer"
              element={
                <ProtectedRoute>
                  <CustomerLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<CustomerDashboard />} />
              <Route path="book" element={<BookAppointment />} />
              <Route path="ticket" element={<MyTicket />} />
              <Route path="queue" element={<LiveQueue />} />
              <Route path="history" element={<AppointmentHistory />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* Admin Layout & Pages */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="queues" element={<QueueManagement />} />
              <Route path="organizations" element={<OrganizationManagement />} />
              <Route path="departments" element={<DepartmentManagement />} />
              <Route path="appointments" element={<AdminAppointments />} />
              <Route path="customers" element={<CustomerManagement />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
