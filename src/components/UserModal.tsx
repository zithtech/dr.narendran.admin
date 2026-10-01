import React, { useEffect, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Field, Modal, Section, StatusSegment } from './ui/Modal';
import { Alert } from './ui/primitives';

export interface UserAccount {
  id: string;
  username: string;
  role: 'ADMIN' | 'DOCTOR' | 'PATIENT';
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userAccount: UserAccount | null;
  onSave: () => void;
}

export default function UserModal({ isOpen, onClose, userAccount, onSave }: UserModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'DOCTOR' | 'PATIENT'>('PATIENT');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (userAccount) {
      setUsername(userAccount.username);
      setPassword(''); // Don't populate password on edit
      setRole(userAccount.role);
      setStatus(userAccount.status);
    } else {
      setUsername('');
      setPassword('');
      setRole('PATIENT');
      setStatus('ACTIVE');
    }
    setError('');
  }, [userAccount, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAccount && !password) {
      setError('Password is required when creating a new user.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const url = userAccount ? `user-accounts/${userAccount.id}` : `user-accounts`;

      const method = userAccount ? 'PUT' : 'POST';

      await api({
        method,
        url,
        data: {
          username,
          password: password || null,
          role,
          status,
        },
      });

      onSave();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save user account.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      variant="drawer"
      title={userAccount ? 'Edit user account' : 'New user account'}
      description="Credentials used to sign in to the doctor, patient or admin apps."
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="ui-modal-form"
        autoComplete="off"
      >
        <div className="ui-modal-body">
          {error && <Alert>{error}</Alert>}

          <Section title="Credentials">
            <Field label="Username" required>
              <input
                className="ui-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="e.g. drsmith_23"
                autoComplete="off"
              />
            </Field>
            <Field
              label="Password"
              required={!userAccount}
              {...(userAccount ? { hint: 'Leave blank to keep the current password.' } : {})}
            >
              <input
                className="ui-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required={!userAccount}
                placeholder={userAccount ? '••••••••' : 'Enter a strong password'}
                autoComplete="new-password"
              />
            </Field>
          </Section>

          <Section title="Access">
            <div className="ui-grid-2">
              <Field label="Role">
                <select
                  className="ui-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'ADMIN' | 'DOCTOR' | 'PATIENT')}
                  required
                >
                  <option value="PATIENT">Patient</option>
                  <option value="DOCTOR">Doctor</option>
                  <option value="ADMIN">Admin</option>
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
          <button type="submit" disabled={loading} className="ui-btn ui-btn-primary">
            {loading ? 'Saving…' : userAccount ? 'Save changes' : 'Create account'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
