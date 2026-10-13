import * as XLSX from 'xlsx';

import type { DiscountType, MedicineStatus, ParsedMedicineRow } from '../types/pharmacy';

export const EXCEL_COLUMNS = [
  'Medicine Name',
  'Generic Name',
  'Strength',
  'Strength Unit',
  'Dosage Form',
  'Therapeutic Category',
  'Sub Category',
  'Manufacturer',
  'Prescription Required',
  'Status',
  'Medicine Code',
  'Barcode',
  'MRP',
  'Discount Type',
  'Discount Value',
  'Final Price',
  'Frequency',
  'Duration',
  'Description',
] as const;

export const SAMPLE_TEMPLATE_ROWS: Record<string, string | number>[] = [
  {
    'Medicine Name': 'Paracetamol 500mg',
    'Generic Name': 'Paracetamol',
    'Strength': '500',
    'Strength Unit': 'mg',
    'Dosage Form': 'Tablet',
    'Therapeutic Category': 'Analgesics / Antipyretic',
    'Sub Category': 'Pain Relief',
    'Manufacturer': 'Cipla Ltd',
    'Prescription Required': 'No',
    'Status': 'Active',
    'Medicine Code': 'MED-PARA-500',
    'Barcode': '8901112223334',
    'MRP': 25.0,
    'Discount Type': 'Percentage',
    'Discount Value': 10,
    'Final Price': 22.5,
    'Frequency': '1-0-1',
    'Duration': '5 days',
    'Description': 'For mild to moderate pain and fever relief. Take after food.',
  },
  {
    'Medicine Name': 'Amoxicillin 500mg',
    'Generic Name': 'Amoxicillin Trihydrate',
    'Strength': '500',
    'Strength Unit': 'mg',
    'Dosage Form': 'Capsule',
    'Therapeutic Category': 'Antibiotics',
    'Sub Category': 'Penicillins',
    'Manufacturer': 'Sun Pharma',
    'Prescription Required': 'Yes',
    'Status': 'Active',
    'Medicine Code': 'MED-AMOX-500',
    'Barcode': '8902223334445',
    'MRP': 85.0,
    'Discount Type': 'Fixed Amount',
    'Discount Value': 10,
    'Final Price': 75.0,
    'Frequency': '1-1-1',
    'Duration': '7 days',
    'Description': 'Broad spectrum antibacterial. Complete full course.',
  },
  {
    'Medicine Name': 'Pantoprazole 40mg',
    'Generic Name': 'Pantoprazole Sodium',
    'Strength': '40',
    'Strength Unit': 'mg',
    'Dosage Form': 'Tablet',
    'Therapeutic Category': 'Gastrointestinal',
    'Sub Category': 'Proton Pump Inhibitors',
    'Manufacturer': 'Torrent Pharma',
    'Prescription Required': 'No',
    'Status': 'Active',
    'Medicine Code': 'MED-PAN-40',
    'Barcode': '8903334445556',
    'MRP': 95.0,
    'Discount Type': 'Percentage',
    'Discount Value': 15,
    'Final Price': 80.75,
    'Frequency': '1-0-0',
    'Duration': '14 days',
    'Description': 'Take 30 minutes before breakfast for acidity and GERD.',
  },
  {
    'Medicine Name': 'Metformin 500mg SR',
    'Generic Name': 'Metformin Hydrochloride',
    'Strength': '500',
    'Strength Unit': 'mg',
    'Dosage Form': 'Tablet',
    'Therapeutic Category': 'Antidiabetic',
    'Sub Category': 'Biguanides',
    'Manufacturer': 'Dr. Reddy Laboratories',
    'Prescription Required': 'Yes',
    'Status': 'Active',
    'Medicine Code': 'MED-MET-500',
    'Barcode': '8904445556667',
    'MRP': 45.0,
    'Discount Type': '',
    'Discount Value': '',
    'Final Price': 45.0,
    'Frequency': '1-0-1',
    'Duration': '30 days',
    'Description': 'Sustained release for blood sugar management. Take with meals.',
  },
  {
    'Medicine Name': 'Cetirizine 10mg',
    'Generic Name': 'Cetirizine Dihydrochloride',
    'Strength': '10',
    'Strength Unit': 'mg',
    'Dosage Form': 'Tablet',
    'Therapeutic Category': 'Antihistamines',
    'Sub Category': 'Allergy Relief',
    'Manufacturer': 'Alkem Laboratories',
    'Prescription Required': 'No',
    'Status': 'Active',
    'Medicine Code': 'MED-CET-10',
    'Barcode': '8905556667778',
    'MRP': 35.0,
    'Discount Type': 'Percentage',
    'Discount Value': 10,
    'Final Price': 31.5,
    'Frequency': '0-0-1',
    'Duration': '5 days',
    'Description': 'For allergy symptoms and runny nose. May cause mild drowsiness.',
  },
];

function saveWorkbookAsExcel(workbook: XLSX.WorkBook, filename: string): void {
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
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
      if (val !== undefined) {
        const str = typeof val === 'string' ? val : typeof val === 'number' ? String(val) : '';
        maxLen = Math.max(maxLen, str.length);
      }
    }
    return { wch: Math.min(Math.max(maxLen + 3, 12), 40) };
  });
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Medicines Template');

  saveWorkbookAsExcel(workbook, 'dr_narendran_medicines_template.xlsx');
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

  saveWorkbookAsExcel(workbook, `medicine_import_errors_${new Date().toISOString().slice(0, 10)}.xlsx`);
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
  const medicineName = getString(raw, 'Medicine Name', 'medicine_name', 'Name', 'name', 'Medicine');
  const genericName = getString(raw, 'Generic Name', 'generic_name', 'Generic');
  const strength = getString(raw, 'Strength', 'strength');
  const strengthUnit = getString(raw, 'Strength Unit', 'strength_unit', 'Unit');
  const dosageForm = getString(raw, 'Dosage Form', 'dosage_form', 'Form');
  const category = getString(raw, 'Therapeutic Category', 'therapeutic_category', 'Category', 'category');
  const subCategory = getString(raw, 'Sub Category', 'sub_category');
  const manufacturer = getString(raw, 'Manufacturer', 'manufacturer', 'Company');

  const rxRaw = getString(raw, 'Prescription Required', 'prescription_required', 'Rx Required');
  const rxStr = rxRaw.toLowerCase();
  const prescriptionRequired =
    rxStr === 'yes' || rxStr === 'true' || rxStr === '1' || raw['Prescription Required'] === true;

  const statusRaw = getString(raw, 'Status', 'status');
  const status: MedicineStatus = statusRaw.toLowerCase() === 'inactive' ? 'Inactive' : 'Active';

  const code = getString(raw, 'Medicine Code', 'medicine_code', 'SKU', 'Code');
  const barcode = getString(raw, 'Barcode', 'barcode');

  const mrp = getNumber(raw, 'MRP', 'mrp', 'Price', 'price');
  const rawDiscountType = getString(raw, 'Discount Type', 'discount_type').toLowerCase();
  const discountType: DiscountType | null = rawDiscountType.includes('fixed')
    ? 'Fixed Amount'
    : rawDiscountType.includes('percent')
      ? 'Percentage'
      : null;

  const discountValue = getNumber(raw, 'Discount Value', 'discount_value');
  const finalPrice = getNumber(raw, 'Final Price', 'final_price', 'Selling Price') ?? mrp;

  const frequency = getString(raw, 'Frequency', 'frequency');
  const duration = getString(raw, 'Duration', 'duration');
  const description = getString(raw, 'Description', 'description');

  return {
    row: rowNum,
    medicineName,
    genericName: genericName ? genericName : null,
    strength: strength ? strength : null,
    strengthUnit: strengthUnit ? strengthUnit : null,
    dosageForm: dosageForm ? dosageForm : null,
    therapeuticCategory: category ? category : null,
    subCategory: subCategory ? subCategory : null,
    manufacturer: manufacturer ? manufacturer : null,
    prescriptionRequired,
    status,
    medicineCode: code ? code : null,
    barcode: barcode ? barcode : null,
    mrp,
    discountType,
    discountValue,
    finalPrice,
    frequency: frequency ? frequency : null,
    duration: duration ? duration : null,
    description: description ? description : null,
  };
}
