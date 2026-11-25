import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CreateEditPackageModal from '../components/CreateEditPackageModal';
import ViewPackageModal from '../components/ViewPackageModal';
import MedicinePackages from '../pages/MedicinePackages';
import type { Medicine, MedicinePackage } from '../types/pharmacy';
import api from '../utils/api';
import { renderWithProviders } from './renderWithProviders';

vi.mock('../utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const mockMed1: Medicine = {
  id: 'med-1',
  medicine_name: 'Amoxicillin Trihydrate',
  generic_name: 'Amoxicillin',
  medicine_code: 'MED-AMOX-500',
  manufacturer: 'Cipla Ltd',
  therapeutic_category: 'Antibiotics',
  sub_category: 'Penicillins',
  dosage_form: 'Capsule',
  strength: '500',
  strength_unit: 'mg',
  mrp: 120.0,
  final_price: 95.0,
  discount_type: null,
  discount_value: null,
  barcode: null,
  frequency: null,
  duration: null,
  description: null,
  prescription_required: true,
  status: 'Active',
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-01T10:00:00.000Z',
};

const mockMed2: Medicine = {
  id: 'med-2',
  medicine_name: 'Paracetamol',
  generic_name: 'Acetaminophen',
  medicine_code: 'MED-PARA-650',
  manufacturer: 'GSK Pharma',
  therapeutic_category: 'Analgesics',
  sub_category: null,
  dosage_form: 'Tablet',
  strength: '650',
  strength_unit: 'mg',
  mrp: 35.0,
  final_price: 30.0,
  discount_type: null,
  discount_value: null,
  barcode: null,
  frequency: null,
  duration: null,
  description: null,
  prescription_required: false,
  status: 'Active',
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-01T10:00:00.000Z',
};

const mockMedicines: Medicine[] = [mockMed1, mockMed2];

const testPackage1: MedicinePackage = {
  id: 'pkg-12345678-abcd',
  name: 'Post-Op Antibiotic & Pain Pack',
  description: 'Standard surgical recovery regimen with broad spectrum antibiotic and analgesics',
  doctor_id: 'doc-1',
  doctor_name: 'Dr. Ramesh Kumar',
  medicines: [mockMed1, mockMed2],
  created_at: '2026-11-10T08:00:00.000Z',
  updated_at: '2026-11-12T14:30:00.000Z',
};

const testPackage2: MedicinePackage = {
  id: 'pkg-87654321-efgh',
  name: 'General Fever Relief Set',
  description: 'Clinic-wide OTC fever and pain relief set',
  doctor_id: null,
  doctor_name: null,
  medicines: [mockMed2],
  created_at: '2026-11-15T09:00:00.000Z',
  updated_at: '2026-11-15T09:00:00.000Z',
};

const mockPackages: MedicinePackage[] = [testPackage1, testPackage2];

describe('Medicine Packages Page – Mobile Responsiveness', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url.includes('packages/all')) {
        return Promise.resolve({ data: mockPackages });
      }
      if (url === 'medicines') {
        return Promise.resolve({ data: { medicines: mockMedicines } });
      }
      return Promise.resolve({ data: [] });
    });
  });

  it('1. Renders Medicine Packages page title, description, and action controls', async () => {
    renderWithProviders(<MedicinePackages />);

    expect(screen.getByRole('heading', { name: /Medicine Packages/i })).toBeInTheDocument();
    expect(
      screen.getByText(/Group pharmacy medicines into reusable packages for fast prescribing/i),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Search package, description, doctor, or medicine/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Package/i })).toBeInTheDocument();
  });

  it('2. Renders mobile card layout with full package metadata, ID, doctor, and pricing', async () => {
    renderWithProviders(<MedicinePackages />);

    await waitFor(() => {
      expect(screen.getAllByText('Post-Op Antibiotic & Pain Pack').length).toBeGreaterThan(0);
    });

    // Check Package ID badges
    expect(screen.getAllByText('#PKG-1234').length).toBeGreaterThan(0);

    // Check doctor attribution vs Clinic-wide
    expect(screen.getAllByText(/Dr\. Ramesh Kumar/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Clinic-wide/i).length).toBeGreaterThan(0);

    // Check policy badges
    expect(screen.getAllByText(/Contains Rx/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/OTC Only/i).length).toBeGreaterThan(0);

    // Check included medicines count
    expect(screen.getAllByText(/2 medicines/i).length).toBeGreaterThan(0);

    // Check estimated value formatted
    expect(screen.getAllByText(/₹125\.00/i).length).toBeGreaterThan(0);
  });

  it('3. Renders mobile view mode switcher and enables toggling between cards and table', async () => {
    renderWithProviders(<MedicinePackages />);

    await waitFor(() => {
      expect(screen.getByTestId('data-view-mobile-switcher')).toBeInTheDocument();
    });

    const switcher = screen.getByTestId('data-view-mobile-switcher');
    const cardsBtn = screen.getByRole('button', { name: /Cards/i });
    const tableBtn = screen.getByRole('button', { name: /Table/i });

    expect(switcher).toContainElement(cardsBtn);
    expect(switcher).toContainElement(tableBtn);

    // Default is cards view
    expect(cardsBtn).toHaveAttribute('aria-pressed', 'true');
    expect(tableBtn).toHaveAttribute('aria-pressed', 'false');

    // Toggle to table view
    fireEvent.click(tableBtn);
    expect(tableBtn).toHaveAttribute('aria-pressed', 'true');
    expect(cardsBtn).toHaveAttribute('aria-pressed', 'false');

    // Toggle back to cards view
    fireEvent.click(cardsBtn);
    expect(cardsBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('4. Provides mobile action buttons (View, Edit, Delete) on mobile cards', async () => {
    renderWithProviders(<MedicinePackages />);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /View/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: /Edit/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: /Delete package/i }).length).toBeGreaterThan(0);
    });
  });

  it('5. ViewPackageModal opens with responsive drawer styling, highlights, and medicine details', async () => {
    const handleClose = vi.fn();
    const handleEdit = vi.fn();

    renderWithProviders(
      <ViewPackageModal
        pkg={testPackage1}
        open={true}
        onClose={handleClose}
        onEdit={handleEdit}
      />,
    );

    // Package Name & Header details
    expect(screen.getByText('Post-Op Antibiotic & Pain Pack')).toBeInTheDocument();
    expect(screen.getByText(/#PKG-1234/i)).toBeInTheDocument();
    expect(screen.getByText(/Dr\. Ramesh Kumar/i)).toBeInTheDocument();

    // Quick Highlights
    expect(screen.getByText(/Total Medicines/i)).toBeInTheDocument();
    expect(screen.getByText(/Package Final Value/i)).toBeInTheDocument();
    expect(screen.getByText(/Total MRP/i)).toBeInTheDocument();

    // Included medicines preview
    expect(screen.getAllByText('Amoxicillin Trihydrate').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Paracetamol').length).toBeGreaterThan(0);

    // Footer actions
    const editBtn = screen.getByRole('button', { name: /Edit Package/i });
    expect(editBtn).toBeInTheDocument();
    fireEvent.click(editBtn);
    expect(handleEdit).toHaveBeenCalledWith(testPackage1);
    expect(handleClose).toHaveBeenCalled();
  });

  it('6. CreateEditPackageModal renders with responsive drawer layout, selection bar, and catalog', async () => {
    const handleClose = vi.fn();
    const handleSuccess = vi.fn();

    renderWithProviders(
      <CreateEditPackageModal
        open={true}
        onClose={handleClose}
        onSuccess={handleSuccess}
        editingPackage={testPackage1}
      />,
    );

    // Header & Info
    expect(screen.getByText('Edit Medicine Package')).toBeInTheDocument();
    expect(screen.getByLabelText(/Package Name/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Post-Op Antibiotic & Pain Pack')).toBeInTheDocument();

    // Selected review bar
    await waitFor(() => {
      expect(screen.getByText(/Selected Medicines \(2\)/i)).toBeInTheDocument();
    });

    // Clear all selected button
    expect(screen.getByRole('button', { name: /Clear all selected/i })).toBeInTheDocument();

    // Pharmacy medicines list
    expect(screen.getByText(/Select Medicines from Pharmacy/i)).toBeInTheDocument();

    // Footer actions
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
  });
});
