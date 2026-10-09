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
  id?: string;
  name?: string;
  hospital_code?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
}

export interface LetterPadBranchData {
  id?: string;
  hospital_id?: string;
  name?: string;
  branch_code?: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface LetterPadDoctorData {
  id?: string;
  name?: string;
  qualification?: string;
  specialization?: string;
  medical_registration_number?: string;
  phone?: string;
  email?: string;
  clinic_address?: string;
  signature_url?: string;
}

export interface LetterPadPatientData {
  id?: string;
  name?: string;
  patient_id?: string;
  date_of_birth?: string;
  age?: string;
  gender?: string;
  phone?: string;
  address?: string;
  blood_group?: string;
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
  id?: string;
  prescription_id?: string;
  prescription_date?: string;
  appointment_id?: string;
  diagnosis?: string;
  symptoms?: string;
  clinical_notes?: string;
  additional_notes?: string;
  general_instructions?: string;
  follow_up_date?: string;
  medicines?: MedicineItem[];
  lab_tests?: LabTestItem[];
}

export interface LetterPadDataContext {
  hospital?: LetterPadHospitalData;
  branch?: LetterPadBranchData;
  doctor?: LetterPadDoctorData;
  patient?: LetterPadPatientData;
  prescription?: LetterPadPrescriptionData;
  custom_data?: Record<string, string>;
}

export interface TemplateResolutionResult {
  renderedHtml: string;
  resolvedPlaceholders: string[];
  unresolvedPlaceholders: string[];
  missingRequiredFields: string[];
}
