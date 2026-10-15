import * as XLSX from 'xlsx';

import type { DiscountType, MedicineStatus, ParsedMedicineRow } from '../types/pharmacy';
import { calculateFinalPrice } from './pricing';

export const EXCEL_COLUMNS = [
  'medicine_code',
  'medicine_name',
  'generic_name',
  'manufacturer',
  'therapeutic_category',
  'therapeutic_sub_category',
  'prescription_required',
  'description',
  'strength',
  'strength_unit',
  'dosage_form',
  'tablets_per_strip',
  'opening_stock',
  'mrp',
  'discount_type',
  'discount_value',
  'purchase_price',
  'reorder_level',
  'variant_code',
  'barcode',
  'status',
  'notes',
] as const;

export const SAMPLE_TEMPLATE_ROWS: Record<string, string | number>[] = [
  {
    medicine_code: 'MED001',
    medicine_name: 'Paracetamol',
    generic_name: 'Paracetamol',
    manufacturer: 'Cipla Ltd',
    therapeutic_category: 'Analgesics / Antipyretic',
    therapeutic_sub_category: 'Pain Relief',
    prescription_required: 'No',
    description: 'For mild to moderate pain and fever relief. Take after food.',
    strength: '500',
    strength_unit: 'mg',
    dosage_form: 'Tablet',
    tablets_per_strip: 10,
    opening_stock: 100,
    mrp: 25.0,
    discount_type: 'PERCENTAGE',
    discount_value: 10,
    purchase_price: 15.0,
    reorder_level: 20,
    variant_code: 'VAR-PARA-500',
    barcode: '8901112223334',
    status: 'ACTIVE',
    notes: 'Shelf A1',
  },
  {
    medicine_code: 'MED001',
    medicine_name: 'Paracetamol',
    generic_name: 'Paracetamol',
    manufacturer: 'Cipla Ltd',
    therapeutic_category: 'Analgesics / Antipyretic',
    therapeutic_sub_category: 'Pain Relief',
    prescription_required: 'No',
    description: 'For mild to moderate pain and fever relief. Take after food.',
    strength: '650',
    strength_unit: 'mg',
    dosage_form: 'Tablet',
    tablets_per_strip: 15,
    opening_stock: 150,
    mrp: 35.0,
    discount_type: 'PERCENTAGE',
    discount_value: 5,
    purchase_price: 22.0,
    reorder_level: 20,
    variant_code: 'VAR-PARA-650',
    barcode: '8901112223335',
    status: 'ACTIVE',
    notes: 'Shelf A1',
  },
  {
    medicine_code: 'MED002',
    medicine_name: 'Amoxicillin',
    generic_name: 'Amoxicillin Trihydrate',
    manufacturer: 'Sun Pharma',
    therapeutic_category: 'Antibiotics',
    therapeutic_sub_category: 'Penicillins',
    prescription_required: 'Yes',
    description: 'Broad spectrum antibacterial. Complete full course.',
    strength: '250',
    strength_unit: 'mg',
    dosage_form: 'Capsule',
    tablets_per_strip: '',
    opening_stock: 80,
    mrp: 90.0,
    discount_type: 'PERCENTAGE',
    discount_value: 10,
    purchase_price: 65.0,
    reorder_level: 15,
    variant_code: 'VAR-AMOX-250',
    barcode: '8902223334441',
    status: 'ACTIVE',
    notes: 'Cold storage required',
  },
  {
    medicine_code: 'MED002',
    medicine_name: 'Amoxicillin',
    generic_name: 'Amoxicillin Trihydrate',
    manufacturer: 'Sun Pharma',
    therapeutic_category: 'Antibiotics',
    therapeutic_sub_category: 'Penicillins',
    prescription_required: 'Yes',
    description: 'Broad spectrum antibacterial. Complete full course.',
    strength: '500',
    strength_unit: 'mg',
    dosage_form: 'Capsule',
    tablets_per_strip: '',
    opening_stock: 60,
    mrp: 150.0,
    discount_type: 'PERCENTAGE',
    discount_value: 5,
    purchase_price: 110.0,
    reorder_level: 15,
    variant_code: 'VAR-AMOX-500',
    barcode: '8902223334442',
    status: 'ACTIVE',
    notes: 'Cold storage required',
  },
];

function saveWorkbookAsExcel(workbook: XLSX.WorkBook, filename: string): void {
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Downloads a pre-formatted Excel template with headers, sample rows, and column auto-widths.
 */
export function downloadSampleTemplate(): void {
  const worksheet = XLSX.utils.json_to_sheet(SAMPLE_TEMPLATE_ROWS, {
    header: [...EXCEL_COLUMNS],
  });

  const colWidths = EXCEL_COLUMNS.map((col) => {
    let maxLen = col.length;
    for (const row of SAMPLE_TEMPLATE_ROWS) {
      const val = row[col];
      if (val !== undefined && val !== null) {
        const str = typeof val === 'string' ? val : typeof val === 'number' ? String(val) : '';
        maxLen = Math.max(maxLen, str.length);
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 14), 45) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Medicines_Inventory');

  saveWorkbookAsExcel(workbook, 'dr_narendran_medicines_inventory_template.xlsx');
}

/**
 * Reads and parses an uploaded Excel (.xlsx, .xls) file into raw JavaScript objects.
 */
export async function parseExcelFile(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result;
        if (!(buffer instanceof ArrayBuffer)) {
          throw new Error('Failed to read file contents.');
        }
        const data = new Uint8Array(buffer);
        const workbook = XLSX.read(data, { type: 'array' });

        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          throw new Error('The uploaded Excel file contains no worksheets.');
        }

        const worksheet = workbook.Sheets[firstSheetName];
        if (!worksheet) {
          throw new Error('Unable to read the first worksheet.');
        }

        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          defval: '',
          raw: false,
        });

        if (jsonData.length === 0) {
          throw new Error('The uploaded Excel file is empty or contains no data rows.');
        }

        resolve(jsonData);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to parse Excel file.';
        reject(new Error(message));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read the file.'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generates an Excel error report and downloads it for the user.
 */
export function downloadErrorReport(
  errors: { row: number; medicineName: string; error: string }[]
): void {
  const rows = errors.map((e) => ({
    'Row Number': e.row,
    'Medicine Name': e.medicineName ? e.medicineName : '(Empty)',
    'Error Details': e.error,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet['!cols'] = [{ wch: 12 }, { wch: 30 }, { wch: 50 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Errors');

  const dateStr = new Date().toISOString().slice(0, 10);
  saveWorkbookAsExcel(workbook, 'medicine_import_errors_' + dateStr + '.xlsx');
}

function getString(row: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const val = row[key];
    if (val !== undefined && val !== null && val !== '') {
      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        return String(val).trim();
      }
    }
  }
  return '';
}

function getNumber(row: Record<string, unknown>, ...keys: string[]): number | null {
  for (const key of keys) {
    const val = row[key];
    if (val !== undefined && val !== null && val !== '') {
      const num = Number(val);
      if (!Number.isNaN(num)) {
        return num;
      }
    }
  }
  return null;
}

/**
 * Helper to normalize and map raw row properties to backend-friendly camelCase payload.
 */
export function normalizeExcelRow(raw: Record<string, unknown>, rowNum: number): ParsedMedicineRow {
  const medicineName = getString(raw, 'medicine_name', 'Medicine Name', 'Name', 'name', 'Medicine');
  const genericName = getString(raw, 'generic_name', 'Generic Name', 'Generic');
  const strength = getString(raw, 'strength', 'Strength');
  const strengthUnit = getString(raw, 'strength_unit', 'Strength Unit', 'Unit', 'unit');
  const dosageForm = getString(raw, 'dosage_form', 'Dosage Form', 'Form', 'form');
  const category = getString(raw, 'therapeutic_category', 'Therapeutic Category', 'Category', 'category');
  const subCategory = getString(raw, 'therapeutic_sub_category', 'sub_category', 'Sub Category', 'subCategory');
  const manufacturer = getString(raw, 'manufacturer', 'Manufacturer', 'Company', 'company');

  const rxRaw = getString(raw, 'prescription_required', 'Prescription Required', 'Rx Required');
  const rxStr = rxRaw.toLowerCase();
  const prescriptionRequired =
    rxStr === 'yes' || rxStr === 'true' || rxStr === '1' || raw['Prescription Required'] === true || raw.prescription_required === true;

  const statusRaw = getString(raw, 'status', 'Status');
  const status: MedicineStatus = statusRaw.toLowerCase() === 'inactive' ? 'Inactive' : 'Active';

  const code = getString(raw, 'medicine_code', 'Medicine Code', 'SKU', 'Code', 'code');
  const barcode = getString(raw, 'barcode', 'Barcode');
  const variantCode = getString(raw, 'variant_code', 'Variant Code', 'variantCode');
  const notes = getString(raw, 'notes', 'Notes');

  const mrp = getNumber(raw, 'mrp', 'MRP', 'Price', 'price');
  const rawDiscountType = getString(raw, 'discount_type', 'Discount Type').toLowerCase();
  const discountType: DiscountType | null = rawDiscountType.includes('fixed') || rawDiscountType.includes('flat')
    ? 'Fixed Amount'
    : rawDiscountType.includes('percent')
      ? 'Percentage'
      : null;

  const discountValue = getNumber(raw, 'discount_value', 'Discount Value');
  const explicitFinalPrice = getNumber(raw, 'final_price', 'Final Price', 'Selling Price');
  const finalPrice = explicitFinalPrice ?? calculateFinalPrice(mrp, discountType, discountValue) ?? mrp;
  const purchasePrice = getNumber(raw, 'purchase_price', 'Purchase Price', 'Cost Price');
  const tabletsPerStrip = getNumber(raw, 'tablets_per_strip', 'Tablets Per Strip', 'strip_size');
  const openingStock = getNumber(raw, 'opening_stock', 'Opening Stock', 'Initial Stock');
  const reorderLevel = getNumber(raw, 'reorder_level', 'Reorder Level') ?? 10;

  const frequency = getString(raw, 'frequency', 'Frequency');
  const duration = getString(raw, 'duration', 'Duration');
  const description = getString(raw, 'description', 'Description');

  return {
    row: rowNum,
    medicineName,
    genericName: genericName || null,
    strength: strength || null,
    strengthUnit: strengthUnit || null,
    dosageForm: dosageForm || null,
    therapeuticCategory: category || null,
    subCategory: subCategory || null,
    manufacturer: manufacturer || null,
    prescriptionRequired,
    status,
    medicineCode: code || null,
    barcode: barcode || null,
    mrp,
    discountType,
    discountValue,
    finalPrice,
    purchasePrice,
    tabletsPerStrip,
    openingStock,
    reorderLevel,
    variantCode: variantCode || null,
    notes: notes || null,
    frequency: frequency || null,
    duration: duration || null,
    description: description || null,
  };
}
