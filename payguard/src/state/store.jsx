import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { getCaseById, DEFAULT_PASSPORT, getToolPermissionProfile } from '../data/cases.js';
import { runCheckInvoice } from '../engine/caseEngine.js';
import { markVerified, approvePayment, rejectPayment } from '../engine/payment.js';
import { buildReportDraft } from '../engine/report.js';
import { evaluateGate, DECISION } from '../policy/gate.js';
import { invokeMcpGateway } from '../security/toolSecurity.js';
import { nextAuditId, seedAuditCounter, seedDraftCounter } from '../utils/format.js';

const PayGuardContext = createContext(null);
const SESSION_KEY = 'payguard-session-v1';

function readTheme() {
  try {
    const stored = window.localStorage.getItem('payguard-theme');
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* ignore */
  }
  return 'light';
}

function readTourDismissed() {
  try {
    return window.localStorage.getItem('payguard-tour-dismissed') === 'true';
  } catch {
    return false;
  }
}

// Session data (case results, drafts, audit log, report drafts, passport) is kept in
// sessionStorage so it survives a page refresh within the same browser tab/session,
// but is still cleared when the tab closes or Reset demo is used — matching "chronological
// and append-only during the current session."
function readPersistedSession() {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function seedIdCountersFrom(persisted) {
  if (!persisted) return;
  let maxAudit = 0;
  (persisted.auditLog || []).forEach((e) => {
    const n = parseInt(String(e.id).replace('AUD-', ''), 10);
    if (!Number.isNaN(n) && n > maxAudit) maxAudit = n;
  });
  seedAuditCounter(maxAudit);

  let maxDraft = 0;
  Object.values(persisted.caseStates || {}).forEach((cs) => {
    const id = cs?.draft?.id;
    if (!id) return;
    const n = parseInt(String(id).replace('DRAFT-', ''), 10);
    if (!Number.isNaN(n) && n > maxDraft) maxDraft = n;
  });
  seedDraftCounter(maxDraft);
}

const persistedSession = readPersistedSession();
seedIdCountersFrom(persistedSession);

const emptySessionData = {
  passport: DEFAULT_PASSPORT,
  caseStates: {},
  reportDrafts: {},
  auditLog: [],
  currentCaseId: null,
};

const initialState = {
  theme: readTheme(),
  passport: persistedSession?.passport || emptySessionData.passport,
  caseStates: persistedSession?.caseStates || emptySessionData.caseStates,
  reportDrafts: persistedSession?.reportDrafts || emptySessionData.reportDrafts,
  auditLog: persistedSession?.auditLog || emptySessionData.auditLog,
  currentCaseId: persistedSession?.currentCaseId ?? emptySessionData.currentCaseId,
  tourOpen: !readTourDismissed(),
  tourDismissed: readTourDismissed(),
  toolMetadataStatus: 'checking',
};

function appendAudit(auditLog, entries, caseId, caseTitle) {
  const agentByTool = {
    'Read invoice': 'Invoice Agent', 'Look up saved supplier': 'Supplier Lookup Agent',
    'Create payment draft': 'Payment Draft Agent', 'Send payment (simulated)': 'Human Approval Agent',
    'Draft cybercrime report': 'Report Drafting Agent', 'Reviewer challenged risk finding': 'Human Reviewer',
  };
  const tagged = entries.map((e) => ({ ...e, actor: e.actor || agentByTool[e.tool] || 'Policy Gate', caseId: caseId ?? null, caseTitle: caseTitle ?? 'System' }));
  return [...auditLog, ...tagged];
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.theme };

    case 'SET_TOOL_METADATA_STATUS':
      return { ...state, toolMetadataStatus: action.status };

    case 'SET_PERMISSION_PROFILE': {
      const profile = getToolPermissionProfile(action.profileId);
      const labels = {
        read_invoice: 'Read the selected invoice',
        lookup_supplier: 'Look up the supplier named on that invoice',
        create_draft: 'Create a payment draft when details match',
        draft_report: 'Draft a report only when the user asks',
      };
      const nextPassport = {
        ...state.passport,
        profileId: profile.id,
        allowed: profile.toolPermissions.filter((tool) => tool !== 'send_payment').map((tool) => labels[tool]),
        requiresApproval: profile.toolPermissions.includes('send_payment') ? ['Send payment (simulated)'] : [],
      };
      const entry = {
        id: nextAuditId(), timestamp: new Date().toISOString(), tool: 'Permission profile changed',
        input: profile.id, decision: DECISION.ALLOW, reason: 'User selected a named tool permission profile.',
        ran: true, outcome: `Active profile set to ${profile.label}.`, actor: 'Human Reviewer',
      };
      return { ...state, passport: nextPassport, auditLog: appendAudit(state.auditLog, [entry], null, 'System') };
    }

    case 'SELECT_CASE':
      return { ...state, currentCaseId: action.caseId };

    case 'RUN_CHECK': {
      const fixture = getCaseById(action.caseId);
      if (!fixture) return state;
      const result = runCheckInvoice(fixture, state.passport, state.toolMetadataStatus === 'verified');
      const auditLog = appendAudit(state.auditLog, result.toolActivity, fixture.id, fixture.title);
      const reportDrafts = { ...state.reportDrafts };
      delete reportDrafts[action.caseId];
      return {
        ...state,
        caseStates: { ...state.caseStates, [action.caseId]: result },
        auditLog,
        reportDrafts,
      };
    }

    case 'MARK_VERIFIED': {
      const cs = state.caseStates[action.caseId];
      if (!cs || !cs.draft) return state;
      const { draft, entry } = markVerified(cs.draft);
      const fixture = getCaseById(action.caseId);
      return {
        ...state,
        caseStates: { ...state.caseStates, [action.caseId]: { ...cs, draft } },
        auditLog: entry ? appendAudit(state.auditLog, [entry], action.caseId, fixture?.title) : state.auditLog,
      };
    }

    case 'APPROVE_PAYMENT': {
      const cs = state.caseStates[action.caseId];
      if (!cs || !cs.draft) return state;
      const activeProfile = getToolPermissionProfile(state.passport.profileId);
      const profileAllows = state.passport.profileId === 'custom'
        ? state.passport.requiresApproval.includes('Send payment (simulated)')
        : activeProfile.toolPermissions.includes('send_payment');
      const { draft, entry } = approvePayment(cs.draft, action.reviewedSnapshot, { metadataVerified: state.toolMetadataStatus === 'verified', profileAllows });
      const fixture = getCaseById(action.caseId);
      return {
        ...state,
        caseStates: { ...state.caseStates, [action.caseId]: { ...cs, draft } },
        auditLog: entry ? appendAudit(state.auditLog, [entry], action.caseId, fixture?.title) : state.auditLog,
      };
    }

    case 'REJECT_PAYMENT': {
      const cs = state.caseStates[action.caseId];
      if (!cs || !cs.draft) return state;
      const { draft, entry } = rejectPayment(cs.draft, action.reason);
      const fixture = getCaseById(action.caseId);
      return {
        ...state,
        caseStates: { ...state.caseStates, [action.caseId]: { ...cs, draft } },
        auditLog: entry ? appendAudit(state.auditLog, [entry], action.caseId, fixture?.title) : state.auditLog,
      };
    }

    case 'EDIT_PASSPORT': {
      const gateResult = evaluateGate('edit_passport', { explicitUserEdit: true });
      const entry = {
        id: nextAuditId(),
        timestamp: new Date().toISOString(),
        tool: 'Edit Permission Passport',
        input: 'Current user',
        decision: gateResult.decision,
        reason: gateResult.reason,
        ran: gateResult.decision === DECISION.ALLOW,
        outcome: 'Permission Passport updated by explicit user action.',
      };
      return {
        ...state,
        passport: { ...state.passport, ...action.passport, profileId: 'custom' },
        auditLog: appendAudit(state.auditLog, [entry], null, 'System'),
      };
    }

    case 'GENERATE_REPORT': {
      const cs = state.caseStates[action.caseId];
      if (!cs) return state;
      const activeProfile = getToolPermissionProfile(state.passport.profileId);
      const profileAllows = state.passport.profileId === 'custom'
        ? state.passport.allowed.includes('Draft a report only when the user asks')
        : activeProfile.toolPermissions.includes('draft_report');
      const gateResult = invokeMcpGateway('draft_report', { explicitUserAction: action.explicitUserAction === true, profileAllows }, { metadataVerified: state.toolMetadataStatus === 'verified' });
      const traceId = cs.draft?.traceId || `TRACE-${action.caseId}-REPORT-${Date.now()}`;
      const fixture = getCaseById(action.caseId);
      if (gateResult.decision !== DECISION.ALLOW) {
        const deniedEntry = {
          id: nextAuditId(),
          timestamp: new Date().toISOString(),
          tool: 'Draft cybercrime report',
          input: action.caseId,
          decision: gateResult.decision,
          reason: gateResult.reason,
          ran: false,
          outcome: 'No report draft was generated.',
          actor: 'Report Drafting Agent', traceId,
        };
        return {
          ...state,
          auditLog: appendAudit(state.auditLog, [deniedEntry], action.caseId, fixture?.title),
        };
      }
      const reportDraft = buildReportDraft({
        caseResult: cs,
        recipientType: action.recipientType,
        recipientName: action.recipientName,
        form: action.form,
      });
      const entry = {
        id: nextAuditId(),
        timestamp: new Date().toISOString(),
        tool: 'Draft cybercrime report',
        input: action.caseId,
        decision: gateResult.decision,
        reason: gateResult.reason,
        ran: true,
        outcome: 'Editable report draft generated. Not submitted, emailed, or uploaded.',
        actor: 'Report Drafting Agent', traceId,
      };
      return {
        ...state,
        reportDrafts: { ...state.reportDrafts, [action.caseId]: reportDraft },
        auditLog: appendAudit(state.auditLog, [entry], action.caseId, fixture?.title),
      };
    }

    case 'REPORT_EDITED':
    case 'REPORT_COPIED':
    case 'REPORT_DOWNLOADED': {
      const fixture = getCaseById(action.caseId);
      const labels = {
        REPORT_EDITED: ['Report draft edited', 'Current user edited the report draft. Report contents were not added to the audit log.'],
        REPORT_COPIED: ['Report draft copied', 'Current user copied the report draft. No report was submitted.'],
        REPORT_DOWNLOADED: ['Report PDF downloaded', 'Current user downloaded a draft PDF. No report was submitted.'],
      };
      const [tool, outcome] = labels[action.type];
      const entry = {
        id: nextAuditId(),
        timestamp: new Date().toISOString(),
        tool,
        input: action.caseId,
        decision: DECISION.ALLOW,
        reason: 'This report action affects only the local editable demo draft.',
        ran: true,
        outcome,
      };
      return {
        ...state,
        auditLog: appendAudit(state.auditLog, [entry], action.caseId, fixture?.title),
      };
    }

    case 'UPDATE_REPORT_TEXT': {
      const existing = state.reportDrafts[action.caseId];
      if (!existing) return state;
      return {
        ...state,
        reportDrafts: { ...state.reportDrafts, [action.caseId]: { ...existing, text: action.text } },
      };
    }

    case 'CLEAR_REPORT': {
      const reportDrafts = { ...state.reportDrafts };
      const existing = reportDrafts[action.caseId];
      delete reportDrafts[action.caseId];
      if (!existing) return { ...state, reportDrafts };
      const fixture = getCaseById(action.caseId);
      const entry = {
        id: nextAuditId(),
        timestamp: new Date().toISOString(),
        tool: 'Report draft cleared',
        input: action.caseId,
        decision: DECISION.ALLOW,
        reason: 'The user cleared a local report draft. Report contents were not added to the audit log.',
        ran: true,
        outcome: 'Report draft removed from the current session.',
      };
      return {
        ...state,
        reportDrafts,
        auditLog: appendAudit(state.auditLog, [entry], action.caseId, fixture?.title),
      };
    }

    case 'CHALLENGE_FINDING': {
      const fixture = getCaseById(action.caseId);
      if (!fixture || !action.reason?.trim()) return state;
      const entry = {
        id: nextAuditId(),
        timestamp: new Date().toISOString(),
        tool: 'Reviewer challenged risk finding',
        input: action.caseId,
        decision: DECISION.ALLOW,
        reason: 'The reviewer requested a human re-check of this automated finding.',
        ran: true,
        outcome: `Challenge recorded: ${action.reason.trim()}`,
      };
      return { ...state, auditLog: appendAudit(state.auditLog, [entry], action.caseId, fixture.title) };
    }

    case 'SET_TOUR_OPEN':
      return { ...state, tourOpen: action.open };

    case 'DISMISS_TOUR':
      return { ...state, tourOpen: false, tourDismissed: true };

    case 'RESET_DEMO':
      return {
        ...state,
        ...emptySessionData,
      };

    default:
      return state;
  }
}

export function PayGuardProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    try {
      window.localStorage.setItem('payguard-theme', state.theme);
    } catch {
      /* ignore */
    }
    document.documentElement.setAttribute('data-theme', state.theme);
  }, [state.theme]);

  useEffect(() => {
    if (state.tourDismissed) {
      try {
        window.localStorage.setItem('payguard-tour-dismissed', 'true');
      } catch {
        /* ignore */
      }
    }
  }, [state.tourDismissed]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          passport: state.passport,
          caseStates: state.caseStates,
          reportDrafts: state.reportDrafts,
          auditLog: state.auditLog,
          currentCaseId: state.currentCaseId,
        })
      );
    } catch {
      /* ignore (private browsing, storage full, etc.) */
    }
  }, [state.passport, state.caseStates, state.reportDrafts, state.auditLog, state.currentCaseId]);

  const value = useMemo(() => ({ state, dispatch }), [state]);

  return <PayGuardContext.Provider value={value}>{children}</PayGuardContext.Provider>;
}

export function usePayGuard() {
  const ctx = useContext(PayGuardContext);
  if (!ctx) throw new Error('usePayGuard must be used within PayGuardProvider');
  return ctx;
}
