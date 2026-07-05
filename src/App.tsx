import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { initDatabase } from './db/database';
import Login from './pages/Login';
import Layout, { PageKey } from './components/Layout';
import Dashboard from './pages/Dashboard';
import InflowPage from './pages/InflowPage';
import OutflowPage from './pages/OutflowPage';
import CommissionsPage from './pages/CommissionsPage';
import CustomerStatementPage from './pages/CustomerStatementPage';
import DebtsOwedToUsPage from './pages/DebtsOwedToUsPage';
import DebtsOwedByUsPage from './pages/DebtsOwedByUsPage';
import ReportsPage from './pages/ReportsPage';
import UsersPage from './pages/UsersPage';
import AuditLogPage from './pages/AuditLogPage';
import BackupPage from './pages/BackupPage';
import SettingsPage from './pages/SettingsPage';

function AppContent() {
  const { user } = useAuth();
  const [page, setPage] = useState<PageKey>('dashboard');

  useEffect(() => {
    initDatabase();
  }, []);

  if (!user) return <Login />;

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard />;
      case 'inflow': return <InflowPage />;
      case 'outflow': return <OutflowPage />;
      case 'commissions': return <CommissionsPage />;
      case 'customer': return <CustomerStatementPage />;
      case 'debtsOwedToUs': return <DebtsOwedToUsPage />;
      case 'debtsOwedByUs': return <DebtsOwedByUsPage />;
      case 'reports': return <ReportsPage />;
      case 'users': return <UsersPage />;
      case 'audit': return <AuditLogPage />;
      case 'backup': return <BackupPage />;
      case 'settings': return <SettingsPage />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout currentPage={page} onPageChange={setPage}>
      {renderPage()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
