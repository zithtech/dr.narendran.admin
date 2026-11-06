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
  joiningDate?: string;
  status?: StaffStatus;
  notes?: string;
}

export interface UpdateStaffInput extends Partial<CreateStaffInput> {
  id: string;
}

