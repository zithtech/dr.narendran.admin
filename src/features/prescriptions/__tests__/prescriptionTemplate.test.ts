import { describe, expect, it } from 'vitest';

import {
  SAMPLE_ADMIN_PREVIEW_DATA,
  STANDARD_PRESCRIPTION_TEMPLATE_HTML,
} from '../templates/templateData';
import type { LetterPadDataContext } from '../types/template';
import {
  renderLabTestsHtml,
  renderMedicinesTableHtml,
  resolvePrescriptionTemplate,
} from '../utils/resolvePrescriptionTemplate';

describe('Simple Static HTML Prescription Template System', () => {
  it('1. Predefined static template contains all required placeholders and zero hardcoded entities', () => {
    const tpl = STANDARD_PRESCRIPTION_TEMPLATE_HTML;
    expect(tpl).toContain('{{hospital_name}}');
    expect(tpl).toContain('{{doctor_name}}');
    expect(tpl).toContain('{{patient_name}}');
    expect(tpl).toContain('{{medicines_table}}');
    expect(tpl).toContain('{{lab_tests}}');
    expect(tpl).toContain('{{diagnosis}}');
    expect(tpl).toContain('{{prescription_date}}');

    // Verify it is not tied to a specific hardcoded hospital or patient
    expect(tpl).not.toContain('Sample Hospital');
    expect(tpl).not.toContain('Sample Patient');
  });

  it('2. Template immutability: resolving runtime data never mutates the original static template', () => {
    const originalSnapshot = STANDARD_PRESCRIPTION_TEMPLATE_HTML;
    const runtimeContext: LetterPadDataContext = {
      hospital: { name: 'Apollo Health City' },
      doctor: { name: 'Dr. Ramesh Sundaram' },
      patient: { name: 'Kavitha Nathan', patient_id: 'PT-8899' },
      prescription: {
        diagnosis: 'Acute Bronchitis',
        medicines: [{ name: 'Azithromycin 500mg', dosage: '1 tab', frequency: 'Once daily' }],
      },
    };

    const result = resolvePrescriptionTemplate(STANDARD_PRESCRIPTION_TEMPLATE_HTML, runtimeContext);

    expect(result.renderedHtml).toContain('Apollo Health City');
    expect(result.renderedHtml).toContain('Kavitha Nathan');
    expect(result.renderedHtml).toContain('PT-8899');
    expect(result.renderedHtml).toContain('Acute Bronchitis');

    // Original static template remains 100% untouched
    expect(STANDARD_PRESCRIPTION_TEMPLATE_HTML).toBe(originalSnapshot);
    expect(STANDARD_PRESCRIPTION_TEMPLATE_HTML).toContain('{{patient_name}}');
    expect(STANDARD_PRESCRIPTION_TEMPLATE_HTML).not.toContain('Kavitha Nathan');
  });

  it('3. Dynamic medicine table generation renders multiple medicines cleanly', () => {
    const meds = [
      {
        name: 'Amoxicillin & Clavulanate 625mg',
        strength: '625 mg',
        dosage: '1 tablet',
        frequency: 'Twice daily',
        duration: '5 days',
        mealTiming: 'After meals',
        instructions: 'Take after heavy meals',
      },
      {
        name: 'Paracetamol 650mg',
        dosage: '1 tablet',
        frequency: 'As needed (SOS)',
        duration: '3 days',
        mealTiming: 'After meals',
      },
    ];

    const tableHtml = renderMedicinesTableHtml(meds);
    expect(tableHtml).toContain('Amoxicillin &amp; Clavulanate 625mg');
    expect(tableHtml).toContain('Paracetamol 650mg');
    expect(tableHtml).toContain('Twice daily');
    expect(tableHtml).toContain('After meals');
    expect(tableHtml).toContain('Take after heavy meals');
  });

  it('4. Dynamic lab tests generation renders diagnostic tests properly', () => {
    const labs = [
      { testName: 'Complete Blood Count (CBC)', instructions: 'Fasting not required' },
      { testName: 'HbA1c Glycated Hemoglobin', instructions: 'Early morning sample' },
    ];

    const labsHtml = renderLabTestsHtml(labs);
    expect(labsHtml).toContain('Complete Blood Count (CBC)');
    expect(labsHtml).toContain('HbA1c Glycated Hemoglobin');
    expect(labsHtml).toContain('Early morning sample');
  });

  it('5. Graceful handling of missing optional fields without undefined or {{...}}', () => {
    const sparseContext: LetterPadDataContext = {
      hospital: { name: 'City Clinic' },
      doctor: { name: 'Narendran' },
      patient: { name: 'John Doe' },
      prescription: {
        diagnosis: 'Mild Fever',
      },
    };

    const result = resolvePrescriptionTemplate(STANDARD_PRESCRIPTION_TEMPLATE_HTML, sparseContext);
    expect(result.renderedHtml).not.toContain('undefined');
    expect(result.renderedHtml).not.toContain('null');
    expect(result.renderedHtml).not.toMatch(/\{\{[a-zA-Z0-9_]+\}\}/);
  });

  it('6. Doctor name title deduplication avoids "Dr. Dr."', () => {
    const contextWithDr: LetterPadDataContext = {
      doctor: { name: 'Dr. Narendran' },
      patient: { name: 'Test Patient' },
    };

    const result = resolvePrescriptionTemplate(STANDARD_PRESCRIPTION_TEMPLATE_HTML, contextWithDr);
    expect(result.renderedHtml).toContain('Dr. Narendran');
    expect(result.renderedHtml).not.toContain('Dr. Dr. Narendran');
  });

  it('7. Admin preview renders sample dummy data accurately', () => {
    const result = resolvePrescriptionTemplate(
      STANDARD_PRESCRIPTION_TEMPLATE_HTML,
      SAMPLE_ADMIN_PREVIEW_DATA
    );

    expect(result.renderedHtml).toContain('Dr. Narendran Clinic');
    expect(result.renderedHtml).toContain('BHARATHI M');
    expect(result.renderedHtml).toContain('HMS-2026-0456');
    expect(result.renderedHtml).toContain('General checkup. Follow up as advised.');
    expect(result.unresolvedPlaceholders).toHaveLength(0);
  });
});
