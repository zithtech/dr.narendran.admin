import { App } from 'antd';
import { Copy, Mail, Send, ShieldAlert, Sparkles } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Field, Modal, Section, StatusSegment } from './ui/Modal';
import { Alert } from './ui/primitives';

export interface ClientPortalUser {
  id: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
  portal_token?: string;
  login_url?: string;
  created_at: string;
}

interface ClientPortalModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: ClientPortalUser | null;
  onSave: () => void;
}

export default function ClientPortalModal({ isOpen, onClose, user, onSave }: ClientPortalModalProps) {
  const { message } = App.useApp();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [roles, setRoles] = useState<any[]>([]);

  useEffect(() => {
    // Fetch custom roles for the dropdown
    api.get('rbac/roles').then(res => {
      // Filter out system roles so we only assign external roles like Lab Admin
      const customRoles = res.data.filter((r: any) => !r.is_system_role);
      setRoles(customRoles);
      if (!user && customRoles.length > 0 && !role) {
        setRole(customRoles[0].name);
      }
    }).catch(console.error);
  }, [user, role]);

  useEffect(() => {
    if (user) {
      setEmail(user.email);
      setPassword('');
      setRole(user.role);
      setStatus(user.status);
    } else {
      setEmail('');
      setPassword('');
      setStatus('ACTIVE');
    }
    setError('');
  }, [user, isOpen]);

  const uniquePortalUrl = user?.portal_token
    ? `${window.location.origin}/client/login?portal_token=${user.portal_token}`
    : `${window.location.origin}/client/login`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(uniquePortalUrl);
    void message.success('Unique Client Portal link copied to clipboard!');
  };

  const handleResendInvite = async () => {
    if (!user) return;
    setResending(true);
    try {
      await api.post(`client-portals/${user.id}/resend-invite`);
      void message.success(`Invitation email with portal login link resent to ${user.email}`);
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to resend invite email.'));
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user && !password) {
      setError('Password is required when creating a new portal user.');
      return;
    }
    if (!role) {
      setError('Please select a valid role for this portal user.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = user ? `client-portals/${user.id}` : `client-portals`;
      const method = user ? 'PUT' : 'POST';

      await api({
        method,
        url,
        data: {
          username: email,
          password: password || undefined,
          role,
          status,
        },
      });

      if (!user) {
        void message.success(`Client portal account created! Unique link sent to ${email}`);
      } else {
        void message.success('Client portal account updated successfully.');
      }

      onSave();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save portal credential.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      variant="drawer"
      title={user ? 'Edit Client Portal Account' : 'Create Client Portal Account'}
      description="Create login credentials for external users like Lab Technicians. A unique client portal link will be generated and sent via email."
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="ui-modal-form" autoComplete="off">
        <div className="ui-modal-body">
          {error && <Alert>{error}</Alert>}
          {roles.length === 0 && !loading && (
            <div className="mb-4 p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded text-sm flex items-start gap-2">
              <ShieldAlert className="w-5 h-5 flex-shrink-0" />
              <div>
                <strong>No custom roles found.</strong>
                <p className="mt-1 opacity-90">Please go to Roles & Permissions and create a custom role (like "Lab Admin") first.</p>
              </div>
            </div>
          )}

          {/* Unique Link preview for existing user */}
          {user && (
            <div className="mb-4 p-3.5 bg-sky-50/70 border border-sky-200 rounded-lg">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-sky-600" />
                  Unique Client Portal Login Link
                </span>
                <button
                  type="button"
                  onClick={handleResendInvite}
                  disabled={resending}
                  className="inline-flex items-center gap-1 text-xs font-medium text-sky-700 hover:text-sky-900 underline"
                >
                  <Send size={12} />
                  <span>{resending ? 'Sending…' : 'Resend Email'}</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={uniquePortalUrl}
                  className="w-full text-xs font-mono bg-white border border-sky-200 rounded px-2.5 py-1.5 text-gray-700 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  title="Copy link"
                  className="px-2.5 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded transition-colors whitespace-nowrap flex items-center gap-1"
                >
                  <Copy size={13} />
                  <span>Copy</span>
                </button>
              </div>
              <p className="text-[11px] text-sky-700 mt-1.5 m-0">
                This unique link allows the client to access only their designated Client Portal.
              </p>
            </div>
          )}

          <Section title="Client Credentials">
            <Field label="Email Address" required>
              <input
                className="ui-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="tech@examplelab.com"
                autoComplete="off"
              />
            </Field>
            <Field
              label="Password"
              required={!user}
              {...(user ? { hint: 'Leave blank to keep the current password.' } : {})}
            >
              <input
                className="ui-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!user}
                placeholder={user ? '••••••••' : 'Create an initial password'}
                autoComplete="new-password"
              />
            </Field>

            {!user && (
              <div className="mt-2 p-2.5 bg-blue-50/70 border border-blue-200/60 rounded text-xs text-blue-800 flex items-start gap-2">
                <Mail size={15} className="flex-shrink-0 text-blue-600 mt-0.5" />
                <span>
                  Upon creation, the system will automatically generate a unique Client Portal link and email it to this address with their credentials.
                </span>
              </div>
            )}
          </Section>

          <Section title="Portal Permissions">
            <div className="ui-grid-2">
              <Field label="Assigned Role" required>
                <select
                  className="ui-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  disabled={roles.length === 0}
                >
                  {roles.map(r => (
                    <option key={r.name} value={r.name}>{r.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Status">
                <StatusSegment value={status} onChange={setStatus} />
              </Field>
            </div>
          </Section>
        </div>

        <div className="ui-modal-foot">
          <button type="button" onClick={onClose} className="ui-btn">
            Cancel
          </button>
          <button type="submit" disabled={loading || roles.length === 0} className="ui-btn ui-btn-primary">
            {loading ? 'Saving…' : user ? 'Save changes' : 'Create & Send Invite'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
