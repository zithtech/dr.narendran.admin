import { describe, expect, it, vi } from 'vitest';
import { searchMedicinesWithAi } from '../services/aiMedicineService';
import type { AIMedicineSuggestion } from '../types/pharmacy';
import { mapAiMedicineToFormData } from '../utils/aiMedicineMapper';
import api from '../utils/api';

vi.mock('../utils/api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('AI-Assisted Medicine Auto-Fill and Mapper', () => {
  it('should return empty list when query is empty or whitespace', async () => {
    const results = await searchMedicinesWithAi('   ');
    expect(results).toEqual([]);
    expect(api.post).not.toHaveBeenCalled();
  });

  it('should call backend AI search endpoint with trimmed query and return medicines list', async () => {
    const mockMedicines: AIMedicineSuggestion[] = [
      {
        medicineName: 'Paracetamol 500mg Tablet',
        genericName: 'Paracetamol',
        dosageForm: 'Tablet',
        strength: '500',
        strengthUnit: 'mg',
        therapeuticCategory: 'Analgesics / Antipyretic',
        subCategory: 'Pain Relief',
        manufacturer: 'GSK',
        prescriptionRequired: false,
        status: 'Active',
        medicineCode: null,
        barcode: null,
        mrp: 20.5,
        discountType: null,
        discountValue: null,
        finalPrice: 20.5,
        frequency: '1-0-1',
        duration: '5 days',
        description: 'Take after food.',
      },
    ];

    vi.mocked(api.post).mockResolvedValueOnce({
      data: { medicines: mockMedicines },
    });

    const results = await searchMedicinesWithAi('Paracetamol');
    expect(api.post).toHaveBeenCalledWith('medicines/ai-search', { query: 'Paracetamol' });
    expect(results).toHaveLength(1);
    expect(results[0]?.medicineName).toBe('Paracetamol 500mg Tablet');
  });

  it('should accurately map AI medicine suggestion into form fields', () => {
    const aiSuggestion: AIMedicineSuggestion = {
      medicineName: 'Augmentin 625 Duo',
      genericName: 'Amoxicillin and Clavulanate Potassium',
      dosageForm: 'Tablet',
      strength: '625',
      strengthUnit: 'mg',
      therapeuticCategory: 'Antibiotics & Antivirals',
      subCategory: 'Broad-spectrum Penicillin',
      manufacturer: 'GSK Pharmaceuticals',
      prescriptionRequired: true,
      status: 'Active',
      medicineCode: 'MED-AUG-625',
      barcode: '8901234567890',
      mrp: 210.0,
      discountType: 'Percentage',
      discountValue: 10,
      finalPrice: 189.0,
      frequency: '1-0-1',
      duration: '5 days',
      description: 'Antibiotic course. Complete full course as advised.',
    };

    const formState = mapAiMedicineToFormData(aiSuggestion);

    expect(formState.medicineName).toBe('Augmentin 625 Duo');
    expect(formState.genericName).toBe('Amoxicillin and Clavulanate Potassium');
    expect(formState.dosageForm).toBe('Tablet');
    expect(formState.strength).toBe('625');
    expect(formState.strengthUnit).toBe('mg');
    expect(formState.therapeuticCategory).toBe('Antibiotics & Antivirals');
    expect(formState.subCategory).toBe('Broad-spectrum Penicillin');
    expect(formState.manufacturer).toBe('GSK Pharmaceuticals');
    expect(formState.prescriptionRequired).toBe(true);
    expect(formState.status).toBe('Active');
    expect(formState.medicineCode).toBe('MED-AUG-625');
    expect(formState.barcode).toBe('8901234567890');
    expect(formState.mrp).toBe('210');
    expect(formState.discountType).toBe('Percentage');
    expect(formState.discountValue).toBe('10');
    expect(formState.finalPrice).toBe('189');
    expect(formState.frequency).toBe('1-0-1');
    expect(formState.duration).toBe('5 days');
    expect(formState.description).toBe('Antibiotic course. Complete full course as advised.');
  });

  it('should handle optional and null fields gracefully during mapping', () => {
    const minimalAiSuggestion: AIMedicineSuggestion = {
      medicineName: 'Simple Saline Nasal Drops',
      genericName: null,
      dosageForm: null,
      strength: null,
      strengthUnit: null,
      therapeuticCategory: null,
      subCategory: null,
      manufacturer: null,
      prescriptionRequired: false,
      mrp: null,
      discountType: null,
      discountValue: null,
      finalPrice: null,
      frequency: null,
      duration: null,
      description: null,
    };

    const formState = mapAiMedicineToFormData(minimalAiSuggestion);

    expect(formState.medicineName).toBe('Simple Saline Nasal Drops');
    expect(formState.genericName).toBe('');
    expect(formState.dosageForm).toBe('Tablet'); // default fallback
    expect(formState.strength).toBe('');
    expect(formState.strengthUnit).toBe('mg'); // default fallback
    expect(formState.therapeuticCategory).toBe('');
    expect(formState.subCategory).toBe('');
    expect(formState.manufacturer).toBe('');
    expect(formState.prescriptionRequired).toBe(false);
    expect(formState.status).toBe('Active');
    expect(formState.mrp).toBe('');
    expect(formState.discountType).toBe('');
    expect(formState.discountValue).toBe('');
    expect(formState.finalPrice).toBe('');
    expect(formState.frequency).toBe('');
    expect(formState.duration).toBe('');
    expect(formState.description).toBe('');
  });
});
