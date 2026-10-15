import { describe, expect, it } from 'vitest';

import { formatDosageStrengthSummary } from '../types/pharmacy';
import { EXCEL_COLUMNS, normalizeExcelRow, SAMPLE_TEMPLATE_ROWS } from '../utils/excelTemplate';

describe('Pharmacy Management & Excel Template Utilities', () => {
  it('should define all expected medicine schema columns in Excel template', () => {
    expect(EXCEL_COLUMNS).toContain('medicine_code');
    expect(EXCEL_COLUMNS).toContain('medicine_name');
    expect(EXCEL_COLUMNS).toContain('generic_name');
    expect(EXCEL_COLUMNS).toContain('strength');
    expect(EXCEL_COLUMNS).toContain('strength_unit');
    expect(EXCEL_COLUMNS).toContain('dosage_form');
    expect(EXCEL_COLUMNS).toContain('tablets_per_strip');
    expect(EXCEL_COLUMNS).toContain('opening_stock');
    expect(EXCEL_COLUMNS).toContain('therapeutic_category');
    expect(EXCEL_COLUMNS).toContain('manufacturer');
    expect(EXCEL_COLUMNS).toContain('prescription_required');
    expect(EXCEL_COLUMNS).toContain('status');
    expect(EXCEL_COLUMNS).toContain('mrp');
    expect(EXCEL_COLUMNS).toContain('purchase_price');
    expect(EXCEL_COLUMNS).toContain('reorder_level');
    expect(EXCEL_COLUMNS.length).toBeGreaterThanOrEqual(20);
  });

  it('should provide rich clinical sample rows with multiple strength variants in the template', () => {
    expect(SAMPLE_TEMPLATE_ROWS.length).toBeGreaterThanOrEqual(4);
    const paracetamol500 = SAMPLE_TEMPLATE_ROWS[0];
    expect(paracetamol500?.medicine_code).toBe('MED001');
    expect(paracetamol500?.medicine_name).toBe('Paracetamol');
    expect(paracetamol500?.strength).toBe('500');
    expect(paracetamol500?.strength_unit).toBe('mg');
    expect(paracetamol500?.dosage_form).toBe('Tablet');
    expect(paracetamol500?.status).toBe('ACTIVE');

    const paracetamol650 = SAMPLE_TEMPLATE_ROWS[1];
    expect(paracetamol650?.medicine_code).toBe('MED001');
    expect(paracetamol650?.medicine_name).toBe('Paracetamol');
    expect(paracetamol650?.strength).toBe('650');
    expect(paracetamol650?.dosage_form).toBe('Tablet');
  });

  it('should accurately normalize raw Excel rows into structured Medicine objects', () => {
    const rawRow = {
      'Medicine Name': 'Amoxicillin 500mg',
      'Generic Name': 'Amoxicillin',
      Strength: '500',
      'Strength Unit': 'mg',
      'Dosage Form': 'Capsule',
      'Therapeutic Category': 'Antibiotics',
      Manufacturer: 'Sun Pharma',
      'Prescription Required': 'Yes',
      Status: 'ACTIVE',
      'Medicine Code': 'MED-AMOX-500',
      MRP: '85.00',
      'Discount Type': 'Fixed Amount',
      'Discount Value': '10',
      'Final Price': '75.00',
      Frequency: '1-1-1',
      Duration: '7 days',
    };

    const normalized = normalizeExcelRow(rawRow, 1);

    expect(normalized.row).toBe(1);
    expect(normalized.medicineName).toBe('Amoxicillin 500mg');
    expect(normalized.genericName).toBe('Amoxicillin');
    expect(normalized.strength).toBe('500');
    expect(normalized.strengthUnit).toBe('mg');
    expect(normalized.dosageForm).toBe('Capsule');
    expect(normalized.therapeuticCategory).toBe('Antibiotics');
    expect(normalized.manufacturer).toBe('Sun Pharma');
    expect(normalized.prescriptionRequired).toBe(true);
    expect(normalized.status).toBe('Active');
    expect(normalized.medicineCode).toBe('MED-AMOX-500');
    expect(normalized.mrp).toBe(85);
    expect(normalized.discountType).toBe('Fixed Amount');
    expect(normalized.discountValue).toBe(10);
    expect(normalized.finalPrice).toBe(75);
    expect(normalized.frequency).toBe('1-1-1');
    expect(normalized.duration).toBe('7 days');
  });

  it('should handle optional/missing fields safely without throwing', () => {
    const rawMinimalRow = {
      'Medicine Name': 'Simple Aspirin',
    };

    const normalized = normalizeExcelRow(rawMinimalRow, 2);

    expect(normalized.row).toBe(2);
    expect(normalized.medicineName).toBe('Simple Aspirin');
    expect(normalized.genericName).toBeNull();
    expect(normalized.strength).toBeNull();
    expect(normalized.prescriptionRequired).toBe(false);
    expect(normalized.status).toBe('Active');
    expect(normalized.mrp).toBeNull();
    expect(normalized.finalPrice).toBeNull();
  });

  it('should correctly interpret status casing and boolean prescription flags', () => {
    const inactiveRow = {
      'Medicine Name': 'Old Cough Syrup',
      Status: 'Inactive',
      'Prescription Required': 'No',
    };
    const normInactive = normalizeExcelRow(inactiveRow, 3);
    expect(normInactive.status).toBe('Inactive');
    expect(normInactive.prescriptionRequired).toBe(false);

    const activeTrueRow = {
      'Medicine Name': 'Morphine 10mg',
      Status: 'ACTIVE',
      'Prescription Required': 'TRUE',
    };
    const normActiveTrue = normalizeExcelRow(activeTrueRow, 4);
    expect(normActiveTrue.status).toBe('Active');
    expect(normActiveTrue.prescriptionRequired).toBe(true);
  });

  it('should normalize snake_case row format with strength variants and inventory fields', () => {
    const rawVariantRow = {
      medicine_code: 'MED001',
      medicine_name: 'Paracetamol',
      generic_name: 'Paracetamol',
      strength: '500',
      strength_unit: 'mg',
      dosage_form: 'Tablet',
      tablets_per_strip: '10',
      opening_stock: '100',
      mrp: '25.00',
      discount_type: 'PERCENTAGE',
      discount_value: '10',
      purchase_price: '15.00',
      reorder_level: '20',
      variant_code: 'VAR-PARA-500',
      notes: 'Shelf A1',
      status: 'ACTIVE',
    };

    const norm = normalizeExcelRow(rawVariantRow, 5);

    expect(norm.medicineCode).toBe('MED001');
    expect(norm.medicineName).toBe('Paracetamol');
    expect(norm.strength).toBe('500');
    expect(norm.strengthUnit).toBe('mg');
    expect(norm.dosageForm).toBe('Tablet');
    expect(norm.tabletsPerStrip).toBe(10);
    expect(norm.openingStock).toBe(100);
    expect(norm.mrp).toBe(25.0);
    expect(norm.discountType).toBe('Percentage');
    expect(norm.discountValue).toBe(10);
    expect(norm.purchasePrice).toBe(15.0);
    expect(norm.reorderLevel).toBe(20);
    expect(norm.variantCode).toBe('VAR-PARA-500');
    expect(norm.notes).toBe('Shelf A1');
    expect(norm.status).toBe('Active');
  });

  it('should support multiple strength variants for the same medicine in one file batch', () => {
    const rows = [
      {
        medicine_code: 'MED-PAN',
        medicine_name: 'Pantoprazole',
        strength: '20',
        strength_unit: 'mg',
        dosage_form: 'Tablet',
        tablets_per_strip: 10,
        opening_stock: 50,
      },
      {
        medicine_code: 'MED-PAN',
        medicine_name: 'Pantoprazole',
        strength: '40',
        strength_unit: 'mg',
        dosage_form: 'Tablet',
        tablets_per_strip: 15,
        opening_stock: 100,
      },
    ];

    const parsed = rows.map((r, i) => normalizeExcelRow(r, i + 1));

    expect(parsed.length).toBe(2);
    expect(parsed[0]?.medicineCode).toBe('MED-PAN');
    expect(parsed[1]?.medicineCode).toBe('MED-PAN');
    expect(parsed[0]?.strength).toBe('20');
    expect(parsed[1]?.strength).toBe('40');
    expect(parsed[0]?.openingStock).toBe(50);
    expect(parsed[1]?.openingStock).toBe(100);
  });

  describe('formatDosageStrengthSummary', () => {
    it('should format multiple variants grouped by dosage form with deduplicated strengths', () => {
      const variants = [
        {
          id: 'v1',
          strength: '500',
          strength_unit: 'mg',
          dosage_form: 'Tablet',
          available_quantity: 100,
          status: 'ACTIVE' as const,
        },
        {
          id: 'v2',
          strength: '650',
          strength_unit: 'mg',
          dosage_form: 'Tablet',
          available_quantity: 50,
          status: 'ACTIVE' as const,
        },
        {
          id: 'v3',
          strength: '500',
          strength_unit: 'mg',
          dosage_form: 'Tablet',
          available_quantity: 20,
          status: 'ACTIVE' as const,
        },
        {
          id: 'v4',
          strength: '125',
          strength_unit: 'mg/5ml',
          dosage_form: 'Syrup',
          available_quantity: 30,
          status: 'ACTIVE' as const,
        },
      ];

      const summary = formatDosageStrengthSummary(variants);

      expect(summary).toHaveLength(2);
      expect(summary[0]).toEqual({
        form: 'Tablet',
        strengths: ['500 mg', '650 mg'],
      });
      expect(summary[1]).toEqual({
        form: 'Syrup',
        strengths: ['125 mg/5ml'],
      });
    });

    it('should fallback to legacy master dosage form and strength when no variants are present', () => {
      const summary = formatDosageStrengthSummary(null, 'Capsule', '250 mg');
      expect(summary).toEqual([
        {
          form: 'Capsule',
          strengths: ['250 mg'],
        },
      ]);
    });

    it('should handle missing fallback strength gracefully', () => {
      const summary = formatDosageStrengthSummary([], 'Injection', null);
      expect(summary).toEqual([
        {
          form: 'Injection',
          strengths: [],
        },
      ]);
    });
  });
});
