import { HashRouter, Routes, Route } from 'react-router-dom';
import { PayGuardProvider } from './state/store.jsx';
import { AppLayout } from './components/layout/AppLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import InvoiceChecksPage from './pages/InvoiceChecksPage.jsx';
import PaymentApprovalsPage from './pages/PaymentApprovalsPage.jsx';
import CaseDetailPage from './pages/CaseDetailPage.jsx';
import PaymentReviewPage from './pages/PaymentReviewPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import AuditLogPage from './pages/AuditLogPage.jsx';
import GatewayPage from './pages/GatewayPage.jsx';

export default function App() {
  return (
    <PayGuardProvider>
      <HashRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/invoice-checks" element={<InvoiceChecksPage />} />
            <Route path="/payment-approvals" element={<PaymentApprovalsPage />} />
            <Route path="/cases/:caseId" element={<CaseDetailPage />} />
            <Route path="/cases/:caseId/review" element={<PaymentReviewPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/audit" element={<AuditLogPage />} />
            <Route path="/gateway" element={<GatewayPage />} />
          </Route>
        </Routes>
      </HashRouter>
    </PayGuardProvider>
  );
}
