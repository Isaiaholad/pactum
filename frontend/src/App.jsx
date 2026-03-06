import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CreatePactPage from './pages/CreatePactPage';
import ExplorePage from './pages/ExplorePage';
import PactDetailPage from './pages/PactDetailPage';
import WalletPage from './pages/WalletPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';
import AdminPage from './pages/AdminPage';
import { usePactumStore } from './store/usePactumStore';

function Protected() {
  return (
    <Layout>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/create" element={<CreatePactPage />} />
        <Route path="/explore" element={<ExplorePage />} />
        <Route path="/pact/:id" element={<PactDetailPage />} />
        <Route path="/wallet" element={<WalletPage />} />
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  const user = usePactumStore((s) => s.user);
  const bootstrap = usePactumStore((s) => s.bootstrap);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/*" element={user ? <Protected /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}
