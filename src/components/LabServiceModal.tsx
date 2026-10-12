import React, { useEffect, useState } from 'react';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Field, Modal, Section, StatusSegment } from './ui/Modal';
import { App } from 'antd';

export interface LabService {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

interface LabServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: LabService | null;
  onSave: () => void;
}

export default function LabServiceModal({ isOpen, onClose, service, onSave }: LabServiceModalProps) {
  const { message } = App.useApp();
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (service) {
      setName(service.name || '');
      setStatus(service.status || 'ACTIVE');
    } else {
      setName('');
      setStatus('ACTIVE');
    }
  }, [service, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = service ? `lab-services/${service.id}` : `lab-services`;
      const method = service ? 'PUT' : 'POST';

      await api({
        method,
        url,
        data: {
          name,
          status,
        },
      });

      onSave();
    } catch (err: unknown) {
      void message.error(getErrorMessage(err, 'Failed to save lab service.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      variant="dialog"
      title={service ? 'Edit service' : 'New service'}
      description="Manage the tests and services a lab can offer."
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="ui-modal-form">
        <div className="ui-modal-body">
          <Section title="Service Details">
            <Field label="Service Name" required>
              <input
                className="ui-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g. Complete Blood Count (CBC)"
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
            {loading ? 'Saving…' : service ? 'Save changes' : 'Create service'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
