import { DatePicker, Form, Input, Modal, message } from 'antd';
import dayjs from 'dayjs';
import React, { useEffect, useState } from 'react';
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
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record && open) {
      form.setFieldsValue({
        testName: record.testName,
        reportDate: record.reportDate ? dayjs(record.reportDate) : dayjs(),
        notes: record.notes || '',
      });
    }
  }, [record, open, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!record) return;

      setSaving(true);
      const updated = await medicalRecordsApi.updateMedicalRecord(record.id, {
        testName: values.testName.trim(),
        reportDate: values.reportDate ? values.reportDate.format('YYYY-MM-DD') : undefined,
        notes: values.notes ? values.notes.trim() : '',
      });

      message.success('Medical record updated successfully');
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return; // Antd validation error
      message.error(err?.response?.data?.message || 'Failed to update medical record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={saving}
      title="Edit Medical Record Metadata"
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="testName"
          label="Test / Document Name"
          rules={[{ required: true, message: 'Please enter a test or document name' }]}
        >
          <Input placeholder="e.g. Complete Blood Count (CBC) or Chest X-Ray" />
        </Form.Item>

        <Form.Item
          name="reportDate"
          label="Report / Clinical Date"
          rules={[{ required: true, message: 'Please select report date' }]}
        >
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>

        <Form.Item name="notes" label="Clinical Notes / Remarks">
          <Input.TextArea
            rows={3}
            placeholder="Enter any doctor impressions or administrative notes..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

