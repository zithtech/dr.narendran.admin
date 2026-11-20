import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PatientDetailPage from '../pages/PatientDetailPage';
import api from '../utils/api';

vi.mock('../context/PermissionContext', () => ({
  usePermission: () => ({
    canView: () => true,
    canCreate: () => true,
    canUpdate: () => true,
    canDelete: () => true,
    hasRole: () => true,
    refreshPermissions: vi.fn(),
  }),
}));

vi.mock('../utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../features/prescriptions/api/prescriptionsApi', () => ({
  prescriptionsApi: {
    getByPatient: vi.fn().mockResolvedValue([]),
  },
}));

const mockPatient = {
  id: 'pat-200',
  name: 'Meenakshi Sundaram',
  gender: 'FEMALE',
  date_of_birth: '1988-04-12T00:00:00.000Z',
  blood_group: 'O+',
  occupation: 'Senior Lecturer',
  marital_status: 'Married',
  phone: '9840198401',
  email: 'meenakshi@example.com',
  address: '42 Gandhi Nagar',
  address_line_1: '42 Gandhi Nagar',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600020',
  status: 'ACTIVE',
  height_cm: 162,
  weight_kg: 58,
  blood_pressure: '118/76',
  blood_sugar: '94',
  body_temperature: '98.4',
  emergency_contacts: [
    { name: 'K. Sundaram', phone: '9840198402', relation: 'Spouse' },
  ],
  created_at: '2025-01-15T09:00:00.000Z',
  updated_at: '2025-01-15T09:00:00.000Z',
};

const mockHistoryRecords = [
  {
    id: 'hist-1',
    patient_id: 'pat-200',
    recorded_date: '2025-02-10T09:30:00.000Z',
    recorded_by_name: 'Dr. Narendran',
    notes: 'Regular checkup intake',
    current_medical_info: {
      chief_complaint: 'Intermittent tension headaches',
      current_symptoms: 'Bilateral throbbing headache on stressful days',
      duration_of_symptoms: '3 weeks',
      pain_level: 4,
      current_diagnosis: 'Tension-type Headache',
      clinical_observations: 'No focal neurological deficits',
      height_cm: 162,
      weight_kg: 60,
      bmi: 22.8,
      blood_pressure: '118/76',
      pulse_rate: 74,
      temperature: 98.4,
      oxygen_saturation: 99,
    },
    previous_medical_history: {
      chronic_diseases: ['Thyroid Disorder'],
      previous_diseases: [
        {
          disease_name: 'Hypothyroidism',
          diagnosis_date: '2019-06-15',
          treatment_details: 'Levothyroxine 50mcg daily',
          current_status: 'Active',
          remarks: 'TSH well controlled',
        },
      ],
      diabetes_history: { has_history: 'No' },
      blood_pressure_history: { has_history: 'No' },
      heart_disease_history: { has_history: 'No' },
      kidney_disease_history: { has_history: 'No' },
      liver_disease_history: { has_history: 'No' },
      respiratory_disease_history: { has_history: 'No' },
      surgeries: [
        {
          surgery_name: 'Cesarean Section (LSCS)',
          surgery_date: '2018-09-12',
          hospital_name: 'Apollo Hospital',
          surgeon_name: 'Dr. Radhika',
          remarks: 'Uncomplicated recovery',
        },
      ],
      hospital_admissions: [],
      injuries_accidents: [],
      blood_transfusions: { had_transfusion: 'No' },
      allergies: {
        medicine_allergies: 'Penicillin (mild urticaria)',
        food_allergies: 'None',
        other_allergies: 'Dust pollen',
      },
      current_medications: [
        {
          medicine_name: 'Levothyroxine',
          dosage: '50 mcg',
          frequency: 'Once Daily (OD)',
          is_current: true,
        },
      ],
      previous_medications: [],
      ongoing_treatments: 'Thyroid hormone replacement',
    },
    family_medical_history: {
      has_family_history: 'Yes',
      members: [
        {
          relationship: 'Father',
          disease_name: 'Type 2 Diabetes Mellitus',
          age_at_diagnosis: 52,
          current_health_status: 'Living with Condition',
          cause_of_death: null,
          remarks: 'Diet and oral hypoglycemics',
        },
        {
          relationship: 'Grandfather (Paternal)',
          disease_name: 'Myocardial Infarction',
          age_at_diagnosis: 68,
          current_health_status: 'Deceased',
          cause_of_death: 'Heart Failure at age 74',
          remarks: 'Smoker',
        },
      ],
    },
    reproductive_history: {
      is_applicable: true,
      marital_status: 'Married',
      age_at_menarche: 13,
      menstrual_status: 'Regular',
      age_at_menopause: null,
      number_of_pregnancies: 1,
      number_of_deliveries: 1,
      number_of_children: 1,
      number_of_living_children: 1,
      number_of_miscarriages: 0,
      number_of_abortions: 0,
      age_at_first_childbirth: 30,
      date_of_last_childbirth: '2018-09-12',
      breastfeeding_history: 'Yes',
      breastfeeding_duration: '14 months',
      contraceptive_usage: 'Barrier method',
      hormone_therapy_history: 'None',
      infertility_treatment_history: 'None',
    },
    lifestyle_history: {
      smoking_status: 'Never',
      smoking_duration: null,
      alcohol_consumption: 'Never',
      tobacco_usage: 'None',
      chewing_tobacco: 'None',
      diet_type: 'Vegetarian',
      physical_activity_level: 'Active',
      sleep_pattern: '7-8 hours normal sleep',
      occupational_exposure: 'Normal office / teaching environment',
      other_habits: 'Yoga thrice a week',
    },
    created_at: '2025-02-10T09:30:00.000Z',
    updated_at: '2025-02-10T09:30:00.000Z',
  },
];

const mockDocuments = [
  {
    id: 'doc-1',
    patient_id: 'pat-200',
    medical_history_id: 'hist-1',
    document_type: 'Laboratory Report',
    title: 'Thyroid Function Test (TSH, FT3, FT4)',
    file_name: 'tsh_panel_feb2025.pdf',
    file_url: '/uploads/medical-documents/tsh_panel_feb2025.pdf',
    file_type: 'application/pdf',
    file_size: 245000,
    document_date: '2025-02-08',
    notes: 'TSH within normal reference range',
    created_at: '2025-02-10T09:40:00.000Z',
  },
  {
    id: 'doc-2',
    patient_id: 'pat-200',
    medical_history_id: 'hist-1',
    document_type: 'Scan Report',
    title: 'Thyroid Ultrasound Scan',
    file_name: 'thyroid_usg.pdf',
    file_url: '/uploads/medical-documents/thyroid_usg.pdf',
    file_type: 'application/pdf',
    file_size: 1048576,
    document_date: '2024-11-20',
    notes: 'No solitary nodules identified',
    created_at: '2024-11-21T10:00:00.000Z',
  },
];

describe('Patient Medical History Integration Suite', { timeout: 25000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.startsWith('patients/pat-200/medical-histories')) {
        return Promise.resolve({ data: mockHistoryRecords });
      }
      if (url.startsWith('patients/pat-200/medical-documents')) {
        return Promise.resolve({ data: mockDocuments });
      }
      if (url.startsWith('patients/pat-200')) {
        return Promise.resolve({ data: mockPatient });
      }
      if (url === 'appointments') {
        return Promise.resolve({ data: [] });
      }
      if (url === 'medical-records') {
        return Promise.resolve({ data: [] });
      }
      if (url.includes('patient-timelines')) {
        return Promise.resolve({
          data: {
            data: {
              patient: { id: 'pat-200', name: 'Meenakshi Sundaram' },
              summary: { primary_condition: 'Hypothyroidism', active_medications: ['Levothyroxine'] },
              timeline: [],
              pagination: { page: 1, limit: 20, total: 0, has_next: false },
            },
          },
        });
      }
      return Promise.resolve({ data: [] });
    });
  });

  const renderComponent = () =>
    render(
      <MemoryRouter initialEntries={['/patients/pat-200']}>
        <Routes>
          <Route path="/patients/:patientId" element={<PatientDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

  it('renders Medical History tab button and switches to comprehensive clinical sections', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Meenakshi Sundaram' })).toBeInTheDocument();
    });

    const medicalHistoryTabBtn = screen.getByRole('button', { name: /medical history/i });
    expect(medicalHistoryTabBtn).toBeInTheDocument();

    // Click on Medical History tab
    fireEvent.click(medicalHistoryTabBtn);

    // Wait for the Medical History content to load
    await waitFor(() => {
      expect(screen.queryByText(/Personal & Demographic Profile/i)).not.toBeInTheDocument();
      expect(screen.getByText('1. Current Medical Information & Clinical Vitals')).toBeInTheDocument();
      expect(screen.getByText('2. Previous Medical History & Chronic Diseases')).toBeInTheDocument();
      expect(screen.getByText('3. Family Medical History')).toBeInTheDocument();
      expect(screen.getByText('4. Reproductive & Obstetric History')).toBeInTheDocument();
      expect(screen.getByText('5. Lifestyle History & Habits')).toBeInTheDocument();
      expect(screen.getByText(/6. Medical Documents & Reports/i)).toBeInTheDocument();
    });

    // Verify Personal Information section contains Occupation and Age
    expect(screen.getAllByText('Senior Lecturer').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('O+').length).toBeGreaterThanOrEqual(1);

    // Verify Vitals & Biometrics with auto-calculated BMI score
    expect(screen.getByText(/22\.[89]/)).toBeInTheDocument();
    expect(screen.getAllByText(/Healthy/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('118/76')).toBeInTheDocument();
    expect(screen.getByText('Intermittent tension headaches')).toBeInTheDocument();

    // Verify Previous Medical History details
    expect(screen.getByText('Thyroid Disorder')).toBeInTheDocument();
    expect(screen.getByText('Hypothyroidism')).toBeInTheDocument();
    expect(screen.getByText('Levothyroxine 50mcg daily')).toBeInTheDocument();
    expect(screen.getByText('Cesarean Section (LSCS)')).toBeInTheDocument();
    expect(screen.getByText('Penicillin (mild urticaria)')).toBeInTheDocument();

    // Verify Family Medical History table
    expect(screen.getByText('Type 2 Diabetes Mellitus')).toBeInTheDocument();
    expect(screen.getByText('Myocardial Infarction')).toBeInTheDocument();
    expect(screen.getByText('Heart Failure at age 74')).toBeInTheDocument();

    // Verify Reproductive History
    expect(screen.getByText('Menarche Age')).toBeInTheDocument();
    expect(screen.getByText('Menstrual Status')).toBeInTheDocument();
    expect(screen.getByText(/G: 1 · P: 1 · L: 1/i)).toBeInTheDocument();

    // Verify Lifestyle History
    expect(screen.getAllByText('Vegetarian').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Active').length).toBeGreaterThanOrEqual(1);

    // Verify Medical Documents
    expect(screen.getByText('Thyroid Function Test (TSH, FT3, FT4)')).toBeInTheDocument();
    expect(screen.getByText('Thyroid Ultrasound Scan')).toBeInTheDocument();
  }, 15000);

  it('allows opening Record Medical History modal to record or edit intake', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Meenakshi Sundaram' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /medical history/i }));

    await waitFor(() => {
      expect(screen.getByText('Record New History')).toBeInTheDocument();
    });

    // Click Record New History button
    fireEvent.click(screen.getByText('Record New History'));

    // Drawer opens
    await waitFor(() => {
      expect(screen.getByText('Record Complete Medical History')).toBeInTheDocument();
      expect(screen.getByText('1. Current Examination & Vitals')).toBeInTheDocument();
      expect(screen.getByText('2. Previous Medical History')).toBeInTheDocument();
      expect(screen.getAllByText('3. Family Medical History').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('4. Reproductive & Obstetric')).toBeInTheDocument();
      expect(screen.getByText('5. Lifestyle History')).toBeInTheDocument();
    });

    // Test BMI auto-calculation in drawer
    const heightInput = screen.getByPlaceholderText('e.g. 170');
    const weightInput = screen.getByPlaceholderText('e.g. 70');

    fireEvent.change(heightInput, { target: { value: '180' } });
    fireEvent.change(weightInput, { target: { value: '75' } });

    // 75 / (1.8^2) = 23.1
    await waitFor(() => {
      expect(screen.getByText('23.1')).toBeInTheDocument();
      expect(screen.getAllByText('Healthy / Normal').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('supports Step-by-Step Save & Next navigation inside the Create Drawer', async () => {
    vi.mocked(api.post).mockImplementation((url: string) => {
      if (url.includes('medical-histories')) {
        return Promise.resolve({
          data: {
            ...mockHistoryRecords[0],
            id: 'hist-new-created',
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Meenakshi Sundaram' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /medical history/i }));

    await waitFor(() => {
      expect(screen.getByText('Record New History')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Record New History'));

    // Verify Drawer opens on Step 1
    await waitFor(() => {
      expect(screen.getByText('Record Complete Medical History')).toBeInTheDocument();
      expect(screen.getByText('Presenting Complaints & Symptoms')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /save & next/i })).toBeInTheDocument();
    });

    // Fill Chief Complaint
    const complaintInput = screen.getByPlaceholderText(/intermittent tension headaches/i);
    fireEvent.change(complaintInput, { target: { value: 'Severe migraine with aura' } });

    // Click Save & Next
    const saveAndNextBtn = screen.getByTestId('save-and-next-btn');
    fireEvent.click(saveAndNextBtn);

    // Should transition to Step 2 (Previous Medical History)
    await waitFor(() => {
      expect(screen.getByText('Common Chronic Diseases')).toBeInTheDocument();
      expect(screen.getByTestId('prev-step-btn')).toBeInTheDocument();
    });

    // Click Previous to verify back navigation
    fireEvent.click(screen.getByTestId('prev-step-btn'));

    await waitFor(() => {
      expect(screen.getByText('Presenting Complaints & Symptoms')).toBeInTheDocument();
    });
  }, 20000);

  it('allows opening Upload Medical Document modal', async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Meenakshi Sundaram' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /medical history/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /upload (report|document)/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /upload (report|document)/i }));

    await waitFor(() => {
      expect(screen.getByText('Upload Medical Document & Report')).toBeInTheDocument();
      expect(screen.getByText('Document Category')).toBeInTheDocument();
      expect(screen.getByText('Document Title / Test Name')).toBeInTheDocument();
    });
  });

  it('populates all form fields with existing data when clicking Edit This Record', async () => {
    vi.mocked(api.put).mockImplementation((url: string) => {
      if (url.includes('medical-histories')) {
        return Promise.resolve({
          data: {
            ...mockHistoryRecords[0],
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: 'Meenakshi Sundaram' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /medical history/i }));

    await waitFor(() => {
      expect(screen.getByText('Edit This Record')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Edit This Record'));

    // Drawer should open and fields should be populated from mockHistoryRecords[0]
    await waitFor(() => {
      expect(screen.getByText('Edit Patient Medical History')).toBeInTheDocument();
    });

    // Check Current Medical Info fields populated from mockHistoryRecords[0]
    const complaintInput = screen.getByPlaceholderText(/intermittent tension headaches/i) as HTMLInputElement;
    expect(complaintInput.value).toBe('Intermittent tension headaches');

    const symptomsInput = screen.getByPlaceholderText(/describe symptoms/i) as HTMLTextAreaElement;
    expect(symptomsInput.value).toBe('Bilateral throbbing headache on stressful days');

    const durationInput = screen.getByPlaceholderText(/e\.g\. 3 weeks/i) as HTMLInputElement;
    expect(durationInput.value).toBe('3 weeks');

    const bpInput = screen.getByPlaceholderText('e.g. 120/80') as HTMLInputElement;
    expect(bpInput.value).toBe('118/76');

    const heightInput = screen.getByPlaceholderText('e.g. 170') as HTMLInputElement;
    expect(heightInput.value).toBe('162');

    const weightInput = screen.getByPlaceholderText('e.g. 70') as HTMLInputElement;
    expect(weightInput.value).toBe('60');

    // BMI auto-calculated and visible: 60 / (1.62^2) = 22.9
    expect(screen.getAllByText('22.9').length).toBeGreaterThanOrEqual(1);

    // Check Previous Medical History step
    fireEvent.click(screen.getByRole('button', { name: /save & next/i }));

    await waitFor(() => {
      expect(screen.getByText('Common Chronic Diseases')).toBeInTheDocument();
    });

    // Previous diseases list should contain Hypothyroidism from initialData
    expect(screen.getByDisplayValue('Hypothyroidism')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Levothyroxine 50mcg daily')).toBeInTheDocument();

    // Surgery should contain Cesarean Section
    expect(screen.getByDisplayValue('Cesarean Section (LSCS)')).toBeInTheDocument();

    // Check Lifestyle History step auto-population
    const lifestyleStepBtn = screen.getByRole('button', { name: /lifestyle/i });
    fireEvent.click(lifestyleStepBtn);

    await waitFor(() => {
      expect(screen.getByText(/Smoking & Tobacco Usage/i)).toBeInTheDocument();
    });

    // Lifestyle fields should be auto-populated from mockHistoryRecords[0].lifestyle_history
    expect(screen.getByDisplayValue('7-8 hours normal sleep')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Normal office / teaching environment')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Yoga thrice a week')).toBeInTheDocument();
  }, 25000);
});
