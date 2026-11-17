/**
 * Type definitions for the Simple Static HTML Prescription Template System
 */

export interface PrescriptionTemplate {
  id: string;
  name: string;
  description: string;
  html_content: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
  updated_at?: string;
  version?: number;
}

export interface LetterPadHospitalData {
  id?: string | undefined;
  name?: string | undefined;
  hospital_code?: string | undefined;
  address?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  website?: string | undefined;
  logo_url?: string | undefined;
}

export interface LetterPadBranchData {
  id?: string | undefined;
  hospital_id?: string | undefined;
  name?: string | undefined;
  branch_code?: string | undefined;
  address?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
}

export interface LetterPadDoctorData {
  id?: string | undefined;
  name?: string | undefined;
  qualification?: string | undefined;
  specialization?: string | undefined;
  medical_registration_number?: string | undefined;
  phone?: string | undefined;
  email?: string | undefined;
  clinic_address?: string | undefined;
  signature_url?: string | undefined;
}

export interface LetterPadPatientData {
  id?: string | undefined;
  name?: string | undefined;
  patient_id?: string | undefined;
  date_of_birth?: string | undefined;
  age?: string | undefined;
  gender?: string | undefined;
  phone?: string | undefined;
  address?: string | undefined;
  blood_group?: string | null | undefined;
  height_cm?: number | string | null | undefined;
  weight_kg?: number | string | null | undefined;
  blood_pressure?: string | null | undefined;
  blood_sugar?: string | null | undefined;
  body_temperature?: string | null | undefined;
  bmi?: string | null | undefined;
  custom_vitals?: Array<{ label: string; value: string }> | Record<string, string> | any;
  vitals?: {
    blood_pressure?: string | null | undefined;
    blood_sugar?: string | null | undefined;
    body_temperature?: string | null | undefined;
    height_cm?: number | string | null | undefined;
    weight_kg?: number | string | null | undefined;
    blood_group?: string | null | undefined;
    bmi?: string | null | undefined;
    custom_vitals?: any;
  } | undefined;
}

export interface MedicineItem {
  id?: string;
  medicineId?: string;
  name: string;
  strength?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  mealTiming?: string;
  food_instruction?: string;
  instructions?: string;
  prescribedQuantity?: number;
}

export interface LabTestItem {
  id?: string;
  labTestId?: string;
  testName: string;
  test_name?: string;
  instructions?: string;
}

export interface LetterPadPrescriptionData {
  id?: string | undefined;
  prescription_id?: string | undefined;
  prescription_date?: string | undefined;
  appointment_id?: string | undefined;
  diagnosis?: string | undefined;
  symptoms?: string | undefined;
  clinical_notes?: string | undefined;
  additional_notes?: string | undefined;
  general_instructions?: string | undefined;
  follow_up_date?: string | undefined;
  medicines?: MedicineItem[] | undefined;
  lab_tests?: LabTestItem[] | undefined;
}

export interface LetterPadDataContext {
  hospital?: LetterPadHospitalData | undefined;
  branch?: LetterPadBranchData | undefined;
  doctor?: LetterPadDoctorData | undefined;
  patient?: LetterPadPatientData | undefined;
  prescription?: LetterPadPrescriptionData | undefined;
  custom_data?: Record<string, string> | undefined;
}

export interface TemplateResolutionResult {
  renderedHtml: string;
  resolvedPlaceholders: string[];
  unresolvedPlaceholders: string[];
  missingRequiredFields: string[];
}
