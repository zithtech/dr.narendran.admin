import React, { useEffect, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { type Hospital } from './HospitalModal';
import { Field, Modal, Section, StatusSegment } from './ui/Modal';
import { Alert } from './ui/primitives';

export interface Branch {
  id: string;
  hospital_id: string;
  hospital_name?: string; // from the join
  branch_code: string;
  name: string;
  address: string | null;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

interface BranchModalProps {
  isOpen: boolean;
  onClose: () => void;
  branch: Branch | null;
  onSave: () => void;
}

export default function BranchModal({ isOpen, onClose, branch, onSave }: BranchModalProps) {
  const [name, setName] = useState('');
  const [hospitalId, setHospitalId] = useState<string>('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Fetch hospitals for the dropdown
  useEffect(() => {
    if (isOpen) {
      const fetchHospitals = async () => {
        try {
          const response = await api.get('hospitals');
          setHospitals(response.data);
        } catch (err) {
          console.error('Failed to fetch hospitals for branch modal', err);
        }
      };
      fetchHospitals();
    }
  }, [isOpen]);

  useEffect(() => {
    if (branch) {
      setName(branch.name);
      setHospitalId(branch.hospital_id);
      setAddress(branch.address || '');
      setPhone(branch.phone || '');
      setStatus(branch.status);
    } else {
      setName('');
      setHospitalId('');
      setAddress('');
      setPhone('');
      setStatus('ACTIVE');
    }
    setError('');
  }, [branch, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (hospitalId === '') {
      setError('Please select a hospital.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const url = branch ? `branches/${branch.id}` : `branches`;

      const method = branch ? 'PUT' : 'POST';

      await api({
        method,
        url,
        data: {
          hospital_id: hospitalId,
          name,
          address,
          phone,
          status,
        },
      });

      onSave();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save branch.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      variant="drawer"
      title={branch ? 'Edit branch' : 'New branch'}
      description={
        branch ? `Code ${branch.branch_code}` : 'A branch code is generated when you save.'
      }
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="ui-modal-form"
      >
        <div className="ui-modal-body">
          {error && <Alert>{error}</Alert>}

          <Section title="Branch">
            <Field label="Parent hospital" required>
              <select
                className="ui-select"
                value={hospitalId}
                onChange={(e) => setHospitalId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select a hospital…
                </option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} ({h.hospital_code})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Branch name" required>
              <input
                className="ui-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Apollo South"
              />
            </Field>
          </Section>

          <Section title="Location & contact">
            <Field label="Phone number">
              <input
                className="ui-input"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
              />
            </Field>
            <Field label="Address">
              <textarea
                className="ui-textarea"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                placeholder="Optional"
              />
            </Field>
          </Section>

          <Section title="Visibility">
            <Field label="Status">
              <StatusSegment value={status} onChange={setStatus} />
            </Field>
          </Section>
        </div>

        <div className="ui-modal-foot">
          <button type="button" onClick={onClose} className="ui-btn">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="ui-btn ui-btn-primary">
            {loading ? 'Saving…' : branch ? 'Save changes' : 'Create branch'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
