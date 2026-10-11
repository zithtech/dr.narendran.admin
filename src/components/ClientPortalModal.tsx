import { App } from 'antd';
import React, { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Field, Modal, Section, StatusSegment } from './ui/Modal';
import { Alert } from './ui/primitives';

export interface ClientPortalUser {
  id: string;
  email: string;
  role: string;
  status: 'ACTIVE' | 'INACTIVE';
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
          username: email, // Backend uses username field for email
          password: password || undefined,
          role,
          status,
        },
      });

      // Show the mock email toast
      if (!user) {
        void message.success(`Portal invite link sent to ${email}`);
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
      title={user ? 'Edit Portal Access' : 'Create Portal Access'}
      description="Create login credentials for external users like Lab Technicians. They will receive an email invite to access their portal."
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

          <Section title="User Credentials">
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
