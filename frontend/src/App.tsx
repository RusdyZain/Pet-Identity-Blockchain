import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterOwnerPage } from './pages/auth/RegisterOwnerPage';
import { TracePage } from './pages/public/TracePage';
import { OwnerDashboard } from './pages/owner/OwnerDashboard';
import { OwnerNewPet } from './pages/owner/OwnerNewPet';
import { OwnerPetDetail } from './pages/owner/OwnerPetDetail';
import { OwnerMedicalRecordsPage } from './pages/owner/OwnerMedicalRecordsPage';
import { OwnerCorrectionForm } from './pages/owner/OwnerCorrectionForm';
import { OwnerTransferPage } from './pages/owner/OwnerTransferPage';
import { OwnerNotificationsPage } from './pages/owner/OwnerNotificationsPage';
import { OwnerAccountPage } from './pages/owner/OwnerAccountPage';
import { ClinicDashboard } from './pages/clinic/ClinicDashboard';
import { ClinicPetDetail } from './pages/clinic/ClinicPetDetail';
import { ClinicMedicalRecordForm } from './pages/clinic/ClinicMedicalRecordForm';
import { ClinicPendingRecords } from './pages/clinic/ClinicPendingRecords';
import { ClinicCorrectionsPage } from './pages/clinic/ClinicCorrectionsPage';
import { ClinicNotificationsPage } from './pages/clinic/ClinicNotificationsPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminPetsPage } from './pages/admin/AdminPetsPage';
import BlockchainSimulatorPage from './pages/BlockchainSimulatorPage';

// App merangkum seluruh konfigurasi rute dan batasan akses.
const App = () => {
  return (
    <Routes>
      {/* Halaman publik tanpa autentikasi */}
      <Route element={<PublicLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterOwnerPage />} />
        <Route path="/trace" element={<TracePage />} />
      </Route>

      {/* Area khusus pemilik hewan */}
      <Route element={<ProtectedRoute allowedRoles={['OWNER']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/owner/dashboard" element={<OwnerDashboard />} />
          <Route path="/owner/pets/new" element={<OwnerNewPet />} />
          <Route path="/owner/pets/:id" element={<OwnerPetDetail />} />
          <Route path="/owner/pets/:id/medical-records" element={<OwnerMedicalRecordsPage />} />
          <Route path="/owner/pets/:id/corrections/new" element={<OwnerCorrectionForm />} />
          <Route path="/owner/pets/:id/transfer" element={<OwnerTransferPage />} />
          <Route path="/owner/notifications" element={<OwnerNotificationsPage />} />
          <Route path="/owner/account" element={<OwnerAccountPage />} />
        </Route>
      </Route>

      {/* Area khusus klinik dokter hewan */}
      <Route element={<ProtectedRoute allowedRoles={['CLINIC']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/clinic/dashboard" element={<ClinicDashboard />} />
          <Route path="/clinic/pets/:id" element={<ClinicPetDetail />} />
          <Route path="/clinic/pets/:id/medical-records/new" element={<ClinicMedicalRecordForm />} />
          <Route path="/clinic/medical-records/pending" element={<ClinicPendingRecords />} />
          <Route path="/clinic/corrections" element={<ClinicCorrectionsPage />} />
          <Route path="/clinic/notifications" element={<ClinicNotificationsPage />} />
        </Route>
      </Route>

      {/* Area khusus admin */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/pets" element={<AdminPetsPage />} />
        </Route>
      </Route>

      {/* Admin dan klinik bisa membuka halaman simulasi blockchain */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'CLINIC']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/admin/blockchain-simulator" element={<BlockchainSimulatorPage />} />
        </Route>
      </Route>

      {/* Default route dan fallback */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default App;
