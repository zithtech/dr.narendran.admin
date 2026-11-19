import { message as staticMessage } from 'antd';
import dayjs from 'dayjs';
import {
  Calendar,
  Check,
  ChevronLeft,
  FlaskConical,
  Pill,
  Plus,
  RefreshCw,
  Stethoscope,
  Trash2,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { SearchableSelect, type SearchableSelectOption } from '../../../components/ui/SearchableSelect';
import api from '../../../utils/api';
import { getErrorMessage } from '../../../utils/errors';
import {
  type CreatePrescriptionPayload,
  type Prescription,
  prescriptionsApi,
} from '../../prescriptions/api/prescriptionsApi';
import type { PlanOfManagementData } from '../types/patientJourney.types';

export const FREQUENCY_OPTIONS: SearchableSelectOption[] = [
  { value: 'Once Daily (OD)', label: 'Once Daily (OD)' },
  { value: 'Twice Daily (BD)', label: 'Twice Daily (BD)' },
  { value: 'Thrice Daily (TDS)', label: 'Thrice Daily (TDS)' },
  { value: 'Four Times Daily (QID)', label: 'Four Times Daily (QID)' },
  { value: 'As Needed (SOS)', label: 'As Needed (SOS)' },
  { value: 'At Bedtime (HS)', label: 'At Bedtime (HS)' },
];

export const FOOD_INSTRUCTION_OPTIONS: SearchableSelectOption[] = [
  { value: 'After Food', label: 'After Food' },
  { value: 'Before Food', label: 'Before Food' },
  { value: 'With Food', label: 'With Food' },
  { value: 'Empty Stomach', label: 'Empty Stomach' },
];

export const DURATION_OPTIONS: SearchableSelectOption[] = [
  { value: '3 Days', label: '3 Days' },
  { value: '5 Days', label: '5 Days' },
  { value: '7 Days', label: '7 Days (1 Week)' },
  { value: '10 Days', label: '10 Days' },
  { value: '14 Days', label: '14 Days (2 Weeks)' },
  { value: '1 Month', label: '1 Month' },
  { value: '2 Months', label: '2 Months' },
  { value: '3 Months', label: '3 Months' },
  { value: 'Ongoing / Long-term', label: 'Ongoing / Long-term' },
];

export interface PrescribedMedicineRow {
  id?: string;
  medicineId?: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  foodInstruction: string;
  instructions: string;
}

export interface DoctorOption {
  id: string;
  name: string;
  specialty?: string;
  specialization?: string;
  department?: string;
}

export interface PrescriptionAndAppointmentTabProps {
  patient: {
    id: string;
    name: string;
    phone?: string | undefined;
    gender?: string | undefined;
    date_of_birth?: string | undefined;
    blood_group?: string | undefined;
  };
  managementPlan?: PlanOfManagementData | undefined;
  initialVitals?: {
    bloodPressure?: string;
    bloodSugar?: string;
    temperature?: string;
    heightCm?: string;
    weightKg?: string;
    customVitals?: any[];
  } | undefined;
  onPrevious: () => void;
  onPrescriptionSaved?: (prescription: Prescription) => void;
  onAppointmentScheduled?: () => void;
  onComplete?: () => void;
  ensurePatientSaved?: () => Promise<string>;
}

export function PrescriptionAndAppointmentTab({
  patient,
  managementPlan,
  initialVitals,
  onPrevious,
  onPrescriptionSaved,
  onAppointmentScheduled,
  onComplete,
  ensurePatientSaved,
}: PrescriptionAndAppointmentTabProps) {
  // Prescription states
  const [diagnosis, setDiagnosis] = useState(
    managementPlan?.provisionalDiagnosis || 'General Clinical Consultation'
  );
  const [generalInstructions, setGeneralInstructions] = useState(
    managementPlan?.dietaryAdvice || ''
  );
  const [medicines, setMedicines] = useState<PrescribedMedicineRow[]>([
    {
      name: '',
      dosage: '1 tablet',
      frequency: 'Twice Daily (BD)',
      duration: '5 Days',
      foodInstruction: 'After Food',
      instructions: '',
    },
  ]);
  const [labTests, setLabTests] = useState<string[]>(
    managementPlan?.investigationsOrdered || []
  );
  const [newLabTestInput, setNewLabTestInput] = useState('');

  // Follow-up Appointment states
  const [bookAppointment, setBookAppointment] = useState(true);
  const [followUpDays, setFollowUpDays] = useState<number | undefined>(7);
  const [appointmentDate, setAppointmentDate] = useState<string>(
    dayjs().add(7, 'day').format('YYYY-MM-DD')
  );
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [appointmentSlot, setAppointmentSlot] = useState<string>('Morning (09:00 AM - 01:00 PM)');
  const [appointmentPurpose, setAppointmentPurpose] = useState<string>(
    managementPlan?.provisionalDiagnosis
      ? `Follow-up Consultation for ${managementPlan.provisionalDiagnosis}`
      : 'Follow-up Consultation & Review'
  );
  const [appointmentNotes, setAppointmentNotes] = useState<string>('');

  // Submission & status
  const [saving, setSaving] = useState(false);
  const [savedPrescription, setSavedPrescription] = useState<Prescription | null>(null);
  const [savedAppointmentInfo, setSavedAppointmentInfo] = useState<{
    date: string;
    doctorName?: string | undefined;
    slot: string;
  } | null>(null);

  // Fetch doctors on mount
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const res = await api.get('doctors');
        const list = Array.isArray(res.data) ? res.data : (res.data as any)?.data || [];
        if (active) {
          setDoctors(list);
          if (list.length > 0 && !selectedDoctorId) {
            setSelectedDoctorId(list[0].id);
          }
        }
      } catch (err) {
        console.error('Failed to load doctors:', err);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Keep diagnosis synced if managementPlan changes
  useEffect(() => {
    if (managementPlan?.provisionalDiagnosis) {
      setDiagnosis(managementPlan.provisionalDiagnosis);
      setAppointmentPurpose(`Follow-up Consultation for ${managementPlan.provisionalDiagnosis}`);
    }
    if (managementPlan?.investigationsOrdered?.length) {
      setLabTests(managementPlan.investigationsOrdered);
    }
    if (managementPlan?.dietaryAdvice) {
      setGeneralInstructions(managementPlan.dietaryAdvice);
    }
  }, [managementPlan]);

  // Handle Quick Follow-up Days selector
  const handleSelectFollowUpDays = (days: number) => {
    setFollowUpDays(days);
    setAppointmentDate(dayjs().add(days, 'day').format('YYYY-MM-DD'));
  };

  // Medicine table management
  const addMedicineRow = () => {
    setMedicines((prev) => [
      ...prev,
      {
        name: '',
        dosage: '1 tablet',
        frequency: 'Twice Daily (BD)',
        duration: '5 Days',
        foodInstruction: 'After Food',
        instructions: '',
      },
    ]);
  };

  const removeMedicineRow = (index: number) => {
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateMedicineRow = (index: number, field: keyof PrescribedMedicineRow, val: string) => {
    setMedicines((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: val } : m))
    );
  };

  // Lab test management
  const addLabTest = () => {
    const trimmed = newLabTestInput.trim();
    if (trimmed && !labTests.includes(trimmed)) {
      setLabTests((prev) => [...prev, trimmed]);
      setNewLabTestInput('');
    }
  };

  const removeLabTest = (test: string) => {
    setLabTests((prev) => prev.filter((t) => t !== test));
  };

  // Handle Unified Save & Submit
  const handleSavePrescriptionAndAppointment = async () => {
    setSaving(true);
    try {
      // 0. Resolve Patient ID
      let resolvedPatientId = patient.id;
      if (!resolvedPatientId && ensurePatientSaved) {
        try {
          resolvedPatientId = await ensurePatientSaved();
        } catch (saveErr: unknown) {
          staticMessage.error(getErrorMessage(saveErr, 'Please fill in required patient basic details first.'));
          setSaving(false);
          return;
        }
      }

      if (!resolvedPatientId) {
        staticMessage.error('Please save patient basic details first before submitting prescription.');
        setSaving(false);
        return;
      }

      // 1. Prepare valid medicines
      const validMeds = medicines
        .filter((m) => m.name.trim().length > 0)
        .map((m) => ({
          name: m.name.trim(),
          dosage: m.dosage.trim() || '1 tablet',
          frequency: m.frequency.trim() || 'Once Daily (OD)',
          duration: m.duration.trim() || '5 Days',
          mealTiming: m.foodInstruction.trim() || undefined,
          instructions: m.instructions.trim() || undefined,
        }));

      // 2. Prepare lab tests
      const validLabs = labTests
        .filter((t) => t.trim().length > 0)
        .map((t) => ({ testName: t.trim() }));

      // 3. Prepare vitals payload
      const vitalsPayload = initialVitals
        ? {
            blood_pressure: initialVitals.bloodPressure || null,
            blood_sugar: initialVitals.bloodSugar || null,
            body_temperature: initialVitals.temperature || null,
            height_cm: initialVitals.heightCm ? Number(initialVitals.heightCm) : null,
            weight_kg: initialVitals.weightKg ? Number(initialVitals.weightKg) : null,
          }
        : undefined;

      // 4. Create Prescription
      const payload: CreatePrescriptionPayload = {
        patientId: resolvedPatientId,
        doctorId: selectedDoctorId || undefined,
        diagnosis: diagnosis.trim() || 'General Consultation',
        generalInstructions: generalInstructions.trim() || undefined,
        prescriptionType: 'system',
        followUpDays: followUpDays || undefined,
        followUpDate: appointmentDate || undefined,
        medicines: validMeds,
        labTests: validLabs,
        vitals: vitalsPayload,
      };

      const createdRx = await prescriptionsApi.create(payload);
      setSavedPrescription(createdRx);
      onPrescriptionSaved?.(createdRx);

      // 5. If appointment booking is checked, schedule it
      if (bookAppointment && appointmentDate) {
        try {
          const selectedDoc = doctors.find((d) => d.id === selectedDoctorId);
          await api.post('appointments', {
            doctorId: selectedDoctorId || undefined,
            patientId: resolvedPatientId,
            patientName: patient.name,
            patientPhone: patient.phone || undefined,
            date: appointmentDate,
            purpose: appointmentPurpose.trim() || 'Follow-up Consultation',
            patientNote: appointmentNotes.trim() || undefined,
          });

          setSavedAppointmentInfo({
            date: appointmentDate,
            doctorName: selectedDoc?.name || undefined,
            slot: appointmentSlot,
          });
          onAppointmentScheduled?.();
        } catch (apptErr) {
          console.warn('Could not schedule formal appointment slot:', apptErr);
        }
      }

      staticMessage.success('Prescription and follow-up consultation saved successfully!');
    } catch (err: unknown) {
      staticMessage.error(getErrorMessage(err, 'Failed to save prescription and follow-up appointment'));
    } finally {
      setSaving(false);
    }
  };

  const doctorOptions: SearchableSelectOption[] = doctors.map((d) => ({
    value: d.id,
    label: d.name,
    sublabel: [d.specialty, d.specialization, d.department].filter(Boolean).join(' · '),
  }));

  return (
    <div className="prescription-appointment-tab-root" style={{ padding: '24px 28px', maxWidth: 1040, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Patient Context & Assessment Banner ── */}
      <div
        style={{
          padding: '16px 20px',
          background: 'linear-gradient(to right, #ffffff, #eff6ff)',
          borderRadius: 12,
          border: '1px solid #bfdbfe',
          boxShadow: '0 1px 3px rgba(37, 99, 235, 0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', display: 'grid', placeItems: 'center' }}>
              <Stethoscope size={16} />
            </div>
            <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
              Active Clinical Assessment (From Plan of Management)
            </span>
          </div>
          {diagnosis && (
            <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 12, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: 650 }}>
              {diagnosis}
            </span>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, fontSize: 12.5, color: '#334155' }}>
          <div>
            <span style={{ fontWeight: 650, color: '#64748b' }}>Primary Diagnosis: </span>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>{diagnosis}</span>
          </div>
          <div>
            <span style={{ fontWeight: 650, color: '#64748b' }}>Ordered Investigations: </span>
            {labTests.length ? (
              <span style={{ fontWeight: 600, color: '#7c3aed' }}>{labTests.join(', ')}</span>
            ) : (
              <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>None ordered</span>
            )}
          </div>
        </div>
      </div>

      {savedPrescription ? (
        /* ── SAVED SUCCESS SUMMARY CARD ── */
        <div style={{ background: '#ffffff', borderRadius: 12, border: '1.5px solid #86efac', padding: '24px 28px', boxShadow: '0 2px 8px rgba(22, 163, 74, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', display: 'grid', placeItems: 'center' }}>
              <Check size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#166534' }}>
                Prescription Formulated &amp; Follow-up Confirmed!
              </h3>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                Prescription ID #{savedPrescription.id.slice(0, 8)} attached to {patient.name}.
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 20 }}>
            {/* Prescription summary */}
            <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                Prescribed Medicines ({savedPrescription.medicines?.length || 0})
              </span>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#334155' }}>
                {savedPrescription.medicines?.map((m, i) => (
                  <li key={i} style={{ marginBottom: 4 }}>
                    <strong>{m.medicine_name}</strong> {m.dosage ? `· ${m.dosage}` : ''} {m.frequency ? `· ${m.frequency}` : ''} {m.duration ? `· ${m.duration}` : ''}
                  </li>
                ))}
              </ul>
            </div>

            {/* Follow-up appointment summary */}
            {savedAppointmentInfo && (
              <div style={{ padding: 14, background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
                  Follow-up Review Consultation
                </span>
                <div style={{ fontSize: 12.5, color: '#0f172a', fontWeight: 650, marginBottom: 4 }}>
                  Date: {dayjs(savedAppointmentInfo.date).format('dddd, MMMM D, YYYY')}
                </div>
                {savedAppointmentInfo.doctorName && (
                  <div style={{ fontSize: 12, color: '#334155' }}>
                    Consulting Doctor: Dr. {savedAppointmentInfo.doctorName}
                  </div>
                )}
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                  Slot: {savedAppointmentInfo.slot}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setSavedPrescription(null)}
              className="patient-footer-btn patient-footer-btn-secondary"
              style={{ fontSize: 12 }}
            >
              <RefreshCw size={14} />
              <span>Modify / Write Another Prescription</span>
            </button>

            {onComplete && (
              <button
                type="button"
                onClick={onComplete}
                className="patient-footer-btn patient-footer-btn-primary"
                style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <span>Continue to Appointments</span>
                <ChevronLeft size={15} style={{ transform: 'rotate(180deg)' }} />
              </button>
            )}
          </div>
        </div>
      ) : (
        /* ── INLINE PRESCRIPTION & APPOINTMENT EDITOR ── */
        <>
          {/* 1. PRESCRIPTIONS & MEDICATIONS TABLE */}
          <div
            className="patient-section-card"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              padding: '20px 22px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: '#eff6ff', color: '#2563eb', border: '1px solid #dbeafe', display: 'grid', placeItems: 'center' }}>
                  <Pill size={15} />
                </div>
                <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                  4. Prescriptions &amp; Medication Orders
                </h4>
              </div>
              <button
                type="button"
                onClick={addMedicineRow}
                className="patient-footer-btn patient-footer-btn-secondary"
                style={{ padding: '4px 12px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <Plus size={13} />
                <span>Add Medicine</span>
              </button>
            </div>

            {/* Medicines List Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Header row */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2.5fr 1.2fr 1.5fr 1.3fr 1.4fr 34px',
                  gap: 8,
                  padding: '0 8px',
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#64748b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <span>Medicine Name</span>
                <span>Dosage</span>
                <span>Frequency</span>
                <span>Duration</span>
                <span>Food Instruction</span>
                <span></span>
              </div>

              {medicines.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2.5fr 1.2fr 1.5fr 1.3fr 1.4fr 34px',
                    gap: 8,
                    alignItems: 'center',
                    backgroundColor: '#f8fafc',
                    padding: '8px 10px',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <input
                    type="text"
                    className="patient-form-input"
                    placeholder="e.g. Paracetamol 650mg, Metformin..."
                    value={m.name}
                    onChange={(e) => updateMedicineRow(idx, 'name', e.target.value)}
                    style={{ height: 32, fontSize: 12.5 }}
                  />

                  <input
                    type="text"
                    className="patient-form-input"
                    placeholder="e.g. 500mg, 1 tab"
                    value={m.dosage}
                    onChange={(e) => updateMedicineRow(idx, 'dosage', e.target.value)}
                    style={{ height: 32, fontSize: 12 }}
                  />

                  <SearchableSelect
                    size="sm"
                    searchable={false}
                    options={FREQUENCY_OPTIONS}
                    value={m.frequency}
                    onChange={(val) => updateMedicineRow(idx, 'frequency', val)}
                  />

                  <SearchableSelect
                    size="sm"
                    searchable={false}
                    options={DURATION_OPTIONS}
                    value={m.duration}
                    onChange={(val) => updateMedicineRow(idx, 'duration', val)}
                  />

                  <SearchableSelect
                    size="sm"
                    searchable={false}
                    options={FOOD_INSTRUCTION_OPTIONS}
                    value={m.foodInstruction}
                    onChange={(val) => updateMedicineRow(idx, 'foodInstruction', val)}
                  />

                  <button
                    type="button"
                    onClick={() => removeMedicineRow(idx)}
                    disabled={medicines.length === 1}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: medicines.length === 1 ? 'not-allowed' : 'pointer',
                      color: medicines.length === 1 ? '#cbd5e1' : '#ef4444',
                      padding: 4,
                      display: 'grid',
                      placeItems: 'center',
                    }}
                    title="Remove medicine"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            {/* Diagnostic Labs & Instructions Sub-Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 4 }}>
              {/* Diagnostic Labs ordered */}
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: 11.5, fontWeight: 650, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <FlaskConical size={13} style={{ color: '#7c3aed' }} />
                  <span>Prescribed Diagnostic Labs &amp; Imaging</span>
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
                  {labTests.map((t) => (
                    <span
                      key={t}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: '#faf5ff',
                        border: '1px solid #d8b4fe',
                        color: '#6b21a8',
                        fontWeight: 600,
                      }}
                    >
                      <span>{t}</span>
                      <button
                        type="button"
                        onClick={() => removeLabTest(t)}
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#a855f7' }}
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    type="text"
                    className="patient-form-input"
                    placeholder="Add diagnostic test..."
                    value={newLabTestInput}
                    onChange={(e) => setNewLabTestInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addLabTest();
                      }
                    }}
                    style={{ height: 30, fontSize: 11.5, flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={addLabTest}
                    className="ui-btn ui-btn-neutral"
                    style={{ height: 30, padding: '0 10px', fontSize: 11.5 }}
                  >
                    + Add
                  </button>
                </div>
              </div>

              {/* General Dietary & Clinical Instructions */}
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: 11.5, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Doctor's Instructions &amp; Dietary Advice
                </label>
                <textarea
                  className="patient-form-input"
                  rows={2}
                  placeholder="e.g. Drink 3L water daily, take medicines strictly after meals, avoid spicy foods..."
                  value={generalInstructions}
                  onChange={(e) => setGeneralInstructions(e.target.value)}
                  style={{ width: '100%', fontSize: 11.5, height: 68 }}
                />
              </div>
            </div>
          </div>

          {/* 2. SCHEDULE FOLLOW-UP APPOINTMENT (INSIDE THE PRESCRIPTION TAB!) */}
          <div
            className="patient-section-card"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              padding: '20px 22px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', display: 'grid', placeItems: 'center' }}>
                  <Calendar size={15} />
                </div>
                <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                  5. Schedule Follow-up Consultation &amp; Review Visit
                </h4>
              </div>

              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  fontWeight: 650,
                  color: bookAppointment ? '#15803d' : '#64748b',
                  backgroundColor: bookAppointment ? '#f0fdf4' : '#f1f5f9',
                  border: `1px solid ${bookAppointment ? '#bbf7d0' : '#e2e8f0'}`,
                  borderRadius: 20,
                  padding: '4px 12px',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={bookAppointment}
                  onChange={(e) => setBookAppointment(e.target.checked)}
                  style={{ accentColor: '#16a34a', width: 14, height: 14, cursor: 'pointer' }}
                />
                <span>Schedule Follow-up with this Prescription</span>
              </label>
            </div>

            {bookAppointment && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Quick Timeline Selector */}
                <div>
                  <span style={{ fontSize: 11.5, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
                    Recommended Follow-up Timeframe:
                  </span>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {[3, 5, 7, 10, 14, 30].map((days) => (
                      <button
                        key={days}
                        type="button"
                        onClick={() => handleSelectFollowUpDays(days)}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 16,
                          fontSize: 11.5,
                          fontWeight: followUpDays === days ? 700 : 500,
                          border: followUpDays === days ? '1.5px solid #16a34a' : '1px solid #e2e8f0',
                          background: followUpDays === days ? '#f0fdf4' : '#ffffff',
                          color: followUpDays === days ? '#15803d' : '#64748b',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {days < 7 ? `${days} Days` : days === 7 ? '1 Week' : days === 14 ? '2 Weeks' : days === 30 ? '1 Month' : `${days} Days`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Doctor, Date & Slot Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                  <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
                      Consulting Doctor
                    </label>
                    <SearchableSelect
                      options={doctorOptions}
                      value={selectedDoctorId}
                      onChange={(val) => setSelectedDoctorId(val)}
                      placeholder="Select consulting doctor..."
                    />
                  </div>

                  <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
                      Appointment Date
                    </label>
                    <input
                      type="date"
                      className="patient-form-input"
                      value={appointmentDate}
                      onChange={(e) => {
                        setAppointmentDate(e.target.value);
                        setFollowUpDays(undefined);
                      }}
                      style={{ height: 34, fontSize: 12.5 }}
                    />
                  </div>

                  <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
                      Preferred Slot / Session
                    </label>
                    <input
                      type="text"
                      className="patient-form-input"
                      value={appointmentSlot}
                      onChange={(e) => setAppointmentSlot(e.target.value)}
                      placeholder="e.g. 10:30 AM or Morning Session"
                      style={{ height: 34, fontSize: 12.5 }}
                    />
                  </div>
                </div>

                {/* Purpose & Notes */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
                      Consultation Purpose
                    </label>
                    <input
                      type="text"
                      className="patient-form-input"
                      value={appointmentPurpose}
                      onChange={(e) => setAppointmentPurpose(e.target.value)}
                      placeholder="Purpose of review visit..."
                      style={{ height: 32, fontSize: 12 }}
                    />
                  </div>

                  <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
                      Review Notes for Next Visit
                    </label>
                    <input
                      type="text"
                      className="patient-form-input"
                      value={appointmentNotes}
                      onChange={(e) => setAppointmentNotes(e.target.value)}
                      placeholder="e.g. Bring fasting blood sugar report..."
                      style={{ height: 32, fontSize: 12 }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Unified Footer Actions */}
          <div
            className="patient-drawer-footer"
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingTop: 16,
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              onClick={onPrevious}
              className="patient-footer-btn patient-footer-btn-secondary"
            >
              <ChevronLeft size={15} />
              <span>Previous: Plan of Management</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {onComplete && (
                <button
                  type="button"
                  onClick={onComplete}
                  className="patient-footer-btn patient-footer-btn-secondary"
                  style={{ fontSize: 12.5 }}
                >
                  <span>Skip to Appointments</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleSavePrescriptionAndAppointment}
                disabled={saving}
                className="patient-footer-btn patient-footer-btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.28)',
                  padding: '0 24px',
                  height: 40,
                  fontSize: 13,
                  fontWeight: 650,
                }}
              >
                <Check size={16} />
                <span>
                  {saving
                    ? 'Saving Records...'
                    : bookAppointment
                    ? 'Save Prescription & Schedule Appointment'
                    : 'Save Prescription Order'}
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default PrescriptionAndAppointmentTab;
