import {
  Alert,
  Checkbox,
  DatePicker,
  Form,
  Input,
  message,
  Radio,
  Select,
  Upload,
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import dayjs from 'dayjs';
import { Inbox, Loader2, UploadCloud } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import { Drawer } from '../../../components/ui/Drawer';
import { medicalRecordsApi } from '../services/medicalRecordsApi';
import type { MedicalRecord, PrescribedPendingTest } from '../types/medicalRecords';

export interface UploadMedicalRecordModalProps {
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
  const [patientOptions, setPatientOptions] = useState<{ value: string; label: string }[]>([]);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [prescribedTests, setPrescribedTests] = useState<PrescribedPendingTest[]>([]);
  const [loadingTests, setLoadingTests] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [allowDuplicate, setAllowDuplicate] = useState(false);

  const prevOpenRef = useRef(false);

  const loadPatientPrescribedTests = async (patientId: string) => {
    try {
      setLoadingTests(true);
      const dossier = await medicalRecordsApi.getPatientDossier(patientId);
      setPrescribedTests(dossier.pendingPrescribedTests ?? []);
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

  // Initialize or reset form only once when drawer opens
  useEffect(() => {
    if (!open) {
      prevOpenRef.current = false;
      return;
    }
    if (prevOpenRef.current) return;
    prevOpenRef.current = true;

    const init = async () => {
      form.resetFields();
      setFileList([]);
      setSelectedFile(null);
      setDuplicateWarning(null);
      setAllowDuplicate(false);

      if (defaultPatient) {
        setPatientOptions([{ value: defaultPatient.id, label: defaultPatient.name }]);
        form.setFieldValue('patientId', defaultPatient.id);
        await loadPatientPrescribedTests(defaultPatient.id);
      } else {
        await loadInitialPatients();
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
    };

    void init();
  }, [open, defaultPatient, defaultPrescribedTest, form]);

  const handlePatientSearch = async (val: string) => {
    if (!val?.trim()) {
      return;
    }
    setSearchingPatients(true);
    try {
      const results = await medicalRecordsApi.searchPatients(val);
      if (results && results.length > 0) {
        setPatientOptions((prev) => {
          const map = new Map<string, { value: string; label: string }>();
          for (const opt of prev) map.set(opt.value, opt);
          for (const p of results) {
            map.set(p.id, {
              value: p.id,
              label: `${p.name} ${p.phone ? `(${p.phone})` : ''}`,
            });
          }
          return Array.from(map.values());
        });
      }
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
      const values = (await form.validateFields()) as {
        patientId: string;
        testName: string;
        reportDate?: dayjs.Dayjs;
        notes?: string;
        prescriptionLabTestId?: string;
      };
      const rawTarget =
        selectedFile ??
        (fileList[0]?.originFileObj as File | undefined) ??
        (fileList[0] as unknown as File | undefined);

      if (!rawTarget) {
        void message.error('Please select a file to upload');
        return;
      }

      const file = rawTarget;
      setUploading(true);

      const isExternal = recordType === 'EXTERNAL';
      const payload: {
        file: File;
        patientId: string;
        testName: string;
        reportDate?: string;
        notes?: string;
        prescriptionLabTestId?: string;
        isExternal: boolean;
        allowDuplicate: boolean;
      } = {
        file,
        patientId: values.patientId,
        testName: values.testName.trim(),
        isExternal,
        allowDuplicate,
      };

      if (values.reportDate) {
        payload.reportDate = values.reportDate.format('YYYY-MM-DD');
      }
      if (values.notes?.trim()) {
        payload.notes = values.notes.trim();
      }
      if (!isExternal && values.prescriptionLabTestId) {
        payload.prescriptionLabTestId = values.prescriptionLabTestId;
      }

      const created = await medicalRecordsApi.uploadMedicalRecord(payload);

      void message.success(`Medical record for "${created.testName}" uploaded successfully`);
      onSuccess(created);
      onClose();
    } catch (err: unknown) {
      const errObj = err as {
        errorFields?: unknown;
        response?: { status?: number; data?: { code?: string; message?: string } };
      };
      if (errObj?.errorFields) return;
      const response = errObj?.response;
      const isConflict =
        response?.status === 409 ||
        response?.data?.code === 'CONFLICT' ||
        String(response?.data?.message ?? '').toLowerCase().includes('duplicate');

      if (isConflict) {
        setDuplicateWarning(
          response?.data?.message ??
            'Duplicate record detected: A document with the same file or test name already exists for this patient.'
        );
        return;
      }
      void message.error(response?.data?.message ?? 'Failed to upload medical record');
    } finally {
      setUploading(false);
    }
  };

  const footerActions = (
    <div className="flex items-center justify-end gap-2.5 w-full">
      <button
        type="button"
        className="ui-btn ui-btn-neutral"
        onClick={onClose}
        disabled={uploading}
      >
        Cancel
      </button>
      <button
        type="button"
        className="ui-btn ui-btn-primary"
        onClick={() => {
          void handleSubmit();
        }}
        disabled={uploading}
      >
        {uploading && <Loader2 size={14} className="animate-spin" />}
        <span>
          {duplicateWarning && allowDuplicate
            ? 'Upload Anyway (Override Duplicate)'
            : 'Upload Record'}
        </span>
      </button>
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      label="Medical Records"
      icon={<UploadCloud size={22} className="text-blue-600" />}
      title="Upload Patient Medical Record"
      subtitle="Upload clinical records, test reports, or prescribed laboratory documents."
      footer={footerActions}
    >
      <Form form={form} layout="vertical" className="space-y-4">
        {/* Duplicate Warning Alert */}
        {duplicateWarning && (
          <Alert
            type="warning"
            showIcon
            className="mb-4"
            message="Duplicate Record Detected"
            description={
              <div>
                <p className="m-0 text-xs">{duplicateWarning}</p>
                <div className="mt-2">
                  <Checkbox
                    checked={allowDuplicate}
                    onChange={(e) => setAllowDuplicate(e.target.checked)}
                  >
                    <span className="text-xs">
                      I understand and want to upload this duplicate/revised record anyway
                    </span>
                  </Checkbox>
                </div>
              </div>
            }
          />
        )}

        {/* Patient Selection */}
        <Form.Item
          name="patientId"
          label={<span className="font-medium text-slate-700 text-xs">Select Patient</span>}
          rules={[{ required: true, message: 'Please select a patient' }]}
        >
          <Select
            showSearch
            placeholder="Search patient by name or phone..."
            options={patientOptions}
            onSearch={(val) => {
              void handlePatientSearch(val);
            }}
            onChange={handlePatientChange}
            filterOption={(input, option) =>
              String(option?.label ?? '')
                .toLowerCase()
                .includes(input.toLowerCase().trim())
            }
            loading={searchingPatients}
            disabled={Boolean(defaultPatient)}
            notFoundContent={searchingPatients ? 'Loading patients...' : 'No patients found'}
            className="w-full"
          />
        </Form.Item>

        {/* Record Type Selector */}
        <Form.Item
          label={<span className="font-medium text-slate-700 text-xs">Record Category</span>}
          name="recordType"
        >
          <Radio.Group
            value={recordType}
            onChange={(e) => {
              const val = e.target.value as 'PRESCRIBED' | 'EXTERNAL';
              setRecordType(val);
              if (val === 'EXTERNAL') {
                form.setFieldValue('prescriptionLabTestId', undefined);
              }
            }}
            className="w-full"
          >
            <Radio.Button value="EXTERNAL">External / Medical Document</Radio.Button>
            <Radio.Button value="PRESCRIBED">Doctor Prescribed Lab Test</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {/* If Prescribed Lab Test: Choose from Pending Tests */}
        {recordType === 'PRESCRIBED' && (
          <Form.Item
            name="prescriptionLabTestId"
            label={<span className="font-medium text-slate-700 text-xs">Prescribed Lab Test</span>}
            rules={[{ required: true, message: 'Please select a prescribed test' }]}
          >
            <Select
              placeholder="Select an ordered test from doctor prescriptions..."
              loading={loadingTests}
              onChange={handlePrescribedTestChange}
              options={prescribedTests.map((t) => ({
                value: t.id,
                label: `${t.testName} (${t.status === 'Uploaded' ? 'Already uploaded' : 'Pending upload'}) - Dr. ${t.doctorName ?? 'Narendran'}`,
              }))}
              className="w-full"
            />
          </Form.Item>
        )}

        {/* Test / Document Name */}
        <Form.Item
          name="testName"
          label={<span className="font-medium text-slate-700 text-xs">Record / Test Name</span>}
          rules={[{ required: true, message: 'Please enter a test or document name' }]}
        >
          <Input placeholder="e.g. Complete Blood Count (CBC), Chest X-Ray, Discharge Summary" />
        </Form.Item>

        {/* Report Date */}
        <Form.Item
          name="reportDate"
          label={<span className="font-medium text-slate-700 text-xs">Clinical / Report Date</span>}
          initialValue={dayjs()}
          rules={[{ required: true, message: 'Please select report date' }]}
        >
          <DatePicker className="w-full" format="YYYY-MM-DD" />
        </Form.Item>

        {/* Clinical Notes */}
        <Form.Item
          name="notes"
          label={<span className="font-medium text-slate-700 text-xs">Clinical Notes / Remarks</span>}
        >
          <Input.TextArea
            rows={3}
            placeholder="Optional clinical observations, impressions, or notes..."
          />
        </Form.Item>

        {/* File Upload Dropzone */}
        <Form.Item
          label={<span className="font-medium text-slate-700 text-xs">Upload Document File</span>}
          required
        >
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
                void message.error('You can only upload PDF, PNG, or JPG files!');
                return Upload.LIST_IGNORE;
              }
              const isLt15M = file.size / 1024 / 1024 < 15;
              if (!isLt15M) {
                void message.error('File must be smaller than 15MB!');
                return Upload.LIST_IGNORE;
              }
              setSelectedFile(file);
              setFileList([file]);
              return false; // Prevent automatic upload
            }}
            onChange={(info) => {
              if (info.fileList && info.fileList.length > 0) {
                const item = info.fileList[info.fileList.length - 1]!;
                setFileList([item]);
                const raw = (item.originFileObj ?? item) as unknown;
                if (raw instanceof File) {
                  setSelectedFile(raw);
                }
              } else {
                setFileList([]);
                setSelectedFile(null);
              }
            }}
            onRemove={() => {
              setFileList([]);
              setSelectedFile(null);
            }}
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
    </Drawer>
  );
};

export const UploadMedicalRecordDrawer = UploadMedicalRecordModal;
