import { App, AutoComplete, Modal, Select, Spin } from 'antd';
import dayjs from 'dayjs';
import {
  FlaskConical,
  Pill,
  Plus,
  Stethoscope,
  Trash2,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import api from '../../../utils/api';
import { getErrorMessage } from '../../../utils/errors';
import {
  type CreatePrescriptionPayload,
  type Prescription,
  prescriptionsApi,
} from '../api/prescriptionsApi';

interface PatientOption {
  id: string;
  name: string;
  phone?: string | undefined;
  gender?: string | undefined;
  date_of_birth?: string | undefined;
}

interface DoctorOption {
  id: string;
  name: string;
  specialization?: string | undefined;
}

interface MedicineRow {
  key: string;
  medicineId?: string | undefined;
  name: string;
  strength: string;
  dosage: string;
  frequency: string;
  duration: string;
  mealTiming: string;
  instructions: string;
  prescribedQuantity: number;
}

interface LabRow {
  key: string;
  labTestId?: string | undefined;
  testName: string;
  instructions: string;
  labId?: string | undefined;
}

interface CreatePrescriptionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (prescription: Prescription) => void;
  /** If creating for a specific patient */
  preselectedPatient?: {
    id: string;
    name: string;
    phone?: string | undefined;
    gender?: string | undefined;
    date_of_birth?: string | undefined;
  } | undefined;
  /** If creating for a specific appointment/consultation */
  appointmentId?: string | undefined;
  appointmentToken?: string | number | undefined;
  appointmentDoctorId?: string | undefined;
  /** If editing an existing prescription */
  editingPrescription?: Prescription | null | undefined;
}

const COMMON_DIAGNOSES = [
  'General Consultation',
  'Hypertension',
  'Type 2 Diabetes Mellitus',
  'Upper Respiratory Infection',
  'Acute Gastritis',
  'Viral Fever',
  'Migraine / Headache',
  'Allergic Rhinitis',
  'Musculoskeletal Pain',
  'Dyslipidemia',
];

const COMMON_FREQUENCIES = [
  { label: '1-0-1 (Twice daily)', value: '1-0-1' },
  { label: '1-0-0 (Morning)', value: '1-0-0' },
  { label: '0-0-1 (Night)', value: '0-0-1' },
  { label: '1-1-1 (Thrice daily)', value: '1-1-1' },
  { label: '1-1-1-1 (4 times daily)', value: '1-1-1-1' },
  { label: 'SOS (As needed)', value: 'SOS' },
];

const COMMON_MEAL_TIMINGS = ['After Food', 'Before Food', 'With Food', 'Empty Stomach'];

const COMMON_DURATIONS = ['3 Days', '5 Days', '7 Days', '10 Days', '14 Days', '1 Month'];

export default function CreatePrescriptionModal({
  open,
  onClose,
  onSuccess,
  preselectedPatient,
  appointmentId,
  appointmentToken,
  appointmentDoctorId,
  editingPrescription,
}: CreatePrescriptionModalProps) {
  const { message } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);

  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

  const [diagnosis, setDiagnosis] = useState('');
  const [generalInstructions, setGeneralInstructions] = useState('');
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [followUpDays, setFollowUpDays] = useState<number | undefined>(undefined);
  const [markCompleted, setMarkCompleted] = useState(true);

  // Medicine catalog options for autocomplete
  const [medicineOptions, setMedicineOptions] = useState<
    { value: string; label: string; raw: any }[]
  >([]);

  const [medicines, setMedicines] = useState<MedicineRow[]>([
    {
      key: 'med-1',
      name: '',
      strength: '',
      dosage: '1 Tablet',
      frequency: '1-0-1',
      duration: '5 Days',
      mealTiming: 'After Food',
      instructions: '',
      prescribedQuantity: 10,
    },
  ]);

  const [labTests, setLabTests] = useState<LabRow[]>([]);
  const [availableLabs, setAvailableLabs] = useState<{ id: string; name: string }[]>([]);

  // Load doctors & labs on mount
  useEffect(() => {
    if (!open) return;

    void (async () => {
      try {
        const [docsRes, labsRes] = await Promise.all([
          api.get('/doctors'),
          api.get('/labs').catch(() => ({ data: [] })),
        ]);
        const docsList = (docsRes.data?.data || docsRes.data || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          specialization: d.specialization,
        }));
        setDoctors(docsList);

        if (appointmentDoctorId) {
          setSelectedDoctorId(appointmentDoctorId);
        } else if (docsList.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(docsList[0].id);
        }

        const labsList = (labsRes.data?.data || labsRes.data || []).map((l: any) => ({
          id: l.id,
          name: l.name,
        }));
        setAvailableLabs(labsList);
      } catch {}
    })();
  }, [open, appointmentDoctorId]);

  // Set patient state
  useEffect(() => {
    if (preselectedPatient) {
      setSelectedPatientId(preselectedPatient.id);
      setSelectedPatient(preselectedPatient);
    } else if (editingPrescription?.patient_id) {
      setSelectedPatientId(editingPrescription.patient_id);
      setSelectedPatient({
        id: editingPrescription.patient_id,
        name: editingPrescription.patient_name || 'Patient',
        phone: editingPrescription.patient_phone ?? undefined,
        gender: editingPrescription.patient_gender ?? undefined,
        date_of_birth: editingPrescription.patient_dob ?? undefined,
      });
    }
  }, [preselectedPatient, editingPrescription]);

  // Populate fields if in edit mode
  useEffect(() => {
    if (editingPrescription) {
      setDiagnosis(editingPrescription.diagnosis || editingPrescription.additional_notes || '');
      setGeneralInstructions(editingPrescription.additional_notes || '');
      if (editingPrescription.follow_up_date) {
        setFollowUpDate(editingPrescription.follow_up_date);
      }
      if (editingPrescription.follow_up_days) {
        setFollowUpDays(editingPrescription.follow_up_days);
      }
      if (editingPrescription.doctor?.id) {
        setSelectedDoctorId(editingPrescription.doctor.id);
      }

      if (editingPrescription.medicines?.length > 0) {
        setMedicines(
          editingPrescription.medicines.map((m, idx) => ({
            key: `med-edit-${idx}`,
            medicineId: m.medicine_id ?? undefined,
            name: m.medicine_name,
            strength: m.strength || '',
            dosage: m.dosage || '1 Tablet',
            frequency: m.frequency || '1-0-1',
            duration: m.duration || '5 Days',
            mealTiming: m.food_instruction || 'After Food',
            instructions: m.instructions || '',
            prescribedQuantity: m.prescribed_quantity || 10,
          }))
        );
      }

      if (editingPrescription.lab_tests && editingPrescription.lab_tests.length > 0) {
        setLabTests(
          editingPrescription.lab_tests.map((l, idx) => ({
            key: `lab-edit-${idx}`,
            labTestId: l.lab_test_id ?? undefined,
            testName: l.test_name,
            instructions: l.instructions || '',
            labId: l.lab_id ?? undefined,
          }))
        );
      }
    } else if (open && !preselectedPatient) {
      // Reset if newly opened
      setDiagnosis('');
      setGeneralInstructions('');
      setFollowUpDate('');
      setFollowUpDays(undefined);
      setMedicines([
        {
          key: 'med-1',
          name: '',
          strength: '',
          dosage: '1 Tablet',
          frequency: '1-0-1',
          duration: '5 Days',
          mealTiming: 'After Food',
          instructions: '',
          prescribedQuantity: 10,
        },
      ]);
      setLabTests([]);
    }
  }, [editingPrescription, open]);

  // Search patients
  const handleSearchPatient = async (query: string) => {
    if (!query.trim()) {
      setPatients([]);
      return;
    }
    setPatientSearchLoading(true);
    try {
      const res = await api.get('/patients', { params: { search: query, limit: 15 } });
      const items = res.data?.data || res.data || [];
      setPatients(items);
    } catch {
      setPatients([]);
    } finally {
      setPatientSearchLoading(false);
    }
  };

  // Search medicines
  const handleSearchMedicines = async (term: string) => {
    if (!term || term.length < 2) {
      setMedicineOptions([]);
      return;
    }
    try {
      const res = await api.get('/medicines', { params: { search: term, limit: 12 } });
      const items = res.data?.data || res.data || [];
      const opts = items.map((m: any) => ({
        value: m.name || m.medicine_name || m.generic_name,
        label: `${m.name || m.medicine_name}${m.strength ? ` (${m.strength})` : ''}${m.dosage_form ? ` - ${m.dosage_form}` : ''}`,
        raw: m,
      }));
      setMedicineOptions(opts);
    } catch {
      setMedicineOptions([]);
    }
  };

  // Auto-calculate quantity
  const calculateQuantity = (freq: string, dur: string): number => {
    let timesPerDay = 1;
    if (freq.includes('1-1-1-1')) timesPerDay = 4;
    else if (freq.includes('1-1-1')) timesPerDay = 3;
    else if (freq.includes('1-0-1')) timesPerDay = 2;
    else if (freq.includes('1-0-0') || freq.includes('0-0-1') || freq.includes('0-1-0')) timesPerDay = 1;
    else if (freq.toLowerCase().includes('twice')) timesPerDay = 2;
    else if (freq.toLowerCase().includes('thrice')) timesPerDay = 3;

    let days = 5;
    const durNum = parseInt(dur.replace(/\D/g, ''), 10);
    if (!isNaN(durNum) && durNum > 0) {
      if (dur.toLowerCase().includes('month')) days = durNum * 30;
      else if (dur.toLowerCase().includes('week')) days = durNum * 7;
      else days = durNum;
    }
    return timesPerDay * days;
  };

  const handleUpdateMedicine = (index: number, field: keyof MedicineRow, value: any) => {
    setMedicines((prev) => {
      const copy = [...prev];
      const row = copy[index];
      if (!row) return prev;
      copy[index] = { ...row, [field]: value };
      if (field === 'frequency' || field === 'duration') {
        const qty = calculateQuantity(
          field === 'frequency' ? value : row.frequency,
          field === 'duration' ? value : row.duration
        );
        const updatedRow = copy[index];
        if (updatedRow) {
          updatedRow.prescribedQuantity = qty;
        }
      }
      return copy;
    });
  };

  const handleSelectMedicineOption = (index: number, option: any) => {
    const raw = option.raw;
    setMedicines((prev) => {
      const copy = [...prev];
      const row = copy[index];
      if (!row) return prev;
      copy[index] = {
        ...row,
        medicineId: raw.id,
        name: raw.name || raw.medicine_name,
        strength: raw.strength || row.strength,
        dosage: raw.dosage_form ? `1 ${raw.dosage_form}` : row.dosage,
      };
      return copy;
    });
  };

  const handleAddMedicine = () => {
    setMedicines((prev) => [
      ...prev,
      {
        key: `med-${Date.now()}`,
        name: '',
        strength: '',
        dosage: '1 Tablet',
        frequency: '1-0-1',
        duration: '5 Days',
        mealTiming: 'After Food',
        instructions: '',
        prescribedQuantity: 10,
      },
    ]);
  };

  const handleRemoveMedicine = (index: number) => {
    if (medicines.length <= 1) return;
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddLabTest = () => {
    setLabTests((prev) => [
      ...prev,
      {
        key: `lab-${Date.now()}`,
        testName: '',
        instructions: '',
      },
    ]);
  };

  const handleRemoveLabTest = (index: number) => {
    setLabTests((prev) => prev.filter((_, i) => i !== index));
  };

  const handleQuickFollowUp = (days: number) => {
    setFollowUpDays(days);
    const d = dayjs().add(days, 'day');
    setFollowUpDate(d.format('YYYY-MM-DD'));
  };

  const handleSubmit = async () => {
    if (!selectedPatientId) {
      message.error('Please select a patient');
      return;
    }

    const validMedicines = medicines
      .filter((m) => m.name.trim().length > 0)
      .map((m) => ({
        medicineId: m.medicineId,
        name: m.name.trim(),
        strength: m.strength.trim() || undefined,
        dosage: m.dosage.trim() || '1 Tablet',
        frequency: m.frequency.trim() || '1-0-1',
        duration: m.duration.trim() || '5 Days',
        mealTiming: m.mealTiming || 'After Food',
        instructions: m.instructions.trim() || undefined,
        prescribedQuantity: m.prescribedQuantity || 1,
      }));

    const validLabs = labTests
      .filter((l) => l.testName.trim().length > 0)
      .map((l) => ({
        labTestId: l.labTestId,
        testName: l.testName.trim(),
        instructions: l.instructions.trim() || undefined,
        labId: l.labId,
      }));

    if (validMedicines.length === 0 && validLabs.length === 0) {
      message.error('Please add at least one medicine or lab test');
      return;
    }

    setLoading(true);
    try {
      if (editingPrescription) {
        const payload = {
          diagnosis: diagnosis.trim() || 'General Consultation',
          generalInstructions: generalInstructions.trim() || undefined,
          followUpDays,
          followUpDate: followUpDate || undefined,
          medicines: validMedicines,
          labTests: validLabs,
        };
        const updated = await prescriptionsApi.update(editingPrescription.id, payload);
        message.success('Prescription updated successfully!');
        onSuccess(updated);
        onClose();
      } else {
        const payload: CreatePrescriptionPayload = {
          patientId: selectedPatientId,
          doctorId: selectedDoctorId || undefined,
          appointmentId: appointmentId || undefined,
          markAppointmentCompleted: appointmentId ? markCompleted : false,
          diagnosis: diagnosis.trim() || 'General Consultation',
          generalInstructions: generalInstructions.trim() || undefined,
          prescriptionType: 'system',
          followUpDays,
          followUpDate: followUpDate || undefined,
          medicines: validMedicines,
          labTests: validLabs,
        };
        const created = await prescriptionsApi.create(payload);
        message.success('Prescription created and saved successfully!');
        onSuccess(created);
        onClose();
      }
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Failed to save prescription'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={980}
      style={{ top: 20 }}
      styles={{
        body: {
          maxHeight: 'calc(85vh - 70px)',
          overflowY: 'auto',
          padding: '16px 20px',
        },
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 6 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 8,
              background: '#f5f3ff',
              border: '1px solid #ede9fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7c3aed',
            }}
          >
            <Stethoscope size={18} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              {editingPrescription ? 'Edit Prescription' : 'Create Prescription'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Create and issue official digital prescription directly from Web App
            </div>
          </div>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {medicines.filter((m) => m.name.trim()).length} medicine(s) ·{' '}
            {labTests.filter((l) => l.testName.trim()).length} lab test(s)
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="ui-btn"
              onClick={onClose}
              disabled={loading}
              style={{ padding: '6px 14px', fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-primary"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                padding: '6px 18px',
                fontSize: 13,
                fontWeight: 600,
                background: '#7c3aed',
                borderColor: '#7c3aed',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {loading && <Spin size="small" />}
              <span>
                {editingPrescription
                  ? 'Update Prescription'
                  : appointmentId && markCompleted
                    ? 'Save & Complete Consultation'
                    : 'Save Prescription'}
              </span>
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Patient & Doctor Context Header */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 14,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 12,
          }}
        >
          {/* Patient Selector / Card */}
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
              PATIENT *
            </label>
            {selectedPatient ? (
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={16} style={{ color: '#7c3aed' }} />
                  <div>
                    <span style={{ fontWeight: 650, color: '#0f172a', fontSize: 13 }}>
                      {selectedPatient.name}
                    </span>
                    <span style={{ fontSize: 11, color: '#64748b', marginLeft: 6 }}>
                      {[selectedPatient.gender, selectedPatient.phone].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                </div>
                {!preselectedPatient && !editingPrescription && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatient(null);
                      setSelectedPatientId('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#7c3aed',
                      fontSize: 11.5,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Change
                  </button>
                )}
              </div>
            ) : (
              <Select
                showSearch
                placeholder="Search patient by name or phone..."
                loading={patientSearchLoading}
                filterOption={false}
                onSearch={handleSearchPatient}
                onChange={(val) => {
                  setSelectedPatientId(val);
                  const p = patients.find((pt) => pt.id === val);
                  if (p) setSelectedPatient(p);
                }}
                style={{ width: '100%' }}
                options={patients.map((p) => ({
                  value: p.id,
                  label: `${p.name} ${p.phone ? `(${p.phone})` : ''}`,
                }))}
              />
            )}
          </div>

          {/* Doctor Selection */}
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
              PRESCRIBING DOCTOR *
            </label>
            <Select
              value={selectedDoctorId || undefined}
              onChange={(val) => setSelectedDoctorId(val ?? '')}
              placeholder="Select Doctor"
              style={{ width: '100%' }}
              options={doctors.map((d) => ({
                value: d.id,
                label: `${d.name} (${d.specialization || 'General Medicine'})`,
              }))}
            />
          </div>

          {/* Appointment Context Banner */}
          {appointmentId && (
            <div style={{ gridColumn: '1 / -1', marginTop: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  fontSize: 11.5,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: '#f5f3ff',
                  border: '1px solid #ede9fe',
                  color: '#6d28d9',
                  fontWeight: 600,
                }}
              >
                Consultation #{appointmentToken || appointmentId.slice(0, 6)}
              </span>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: '#1e293b' }}>
                <input
                  type="checkbox"
                  checked={markCompleted}
                  onChange={(e) => setMarkCompleted(e.target.checked)}
                />
                <span style={{ fontWeight: 500 }}>
                  Mark appointment as <strong>Completed</strong> upon saving
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Diagnosis & Clinical Section */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
            DIAGNOSIS & CLINICAL IMPRESSION
          </label>
          <AutoComplete
            value={diagnosis}
            onChange={(val) => setDiagnosis(val)}
            placeholder="e.g. Hypertension, Acute Bronchitis, Type 2 Diabetes..."
            options={COMMON_DIAGNOSES.map((d) => ({ value: d }))}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {COMMON_DIAGNOSES.slice(0, 5).map((cd) => (
              <button
                key={cd}
                type="button"
                onClick={() => setDiagnosis(cd)}
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 4,
                  border: '1px solid #e2e8f0',
                  background: diagnosis === cd ? '#f5f3ff' : '#ffffff',
                  color: diagnosis === cd ? '#7c3aed' : '#475569',
                  cursor: 'pointer',
                  fontWeight: diagnosis === cd ? 600 : 400,
                }}
              >
                + {cd}
              </button>
            ))}
          </div>
        </div>

        {/* Medicines Section */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Pill size={16} style={{ color: '#7c3aed' }} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                Medicines & Dosages ({medicines.length})
              </span>
            </div>
            <button
              type="button"
              onClick={handleAddMedicine}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#7c3aed',
                background: '#f5f3ff',
                border: '1px solid #ede9fe',
                borderRadius: 6,
                padding: '4px 10px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Plus size={14} /> Add Medicine
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {medicines.map((med, index) => (
              <div
                key={med.key}
                style={{
                  border: '1px solid #f1f5f9',
                  borderRadius: 8,
                  background: '#fafafa',
                  padding: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: '30px 2fr 1fr 1fr 34px', gap: 8, alignItems: 'center' }}>
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: '#ede9fe',
                      color: '#6d28d9',
                      fontSize: 11,
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {index + 1}
                  </span>

                  {/* Medicine Name (Autocomplete) */}
                  <AutoComplete
                    value={med.name}
                    placeholder="Medicine Name (Search or type)..."
                    options={medicineOptions}
                    onSearch={handleSearchMedicines}
                    onSelect={(_val, opt) => handleSelectMedicineOption(index, opt)}
                    onChange={(val) => handleUpdateMedicine(index, 'name', val)}
                    style={{ width: '100%' }}
                  />

                  {/* Strength */}
                  <input
                    type="text"
                    value={med.strength}
                    onChange={(e) => handleUpdateMedicine(index, 'strength', e.target.value)}
                    placeholder="Strength (e.g. 500mg)"
                    className="ui-input"
                    style={{ height: 32, fontSize: 12, padding: '0 8px' }}
                  />

                  {/* Dosage Form / Dose */}
                  <input
                    type="text"
                    value={med.dosage}
                    onChange={(e) => handleUpdateMedicine(index, 'dosage', e.target.value)}
                    placeholder="Dosage (e.g. 1 Tab)"
                    className="ui-input"
                    style={{ height: 32, fontSize: 12, padding: '0 8px' }}
                  />

                  {/* Remove Button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveMedicine(index)}
                    disabled={medicines.length <= 1}
                    title="Remove medicine"
                    style={{
                      border: 'none',
                      background: 'none',
                      color: medicines.length <= 1 ? '#cbd5e1' : '#ef4444',
                      cursor: medicines.length <= 1 ? 'not-allowed' : 'pointer',
                      padding: 4,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Details row: Frequency, Meal Timing, Duration, Quantity */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                    gap: 8,
                    paddingTop: 4,
                    borderTop: '1px dashed #e2e8f0',
                  }}
                >
                  {/* Frequency */}
                  <div>
                    <label style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 2 }}>
                      FREQUENCY
                    </label>
                    <Select
                      value={med.frequency}
                      onChange={(val) => handleUpdateMedicine(index, 'frequency', val)}
                      style={{ width: '100%' }}
                      size="small"
                      options={COMMON_FREQUENCIES}
                    />
                  </div>

                  {/* Meal Timing */}
                  <div>
                    <label style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 2 }}>
                      MEAL TIMING
                    </label>
                    <Select
                      value={med.mealTiming}
                      onChange={(val) => handleUpdateMedicine(index, 'mealTiming', val)}
                      style={{ width: '100%' }}
                      size="small"
                      options={COMMON_MEAL_TIMINGS.map((m) => ({ label: m, value: m }))}
                    />
                  </div>

                  {/* Duration */}
                  <div>
                    <label style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 2 }}>
                      DURATION
                    </label>
                    <Select
                      value={med.duration}
                      onChange={(val) => handleUpdateMedicine(index, 'duration', val)}
                      style={{ width: '100%' }}
                      size="small"
                      options={COMMON_DURATIONS.map((d) => ({ label: d, value: d }))}
                    />
                  </div>

                  {/* Prescribed Quantity */}
                  <div>
                    <label style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 2 }}>
                      TOTAL QTY
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={med.prescribedQuantity}
                      onChange={(e) => handleUpdateMedicine(index, 'prescribedQuantity', parseInt(e.target.value, 10) || 1)}
                      className="ui-input"
                      style={{ height: 24, fontSize: 11.5, padding: '0 6px' }}
                    />
                  </div>

                  {/* Specific instructions */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 2 }}>
                      SPECIAL INSTRUCTION (OPTIONAL)
                    </label>
                    <input
                      type="text"
                      value={med.instructions}
                      onChange={(e) => handleUpdateMedicine(index, 'instructions', e.target.value)}
                      placeholder="e.g. Drink plenty of warm water"
                      className="ui-input"
                      style={{ height: 24, fontSize: 11.5, padding: '0 6px' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Diagnostic Lab Tests (Optional) */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FlaskConical size={16} style={{ color: '#0284c7' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                Recommended Lab Investigations (Optional)
              </span>
            </div>
            <button
              type="button"
              onClick={handleAddLabTest}
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: '#0284c7',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 6,
                padding: '3px 8px',
                cursor: 'pointer',
              }}
            >
              + Add Lab Test
            </button>
          </div>

          {labTests.length === 0 ? (
            <div style={{ fontSize: 11.5, color: '#94a3b8', fontStyle: 'italic' }}>
              No diagnostic tests recommended. Click "+ Add Lab Test" if required.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {labTests.map((lab, index) => (
                <div
                  key={lab.key}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 2fr 2fr 30px',
                    gap: 8,
                    alignItems: 'center',
                    background: '#f8fafc',
                    padding: 8,
                    borderRadius: 6,
                  }}
                >
                  <input
                    type="text"
                    value={lab.testName}
                    onChange={(e) => {
                      const copy = [...labTests];
                      const item = copy[index];
                      if (item) {
                        item.testName = e.target.value;
                        setLabTests(copy);
                      }
                    }}
                    placeholder="Test Name (e.g. CBC, HbA1c, Lipid Profile)..."
                    className="ui-input"
                    style={{ height: 30, fontSize: 12, padding: '0 8px' }}
                  />
                  <input
                    type="text"
                    value={lab.instructions}
                    onChange={(e) => {
                      const copy = [...labTests];
                      const item = copy[index];
                      if (item) {
                        item.instructions = e.target.value;
                        setLabTests(copy);
                      }
                    }}
                    placeholder="Instructions (e.g. Fasting 12 hrs)..."
                    className="ui-input"
                    style={{ height: 30, fontSize: 12, padding: '0 8px' }}
                  />
                  <Select
                    value={lab.labId || undefined}
                    onChange={(val) => {
                      const copy = [...labTests];
                      const item = copy[index];
                      if (item) {
                        item.labId = val ?? undefined;
                        setLabTests(copy);
                      }
                    }}
                    placeholder="Assign Lab (Optional)"
                    size="small"
                    style={{ width: '100%' }}
                    options={availableLabs.map((l) => ({ value: l.id, label: l.name }))}
                    allowClear
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveLabTest(index)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* General Advice & Follow-up */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* General instructions */}
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
              GENERAL ADVICE / DIETARY INSTRUCTIONS
            </label>
            <textarea
              value={generalInstructions}
              onChange={(e) => setGeneralInstructions(e.target.value)}
              placeholder="e.g. Drink at least 3 liters of water daily. Avoid oily and spicy foods. Rest well."
              rows={3}
              className="ui-input"
              style={{ width: '100%', fontSize: 12, padding: 8 }}
            />
          </div>

          {/* Follow-up Scheduler */}
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
              NEXT FOLLOW-UP VISIT
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {[3, 5, 7, 14, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleQuickFollowUp(d)}
                    style={{
                      fontSize: 11,
                      padding: '3px 8px',
                      borderRadius: 4,
                      border: '1px solid #e2e8f0',
                      background: followUpDays === d ? '#f5f3ff' : '#ffffff',
                      color: followUpDays === d ? '#7c3aed' : '#475569',
                      fontWeight: followUpDays === d ? 600 : 400,
                      cursor: 'pointer',
                    }}
                  >
                    +{d >= 30 ? '1mo' : d >= 7 ? `${d / 7}w` : `${d}d`}
                  </button>
                ))}
              </div>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => {
                  setFollowUpDate(e.target.value);
                  if (e.target.value) {
                    const diff = dayjs(e.target.value).diff(dayjs(), 'day');
                    setFollowUpDays(diff > 0 ? diff : undefined);
                  }
                }}
                className="ui-input"
                style={{ height: 32, fontSize: 12, padding: '0 8px' }}
              />
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
