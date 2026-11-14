import { App } from 'antd';
import { FileText, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { Field, Modal, Section } from '../../../components/ui/Modal';
import { Alert } from '../../../components/ui/primitives';
import { medicalRecordsApi } from '../services/medicalRecordsApi';
import type { MedicalRecord } from '../types/medicalRecords';

interface EditMedicalRecordModalProps {
  record: MedicalRecord | null;
  open: boolean;
  onClose: () => void;
  onSuccess: (updated: MedicalRecord) => void;
}

export const EditMedicalRecordModal: React.FC<EditMedicalRecordModalProps> = ({
  record,
  open,
  onClose,
  onSuccess,
}) => {
  const { message } = App.useApp();
  const [testName, setTestName] = useState('');
  const [reportDate, setReportDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (record && open) {
      setTestName(record.testName || '');
      setReportDate(
        record.reportDate
          ? record.reportDate.split('T')[0] || ''
          : new Date().toISOString().split('T')[0] || '',
      );
      setNotes(record.notes || '');
      setError(null);
    }
  }, [record, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!record) return;
    if (!testName.trim()) {
      setError('Test / Document name is required.');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const payload: { testName?: string; reportDate?: string; notes?: string } = {
        testName: testName.trim(),
        notes: notes ? notes.trim() : '',
      };
      if (reportDate) {
        payload.reportDate = reportDate;
      }

      const updated = await medicalRecordsApi.updateMedicalRecord(record.id, payload);

      void message.success('Medical record updated successfully');
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update medical record';
      setError(msg);
      void message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={saving ? () => undefined : onClose}
      variant="drawer"
      size="md"
      title={
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-blue-600" />
          <span>Edit Medical Record Metadata</span>
        </div>
      }
      description={
        record
          ? `Patient: ${record.patientName} • File: ${record.fileName}`
          : 'Update record identification, date, and doctor notes.'
      }
    >
      <form onSubmit={handleSubmit} className="ui-modal-form">
        <div className="ui-modal-body space-y-4">
          {error && <Alert>{error}</Alert>}

          <Section title="Document Information">
            <div className="space-y-3">
              <Field
                label="Test / Document Name"
                required
                hint="e.g. Complete Blood Count (CBC), Chest X-Ray, Discharge Summary"
              >
                <input
                  type="text"
                  className="ui-input"
                  placeholder="Enter record or test name..."
                  value={testName}
                  onChange={(e) => setTestName(e.target.value)}
                  maxLength={255}
                  required
                />
              </Field>

              <Field
                label="Clinical / Report Date"
                required
                hint="Date when the diagnostic test or examination was conducted"
              >
                <input
                  type="date"
                  className="ui-input"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  required
                />
              </Field>

              <Field
                label="Clinical Notes / Observations"
                hint="Doctor remarks, abnormal findings, or administrative observations"
              >
                <textarea
                  rows={3}
                  className="ui-textarea"
                  placeholder="Enter clinical notes or remarks..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </Field>
            </div>
          </Section>
        </div>

        <div className="ui-modal-foot">
          <button
            type="button"
            className="ui-btn"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Changes</span>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
