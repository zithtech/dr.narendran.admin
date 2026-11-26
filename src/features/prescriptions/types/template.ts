/**
 * Type definitions for the Simple Static HTML Prescription Template System & Visual Builder
 */

export type TemplateStatus = 'ACTIVE' | 'DRAFT' | 'ARCHIVED' | 'INACTIVE';

export interface TemplateThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor?: string;
  textColor: string;
  backgroundColor: string;
  fontFamily: string;
  fontSize: string;
  headerBorderColor?: string;
  tableBorderColor?: string;
  showTagline?: boolean;
  customTagline?: string;
  compactMode?: boolean;
}

export type TemplateSectionType =
  // Basic Document Elements
  | 'HEADING'
  | 'PARAGRAPH'
  | 'TABLE'
  | 'CUSTOM_IMAGE'
  | 'DIVIDER'
  | 'SPACER'
  | 'PLACEHOLDER_BLOCK'
  // Clinical Elements
  | 'HEADER_LETTERHEAD'
  | 'DOCTOR_DETAILS'
  | 'PATIENT_DETAILS'
  | 'VITALS_BLOCK'
  | 'DIAGNOSIS_BLOCK'
  | 'MEDICINES_TABLE'
  | 'LAB_TESTS_BLOCK'
  | 'ADVICE_NOTES_BLOCK'
  | 'SIGNATURE_BLOCK'
  | 'FOOTER_LETTERHEAD';

export interface HeadingBlockProps {
  level?: 'h1' | 'h2' | 'h3' | 'custom';
  text?: string;
  alignment?: 'left' | 'center' | 'right';
  color?: string;
  fontSize?: string;
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  marginBottom?: string;
}

export interface ParagraphBlockProps {
  content?: string;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  fontSize?: string;
  color?: string;
  lineHeight?: string;
  fontWeight?: 'normal' | 'medium' | 'semibold';
  marginBottom?: string;
}

export interface VitalFieldConfig {
  id: string;
  key: string;
  label: string;
  unit: string;
  dataType?: 'text' | 'number';
  enabled: boolean;
  isCustom?: boolean;
}

export interface VitalsBlockProps {
  title?: string;
  showTitle?: boolean;
  columnsPerRow?: 2 | 3 | 4 | 6;
  style?: 'bordered-table' | 'cards' | 'minimal';
  fields?: VitalFieldConfig[];
  borderColor?: string;
  headerBg?: string;
}

export const DEFAULT_VITALS_FIELDS: VitalFieldConfig[] = [
  { id: 'bp', key: 'blood_pressure', label: 'Blood Pressure (BP)', unit: 'mmHg', enabled: true },
  { id: 'bs', key: 'blood_sugar', label: 'Blood Sugar', unit: 'mg/dL', enabled: true },
  { id: 'temp', key: 'body_temperature', label: 'Body Temperature', unit: '°F', enabled: true },
  { id: 'bg', key: 'blood_group', label: 'Blood Group', unit: '', enabled: true },
  { id: 'height', key: 'patient_height', label: 'Height', unit: 'cm', enabled: true },
  { id: 'weight', key: 'patient_weight', label: 'Weight', unit: 'kg', enabled: true },
  { id: 'bmi', key: 'patient_bmi', label: 'BMI', unit: '', enabled: true },
  { id: 'pulse', key: 'pulse_rate', label: 'Pulse Rate', unit: 'bpm', enabled: true },
  { id: 'spo2', key: 'spo2', label: 'Oxygen Saturation (SpO2)', unit: '%', enabled: false },
  { id: 'rr', key: 'respiratory_rate', label: 'Respiratory Rate', unit: 'breaths/min', enabled: false },
];

export interface TableColumnConfig {
  id: string;
  label: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  dataBinding?: string;
}

export interface TableBlockProps {
  rows?: number;
  columns?: number;
  headers?: string[];
  columnConfigs?: TableColumnConfig[];
  data?: string[][];
  bordered?: boolean;
  borderColor?: string;
  headerBg?: string;
  headerColor?: string;
  cellPadding?: string;
  columnWidths?: string[];
  alignments?: ('left' | 'center' | 'right')[];
  fontSize?: string;
  mode?: 'static' | 'dynamic';
  dynamicSource?: 'medicines' | 'lab_tests' | 'none';
  showDosage?: boolean;
  showFrequency?: boolean;
  showDuration?: boolean;
  showInstructions?: boolean;
}

export interface MedicinesTableBlockProps {
  showBorder?: boolean;
  showDosage?: boolean;
  showFrequency?: boolean;
  showDuration?: boolean;
  showInstructions?: boolean;
}

export interface DividerBlockProps {
  style?: 'solid' | 'dashed' | 'dotted' | 'double';
  thickness?: string;
  color?: string;
  margin?: string;
  width?: string;
  alignment?: 'left' | 'center' | 'right';
}

export interface SpacerBlockProps {
  height?: string;
}

export interface PlaceholderBlockProps {
  token?: string;
  label?: string;
  prefix?: string;
  fontSize?: string;
  color?: string;
  alignment?: 'left' | 'center' | 'right';
  boldValue?: boolean;
}

export interface ImageBlockProps {
  imageUrl?: string;
  altText?: string;
  width?: string;
  height?: string;
  alignment?: 'left' | 'center' | 'right';
  objectFit?: 'contain' | 'cover';
  maintainAspectRatio?: boolean;
  caption?: string;
}

export interface TemplateSectionBlock {
  id: string;
  type: TemplateSectionType;
  title: string;
  enabled: boolean;
  order: number;
  props: Record<string, any>;
}

export interface TemplateLayoutConfig {
  theme: TemplateThemeConfig;
  sections: TemplateSectionBlock[];
}

export interface PrescriptionTemplate {
  id: string;
  name: string;
  description: string;
  html_content: string;
  layout_config?: TemplateLayoutConfig | null;
  status: TemplateStatus;
  hospital_id?: string | null;
  branch_id?: string | null;
  is_default?: boolean;
  version?: number;
  created_at?: string;
  updated_at?: string;
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
  pulse_rate?: string | null | undefined;
  spo2?: string | null | undefined;
  respiratory_rate?: string | null | undefined;
  custom_vitals?: Array<{ label: string; value: string }> | Record<string, string> | any;
  vitals?: {
    blood_pressure?: string | null | undefined;
    blood_sugar?: string | null | undefined;
    body_temperature?: string | null | undefined;
    height_cm?: number | string | null | undefined;
    weight_kg?: number | string | null | undefined;
    blood_group?: string | null | undefined;
    bmi?: string | null | undefined;
    pulse_rate?: string | null | undefined;
    spo2?: string | null | undefined;
    respiratory_rate?: string | null | undefined;
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
  lab_name?: string;
  lab_address?: string;
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
  follow_up_days?: string | number | undefined;
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
  medicinesTableOptions?: {
    showDosage?: boolean;
    showFrequency?: boolean;
    showDuration?: boolean;
    showInstructions?: boolean;
  } | undefined;
  layout_config?: TemplateLayoutConfig | null | undefined;
  layoutConfig?: TemplateLayoutConfig | null | undefined;
}

export interface TemplateResolutionResult {
  renderedHtml: string;
  resolvedPlaceholders: string[];
  unresolvedPlaceholders: string[];
  missingRequiredFields: string[];
}
