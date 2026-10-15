import { App } from 'antd';
import {
  Copy,
  KeyRound,
  Mail,
  RefreshCw,
  Send,
  ShieldCheck,
  User,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Field, Modal, Section } from './ui/Modal';
import { Alert, Badge } from './ui/primitives';

export interface LabWithPortal {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  portal_account?: {
    id: string;
    username: string;
    email: string;
    status: string;
    must_change_password: boolean;
    last_login_at?: string | null;
    created_at: string;
  } | null;
}

interface CreateLabPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  lab: LabWithPortal | null;
  onSuccess: () => void;
}

function generateSecurePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let pwd = '';
  for (let i = 0; i < 10; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

function suggestUsername(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 20);
}

export default function CreateLabPortalModal({
  isOpen,
  onClose,
  lab,
  onSuccess,
}: CreateLabPortalModalProps) {
  const { message } = App.useApp();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sendEmail, setSendEmail] = useState(true);

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Reset password state for existing portal
  const [showResetSection, setShowResetSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const portalLoginUrl = `${window.location.origin}/client/login`;

  useEffect(() => {
    if (lab) {
      if (!lab.portal_account) {
        setUsername(suggestUsername(lab.name || 'lab'));
        setEmail(lab.email || '');
        setPassword(generateSecurePassword());
        setSendEmail(true);
      }
      setNewPassword(generateSecurePassword());
      setShowResetSection(false);
      setError('');
    }
  }, [lab, isOpen]);

  if (!lab) return null;

  const existingAccount = lab.portal_account;

  const copyToClipboard = (text: string, label: string) => {
    void navigator.clipboard.writeText(text);
    void message.success(`${label} copied to clipboard!`);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Username is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('A valid email address is required.');
      return;
    }
    if (!password.trim() || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post(`labs/${lab.id}/portal-account`, {
        username: username.trim(),
        email: email.trim(),
        password: password.trim(),
        sendEmail,
      });

      void message.success(
        sendEmail
          ? 'Client portal created and invitation email sent!'
          : 'Client portal created successfully!',
      );
      onSuccess();
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create client portal account.'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      await api.post(`labs/${lab.id}/portal-account/reset-password`, {
        newPassword,
        sendEmail: true,
      });
      void message.success('Password reset successfully and email sent!');
      setShowResetSection(false);
      onSuccess();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to reset password.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleResendInvite = async () => {
    setActionLoading(true);
    setError('');

    try {
      await api.post(`labs/${lab.id}/portal-account/resend-invite`, {});
      void message.success('Portal invitation email resent successfully!');
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to resend invitation email.'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      size="md"
      title={existingAccount ? 'Lab Client Portal Details' : 'Create Lab Client Portal'}
      description={
        existingAccount
          ? `Manage access and credentials for ${lab.name}`
          : `Set up dedicated portal credentials for ${lab.name}`
      }
    >
      {existingAccount ? (
        /* ── Existing Portal Account Information ── */
        <div className="ui-modal-form">
          <div className="ui-modal-body">
            {error && <Alert>{error}</Alert>}

            <Section title="Account Overview">
              <div
                style={{
                  border: '1px solid var(--ui-border)',
                  borderRadius: '10px',
                  background: 'var(--ui-surface-2)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={18} style={{ color: 'var(--ui-primary)' }} />
                    <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--ui-text)' }}>
                      Portal Account Active
                    </span>
                  </div>
                  <Badge tone="green">{existingAccount.status}</Badge>
                </div>

                <div className="ui-grid-2" style={{ gap: '14px', fontSize: '12.5px' }}>
                  <div>
                    <span style={{ color: 'var(--ui-muted)', display: 'block', fontSize: '11.5px', marginBottom: '2px' }}>
                      Portal Username
                    </span>
                    <span
                      style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontWeight: 600,
                        color: 'var(--ui-text)',
                      }}
                    >
                      {existingAccount.username}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ui-muted)', display: 'block', fontSize: '11.5px', marginBottom: '2px' }}>
                      Registered Email
                    </span>
                    <span style={{ color: 'var(--ui-text)', fontWeight: 500 }}>
                      {existingAccount.email}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ui-muted)', display: 'block', fontSize: '11.5px', marginBottom: '2px' }}>
                      Created Date
                    </span>
                    <span style={{ color: 'var(--ui-text-2)' }}>
                      {new Date(existingAccount.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--ui-muted)', display: 'block', fontSize: '11.5px', marginBottom: '2px' }}>
                      Password Status
                    </span>
                    <Badge tone={existingAccount.must_change_password ? 'amber' : 'green'}>
                      {existingAccount.must_change_password ? 'Change Required' : 'Active'}
                    </Badge>
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Portal Access">
              <Field
                label="Dedicated portal login URL"
                hint="Share this link with laboratory staff to sign in."
              >
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={portalLoginUrl}
                    className="ui-input"
                    style={{
                      flex: 1,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '12.5px',
                      background: 'var(--ui-surface-2)',
                      color: 'var(--ui-text-2)',
                    }}
                  />
                  <button
                    type="button"
                    className="ui-btn"
                    onClick={() => copyToClipboard(portalLoginUrl, 'Portal Login URL')}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                  >
                    <Copy size={13} />
                    <span>Copy link</span>
                  </button>
                </div>
              </Field>

              {showResetSection && (
                <div
                  style={{
                    border: '1px solid var(--ui-border)',
                    borderRadius: '10px',
                    padding: '14px',
                    background: 'var(--ui-surface-2)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ui-text)' }}>
                      Generate & Send New Password
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--ui-muted)', marginTop: '2px' }}>
                      A new temporary password will be generated and emailed to {existingAccount.email}.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div className="ui-input-icon" style={{ flex: 1 }}>
                      <KeyRound size={15} />
                      <input
                        type="text"
                        className="ui-input"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        style={{
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                          fontWeight: 600,
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className="ui-btn"
                      onClick={() => setNewPassword(generateSecurePassword())}
                      title="Regenerate"
                    >
                      <RefreshCw size={13} />
                    </button>
                    <button
                      type="button"
                      className="ui-btn"
                      onClick={() => copyToClipboard(newPassword, 'Password')}
                      title="Copy"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                    <button
                      type="button"
                      className="ui-btn ui-btn-sm"
                      onClick={() => setShowResetSection(false)}
                      disabled={actionLoading}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="ui-btn ui-btn-sm ui-btn-primary"
                      onClick={handleResetPassword}
                      disabled={actionLoading}
                    >
                      {actionLoading ? 'Updating…' : 'Confirm & Send Email'}
                    </button>
                  </div>
                </div>
              )}
            </Section>
          </div>

          <div className="ui-modal-foot" style={{ justifyContent: 'space-between' }}>
            <div>
              <button
                type="button"
                className="ui-btn"
                onClick={handleResendInvite}
                disabled={actionLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Send size={13} />
                <span>{actionLoading ? 'Sending…' : 'Resend Login Link'}</span>
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {!showResetSection && (
                <button
                  type="button"
                  className="ui-btn"
                  onClick={() => setShowResetSection(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <KeyRound size={13} />
                  <span>Reset Password</span>
                </button>
              )}
              <button type="button" onClick={onClose} className="ui-btn ui-btn-primary">
                Done
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Create New Portal Account Form ── */
        <form onSubmit={handleCreate} className="ui-modal-form" autoComplete="off">
          <div className="ui-modal-body">
            {error && <Alert>{error}</Alert>}

            <Section title="Account Credentials">
              <Field
                label="Portal username"
                required
                hint="The laboratory will use this username to sign into their portal."
              >
                <div className="ui-input-icon">
                  <User size={15} />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. city_center_lab"
                    className="ui-input"
                    autoComplete="off"
                  />
                </div>
              </Field>

              <Field
                label="Registered email"
                required
                hint="Login credentials and portal updates will be sent to this email."
              >
                <div className="ui-input-icon">
                  <Mail size={15} />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="lab@example.com"
                    className="ui-input"
                    autoComplete="off"
                  />
                </div>
              </Field>

              <Field
                label="Auto-generated password"
                required
                hint="User will be prompted to change this password on their first login."
              >
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div className="ui-input-icon" style={{ flex: 1 }}>
                    <KeyRound size={15} />
                    <input
                      type="text"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="ui-input"
                      style={{
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setPassword(generateSecurePassword())}
                    className="ui-btn"
                    title="Generate another password"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                  >
                    <RefreshCw size={13} />
                    <span>Regenerate</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(password, 'Password')}
                    className="ui-btn"
                    title="Copy password"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                  >
                    <Copy size={13} />
                    <span>Copy</span>
                  </button>
                </div>
              </Field>
            </Section>

            <Section title="Access & Notification">
              <Field
                label="Dedicated portal login URL"
                hint="Share this URL with the laboratory staff."
              >
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={portalLoginUrl}
                    className="ui-input"
                    style={{
                      flex: 1,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '12.5px',
                      background: 'var(--ui-surface-2)',
                      color: 'var(--ui-text-2)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(portalLoginUrl, 'Portal Login URL')}
                    className="ui-btn"
                    title="Copy Link"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap' }}
                  >
                    <Copy size={13} />
                    <span>Copy link</span>
                  </button>
                </div>
              </Field>

              <label className="ui-switch-row">
                <div>
                  <strong>Send login instructions via email</strong>
                  <span>Email the portal URL and temporary credentials to {email || 'the laboratory'}</span>
                </div>
                <input
                  type="checkbox"
                  className="ui-switch"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                />
              </label>
            </Section>
          </div>

          <div className="ui-modal-foot">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="ui-btn"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="ui-btn ui-btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {loading ? (
                'Creating…'
              ) : (
                <>
                  <ShieldCheck size={14} />
                  <span>Create Portal</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
