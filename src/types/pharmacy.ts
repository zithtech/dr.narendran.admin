export type MedicineStatus = 'Active' | 'Inactive';
export type DiscountType = 'Percentage' | 'Fixed Amount';
export type ImportStrategy = 'SKIP_EXISTING' | 'UPDATE_EXISTING';

export interface LinkedMedicineVariant {
  id: string;
  strength: string;
  strength_unit: string;
  dosage_form: string;
  strip_count?: number;
  tablets_per_strip?: number | null;
  total_tablets?: number;
  available_quantity: number;
  mrp?: number | null;
  discount_type?: string | null;
  discount_value?: number | null;
  final_price?: number | null;
  purchase_price?: number | null;
  reorder_level?: number;
  variant_code?: string | null;
  barcode?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

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
  variants?: LinkedMedicineVariant[];
  created_at: string;
  updated_at: string;
}

/**
 * Derives a structured compact summary of linked dosage forms and their respective strengths.
 * Example output: [{ form: 'Tablet', strengths: ['500 mg', '650 mg'] }, { form: 'Syrup', strengths: ['125 mg/5 ml'] }]
 */
export function formatDosageStrengthSummary(
  variants?: LinkedMedicineVariant[] | null,
  fallbackDosage?: string | null,
  fallbackStrength?: string | null,
): { form: string; strengths: string[] }[] {
  if (variants && variants.length > 0) {
    const formMap = new Map<string, string[]>();
    for (const v of variants) {
      const form = v.dosage_form?.trim() || 'Unspecified';
      const str = v.strength ? `${v.strength} ${v.strength_unit || ''}`.trim() : 'Standard';
      if (!formMap.has(form)) {
        formMap.set(form, []);
      }
      const list = formMap.get(form)!;
      if (!list.includes(str)) {
        list.push(str);
      }
    }
    return Array.from(formMap.entries()).map(([form, strengths]) => ({ form, strengths }));
  }

  // Fallback to legacy master fields if no variants linked yet
  const form = fallbackDosage?.trim() || 'Tablet';
  const str = fallbackStrength?.trim() ? fallbackStrength.trim() : null;
  return [{ form, strengths: str ? [str] : [] }];
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
  purchasePrice?: number | null;
  tabletsPerStrip?: number | null;
  openingStock?: number | null;
  reorderLevel?: number | null;
  variantCode?: string | null;
  notes?: string | null;
  frequency?: string | null;
  duration?: string | null;
  description?: string | null;
}

export type RowImportClassification = 'NEW' | 'ALREADY_EXISTS' | 'DUPLICATE_IN_EXCEL' | 'INVALID';

export interface ValidationPreviewItem {
  rowNumber: number;
  medicineName: string;
  genericName?: string | null;
  medicineCode?: string | null;
  strength?: string | null;
  dosageForm?: string | null;
  status: 'Active' | 'Inactive';
  tabletsPerStrip?: number | null;
  openingStock?: number;
  mrp?: number | null;
  discountType?: string | null;
  discountValue?: number | null;
  finalPrice?: number | null;
  purchasePrice?: number | null;
  reorderLevel?: number;
  variantCode?: string | null;
  notes?: string | null;
  classification: RowImportClassification;
  medicineAction?: 'NEW_MEDICINE' | 'EXISTING_MEDICINE';
  variantAction?: 'NEW_VARIANT' | 'EXISTING_VARIANT';
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
  createdMedicinesCount?: number;
  updatedMedicinesCount?: number;
  createdVariantsCount?: number;
  updatedVariantsCount?: number;
  skippedVariantsCount?: number;
  stockInitializedCount?: number;
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
