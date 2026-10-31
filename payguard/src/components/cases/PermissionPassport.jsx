import { useEffect, useState } from 'react';
import { usePayGuard } from '../../state/store.jsx';
import { TOOL_PERMISSION_PROFILES } from '../../data/cases.js';

function diffList(before, after) {
  const added = after.filter((x) => !before.includes(x));
  const removed = before.filter((x) => !after.includes(x));
  return { added, removed };
}

export function PermissionPassport({ compact = false }) {
  const { state, dispatch } = usePayGuard();
  const { passport } = state;
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [draftFields, setDraftFields] = useState(null);
  const [profileChoice, setProfileChoice] = useState(passport.profileId || 'invoice-reviewer');

  useEffect(() => setProfileChoice(passport.profileId || 'invoice-reviewer'), [passport.profileId]);

  function startEdit() {
    setDraftFields({
      task: passport.task,
      allowed: passport.allowed.join('\n'),
      requiresApproval: passport.requiresApproval.join('\n'),
      neverAllowed: passport.neverAllowed.join('\n'),
    });
    setEditing(true);
    setConfirming(false);
  }

  function toReview() {
    setConfirming(true);
  }

  function apply() {
    const next = {
      task: draftFields.task,
      allowed: draftFields.allowed.split('\n').map((s) => s.trim()).filter(Boolean),
      requiresApproval: draftFields.requiresApproval.split('\n').map((s) => s.trim()).filter(Boolean),
      neverAllowed: draftFields.neverAllowed.split('\n').map((s) => s.trim()).filter(Boolean),
    };
    dispatch({ type: 'EDIT_PASSPORT', passport: next });
    setEditing(false);
    setConfirming(false);
    setDraftFields(null);
  }

  function cancel() {
    setEditing(false);
    setConfirming(false);
    setDraftFields(null);
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Permission Passport</h3>
        {!compact && (
          <button className="btn btn-ghost" onClick={startEdit}>
            Edit
          </button>
        )}
      </div>
      <p className="muted">Task: {passport.task}</p>

      <div className="profile-picker">
        <label htmlFor="permission-profile">Active tool profile</label>
        <div className="profile-picker-row">
          <select id="permission-profile" value={profileChoice} onChange={(event) => setProfileChoice(event.target.value)}>
            {TOOL_PERMISSION_PROFILES.map((profile) => <option key={profile.id} value={profile.id}>{profile.label}</option>)}
            {passport.profileId === 'custom' && <option value="custom">Custom edited profile</option>}
          </select>
          <button className="btn" disabled={profileChoice === passport.profileId || profileChoice === 'custom'} onClick={() => dispatch({ type: 'SET_PERMISSION_PROFILE', profileId: profileChoice })}>Apply profile</button>
        </div>
        <p className="muted">{TOOL_PERMISSION_PROFILES.find((profile) => profile.id === profileChoice)?.description || 'Uses the manually edited Permission Passport below.'}</p>
      </div>

      <div className="passport-group allowed">
        <h4>Allowed</h4>
        <ul>
          {passport.allowed.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="passport-group approval">
        <h4>Requires user approval</h4>
        <ul>
          {passport.requiresApproval.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div className="passport-group never">
        <h4>Not allowed based only on invoice content</h4>
        <ul>
          {passport.neverAllowed.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>

      {editing && !confirming && draftFields && (
        <div className="tour-backdrop" role="dialog" aria-modal="true" aria-label="Edit Permission Passport">
          <div className="tour-card" style={{ maxWidth: 480, textAlign: 'left' }}>
            <h3>Edit Permission Passport</h3>
            <label htmlFor="pp-task">Task</label>
            <input
              id="pp-task"
              type="text"
              value={draftFields.task}
              onChange={(e) => setDraftFields({ ...draftFields, task: e.target.value })}
            />
            <label htmlFor="pp-allowed">Allowed (one per line)</label>
            <textarea
              id="pp-allowed"
              rows={2}
              value={draftFields.allowed}
              onChange={(e) => setDraftFields({ ...draftFields, allowed: e.target.value })}
            />
            <label htmlFor="pp-approval">Requires user approval (one per line)</label>
            <textarea
              id="pp-approval"
              rows={2}
              value={draftFields.requiresApproval}
              onChange={(e) => setDraftFields({ ...draftFields, requiresApproval: e.target.value })}
            />
            <label htmlFor="pp-never">Not allowed based only on invoice content (one per line)</label>
            <textarea
              id="pp-never"
              rows={3}
              value={draftFields.neverAllowed}
              onChange={(e) => setDraftFields({ ...draftFields, neverAllowed: e.target.value })}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <button className="btn" onClick={cancel}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={toReview}>
                Review change
              </button>
            </div>
          </div>
        </div>
      )}

      {editing && confirming && draftFields && (
        <div className="tour-backdrop" role="dialog" aria-modal="true" aria-label="Confirm Permission Passport change">
          <div className="tour-card" style={{ maxWidth: 440, textAlign: 'left' }}>
            <h3>Confirm this change?</h3>
            <p className="muted">This will be recorded in the audit log as an explicit action by Current user.</p>
            {['allowed', 'requiresApproval', 'neverAllowed'].map((key) => {
              const before = passport[key];
              const after = draftFields[key].split('\n').map((s) => s.trim()).filter(Boolean);
              const { added, removed } = diffList(before, after);
              if (!added.length && !removed.length) return null;
              return (
                <div key={key} style={{ marginBottom: 10 }}>
                  <strong style={{ fontSize: '0.82rem' }}>{key}</strong>
                  {added.map((a) => (
                    <div key={a} style={{ color: 'var(--status-clear)', fontSize: '0.85rem' }}>
                      + {a}
                    </div>
                  ))}
                  {removed.map((r) => (
                    <div key={r} style={{ color: 'var(--status-blocked)', fontSize: '0.85rem' }}>
                      − {r}
                    </div>
                  ))}
                </div>
              );
            })}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 10 }}>
              <button className="btn" onClick={() => setConfirming(false)}>
                Back
              </button>
              <button className="btn btn-primary" onClick={apply}>
                Confirm change
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
