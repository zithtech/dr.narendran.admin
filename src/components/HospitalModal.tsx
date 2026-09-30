import React, { useEffect, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Field, Modal, Section, StatusSegment } from './ui/Modal';
import { Alert } from './ui/primitives';

export interface Hospital {
  id: string;
  name: string;
  hospital_code: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at?: string;
}

interface HospitalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  hospital: Hospital | null;
}

export default function HospitalModal({ isOpen, onClose, onSave, hospital }: HospitalModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (hospital) {
        setName(hospital.name);
        setAddress(hospital.address || '');
        setPhone(hospital.phone || '');
        setEmail(hospital.email || '');
        setStatus(hospital.status);
      } else {
        setName('');
        setAddress('');
        setPhone('');
        setEmail('');
        setStatus('ACTIVE');
      }
      setError('');
    }
  }, [isOpen, hospital]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const url = hospital ? `hospitals/${hospital.id}` : 'hospitals';
    const method = hospital ? 'PUT' : 'POST';

    try {
      await api({ method, url, data: { name, address, phone, email, status } });

      onSave();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save hospital.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      variant="drawer"
      title={hospital ? 'Edit hospital' : 'New hospital'}
      description={
        hospital ? `Code ${hospital.hospital_code}` : 'A hospital code is generated when you save.'
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

          <Section title="Profile">
            <Field label="Hospital name" required>
              <input
                className="ui-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Apollo Hospitals"
              />
            </Field>
            <div className="ui-grid-2">
              <Field label="Email">
                <input
                  className="ui-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Optional"
                />
              </Field>
              <Field label="Phone">
                <input
                  className="ui-input"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Optional"
                />
              </Field>
            </div>
            <Field label="Address">
              <textarea
                className="ui-textarea"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, city, postcode"
              />
            </Field>
          </Section>

          <Section title="Visibility">
            <Field
              label="Status"
              hint="Inactive hospitals are hidden from the patient and doctor apps."
            >
              <StatusSegment value={status} onChange={setStatus} />
            </Field>
          </Section>
        </div>

        <div className="ui-modal-foot">
          <button type="button" onClick={onClose} className="ui-btn">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="ui-btn ui-btn-primary">
            {loading ? 'Saving…' : hospital ? 'Save changes' : 'Create hospital'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
