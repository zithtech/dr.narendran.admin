import { App } from 'antd';
import {
  CalendarPlus,
  Clock,
  Loader2,
  Search,
  Stethoscope,
  Sun,
  Sunset,
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
  const [patientSearch, setPatientSearch] = useState('');
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
        setPatientSearch('');
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

  // Filter patients by search query
  const filteredPatients = useMemo(() => {
    if (!patientSearch.trim()) return patients.slice(0, 8);
    const q = patientSearch.toLowerCase();
    return patients
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.phone && p.phone.toLowerCase().includes(q)) ||
          (p.email && p.email.toLowerCase().includes(q))
      )
      .slice(0, 10);
  }, [patients, patientSearch]);

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
          borderRadius: 6,
          fontSize: 12.5,
          fontWeight: 500,
          border: isSelected
            ? '2px solid var(--ui-primary, #0284c7)'
            : isBooked
              ? '1px dashed var(--ui-border, #cbd5e1)'
              : '1px solid var(--ui-border, #cbd5e1)',
          background: isSelected
            ? 'var(--ui-primary-subtle, #e0f2fe)'
            : isBooked
              ? 'var(--ui-surface-disabled, #f1f5f9)'
              : 'var(--ui-surface, #ffffff)',
          color: isSelected
            ? 'var(--ui-primary, #0284c7)'
            : isBooked
              ? 'var(--ui-text-muted, #94a3b8)'
              : 'var(--ui-text, #1e293b)',
          cursor: isBooked ? 'not-allowed' : 'pointer',
          opacity: isBooked ? 0.6 : 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
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
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CalendarPlus size={20} className="text-primary" />
          <span>Schedule New Appointment</span>
        </div>
      }
      description="Book an appointment for an existing patient or register a new patient booking"
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="ui-modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
          {error && <Alert>{error}</Alert>}

          {/* Patient Mode Tabs: Existing vs New Patient */}
          <div style={{ marginBottom: 18 }}>
            <div
              style={{
                display: 'flex',
                background: 'var(--ui-surface-2, #f1f5f9)',
                padding: 3,
                borderRadius: 8,
                marginBottom: 12,
              }}
            >
              <button
                type="button"
                className={cx(
                  'ui-btn',
                  patientMode === 'existing' && 'ui-btn-primary'
                )}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  borderRadius: 6,
                  height: 36,
                  fontSize: 13,
                  fontWeight: 600,
                  boxShadow: patientMode === 'existing' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  background: patientMode === 'existing' ? undefined : 'transparent',
                  color: patientMode === 'existing' ? undefined : 'var(--ui-text, #334155)',
                  border: 'none',
                }}
                onClick={() => {
                  setPatientMode('existing');
                  setError('');
                }}
              >
                <UserCheck size={16} />
                <span>Existing Patient</span>
              </button>

              <button
                type="button"
                className={cx(
                  'ui-btn',
                  patientMode === 'new' && 'ui-btn-primary'
                )}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  borderRadius: 6,
                  height: 36,
                  fontSize: 13,
                  fontWeight: 600,
                  boxShadow: patientMode === 'new' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  background: patientMode === 'new' ? undefined : 'transparent',
                  color: patientMode === 'new' ? undefined : 'var(--ui-text, #334155)',
                  border: 'none',
                }}
                onClick={() => {
                  setPatientMode('new');
                  setError('');
                }}
              >
                <UserPlus size={16} />
                <span>New Patient</span>
              </button>
            </div>

            {patientMode === 'existing' ? (
              <div>
                {selectedPatient ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--ui-surface-2, #f0fdf4)',
                      border: '1px solid #bbf7d0',
                      borderRadius: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          background: '#dcfce7',
                          color: '#16a34a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                        }}
                      >
                        {selectedPatient.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: '#166534' }}>
                          {selectedPatient.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#15803d' }}>
                          {[selectedPatient.phone, selectedPatient.email, selectedPatient.blood_group]
                            .filter(Boolean)
                            .join(' · ') || 'No contact details'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="ui-btn ui-btn-subtle"
                      style={{ fontSize: 12, height: 30 }}
                      onClick={() => setSelectedPatient(null)}
                    >
                      Change Patient
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ position: 'relative', marginBottom: 8 }}>
                      <Search
                        size={16}
                        style={{
                          position: 'absolute',
                          left: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#94a3b8',
                        }}
                      />
                      <input
                        type="text"
                        className="ui-input"
                        style={{ paddingLeft: 34 }}
                        placeholder="Search patient by name, phone number, or email..."
                        value={patientSearch}
                        onChange={(e) => setPatientSearch(e.target.value)}
                        autoFocus
                      />
                    </div>

                    <div
                      style={{
                        maxHeight: 180,
                        overflowY: 'auto',
                        border: '1px solid var(--ui-border, #e2e8f0)',
                        borderRadius: 6,
                        background: 'var(--ui-surface, #ffffff)',
                      }}
                    >
                      {patientsLoading ? (
                        <div style={{ padding: 16, textAlign: 'center', color: '#64748b' }}>
                          <Loader2 size={16} className="animate-spin inline mr-2" />
                          Loading patients...
                        </div>
                      ) : filteredPatients.length === 0 ? (
                        <div style={{ padding: 16, textAlign: 'center', color: '#64748b', fontSize: 13 }}>
                          No patient matches "{patientSearch}". Try switching to "New Patient" above.
                        </div>
                      ) : (
                        filteredPatients.map((pat) => (
                          <div
                            key={pat.id}
                            onClick={() => {
                              setSelectedPatient(pat);
                              setPatientSearch('');
                              setError('');
                            }}
                            role="button"
                            tabIndex={0}
                            style={{
                              padding: '8px 12px',
                              borderBottom: '1px solid var(--ui-border, #f1f5f9)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: 13,
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div>
                              <strong style={{ color: 'var(--ui-text, #1e293b)' }}>{pat.name}</strong>
                              <span style={{ color: '#64748b', marginLeft: 8, fontSize: 12 }}>
                                {pat.phone || 'No phone'}
                              </span>
                            </div>
                            {pat.branch_name && (
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>{pat.branch_name}</span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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

          <hr style={{ border: 'none', borderTop: '1px solid var(--ui-border, #e2e8f0)', margin: '16px 0' }} />

          {/* Doctor & Date Selection */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 14,
              marginBottom: 16,
            }}
          >
            <Field label="Select Doctor" required hint="Choose the consulting physician">
              <select
                className="ui-input"
                value={selectedDoctorId}
                onChange={(e) => {
                  setSelectedDoctorId(e.target.value);
                  setSelectedSlotId('');
                }}
                disabled={doctorsLoading || submitting}
                required
              >
                {doctors.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`} (
                    {doc.specialization || 'General'})
                  </option>
                ))}
              </select>
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

          {/* Doctor Details summary & Availability Status */}
          {selectedDoctor && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: 6,
                background: 'var(--ui-surface-2, #f8fafc)',
                border: '1px solid var(--ui-border, #e2e8f0)',
                marginBottom: 14,
                fontSize: 12.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Stethoscope size={16} className="text-primary" />
                <span style={{ fontWeight: 600, color: 'var(--ui-text, #1e293b)' }}>
                  {selectedDoctor.name.startsWith('Dr.') ? selectedDoctor.name : `Dr. ${selectedDoctor.name}`}
                </span>
                <span style={{ color: '#64748b' }}>· {selectedDoctor.specialization || 'General'}</span>
              </div>
              <div>
                <Badge tone="blue">
                  {selectedDoctor.branch_name || selectedDoctor.hospital_name || 'Main Clinic'}
                </Badge>
              </div>
            </div>
          )}

          {/* Doctor Availability & Slot Selector */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="ui-field-label">
                Select Consultation Slot <em>*</em>
              </span>
              <span style={{ fontSize: 11.5, color: '#64748b' }}>
                Double-booking strictly prohibited
              </span>
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
                <Loader2 size={16} className="animate-spin text-primary" />
                <span>Checking doctor availability...</span>
              </div>
            ) : slots.length === 0 ? (
              <div
                style={{
                  padding: 18,
                  textAlign: 'center',
                  borderRadius: 6,
                  background: 'var(--ui-surface-2, #f8fafc)',
                  border: '1px dashed var(--ui-border, #cbd5e1)',
                  color: '#64748b',
                  fontSize: 13,
                }}
              >
                No consultation slots available for this doctor on {appointmentDate}. Doctor may be off duty or date is blocked.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {morningSlots.length > 0 && (
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: 'var(--ui-text-2, #475569)',
                        marginBottom: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <Sun size={13} className="text-amber-500" />
                      <span>Morning Slots</span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))',
                        gap: 6,
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
                        fontWeight: 600,
                        color: 'var(--ui-text-2, #475569)',
                        marginBottom: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <Clock size={13} className="text-blue-500" />
                      <span>Afternoon Slots</span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))',
                        gap: 6,
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
                        fontWeight: 600,
                        color: 'var(--ui-text-2, #475569)',
                        marginBottom: 6,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                      }}
                    >
                      <Sunset size={13} className="text-purple-500" />
                      <span>Evening Slots</span>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(105px, 1fr))',
                        gap: 6,
                      }}
                    >
                      {eveningSlots.map(renderSlotButton)}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--ui-border, #e2e8f0)', margin: '16px 0' }} />

          {/* Purpose & Notes */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Purpose of Visit" required hint="Select common reason or type custom">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                {COMMON_PURPOSES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className="ui-btn ui-btn-subtle"
                    style={{
                      fontSize: 11.5,
                      height: 26,
                      padding: '0 8px',
                      background: purpose === p ? 'var(--ui-primary-subtle, #e0f2fe)' : undefined,
                      borderColor: purpose === p ? 'var(--ui-primary, #0284c7)' : undefined,
                      color: purpose === p ? 'var(--ui-primary, #0284c7)' : undefined,
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
              />
            </Field>
          </div>
        </div>

        <div className="ui-modal-foot">
          <button type="button" className="ui-btn" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
            disabled={submitting || !selectedSlotId}
          >
            {submitting ? 'Scheduling...' : 'Schedule Appointment'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
