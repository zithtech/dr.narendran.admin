/**
 * Types for the Patient Timelines feature in Admin App.
 */

export type TimelineEventType =
  | 'CONSULTATION'
  | 'PRESCRIPTION'
  | 'MEDICINE_STARTED'
  | 'MEDICINE_CHANGED'
  | 'MEDICINE_STOPPED'
  | 'LAB_TEST_ORDERED'
  | 'LAB_REPORT'
  | 'IMAGING'
  | 'MEDICAL_RECORD'
  | 'DOCTOR_NOTE'
  | 'APPOINTMENT'
  | 'FOLLOW_UP';

export type TimelineFilterType =
  | 'All'
  | 'Consultations'
  | 'Medicines'
  | 'Prescriptions'
  | 'Investigations'
  | 'Reports'
  | 'Records';

export interface TimelineDoctor {
  id?: string;
  name: string;
  specialization?: string;
  clinic?: string;
  avatarUrl?: string;
  initials?: string;
}

export interface TimelineMedicineItem {
  id?: string;
  medicine_id?: string;
  name?: string;
  medicine_name?: string;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  instructions?: string | null;
  food_instruction?: string | null;
  foodTiming?: string | null;
  prescribedQuantity?: number;
  prescribed_quantity?: number;
  status?: 'active' | 'completed' | 'changed' | 'stopped' | string;
  startedAt?: string;
}

export interface TimelineInvestigationItem {
  id?: string;
  test_id?: string;
  testName?: string;
  test_name?: string;
  status: 'Report Available' | 'Awaiting Result' | 'Uploaded' | 'Not Uploaded' | 'REPORT_AVAILABLE' | 'AWAITING_RESULT' | string;
  orderedDate?: string;
  reportDate?: string;
  documentUrl?: string;
  document_url?: string;
  notes?: string;
  instructions?: string;
}

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  occurred_at: string;
  title: string;
  subtitle?: string;
  summary?: string;
  status?: string;
  doctor?: TimelineDoctor | null;
  diagnosis?: string | null;
  doctor_notes?: string | null;
  advice?: string | null;
  follow_up_date?: string;
  follow_up_time?: string;
  prescription_id?: string;
  prescription_summary?: string;
  medicines?: TimelineMedicineItem[];
  investigations?: TimelineInvestigationItem[];

  details?: {
    appointment_id?: string;
    scheduled_start?: string;
    scheduled_end?: string;
    status?: string;
    purpose?: string | null;
    visit_reason?: string | null;
    reschedule_reason?: string | null;
    cancellation_reason?: string | null;
    vitals?: Record<string, any> | null;
    diagnosis?: string | null;
    doctor_notes?: string | null;
    notes?: string | null;
    advice?: string | null;
    prescription_id?: string;
    prescription_date?: string;
    prescription_url?: string | null;
    image_url?: string | null;
    additional_notes?: string | null;
    medicine_count?: number;
    medicines?: TimelineMedicineItem[];
    medicine_id?: string;
    medicine_name?: string;
    dosage?: string | null;
    frequency?: string | null;
    duration?: string | null;
    food_instruction?: string | null;
    instructions?: string | null;
    test_id?: string;
    test_name?: string;
    ordered_date?: string;
    report_id?: string | null;
    report_date?: string;
    file_name?: string;
    file_type?: string;
    file_size?: number;
    document_url?: string | null;
    document_name?: string;
    record_type?: string;
    [key: string]: any;
  };

  appointment_detail?: {
    slotTime?: string;
    tokenNumber?: string;
    purpose?: string;
    status?: string;
    location?: string;
    scheduled_start?: string;
    scheduled_end?: string;
    visit_reason?: string;
    reschedule_reason?: string;
    cancellation_reason?: string;
    notes?: string;
    vitals?: any;
    appointment_id?: string;
  };

  medicine_detail?: TimelineMedicineItem;

  report_detail?: {
    testName?: string;
    fileName?: string;
    reportDate?: string;
    documentUrl?: string;
    status?: string;
  };

  record_detail?: {
    title?: string;
    category?: string;
    date?: string;
    documentUrl?: string;
    notes?: string;
  };

  reference_id?: string;
  reference_type?: string;
  raw_data?: any;
}

export interface HealthSummaryData {
  primary_condition: string;
  current_medicines_count: number;
  recent_consultation_date: string | null;
  investigations_count: number;
  medical_records_count: number;
  upcoming_followup_date: string | null;
  active_conditions?: number | string[];
  active_medications?: any[];
  consultations_count?: number;
  prescriptions_count?: number;
}

export interface TimelinePatientInfo {
  id: string;
  name: string;
  age?: number | string | null;
  gender?: string | null;
  mobile?: string | null;
  phone?: string | null;
  email?: string | null;
  bloodGroup?: string | null;
  blood_group?: string | null;
  dateOfBirth?: string | null;
  date_of_birth?: string | null;
  profileImageUrl?: string | null;
  profile_image_url?: string | null;
  hospital_name?: string | null;
  branch_name?: string | null;
}

export interface MedicalTimelineResponse {
  patient: TimelinePatientInfo;
  summary: HealthSummaryData;
  timeline: TimelineEvent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    has_next: boolean;
  };
}

export interface TimelineQueryParams {
  page?: number;
  limit?: number;
  type?: TimelineFilterType | string;
  year?: string;
  fromDate?: string;
  toDate?: string;
  from_date?: string;
  to_date?: string;
}

export interface AdminPatientListItem {
  id: string;
  user_account_id: string | null;
  hospital_id: string;
  hospital_name: string | null;
  branch_id: string | null;
  branch_name: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  age?: number | null;
  gender: string | null;
  address: string | null;
  status: string;
  blood_group: string | null;
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientListFilters {
  search?: string;
  gender?: string;
  status?: string;
  registeredFrom?: string;
  registeredTo?: string;
  hospitalId?: string;
  branchId?: string;
  page?: number;
  limit?: number;
}

export interface PatientListResponse {
  patients: AdminPatientListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

