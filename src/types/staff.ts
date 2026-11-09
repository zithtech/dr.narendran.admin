export type StaffStatus = 'ACTIVE' | 'INACTIVE';

export const STAFF_ROLES = [
  'Senior Nurse',
  'Junior Nurse',
  'Receptionist',
  'Lab Technician',
  'Pharmacist',
  'Administrative Assistant',
  'Ward Staff',
  'Billing Clerk',
  'OT Technician',
  'Other',
] as const;

export type StaffRole = (typeof STAFF_ROLES)[number] | string;

export const SHIFT_TIMINGS = [
  { id: 'Morning', label: 'Morning (08:00 AM - 04:00 PM)', period: '08:00 - 16:00' },
  { id: 'Evening', label: 'Evening (02:00 PM - 10:00 PM)', period: '14:00 - 22:00' },
  { id: 'Night', label: 'Night (10:00 PM - 06:00 AM)', period: '22:00 - 06:00' },
  { id: 'Custom Shift', label: 'Custom Shift', period: 'Custom' },
] as const;

export const WORK_DAY_OPTIONS = [
  { id: 'Mon', label: 'Mon', fullLabel: 'Monday' },
  { id: 'Tue', label: 'Tue', fullLabel: 'Tuesday' },
  { id: 'Wed', label: 'Wed', fullLabel: 'Wednesday' },
  { id: 'Thu', label: 'Thu', fullLabel: 'Thursday' },
  { id: 'Fri', label: 'Fri', fullLabel: 'Friday' },
  { id: 'Sat', label: 'Sat', fullLabel: 'Saturday' },
  { id: 'Sun', label: 'Sun', fullLabel: 'Sunday' },
] as const;

export const DEFAULT_WORK_DAYS: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export const WORK_DAY_PRESETS = [
  { label: 'Mon - Fri', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
  { label: 'Mon - Sat', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] },
  { label: 'All 7 Days', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] },
  { label: 'Weekend', days: ['Sat', 'Sun'] },
] as const;

export function formatWorkDays(val?: string[] | string | null): string {
  if (!val) return 'Mon - Fri';
  const list: string[] = Array.isArray(val)
    ? val
    : typeof val === 'string'
      ? val.split(',').map((s) => s.trim()).filter(Boolean)
      : [];
  if (list.length === 0) return 'None';
  if (list.length === 7) return 'Mon - Sun (All Days)';
  if (list.length === 5 && list.join(',') === 'Mon,Tue,Wed,Thu,Fri') return 'Mon - Fri (Weekdays)';
  if (list.length === 6 && list.join(',') === 'Mon,Tue,Wed,Thu,Fri,Sat') return 'Mon - Sat';
  if (list.length === 2 && list.join(',') === 'Sat,Sun') return 'Sat - Sun (Weekend)';
  return list.join(', ');
}

export interface StaffDocument {
  id: string;
  name: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  storageKey: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface StaffMember {
  id: string;
  staffCode: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  role: string;
  hospitalId?: string;
  hospital_id?: string;
  hospitalName?: string;
  hospital_name?: string;
  branchId?: string;
  branch_id?: string;
  branchName?: string;
  branch_name?: string;
  shiftTiming: string;
  shift_timing?: string;
  customShiftDetails?: string;
  custom_shift_details?: string;
  workDays?: string[] | string;
  work_days?: string[] | string;
  joiningDate: string;
  joining_date?: string;
  status: StaffStatus;
  notes?: string;
  documents: StaffDocument[];
  createdAt: string;
  created_at: string;
  updatedAt: string;
}

export interface CreateStaffInput {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  role: string;
  hospitalId?: string;
  branchId?: string;
  shiftTiming?: string;
  customShiftDetails?: string;
  workDays?: string[] | string;
  joiningDate?: string;
  status?: StaffStatus;
  notes?: string;
}

export interface UpdateStaffInput extends Partial<CreateStaffInput> {
  id: string;
}

