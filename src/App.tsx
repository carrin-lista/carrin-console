import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from './components/AuthGuard';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Users } from './pages/Users';
import { UserProfile } from './pages/UserProfile';
import { Homes } from './pages/Homes';
import { HomeProfile } from './pages/HomeProfile';
import { Purchases } from './pages/Purchases';
import { PurchaseDetail } from './pages/PurchaseDetail';
import { Support } from './pages/Support';
import { SupportDetail } from './pages/SupportDetail';
import { Admins } from './pages/Admins';
import { Notifications } from './pages/Notifications';
import { Audit } from './pages/Audit'; 
import { Analytics } from './pages/Analytics';
import { Settings as SettingsPage } from './pages/Settings'; 
import { Integrations } from './pages/Integrations'; 
import Subscriptions from './pages/Subscriptions';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<AuthGuard />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/usuarios" element={<Users />} />
            <Route path="/usuarios/:id" element={<UserProfile />} />
            <Route path="/casas" element={<Homes />} />
            <Route path="/casas/:id" element={<HomeProfile />} />
            <Route path="/compras" element={<Purchases />} />
            <Route path="/compras/:id" element={<PurchaseDetail />} />
            <Route path="/suporte" element={<Support />} />
            <Route path="/suporte/:id" element={<SupportDetail />} />
            <Route path="/admins" element={<Admins />} />
            <Route path="/notificacoes" element={<Notifications />} />
            
            {/* Telas da Fase 2 */}
            <Route path="/auditoria" element={<Audit />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
            <Route path="/integracoes" element={<Integrations />} />
            <Route path="/assinaturas" element={<Subscriptions />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}