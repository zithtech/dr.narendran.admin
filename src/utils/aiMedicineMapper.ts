import type { AIMedicineSuggestion, DiscountType, MedicineStatus } from '../types/pharmacy';

export interface PopulatedMedicineFormFields {
  medicineName: string;
  genericName: string;
  dosageForm: string;
  strength: string;
  strengthUnit: string;
  therapeuticCategory: string;
  subCategory: string;
  manufacturer: string;
  prescriptionRequired: boolean;
  status: MedicineStatus;
  medicineCode: string;
  barcode: string;
  mrp: string;
  discountType: DiscountType | '';
  discountValue: string;
  finalPrice: string;
  frequency: string;
  duration: string;
  description: string;
}

/**
 * Maps an AI-suggested medicine result strictly into existing medicine form state fields.
 */
export function mapAiMedicineToFormData(item: AIMedicineSuggestion): PopulatedMedicineFormFields {
  const mrpStr =
    item.mrp !== null && item.mrp !== undefined && !isNaN(item.mrp)
      ? String(item.mrp)
      : '';

  const discountValStr =
    item.discountValue !== null && item.discountValue !== undefined && !isNaN(item.discountValue)
      ? String(item.discountValue)
      : '';

  const finalPriceStr =
    item.finalPrice !== null && item.finalPrice !== undefined && !isNaN(item.finalPrice)
      ? String(item.finalPrice)
      : mrpStr;

  return {
    medicineName: item.medicineName ?? '',
    genericName: item.genericName ?? '',
    dosageForm: item.dosageForm ?? 'Tablet',
    strength: item.strength ?? '',
    strengthUnit: item.strengthUnit ?? 'mg',
    therapeuticCategory: item.therapeuticCategory ?? '',
    subCategory: item.subCategory ?? '',
    manufacturer: item.manufacturer ?? '',
    prescriptionRequired: Boolean(item.prescriptionRequired),
    status: item.status === 'Active' || item.status === 'Inactive' ? item.status : 'Active',
    medicineCode: item.medicineCode ?? '',
    barcode: item.barcode ?? '',
    mrp: mrpStr,
    discountType: item.discountType === 'Percentage' || item.discountType === 'Fixed Amount' ? item.discountType : '',
    discountValue: discountValStr,
    finalPrice: finalPriceStr,
    frequency: item.frequency ?? '',
    duration: item.duration ?? '',
    description: item.description ?? '',
  };
}
