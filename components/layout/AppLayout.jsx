import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';
import { GuidedTour } from '../tour/GuidedTour.jsx';
import { ConfirmDialog } from '../common/ConfirmDialog.jsx';
import { PayGuardAssistant } from '../common/PayGuardAssistant.jsx';
import { usePayGuard } from '../../state/store.jsx';
import { verifyToolManifest } from '../../security/toolSecurity.js';

export function AppLayout() {
  const { state, dispatch } = usePayGuard();
  const [confirmingReset, setConfirmingReset] = useState(false);

  useEffect(() => {
    let active = true;
    verifyToolManifest().then((verified) => {
      if (active) dispatch({ type: 'SET_TOOL_METADATA_STATUS', status: verified ? 'verified' : 'failed' });
    });
    return () => { active = false; };
  }, [dispatch]);

  function confirmResetDemo() {
    dispatch({ type: 'RESET_DEMO' });
    setConfirmingReset(false);
  }

  return (
    <div className="app-shell">
      <Sidebar onResetDemo={() => setConfirmingReset(true)} />
      <div>
        <Topbar onReplayTour={() => dispatch({ type: 'SET_TOUR_OPEN', open: true })} />
        <main className="main-content">
          <Outlet />
        </main>
      </div>
      <PayGuardAssistant />
      {state.tourOpen && (
        <GuidedTour
          onClose={() => {
            dispatch({ type: 'DISMISS_TOUR' });
          }}
        />
      )}
      {confirmingReset && (
        <ConfirmDialog
          title="Reset the demo?"
          message="This clears every case result, draft, approval, report draft, and the audit log, and returns to the initial state. This cannot be undone."
          confirmLabel="Reset demo"
          onConfirm={confirmResetDemo}
          onCancel={() => setConfirmingReset(false)}
        />
      )}
    </div>
  );
}
