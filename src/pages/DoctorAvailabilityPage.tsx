import { App, Drawer, Popconfirm, Select, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  Ban,
  CalendarClock,
  CalendarX,
  Check,
  Clock,
  Copy,
  Grid,
  Info,
  List,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Stethoscope,
  Trash2,
  User,
} from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';

import {
  type CreateAvailabilityPayload,
  type CreateBlockedDatePayload,
  type DoctorAvailabilitySlot,
  type DoctorBlockedDate,
  doctorAvailabilityApi,
} from '../api/doctorAvailabilityApi';
import { titleCase } from '../lib/format';
import { usePermission } from '../context/PermissionContext';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';

export interface DoctorOption {
  id: string;
  name: string;
  specialization?: string | null;
  qualification?: string | null;
  profile_image_url?: string | null;
  hospital_id?: string | null;
  hospital_name?: string | null;
  branch_id?: string | null;
  branch_name?: string | null;
  status?: string | null;
  years_of_experience?: number | null;
  phone?: string | null;
  email?: string | null;
}

export interface BranchOption {
  id: string;
  name: string;
  hospital_id?: string | null;
  hospital_name?: string | null;
}

const DAYS_OF_WEEK = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;

type DayOfWeek = typeof DAYS_OF_WEEK[number];

const COMMON_SLOT_LENGTHS = [10, 15, 20, 30, 45, 60];
const PAGE_SIZES = [10, 25, 50, 100];

const REASON_PRESETS = [
  'Annual Leave',
  'Medical Conference',
  'Emergency Surgery / OT',
  'Personal Leave',
  'Sick Leave',
  'Clinic Maintenance',
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

export default function DoctorAvailabilityPage() {
  const { message } = App.useApp();
  const [searchParams, setSearchParams] = useSearchParams();
  const { canCreate, canUpdate, canDelete } = usePermission();

  const isCreatable = canCreate('AVAILABILITY');
  const isUpdatable = canUpdate('AVAILABILITY');
  const isDeletable = canDelete('AVAILABILITY');

  // Doctors & Branches state
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  // Selected doctor (only data from this doctor's profile is displayed)
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>(
    searchParams.get('doctorId') || ''
  );

  // Main Section Tab: Weekly Availability vs Blocked Dates
  const [activeMainSection, setActiveMainSection] = useState<'schedule' | 'blocked'>('schedule');

  // Availability slots for selected doctor
  const [slots, setSlots] = useState<DoctorAvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Blocked Dates state for selected doctor
  const [blockedDates, setBlockedDates] = useState<DoctorBlockedDate[]>([]);
  const [loadingBlocked, setLoadingBlocked] = useState(false);

  // Slot duration configuration on doctor profile
  const [selectedSlotDuration, setSelectedSlotDuration] = useState<number>(30);
  const [customSlotDuration, setCustomSlotDuration] = useState<string>('');
  const [savingSlotDuration, setSavingSlotDuration] = useState(false);

  // Day filter & search within doctor's configured availability
  const [dayFilter, setDayFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'schedule' | 'table'>('schedule');

  // Pagination for weekly slots table view
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);

  // Drawer state for Create / Edit weekly slot
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<DoctorAvailabilitySlot | null>(null);

  // Weekly slot form states
  const [formBranchId, setFormBranchId] = useState<string>('');
  const [formDay, setFormDay] = useState<DayOfWeek>('MONDAY');
  const [formStartTime, setFormStartTime] = useState<string>('09:00');
  const [formEndTime, setFormEndTime] = useState<string>('17:00');
  const [formSlotLength, setFormSlotLength] = useState<number>(30);
  const [formStatus, setFormStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [formCopyDays, setFormCopyDays] = useState<DayOfWeek[]>([]);
  const [savingSlot, setSavingSlot] = useState(false);

  // Blocked Dates filters & view state
  const [blockedSearchTerm, setBlockedSearchTerm] = useState('');
  const [blockedStatusFilter, setBlockedStatusFilter] = useState<'ALL' | 'UPCOMING' | 'TODAY' | 'PAST'>('ALL');
  const [blockedViewMode, setBlockedViewMode] = useState<'table' | 'cards'>('table');
  const [blockedPerPage, setBlockedPerPage] = useState<number>(10);
  const [blockedPage, setBlockedPage] = useState<number>(1);

  // Drawer state for Block Date & Time
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<DoctorBlockedDate | null>(null);
  const [blockFormDate, setBlockFormDate] = useState<string>('');
  const [blockFormMode, setBlockFormMode] = useState<'all_day' | 'time_range'>('all_day');
  const [blockFormStartTime, setBlockFormStartTime] = useState<string>('09:00');
  const [blockFormEndTime, setBlockFormEndTime] = useState<string>('17:00');
  const [blockFormReason, setBlockFormReason] = useState<string>('');
  const [savingBlock, setSavingBlock] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0]!, []);

  // Load doctors and branches
  const fetchDoctorsAndBranches = useCallback(async () => {
    setLoadingDoctors(true);
    try {
      const [docsRes, branchesRes] = await Promise.all([
        api.get('doctors').catch(() => ({ data: [] })),
        api.get('branches').catch(() => ({ data: [] })),
      ]);
      const docsList: DoctorOption[] = (docsRes.data?.data || docsRes.data || []).map((d: any) => ({
        id: d.id,
        name: d.name,
        specialization: d.specialization,
        qualification: d.qualification,
        profile_image_url: d.profile_image_url,
        hospital_id: d.hospital_id,
        hospital_name: d.hospital_name,
        branch_id: d.branch_id,
        branch_name: d.branch_name,
        status: d.status,
        years_of_experience: d.years_of_experience,
        phone: d.phone,
        email: d.email,
      }));
      setDoctors(docsList);

      const bList: BranchOption[] = (branchesRes.data?.data || branchesRes.data || []).map((b: any) => ({
        id: b.id,
        name: b.name,
        hospital_id: b.hospital_id,
        hospital_name: b.hospital_name,
      }));
      setBranches(bList);

      // If no doctor is selected or doctor in URL is invalid, pick the first doctor
      const urlDocId = searchParams.get('doctorId');
      if (urlDocId && docsList.some((d) => d.id === urlDocId)) {
        setSelectedDoctorId(urlDocId);
      } else if (docsList.length > 0 && !selectedDoctorId) {
        setSelectedDoctorId(docsList[0]?.id || '');
      }
    } catch (err) {
      console.error('Failed to load doctors / branches:', err);
    } finally {
      setLoadingDoctors(false);
    }
  }, [searchParams, selectedDoctorId]);

  // Load availability configured strictly in the selected doctor's profile
  const fetchDoctorAvailability = useCallback(async (docId: string) => {
    if (!docId) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    try {
      const data = await doctorAvailabilityApi.getByDoctor(docId);
      setSlots(data);

      // Sync doctor's current slot duration from existing profile slots
      if (data.length > 0 && data[0]?.slot_length) {
        const currentLen = data[0].slot_length;
        setSelectedSlotDuration(currentLen);
        if (!COMMON_SLOT_LENGTHS.includes(currentLen)) {
          setCustomSlotDuration(String(currentLen));
        } else {
          setCustomSlotDuration('');
        }
      }
    } catch (err: unknown) {
      message.error(getErrorMessage(err, "Failed to load doctor's availability"));
    } finally {
      setLoadingSlots(false);
    }
  }, [message]);

  // Load blocked dates for selected doctor
  const fetchBlockedDates = useCallback(async (docId: string) => {
    if (!docId) {
      setBlockedDates([]);
      return;
    }
    setLoadingBlocked(true);
    try {
      const data = await doctorAvailabilityApi.getBlockedDates(docId);
      setBlockedDates(data);
    } catch (err: unknown) {
      console.error('Failed to load doctor blocked dates:', err);
    } finally {
      setLoadingBlocked(false);
    }
  }, []);

  useEffect(() => {
    void fetchDoctorsAndBranches();
  }, [fetchDoctorsAndBranches]);

  useEffect(() => {
    if (selectedDoctorId) {
      void fetchDoctorAvailability(selectedDoctorId);
      void fetchBlockedDates(selectedDoctorId);
    }
  }, [selectedDoctorId, fetchDoctorAvailability, fetchBlockedDates]);

  // Handle Doctor Change
  const handleSelectDoctor = (docId: string) => {
    setSelectedDoctorId(docId);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (docId) next.set('doctorId', docId);
      else next.delete('doctorId');
      return next;
    });
    setPage(1);
    setBlockedPage(1);
  };

  // Selected Doctor Object
  const currentDoctor = useMemo(() => {
    return doctors.find((d) => d.id === selectedDoctorId) || null;
  }, [doctors, selectedDoctorId]);

  // Available branches for current doctor's hospital
  const doctorBranches = useMemo(() => {
    if (!currentDoctor || !currentDoctor.hospital_id) return branches;
    const matched = branches.filter((b) => b.hospital_id === currentDoctor.hospital_id);
    return matched.length > 0 ? matched : branches;
  }, [currentDoctor, branches]);

  // Filter slots (by day or search term)
  const filteredSlots = useMemo(() => {
    let result = slots;

    if (dayFilter !== 'all') {
      result = result.filter((s) => s.day_of_week === dayFilter);
    }

    const term = searchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter((s) => {
        const branch = (s.branch_name || '').toLowerCase();
        const day = s.day_of_week.toLowerCase();
        return branch.includes(term) || day.includes(term);
      });
    }

    return result;
  }, [slots, dayFilter, searchTerm]);

  // Filter blocked dates
  const filteredBlockedDates = useMemo(() => {
    let result = blockedDates;
    if (blockedStatusFilter !== 'ALL') {
      result = result.filter((b) => b.status === blockedStatusFilter);
    }
    const term = blockedSearchTerm.trim().toLowerCase();
    if (term) {
      result = result.filter((b) => {
        const dateMatch = b.blocked_date.includes(term);
        const reasonMatch = b.reason && b.reason.toLowerCase().includes(term);
        return dateMatch || Boolean(reasonMatch);
      });
    }
    return result;
  }, [blockedDates, blockedStatusFilter, blockedSearchTerm]);

  // Group slots by Day of Week
  const groupedSlots = useMemo(() => {
    const map: Record<DayOfWeek, DoctorAvailabilitySlot[]> = {
      MONDAY: [],
      TUESDAY: [],
      WEDNESDAY: [],
      THURSDAY: [],
      FRIDAY: [],
      SATURDAY: [],
      SUNDAY: [],
    };

    filteredSlots.forEach((slot) => {
      if (map[slot.day_of_week]) {
        map[slot.day_of_week].push(slot);
      }
    });

    return map;
  }, [filteredSlots]);

  // Open Weekly Slot Editor Drawer
  const handleOpenEditor = (slot?: DoctorAvailabilitySlot | null, defaultDay?: DayOfWeek) => {
    if (slot ? !isUpdatable : !isCreatable) return;
    if (slot) {
      setEditingSlot(slot);
      setFormBranchId(slot.branch_id);
      setFormDay(slot.day_of_week);
      setFormStartTime(slot.start_time.slice(0, 5));
      setFormEndTime(slot.end_time.slice(0, 5));
      setFormSlotLength(slot.slot_length || selectedSlotDuration || 30);
      setFormStatus(slot.status);
      setFormCopyDays([]);
    } else {
      setEditingSlot(null);
      setFormBranchId(currentDoctor?.branch_id || doctorBranches[0]?.id || branches[0]?.id || '');
      setFormDay(defaultDay || 'MONDAY');
      setFormStartTime('09:00');
      setFormEndTime('17:00');
      setFormSlotLength(selectedSlotDuration || 30);
      setFormStatus('ACTIVE');
      setFormCopyDays([]);
    }
    setIsEditorOpen(true);
  };

  // Save Weekly Slot (Create or Update in Doctor Profile)
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSlot ? !isUpdatable : !isCreatable) return;
    if (!selectedDoctorId) {
      message.error('Please select a doctor');
      return;
    }
    if (!formBranchId) {
      message.error('Please select a hospital branch / clinic');
      return;
    }
    if (formEndTime <= formStartTime) {
      message.error('End time must be later than start time');
      return;
    }

    setSavingSlot(true);
    try {
      const payload: CreateAvailabilityPayload = {
        doctor_id: selectedDoctorId,
        branch_id: formBranchId,
        day_of_week: formDay,
        start_time: formStartTime.length === 5 ? `${formStartTime}:00` : formStartTime,
        end_time: formEndTime.length === 5 ? `${formEndTime}:00` : formEndTime,
        slot_length: formSlotLength,
        status: formStatus,
      };

      if (editingSlot) {
        await doctorAvailabilityApi.update(editingSlot.id, payload);
        message.success('Availability updated successfully in Doctor Profile!');
      } else {
        await doctorAvailabilityApi.create(payload);

        if (formCopyDays.length > 0) {
          for (const copyDay of formCopyDays) {
            await doctorAvailabilityApi.create({
              ...payload,
              day_of_week: copyDay,
            });
          }
          message.success(
            `Availability configured across ${formCopyDays.length + 1} days in Doctor Profile!`
          );
        } else {
          message.success('Availability added to Doctor Profile!');
        }
      }

      setIsEditorOpen(false);
      void fetchDoctorAvailability(selectedDoctorId);
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Failed to save availability'));
    } finally {
      setSavingSlot(false);
    }
  };

  // Delete Weekly Slot from Doctor Profile
  const handleDeleteSlot = async (slotId: string, day: string) => {
    if (!isDeletable) return;
    try {
      await doctorAvailabilityApi.delete(slotId);
      message.success(`Removed availability for ${titleCase(day)}.`);
      void fetchDoctorAvailability(selectedDoctorId);
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Failed to remove availability'));
    }
  };

  // Update Slot Duration across Doctor Profile
  const handleSaveDoctorSlotDuration = async () => {
    if (!isUpdatable || !selectedDoctorId) return;
    const duration = customSlotDuration ? parseInt(customSlotDuration, 10) : selectedSlotDuration;
    if (isNaN(duration) || duration < 5 || duration > 240) {
      message.error('Slot duration must be between 5 and 240 minutes');
      return;
    }

    setSavingSlotDuration(true);
    try {
      const res = await doctorAvailabilityApi.updateDoctorSlotLength(selectedDoctorId, duration);
      setSelectedSlotDuration(duration);
      message.success(
        `Configured ${duration}-minute slot duration for ${currentDoctor?.name || 'doctor'} (${res.count} schedule${res.count === 1 ? '' : 's'} updated)!`
      );
      void fetchDoctorAvailability(selectedDoctorId);
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Failed to update slot duration'));
    } finally {
      setSavingSlotDuration(false);
    }
  };

  // Open Block Date Drawer
  const handleOpenBlockModal = (block?: DoctorBlockedDate | null) => {
    if (block ? !isUpdatable : !isCreatable) return;
    if (block) {
      setEditingBlock(block);
      setBlockFormDate(block.blocked_date);
      setBlockFormMode(block.is_all_day ? 'all_day' : 'time_range');
      setBlockFormStartTime(block.start_time.slice(0, 5) || '09:00');
      setBlockFormEndTime(block.end_time.slice(0, 5) || '17:00');
      setBlockFormReason(block.reason || '');
    } else {
      setEditingBlock(null);
      setBlockFormDate(todayStr);
      setBlockFormMode('all_day');
      setBlockFormStartTime('09:00');
      setBlockFormEndTime('17:00');
      setBlockFormReason('');
    }
    setIsBlockModalOpen(true);
  };

  // Save Blocked Date / Time
  const handleSaveBlockedDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBlock ? !isUpdatable : !isCreatable) return;
    if (!selectedDoctorId) {
      message.error('Please select a doctor');
      return;
    }
    if (!blockFormDate) {
      message.error('Please select a date to block');
      return;
    }
    if (blockFormMode === 'time_range' && blockFormEndTime <= blockFormStartTime) {
      message.error('End time must be after start time');
      return;
    }

    setSavingBlock(true);
    try {
      let normalizedDate = blockFormDate.trim();
      if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(normalizedDate)) {
        const parts = normalizedDate.split(/[-/]/);
        normalizedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }

      const isAllDay = blockFormMode === 'all_day';
      const payload: CreateBlockedDatePayload = {
        doctor_id: selectedDoctorId,
        blocked_date: normalizedDate,
        is_all_day: isAllDay,
        start_time: isAllDay ? '00:00:00' : `${blockFormStartTime}:00`,
        end_time: isAllDay ? '23:59:59' : `${blockFormEndTime}:00`,
        reason: blockFormReason.trim() || undefined,
      };

      if (editingBlock) {
        await doctorAvailabilityApi.updateBlockedDate(selectedDoctorId, editingBlock.id, payload);
        message.success('Blocked date updated successfully! Appointment slots updated.');
      } else {
        await doctorAvailabilityApi.createBlockedDate(selectedDoctorId, payload);
        message.success('Date and time blocked successfully! Appointment slots updated.');
      }

      setIsBlockModalOpen(false);
      void fetchBlockedDates(selectedDoctorId);
      void fetchDoctorAvailability(selectedDoctorId);
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Failed to save blocked date'));
    } finally {
      setSavingBlock(false);
    }
  };

  // Delete / Unblock Date
  const handleDeleteBlockedDate = async (blockId: string, dateStr: string) => {
    if (!isDeletable || !selectedDoctorId) return;
    try {
      await doctorAvailabilityApi.deleteBlockedDate(selectedDoctorId, blockId);
      message.success(`Unblocked ${dateStr}. Consultation slots are now available.`);
      void fetchBlockedDates(selectedDoctorId);
      void fetchDoctorAvailability(selectedDoctorId);
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Failed to unblock date'));
    }
  };

  // Pagination for weekly slots table view
  const pageCount = Math.max(1, Math.ceil(filteredSlots.length / perPage));
  const current = Math.min(page, pageCount);
  const startIdx = (current - 1) * perPage;
  const pageRows = filteredSlots.slice(startIdx, startIdx + perPage);

  // Pagination for blocked dates table view
  const blockedPageCount = Math.max(1, Math.ceil(filteredBlockedDates.length / blockedPerPage));
  const currentBlockedPage = Math.min(blockedPage, blockedPageCount);
  const blockedStartIdx = (currentBlockedPage - 1) * blockedPerPage;
  const blockedPageRows = filteredBlockedDates.slice(
    blockedStartIdx,
    blockedStartIdx + blockedPerPage
  );

  // Weekly Slots Table Columns
  const columns: ColumnsType<DoctorAvailabilitySlot> = [
    {
      title: 'Day of Week',
      dataIndex: 'day_of_week',
      key: 'day_of_week',
      width: 140,
      render: (day: DayOfWeek) => (
        <span style={{ fontWeight: 650, color: '#0f172a' }}>{titleCase(day)}</span>
      ),
    },
    {
      title: 'Time Window',
      key: 'time_window',
      render: (_, r) => (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Clock size={13} style={{ color: '#7c3aed' }} />
          <span style={{ fontWeight: 600, color: '#334155' }}>
            {formatTime12(r.start_time)} – {formatTime12(r.end_time)}
          </span>
        </div>
      ),
    },
    {
      title: 'Slot Duration',
      key: 'slot_length',
      width: 150,
      render: (_, r) => (
        <Tag color="purple" style={{ fontWeight: 650, borderRadius: 6 }}>
          {r.slot_length || selectedSlotDuration || 30} mins
        </Tag>
      ),
    },
    {
      title: 'Branch / Clinic',
      dataIndex: 'branch_name',
      key: 'branch_name',
      render: (name: string) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#475569' }}>
          <MapPin size={12} style={{ color: '#94a3b8' }} />
          {name || 'Main Clinic'}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => (
        <Tag color={status === 'ACTIVE' ? 'success' : 'default'} style={{ fontWeight: 600 }}>
          {status}
        </Tag>
      ),
    },
    ...(isUpdatable || isDeletable
      ? [
          {
            title: 'Actions',
            key: 'actions',
            width: 120,
            align: 'right' as const,
            render: (_: unknown, r: DoctorAvailabilitySlot) => (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                {isUpdatable && (
                  <button
                    type="button"
                    className="ui-btn ui-btn-sm"
                    onClick={() => handleOpenEditor(r)}
                    title="Edit schedule"
                    style={{
                      padding: '4px 8px',
                      fontSize: 11.5,
                      color: '#7c3aed',
                      borderColor: '#ede9fe',
                      background: '#f5f3ff',
                      cursor: 'pointer',
                    }}
                  >
                    <Pencil size={12} />
                  </button>
                )}
                {isDeletable && (
                  <Popconfirm
                    title="Remove time slot?"
                    description={`Remove the ${titleCase(r.day_of_week)} consultation schedule from ${currentDoctor?.name || 'doctor'}'s profile?`}
                    onConfirm={() => handleDeleteSlot(r.id, r.day_of_week)}
                    okText="Yes, Remove"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                  >
                    <button
                      type="button"
                      className="ui-btn ui-btn-sm is-danger"
                      title="Delete slot"
                      style={{
                        padding: '4px 8px',
                        fontSize: 11.5,
                        color: '#ef4444',
                        borderColor: '#fee2e2',
                        background: '#fef2f2',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </Popconfirm>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  // Blocked Dates Table Columns
  const blockedColumns: ColumnsType<DoctorBlockedDate> = [
    {
      title: 'Blocked Date',
      key: 'blocked_date',
      render: (_, r) => {
        const [y = 2026, m = 1, d = 1] = r.blocked_date.split('-').map(Number);
        const dateObj = new Date(y, m - 1, d);
        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dateObj.getDay()] || '';
        const formatted = dateObj.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
        return (
          <div>
            <div style={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>{formatted}</div>
            <div style={{ fontSize: 11.5, color: '#64748b' }}>{dayName}</div>
          </div>
        );
      },
    },
    {
      title: 'Blocked Scope / Hours',
      key: 'scope',
      render: (_, r) => {
        if (r.is_all_day) {
          return (
            <Tag color="error" style={{ fontWeight: 650, borderRadius: 6, fontSize: 11.5, padding: '2px 8px' }}>
              Full Day Blocked (All Slots Excluded)
            </Tag>
          );
        }
        return (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Tag color="warning" style={{ fontWeight: 650, borderRadius: 6, fontSize: 11.5, padding: '2px 8px' }}>
              Time Range
            </Tag>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#1e293b' }}>
              {formatTime12(r.start_time)} – {formatTime12(r.end_time)}
            </span>
          </div>
        );
      },
    },
    {
      title: 'Reason / Notes',
      dataIndex: 'reason',
      key: 'reason',
      render: (val) => {
        if (!val) {
          return <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: 12 }}>No reason specified</span>;
        }
        return (
          <span style={{ fontSize: 12.5, fontWeight: 550, color: '#334155' }}>
            {val}
          </span>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_, r) => {
        if (r.status === 'TODAY') {
          return <Tag color="processing" style={{ fontWeight: 650, borderRadius: 5 }}>Today</Tag>;
        }
        if (r.status === 'UPCOMING') {
          return <Tag color="success" style={{ fontWeight: 650, borderRadius: 5 }}>Upcoming</Tag>;
        }
        return <Tag color="default" style={{ fontWeight: 600, borderRadius: 5 }}>Past</Tag>;
      },
    },
    ...(isUpdatable || isDeletable
      ? [
          {
            title: 'Actions',
            key: 'actions',
            width: 120,
            align: 'right' as const,
            render: (_: unknown, r: DoctorBlockedDate) => (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                {isUpdatable && (
                  <button
                    type="button"
                    className="ui-btn ui-btn-sm"
                    onClick={() => handleOpenBlockModal(r)}
                    title="Edit blocked date"
                    style={{
                      padding: '4px 8px',
                      fontSize: 11.5,
                      color: '#7c3aed',
                      borderColor: '#ede9fe',
                      background: '#f5f3ff',
                      cursor: 'pointer',
                    }}
                  >
                    <Pencil size={12} />
                  </button>
                )}
                {isDeletable && (
                  <Popconfirm
                    title="Unblock date?"
                    description={`Unblock ${r.blocked_date}? Consultation slots during this time will immediately become available in the Appointment page.`}
                    onConfirm={() => handleDeleteBlockedDate(r.id, r.blocked_date)}
                    okText="Yes, Unblock"
                    cancelText="Cancel"
                    okButtonProps={{ danger: true }}
                  >
                    <button
                      type="button"
                      className="ui-btn ui-btn-sm is-danger"
                      title="Unblock date"
                      style={{
                        padding: '4px 8px',
                        fontSize: 11.5,
                        color: '#ef4444',
                        borderColor: '#fee2e2',
                        background: '#fef2f2',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </Popconfirm>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div
      className="ui-page doctor-availability-page"
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        padding: '16px 24px',
        gap: 12,
        overflow: 'hidden',
      }}
    >
      <style>{`
        .availability-scroll-container::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .availability-scroll-container::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .availability-scroll-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .availability-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        .availability-table-scroll .ant-table-thead > tr > th {
          position: sticky !important;
          top: 0 !important;
          z-index: 2 !important;
          background: #f8fafc !important;
        }
        .blocked-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 14px 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          transition: all 0.15s ease;
        }
        .blocked-card:hover {
          border-color: #fca5a5;
          box-shadow: 0 3px 8px rgba(220, 38, 38, 0.08);
        }
        @media (max-height: 650px) {
          .doctor-availability-page {
            overflow-y: auto !important;
          }
        }
      `}</style>

      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: 12,
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
              <CalendarClock size={18} />
            </div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
              Doctor Availability &amp; Slots
            </h1>
          </div>
          <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>
            Consultation hours, slot durations, and blocked dates configured directly on the Doctor Profile.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="ui-btn"
            onClick={() => {
              if (selectedDoctorId) {
                void fetchDoctorAvailability(selectedDoctorId);
                void fetchBlockedDates(selectedDoctorId);
              }
            }}
            disabled={loadingSlots || loadingBlocked}
            style={{ fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={13} className={loadingSlots || loadingBlocked ? 'animate-spin' : ''} /> Refresh
          </button>

          {isCreatable && (
            <button
              type="button"
              className="ui-btn"
              onClick={() => handleOpenBlockModal(null)}
              disabled={!selectedDoctorId}
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                background: '#fef2f2',
                borderColor: '#fca5a5',
                color: '#dc2626',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                cursor: 'pointer',
              }}
            >
              <CalendarX size={14} /> Block Date / Time
            </button>
          )}

          {isCreatable && (
            <button
              type="button"
              className="ui-btn ui-btn-primary"
              onClick={() => handleOpenEditor(null)}
              disabled={!selectedDoctorId}
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                background: '#7c3aed',
                borderColor: '#7c3aed',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
              }}
            >
              <Plus size={14} /> Add Availability Slot
            </button>
          )}
        </div>
      </div>

      {/* Doctor Profile Banner & Slot Duration Configuration Card */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          padding: '14px 18px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 1.2fr) minmax(320px, 1fr)',
          gap: 20,
          flexShrink: 0,
        }}
      >
        {/* Left: Doctor Profile Selector & Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
              SELECT DOCTOR PROFILE:
            </span>
            <Select
              showSearch
              value={selectedDoctorId || null}
              onChange={handleSelectDoctor}
              loading={loadingDoctors}
              placeholder="Search or Select Doctor..."
              style={{ flex: 1 }}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={doctors.map((d) => ({
                value: d.id,
                label: `${d.name} (${d.specialization || 'General'})`,
              }))}
            />
          </div>

          {currentDoctor && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '10px 14px',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: '#ede9fe',
                  color: '#7c3aed',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 16,
                  overflow: 'hidden',
                  flexShrink: 0,
                }}
              >
                {currentDoctor.profile_image_url ? (
                  <img
                    src={currentDoctor.profile_image_url}
                    alt={currentDoctor.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <User size={22} />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                    {currentDoctor.name}
                  </span>
                  <Tag color="purple" style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>
                    {currentDoctor.specialization || 'Doctor'}
                  </Tag>
                  {currentDoctor.qualification && (
                    <span style={{ fontSize: 11.5, color: '#64748b' }}>
                      ({currentDoctor.qualification})
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span>
                    🏥 {currentDoctor.hospital_name || 'Hospital Profile'}{' '}
                    {currentDoctor.branch_name ? `· ${currentDoctor.branch_name}` : ''}
                  </span>
                  {currentDoctor.years_of_experience ? (
                    <span>⏳ {currentDoctor.years_of_experience} yrs exp</span>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Slot Duration Configuration */}
        <div
          style={{
            background: '#f5f3ff',
            border: '1px solid #ddd6fe',
            borderRadius: 12,
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#6b21a8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Settings size={14} /> Configure Slot Duration / Length
              </span>
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  background: '#7c3aed',
                  color: '#ffffff',
                  padding: '1px 8px',
                  borderRadius: 12,
                }}
              >
                {selectedSlotDuration} Mins
              </span>
            </div>
            <p style={{ margin: '0 0 10px', fontSize: 11.5, color: '#6b21a8' }}>
              {isUpdatable
                ? `Set consultation appointment slot duration for ${currentDoctor?.name || 'this doctor'}:`
                : `Consultation appointment slot duration for ${currentDoctor?.name || 'this doctor'} is configured to ${selectedSlotDuration} minutes (read-only).`}
            </p>

            {isUpdatable && (
              <>
                {/* Quick Preset Buttons */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {COMMON_SLOT_LENGTHS.map((len) => {
                    const isSelected = !customSlotDuration && selectedSlotDuration === len;
                    return (
                      <button
                        key={len}
                        type="button"
                        onClick={() => {
                          setSelectedSlotDuration(len);
                          setCustomSlotDuration('');
                        }}
                        style={{
                          border: isSelected ? '1px solid #7c3aed' : '1px solid #d8b4fe',
                          background: isSelected ? '#7c3aed' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#6b21a8',
                          fontWeight: 650,
                          fontSize: 11.5,
                          borderRadius: 6,
                          padding: '4px 9px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        {isSelected && <Check size={11} />}
                        {len} Mins {len === 30 ? '(Default)' : ''}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11.5, color: '#475569' }}>Custom minutes:</span>
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={customSlotDuration}
                    onChange={(e) => {
                      setCustomSlotDuration(e.target.value);
                      const parsed = parseInt(e.target.value, 10);
                      if (!isNaN(parsed) && parsed > 0) setSelectedSlotDuration(parsed);
                    }}
                    placeholder="e.g. 25"
                    className="ui-input"
                    style={{
                      width: 80,
                      height: 26,
                      fontSize: 11.5,
                      padding: '0 8px',
                    }}
                  />
                </div>
              </>
            )}
          </div>

          {isUpdatable && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
              <button
                type="button"
                className="ui-btn ui-btn-primary"
                onClick={handleSaveDoctorSlotDuration}
                disabled={savingSlotDuration || !selectedDoctorId}
                title="Apply Slot Duration"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  background: '#6d28d9',
                  borderColor: '#6d28d9',
                  color: '#ffffff',
                  padding: '4px 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  cursor: 'pointer',
                }}
              >
                <Check size={13} />
                {savingSlotDuration ? 'Applying...' : 'Apply Slot Duration to All Schedules'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation Section Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: 2,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveMainSection('schedule')}
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 700,
            color: activeMainSection === 'schedule' ? '#7c3aed' : '#64748b',
            borderBottom:
              activeMainSection === 'schedule' ? '2.5px solid #7c3aed' : '2.5px solid transparent',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            transition: 'all 0.15s ease',
          }}
        >
          <CalendarClock size={16} />
          <span>Weekly Availability &amp; Hours</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '1px 8px',
              borderRadius: 10,
              background: activeMainSection === 'schedule' ? '#ede9fe' : '#f1f5f9',
              color: activeMainSection === 'schedule' ? '#6d28d9' : '#64748b',
            }}
          >
            {slots.length} Slots
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainSection('blocked')}
          style={{
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 700,
            color: activeMainSection === 'blocked' ? '#dc2626' : '#64748b',
            borderBottom:
              activeMainSection === 'blocked' ? '2.5px solid #dc2626' : '2.5px solid transparent',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 7,
            transition: 'all 0.15s ease',
          }}
        >
          <CalendarX size={16} />
          <span>Blocked Dates &amp; Time Slots</span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              padding: '1px 8px',
              borderRadius: 10,
              background: activeMainSection === 'blocked' ? '#fee2e2' : '#f1f5f9',
              color: activeMainSection === 'blocked' ? '#b91c1c' : '#64748b',
            }}
          >
            {blockedDates.length} Blocked
          </span>
        </button>
      </div>

      {/* SECTION 1: WEEKLY AVAILABILITY */}
      {activeMainSection === 'schedule' && (
        <>
          {/* Filter and View Mode Controls for Weekly Schedule */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              background: '#ffffff',
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 650, color: '#334155' }}>Filter Day:</span>
              <Select
                value={dayFilter}
                onChange={(val) => {
                  setDayFilter(val);
                  setPage(1);
                }}
                style={{ width: 140 }}
                options={[
                  { value: 'all', label: 'All Configured Days' },
                  ...DAYS_OF_WEEK.map((d) => ({
                    value: d,
                    label: titleCase(d),
                  })),
                ]}
              />

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: 220 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, color: '#94a3b8' }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search branch or day..."
                  className="ui-input"
                  style={{ paddingLeft: 28, height: 32, fontSize: 12, width: '100%' }}
                />
              </div>
            </div>

            {/* View Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  background: '#f1f5f9',
                  borderRadius: 8,
                  padding: 3,
                  display: 'flex',
                  gap: 2,
                }}
              >
                <button
                  type="button"
                  onClick={() => setViewMode('schedule')}
                  style={{
                    border: 'none',
                    background: viewMode === 'schedule' ? '#ffffff' : 'transparent',
                    color: viewMode === 'schedule' ? '#7c3aed' : '#64748b',
                    fontWeight: 600,
                    fontSize: 12,
                    borderRadius: 6,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: viewMode === 'schedule' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <Grid size={13} /> Weekly Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  style={{
                    border: 'none',
                    background: viewMode === 'table' ? '#ffffff' : 'transparent',
                    color: viewMode === 'table' ? '#7c3aed' : '#64748b',
                    fontWeight: 600,
                    fontSize: 12,
                    borderRadius: 6,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: viewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <List size={13} /> All Slots Table
                </button>
              </div>
            </div>
          </div>

          {/* Weekly Content Area */}
          {viewMode === 'schedule' ? (
            /* Visual Weekly Schedule Cards */
            <div
              className="availability-scroll-container"
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                paddingRight: 4,
              }}
            >
              {filteredSlots.length === 0 ? (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px dashed #cbd5e1',
                    borderRadius: 14,
                    padding: '48px 24px',
                    textAlign: 'center',
                    color: '#64748b',
                  }}
                >
                  <CalendarClock size={40} style={{ color: '#cbd5e1', margin: '0 auto 10px' }} />
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>
                    No availability slots configured in this profile
                  </div>
                  <div style={{ fontSize: 12.5, color: '#64748b', marginTop: 4 }}>
                    Only consultation hours saved directly to {currentDoctor?.name || 'this doctor'}&apos;s profile will appear.
                  </div>
                  {isCreatable && (
                    <button
                      type="button"
                      className="ui-btn ui-btn-primary"
                      onClick={() => handleOpenEditor(null)}
                      style={{
                        marginTop: 16,
                        fontSize: 12.5,
                        background: '#7c3aed',
                        borderColor: '#7c3aed',
                        color: '#ffffff',
                      }}
                    >
                      <Plus size={14} /> Add First Consultation Slot
                    </button>
                  )}
                </div>
              ) : (
                DAYS_OF_WEEK.map((day) => {
                  const daySlots = groupedSlots[day] || [];
                  if (dayFilter !== 'all' && dayFilter !== day) return null;
                  if (searchTerm && daySlots.length === 0) return null;

                  return (
                    <div
                      key={day}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 12,
                        padding: '14px 18px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: daySlots.length > 0 ? 12 : 0,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                            {titleCase(day)}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 650,
                              background: daySlots.length > 0 ? '#ede9fe' : '#f1f5f9',
                              color: daySlots.length > 0 ? '#6d28d9' : '#94a3b8',
                              padding: '1px 7px',
                              borderRadius: 12,
                            }}
                          >
                            {daySlots.length} slot{daySlots.length === 1 ? '' : 's'}
                          </span>
                        </div>

                        {isCreatable && (
                          <button
                            type="button"
                            onClick={() => handleOpenEditor(null, day)}
                            style={{
                              border: '1px dashed #c4b5fd',
                              background: '#faf5ff',
                              color: '#7c3aed',
                              fontSize: 11.5,
                              fontWeight: 600,
                              borderRadius: 6,
                              padding: '3px 9px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <Plus size={12} /> Add to {titleCase(day)}
                          </button>
                        )}
                      </div>

                      {daySlots.length === 0 ? (
                        <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', padding: '4px 0' }}>
                          No consultation hours scheduled on {titleCase(day)}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {daySlots.map((slot) => (
                            <div
                              key={slot.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: 8,
                                padding: '8px 12px',
                                flexWrap: 'wrap',
                                gap: 10,
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                <div
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    fontWeight: 700,
                                    color: '#1e293b',
                                    fontSize: 13.5,
                                    background: '#ffffff',
                                    padding: '3px 10px',
                                    borderRadius: 6,
                                    border: '1px solid #cbd5e1',
                                  }}
                                >
                                  <Clock size={13} style={{ color: '#7c3aed' }} />
                                  <span>
                                    {formatTime12(slot.start_time)} – {formatTime12(slot.end_time)}
                                  </span>
                                </div>

                                <Tag color="blue" style={{ margin: 0, fontWeight: 650, borderRadius: 5, fontSize: 11.5 }}>
                                  {slot.slot_length || 30} mins slot duration
                                </Tag>

                                <span
                                  style={{
                                    fontSize: 12,
                                    color: '#475569',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: 4,
                                  }}
                                >
                                  <MapPin size={12} style={{ color: '#94a3b8' }} />
                                  <span>{slot.branch_name || 'Main Clinic'}</span>
                                </span>

                                <Tag
                                  color={slot.status === 'ACTIVE' ? 'success' : 'default'}
                                  style={{ margin: 0, fontWeight: 600, fontSize: 11 }}
                                >
                                  {slot.status}
                                </Tag>
                              </div>

                              {(isUpdatable || isDeletable) && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {isUpdatable && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditor(slot)}
                                      style={{
                                        border: '1px solid #ede9fe',
                                        background: '#ffffff',
                                        color: '#7c3aed',
                                        fontSize: 11.5,
                                        fontWeight: 600,
                                        borderRadius: 5,
                                        padding: '4px 9px',
                                        cursor: 'pointer',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 4,
                                      }}
                                    >
                                      <Pencil size={11} /> Edit
                                    </button>
                                  )}

                                  {isDeletable && (
                                    <Popconfirm
                                      title="Remove time slot?"
                                      description={`Remove ${titleCase(slot.day_of_week)} ${formatTime12(slot.start_time)} – ${formatTime12(slot.end_time)} from ${currentDoctor?.name || 'doctor'}'s schedule?`}
                                      onConfirm={() => handleDeleteSlot(slot.id, day)}
                                      okText="Remove"
                                      cancelText="Cancel"
                                      okButtonProps={{ danger: true }}
                                    >
                                      <button
                                        type="button"
                                        title="Delete slot"
                                        aria-label="Delete slot"
                                        style={{
                                          border: '1px solid #fecaca',
                                          background: '#ffffff',
                                          color: '#ef4444',
                                          fontSize: 11.5,
                                          fontWeight: 600,
                                          borderRadius: 5,
                                          padding: '4px 8px',
                                          cursor: 'pointer',
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                        }}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </Popconfirm>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            /* Table View of Configured Slots */
            <div
              className="ui-card ui-table-card"
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div
                className="ui-table-scroll availability-table-scroll"
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  overflowX: 'auto',
                }}
              >
                <Table
                  columns={columns}
                  dataSource={pageRows}
                  rowKey="id"
                  loading={loadingSlots}
                  pagination={false}
                  scroll={{ x: 800 }}
                  locale={{
                    emptyText: (
                      <div style={{ padding: '40px 0', textAlign: 'center' }}>
                        <CalendarClock size={36} style={{ color: '#cbd5e1', margin: '0 auto 8px' }} />
                        <div style={{ fontSize: 13, fontWeight: 650, color: '#475569' }}>
                          No availability configured in this doctor profile
                        </div>
                        {isCreatable && (
                          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                            Click &ldquo;+ Add Availability Slot&rdquo; to add consultation hours.
                          </div>
                        )}
                      </div>
                    ),
                  }}
                />
              </div>

              {/* Footer matching Doctor page */}
              <footer className="ui-footer">
                <span>
                  {filteredSlots.length === 0 ? (
                    'No results'
                  ) : (
                    <>
                      Showing{' '}
                      <strong>
                        {startIdx + 1}–{startIdx + pageRows.length}
                      </strong>{' '}
                      of <strong>{filteredSlots.length}</strong>
                      {filteredSlots.length !== slots.length && <> (filtered from {slots.length})</>}
                    </>
                  )}
                </span>
                <div className="ui-pager">
                  <span>Per page</span>
                  <select
                    className="ui-select"
                    value={perPage}
                    onChange={(e) => {
                      setPerPage(Number(e.target.value));
                      setPage(1);
                    }}
                    aria-label="Rows per page"
                  >
                    {PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="ui-btn ui-btn-sm"
                    onClick={() => setPage(1)}
                    disabled={current === 1}
                  >
                    « First
                  </button>
                  <button
                    type="button"
                    className="ui-btn ui-btn-sm"
                    onClick={() => setPage(current - 1)}
                    disabled={current === 1}
                  >
                    ‹ Prev
                  </button>
                  <span className="ui-pager-page">
                    Page {current} of {pageCount}
                  </span>
                  <button
                    type="button"
                    className="ui-btn ui-btn-sm"
                    onClick={() => setPage(current + 1)}
                    disabled={current === pageCount}
                  >
                    Next ›
                  </button>
                  <button
                    type="button"
                    className="ui-btn ui-btn-sm"
                    onClick={() => setPage(pageCount)}
                    disabled={current === pageCount}
                  >
                    Last »
                  </button>
                </div>
              </footer>
            </div>
          )}
        </>
      )}

      {/* SECTION 2: BLOCKED DATES & TIME SLOTS */}
      {activeMainSection === 'blocked' && (
        <>
          {/* Blocked Dates Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
              background: '#ffffff',
              padding: '8px 14px',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 12, fontWeight: 650, color: '#334155' }}>Filter Status:</span>
              <Select
                value={blockedStatusFilter}
                onChange={(val) => {
                  setBlockedStatusFilter(val);
                  setBlockedPage(1);
                }}
                style={{ width: 140 }}
                options={[
                  { value: 'ALL', label: 'All Blocked Dates' },
                  { value: 'UPCOMING', label: 'Upcoming Only' },
                  { value: 'TODAY', label: 'Today' },
                  { value: 'PAST', label: 'Past Dates' },
                ]}
              />

              <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: 240 }}>
                <Search size={13} style={{ position: 'absolute', left: 10, color: '#94a3b8' }} />
                <input
                  type="text"
                  value={blockedSearchTerm}
                  onChange={(e) => {
                    setBlockedSearchTerm(e.target.value);
                    setBlockedPage(1);
                  }}
                  placeholder="Search date (YYYY-MM-DD) or reason..."
                  className="ui-input"
                  style={{ paddingLeft: 28, height: 32, fontSize: 12, width: '100%' }}
                />
              </div>
            </div>

            {/* View Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div
                style={{
                  background: '#f1f5f9',
                  borderRadius: 8,
                  padding: 3,
                  display: 'flex',
                  gap: 2,
                }}
              >
                <button
                  type="button"
                  onClick={() => setBlockedViewMode('table')}
                  style={{
                    border: 'none',
                    background: blockedViewMode === 'table' ? '#ffffff' : 'transparent',
                    color: blockedViewMode === 'table' ? '#dc2626' : '#64748b',
                    fontWeight: 600,
                    fontSize: 12,
                    borderRadius: 6,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: blockedViewMode === 'table' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <List size={13} /> List View
                </button>
                <button
                  type="button"
                  onClick={() => setBlockedViewMode('cards')}
                  style={{
                    border: 'none',
                    background: blockedViewMode === 'cards' ? '#ffffff' : 'transparent',
                    color: blockedViewMode === 'cards' ? '#dc2626' : '#64748b',
                    fontWeight: 600,
                    fontSize: 12,
                    borderRadius: 6,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: blockedViewMode === 'cards' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  }}
                >
                  <Grid size={13} /> Calendar Cards
                </button>
              </div>
            </div>
          </div>

          {/* Blocked Dates Content */}
          {blockedViewMode === 'table' ? (
            <div
              className="ui-card ui-table-card"
              style={{
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 16,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}
            >
              <div
                className="ui-table-scroll availability-table-scroll"
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: 'auto',
                  overflowX: 'auto',
                }}
              >
                <Table
                  columns={blockedColumns}
                  dataSource={blockedPageRows}
                  rowKey="id"
                  loading={loadingBlocked}
                  pagination={false}
                  scroll={{ x: 800 }}
                  locale={{
                    emptyText: (
                      <div style={{ padding: '44px 0', textAlign: 'center' }}>
                        <CalendarX size={38} style={{ color: '#cbd5e1', margin: '0 auto 8px' }} />
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: '#334155' }}>
                          No blocked dates or time ranges for this doctor
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                          Dr. {currentDoctor?.name || 'Doctor'} is currently available for appointments according to their configured weekly schedule.
                        </div>
                        {isCreatable && (
                          <button
                            type="button"
                            className="ui-btn"
                            onClick={() => handleOpenBlockModal(null)}
                            style={{
                              marginTop: 14,
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#dc2626',
                              borderColor: '#fca5a5',
                              background: '#fef2f2',
                            }}
                          >
                            <Plus size={13} /> Block a Date / Leave
                          </button>
                        )}
                      </div>
                    ),
                  }}
                />
              </div>

              {/* Blocked Dates Footer */}
              <footer className="ui-footer">
                <span>
                  {filteredBlockedDates.length === 0 ? (
                    'No results'
                  ) : (
                    <>
                      Showing{' '}
                      <strong>
                        {blockedStartIdx + 1}–{blockedStartIdx + blockedPageRows.length}
                      </strong>{' '}
                      of <strong>{filteredBlockedDates.length}</strong>
                      {filteredBlockedDates.length !== blockedDates.length && (
                        <> (filtered from {blockedDates.length})</>
                      )}
                    </>
                  )}
                </span>
                <div className="ui-pager">
                  <span>Per page</span>
                  <select
                    className="ui-select"
                    value={blockedPerPage}
                    onChange={(e) => {
                      setBlockedPerPage(Number(e.target.value));
                      setBlockedPage(1);
                    }}
                    aria-label="Rows per page"
                  >
                    {PAGE_SIZES.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="ui-btn ui-btn-sm"
                    onClick={() => setBlockedPage(1)}
                    disabled={currentBlockedPage === 1}
                  >
                    « First
                  </button>
                  <button
                    type="button"
                    className="ui-btn ui-btn-sm"
                    onClick={() => setBlockedPage(currentBlockedPage - 1)}
                    disabled={currentBlockedPage === 1}
                  >
                    ‹ Prev
                  </button>
                  <span className="ui-pager-page">
                    Page {currentBlockedPage} of {blockedPageCount}
                  </span>
                  <button
                    type="button"
                    className="ui-btn ui-btn-sm"
                    onClick={() => setBlockedPage(currentBlockedPage + 1)}
                    disabled={currentBlockedPage === blockedPageCount}
                  >
                    Next ›
                  </button>
                  <button
                    type="button"
                    className="ui-btn ui-btn-sm"
                    onClick={() => setBlockedPage(blockedPageCount)}
                    disabled={currentBlockedPage === blockedPageCount}
                  >
                    Last »
                  </button>
                </div>
              </footer>
            </div>
          ) : (
            /* Cards / Calendar View */
            <div
              className="availability-scroll-container"
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: 'auto',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 14,
                paddingRight: 4,
                alignContent: 'start',
              }}
            >
              {filteredBlockedDates.length === 0 ? (
                <div
                  style={{
                    gridColumn: '1 / -1',
                    background: '#ffffff',
                    border: '1px dashed #cbd5e1',
                    borderRadius: 14,
                    padding: '48px 24px',
                    textAlign: 'center',
                    color: '#64748b',
                  }}
                >
                  <CalendarX size={40} style={{ color: '#cbd5e1', margin: '0 auto 10px' }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>
                    No blocked dates or time ranges found
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    {isCreatable
                      ? 'Use the "Block Date / Time" button to block doctor leave or unavailable consultation hours.'
                      : 'No blocked dates or unavailable hours are scheduled.'}
                  </div>
                </div>
              ) : (
                filteredBlockedDates.map((b) => {
                  const [y = 2026, m = 1, d = 1] = b.blocked_date.split('-').map(Number);
                  const dateObj = new Date(y, m - 1, d);
                  const monthShort = dateObj.toLocaleDateString('en-US', { month: 'short' });
                  const dayNum = dateObj.getDate();
                  const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'long' });

                  return (
                    <div key={b.id} className="blocked-card">
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 44,
                              height: 48,
                              borderRadius: 8,
                              background: '#fef2f2',
                              border: '1px solid #fee2e2',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: '#dc2626' }}>
                              {monthShort}
                            </span>
                            <span style={{ fontSize: 18, fontWeight: 800, color: '#991b1b', lineHeight: 1 }}>
                              {dayNum}
                            </span>
                          </div>

                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13.5, color: '#0f172a' }}>
                              {weekday}
                            </div>
                            <div style={{ fontSize: 11.5, color: '#64748b' }}>
                              {b.blocked_date}
                            </div>
                          </div>
                        </div>

                        {b.status === 'TODAY' ? (
                          <Tag color="processing" style={{ margin: 0, fontWeight: 650 }}>Today</Tag>
                        ) : b.status === 'UPCOMING' ? (
                          <Tag color="success" style={{ margin: 0, fontWeight: 650 }}>Upcoming</Tag>
                        ) : (
                          <Tag color="default" style={{ margin: 0 }}>Past</Tag>
                        )}
                      </div>

                      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div>
                          {b.is_all_day ? (
                            <Tag color="error" style={{ fontWeight: 650, borderRadius: 5, fontSize: 11 }}>
                              Full Day Off (All Slots Excluded)
                            </Tag>
                          ) : (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                              <Clock size={12} style={{ color: '#d97706' }} />
                              <span style={{ fontSize: 12, fontWeight: 650, color: '#1e293b' }}>
                                {formatTime12(b.start_time)} – {formatTime12(b.end_time)}
                              </span>
                            </div>
                          )}
                        </div>

                        {b.reason ? (
                          <div
                            style={{
                              fontSize: 12,
                              color: '#334155',
                              background: '#f8fafc',
                              padding: '5px 8px',
                              borderRadius: 6,
                              border: '1px solid #f1f5f9',
                            }}
                          >
                            <strong>Reason:</strong> {b.reason}
                          </div>
                        ) : (
                          <div style={{ fontSize: 11.5, color: '#94a3b8', fontStyle: 'italic' }}>
                            No reason provided
                          </div>
                        )}
                      </div>

                      {(isUpdatable || isDeletable) && (
                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 10,
                            borderTop: '1px solid #f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 6,
                          }}
                        >
                          {isUpdatable && (
                            <button
                              type="button"
                              onClick={() => handleOpenBlockModal(b)}
                              style={{
                                border: '1px solid #ede9fe',
                                background: '#ffffff',
                                color: '#7c3aed',
                                fontSize: 11.5,
                                fontWeight: 600,
                                borderRadius: 5,
                                padding: '3px 8px',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                              }}
                            >
                              <Pencil size={11} /> Edit
                            </button>
                          )}
                          {isDeletable && (
                            <Popconfirm
                              title="Unblock date?"
                              description={`Unblock ${b.blocked_date}? Consultation slots will become available for booking immediately.`}
                              onConfirm={() => handleDeleteBlockedDate(b.id, b.blocked_date)}
                              okText="Unblock"
                              cancelText="Cancel"
                              okButtonProps={{ danger: true }}
                            >
                              <button
                                type="button"
                                title="Unblock date"
                                aria-label="Unblock date"
                                style={{
                                  border: '1px solid #fecaca',
                                  background: '#ffffff',
                                  color: '#ef4444',
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  borderRadius: 5,
                                  padding: '3px 8px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                }}
                              >
                                <Trash2 size={11} />
                              </button>
                            </Popconfirm>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* Create / Edit Availability Slot Drawer */}
      <Drawer
        open={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        width="min(520px, 95vw)"
        destroyOnClose
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: '#f5f3ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7c3aed',
              }}
            >
              <CalendarClock size={18} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                {editingSlot ? 'Edit Availability Slot' : 'Add Availability Slot'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                {currentDoctor?.name
                  ? `Configuring profile for ${currentDoctor.name}`
                  : 'Configure consultation hours'}
              </div>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSaveSlot} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Doctor Info (Fixed to current doctor) */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Stethoscope size={16} style={{ color: '#7c3aed' }} />
            <div>
              <div style={{ fontWeight: 650, color: '#0f172a', fontSize: 13 }}>
                {currentDoctor?.name || 'Selected Doctor'}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                {[currentDoctor?.specialization, currentDoctor?.hospital_name].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>

          {/* Hospital Branch Selection */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
              HOSPITAL BRANCH / CLINIC *
            </label>
            <Select
              value={formBranchId}
              onChange={(val) => setFormBranchId(val)}
              style={{ width: '100%' }}
              placeholder="Select Branch"
              options={doctorBranches.map((b) => ({
                value: b.id,
                label: b.name,
              }))}
            />
          </div>

          {/* Day of Week */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
              DAY OF WEEK *
            </label>
            <Select
              value={formDay}
              onChange={(val) => setFormDay(val as DayOfWeek)}
              style={{ width: '100%' }}
              options={DAYS_OF_WEEK.map((d) => ({
                value: d,
                label: titleCase(d),
              }))}
            />
          </div>

          {/* Time Window */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                START TIME *
              </label>
              <input
                type="time"
                value={formStartTime}
                onChange={(e) => setFormStartTime(e.target.value)}
                required
                className="ui-input"
                style={{ width: '100%', height: 36, fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                END TIME *
              </label>
              <input
                type="time"
                value={formEndTime}
                onChange={(e) => setFormEndTime(e.target.value)}
                required
                className="ui-input"
                style={{ width: '100%', height: 36, fontSize: 13 }}
              />
            </div>
          </div>

          {/* Slot Duration */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                APPOINTMENT SLOT DURATION (MINUTES) *
              </label>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: '#7c3aed' }}>
                {formSlotLength} Mins
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {COMMON_SLOT_LENGTHS.map((len) => (
                <button
                  key={len}
                  type="button"
                  onClick={() => setFormSlotLength(len)}
                  style={{
                    border: formSlotLength === len ? '1px solid #7c3aed' : '1px solid #e2e8f0',
                    background: formSlotLength === len ? '#7c3aed' : '#ffffff',
                    color: formSlotLength === len ? '#ffffff' : '#334155',
                    borderRadius: 6,
                    padding: '4px 10px',
                    fontSize: 11.5,
                    cursor: 'pointer',
                    fontWeight: formSlotLength === len ? 650 : 500,
                  }}
                >
                  {len} Mins
                </button>
              ))}
            </div>
          </div>

          {/* Status */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
              STATUS
            </label>
            <Select
              value={formStatus}
              onChange={(val) => setFormStatus(val as 'ACTIVE' | 'INACTIVE')}
              style={{ width: '100%' }}
              options={[
                { value: 'ACTIVE', label: 'Active (Available for Appointments)' },
                { value: 'INACTIVE', label: 'Inactive (Temporarily Paused)' },
              ]}
            />
          </div>

          {/* Multi-day replication (only on create) */}
          {!editingSlot && (
            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: '10px 14px',
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 650,
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  marginBottom: 6,
                }}
              >
                <Copy size={13} style={{ color: '#7c3aed' }} /> Replicate to other days (Optional)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {DAYS_OF_WEEK.filter((d) => d !== formDay).map((d) => {
                  const isChecked = formCopyDays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setFormCopyDays((prev) =>
                          isChecked ? prev.filter((item) => item !== d) : [...prev, d]
                        );
                      }}
                      style={{
                        border: isChecked ? '1px solid #7c3aed' : '1px solid #cbd5e1',
                        background: isChecked ? '#ede9fe' : '#ffffff',
                        color: isChecked ? '#6d28d9' : '#475569',
                        borderRadius: 5,
                        padding: '3px 7px',
                        fontSize: 11,
                        cursor: 'pointer',
                        fontWeight: isChecked ? 650 : 500,
                      }}
                    >
                      {titleCase(d).slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Drawer Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              paddingTop: 12,
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              className="ui-btn"
              onClick={() => setIsEditorOpen(false)}
              disabled={savingSlot}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ui-btn ui-btn-primary"
              disabled={savingSlot}
              style={{
                background: '#7c3aed',
                borderColor: '#7c3aed',
                color: '#ffffff',
                fontWeight: 600,
                padding: '6px 18px',
              }}
            >
              {savingSlot ? 'Saving...' : editingSlot ? 'Update Availability' : 'Save to Doctor Profile'}
            </button>
          </div>
        </form>
      </Drawer>

      {/* Block Date & Time Slots Drawer */}
      <Drawer
        open={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        width="min(520px, 95vw)"
        destroyOnClose
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#dc2626',
              }}
            >
              <CalendarX size={18} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                {editingBlock ? 'Edit Blocked Date / Time' : 'Block Date & Time Slots'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                Prevent appointments during doctor leave, surgeries, or unavailable hours
              </div>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSaveBlockedDate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Doctor Info Card */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Stethoscope size={16} style={{ color: '#dc2626' }} />
            <div>
              <div style={{ fontWeight: 650, color: '#0f172a', fontSize: 13 }}>
                {currentDoctor?.name || 'Selected Doctor'}
              </div>
              <div style={{ fontSize: 11.5, color: '#64748b' }}>
                {[currentDoctor?.specialization, currentDoctor?.hospital_name].filter(Boolean).join(' · ')}
              </div>
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
              DATE TO BLOCK *
            </label>
            <input
              type="date"
              value={blockFormDate}
              onChange={(e) => setBlockFormDate(e.target.value)}
              required
              className="ui-input"
              style={{ width: '100%', height: 38, fontSize: 13 }}
            />
          </div>

          {/* Scope Selector: Full Day vs Specific Range */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
              BLOCK TYPE / SCOPE *
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div
                onClick={() => setBlockFormMode('all_day')}
                style={{
                  border: blockFormMode === 'all_day' ? '2px solid #dc2626' : '1px solid #e2e8f0',
                  background: blockFormMode === 'all_day' ? '#fef2f2' : '#ffffff',
                  borderRadius: 10,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#991b1b' }}>
                  <Ban size={15} />
                  <span>Entire Day</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  Block all consultation hours for this full date
                </div>
              </div>

              <div
                onClick={() => setBlockFormMode('time_range')}
                style={{
                  border: blockFormMode === 'time_range' ? '2px solid #dc2626' : '1px solid #e2e8f0',
                  background: blockFormMode === 'time_range' ? '#fef2f2' : '#ffffff',
                  borderRadius: 10,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 13, color: '#991b1b' }}>
                  <Clock size={15} />
                  <span>Time Range</span>
                </div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                  Block specific hours (e.g. 10:00 AM – 01:00 PM)
                </div>
              </div>
            </div>
          </div>

          {/* Time pickers when time_range is selected */}
          {blockFormMode === 'time_range' && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fee2e2',
                borderRadius: 10,
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 650, color: '#7f1d1d', display: 'block', marginBottom: 4 }}>
                    START TIME *
                  </label>
                  <input
                    type="time"
                    value={blockFormStartTime}
                    onChange={(e) => setBlockFormStartTime(e.target.value)}
                    required
                    className="ui-input"
                    style={{ width: '100%', height: 34, fontSize: 12.5 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 650, color: '#7f1d1d', display: 'block', marginBottom: 4 }}>
                    END TIME *
                  </label>
                  <input
                    type="time"
                    value={blockFormEndTime}
                    onChange={(e) => setBlockFormEndTime(e.target.value)}
                    required
                    className="ui-input"
                    style={{ width: '100%', height: 34, fontSize: 12.5 }}
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <span style={{ fontSize: 11, color: '#7f1d1d', fontWeight: 600 }}>Quick Presets:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                  {[
                    { label: 'Morning (09:00 – 13:00)', s: '09:00', e: '13:00' },
                    { label: 'Afternoon (14:00 – 17:00)', s: '14:00', e: '17:00' },
                    { label: 'Evening (17:00 – 20:00)', s: '17:00', e: '20:00' },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setBlockFormStartTime(preset.s);
                        setBlockFormEndTime(preset.e);
                      }}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #fca5a5',
                        color: '#991b1b',
                        borderRadius: 5,
                        padding: '2px 8px',
                        fontSize: 10.5,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reason / Notes */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
              REASON FOR BLOCKING (OPTIONAL)
            </label>
            <input
              type="text"
              value={blockFormReason}
              onChange={(e) => setBlockFormReason(e.target.value)}
              placeholder="e.g. Annual Leave, Surgery / Operation, Medical Conference"
              className="ui-input"
              style={{ width: '100%', height: 36, fontSize: 13 }}
            />

            {/* Quick Reason Presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
              {REASON_PRESETS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setBlockFormReason(reason)}
                  style={{
                    background: blockFormReason === reason ? '#fee2e2' : '#f8fafc',
                    border: blockFormReason === reason ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                    color: blockFormReason === reason ? '#991b1b' : '#64748b',
                    borderRadius: 5,
                    padding: '2px 8px',
                    fontSize: 11,
                    cursor: 'pointer',
                    fontWeight: blockFormReason === reason ? 650 : 500,
                  }}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          {/* Information Notice */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 11.5,
              color: '#475569',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <Info size={15} style={{ color: '#7c3aed', flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong>Instant Appointment Integration:</strong> Any consultation appointment slots falling into this blocked date or time window will be excluded immediately from the scheduling drawer. Double bookings are strictly prevented.
            </div>
          </div>

          {/* Drawer Actions */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 10,
              paddingTop: 12,
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              className="ui-btn"
              onClick={() => setIsBlockModalOpen(false)}
              disabled={savingBlock}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="ui-btn"
              disabled={savingBlock}
              style={{
                background: '#dc2626',
                borderColor: '#dc2626',
                color: '#ffffff',
                fontWeight: 600,
                padding: '6px 18px',
                cursor: 'pointer',
              }}
            >
              {savingBlock
                ? 'Saving...'
                : editingBlock
                  ? 'Update Blocked Date'
                  : 'Confirm & Block Date'}
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
