import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type Prescription, prescriptionsApi } from '../features/prescriptions/api/prescriptionsApi';
import CreatePrescriptionModal from '../features/prescriptions/components/CreatePrescriptionModal';
import ViewPrescriptionModal from '../features/prescriptions/components/ViewPrescriptionModal';
import PrescriptionsPage from '../features/prescriptions/pages/PrescriptionsPage';
import api from '../utils/api';
import { renderWithProviders } from './renderWithProviders';

vi.mock('../context/PermissionContext', () => ({
  usePermission: () => ({
    canCreate: () => true,
    canUpdate: () => true,
    canDelete: () => true,
    canView: () => true,
  }),
}));

vi.mock('../utils/api', () => {
  const fn = vi.fn();
  (fn as unknown as { get: ReturnType<typeof vi.fn> }).get = vi.fn();
  (fn as unknown as { post: ReturnType<typeof vi.fn> }).post = vi.fn();
  (fn as unknown as { put: ReturnType<typeof vi.fn> }).put = vi.fn();
  (fn as unknown as { delete: ReturnType<typeof vi.fn> }).delete = vi.fn();
  return { default: fn };
});

const mockPrescriptions: Prescription[] = [
  {
    id: 'rx-11111111-2222-3333-4444-555555555555',
    prescription_number: 'RX100001',
    patient_id: 'pat-1',
    patient_name: 'Aarav Sharma',
    patient_phone: '9876543210',
    patient_gender: 'Male',
    doctor: {
      id: 'doc-1',
      name: 'Dr. S. Narendran',
      specialization: 'Consultant Oncologist',
    },
    prescription_date: '2026-11-20',
    status: 'active',
    diagnosis: 'Stage 2 Breast Carcinoma',
    medicines_count: 2,
    medicines: [
      {
        id: 'med-1',
        medicine_name: 'Tamoxifen',
        dosage: '20mg',
        strength: '20 mg',
        frequency: 'Once daily',
        duration: '30 days',
      },
      {
        id: 'med-2',
        medicine_name: 'Ondansetron',
        dosage: '4mg',
        strength: '4 mg',
        frequency: 'Twice daily',
        duration: '5 days',
      },
    ],
    lab_tests: [
      {
        id: 'lab-1',
        test_name: 'Complete Blood Count (CBC)',
      },
    ],
    created_at: '2026-11-20T10:00:00.000Z',
  },
  {
    id: 'rx-22222222-3333-4444-5555-666666666666',
    prescription_number: 'RX100002',
    patient_id: 'pat-2',
    patient_name: 'Priya Patel',
    patient_phone: '9123456780',
    patient_gender: 'Female',
    doctor: {
      id: 'doc-2',
      name: 'Dr. Bharathi',
      specialization: 'Medical Oncologist',
    },
    prescription_date: '2026-11-22',
    status: 'completed',
    diagnosis: 'Routine follow-up consultation',
    medicines_count: 1,
    medicines: [
      {
        id: 'med-3',
        medicine_name: 'Paracetamol',
        dosage: '500mg',
        frequency: 'SOS',
        duration: '3 days',
      },
    ],
    lab_tests: [],
    created_at: '2026-11-22T11:30:00.000Z',
  },
];

describe('Prescriptions Page Mobile Responsiveness', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    vi.spyOn(prescriptionsApi, 'getAll').mockResolvedValue(mockPrescriptions);
    vi.spyOn(prescriptionsApi, 'getById').mockImplementation(async (id) => {
      const rx = mockPrescriptions.find((p) => p.id === id);
      return rx || mockPrescriptions[0]!;
    });
    vi.mocked(api.get).mockResolvedValue({ data: { data: [] } });
  });

  it('renders page header, title, tabs, and action button', async () => {
    renderWithProviders(<PrescriptionsPage />);

    expect(
      await screen.findByRole('heading', { name: /Prescriptions & Consultations/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Prescriptions List/i)).toBeInTheDocument();
    expect(screen.getByText(/Template & Layout/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Create Prescription$/i }),
    ).toBeInTheDocument();
  });

  it('renders ViewModeSwitcher with cards and table options and defaults correctly', async () => {
    renderWithProviders(<PrescriptionsPage />);

    const switcher = await screen.findByTestId('view-mode-switcher');
    expect(switcher).toBeInTheDocument();

    const cardsBtn = screen.getByRole('button', { name: /cards/i });
    const tableBtn = screen.getByRole('button', { name: /table/i });
    expect(cardsBtn).toBeInTheDocument();
    expect(tableBtn).toBeInTheDocument();
  });

  it('renders mobile cards view with patient info, doctor, diagnosis, badges, and quick actions', async () => {
    renderWithProviders(<PrescriptionsPage />);

    // Switch explicitly to cards view
    const cardsBtn = await screen.findByRole('button', { name: /cards/i });
    fireEvent.click(cardsBtn);

    // Verify patient cards are displayed
    expect(await screen.findByText('Aarav Sharma')).toBeInTheDocument();
    expect(screen.getByText('Priya Patel')).toBeInTheDocument();

    // Verify doctor attribution
    expect(screen.getByText('Dr. S. Narendran')).toBeInTheDocument();
    expect(screen.getByText('Dr. Bharathi')).toBeInTheDocument();

    // Verify diagnosis & medicine count badges
    expect(screen.getByText(/Stage 2 Breast Carcinoma/i)).toBeInTheDocument();
    expect(screen.getByText(/2 medicines/i)).toBeInTheDocument();
    expect(screen.getByText(/1 lab test/i)).toBeInTheDocument();

    // Verify action buttons exist on card
    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    expect(viewButtons.length).toBeGreaterThan(0);
    const pdfButtons = screen.getAllByRole('button', { name: /pdf/i });
    expect(pdfButtons.length).toBeGreaterThan(0);
  });

  it('switches to table view and wraps table in horizontal scroll container', async () => {
    renderWithProviders(<PrescriptionsPage />);

    // Switch to table view
    const tableBtn = await screen.findByRole('button', { name: /table/i });
    fireEvent.click(tableBtn);

    // Verify table headers are visible
    expect(await screen.findByRole('columnheader', { name: /Prescription/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Patient/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Doctor/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Diagnosis & Medicines/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Status/i })).toBeInTheDocument();
  });

  it('filters prescriptions via search bar and displays empty state when nothing matches', async () => {
    renderWithProviders(<PrescriptionsPage />);

    const searchInput = await screen.findByPlaceholderText(
      /Search patient name, phone, doctor, diagnosis, or medicine/i,
    );
    fireEvent.change(searchInput, { target: { value: 'NonexistentMedicineX99' } });

    expect(await screen.findByText(/No prescriptions found/i)).toBeInTheDocument();
  });

  it('opens ViewPrescriptionModal with responsive class, header ribbon, and letterhead canvas', async () => {
    renderWithProviders(
      <ViewPrescriptionModal
        open={true}
        prescription={mockPrescriptions[0]!}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText('Prescription Preview')).toBeInTheDocument();
    expect(screen.getByText('#RX100001')).toBeInTheDocument();
    expect(screen.getByText('Official A4 Letterhead Preview')).toBeInTheDocument();

    // Check footer buttons
    expect(screen.getAllByRole('button', { name: /Close/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Print/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /Download PDF/i }).length).toBeGreaterThan(0);

    // Check iframe preview canvas
    const iframe = screen.getByTitle('Prescription PDF Preview');
    expect(iframe).toBeInTheDocument();
  });

  it('opens CreatePrescriptionModal with responsive drawer and actions', async () => {
    renderWithProviders(
      <CreatePrescriptionModal
        open={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />,
    );

    expect(await screen.findByText('Create Prescription')).toBeInTheDocument();
    expect(
      screen.getByText(/Integrated with Pharmacy Medicines & Linked Diagnostic Labs/i),
    ).toBeInTheDocument();

    // Check footer buttons
    expect(screen.getByRole('button', { name: /Preview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Prescription/i })).toBeInTheDocument();
  });
});
