import { describe, expect, it } from 'vitest';

import {
  EXCEL_COLUMNS,
  normalizeExcelRow,
  SAMPLE_TEMPLATE_ROWS,
} from '../utils/excelTemplate';

describe('Pharmacy Management & Excel Template Utilities', () => {
  it('should define all expected medicine schema columns in Excel template', () => {
    expect(EXCEL_COLUMNS).toContain('Medicine Name');
    expect(EXCEL_COLUMNS).toContain('Generic Name');
    expect(EXCEL_COLUMNS).toContain('Strength');
    expect(EXCEL_COLUMNS).toContain('Strength Unit');
    expect(EXCEL_COLUMNS).toContain('Dosage Form');
    expect(EXCEL_COLUMNS).toContain('Therapeutic Category');
    expect(EXCEL_COLUMNS).toContain('Manufacturer');
    expect(EXCEL_COLUMNS).toContain('Prescription Required');
    expect(EXCEL_COLUMNS).toContain('Status');
    expect(EXCEL_COLUMNS).toContain('MRP');
    expect(EXCEL_COLUMNS).toContain('Final Price');
    expect(EXCEL_COLUMNS.length).toBeGreaterThanOrEqual(15);
  });

  it('should provide rich clinical sample rows in the template', () => {
    expect(SAMPLE_TEMPLATE_ROWS.length).toBeGreaterThanOrEqual(3);
    const paracetamol = SAMPLE_TEMPLATE_ROWS[0];
    expect(paracetamol?.['Medicine Name']).toBe('Paracetamol 500mg');
    expect(paracetamol?.['Generic Name']).toBe('Paracetamol');
    expect(paracetamol?.['Dosage Form']).toBe('Tablet');
    expect(paracetamol?.Status).toBe('Active');
  });

  it('should accurately normalize raw Excel rows into structured Medicine objects', () => {
    const rawRow = {
      'Medicine Name': 'Amoxicillin 500mg',
      'Generic Name': 'Amoxicillin',
      'Strength': '500',
      'Strength Unit': 'mg',
      'Dosage Form': 'Capsule',
      'Therapeutic Category': 'Antibiotics',
      'Manufacturer': 'Sun Pharma',
      'Prescription Required': 'Yes',
      'Status': 'ACTIVE',
      'Medicine Code': 'MED-AMOX-500',
      'MRP': '85.00',
      'Discount Type': 'Fixed Amount',
      'Discount Value': '10',
      'Final Price': '75.00',
      'Frequency': '1-1-1',
      'Duration': '7 days',
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
      'Status': 'Inactive',
      'Prescription Required': 'No',
    };
    const normInactive = normalizeExcelRow(inactiveRow, 3);
    expect(normInactive.status).toBe('Inactive');
    expect(normInactive.prescriptionRequired).toBe(false);

    const activeTrueRow = {
      'Medicine Name': 'Morphine 10mg',
      'Status': 'ACTIVE',
      'Prescription Required': 'TRUE',
    };
    const normActiveTrue = normalizeExcelRow(activeTrueRow, 4);
    expect(normActiveTrue.status).toBe('Active');
    expect(normActiveTrue.prescriptionRequired).toBe(true);
  });
});
