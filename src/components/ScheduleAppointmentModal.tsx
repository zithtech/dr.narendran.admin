import { App } from 'antd';
import {
  CalendarPlus,
  Clock,
  Loader2,
  Stethoscope,
  Sun,
  Sunset,
  User,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { AppointmentSlot, DateSlotSummary } from '../types/appointment';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import type { Doctor } from './DoctorModal';
import type { Patient } from './PatientModal';
import { Field, Modal } from './ui/Modal';
import { Alert, Badge, cx } from './ui/primitives';
import { SearchableSelect, type SearchableSelectOption } from './ui/SearchableSelect';

interface ScheduleAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedDoctorId?: string | undefined;
  preselectedPatientId?: string | undefined;
}

const COMMON_PURPOSES = [
  'General Consultation',
  'Follow-up Visit',
  'Routine Health Checkup',
  'Second Opinion',
  'Review Lab Reports',
  'Medication Review',
];

export default function ScheduleAppointmentModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedDoctorId,
  preselectedPatientId,
}: ScheduleAppointmentModalProps) {
  const { message } = App.useApp();
  const todayStr = new Date().toISOString().split('T')[0] ?? '';

  // Mode: existing vs new patient
  const [patientMode, setPatientMode] = useState<'existing' | 'new'>('existing');

  // Existing Patient state
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // New Patient state
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');

  // Doctor state
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(preselectedDoctorId || '');

  // Schedule date & slots
  const [appointmentDate, setAppointmentDate] = useState(todayStr);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slots, setSlots] = useState<AppointmentSlot[]>([]);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');

  // Purpose & Notes
  const [purpose, setPurpose] = useState('General Consultation');
  const [patientNote, setPatientNote] = useState('');

  // Form handling
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch doctors and patients on modal open
  const fetchDoctors = useCallback(async () => {
    setDoctorsLoading(true);
    try {
      const res = await api.get<Doctor[]>('doctors');
      const docList = Array.isArray(res.data) ? res.data : (res.data as any).data || [];
      setDoctors(docList);
      if (!selectedDoctorId && docList.length > 0) {
        setSelectedDoctorId(docList[0].id);
      }
    } catch (err: unknown) {
      console.error('Failed to load doctors:', err);
    } finally {
      setDoctorsLoading(false);
    }
  }, [selectedDoctorId]);

  const fetchPatients = useCallback(async () => {
    setPatientsLoading(true);
    try {
      const res = await api.get<Patient[]>('patients');
      const patList = Array.isArray(res.data) ? res.data : (res.data as any).data || [];
      setPatients(patList);
      if (preselectedPatientId) {
        const found = patList.find((p: Patient) => p.id === preselectedPatientId);
        if (found) setSelectedPatient(found);
      }
    } catch (err: unknown) {
      console.error('Failed to load patients:', err);
    } finally {
      setPatientsLoading(false);
    }
  }, [preselectedPatientId]);

  // Fetch slots for selected doctor and date
  const fetchSlots = useCallback(async (docId: string, date: string) => {
    if (!docId || !date) {
      setSlots([]);
      return;
    }
    setSlotsLoading(true);
    setError('');
    try {
      const response = await api.get<{
        status: string;
        data: { summaries: DateSlotSummary[] };
      }>('appointments/slots', {
        params: {
          doctorId: docId,
          startDate: date,
          days: 1,
          locationId: 'all',
        },
      });

      const summaries = response.data?.data?.summaries || [];
      const daySlots = summaries[0]?.slots || [];
      setSlots(daySlots);
      setSelectedSlotId('');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to fetch doctor availability slots.'));
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, []);

  // Initialize data when modal opens
  useEffect(() => {
    if (isOpen) {
      void fetchDoctors();
      void fetchPatients();
      setAppointmentDate(todayStr);
      setError('');
      setPurpose('General Consultation');
      setPatientNote('');
      setSelectedSlotId('');
      if (preselectedDoctorId) {
        setSelectedDoctorId(preselectedDoctorId);
      }
      if (!preselectedPatientId) {
        setSelectedPatient(null);
      }
      setNewPatientName('');
      setNewPatientPhone('');
    }
  }, [isOpen, fetchDoctors, fetchPatients, todayStr, preselectedPatientId]);

  // Fetch slots when doctor or date changes
  useEffect(() => {
    if (isOpen && selectedDoctorId && appointmentDate) {
      void fetchSlots(selectedDoctorId, appointmentDate);
    }
  }, [isOpen, selectedDoctorId, appointmentDate, fetchSlots]);

  // Map patient list to SearchableSelect options with rich search terms
  const patientOptions = useMemo<SearchableSelectOption[]>(() => {
    return patients.map((pat) => ({
      value: pat.id,
      label: pat.name,
      sublabel: [pat.phone, pat.email].filter(Boolean).join(' · ') || undefined,
      badge: pat.branch_name || undefined,
      badgeTone: 'neutral' as const,
      extraSearchTerms: [pat.phone, pat.email, pat.blood_group, pat.branch_name].filter(Boolean) as string[],
    }));
  }, [patients]);

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === selectedDoctorId) || null,
    [doctors, selectedDoctorId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validations
    if (patientMode === 'existing') {
      if (!selectedPatient) {
        setError('Please search and select an existing patient.');
        return;
      }
    } else {
      if (!newPatientName.trim()) {
        setError("Please enter the patient's name.");
        return;
      }
      if (!/^[a-zA-Z\s]+$/.test(newPatientName.trim())) {
        setError('Patient name can only contain alphabetic letters and spaces.');
        return;
      }
      if (!newPatientPhone.trim()) {
        setError("Please enter the patient's phone number.");
        return;
      }
      const digits = newPatientPhone.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) {
        setError('Patient phone number must contain between 10 and 15 digits.');
        return;
      }
    }

    if (!selectedDoctorId) {
      setError('Please select a doctor.');
      return;
    }

    if (!selectedSlotId) {
      setError('Please select an available time slot for the appointment.');
      return;
    }

    if (!purpose.trim()) {
      setError('Please specify the purpose of the appointment.');
      return;
    }

    setSubmitting(true);

    try {
      const payload: Record<string, any> = {
        doctorId: selectedDoctorId,
        slotId: selectedSlotId,
        purpose: purpose.trim(),
        patientNote: patientNote.trim() || undefined,
      };

      if (patientMode === 'existing' && selectedPatient) {
        payload['patientId'] = selectedPatient.id;
        payload['patientName'] = selectedPatient.name;
        payload['patientPhone'] = selectedPatient.phone || undefined;
      } else {
        payload['patientName'] = newPatientName.trim();
        payload['patientPhone'] = newPatientPhone.trim();
      }

      await api.post('appointments', payload);
      message?.success?.('Appointment scheduled successfully!');
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(
        getErrorMessage(
          err,
          'Failed to schedule appointment. The slot may have already been booked by another user (Double booking prevented).'
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Group slots by session
  const morningSlots = slots.filter((s) => s.session === 'morning');
  const afternoonSlots = slots.filter((s) => s.session === 'afternoon');
  const eveningSlots = slots.filter((s) => s.session === 'evening');

  const renderSlotButton = (slot: AppointmentSlot) => {
    const isSelected = selectedSlotId === slot.id;
    const isBooked = slot.isBooked;

    const timeLabel = slot.start_time
      ? new Date(`2000-01-01T${slot.start_time}`).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      : slot.slotTime
        ? new Date(slot.slotTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
        : slot.id;

    return (
      <button
        key={slot.id}
        type="button"
        disabled={isBooked || submitting}
        onClick={() => {
          if (!isBooked) {
            setSelectedSlotId(slot.id);
            setError('');
          }
        }}
        title={isBooked ? 'Slot already booked (Double booking prevented)' : `Book for ${timeLabel}`}
        style={{
          padding: '8px 10px',
          borderRadius: 8,
          fontSize: 12.5,
          fontWeight: isSelected ? 700 : 500,
          border: isSelected
            ? '1.5px solid #7c3aed'
            : isBooked
              ? '1px dashed #cbd5e1'
              : '1px solid #e2e8f0',
          background: isSelected
            ? '#f5f3ff'
            : isBooked
              ? '#f8fafc'
              : '#ffffff',
          color: isSelected
            ? '#6d28d9'
            : isBooked
              ? '#94a3b8'
              : '#1e293b',
          boxShadow: isSelected ? '0 2px 6px rgba(124, 58, 237, 0.18)' : 'none',
          cursor: isBooked ? 'not-allowed' : 'pointer',
          opacity: isBooked ? 0.6 : 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          transition: 'all 0.15s ease',
        }}
      >
        <span>{timeLabel}</span>
        {isBooked ? (
          <span style={{ fontSize: 9.5, textTransform: 'uppercase', color: '#ef4444', fontWeight: 600 }}>
            Booked
          </span>
        ) : (
          <span style={{ fontSize: 9.5, color: '#10b981', fontWeight: 500 }}>
            Available
          </span>
        )}
      </button>
    );
  };

  return (
    <Modal
      open={isOpen}
      onClose={submitting ? () => undefined : onClose}
      variant="drawer"
      size="lg"
      className="schedule-appointment-drawer-modal"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
              color: '#7c3aed',
              border: '1px solid #c4b5fd',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(124, 58, 237, 0.16)',
            }}
          >
            <CalendarPlus size={18} />
          </div>
          <div>
            <div style={{ fontSize: 16.5, fontWeight: 700, color: 'var(--ui-text, #0f172a)', letterSpacing: '-0.01em' }}>
              Schedule New Appointment
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              Book an appointment for an existing patient or register a new patient booking
            </div>
          </div>
        </div>
      }
      description=""
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
        <style>{`
          .schedule-appointment-drawer-modal {
            width: min(740px, 100vw) !important;
            max-width: 740px !important;
            background: #ffffff;
            box-shadow: -12px 0 36px rgba(15, 23, 42, 0.14) !important;
          }
          .schedule-appointment-drawer-modal .ui-modal-head {
            padding: 18px 26px;
            background: linear-gradient(180deg, #faf5ff 0%, #ffffff 100%);
            border-bottom: 1px solid #f1f5f9;
          }
          .schedule-appointment-drawer-modal .ui-modal-head h2 {
            font-size: 16.5px;
            margin: 0;
          }
          .schedule-appointment-drawer-modal .ui-modal-body {
            padding: 20px 24px;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            gap: 14px;
            max-height: none !important;
            flex: 1;
            overflow-y: auto;
          }
          .sched-section-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 18px 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
            display: flex;
            flex-direction: column;
            gap: 14px;
            transition: border-color 0.15s ease;
          }
          .sched-section-card:hover {
            border-color: #cbd5e1;
          }
          .sched-section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid #f1f5f9;
          }
          .sched-section-badge {
            width: 26px;
            height: 26px;
            border-radius: 7px;
            background: #f5f3ff;
            color: #7c3aed;
            border: 1px solid #ede9fe;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .sched-section-badge svg {
            display: block;
            margin: auto;
          }
          .sched-section-tag {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.06em;
            color: #475569;
            text-transform: uppercase;
          }
          .schedule-appointment-drawer-modal .ui-input {
            height: 38px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 13px;
            transition: all 0.15s ease;
          }
          .schedule-appointment-drawer-modal .ui-input:focus {
            border-color: #7c3aed !important;
            box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12) !important;
            outline: none;
          }
          .sched-submit-btn {
            background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%) !important;
            box-shadow: 0 2px 8px rgba(124, 58, 237, 0.28) !important;
            border: none !important;
            color: #ffffff !important;
          }
          .sched-submit-btn:hover:not(:disabled) {
            background: linear-gradient(135deg, #6d28d9 0%, #5b21b6 100%) !important;
            box-shadow: 0 4px 12px rgba(124, 58, 237, 0.36) !important;
          }
        `}</style>
        <div className="ui-modal-body">
          {error && <Alert>{error}</Alert>}

          {/* Section 1: Patient Selection */}
          <div className="sched-section-card">
            <div className="sched-section-header">
              <div className="sched-section-badge">
                <User size={13} />
              </div>
              <div className="sched-section-tag">
                Patient Selection
              </div>
            </div>

            {/* Patient Mode Tabs: Existing vs New Patient */}
            <div
              style={{
                display: 'flex',
                background: '#f1f5f9',
                padding: 3,
                borderRadius: 8,
                border: '1px solid #e2e8f0',
              }}
            >
              <button
                type="button"
                className={cx('ui-btn', patientMode === 'existing' && 'is-active')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  borderRadius: 6,
                  height: 34,
                  fontSize: 12.5,
                  fontWeight: 600,
                  boxShadow: patientMode === 'existing' ? '0 1px 3px rgba(124, 58, 237, 0.2)' : 'none',
                  background: patientMode === 'existing' ? '#7c3aed' : 'transparent',
                  color: patientMode === 'existing' ? '#ffffff' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => {
                  setPatientMode('existing');
                  setError('');
                }}
              >
                <UserCheck size={15} />
                <span>Existing Patient</span>
              </button>

              <button
                type="button"
                className={cx('ui-btn', patientMode === 'new' && 'is-active')}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  borderRadius: 6,
                  height: 34,
                  fontSize: 12.5,
                  fontWeight: 600,
                  boxShadow: patientMode === 'new' ? '0 1px 3px rgba(124, 58, 237, 0.2)' : 'none',
                  background: patientMode === 'new' ? '#7c3aed' : 'transparent',
                  color: patientMode === 'new' ? '#ffffff' : '#475569',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onClick={() => {
                  setPatientMode('new');
                  setError('');
                }}
              >
                <UserPlus size={15} />
                <span>New Patient</span>
              </button>
            </div>

            {patientMode === 'existing' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Field label="Select Patient" required hint="Search registered patients by name, phone, or email">
                  <SearchableSelect
                    id="schedule-patient-select"
                    value={selectedPatient?.id || ''}
                    onChange={(patId) => {
                      const found = patients.find((p) => p.id === patId);
                      setSelectedPatient(found || null);
                      setError('');
                    }}
                    disabled={patientsLoading || submitting}
                    required
                    clearable={true}
                    onClear={() => setSelectedPatient(null)}
                    searchable={true}
                    placeholder={patientsLoading ? 'Loading patients...' : 'Search or choose patient...'}
                    searchPlaceholder="Search by name, phone number, email, branch..."
                    options={patientOptions}
                    emptyText='No matching patients found. Switch to "New Patient" above to register.'
                  />
                </Field>

                {selectedPatient && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      borderRadius: 8,
                      fontSize: 12.5,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
                          color: '#ffffff',
                          display: 'grid',
                          placeItems: 'center',
                          fontWeight: 700,
                          fontSize: 13,
                          boxShadow: '0 2px 4px rgba(124, 58, 237, 0.2)',
                          flexShrink: 0,
                        }}
                      >
                        {selectedPatient.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: '#0f172a' }}>
                          {selectedPatient.name}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                          {[selectedPatient.phone, selectedPatient.email, selectedPatient.blood_group]
                            .filter(Boolean)
                            .join(' · ') || 'No contact details'}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {selectedPatient.branch_name && (
                        <Badge tone="violet">{selectedPatient.branch_name}</Badge>
                      )}
                      <button
                        type="button"
                        className="ui-btn ui-btn-subtle"
                        style={{ fontSize: 11.5, height: 28, padding: '0 10px', borderRadius: 6 }}
                        onClick={() => setSelectedPatient(null)}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: 12,
                }}
              >
                <Field label="Patient Full Name" required hint="Letters & spaces only (no numbers/symbols)">
                  <input
                    type="text"
                    className="ui-input"
                    placeholder="Enter full name"
                    value={newPatientName}
                    onKeyDown={(e) => {
                      if (
                        e.key === 'Backspace' ||
                        e.key === 'Tab' ||
                        e.key === 'Enter' ||
                        e.key === 'Delete' ||
                        e.key === 'Escape' ||
                        e.key.startsWith('Arrow') ||
                        e.ctrlKey ||
                        e.metaKey
                      ) {
                        return;
                      }
                      if (!/^[a-zA-Z\s]$/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => setNewPatientName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                    required
                  />
                </Field>
                <Field label="Patient Phone Number" required hint="Digits only (10-15 digits)">
                  <input
                    type="tel"
                    className="ui-input"
                    placeholder="Enter contact number"
                    value={newPatientPhone}
                    onKeyDown={(e) => {
                      if (
                        e.key === 'Backspace' ||
                        e.key === 'Tab' ||
                        e.key === 'Enter' ||
                        e.key === 'Delete' ||
                        e.key === 'Escape' ||
                        e.key.startsWith('Arrow') ||
                        e.ctrlKey ||
                        e.metaKey
                      ) {
                        return;
                      }
                      if (!/^[0-9+\s-]$/.test(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => setNewPatientPhone(e.target.value.replace(/[^0-9+\s-]/g, ''))}
                    required
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Section 2: Doctor & Consultation Date */}
          <div className="sched-section-card">
            <div className="sched-section-header">
              <div className="sched-section-badge">
                <Stethoscope size={13} />
              </div>
              <div className="sched-section-tag">
                Doctor & Date Selection
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: 14,
              }}
            >
              <Field label="Select Doctor" required hint="Choose the consulting physician">
                <SearchableSelect
                  value={selectedDoctorId}
                  onChange={(val) => {
                    setSelectedDoctorId(val);
                    setSelectedSlotId('');
                  }}
                  disabled={doctorsLoading || submitting}
                  required
                  searchable={true}
                  placeholder="Select a doctor..."
                  searchPlaceholder="Search doctor or specialty..."
                  options={doctors.map((doc) => ({
                    value: doc.id,
                    label: doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`,
                    sublabel: doc.specialization || 'General',
                    badge: doc.branch_name || doc.hospital_name || undefined,
                    badgeTone: 'violet' as const,
                  }))}
                />
              </Field>

              <Field label="Appointment Date" required hint="Select target date">
                <input
                  type="date"
                  className="ui-input"
                  min={todayStr}
                  value={appointmentDate}
                  onChange={(e) => {
                    setAppointmentDate(e.target.value);
                    setSelectedSlotId('');
                  }}
                  disabled={submitting}
                  required
                />
              </Field>
            </div>

            {selectedDoctor && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 14px',
                  borderRadius: 8,
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  fontSize: 12.5,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Stethoscope size={15} style={{ color: '#7c3aed' }} />
                  <span style={{ fontWeight: 600, color: '#0f172a' }}>
                    {selectedDoctor.name.startsWith('Dr.') ? selectedDoctor.name : `Dr. ${selectedDoctor.name}`}
                  </span>
                  <span style={{ color: '#64748b' }}>· {selectedDoctor.specialization || 'General'}</span>
                </div>
                <div>
                  <Badge tone="violet">
                    {selectedDoctor.branch_name || selectedDoctor.hospital_name || 'Main Clinic'}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Consultation Slots */}
          <div className="sched-section-card">
            <div className="sched-section-header">
              <div className="sched-section-badge">
                <Clock size={13} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span className="sched-section-tag">
                  Consultation Slots
                </span>
                <span style={{ fontSize: 11, color: '#64748b' }}>
                  Double-booking strictly prohibited
                </span>
              </div>
            </div>

            {slotsLoading ? (
              <div
                style={{
                  padding: 24,
                  textAlign: 'center',
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Loader2 size={16} className="is-spinning" style={{ color: '#7c3aed' }} />
                <span>Checking doctor availability...</span>
              </div>
            ) : slots.length === 0 ? (
              <div
                style={{
                  padding: 18,
                  textAlign: 'center',
                  borderRadius: 8,
                  background: '#f8fafc',
                  border: '1px dashed #cbd5e1',
                  color: '#64748b',
                  fontSize: 12.5,
                }}
              >
                No consultation slots available for this doctor on {appointmentDate}. Doctor may be off duty or date is blocked.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {morningSlots.length > 0 && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: '#475569',
                        marginBottom: 7,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <Sun size={13} style={{ color: '#d97706' }} />
                      <span>Morning Slots</span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                        gap: 7,
                      }}
                    >
                      {morningSlots.map(renderSlotButton)}
                    </div>
                  </div>
                )}

                {afternoonSlots.length > 0 && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: '#475569',
                        marginBottom: 7,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <Clock size={13} style={{ color: '#7c3aed' }} />
                      <span>Afternoon Slots</span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                        gap: 7,
                      }}
                    >
                      {afternoonSlots.map(renderSlotButton)}
                    </div>
                  </div>
                )}

                {eveningSlots.length > 0 && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: '#475569',
                        marginBottom: 7,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <Sunset size={13} style={{ color: '#6d28d9' }} />
                      <span>Evening Slots</span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                        gap: 7,
                      }}
                    >
                      {eveningSlots.map(renderSlotButton)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Purpose & Notes */}
          <div className="sched-section-card">
            <div className="sched-section-header">
              <div className="sched-section-badge">
                <CalendarPlus size={13} />
              </div>
              <div className="sched-section-tag">
                Purpose & Notes
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Purpose of Visit" required hint="Select common reason or type custom">
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                  {COMMON_PURPOSES.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className="ui-btn"
                      style={{
                        fontSize: 11.5,
                        height: 28,
                        padding: '0 10px',
                        borderRadius: 6,
                        fontWeight: purpose === p ? 600 : 500,
                        background: purpose === p ? '#f5f3ff' : '#f8fafc',
                        border: purpose === p ? '1.5px solid #7c3aed' : '1px solid #e2e8f0',
                        color: purpose === p ? '#6d28d9' : '#475569',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => setPurpose(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  className="ui-input"
                  placeholder="e.g. Consultation, Blood sugar follow-up, etc."
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  required
                />
              </Field>

              <Field label="Clinical / Administrative Notes" hint="Optional notes for the doctor or records">
                <textarea
                  className="ui-input"
                  rows={2}
                  placeholder="e.g. Patient complains of headache, referred by Branch A..."
                  value={patientNote}
                  onChange={(e) => setPatientNote(e.target.value)}
                  style={{ minHeight: 56, lineHeight: 1.4, padding: '8px 12px' }}
                />
              </Field>
            </div>
          </div>
        </div>

        {/* Docked Action Footer */}
        <div
          className="ui-modal-foot"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 10,
            padding: '14px 24px',
            borderTop: '1px solid #e2e8f0',
            background: '#ffffff',
            flexShrink: 0,
          }}
        >
          <button
            type="button"
            className="ui-btn ui-btn-subtle"
            onClick={onClose}
            disabled={submitting}
            style={{ height: 36, padding: '0 14px', borderRadius: 8, fontSize: 12.5 }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="ui-btn ui-btn-primary sched-submit-btn"
            disabled={submitting || !selectedSlotId}
            style={{
              height: 36,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              padding: '0 18px',
              fontWeight: 600,
              fontSize: 12.5,
              borderRadius: 8,
            }}
          >
            {submitting ? 'Scheduling...' : 'Schedule Appointment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
