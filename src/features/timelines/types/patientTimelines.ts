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
}

export interface TimelineMedicineItem {
  id?: string;
  name: string;
  strength?: string | null;
  dosage?: string | null;
  frequency?: string | null;
  duration?: string | null;
  foodTiming?: string | null;
  instructions?: string | null;
  prescribedQuantity?: number | null;
  status?: string | null;
}

export interface TimelineInvestigationItem {
  id?: string;
  testName: string;
  status: string;
  orderedDate?: string;
  reportDate?: string;
  documentUrl?: string;
  notes?: string;
  isExternal?: boolean;
}

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  occurred_at: string;
  title: string;
  summary?: string;
  subtitle?: string;
  status?: string;
  reference_id?: string;
  reference_type?: string;
  doctor?: TimelineDoctor | null;
  details?: Record<string, any>;
  diagnosis?: string;
  doctor_notes?: string;
  advice?: string;
  medicines?: TimelineMedicineItem[];
  investigations?: TimelineInvestigationItem[];
}

export interface PatientTimelineHeader {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  phone?: string | null;
  email?: string | null;
  blood_group?: string | null;
  profile_image_url?: string | null;
}

export interface HealthSummaryData {
  primary_condition: string;
  active_conditions?: string[];
  active_medications?: string[];
  consultations_count: number;
  prescriptions_count: number;
  investigations_count: number;
  medical_records_count: number;
  recent_consultation_date?: string | null;
  upcoming_followup_date?: string | null;
  current_medicines_count?: number;
  last_consultation?: any;
  upcoming_follow_up?: any;
}

export interface TimelinePagination {
  page: number;
  limit: number;
  total: number;
  has_next: boolean;
}

export interface MedicalTimelineResponse {
  patient: PatientTimelineHeader;
  summary: HealthSummaryData;
  timeline: TimelineEvent[];
  pagination: TimelinePagination;
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
  gender: string | null;
  address: string | null;
  status: string;
  blood_group: string | null;
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminPatientListResponse {
  status: string;
  data: AdminPatientListItem[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

