import { App, Popconfirm, Tag } from 'antd';
import {
  Ban,
  CalendarClock,
  CalendarX,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Grid,
  Info,
  List,
  MapPin,
  Pencil,
  Plus,
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
import {
  CommonFilterBar,
  CommonPageHeader,
  CommonPagination,
  CommonTable,
  type CommonTableColumn,
  StatusPill,
} from '../components/ui/CommonTable';
import { Modal } from '../components/ui/Modal';
import { SearchableSelect } from '../components/ui/SearchableSelect';
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

  // Pagination & sorting for weekly slots table view
  const [perPage, setPerPage] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [slotSort, setSlotSort] = useState<{ id: string; dir: 'asc' | 'desc' } | null>(null);

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
  const [blockedSort, setBlockedSort] = useState<{ id: string; dir: 'asc' | 'desc' } | null>(null);

  // Drawer state for Block Date & Time
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<DoctorBlockedDate | null>(null);
  const [blockFormDate, setBlockFormDate] = useState<string>('');
  const [blockFormMode, setBlockFormMode] = useState<'all_day' | 'time_range'>('all_day');
  const [blockFormStartTime, setBlockFormStartTime] = useState<string>('09:00');
  const [blockFormEndTime, setBlockFormEndTime] = useState<string>('17:00');
  const [blockFormReason, setBlockFormReason] = useState<string>('');
  const [savingBlock, setSavingBlock] = useState(false);

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

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
      message.error(getErrorMessage(err, 'Failed to load doctor blocked dates'));
    } finally {
      setLoadingBlocked(false);
    }
  }, [message]);

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
        const created = await doctorAvailabilityApi.createBlockedDate(selectedDoctorId, payload);
        message.success('Date and time blocked successfully! Appointment slots updated.');
        setBlockedStatusFilter('ALL');
        setBlockedSearchTerm('');
        setBlockedPage(1);
        setActiveMainSection('blocked');
        if (created?.id) {
          setBlockedDates((prev) => {
            const exists = prev.some((item) => item.id === created.id);
            return exists ? prev : [...prev, created];
          });
        }
      }

      setIsBlockModalOpen(false);
      await fetchBlockedDates(selectedDoctorId);
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

  // Weekly Slots Table Columns (CommonTable matching Doctor page)
  const columns: CommonTableColumn<DoctorAvailabilitySlot>[] = useMemo(
    () => [
      {
        id: 'day_of_week',
        header: 'Day of Week',
        width: 140,
        sort: (r) => DAYS_OF_WEEK.indexOf(r.day_of_week),
        cell: (r) => (
          <span className="font-semibold text-slate-900">{titleCase(r.day_of_week)}</span>
        ),
      },
      {
        id: 'time_window',
        header: 'Time Window',
        sort: (r) => r.start_time,
        cell: (r) => (
          <div className="inline-flex items-center gap-1.5">
            <Clock size={13} className="text-blue-600 shrink-0" />
            <span className="font-semibold text-slate-700">
              {formatTime12(r.start_time)} – {formatTime12(r.end_time)}
            </span>
          </div>
        ),
      },
      {
        id: 'slot_length',
        header: 'Slot Duration',
        width: 150,
        sort: (r) => r.slot_length || selectedSlotDuration || 30,
        cell: (r) => (
          <Tag color="blue" style={{ fontWeight: 650, borderRadius: 6, margin: 0 }}>
            {r.slot_length || selectedSlotDuration || 30} mins
          </Tag>
        ),
      },
      {
        id: 'branch_name',
        header: 'Branch / Clinic',
        sort: (r) => (r.branch_name || 'Main Clinic').toLowerCase(),
        cell: (r) => (
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <MapPin size={12} className="text-slate-400 shrink-0" />
            <span>{r.branch_name || 'Main Clinic'}</span>
          </span>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        width: 120,
        sort: (r) => r.status ?? '',
        cell: (r) => <StatusPill label={r.status} active={r.status === 'ACTIVE'} />,
      },
    ],
    [selectedSlotDuration],
  );

  // Blocked Dates Table Columns (CommonTable matching Doctor page)
  const blockedColumns: CommonTableColumn<DoctorBlockedDate>[] = useMemo(
    () => [
      {
        id: 'blocked_date',
        header: 'Blocked Date',
        sort: (r) => r.blocked_date,
        cell: (r) => {
          const [y = 2026, m = 1, d = 1] = r.blocked_date.split('-').map(Number);
          const dateObj = new Date(y, m - 1, d);
          const dayName =
            ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
              dateObj.getDay()
            ] || '';
          const formatted = dateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          });
          return (
            <div>
              <div className="font-bold text-slate-900 text-xs">{formatted}</div>
              <div className="text-[11px] text-slate-500">{dayName}</div>
            </div>
          );
        },
      },
      {
        id: 'scope',
        header: 'Blocked Scope / Hours',
        sort: (r) => (r.is_all_day ? '0' : r.start_time),
        cell: (r) => {
          if (r.is_all_day) {
            return (
              <Tag
                color="error"
                style={{ fontWeight: 650, borderRadius: 6, fontSize: 11.5, padding: '2px 8px', margin: 0 }}
              >
                Full Day Blocked (All Slots Excluded)
              </Tag>
            );
          }
          return (
            <div className="inline-flex items-center gap-1.5">
              <Tag
                color="warning"
                style={{ fontWeight: 650, borderRadius: 6, fontSize: 11.5, padding: '2px 8px', margin: 0 }}
              >
                Time Range
              </Tag>
              <span className="text-xs font-semibold text-slate-800">
                {formatTime12(r.start_time)} – {formatTime12(r.end_time)}
              </span>
            </div>
          );
        },
      },
      {
        id: 'reason',
        header: 'Reason / Notes',
        sort: (r) => (r.reason || '').toLowerCase(),
        cell: (r) =>
          r.reason ? (
            <span className="text-xs font-medium text-slate-700">{r.reason}</span>
          ) : (
            <span className="text-xs text-slate-400 italic">No reason specified</span>
          ),
      },
      {
        id: 'status',
        header: 'Status',
        width: 120,
        sort: (r) => r.status ?? '',
        cell: (r) => {
          if (r.status === 'TODAY') return <StatusPill label="Today" tone="blue" />;
          if (r.status === 'UPCOMING') return <StatusPill label="Upcoming" tone="green" />;
          return <StatusPill label="Past" tone="gray" />;
        },
      },
    ],
    [],
  );

  // Sorted & paginated rows for Weekly Slots table
  const sortedSlots = useMemo(() => {
    const list = [...filteredSlots];
    const col = slotSort && columns.find((c) => c.id === slotSort.id);
    if (col?.sort && slotSort) {
      const key = col.sort;
      const dir = slotSort.dir === 'asc' ? 1 : -1;
      list.sort((a, b) => {
        const av = key(a);
        const bv = key(b);
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
      });
    }
    return list;
  }, [filteredSlots, slotSort, columns]);

  const pageCount = Math.max(1, Math.ceil(sortedSlots.length / perPage));
  const current = Math.min(page, pageCount);
  const startIdx = (current - 1) * perPage;
  const pageRows = sortedSlots.slice(startIdx, startIdx + perPage);

  // Sorted & paginated rows for Blocked Dates table
  const sortedBlockedDates = useMemo(() => {
    const list = [...filteredBlockedDates];
    const col = blockedSort && blockedColumns.find((c) => c.id === blockedSort.id);
    if (col?.sort && blockedSort) {
      const key = col.sort;
      const dir = blockedSort.dir === 'asc' ? 1 : -1;
      list.sort((a, b) => {
        const av = key(a);
        const bv = key(b);
        if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
        return String(av).localeCompare(String(bv), undefined, { numeric: true }) * dir;
      });
    }
    return list;
  }, [filteredBlockedDates, blockedSort, blockedColumns]);

  const blockedPageCount = Math.max(1, Math.ceil(sortedBlockedDates.length / blockedPerPage));
  const currentBlockedPage = Math.min(blockedPage, blockedPageCount);
  const blockedStartIdx = (currentBlockedPage - 1) * blockedPerPage;
  const blockedPageRows = sortedBlockedDates.slice(
    blockedStartIdx,
    blockedStartIdx + blockedPerPage,
  );

  const toggleSlotSort = (id: string) => {
    setSlotSort((prev) => {
      if (prev?.id !== id) return { id, dir: 'asc' };
      if (prev.dir === 'asc') return { id, dir: 'desc' };
      return null;
    });
  };

  const toggleBlockedSort = (id: string) => {
    setBlockedSort((prev) => {
      if (prev?.id !== id) return { id, dir: 'asc' };
      if (prev.dir === 'asc') return { id, dir: 'desc' };
      return null;
    });
  };

  return (
    <div
      className="ui-page doctor-availability-page"
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
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

      {/* Top Header (matching DataView / CommonPageHeader across other pages) */}
      <div className="shrink-0">
        <CommonPageHeader
          title="Doctor Availability & Slots"
          subtitle="Consultation hours, slot durations, and blocked dates configured directly on the Doctor Profile."
          loading={loadingSlots || loadingBlocked}
          onRefresh={() => {
            if (selectedDoctorId) {
              void fetchDoctorAvailability(selectedDoctorId);
              void fetchBlockedDates(selectedDoctorId);
            }
          }}
          extraActions={
            isCreatable ? (
              <button
                type="button"
                onClick={() => handleOpenBlockModal(null)}
                disabled={!selectedDoctorId}
                className="inline-flex items-center gap-1.5 h-7.5 px-3 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CalendarX size={13} />
                <span>Block Date / Time</span>
              </button>
            ) : null
          }
          {...(isCreatable
            ? {
                createLabel: 'Add Availability Slot',
                onCreate: () => {
                  if (selectedDoctorId) handleOpenEditor(null);
                },
              }
            : {})}
        />
      </div>

      {/* Doctor Profile Banner & Slot Duration Configuration Card */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 12,
          padding: '14px 16px',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))',
          gap: 16,
          flexShrink: 0,
        }}
      >
        {/* Left: Doctor Profile Selector & Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: '#475569', letterSpacing: '0.03em' }}>
              SELECT DOCTOR PROFILE:
            </span>
            <div style={{ flex: 1, minWidth: 200 }}>
              <SearchableSelect
                aria-label="Select Doctor Profile"
                value={selectedDoctorId}
                onChange={handleSelectDoctor}
                loading={loadingDoctors}
                searchable={true}
                placeholder="Search or Select Doctor..."
                searchPlaceholder="Search doctor name or specialization..."
                options={doctors.map((d) => ({
                  value: d.id,
                  label: d.name,
                  sublabel: d.specialization || 'General',
                }))}
              />
            </div>
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
                  background: '#eff6ff',
                  border: '1px solid #dbeafe',
                  color: '#2563eb',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>
                    {currentDoctor.name}
                  </span>
                  <Tag color="blue" style={{ margin: 0, fontWeight: 600, fontSize: 11 }}>
                    {currentDoctor.specialization || 'Doctor'}
                  </Tag>
                  {currentDoctor.qualification && (
                    <span style={{ fontSize: 11.5, color: '#64748b' }}>
                      ({currentDoctor.qualification})
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#475569', marginTop: 2, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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
            background: '#eff6ff',
            border: '1px solid #dbeafe',
            borderRadius: 10,
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
                  color: '#1e40af',
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
                  background: '#2563eb',
                  color: '#ffffff',
                  padding: '1px 8px',
                  borderRadius: 12,
                }}
              >
                {selectedSlotDuration} Mins
              </span>
            </div>
            <p style={{ margin: '0 0 10px', fontSize: 11.5, color: '#1d4ed8' }}>
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
                          border: isSelected ? '1px solid #2563eb' : '1px solid #bfdbfe',
                          background: isSelected ? '#2563eb' : '#ffffff',
                          color: isSelected ? '#ffffff' : '#1d4ed8',
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
                  background: '#2563eb',
                  borderColor: '#2563eb',
                  color: '#ffffff',
                  padding: '5px 12px',
                  borderRadius: 7,
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
            color: activeMainSection === 'schedule' ? '#2563eb' : '#64748b',
            borderBottom:
              activeMainSection === 'schedule' ? '2.5px solid #2563eb' : '2.5px solid transparent',
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
              background: activeMainSection === 'schedule' ? '#eff6ff' : '#f1f5f9',
              color: activeMainSection === 'schedule' ? '#1d4ed8' : '#64748b',
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
          <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs flex flex-wrap items-center justify-between gap-2 pr-3 shrink-0">
            <CommonFilterBar
              className="flex-1 border-b-0 bg-transparent !justify-start"
              search={searchTerm}
              onSearchChange={(val) => {
                setSearchTerm(val);
                setPage(1);
              }}
              searchPlaceholder="Search branch or day..."
              dropdowns={[
                {
                  id: 'day',
                  label: 'Day',
                  allLabel: 'All Configured Days',
                  value: dayFilter === 'all' ? '' : dayFilter,
                  onChange: (val) => {
                    setDayFilter(val || 'all');
                    setPage(1);
                  },
                  options: DAYS_OF_WEEK.map((d) => ({
                    value: d,
                    label: titleCase(d),
                    count: slots.filter((s) => s.day_of_week === d).length,
                  })),
                },
              ]}
              hasActiveFilters={dayFilter !== 'all' || Boolean(searchTerm.trim())}
              onReset={() => {
                setDayFilter('all');
                setSearchTerm('');
                setPage(1);
              }}
            />

            {/* View Toggle */}
            <div className="flex items-center gap-1.5 py-1.5 pl-3 sm:pl-0">
              <div className="bg-slate-100 rounded-lg p-0.5 flex gap-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('schedule')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'schedule'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Grid size={13} /> Weekly Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white text-blue-600 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
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
                        background: '#2563eb',
                        borderColor: '#2563eb',
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
                              background: daySlots.length > 0 ? '#eff6ff' : '#f1f5f9',
                              color: daySlots.length > 0 ? '#1d4ed8' : '#94a3b8',
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
                              border: '1px dashed #bfdbfe',
                              background: '#eff6ff',
                              color: '#2563eb',
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
                                  <Clock size={13} style={{ color: '#2563eb' }} />
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
                                        border: '1px solid #dbeafe',
                                        background: '#eff6ff',
                                        color: '#2563eb',
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
            /* Table View of Configured Slots (CommonTable + CommonPagination matching Doctor page) */
            <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs overflow-hidden flex flex-col flex-1 min-h-0">
              <div className="flex-1 min-h-0 overflow-y-auto [&>div]:border-0 [&>div]:rounded-none [&>div]:shadow-none">
                <CommonTable<DoctorAvailabilitySlot>
                  columns={columns}
                  data={pageRows}
                  loading={loadingSlots}
                  sort={slotSort}
                  onSortChange={toggleSlotSort}
                  {...(isUpdatable || isDeletable
                    ? {
                        rowActions: (r) => (
                          <div className="flex items-center justify-end gap-1">
                            {isUpdatable && (
                              <button
                                type="button"
                                className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenEditor(r);
                                }}
                                title="Edit"
                                aria-label="Edit"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                            {isDeletable && (
                              <Popconfirm
                                title="Delete this availability slot?"
                                description="Appointments outside remaining schedules may be affected."
                                onConfirm={() => handleDeleteSlot(r.id, r.day_of_week)}
                                okText="Delete"
                                okButtonProps={{ danger: true }}
                              >
                                <button
                                  type="button"
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Delete slot"
                                  aria-label="Delete slot"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </Popconfirm>
                            )}
                          </div>
                        ),
                      }
                    : {})}
                  emptyState={
                    <div className="py-10 text-center">
                      <CalendarClock size={36} className="text-slate-300 mx-auto mb-2" />
                      <div className="text-xs font-semibold text-slate-600">
                        No availability configured in this doctor profile
                      </div>
                      {isCreatable && (
                        <div className="text-[11px] text-slate-400 mt-1">
                          Click &ldquo;+ Add Availability Slot&rdquo; to add consultation hours.
                        </div>
                      )}
                    </div>
                  }
                />
              </div>

              <CommonPagination
                total={sortedSlots.length}
                startIdx={sortedSlots.length === 0 ? 0 : startIdx + 1}
                endIdx={startIdx + pageRows.length}
                nounPlural="slots"
                page={current}
                pageCount={pageCount}
                perPage={perPage}
                onPageChange={setPage}
                onPerPageChange={(n) => {
                  setPerPage(n);
                  setPage(1);
                }}
              />
            </div>
          )}
        </>
      )}

      {/* SECTION 2: BLOCKED DATES & TIME SLOTS */}
      {activeMainSection === 'blocked' && (
        <>
          {/* Blocked Dates Controls */}
          <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs flex flex-wrap items-center justify-between gap-2 pr-3 shrink-0">
            <CommonFilterBar
              className="flex-1 border-b-0 bg-transparent !justify-start"
              search={blockedSearchTerm}
              onSearchChange={(val) => {
                setBlockedSearchTerm(val);
                setBlockedPage(1);
              }}
              searchPlaceholder="Search date (YYYY-MM-DD) or reason..."
              dropdowns={[
                {
                  id: 'blockedStatus',
                  label: 'Status',
                  allLabel: 'All Blocked Dates',
                  value: blockedStatusFilter === 'ALL' ? '' : blockedStatusFilter,
                  onChange: (val) => {
                    setBlockedStatusFilter((val || 'ALL') as 'ALL' | 'UPCOMING' | 'TODAY' | 'PAST');
                    setBlockedPage(1);
                  },
                  options: [
                    {
                      value: 'UPCOMING',
                      label: 'Upcoming Only',
                      count: blockedDates.filter((b) => b.status === 'UPCOMING').length,
                    },
                    {
                      value: 'TODAY',
                      label: 'Today',
                      count: blockedDates.filter((b) => b.status === 'TODAY').length,
                    },
                    {
                      value: 'PAST',
                      label: 'Past Dates',
                      count: blockedDates.filter((b) => b.status === 'PAST').length,
                    },
                  ],
                },
              ]}
              hasActiveFilters={
                blockedStatusFilter !== 'ALL' || Boolean(blockedSearchTerm.trim())
              }
              onReset={() => {
                setBlockedStatusFilter('ALL');
                setBlockedSearchTerm('');
                setBlockedPage(1);
              }}
            />

            {/* View Toggle */}
            <div className="flex items-center gap-1.5 py-1.5 pl-3 sm:pl-0">
              <div className="bg-slate-100 rounded-lg p-0.5 flex gap-0.5">
                <button
                  type="button"
                  onClick={() => setBlockedViewMode('table')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    blockedViewMode === 'table'
                      ? 'bg-white text-rose-600 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <List size={13} /> List View
                </button>
                <button
                  type="button"
                  onClick={() => setBlockedViewMode('cards')}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    blockedViewMode === 'cards'
                      ? 'bg-white text-rose-600 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Grid size={13} /> Calendar Cards
                </button>
              </div>
            </div>
          </div>

          {/* Blocked Dates Content */}
          {blockedViewMode === 'table' ? (
            <div className="bg-white border border-slate-200/90 rounded-lg shadow-2xs overflow-hidden flex flex-col flex-1 min-h-0">
              <div className="flex-1 min-h-0 overflow-y-auto [&>div]:border-0 [&>div]:rounded-none [&>div]:shadow-none">
                <CommonTable<DoctorBlockedDate>
                  columns={blockedColumns}
                  data={blockedPageRows}
                  loading={loadingBlocked}
                  sort={blockedSort}
                  onSortChange={toggleBlockedSort}
                  {...(isUpdatable || isDeletable
                    ? {
                        rowActions: (r) => (
                          <div className="flex items-center justify-end gap-1">
                            {isUpdatable && (
                              <button
                                type="button"
                                className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenBlockModal(r);
                                }}
                                title="Edit blocked schedule"
                                aria-label="Edit"
                              >
                                <Pencil size={13} />
                              </button>
                            )}
                            {isDeletable && (
                              <Popconfirm
                                title="Remove this blocked date?"
                                description="The doctor will become available according to their weekly schedule on this date."
                                onConfirm={() => handleDeleteBlockedDate(r.id, r.blocked_date)}
                                okText="Unblock"
                                okButtonProps={{ danger: true }}
                              >
                                <button
                                  type="button"
                                  className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Unblock date"
                                  aria-label="Delete"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </Popconfirm>
                            )}
                          </div>
                        ),
                      }
                    : {})}
                  emptyState={
                    <div className="py-10 text-center">
                      <CalendarX size={38} className="text-slate-300 mx-auto mb-2" />
                      <div className="text-sm font-bold text-slate-700">
                        No blocked dates or time ranges for this doctor
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Dr. {currentDoctor?.name || 'Doctor'} is currently available for appointments according to their configured weekly schedule.
                      </div>
                      {isCreatable && (
                        <button
                          type="button"
                          onClick={() => handleOpenBlockModal(null)}
                          className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                        >
                          <Plus size={13} /> Block a Date / Leave
                        </button>
                      )}
                    </div>
                  }
                />
              </div>

              <CommonPagination
                total={sortedBlockedDates.length}
                startIdx={sortedBlockedDates.length === 0 ? 0 : blockedStartIdx + 1}
                endIdx={blockedStartIdx + blockedPageRows.length}
                nounPlural="blocked dates"
                page={currentBlockedPage}
                pageCount={blockedPageCount}
                perPage={blockedPerPage}
                onPageChange={setBlockedPage}
                onPerPageChange={(n) => {
                  setBlockedPerPage(n);
                  setBlockedPage(1);
                }}
              />
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
                                border: '1px solid #dbeafe',
                                background: '#eff6ff',
                                color: '#2563eb',
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

      {/* Create / Edit Availability Slot Common Drawer (matching DoctorModal) */}
      <Modal
        open={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        size="lg"
        variant="drawer"
        className="doctor-create-drawer-modal"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                color: '#2563eb',
                border: '1px solid #bfdbfe',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.16)',
              }}
            >
              {editingSlot ? <Pencil size={18} /> : <CalendarClock size={18} />}
            </div>
            <div>
              <div
                style={{
                  fontSize: 16.5,
                  fontWeight: 700,
                  color: 'var(--ui-text, #0f172a)',
                  letterSpacing: '-0.01em',
                }}
              >
                {editingSlot ? 'Edit Availability Slot' : 'Add Availability Slot'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                {currentDoctor?.name
                  ? `Configuring consultation schedule for ${currentDoctor.name}`
                  : 'Configure weekly consultation hours and slot duration'}
              </div>
            </div>
          </div>
        }
        description=""
      >
        <form onSubmit={handleSaveSlot} className="ui-modal-form" noValidate>
          <style>{`
            .doctor-create-drawer-modal {
              width: min(640px, 100vw) !important;
              max-width: 640px !important;
              background: #ffffff;
              box-shadow: -12px 0 36px rgba(15, 23, 42, 0.14) !important;
            }
            .doctor-create-drawer-modal .ui-modal-head {
              padding: 18px 26px;
              background: #ffffff;
              border-bottom: 1px solid #f1f5f9;
            }
            .doctor-create-drawer-modal .ui-modal-body {
              padding: 20px 24px;
              background: #f8fafc;
              display: flex;
              flex-direction: column;
              gap: 14px;
            }
            .doctor-section-card {
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
            .doctor-section-card:hover {
              border-color: #cbd5e1;
            }
            .doctor-section-header {
              display: flex;
              align-items: center;
              gap: 8px;
              padding-bottom: 8px;
              border-bottom: 1px solid #f1f5f9;
            }
            .doctor-section-badge {
              width: 26px;
              height: 26px;
              border-radius: 7px;
              background: #eff6ff;
              color: #2563eb;
              border: 1px solid #dbeafe;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .doctor-section-tag {
              font-size: 11px;
              font-weight: 700;
              letter-spacing: 0.06em;
              color: #475569;
              text-transform: uppercase;
            }
            .doctor-status-btn {
              flex: 1;
              padding: 12px 14px;
              border-radius: 9px;
              cursor: pointer;
              text-align: left;
              display: flex;
              align-items: flex-start;
              gap: 10px;
              transition: all 0.15s ease;
              position: relative;
            }
            .doctor-status-btn.is-active {
              border: 1.5px solid #2563eb !important;
              background: #eff6ff !important;
              box-shadow: 0 2px 6px rgba(37, 99, 235, 0.12);
            }
            .doctor-status-btn:not(.is-active) {
              border: 1px solid #e2e8f0;
              background: #ffffff;
            }
            .doctor-status-btn:not(.is-active):hover {
              background: #fafafa;
              border-color: #cbd5e1;
            }
            .doctor-submit-btn {
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%) !important;
              box-shadow: 0 2px 8px rgba(37, 99, 235, 0.28) !important;
              border: none !important;
              color: #ffffff !important;
              height: 38px;
              padding: 0 18px;
              font-size: 13px;
              font-weight: 600;
              border-radius: 8px;
              display: inline-flex;
              align-items: center;
              gap: 6px;
              cursor: pointer;
            }
            .doctor-submit-btn:hover:not(:disabled) {
              background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%) !important;
              box-shadow: 0 4px 12px rgba(37, 99, 235, 0.36) !important;
            }
          `}</style>

          <div className="ui-modal-body">
            {/* Section 1: Doctor & Facility Assignment */}
            <div className="doctor-section-card">
              <div className="doctor-section-header">
                <div className="doctor-section-badge">
                  <Stethoscope size={13} />
                </div>
                <div className="doctor-section-tag">Doctor &amp; Facility Assignment</div>
              </div>

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
                <Stethoscope size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 650, color: '#0f172a', fontSize: 13 }}>
                    {currentDoctor?.name || 'Selected Doctor'}
                  </div>
                  <div style={{ fontSize: 11.5, color: '#64748b' }}>
                    {[currentDoctor?.specialization, currentDoctor?.hospital_name].filter(Boolean).join(' · ') ||
                      'Doctor Profile'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginBottom: 5,
                    }}
                  >
                    <span>Hospital Branch / Clinic</span>
                    <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <SearchableSelect
                    aria-label="Hospital Branch"
                    value={formBranchId}
                    onChange={(val) => setFormBranchId(val)}
                    placeholder="Select Branch"
                    searchPlaceholder="Search branches..."
                    options={doctorBranches.map((b) => ({
                      value: b.id,
                      label: b.name,
                    }))}
                  />
                </div>

                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginBottom: 5,
                    }}
                  >
                    <span>Day of Week</span>
                    <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <SearchableSelect
                    aria-label="Day of Week"
                    searchable={false}
                    value={formDay}
                    onChange={(val) => setFormDay((val || 'MONDAY') as DayOfWeek)}
                    options={DAYS_OF_WEEK.map((d) => ({
                      value: d,
                      label: titleCase(d),
                    }))}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Consultation Hours & Slot Duration */}
            <div className="doctor-section-card">
              <div className="doctor-section-header">
                <div className="doctor-section-badge">
                  <Clock size={13} />
                </div>
                <div className="doctor-section-tag">Consultation Hours &amp; Duration</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginBottom: 5,
                    }}
                  >
                    <span>Start Time</span>
                    <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    required
                    className="ui-input"
                    style={{ width: '100%', height: 38, fontSize: 13 }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      marginBottom: 5,
                    }}
                  >
                    <span>End Time</span>
                    <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    required
                    className="ui-input"
                    style={{ width: '100%', height: 38, fontSize: 13 }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                    Appointment Slot Duration (Minutes) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#2563eb' }}>
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
                        border: formSlotLength === len ? '1px solid #2563eb' : '1px solid #e2e8f0',
                        background: formSlotLength === len ? '#2563eb' : '#ffffff',
                        color: formSlotLength === len ? '#ffffff' : '#334155',
                        borderRadius: 7,
                        padding: '5px 11px',
                        fontSize: 12,
                        cursor: 'pointer',
                        fontWeight: formSlotLength === len ? 650 : 500,
                      }}
                    >
                      {len} Mins
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Section 3: Status & Multi-Day Replication */}
            <div className="doctor-section-card">
              <div className="doctor-section-header">
                <div className="doctor-section-badge">
                  <Settings size={13} />
                </div>
                <div className="doctor-section-tag">Schedule Status{!editingSlot ? ' & Replication' : ''}</div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`doctor-status-btn ${formStatus === 'ACTIVE' ? 'is-active' : ''}`}
                  onClick={() => setFormStatus('ACTIVE')}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#22c55e',
                      marginTop: 4,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 650,
                        color: formStatus === 'ACTIVE' ? '#1d4ed8' : '#334155',
                      }}
                    >
                      Active
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                      Available for appointment bookings.
                    </div>
                  </div>
                  {formStatus === 'ACTIVE' && (
                    <CheckCircle2 size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
                  )}
                </button>

                <button
                  type="button"
                  className={`doctor-status-btn ${formStatus === 'INACTIVE' ? 'is-active' : ''}`}
                  onClick={() => setFormStatus('INACTIVE')}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#94a3b8',
                      marginTop: 4,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 650,
                        color: formStatus === 'INACTIVE' ? '#1d4ed8' : '#334155',
                      }}
                    >
                      Inactive
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                      Temporarily paused for consultations.
                    </div>
                  </div>
                  {formStatus === 'INACTIVE' && (
                    <CheckCircle2 size={16} style={{ color: '#2563eb', flexShrink: 0 }} />
                  )}
                </button>
              </div>

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
                    <Copy size={13} style={{ color: '#2563eb' }} /> Replicate to other days (Optional)
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
                            border: isChecked ? '1px solid #2563eb' : '1px solid #cbd5e1',
                            background: isChecked ? '#eff6ff' : '#ffffff',
                            color: isChecked ? '#1d4ed8' : '#475569',
                            borderRadius: 6,
                            padding: '4px 9px',
                            fontSize: 11.5,
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
            </div>
          </div>

          <div
            className="ui-modal-foot"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="ui-btn ui-btn-neutral"
                onClick={() => setIsEditorOpen(false)}
                disabled={savingSlot}
              >
                Cancel
              </button>
              <button type="submit" disabled={savingSlot} className="doctor-submit-btn">
                {savingSlot ? (
                  'Saving…'
                ) : editingSlot ? (
                  <>
                    <Pencil size={14} />
                    <span>Update Availability</span>
                  </>
                ) : (
                  <>
                    <CalendarClock size={14} />
                    <span>Save to Doctor Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Block Date & Time Slots Common Drawer */}
      <Modal
        open={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        size="lg"
        variant="drawer"
        className="doctor-create-drawer-modal"
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
                color: '#dc2626',
                border: '1px solid #fecaca',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <CalendarX size={18} />
            </div>
            <div>
              <div
                style={{
                  fontSize: 16.5,
                  fontWeight: 700,
                  color: 'var(--ui-text, #0f172a)',
                  letterSpacing: '-0.01em',
                }}
              >
                {editingBlock ? 'Edit Blocked Date / Time' : 'Block Date & Time Slots'}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
                Prevent appointments during doctor leave, surgeries, or unavailable hours
              </div>
            </div>
          </div>
        }
        description=""
      >
        <form onSubmit={handleSaveBlockedDate} className="ui-modal-form" noValidate>
          <div
            className="ui-modal-body"
            style={{
              padding: '20px 24px',
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {/* Doctor Info Card */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '14px 16px',
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

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              {/* Date Picker */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
                  DATE TO BLOCK <span style={{ color: '#ef4444' }}>*</span>
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
                  BLOCK TYPE / SCOPE <span style={{ color: '#ef4444' }}>*</span>
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
                        style={{ width: '100%', height: 36, fontSize: 12.5 }}
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
                        style={{ width: '100%', height: 36, fontSize: 12.5 }}
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
                  style={{ width: '100%', height: 38, fontSize: 13 }}
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
            </div>

            {/* Information Notice */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 10,
                padding: '10px 14px',
                fontSize: 11.5,
                color: '#475569',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
            >
              <Info size={15} style={{ color: '#2563eb', flexShrink: 0, marginTop: 1 }} />
              <div>
                <strong>Instant Appointment Integration:</strong> Any consultation appointment slots falling into this blocked date or time window will be excluded immediately from the scheduling drawer. Double bookings are strictly prevented.
              </div>
            </div>
          </div>

          <div
            className="ui-modal-foot"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Fields marked with <span style={{ color: '#ef4444' }}>*</span> are required
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                className="ui-btn ui-btn-neutral"
                onClick={() => setIsBlockModalOpen(false)}
                disabled={savingBlock}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingBlock}
                style={{
                  background: '#dc2626',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 600,
                  height: 38,
                  padding: '0 18px',
                  borderRadius: 8,
                  fontSize: 13,
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
          </div>
        </form>
      </Modal>
    </div>
  );
}
