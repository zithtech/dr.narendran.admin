import { App, Drawer, Spin, Tag } from 'antd';
import {
  AlertCircle,
  CalendarDays,
  CalendarPlus,
  CalendarX,
  Check,
  CheckCircle2,
  Clock,
  Info,
  MapPin,
  Stethoscope,
  Sun,
  Sunset,
  User,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type DoctorAvailabilitySlot,
  type DoctorBlockedDate,
  doctorAvailabilityApi,
} from '../api/doctorAvailabilityApi';
import { titleCase } from '../lib/format';
import type { AppointmentSlot, DateSlotSummary } from '../types/appointment';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import type { Doctor } from './DoctorModal';
import type { Patient } from './PatientModal';
import { Alert } from './ui/primitives';
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

const DAYS_ORDER = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

/** Format 24-hr time HH:mm to 12-hr time e.g. "09:00 AM" */
function formatTime12(timeStr?: string | null | undefined): string {
  if (!timeStr) return '';
  const parts = timeStr.slice(0, 5).split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0] || '0', 10);
  const m = parts[1] || '00';
  if (isNaN(h)) return timeStr;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${m} ${period}`;
}

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

  // Doctor's Configured Availability Profile (strict source of truth)
  const [doctorProfileSchedule, setDoctorProfileSchedule] = useState<DoctorAvailabilitySlot[]>([]);
  const [profileScheduleLoading, setProfileScheduleLoading] = useState(false);

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

  // Fetch doctors and patients on drawer open
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

  // Fetch Doctor's Configured Availability Profile
  const fetchDoctorProfileAvailability = useCallback(async (docId: string) => {
    if (!docId) {
      setDoctorProfileSchedule([]);
      return;
    }
    setProfileScheduleLoading(true);
    try {
      const profileSlots = await doctorAvailabilityApi.getByDoctor(docId);
      setDoctorProfileSchedule(profileSlots.filter((s) => s.status === 'ACTIVE'));
    } catch (err) {
      console.error('Failed to load doctor profile schedule:', err);
      setDoctorProfileSchedule([]);
    } finally {
      setProfileScheduleLoading(false);
    }
  }, []);

  // Doctor's Blocked Dates & Times
  const [doctorBlockedDates, setDoctorBlockedDates] = useState<DoctorBlockedDate[]>([]);
  const fetchDoctorBlockedDates = useCallback(async (docId: string) => {
    if (!docId) {
      setDoctorBlockedDates([]);
      return;
    }
    try {
      const blocked = await doctorAvailabilityApi.getBlockedDates(docId);
      setDoctorBlockedDates(blocked);
    } catch {
      setDoctorBlockedDates([]);
    }
  }, []);

  // Fetch slots for selected doctor and date (strictly generated from profile availability, excluding blocked times)
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

      // Double-check against loaded doctor blocked dates to filter out any blocked time ranges
      const dayBlocks = doctorBlockedDates.filter((b) => b.blocked_date === date);
      const isDayFullyBlocked = dayBlocks.some(
        (b) =>
          b.is_all_day ||
          (b.start_time <= '09:00' && b.end_time >= '17:00') ||
          (b.start_time <= '00:00' && b.end_time >= '23:59')
      );

      if (isDayFullyBlocked) {
        setSlots([]);
      } else {
        const filteredSlots = daySlots.filter((slot) => {
          const sTime = (slot.start_time || '').slice(0, 5);
          const eTime = (slot.end_time || '').slice(0, 5);
          const overlaps = dayBlocks.some((b) => {
            const bStart = (b.start_time || '00:00').slice(0, 5);
            const bEnd = (b.end_time || '23:59').slice(0, 5);
            return sTime < bEnd && eTime > bStart;
          });
          return !overlaps;
        });
        setSlots(filteredSlots);
      }
      setSelectedSlotId('');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to fetch doctor availability slots.'));
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [doctorBlockedDates]);

  // Initialize data when drawer opens
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
  }, [isOpen, fetchDoctors, fetchPatients, todayStr, preselectedDoctorId, preselectedPatientId]);

  // When doctor changes, load their configured availability profile and blocked dates
  useEffect(() => {
    if (isOpen && selectedDoctorId) {
      void fetchDoctorProfileAvailability(selectedDoctorId);
      void fetchDoctorBlockedDates(selectedDoctorId);
    }
  }, [isOpen, selectedDoctorId, fetchDoctorProfileAvailability, fetchDoctorBlockedDates]);

  // Determine day of the week for the currently selected appointmentDate
  const selectedDateDayInfo = useMemo(() => {
    if (!appointmentDate) return { dayName: '', dayUpper: '', formattedDate: '' };
    const [y = 2026, m = 1, d = 1] = appointmentDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayUpper = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][
      dateObj.getDay()
    ] || '';
    const dayName = titleCase(dayUpper);
    const formattedDate = dateObj.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    return { dayName, dayUpper, formattedDate };
  }, [appointmentDate]);

  // Current date blocked ranges for doctor
  const currentDayBlocks = useMemo(() => {
    if (!appointmentDate || !doctorBlockedDates.length) return [];
    return doctorBlockedDates.filter((b) => b.blocked_date === appointmentDate);
  }, [appointmentDate, doctorBlockedDates]);

  // Check if current date is completely blocked
  const isCurrentDayFullyBlocked = useMemo(() => {
    return currentDayBlocks.some(
      (b) =>
        b.is_all_day ||
        (b.start_time <= '09:00' && b.end_time >= '17:00') ||
        (b.start_time <= '00:00' && b.end_time >= '23:59')
    );
  }, [currentDayBlocks]);

  // Check if selected doctor has configured availability for the selected day of the week
  const isDoctorScheduledForDay = useMemo(() => {
    if (!selectedDateDayInfo.dayUpper) return false;
    if (doctorProfileSchedule.length === 0) return true;
    return doctorProfileSchedule.some(
      (s) => s.day_of_week === selectedDateDayInfo.dayUpper && s.status === 'ACTIVE'
    );
  }, [doctorProfileSchedule, selectedDateDayInfo]);

  // Matching availability session for selected day
  const dayConfiguredSchedule = useMemo(() => {
    return doctorProfileSchedule.filter(
      (s) => s.day_of_week === selectedDateDayInfo.dayUpper && s.status === 'ACTIVE'
    );
  }, [doctorProfileSchedule, selectedDateDayInfo]);

  // Configured slot duration from doctor profile (defaults to 30 mins if not set)
  const profileSlotLength = useMemo(() => {
    if (doctorProfileSchedule.length > 0 && doctorProfileSchedule[0]?.slot_length) {
      return doctorProfileSchedule[0].slot_length;
    }
    return 30;
  }, [doctorProfileSchedule]);

  // Unique list of configured working days for this doctor
  const configuredWorkingDays = useMemo(() => {
    const daysSet = new Set(doctorProfileSchedule.map((s) => s.day_of_week));
    return DAYS_ORDER.filter((d) => daysSet.has(d as any));
  }, [doctorProfileSchedule]);

  // Fetch slots whenever doctor or appointment date changes (only if doctor has availability)
  useEffect(() => {
    if (isOpen && selectedDoctorId && appointmentDate) {
      if (isDoctorScheduledForDay) {
        void fetchSlots(selectedDoctorId, appointmentDate);
      } else {
        setSlots([]);
        setSelectedSlotId('');
      }
    }
  }, [isOpen, selectedDoctorId, appointmentDate, isDoctorScheduledForDay, fetchSlots]);

  // Map patient list to SearchableSelect options
  const patientOptions = useMemo<SearchableSelectOption[]>(() => {
    return patients.map((pat) => ({
      value: pat.id,
      label: pat.name,
      sublabel: [pat.phone, pat.email].filter(Boolean).join(' · ') || undefined,
      badge: pat.branch_name || undefined,
      badgeTone: 'neutral' as const,
      extraSearchTerms: [pat.phone, pat.email, pat.blood_group, pat.branch_name].filter(
        Boolean
      ) as string[],
    }));
  }, [patients]);

  const selectedDoctor = useMemo(
    () => doctors.find((d) => d.id === selectedDoctorId) || null,
    [doctors, selectedDoctorId]
  );

  const selectedSlot = useMemo(
    () => slots.find((s) => s.id === selectedSlotId) || null,
    [slots, selectedSlotId]
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

    if (isCurrentDayFullyBlocked) {
      setError(
        `Cannot schedule appointment: Dr. ${selectedDoctor?.name || 'Doctor'} has blocked this date${
          currentDayBlocks[0]?.reason ? ` (${currentDayBlocks[0].reason})` : ''
        }. Please select another date.`
      );
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
      message.success('Appointment scheduled successfully!');
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

  // Group slots by session (strictly auto-split from doctor profile hours)
  const morningSlots = slots.filter((s) => s.session === 'morning');
  const afternoonSlots = slots.filter((s) => s.session === 'afternoon');
  const eveningSlots = slots.filter((s) => s.session === 'evening');

  const renderSlotButton = (slot: AppointmentSlot) => {
    const isSelected = selectedSlotId === slot.id;
    const isBooked = slot.isBooked;

    const startTimeFormatted = slot.start_time
      ? formatTime12(slot.start_time)
      : slot.slotTime
        ? new Date(slot.slotTime).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
        : slot.id;

    const endTimeFormatted = slot.end_time ? formatTime12(slot.end_time) : '';

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
        title={
          isBooked
            ? 'Slot already booked (Double booking prevented)'
            : `Book slot for ${startTimeFormatted}${endTimeFormatted ? ` – ${endTimeFormatted}` : ''}`
        }
        style={{
          padding: '8px 10px',
          borderRadius: 8,
          fontSize: 12,
          fontWeight: isSelected ? 700 : 500,
          border: isSelected
            ? '2px solid #7c3aed'
            : isBooked
              ? '1px dashed #cbd5e1'
              : '1px solid #e2e8f0',
          background: isSelected ? '#f5f3ff' : isBooked ? '#f8fafc' : '#ffffff',
          color: isSelected ? '#6d28d9' : isBooked ? '#94a3b8' : '#1e293b',
          boxShadow: isSelected ? '0 2px 8px rgba(124, 58, 237, 0.2)' : 'none',
          cursor: isBooked ? 'not-allowed' : 'pointer',
          opacity: isBooked ? 0.6 : 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 2,
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {isSelected && <Check size={12} style={{ color: '#7c3aed' }} />}
          <span>{startTimeFormatted}</span>
        </div>
        {endTimeFormatted && (
          <span style={{ fontSize: 10, color: isSelected ? '#7c3aed' : '#64748b' }}>
            to {endTimeFormatted}
          </span>
        )}
        {isBooked ? (
          <span
            style={{
              fontSize: 9.5,
              textTransform: 'uppercase',
              color: '#ef4444',
              fontWeight: 700,
              marginTop: 1,
            }}
          >
            Booked
          </span>
        ) : (
          <span
            style={{
              fontSize: 9.5,
              color: isSelected ? '#7c3aed' : '#059669',
              fontWeight: 650,
              marginTop: 1,
            }}
          >
            Available
          </span>
        )}
      </button>
    );
  };

  return (
    <Drawer
      open={isOpen}
      onClose={submitting ? () => undefined : onClose}
      width="min(860px, 96vw)"
      destroyOnClose
      placement="right"
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
            <CalendarPlus size={20} />
          </div>
          <div>
            <div style={{ fontSize: 16.5, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
              Schedule New Appointment
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              Consultation slots are strictly based on the doctor&apos;s configured profile availability
            </div>
          </div>
        </div>
      }
      footer={
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '6px 4px',
          }}
        >
          <div style={{ fontSize: 12, color: '#475569', minWidth: 0 }}>
            {selectedSlot ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
                <span>
                  Selected Slot:{' '}
                  <strong style={{ color: '#0f172a' }}>
                    {formatTime12(selectedSlot.start_time)} – {formatTime12(selectedSlot.end_time)}
                  </strong>{' '}
                  on {selectedDateDayInfo.formattedDate} ({profileSlotLength} mins)
                </span>
              </span>
            ) : (
              <span style={{ color: '#94a3b8' }}>Please select an available appointment slot</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <button
              type="button"
              className="ui-btn"
              onClick={onClose}
              disabled={submitting}
              style={{ height: 36, padding: '0 16px', borderRadius: 8, fontSize: 12.5 }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-primary"
              onClick={(e) => void handleSubmit(e)}
              disabled={
                submitting ||
                !selectedSlotId ||
                (patientMode === 'existing' ? !selectedPatient : !newPatientName.trim())
              }
              style={{
                height: 36,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 7,
                padding: '0 20px',
                fontWeight: 600,
                fontSize: 12.5,
                borderRadius: 8,
                background: '#7c3aed',
                borderColor: '#7c3aed',
                color: '#ffffff',
                boxShadow: '0 2px 8px rgba(124, 58, 237, 0.28)',
              }}
            >
              {submitting ? 'Scheduling...' : 'Confirm Appointment'}
            </button>
          </div>
        </div>
      }
    >
      <form
        onSubmit={handleSubmit}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          padding: '4px 0 16px',
        }}
      >
        {error && <Alert>{error}</Alert>}

        {/* Section 1: Patient Selection */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              paddingBottom: 8,
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: '#f5f3ff',
                color: '#7c3aed',
                border: '1px solid #ede9fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <User size={13} />
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: '#475569',
                textTransform: 'uppercase',
              }}
            >
              Patient Information
            </div>
          </div>

          {/* Mode Switcher */}
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
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                borderRadius: 6,
                height: 32,
                fontSize: 12.5,
                fontWeight: 600,
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
              <UserCheck size={14} />
              <span>Existing Patient</span>
            </button>

            <button
              type="button"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                borderRadius: 6,
                height: 32,
                fontSize: 12.5,
                fontWeight: 600,
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
              <UserPlus size={14} />
              <span>New Patient</span>
            </button>
          </div>

          {patientMode === 'existing' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div>
                <label
                  htmlFor="schedule-patient-select"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: 5,
                  }}
                >
                  Select Patient *
                </label>
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
                  placeholder={patientsLoading ? 'Loading patients...' : 'Search patient by name, phone or email...'}
                  searchPlaceholder="Type name, phone number, email..."
                  options={patientOptions}
                  emptyText='No matching patients found. Switch to "New Patient" above to register.'
                />
              </div>

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
                        background: '#7c3aed',
                        color: '#ffffff',
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 700,
                        fontSize: 13,
                        flexShrink: 0,
                      }}
                    >
                      {selectedPatient.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 650, color: '#0f172a' }}>{selectedPatient.name}</div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
                        {[selectedPatient.phone, selectedPatient.email, selectedPatient.blood_group]
                          .filter(Boolean)
                          .join(' · ') || 'No contact details'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ui-btn ui-btn-subtle"
                    style={{ fontSize: 11.5, height: 26, padding: '0 8px', borderRadius: 5 }}
                    onClick={() => setSelectedPatient(null)}
                  >
                    Change
                  </button>
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
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: 5,
                  }}
                >
                  PATIENT FULL NAME *
                </label>
                <input
                  type="text"
                  className="ui-input"
                  placeholder="Enter full name"
                  value={newPatientName}
                  onChange={(e) => setNewPatientName(e.target.value.replace(/[^a-zA-Z\s]/g, ''))}
                  required
                  style={{ width: '100%', height: 36, fontSize: 13 }}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#334155',
                    display: 'block',
                    marginBottom: 5,
                  }}
                >
                  PHONE NUMBER *
                </label>
                <input
                  type="tel"
                  className="ui-input"
                  placeholder="Enter contact number"
                  value={newPatientPhone}
                  onChange={(e) => setNewPatientPhone(e.target.value.replace(/[^0-9+\s-]/g, ''))}
                  required
                  style={{ width: '100%', height: 36, fontSize: 13 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Doctor & Profile Schedule Context */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              paddingBottom: 8,
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: '#f5f3ff',
                color: '#7c3aed',
                border: '1px solid #ede9fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Stethoscope size={13} />
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: '#475569',
                textTransform: 'uppercase',
              }}
            >
              Doctor &amp; Configured Availability Profile
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 14,
            }}
          >
            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#334155',
                  display: 'block',
                  marginBottom: 5,
                }}
              >
                SELECT DOCTOR *
              </label>
              <SearchableSelect
                value={selectedDoctorId}
                onChange={(val) => {
                  setSelectedDoctorId(val);
                  setSelectedSlotId('');
                }}
                disabled={doctorsLoading || submitting}
                required
                searchable={true}
                placeholder="Select doctor..."
                searchPlaceholder="Search doctor or specialty..."
                options={doctors.map((doc) => ({
                  value: doc.id,
                  label: doc.name.startsWith('Dr.') ? doc.name : `Dr. ${doc.name}`,
                  sublabel: doc.specialization || 'General',
                  badge: doc.branch_name || doc.hospital_name || undefined,
                  badgeTone: 'violet' as const,
                }))}
              />
            </div>

            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#334155',
                  display: 'block',
                  marginBottom: 5,
                }}
              >
                APPOINTMENT DATE *
              </label>
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
                style={{ width: '100%', height: 36, fontSize: 13 }}
              />
            </div>
          </div>

          {/* Doctor Profile Schedule Information Banner */}
          {profileScheduleLoading ? (
            <div style={{ padding: '8px 0', fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Spin size="small" />
              <span>Loading doctor&apos;s configured availability profile...</span>
            </div>
          ) : doctorProfileSchedule.length === 0 ? (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 12,
                color: '#92400e',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <AlertCircle size={16} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>No Availability Configured:</strong>{' '}
                {selectedDoctor?.name || 'This doctor'} does not have any consultation hours scheduled
                in their profile. Please configure their availability in the Doctor Profile or
                Availability &amp; Slots page first.
              </div>
            </div>
          ) : (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Stethoscope size={14} style={{ color: '#7c3aed' }} />
                  <span style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                    {selectedDoctor?.name || 'Doctor'}&apos;s Profile Schedule
                  </span>
                  <Tag color="purple" style={{ margin: 0, fontWeight: 650, borderRadius: 5 }}>
                    {profileSlotLength}-Minute Slots (Auto-Split)
                  </Tag>
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={11} />
                  <span>
                    {doctorProfileSchedule[0]?.branch_name ||
                      selectedDoctor?.branch_name ||
                      'Main Clinic'}
                  </span>
                </div>
              </div>

              {/* Working Days Chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>Configured Days:</span>
                {DAYS_ORDER.map((d) => {
                  const isConfigured = configuredWorkingDays.includes(d);
                  const isSelectedDay = selectedDateDayInfo.dayUpper === d;
                  return (
                    <span
                      key={d}
                      style={{
                        padding: '2px 7px',
                        borderRadius: 5,
                        fontSize: 11,
                        fontWeight: 600,
                        background: isSelectedDay
                          ? '#7c3aed'
                          : isConfigured
                            ? '#ede9fe'
                            : '#f1f5f9',
                        color: isSelectedDay
                          ? '#ffffff'
                          : isConfigured
                            ? '#6d28d9'
                            : '#94a3b8',
                        border: isSelectedDay
                          ? '1px solid #6d28d9'
                          : isConfigured
                            ? '1px solid #ddd6fe'
                            : '1px solid #e2e8f0',
                      }}
                    >
                      {titleCase(d).slice(0, 3)}
                    </span>
                  );
                })}
              </div>

              {/* Status for currently selected date */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  marginTop: 2,
                  paddingTop: 8,
                  borderTop: '1px dashed #e2e8f0',
                }}
              >
                {isDoctorScheduledForDay ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#15803d', fontWeight: 600 }}>
                    <CheckCircle2 size={14} style={{ color: '#16a34a' }} />
                    <span>
                      Doctor is available on {selectedDateDayInfo.dayName}s:{' '}
                      {dayConfiguredSchedule
                        .map((s) => `${formatTime12(s.start_time)} – ${formatTime12(s.end_time)}`)
                        .join(', ')}{' '}
                      · Automatically split into {profileSlotLength}-min slots.
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309', fontWeight: 600 }}>
                    <AlertCircle size={14} style={{ color: '#d97706' }} />
                    <span>
                      Dr. {selectedDoctor?.name || 'Doctor'} has no configured availability on{' '}
                      {selectedDateDayInfo.dayName}s. Please choose an available working day above.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Consultation Slots (Strictly follows Doctor Profile) */}
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 8,
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  background: '#f5f3ff',
                  color: '#7c3aed',
                  border: '1px solid #ede9fe',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock size={13} />
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.06em',
                  color: '#475569',
                  textTransform: 'uppercase',
                }}
              >
                Available Appointment Slots ({profileSlotLength}-Min Intervals)
              </span>
            </div>

            {slots.length > 0 && (
              <span style={{ fontSize: 11.5, color: '#7c3aed', fontWeight: 600 }}>
                {slots.filter((s) => !s.isBooked).length} Available / {slots.length} Total Slots
              </span>
            )}
          </div>

          {/* Blocked Hours Notice if partial day blocked */}
          {currentDayBlocks.length > 0 && !isCurrentDayFullyBlocked && (
            <div
              style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 8,
                padding: '9px 12px',
                fontSize: 12,
                color: '#92400e',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertCircle size={15} style={{ color: '#d97706', flexShrink: 0 }} />
              <span>
                <strong>Doctor Blocked Hours:</strong> Dr. {selectedDoctor?.name || 'Doctor'} has blocked{' '}
                {currentDayBlocks
                  .map(
                    (b) =>
                      `${formatTime12(b.start_time)} – ${formatTime12(b.end_time)}${
                        b.reason ? ` (${b.reason})` : ''
                      }`
                  )
                  .join(', ')}
                . Any overlapping consultation slots have been automatically excluded.
              </span>
            </div>
          )}

          {isCurrentDayFullyBlocked ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                borderRadius: 10,
                background: '#fef2f2',
                border: '1.5px solid #fecaca',
                color: '#991b1b',
                fontSize: 12.5,
              }}
            >
              <CalendarX size={26} style={{ color: '#ef4444', margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#991b1b' }}>
                Doctor Unavailable (Blocked Date)
              </div>
              <div style={{ fontSize: 12, color: '#b91c1c', marginTop: 4 }}>
                Dr. {selectedDoctor?.name || 'Doctor'} has blocked the entire day on{' '}
                {selectedDateDayInfo.formattedDate}
                {currentDayBlocks[0]?.reason ? ` (${currentDayBlocks[0].reason})` : ''}.
              </div>
              <div style={{ fontSize: 11.5, color: '#7f1d1d', marginTop: 6 }}>
                All consultation hours are blocked. Appointments cannot be scheduled on this date.
              </div>
            </div>
          ) : !isDoctorScheduledForDay ? (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                borderRadius: 8,
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                color: '#64748b',
                fontSize: 12.5,
              }}
            >
              <CalendarDays size={24} style={{ color: '#94a3b8', margin: '0 auto 6px' }} />
              <div style={{ fontWeight: 600, color: '#334155' }}>
                No slots configured for {selectedDateDayInfo.dayName}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                Doctor is only available on: {configuredWorkingDays.map(titleCase).join(', ') || 'No configured days'}.
              </div>
            </div>
          ) : slotsLoading ? (
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
              <Spin size="small" />
              <span>Splitting available consultation hours into {profileSlotLength}-min slots...</span>
            </div>
          ) : slots.length === 0 ? (
            <div
              style={{
                padding: '20px 16px',
                textAlign: 'center',
                borderRadius: 8,
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                color: '#64748b',
                fontSize: 12.5,
              }}
            >
              No appointment slots available for this doctor on {selectedDateDayInfo.formattedDate}.
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
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#475569',
                      marginBottom: 7,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <Sun size={13} style={{ color: '#d97706' }} />
                    <span>Morning Slots ({morningSlots.length})</span>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                      gap: 8,
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
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#475569',
                      marginBottom: 7,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <Clock size={13} style={{ color: '#7c3aed' }} />
                    <span>Afternoon Slots ({afternoonSlots.length})</span>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                      gap: 8,
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
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#475569',
                      marginBottom: 7,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <Sunset size={13} style={{ color: '#6d28d9' }} />
                    <span>Evening Slots ({eveningSlots.length})</span>
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                      gap: 8,
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
        <div
          style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 12,
            padding: '16px 18px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              paddingBottom: 8,
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 7,
                background: '#f5f3ff',
                color: '#7c3aed',
                border: '1px solid #ede9fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Info size={13} />
            </div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.06em',
                color: '#475569',
                textTransform: 'uppercase',
              }}
            >
              Consultation Purpose &amp; Notes
            </div>
          </div>

          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#334155',
                display: 'block',
                marginBottom: 6,
              }}
            >
              PURPOSE OF VISIT *
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {COMMON_PURPOSES.map((p) => (
                <button
                  key={p}
                  type="button"
                  style={{
                    fontSize: 11.5,
                    height: 28,
                    padding: '0 10px',
                    borderRadius: 6,
                    fontWeight: purpose === p ? 650 : 500,
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
              style={{ width: '100%', height: 36, fontSize: 13 }}
            />
          </div>

          <div>
            <label
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#334155',
                display: 'block',
                marginBottom: 6,
              }}
            >
              CLINICAL / ADMINISTRATIVE NOTES (OPTIONAL)
            </label>
            <textarea
              className="ui-input"
              rows={2}
              placeholder="e.g. Patient reports symptom duration of 3 days..."
              value={patientNote}
              onChange={(e) => setPatientNote(e.target.value)}
              style={{ width: '100%', minHeight: 56, lineHeight: 1.4, padding: '8px 12px', fontSize: 12.5 }}
            />
          </div>
        </div>
      </form>
    </Drawer>
  );
}

export const ScheduleAppointmentDrawer = ScheduleAppointmentModal;
