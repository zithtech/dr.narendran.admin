import { App, Dropdown, type MenuProps } from 'antd';
import {
  Calendar,
  CalendarClock,
  CalendarDays,
  CalendarX2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Filter,
  Loader2,
  Mail,
  MapPin,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Stethoscope,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import AppointmentDrawer from '../components/AppointmentDrawer';
import CancelAppointmentModal from '../components/CancelAppointmentModal';
import RescheduleAppointmentModal from '../components/RescheduleAppointmentModal';
import ScheduleAppointmentModal from '../components/ScheduleAppointmentModal';
import { Badge, type BadgeTone } from '../components/ui/primitives';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import CreatePrescriptionModal from '../features/prescriptions/components/CreatePrescriptionModal';
import ViewPrescriptionModal from '../features/prescriptions/components/ViewPrescriptionModal';
import { type Prescription, prescriptionsApi } from '../features/prescriptions/api/prescriptionsApi';
import { usePermission } from '../context/PermissionContext';
import type {
  Appointment,
  AppointmentStatus,
  DoctorDailyScheduleResult,
  DoctorScheduleAppointmentItem,
  DoctorScheduleSummary,
} from '../types/appointment';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function shiftDate(dateStr: string, deltaDays: number): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const date = new Date(y, m - 1, d + deltaDays);
    const nextY = date.getFullYear();
    const nextM = String(date.getMonth() + 1).padStart(2, '0');
    const nextD = String(date.getDate()).padStart(2, '0');
    return `${nextY}-${nextM}-${nextD}`;
  } catch {
    return dateStr;
  }
}

function toFullAppointment(item: DoctorScheduleAppointmentItem, doc: DoctorScheduleSummary): Appointment {
  const appt: Appointment = {
    id: item.id,
    patientId: item.patientId,
    patientName: item.patientName,
    patientPhone: item.patientPhone,
    doctorId: doc.id,
    doctorName: doc.name,
    scheduledStart: item.scheduledStart,
    scheduledEnd: item.scheduledEnd,
    date: item.date,
    time: item.time,
    tokenNumber: item.tokenNumber,
    purpose: item.purpose,
    status: item.status,
    createdAt: item.createdAt,
    created_at: item.createdAt,
    updatedAt: item.createdAt,
  };
  if (item.patientEmail) appt.patientEmail = item.patientEmail;
  if (doc.specialization) appt.doctorSpecialty = doc.specialization;
  if (doc.phone) appt.doctorPhone = doc.phone;
  if (doc.email) appt.doctorEmail = doc.email;
  if (doc.hospitalName) appt.hospitalName = doc.hospitalName;
  if (doc.branchName) appt.branchName = doc.branchName;
  if (item.patientNote) appt.patientNote = item.patientNote;
  if (item.rescheduleReason) appt.rescheduleReason = item.rescheduleReason;
  if (item.cancellationReason) appt.cancellationReason = item.cancellationReason;
  return appt;
}

const getStatusBadgeTone = (status: AppointmentStatus): BadgeTone => {
  switch (status.toLowerCase()) {
    case 'completed':
      return 'green';
    case 'scheduled':
    case 'confirmed':
      return 'green';
    case 'rescheduled':
      return 'amber';
    case 'cancelled':
      return 'red';
    case 'no_show':
      return 'neutral';
    default:
      return 'neutral';
  }
};

export default function DoctorTodayAppointments() {
  const todayStr = useMemo(() => getTodayString(), []);

  // Filter & Search states
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [onlyWithAppointments, setOnlyWithAppointments] = useState<boolean>(true);

  // Data fetching states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [scheduleData, setScheduleData] = useState<DoctorDailyScheduleResult | null>(null);

  // Modals and Drawer states
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [preselectedDoctorId, setPreselectedDoctorId] = useState<string | undefined>(undefined);
  const [viewingAppointment, setViewingAppointment] = useState<Appointment | null>(null);
  const [reschedulingAppointment, setReschedulingAppointment] = useState<Appointment | null>(null);
  const [cancellingAppointment, setCancellingAppointment] = useState<Appointment | null>(null);
  const [prescriptionAppt, setPrescriptionAppt] = useState<Appointment | null>(null);
  const [viewingPrescription, setViewingPrescription] = useState<Prescription | null>(null);
  const [isViewRxOpen, setIsViewRxOpen] = useState(false);

  const { message } = App.useApp();
  const { canCreate, canView, canUpdate, canDelete } = usePermission();

  const isApptCreatable = canCreate('APPOINTMENTS', ['TODAYS_SCHEDULE']);
  const isApptUpdatable = canUpdate('APPOINTMENTS', ['TODAYS_SCHEDULE']);
  const isApptDeletable = canDelete('APPOINTMENTS', ['TODAYS_SCHEDULE']);
  const isRxViewable = canView('PRESCRIPTIONS');
  const isRxCreatable = canCreate('PRESCRIPTIONS');

  const handleViewPrescription = async (appt: Appointment) => {
    const hideLoading = message.loading(`Fetching prescription for ${appt.patientName}...`, 0);
    try {
      let rxList = await prescriptionsApi.getByAppointment(appt.id);
      if ((!rxList || rxList.length === 0) && appt.patientId) {
        const patientRx = await prescriptionsApi.getByPatient(appt.patientId);
        if (patientRx && patientRx.length > 0) {
          rxList = patientRx;
        }
      }
      hideLoading();

      if (rxList && rxList.length > 0 && rxList[0]) {
        setViewingPrescription(rxList[0]);
        setIsViewRxOpen(true);
      } else {
        message.info(`No prescription created yet for ${appt.patientName || 'this consultation'}.`);
      }
    } catch {
      hideLoading();
      message.error('Failed to load prescription.');
    }
  };

  const fetchDoctorSchedules = useCallback(async (date: string, docId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { date };
      if (docId && docId !== 'all') {
        params['doctorId'] = docId;
      }
      const res = await api.get<{ status: string; data: DoctorDailyScheduleResult }>(
        'appointments/doctor-schedules',
        { params },
      );
      if (res.data?.data) {
        setScheduleData(res.data.data);
      } else {
        setScheduleData({ date, totalAppointments: 0, doctors: [] });
      }
    } catch (err: unknown) {
      console.error('Failed to load doctor schedules:', err);
      setError(getErrorMessage(err, 'Failed to load doctor appointment schedules.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDoctorSchedules(selectedDate, selectedDoctorId);
  }, [fetchDoctorSchedules, selectedDate, selectedDoctorId]);

  // Overall metrics across all fetched doctors
  const metrics = useMemo(() => {
    if (!scheduleData) {
      return {
        totalDoctors: 0,
        doctorsWithAppointments: 0,
        totalAppointments: 0,
        scheduled: 0,
        completed: 0,
        cancelled: 0,
      };
    }
    const totalDoctors = scheduleData.doctors.length;
    let doctorsWithAppointments = 0;
    let totalAppointments = 0;
    let scheduled = 0;
    let completed = 0;
    let cancelled = 0;

    for (const doc of scheduleData.doctors) {
      if (doc.stats.total > 0 || doc.appointments.length > 0) {
        doctorsWithAppointments += 1;
      }
      totalAppointments += doc.stats.total;
      scheduled += doc.stats.scheduled;
      completed += doc.stats.completed;
      cancelled += doc.stats.cancelled;
    }

    return {
      totalDoctors,
      doctorsWithAppointments,
      totalAppointments,
      scheduled,
      completed,
      cancelled,
    };
  }, [scheduleData]);

  // Filtered doctors based on doctor search, status filter, and onlyWithAppointments
  const displayedDoctors = useMemo(() => {
    if (!scheduleData) return [];

    const query = searchQuery.trim().toLowerCase();

    return scheduleData.doctors
      .map((doc) => {
        // Filter appointments by status and search query
        const filteredAppointments = doc.appointments.filter((appt) => {
          if (statusFilter !== 'all') {
            if (statusFilter === 'scheduled') {
              if (
                appt.status !== 'scheduled' &&
                appt.status !== 'confirmed' &&
                appt.status !== 'rescheduled'
              ) {
                return false;
              }
            } else if (appt.status !== statusFilter) {
              return false;
            }
          }

          if (query) {
            const matchesPatient =
              appt.patientName.toLowerCase().includes(query) ||
              appt.patientPhone.toLowerCase().includes(query) ||
              (appt.patientEmail && appt.patientEmail.toLowerCase().includes(query)) ||
              appt.tokenNumber.toLowerCase().includes(query) ||
              appt.purpose.toLowerCase().includes(query);

            const matchesDoctor =
              doc.name.toLowerCase().includes(query) ||
              doc.specialization.toLowerCase().includes(query);

            return matchesPatient || matchesDoctor;
          }

          return true;
        });

        return {
          ...doc,
          filteredAppointments,
        };
      })
      .filter((doc) => {
        // 1. Doctor dropdown filter
        if (selectedDoctorId !== 'all') {
          if (doc.id !== selectedDoctorId) return false;
          if (query || statusFilter !== 'all') {
            return doc.filteredAppointments.length > 0;
          }
          return true;
        }

        // 2. If search query or status filter is active
        if (query || statusFilter !== 'all') {
          return doc.filteredAppointments.length > 0;
        }

        // 3. User requirement: "list the the docter who has appoinment current date"
        if (onlyWithAppointments) {
          return doc.appointments.length > 0;
        }

        return true;
      });
  }, [scheduleData, searchQuery, statusFilter, selectedDoctorId, onlyWithAppointments]);

  const isToday = selectedDate === todayStr;

  const isFiltered = useMemo(() => {
    return (
      selectedDate !== todayStr ||
      selectedDoctorId !== 'all' ||
      statusFilter !== 'all' ||
      searchQuery.trim() !== '' ||
      !onlyWithAppointments
    );
  }, [selectedDate, todayStr, selectedDoctorId, statusFilter, searchQuery, onlyWithAppointments]);

  const handleResetFilters = () => {
    setSelectedDate(todayStr);
    setSelectedDoctorId('all');
    setStatusFilter('all');
    setSearchQuery('');
    setOnlyWithAppointments(true);
  };

  const handleOpenBooking = (docId?: string) => {
    if (!isApptCreatable) return;
    setPreselectedDoctorId(docId);
    setIsScheduleModalOpen(true);
  };

  const handleOpenDetails = (appt: DoctorScheduleAppointmentItem, doc: DoctorScheduleSummary) => {
    setViewingAppointment(toFullAppointment(appt, doc));
  };

  const handleOpenReschedule = (appt: DoctorScheduleAppointmentItem, doc: DoctorScheduleSummary) => {
    if (!isApptUpdatable) return;
    setReschedulingAppointment(toFullAppointment(appt, doc));
  };

  const handleOpenCancel = (appt: DoctorScheduleAppointmentItem, doc: DoctorScheduleSummary) => {
    if (!isApptDeletable) return;
    setCancellingAppointment(toFullAppointment(appt, doc));
  };

  const handleOpenCreatePrescription = (appt: DoctorScheduleAppointmentItem, doc: DoctorScheduleSummary) => {
    if (!isRxCreatable) return;
    setPrescriptionAppt(toFullAppointment(appt, doc));
  };

  const getTodayActionMenuItems = (
    appt: DoctorScheduleAppointmentItem,
    doc: DoctorScheduleSummary,
  ): NonNullable<MenuProps['items']> => {
    const isActive =
      appt.status === 'scheduled' || appt.status === 'confirmed' || appt.status === 'rescheduled';

    const items: NonNullable<MenuProps['items']> = [];

    if (isRxViewable) {
      items.push({
        key: 'view-prescription',
        label: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: '#16a34a' }}>
            <FileText size={14} style={{ color: '#16a34a' }} />
            <span>View Prescription</span>
          </span>
        ),
        onClick: () => void handleViewPrescription(toFullAppointment(appt, doc)),
      });
    }

    if (isRxCreatable) {
      items.push({
        key: 'prescription',
        label: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#1e293b' }}>
            <FileText size={14} style={{ color: '#2563eb' }} />
            <span>Create Prescription</span>
          </span>
        ),
        onClick: () => handleOpenCreatePrescription(appt, doc),
      });
    }

    items.push({
      key: 'view',
      label: (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#475569' }}>
          <Eye size={14} style={{ color: '#64748b' }} />
          <span>View Details</span>
        </span>
      ),
      onClick: () => handleOpenDetails(appt, doc),
    });

    if (isApptUpdatable) {
      items.push({
        key: 'edit',
        label: (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#1e293b' }}>
            <Pencil size={14} style={{ color: '#64748b' }} />
            <span>Edit</span>
          </span>
        ),
        onClick: () => handleOpenDetails(appt, doc),
      });
    }

    if (isActive && (isApptUpdatable || isApptDeletable)) {
      items.push({ type: 'divider' });
      if (isApptUpdatable) {
        items.push({
          key: 'reschedule',
          label: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#1e293b' }}>
              <CalendarClock size={14} style={{ color: '#64748b' }} />
              <span>Reschedule</span>
            </span>
          ),
          onClick: () => handleOpenReschedule(appt, doc),
        });
      }
      if (isApptDeletable) {
        items.push({
          key: 'cancel',
          label: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: '#dc2626' }}>
              <CalendarX2 size={14} style={{ color: '#dc2626' }} />
              <span>Cancel Appointment</span>
            </span>
          ),
          danger: true,
          onClick: () => handleOpenCancel(appt, doc),
        });
      }
    }

    return items;
  };

  return (
    <div style={{ padding: '6px 12px 14px 12px', width: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
      <style>{`
        .dta-layout {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          width: 100%;
          flex: 1;
          min-height: 0;
        }
        .dta-filters-panel {
          width: 260px;
          flex: 0 0 260px;
          min-width: 250px;
          max-width: 270px;
          box-sizing: border-box;
        }
        .dta-filters-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 14px 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
          display: flex;
          flex-direction: column;
          gap: 12px;
          max-height: calc(100vh - 120px);
          overflow-y: auto;
          overflow-x: hidden;
          box-sizing: border-box;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
          overscroll-behavior: contain;
        }
        .dta-filters-card::-webkit-scrollbar {
          width: 5px;
        }
        .dta-filters-card::-webkit-scrollbar-track {
          background: transparent;
        }
        .dta-filters-card::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .dta-filters-card::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .dta-content-panel {
          flex: 1 1 0%;
          min-width: 0;
          box-sizing: border-box;
          max-height: calc(100vh - 120px);
          overflow-y: auto;
          overflow-x: hidden;
          scrollbar-width: thin;
          scrollbar-color: #cbd5e1 transparent;
          overscroll-behavior: contain;
          padding-right: 2px;
        }
        .dta-content-panel::-webkit-scrollbar {
          width: 6px;
        }
        .dta-content-panel::-webkit-scrollbar-track {
          background: transparent;
        }
        .dta-content-panel::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .dta-content-panel::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .dta-btn-violet {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 32px;
          padding: 0 14px;
          font-size: 12.5px;
          font-weight: 600;
          background: #2563eb;
          color: #ffffff;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(37, 99, 235, 0.25);
          transition: all 0.15s ease;
        }
        .dta-btn-violet:hover {
          background: #1d4ed8;
          box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
        }
        .dta-status-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          height: 32px;
          padding: 0 10px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          font-family: inherit;
          font-size: 12px;
          font-weight: 500;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .dta-status-btn:hover {
          background: #f8fafc;
          color: #0f172a;
        }
        .dta-status-btn.is-active {
          background: #f1f5f9;
          border-color: #e2e8f0;
          color: #0f172a;
          font-weight: 600;
        }
        .dta-input-field {
          width: 100%;
          height: 32px;
          padding: 0 10px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #0f172a;
          font-family: inherit;
          font-size: 12.5px;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .dta-input-field:focus {
          border-color: #2563eb;
          background: #ffffff;
          box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.14);
        }
        .dta-table-row {
          transition: background-color 0.12s ease;
        }
        .dta-table-row:hover td {
          background-color: #f8fafc;
        }
        .dta-action-icon-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
          color: #64748b;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .dta-action-icon-btn:hover,
        .dta-action-icon-btn:focus-visible {
          background: #f1f5f9 !important;
          border: none !important;
          color: #0f172a;
        }
        .dta-action-icon-btn.is-danger:hover {
          background: #fef2f2;
          border-color: #fecaca;
          color: #dc2626;
        }
        @media (max-width: 960px) {
          .dta-layout {
            flex-direction: column;
            overflow-y: auto;
            max-height: calc(100vh - 120px);
          }
          .dta-filters-panel {
            width: 100%;
            flex: 1 1 auto;
            min-width: 0;
            max-width: none;
          }
          .dta-filters-card {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
            gap: 12px;
            align-items: flex-start;
            max-height: none;
            overflow-y: visible;
          }
          .dta-content-panel {
            max-height: none;
            overflow-y: visible;
          }
        }
        @media (max-width: 600px) {
          .dta-filters-card {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Top Header Bar (Compact & Sleek) */}
      <div
        className="dta-header-row"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
          padding: '4px 2px 2px 2px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: '#f1f5f9',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <Stethoscope size={17} style={{ color: '#475569' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: 'var(--ui-text, #0f172a)' }}>
              Doctors Today Appointments
            </h1>
            <p style={{ margin: '1px 0 0', fontSize: 12, color: 'var(--ui-muted, #64748b)' }}>
              Daily doctor-wise consultation schedules, patient queues, and appointment statuses.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="ui-btn ui-btn-subtle"
            onClick={() => void fetchDoctorSchedules(selectedDate, selectedDoctorId)}
            disabled={loading}
            title="Refresh schedules"
            style={{ display: 'flex', alignItems: 'center', gap: 5, height: 32, padding: '0 10px', fontSize: 12 }}
          >
            <RefreshCw size={13} className={loading ? 'is-spinning' : ''} />
            <span>Refresh</span>
          </button>

          {isApptCreatable && (
            <button
              type="button"
              className="dta-btn-violet"
              onClick={() => handleOpenBooking()}
            >
              <Plus size={14} />
              <span>Schedule Appointment</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Two-Column Layout (Compact 260px Filters, Flexible Queue) */}
      <div className="dta-layout">
        {/* Left Column: 260px Scrollable Filters Panel */}
        <aside className="dta-filters-panel">
          <div className="dta-filters-card">
            {/* Filter Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #f1f5f9',
                paddingBottom: 8,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: '#f1f5f9',
                    color: '#64748b',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Filter size={12} />
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Filters</span>
                {isFiltered && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: '#0f172a',
                      background: '#f1f5f9',
                      padding: '1px 5px',
                      borderRadius: 10,
                    }}
                  >
                    Active
                  </span>
                )}
              </div>
              {isFiltered && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#64748b',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 6px',
                    borderRadius: 4,
                  }}
                  title="Reset all filters"
                >
                  <RotateCcw size={10} />
                  <span>Reset</span>
                </button>
              )}
            </div>

            {/* Date Section */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748b' }}>
                  <CalendarDays size={13} style={{ color: '#64748b' }} />
                  <span>Date</span>
                </span>
                {isToday && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: '#15803d',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      padding: '1px 6px',
                      borderRadius: 4,
                    }}
                  >
                    Current Day
                  </span>
                )}
              </div>

              {/* Date Navigation & Picker Bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <button
                  type="button"
                  onClick={() => setSelectedDate((prev) => shiftDate(prev, -1))}
                  title="Previous Day"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 7,
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#475569',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  style={{
                    flex: 1,
                    height: 30,
                    padding: '0 8px',
                    borderRadius: 7,
                    fontSize: 11.5,
                    fontWeight: 600,
                    border: isToday ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
                    background: isToday ? '#f1f5f9' : '#ffffff',
                    color: isToday ? '#0f172a' : '#475569',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 5,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Calendar size={12} />
                  <span>Today</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDate((prev) => shiftDate(prev, 1))}
                  title="Next Day"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 7,
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                    color: '#475569',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>

              {/* Date Input with Formatted Display */}
              <div style={{ position: 'relative' }}>
                <input
                  id="doctor-today-date-input"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedDate(e.target.value);
                    }
                  }}
                  className="dta-input-field"
                  style={{ height: 30, fontSize: 12, paddingLeft: 8 }}
                />
              </div>

              <div
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: '#334155',
                  padding: '4px 8px',
                  background: '#f8fafc',
                  borderRadius: 6,
                  border: '1px solid #f1f5f9',
                }}
              >
                {formatDisplayDate(selectedDate)}
              </div>
            </div>

            {/* Search Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748b' }}>
                Search
              </span>
              <div style={{ position: 'relative', width: '100%' }}>
                <Search
                  size={13}
                  style={{
                    position: 'absolute',
                    left: 9,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
                <input
                  id="doctor-today-search-input"
                  type="text"
                  placeholder="Patient, doctor, token..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="dta-input-field"
                  style={{
                    height: 30,
                    paddingLeft: 28,
                    paddingRight: searchQuery ? 24 : 8,
                    fontSize: 12,
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: 6,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      border: 'none',
                      background: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: 2,
                      display: 'flex',
                    }}
                    title="Clear search"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Doctor Filter Dropdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label
                htmlFor="doctor-filter-select"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: '#64748b',
                }}
              >
                Doctor:
              </label>
              <SearchableSelect
                id="doctor-filter-select"
                size="sm"
                value={selectedDoctorId}
                onChange={(val) => setSelectedDoctorId(val)}
                searchable={true}
                placeholder={`All Doctors (${scheduleData?.doctors.length || 0})`}
                searchPlaceholder="Search doctor or specialty..."
                options={[
                  {
                    value: 'all',
                    label: `All Doctors (${scheduleData?.doctors.length || 0})`,
                  },
                  ...(scheduleData?.doctors || []).map((doc) => ({
                    value: doc.id,
                    label: doc.name,
                    sublabel: doc.specialization,
                    badge: `${doc.stats.total} appts`,
                    badgeTone: doc.stats.total > 0 ? ('blue' as const) : ('neutral' as const),
                  })),
                ]}
              />
            </div>

            {/* Status Filter (Styled like Sidebar Nav Items) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: '#64748b' }}>
                Appointment Status
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {[
                  { key: 'all', label: 'All Statuses', count: metrics.totalAppointments, dot: '#64748b' },
                  { key: 'scheduled', label: 'Scheduled / Active', count: metrics.scheduled, dot: '#6366f1' },
                  { key: 'completed', label: 'Completed', count: metrics.completed, dot: '#10b981' },
                  { key: 'cancelled', label: 'Cancelled', count: metrics.cancelled, dot: '#ef4444' },
                ].map((item) => {
                  const isSelected = statusFilter === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setStatusFilter(item.key)}
                      className={`dta-status-btn ${isSelected ? 'is-active' : ''}`}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: item.dot,
                            flexShrink: 0,
                          }}
                        />
                        <span>{item.label}</span>
                      </span>
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: 6,
                          background: isSelected ? '#0f172a' : '#f1f5f9',
                          color: isSelected ? '#ffffff' : '#64748b',
                        }}
                      >
                        {item.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Toggle: Only show doctors with appointments */}
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 11.5,
                  fontWeight: 500,
                  color: '#334155',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={onlyWithAppointments}
                  onChange={(e) => setOnlyWithAppointments(e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: '#2563eb', width: 14, height: 14 }}
                />
                <span>Only show doctors with appointments</span>
              </label>
            </div>
          </div>
        </aside>

        {/* Right Column: Rest of Space (65% width) - Doctor Queue & Appointments Table */}
        <main className="dta-content-panel" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Content Header Banner */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 14,
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                Doctors with Appointments
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: '#334155',
                  background: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  padding: '2px 8px',
                  borderRadius: 10,
                }}
              >
                {displayedDoctors.length} {displayedDoctors.length === 1 ? 'Doctor' : 'Doctors'}
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: '#15803d',
                  background: '#dcfce7',
                  border: '1px solid #bbf7d0',
                  padding: '2px 8px',
                  borderRadius: 10,
                }}
              >
                {displayedDoctors.reduce((acc, d) => acc + d.filteredAppointments.length, 0)} Appointments
              </span>
            </div>

            <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 500 }}>
              Consultations for {formatDisplayDate(selectedDate)}
            </span>
          </div>

          {/* Main List Area */}
          {loading ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '40px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <Loader2 size={24} className="is-spinning" style={{ color: '#2563eb' }} />
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1e293b' }}>
                Loading doctor appointment schedules...
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                Fetching registered doctors and appointments for {formatDisplayDate(selectedDate)}
              </div>
            </div>
          ) : error ? (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 14,
                padding: '24px 20px',
                textAlign: 'center',
                color: '#b91c1c',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14 }}>Failed to load schedules</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>{error}</div>
              <button
                type="button"
                className="dta-btn-violet"
                onClick={() => void fetchDoctorSchedules(selectedDate, selectedDoctorId)}
                style={{ marginTop: 10 }}
              >
                Try Again
              </button>
            </div>
          ) : displayedDoctors.length === 0 ? (
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 14,
                padding: '44px 20px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: '50%',
                  background: '#f1f5f9',
                  color: '#64748b',
                  border: '1px solid #e2e8f0',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Stethoscope size={20} />
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: '#0f172a' }}>
                No Doctors with Appointments
              </div>
              <div style={{ fontSize: 12, color: '#64748b', maxWidth: 380 }}>
                {searchQuery || statusFilter !== 'all'
                  ? `No doctor appointments matched your search or status filter for ${formatDisplayDate(selectedDate)}.`
                  : `No doctors have appointments scheduled on ${formatDisplayDate(selectedDate)}.`}
              </div>
              {isFiltered ? (
                <button
                  type="button"
                  className="ui-btn ui-btn-subtle"
                  onClick={handleResetFilters}
                  style={{ marginTop: 6, fontSize: 12 }}
                >
                  Reset Filters
                </button>
              ) : (
                <button
                  type="button"
                  className="dta-btn-violet"
                  onClick={() => handleOpenBooking()}
                  style={{ marginTop: 6 }}
                >
                  <Plus size={14} />
                  <span>Schedule Appointment</span>
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {displayedDoctors.map((doc) => {
                const hasAppointments = doc.filteredAppointments.length > 0;

                return (
                  <div
                    key={doc.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: 14,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      overflow: 'hidden',
                    }}
                  >
                    {/* Doctor Header Banner (Refined & Modern) */}
                    <div
                      style={{
                        padding: '10px 16px',
                        background: 'linear-gradient(180deg, #fafbfc 0%, #f8fafc 100%)',
                        borderBottom: '1px solid #e2e8f0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: '#f1f5f9',
                            color: '#0f172a',
                            border: '1px solid #e2e8f0',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 13,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {doc.name.replace(/^Dr\.?\s*/i, '').slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                              {doc.name}
                            </span>
                            <span
                              style={{
                                fontSize: 10.5,
                                fontWeight: 500,
                                padding: '1px 6px',
                                borderRadius: 5,
                                background: '#f8fafc',
                                color: '#475569',
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              {doc.specialization}
                            </span>
                            {(doc.branchName || doc.hospitalName) && (
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 3,
                                  fontSize: 11,
                                  color: '#64748b',
                                }}
                              >
                                <MapPin size={11} />
                                <span>{doc.branchName || doc.hospitalName}</span>
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 2, flexWrap: 'wrap' }}>
                            {doc.phone && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#64748b' }}>
                                <Phone size={10} />
                                <span>{doc.phone}</span>
                              </span>
                            )}
                            {doc.email && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#64748b' }}>
                                <Mail size={10} />
                                <span>{doc.email}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Doctor Stats & Booking Action */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: '2px 7px',
                              borderRadius: 5,
                              background: '#f1f5f9',
                              color: '#475569',
                            }}
                          >
                            {doc.stats.total} total
                          </span>
                          {doc.stats.scheduled > 0 && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '2px 7px',
                                borderRadius: 5,
                                background: '#f1f5f9',
                                color: '#334155',
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              {doc.stats.scheduled} scheduled
                            </span>
                          )}
                          {doc.stats.completed > 0 && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '2px 7px',
                                borderRadius: 5,
                                background: '#f0fdf4',
                                color: '#15803d',
                              }}
                            >
                              {doc.stats.completed} done
                            </span>
                          )}
                          {doc.stats.cancelled > 0 && (
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 600,
                                padding: '2px 7px',
                                borderRadius: 5,
                                background: '#fee2e2',
                                color: '#dc2626',
                              }}
                            >
                              {doc.stats.cancelled} cancelled
                            </span>
                          )}
                        </div>

                        {isApptCreatable && (
                          <button
                            type="button"
                            onClick={() => handleOpenBooking(doc.id)}
                            style={{
                              height: 28,
                              padding: '0 10px',
                              borderRadius: 6,
                              fontSize: 11.5,
                              fontWeight: 600,
                              border: '1px solid #e2e8f0',
                              background: '#ffffff',
                              color: '#0f172a',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = '#f8fafc';
                              e.currentTarget.style.borderColor = '#cbd5e1';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = '#ffffff';
                              e.currentTarget.style.borderColor = '#e2e8f0';
                            }}
                          >
                            <Plus size={12} />
                            <span>Book For Doctor</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Doctor's Appointments Table (Executive Table Layout) */}
                    {hasAppointments ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'separate',
                            borderSpacing: 0,
                            fontSize: 12.5,
                            textAlign: 'left',
                          }}
                        >
                          <thead>
                            <tr style={{ background: '#f8fafc', color: '#64748b', fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              <th style={{ padding: '8px 14px', borderBottom: '1px solid #e2e8f0', width: 140 }}>Time & Token</th>
                              <th style={{ padding: '8px 14px', borderBottom: '1px solid #e2e8f0', width: 200 }}>Patient</th>
                              <th style={{ padding: '8px 14px', borderBottom: '1px solid #e2e8f0', width: 150 }}>Contact</th>
                              <th style={{ padding: '8px 14px', borderBottom: '1px solid #e2e8f0' }}>Purpose / Remarks</th>
                              <th style={{ padding: '8px 14px', borderBottom: '1px solid #e2e8f0', width: 130 }}>Status</th>
                              <th style={{ padding: '8px 14px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', width: 110 }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {doc.filteredAppointments.map((appt) => {
                              return (
                                <tr
                                  key={appt.id}
                                  className="dta-table-row"
                                  style={{
                                    borderBottom: '1px solid #f1f5f9',
                                  }}
                                >
                                  {/* Time & Token */}
                                  <td style={{ padding: '9px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <span
                                        style={{
                                          fontSize: 11,
                                          fontWeight: 600,
                                          color: '#334155',
                                          background: '#f1f5f9',
                                          border: '1px solid #e2e8f0',
                                          padding: '1px 6px',
                                          borderRadius: 4,
                                        }}
                                      >
                                        {appt.tokenNumber}
                                      </span>
                                      <div
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 3,
                                          fontSize: 12,
                                          fontWeight: 600,
                                          color: '#1e293b',
                                        }}
                                      >
                                        <Clock size={11} style={{ color: '#64748b' }} />
                                        <span>{appt.time}</span>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Patient */}
                                  <td style={{ padding: '9px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        cursor: 'pointer',
                                      }}
                                      onClick={() => handleOpenDetails(appt, doc)}
                                    >
                                      <div
                                        style={{
                                          width: 28,
                                          height: 28,
                                          borderRadius: '50%',
                                          background: '#f1f5f9',
                                          color: '#334155',
                                          border: '1px solid #e2e8f0',
                                          display: 'grid',
                                          placeItems: 'center',
                                          fontSize: 11,
                                          fontWeight: 600,
                                          flexShrink: 0,
                                        }}
                                      >
                                        {appt.patientName.slice(0, 2).toUpperCase()}
                                      </div>
                                      <div
                                        style={{
                                          fontWeight: 600,
                                          color: '#0f172a',
                                          fontSize: 12.5,
                                        }}
                                      >
                                        {appt.patientName}
                                      </div>
                                    </div>
                                  </td>

                                  {/* Contact */}
                                  <td style={{ padding: '9px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                                    {appt.patientPhone ? (
                                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: '#475569' }}>
                                        <Phone size={11} style={{ color: '#94a3b8' }} />
                                        <span>{appt.patientPhone}</span>
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>No phone info</span>
                                    )}
                                  </td>

                                  {/* Purpose & Remarks */}
                                  <td style={{ padding: '9px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                                    <div style={{ fontWeight: 500, color: '#1e293b', fontSize: 12 }}>
                                      {appt.purpose}
                                    </div>
                                    {appt.patientNote && (
                                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                                        {appt.patientNote}
                                      </div>
                                    )}
                                    {appt.cancellationReason && (
                                      <div style={{ fontSize: 11, color: '#dc2626', marginTop: 1 }}>
                                        Cancelled: {appt.cancellationReason}
                                      </div>
                                    )}
                                    {appt.rescheduleReason && (
                                      <div style={{ fontSize: 11, color: '#b45309', marginTop: 1 }}>
                                        Rescheduled: {appt.rescheduleReason}
                                      </div>
                                    )}
                                  </td>

                                  {/* Status */}
                                  <td style={{ padding: '9px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }}>
                                    <Badge tone={getStatusBadgeTone(appt.status)}>
                                      <span style={{ textTransform: 'capitalize', fontSize: 11 }}>
                                        {appt.status.replace('_', ' ')}
                                      </span>
                                    </Badge>
                                  </td>

                                  {/* Actions */}
                                  <td style={{ padding: '9px 14px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle', textAlign: 'right' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                                      {isRxCreatable && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenCreatePrescription(appt, doc);
                                          }}
                                          title="Create Prescription"
                                          style={{
                                            padding: '3px 8px',
                                            fontSize: 11.5,
                                            fontWeight: 600,
                                            borderRadius: 6,
                                            border: '1px solid #e2e8f0',
                                            background: '#f8fafc',
                                            color: '#0f172a',
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 4,
                                          }}
                                        >
                                          <FileText size={12} style={{ color: '#64748b' }} />
                                          <span>Prescription</span>
                                        </button>
                                      )}
                                      <Dropdown
                                        menu={{ items: getTodayActionMenuItems(appt, doc) }}
                                        trigger={['click']}
                                        placement="bottomRight"
                                      >
                                        <button
                                          type="button"
                                          className="dta-action-icon-btn"
                                          title="Actions"
                                          aria-label="Actions"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          <MoreVertical size={14} />
                                        </button>
                                      </Dropdown>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div
                        style={{
                          padding: '16px',
                          textAlign: 'center',
                          background: '#ffffff',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <div style={{ fontSize: 12, color: '#64748b' }}>
                          No appointments scheduled for {doc.name} on {formatDisplayDate(selectedDate)}.
                        </div>
                        {isApptCreatable && (
                          <button
                            type="button"
                            onClick={() => handleOpenBooking(doc.id)}
                            style={{
                              height: 26,
                              padding: '0 10px',
                              fontSize: 11.5,
                              fontWeight: 600,
                              borderRadius: 6,
                              border: '1px solid #e2e8f0',
                              background: '#ffffff',
                              color: '#0f172a',
                              cursor: 'pointer',
                            }}
                          >
                            + Schedule an Appointment
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Schedule Appointment Modal */}
      <ScheduleAppointmentModal
        isOpen={isScheduleModalOpen}
        preselectedDoctorId={preselectedDoctorId}
        onClose={() => {
          setIsScheduleModalOpen(false);
          setPreselectedDoctorId(undefined);
        }}
        onSuccess={() => {
          void fetchDoctorSchedules(selectedDate, selectedDoctorId);
        }}
      />

      {/* Reschedule Modal */}
      <RescheduleAppointmentModal
        isOpen={Boolean(reschedulingAppointment)}
        appointment={reschedulingAppointment}
        onClose={() => setReschedulingAppointment(null)}
        onSuccess={() => {
          void fetchDoctorSchedules(selectedDate, selectedDoctorId);
          if (viewingAppointment && reschedulingAppointment && viewingAppointment.id === reschedulingAppointment.id) {
            setViewingAppointment(null);
          }
        }}
      />

      {/* Cancel Modal */}
      <CancelAppointmentModal
        isOpen={Boolean(cancellingAppointment)}
        appointment={cancellingAppointment}
        onClose={() => setCancellingAppointment(null)}
        onSuccess={() => {
          void fetchDoctorSchedules(selectedDate, selectedDoctorId);
          if (viewingAppointment && cancellingAppointment && viewingAppointment.id === cancellingAppointment.id) {
            setViewingAppointment(null);
          }
        }}
      />

      {/* View Appointment Details Drawer */}
      <AppointmentDrawer
        appointment={viewingAppointment}
        onClose={() => setViewingAppointment(null)}
        onReschedule={(appt) => {
          setReschedulingAppointment(appt);
        }}
        onCancel={(appt) => {
          setCancellingAppointment(appt);
        }}
        {...(isRxCreatable
          ? {
              onCreatePrescription: (appt: Appointment) => {
                setPrescriptionAppt(appt);
              },
            }
          : {})}
      />

      {/* Create Prescription Modal */}
      {prescriptionAppt && (
        <CreatePrescriptionModal
          open={Boolean(prescriptionAppt)}
          appointmentId={prescriptionAppt.id}
          appointmentToken={prescriptionAppt.tokenNumber}
          appointmentDoctorId={prescriptionAppt.doctorId}
          preselectedPatient={{
            id: prescriptionAppt.patientId,
            name: prescriptionAppt.patientName,
            phone: prescriptionAppt.patientPhone,
          }}
          onClose={() => setPrescriptionAppt(null)}
          onSuccess={(createdRx) => {
            setPrescriptionAppt(null);
            void fetchDoctorSchedules(selectedDate, selectedDoctorId);
            if (createdRx) {
              setViewingPrescription(createdRx);
              setIsViewRxOpen(true);
            }
          }}
        />
      )}

      {/* View Prescription Modal */}
      <ViewPrescriptionModal
        prescription={viewingPrescription}
        open={isViewRxOpen}
        onClose={() => {
          setIsViewRxOpen(false);
          setViewingPrescription(null);
        }}
      />
    </div>
  );
}
