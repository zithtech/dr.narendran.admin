import { describe, expect, it } from 'vitest';
import { generatePatientSummaryHtml } from '../utils/patientSummaryPdfGenerator';
import type { Patient } from '../../../components/PatientModal';
import type { Prescription } from '../../prescriptions/api/prescriptionsApi';
import type { PatientMedicalHistoryRecord } from '../types/medicalHistory.types';

describe('patientSummaryPdfGenerator', () => {
  const mockPatient: Patient = {
    id: '70e2fa13-82b2-4e8a-8113-a085a2d501e2',
    patient_id: 'PA_019',
    name: 'Kavitha Sundaram',
    gender: 'Female',
    date_of_birth: '1984-06-15',
    phone: '+91 98765 43210',
    email: 'kavitha.sundaram@example.com',
    blood_group: 'B+',
    address_line_1: '45, Trichy Main Road, Singanallur',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    postal_code: '641005',
    country: 'India',
  };

  const mockPrescription: Prescription = {
    id: 'c455ed02-b558-46bb-af6d-e8b64e34ede6',
    prescription_number: 'NA-CH-004',
    prescription_date: '2026-11-24',
    status: 'active',
    medicines_count: 3,
    follow_up_days: 14,
    created_at: '2026-11-24T10:00:00.000Z',
    doctor: {
      id: 'doc-001',
      name: 'Dr. S. Narendran',
      specialization: 'Surgical Oncology',
    },
    medicines: [
      {
        medicine_name: 'Cap. Evion',
        strength: '400 mg',
        dosage: '1 capsule',
        frequency: '1-0-1',
        duration: '15 days',
        food_instruction: 'After Food',
        instructions: 'Take after breakfast and dinner',
      },
      {
        medicine_name: 'Tab. Dolo',
        strength: '650 mg',
        dosage: '1 tablet',
        frequency: '1-0-0-1 (SOS)',
        duration: '5 days',
        food_instruction: 'After Food',
        instructions: 'Take only if temperature exceeds 100°F',
      },
      {
        medicine_name: 'Tab. Thyronorm',
        strength: '50 mcg',
        dosage: '1 tablet',
        frequency: '1-0-0',
        duration: '30 days',
        food_instruction: 'Before Food',
        instructions: 'Take early morning on empty stomach with water',
      },
    ],
    lab_tests: [
      {
        test_name: 'Ultrasound Guided FNAC Right Breast Lump',
        instructions: 'Bring previous mammogram and ultrasound films',
      },
      {
        test_name: 'Complete Blood Count (CBC) with Platelets',
      },
    ],
    additional_notes: 'Maintain adequate hydration and high-protein diet. Review with biopsy results in 14 days.',
  };

  it('renders Section 7 with authorized prescription details, medicines table, lab tests, and doctor notes', () => {
    const html = generatePatientSummaryHtml({
      patient: mockPatient,
      prescriptions: [mockPrescription],
    });

    // 1. Verify Section 7 Header and Badge
    expect(html).toContain('7. Authorized Prescription &amp; Clinical Rx Regimen');
    expect(html).toContain('Rx No: NA-CH-004');
    expect(html).toContain('ACTIVE');
    expect(html).toContain('Follow-up in 14 days');

    // 2. Verify all prescribed medicines with strength, dosage, frequency, duration, food & special instructions
    expect(html).toContain('Cap. Evion');
    expect(html).toContain('400 mg');
    expect(html).toContain('1 capsule');
    expect(html).toContain('1-0-1');
    expect(html).toContain('15 days');
    expect(html).toContain('After Food');
    expect(html).toContain('Take after breakfast and dinner');

    expect(html).toContain('Tab. Dolo');
    expect(html).toContain('650 mg');
    expect(html).toContain('1-0-0-1 (SOS)');

    expect(html).toContain('Tab. Thyronorm');
    expect(html).toContain('50 mcg');
    expect(html).toContain('Before Food');
    expect(html).toContain('empty stomach');

    // 3. Verify Lab Tests
    expect(html).toContain('Ultrasound Guided FNAC Right Breast Lump');
    expect(html).toContain('Complete Blood Count (CBC) with Platelets');

    // 4. Verify Doctor Advice / Instructions
    expect(html).toContain('Maintain adequate hydration and high-protein diet');

    // 5. Verify no accidental "Dr. Dr." formatting anywhere in generated HTML
    expect(html).not.toMatch(/\bDr\.?\s+Dr\.?\s+/i);
  });

  it('falls back cleanly to documented intake medications when no official prescriptions are provided', () => {
    const mockRecord: PatientMedicalHistoryRecord = {
      id: 'rec-001',
      patient_id: mockPatient.id,
      previous_medical_history: {
        current_medications: [
          {
            medicine_name: 'Tab. Metformin',
            dosage: '500 mg',
            frequency: '1-0-1',
            route: 'Oral',
            started_date: '2026-01-10',
          },
        ],
      },
    };

    const html = generatePatientSummaryHtml({
      patient: mockPatient,
      medicalRecord: mockRecord,
      prescriptions: [],
    });

    expect(html).toContain('7. Clinical Medications &amp; Rx Regimen');
    expect(html).toContain('Documented Regimen');
    expect(html).toContain('Tab. Metformin');
    expect(html).toContain('500 mg');
  });

  it('renders a professional empty message when neither official prescription nor intake medications exist', () => {
    const html = generatePatientSummaryHtml({
      patient: mockPatient,
      medicalRecord: null,
      prescriptions: [],
    });

    expect(html).toContain('7. Authorized Prescriptions &amp; Clinical Rx Regimen');
    expect(html).toContain('No active outpatient prescriptions recorded for this patient at this visit.');
  });
});
