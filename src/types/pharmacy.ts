export type MedicineStatus = 'Active' | 'Inactive';
export type DiscountType = 'Percentage' | 'Fixed Amount';
export type ImportStrategy = 'SKIP_EXISTING' | 'UPDATE_EXISTING';

export interface Medicine {
  id: string;
  medicine_name: string;
  generic_name: string | null;
  strength: string | null;
  strength_unit: string | null;
  dosage_form: string | null;
  therapeutic_category: string | null;
  sub_category: string | null;
  manufacturer: string | null;
  prescription_required: boolean;
  status: MedicineStatus;
  medicine_code: string | null;
  barcode: string | null;
  mrp: number | null;
  discount_type: DiscountType | null;
  discount_value: number | null;
  final_price: number | null;
  frequency: string | null;
  duration: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface MedicineFormData {
  medicine_name: string;
  generic_name: string;
  strength: string;
  strength_unit: string;
  dosage_form: string;
  therapeutic_category: string;
  sub_category: string;
  manufacturer: string;
  prescription_required: boolean;
  status: MedicineStatus;
  medicine_code: string;
  barcode: string;
  mrp: string;
  discount_type: DiscountType | '';
  discount_value: string;
  final_price: string;
  frequency: string;
  duration: string;
  description: string;
}

export interface ParsedMedicineRow {
  row: number;
  medicineName: string;
  genericName?: string | null;
  strength?: string | null;
  strengthUnit?: string | null;
  dosageForm?: string | null;
  therapeuticCategory?: string | null;
  subCategory?: string | null;
  manufacturer?: string | null;
  prescriptionRequired?: boolean;
  status?: MedicineStatus;
  medicineCode?: string | null;
  barcode?: string | null;
  mrp?: number | null;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  finalPrice?: number | null;
  frequency?: string | null;
  duration?: string | null;
  description?: string | null;
}

export type RowImportClassification = 'NEW' | 'ALREADY_EXISTS' | 'DUPLICATE_IN_EXCEL' | 'INVALID';

export interface ValidationPreviewItem {
  rowNumber: number;
  medicineName: string;
  genericName?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  status: 'Active' | 'Inactive';
  classification: RowImportClassification;
  isValid: boolean;
  isDuplicate: boolean;
  issues: string[];
  duplicateReason?: string | null;
  data?: ParsedMedicineRow;
}

export interface ImportPreviewResult {
  totalRows: number;
  newRows: number;
  alreadyExistingRows: number;
  duplicateInExcelRows: number;
  invalidRows: number;
  previewRows: ValidationPreviewItem[];
}

export interface BulkImportResponse {
  totalRows: number;
  successCount: number;
  insertedCount: number;
  alreadyExistingCount: number;
  duplicateInExcelCount: number;
  failedCount: number;
  errors: { row: number; medicineName: string; error: string }[];
  skipped: { row: number; medicineName: string; reason: string }[];
}

export interface AIMedicineSuggestion {
  medicineName: string;
  genericName: string | null;
  dosageForm: string | null;
  strength: string | null;
  strengthUnit: string | null;
  therapeuticCategory: string | null;
  subCategory: string | null;
  manufacturer: string | null;
  prescriptionRequired: boolean;
  status?: MedicineStatus;
  medicineCode?: string | null;
  barcode?: string | null;
  mrp?: number | null;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  finalPrice?: number | null;
  frequency?: string | null;
  duration?: string | null;
  description?: string | null;
}

export interface AISearchMedicineResponse {
  medicines: AIMedicineSuggestion[];
}

