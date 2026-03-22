import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute, AdminOnly } from './components/AdminRoute.jsx';
import AdminLayout from './layout/AdminLayout.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import AdminLogin from './pages/AdminLogin.jsx';
import AvailabilityPage from './pages/AvailabilityPage.jsx';
import ConsultationsListPage from './pages/ConsultationsListPage.jsx';
import ConsultationDetailPage from './pages/ConsultationDetailPage.jsx';
import UsersPage from './pages/UsersPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminOnly>
              <AdminLayout />
            </AdminOnly>
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="availability" element={<AvailabilityPage />} />
        <Route path="consultations" element={<ConsultationsListPage />} />
        <Route path="consultations/:id" element={<ConsultationDetailPage />} />
        <Route path="users" element={<UsersPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

