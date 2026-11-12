import {
  Alert,
  Checkbox,
  DatePicker,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Upload,
  message,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';
import { Inbox, UploadCloud } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { medicalRecordsApi } from '../services/medicalRecordsApi';
import type { MedicalRecord, PrescribedPendingTest } from '../types/medicalRecords';

interface UploadMedicalRecordModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newRecord: MedicalRecord) => void;
  defaultPatient?: { id: string; name: string } | null;
  defaultPrescribedTest?: PrescribedPendingTest | null;
}

export const UploadMedicalRecordModal: React.FC<UploadMedicalRecordModalProps> = ({
  open,
  onClose,
  onSuccess,
  defaultPatient = null,
  defaultPrescribedTest = null,
}) => {
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [recordType, setRecordType] = useState<'PRESCRIBED' | 'EXTERNAL'>('EXTERNAL');
  const [patientOptions, setPatientOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [prescribedTests, setPrescribedTests] = useState<PrescribedPendingTest[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  // Initialize or reset form on open
  useEffect(() => {
    if (open) {
      form.resetFields();
      setFileList([]);
      setDuplicateWarning(null);
      setAllowDuplicate(false);

      if (defaultPatient) {
        setPatientOptions([{ value: defaultPatient.id, label: defaultPatient.name }]);
        form.setFieldValue('patientId', defaultPatient.id);
        void loadPatientPrescribedTests(defaultPatient.id);
      } else {
        void loadInitialPatients();
      }

      if (defaultPrescribedTest) {
        setRecordType('PRESCRIBED');
        form.setFieldsValue({
          recordType: 'PRESCRIBED',
          prescriptionLabTestId: defaultPrescribedTest.id,
          testName: defaultPrescribedTest.testName,
        });
      } else {
        setRecordType('EXTERNAL');
        form.setFieldsValue({
          recordType: 'EXTERNAL',
          reportDate: dayjs(),
        });
      }
    }
  }, [open, defaultPatient, defaultPrescribedTest, form]);

  const loadPatientPrescribedTests = async (patientId: string) => {
    try {
      setLoadingTests(true);
      const dossier = await medicalRecordsApi.getPatientDossier(patientId);
      setPrescribedTests(dossier.pendingPrescribedTests || []);
    } catch {
      setPrescribedTests([]);
    } finally {
      setLoadingTests(false);
    }
  };

  const loadInitialPatients = async () => {
    setSearchingPatients(true);
    try {
      const results = await medicalRecordsApi.getAllPatients();
      setPatientOptions(
        results.map((p) => ({
          value: p.id,
          label: `${p.name} ${p.phone ? `(${p.phone})` : ''}`,
        }))
      );
    } catch {
      setPatientOptions([]);
    } finally {
      setSearchingPatients(false);
    }
  };

  const handlePatientSearch = async (val: string) => {
    setSearchingPatients(true);
    try {
      const results = val.trim()
        ? await medicalRecordsApi.searchPatients(val)
        : await medicalRecordsApi.getAllPatients();
      setPatientOptions(
        results.map((p) => ({
          value: p.id,
          label: `${p.name} ${p.phone ? `(${p.phone})` : ''}`,
        }))
      );
    } catch {
      // ignore
    } finally {
      setSearchingPatients(false);
    }
  };

  const handlePatientChange = (patientId: string) => {
    form.setFieldValue('prescriptionLabTestId', undefined);
    void loadPatientPrescribedTests(patientId);
  };

  const handlePrescribedTestChange = (testId: string) => {
    const selected = prescribedTests.find((t) => t.id === testId);
    if (selected) {
      form.setFieldValue('testName', selected.testName);
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const targetFile = (fileList[0]?.originFileObj || fileList[0]) as File | undefined;
      if (!targetFile || fileList.length === 0) {
        message.error('Please select a file to upload');
        return;
      }

      const file = targetFile;
      setUploading(true);

      const isExternal = recordType === 'EXTERNAL';
      const created = await medicalRecordsApi.uploadMedicalRecord({
        file,
        patientId: values.patientId,
        testName: values.testName.trim(),
        reportDate: values.reportDate ? values.reportDate.format('YYYY-MM-DD') : undefined,
        notes: values.notes ? values.notes.trim() : undefined,
        prescriptionLabTestId: isExternal ? undefined : values.prescriptionLabTestId,
        isExternal,
        allowDuplicate,
      });

      message.success(`Medical record for "${created.testName}" uploaded successfully`);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      if (err?.errorFields) return;
      const isConflict =
        err?.response?.status === 409 ||
        err?.response?.data?.code === 'CONFLICT' ||
        String(err?.response?.data?.message || '').toLowerCase().includes('duplicate');

      if (isConflict) {
        setDuplicateWarning(
          err?.response?.data?.message ||
            'Duplicate record detected: A document with the same file or test name already exists for this patient.'
        );
        return;
      }
      message.error(err?.response?.data?.message || 'Failed to upload medical record');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={uploading}
      okText={duplicateWarning && allowDuplicate ? 'Upload Anyway (Override Duplicate)' : 'Upload Record'}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <UploadCloud size={20} className="text-primary-600" />
          <span>Upload Patient Medical Record</span>
        </div>
      }
      width={650}
      destroyOnClose
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        {/* Duplicate Warning Alert */}
        {duplicateWarning && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="Duplicate Record Detected"
            description={
              <div>
                <p style={{ margin: 0 }}>{duplicateWarning}</p>
                <div style={{ marginTop: 8 }}>
                  <Checkbox
                    checked={allowDuplicate}
                    onChange={(e) => setAllowDuplicate(e.target.checked)}
                  >
                    I understand and want to upload this duplicate/revised record anyway
                  </Checkbox>
                </div>
              </div>
            }
          />
        )}
        {/* Patient Selection */}
        <Form.Item
          name="patientId"
          label="Select Patient"
          rules={[{ required: true, message: 'Please select a patient' }]}
        >
          <Select
            showSearch
            placeholder="Search patient by name or phone..."
            options={patientOptions}
            onSearch={handlePatientSearch}
            onChange={handlePatientChange}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            loading={searchingPatients}
            disabled={Boolean(defaultPatient)}
          />
        </Form.Item>

        {/* Record Type Selector */}
        <Form.Item label="Record Category" name="recordType">
          <Radio.Group
            value={recordType}
            onChange={(e) => {
              setRecordType(e.target.value);
              if (e.target.value === 'EXTERNAL') {
                form.setFieldValue('prescriptionLabTestId', undefined);
              }
            }}
          >
            <Radio.Button value="EXTERNAL">External / Medical Document</Radio.Button>
            <Radio.Button value="PRESCRIBED">Doctor Prescribed Lab Test</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {/* If Prescribed Lab Test: Choose from Pending Tests */}
        {recordType === 'PRESCRIBED' && (
          <Form.Item
            name="prescriptionLabTestId"
            label="Prescribed Lab Test"
            rules={[{ required: true, message: 'Please select a prescribed test' }]}
          >
            <Select
              placeholder="Select an ordered test from doctor prescriptions..."
              loading={loadingTests}
              onChange={handlePrescribedTestChange}
              options={prescribedTests.map((t) => ({
                value: t.id,
                label: `${t.testName} (${t.status === 'Uploaded' ? 'Already uploaded' : 'Pending upload'}) - Dr. ${t.doctorName || 'Narendran'}`,
              }))}
            />
          </Form.Item>
        )}

        {/* Test / Document Name */}
        <Form.Item
          name="testName"
          label="Record / Test Name"
          rules={[{ required: true, message: 'Please enter a test or document name' }]}
        >
          <Input placeholder="e.g. Complete Blood Count (CBC), Chest X-Ray, Discharge Summary" />
        </Form.Item>

        {/* Report Date */}
        <Form.Item
          name="reportDate"
          label="Clinical / Report Date"
          initialValue={dayjs()}
          rules={[{ required: true, message: 'Please select report date' }]}
        >
          <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
        </Form.Item>

        {/* Clinical Notes */}
        <Form.Item name="notes" label="Clinical Notes / Remarks">
          <Input.TextArea
            rows={2}
            placeholder="Optional clinical observations, impressions, or notes..."
          />
        </Form.Item>

        {/* File Upload Dropzone */}
        <Form.Item label="Upload Document File" required>
          <Upload.Dragger
            maxCount={1}
            fileList={fileList}
            beforeUpload={(file) => {
              const isValidType =
                file.type === 'application/pdf' ||
                file.type === 'image/jpeg' ||
                file.type === 'image/jpg' ||
                file.type === 'image/png';
              if (!isValidType) {
                message.error('You can only upload PDF, PNG, or JPG files!');
                return Upload.LIST_IGNORE;
              }
              const isLt15M = file.size / 1024 / 1024 < 15;
              if (!isLt15M) {
                message.error('File must be smaller than 15MB!');
                return Upload.LIST_IGNORE;
              }
              setFileList([file]);
              return false; // Prevent automatic upload
            }}
            onChange={(info) => {
              if (info.fileList && info.fileList.length > 0) {
                setFileList(info.fileList.slice(-1));
              }
            }}
            onRemove={() => setFileList([])}
          >
            <p className="ant-upload-drag-icon">
              <Inbox size={36} style={{ color: '#0284c7', margin: '0 auto' }} />
            </p>
            <p className="ant-upload-text">Click or drag document to this area to upload</p>
            <p className="ant-upload-hint">
              Supported formats: PDF, PNG, JPG, JPEG (Max 15MB)
            </p>
          </Upload.Dragger>
        </Form.Item>
      </Form>
    </Modal>
  );
};
