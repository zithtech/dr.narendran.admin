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

describe('Annaamalai Cancer Center Letterhead Prescription Template System', () => {
  it('1. Predefined static template contains all required placeholders and zero hardcoded entities', () => {
    const tpl = STANDARD_PRESCRIPTION_TEMPLATE_HTML;
    expect(tpl).toContain('{{hospital_name}}');
    expect(tpl).toContain('{{doctor_name}}');
    expect(tpl).toContain('{{doctor_qualification}}');
    expect(tpl).toContain('{{doctor_specialization}}');
    expect(tpl).toContain('{{doctor_registration_number}}');
    expect(tpl).toContain('{{patient_name}}');
    expect(tpl).toContain('{{patient_id}}');
    expect(tpl).toContain('{{patient_age}}');
    expect(tpl).toContain('{{patient_gender}}');
    expect(tpl).toContain('{{medicines_table}}');
    expect(tpl).toContain('{{lab_tests}}');
    expect(tpl).toContain('{{diagnosis}}');
    expect(tpl).toContain('{{additional_notes}}');
    expect(tpl).toContain('{{doctor_signature}}');
    expect(tpl).toContain('{{prescription_date}}');

    // Verify it is not tied to a specific hardcoded patient
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

  it('3. Dynamic medicine table generation renders multiple medicines cleanly with purple branding', () => {
    const meds = [
      {
        name: 'Tamoxifen 20mg',
        strength: '20 mg',
        dosage: '1 tablet',
        frequency: 'Once daily',
        duration: '30 days',
        mealTiming: 'After meals',
        instructions: 'Take in morning with water',
      },
      {
        name: 'Ondansetron 4mg',
        dosage: '1 tablet',
        frequency: 'Twice daily',
        duration: '5 days',
        mealTiming: 'Before meals',
      },
    ];

    const tableHtml = renderMedicinesTableHtml(meds);
    expect(tableHtml).toContain('Tamoxifen 20mg');
    expect(tableHtml).toContain('Ondansetron 4mg');
    expect(tableHtml).toContain('Once daily');
    expect(tableHtml).toContain('After meals');
    expect(tableHtml).toContain('Take in morning with water');
  });

  it('4. Dynamic lab tests generation renders diagnostic tests properly', () => {
    const labs = [
      { testName: 'Complete Blood Count (CBC)', instructions: 'Fasting not required' },
      { testName: 'Serum Creatinine', instructions: 'Early morning sample' },
    ];

    const labsHtml = renderLabTestsHtml(labs);
    expect(labsHtml).toContain('Complete Blood Count (CBC)');
    expect(labsHtml).toContain('Serum Creatinine');
    expect(labsHtml).toContain('Early morning sample');
  });

  it('5. Graceful handling of missing optional fields without undefined or {{...}}', () => {
    const sparseContext: LetterPadDataContext = {
      hospital: { name: 'Annaamalai Cancer Center' },
      doctor: { name: 'S. Narendran' },
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
      doctor: { name: 'Dr. S. Narendran' },
      patient: { name: 'Test Patient' },
    };

    const result = resolvePrescriptionTemplate(STANDARD_PRESCRIPTION_TEMPLATE_HTML, contextWithDr);
    expect(result.renderedHtml).toContain('Dr. S. Narendran');
    expect(result.renderedHtml).not.toContain('Dr. Dr. S. Narendran');
  });

  it('7. Admin preview renders sample Annaamalai Cancer Center data accurately', () => {
    const result = resolvePrescriptionTemplate(
      STANDARD_PRESCRIPTION_TEMPLATE_HTML,
      SAMPLE_ADMIN_PREVIEW_DATA
    );

    expect(result.renderedHtml).toContain('Annaamalai Cancer Center');
    expect(result.renderedHtml).toContain('Dr. S. Narendran');
    expect(result.renderedHtml).toContain('BHARATHI M');
    expect(result.renderedHtml).toContain('HMS-2026-0456');
    expect(result.renderedHtml).toContain('Follow-up clinical oncology assessment');
    expect(result.unresolvedPlaceholders).toHaveLength(0);
  });

  it('8. E-Sign functionality embeds signature image URL when doctor signature is provided', () => {
    const contextWithSignature: LetterPadDataContext = {
      doctor: {
        name: 'Dr. S. Narendran',
        signature_url: 'https://example.com/signatures/dr-narendran-esign.png',
      },
      patient: { name: 'Test Patient' },
    };

    const result = resolvePrescriptionTemplate(STANDARD_PRESCRIPTION_TEMPLATE_HTML, contextWithSignature);
    expect(result.renderedHtml).toContain('https://example.com/signatures/dr-narendran-esign.png');
    expect(result.renderedHtml).toContain('class="rx-sig-img"');
  });

  it('9. Backward compatibility with uppercase placeholder tags', () => {
    const customTemplate = '<div>{{PATIENT_NAME}} - {{PATIENT_ID}} - {{DOCTOR_NAME}} - {{DOCTOR_REG_NO}} - {{E_SIGNATURE}}</div>';
    const result = resolvePrescriptionTemplate(customTemplate, {
      patient: { name: 'Anita Kumar', patient_id: 'PT-9988' },
      doctor: { name: 'S. Narendran', medical_registration_number: '106226' },
    });

    expect(result.renderedHtml).toContain('Anita Kumar');
    expect(result.renderedHtml).toContain('PT-9988');
    expect(result.renderedHtml).toContain('S. Narendran');
    expect(result.renderedHtml).toContain('106226');
  });

  it('10. E-Sign fallback renders artistic cursive signature when signature_url is not provided', () => {
    const contextWithoutSignature: LetterPadDataContext = {
      doctor: {
        name: 'Dr. S. Narendran',
        qualification: 'M.D (RT)',
      },
      patient: { name: 'John Doe' },
    };

    const result = resolvePrescriptionTemplate(STANDARD_PRESCRIPTION_TEMPLATE_HTML, contextWithoutSignature);
    expect(result.renderedHtml).toContain('class="rx-sig-art"');
    expect(result.renderedHtml).toContain('S. Narendran');
  });

  it('11. Full clinical prescription render with all sections populated cleanly', () => {
    const fullContext: LetterPadDataContext = {
      hospital: {
        name: 'Annaamalai Cancer Center',
        phone: '+91 84380 56883',
        email: 'narenonco@gmail.com',
        website: 'www.drnarendranoncologist.com',
      },
      doctor: {
        name: 'Dr. S. Narendran',
        qualification: 'M.D (RT)',
        specialization: 'Consultant Oncologist.',
        medical_registration_number: '106226',
        signature_url: 'https://storage.aws.com/signatures/dr-narendran.png',
      },
      patient: {
        name: 'PRIYA R',
        patient_id: 'ACC-2026-9021',
        age: '42 Years',
        gender: 'Female',
      },
      prescription: {
        prescription_id: 'PRS-9021',
        prescription_date: '2026-10-06T10:00:00Z',
        appointment_id: 'APT-4421',
        diagnosis: 'Stage II Clinical Review - Adjuvant Therapy',
        medicines: [
          {
            name: 'Capecitabine 500mg',
            dosage: '2 Tablets',
            frequency: 'Twice daily',
            duration: '14 days',
            mealTiming: 'After food',
            instructions: 'Take 30 mins after meals with plenty of water',
          },
        ],
        lab_tests: [
          {
            testName: 'Complete Blood Count & Liver Function Tests',
            instructions: 'Morning fasting blood draw',
          },
        ],
        additional_notes: '1. Follow up in 3 weeks.\n2. In case of fever > 100.4 F, contact immediately.',
      },
    };

    const result = resolvePrescriptionTemplate(STANDARD_PRESCRIPTION_TEMPLATE_HTML, fullContext);
    expect(result.renderedHtml).toContain('PRIYA R');
    expect(result.renderedHtml).toContain('ACC-2026-9021');
    expect(result.renderedHtml).toContain('42 Years / Female');
    expect(result.renderedHtml).toContain('Stage II Clinical Review - Adjuvant Therapy');
    expect(result.renderedHtml).toContain('Capecitabine 500mg');
    expect(result.renderedHtml).toContain('Complete Blood Count &amp; Liver Function Tests');
    expect(result.renderedHtml).toContain('Follow up in 3 weeks');
    expect(result.renderedHtml).toContain('https://storage.aws.com/signatures/dr-narendran.png');
    expect(result.unresolvedPlaceholders).toHaveLength(0);
  });
});
