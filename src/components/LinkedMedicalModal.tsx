import React, { useEffect, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Field, Modal, Section, StatusSegment } from './ui/Modal';
import { Alert } from './ui/primitives';

export interface LinkedMedical {
  id: string;
  name: string;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  phone: string | null;
  email: string | null;
  map_link: string | null;
  start_time: string | null;
  end_time: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

interface LinkedMedicalModalProps {
  isOpen: boolean;
  onClose: () => void;
  medical: LinkedMedical | null;
  onSave: () => void;
}

export default function LinkedMedicalModal({ isOpen, onClose, medical, onSave }: LinkedMedicalModalProps) {
  const [name, setName] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [mapLink, setMapLink] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (medical) {
      setName(medical.name || '');
      setAddressLine1(medical.address_line_1 || '');
      setAddressLine2(medical.address_line_2 || '');
      setCity(medical.city || '');
      setState(medical.state || '');
      setPincode(medical.pincode || '');
      setPhone(medical.phone || '');
      setEmail(medical.email || '');
      setMapLink(medical.map_link || '');
      setStartTime(medical.start_time || '');
      setEndTime(medical.end_time || '');
      setStatus(medical.status || 'ACTIVE');
    } else {
      setName('');
      setAddressLine1('');
      setAddressLine2('');
      setCity('');
      setState('');
      setPincode('');
      setPhone('');
      setEmail('');
      setMapLink('');
      setStartTime('');
      setEndTime('');
      setStatus('ACTIVE');
    }
    setError('');
  }, [medical, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = medical ? `linked-medicals/${medical.id}` : `linked-medicals`;
      const method = medical ? 'PUT' : 'POST';

      await api({
        method,
        url,
        data: {
          name,
          address_line_1: addressLine1,
          address_line_2: addressLine2,
          city,
          state,
          pincode,
          phone,
          email,
          map_link: mapLink,
          start_time: startTime,
          end_time: endTime,
          status,
        },
      });

      onSave();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save medical details.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      variant="drawer"
      title={medical ? 'Edit linked medical' : 'New linked medical'}
      description="Manage pharmacy/medical details for prescriptions."
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="ui-modal-form"
      >
        <div className="ui-modal-body">
          {error && <Alert>{error}</Alert>}

          <Section title="Medical details">
            <Field label="Pharmacy / Medical name" required>
              <input
                className="ui-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Apollo Pharmacy"
              />
            </Field>
          </Section>

          <Section title="Address">
            <Field label="Address Line 1">
              <input
                className="ui-input"
                type="text"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
                placeholder="Building, Street, etc."
              />
            </Field>

            <Field label="Address Line 2">
              <input
                className="ui-input"
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="Locality, Area (Optional)"
              />
            </Field>

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <Field label="City">
                  <input
                    className="ui-input"
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                  />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="State">
                  <input
                    className="ui-input"
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="State"
                  />
                </Field>
              </div>
            </div>

            <Field label="Pincode">
              <input
                className="ui-input"
                type="text"
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                placeholder="Pincode / ZIP"
              />
            </Field>

            <Field label="Google Maps link">
              <input
                className="ui-input"
                type="url"
                value={mapLink}
                onChange={(e) => setMapLink(e.target.value)}
                placeholder="https://maps.google.com/..."
              />
            </Field>
          </Section>

          <Section title="Operating hours">
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <Field label="Opening time">
                  <input
                    className="ui-input"
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                  />
                </Field>
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Closing time">
                  <input
                    className="ui-input"
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                  />
                </Field>
              </div>
            </div>
          </Section>

          <Section title="Contact">
            <Field label="Phone number">
              <input
                className="ui-input"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
              />
            </Field>
            <Field label="Email address">
              <input
                className="ui-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
            {loading ? 'Saving…' : medical ? 'Save changes' : 'Create medical'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
