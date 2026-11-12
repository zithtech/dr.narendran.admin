import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PermissionProvider } from '../context/PermissionContext';
import CreatePrescriptionModal from '../features/prescriptions/components/CreatePrescriptionModal';
import api from '../utils/api';
import { renderWithProviders } from './renderWithProviders';

vi.mock('../utils/api', () => {
  const fn = vi.fn();
  (fn as unknown as { get: ReturnType<typeof vi.fn> }).get = vi.fn();
  (fn as unknown as { post: ReturnType<typeof vi.fn> }).post = vi.fn();
  (fn as unknown as { put: ReturnType<typeof vi.fn> }).put = vi.fn();
  (fn as unknown as { delete: ReturnType<typeof vi.fn> }).delete = vi.fn();
  return { default: fn };
});

function setupApiMocks(options?: { allowPrescriptionCreate?: boolean; allowPharmacyCreate?: boolean }) {
  const allowRxCreate = options?.allowPrescriptionCreate ?? true;
  const allowPharmacyCreate = options?.allowPharmacyCreate ?? false;

  vi.mocked(api.get).mockImplementation(async (url: string) => {
    if (url.includes('rbac/roles/')) {
      return {
        data: {
          name: 'DOCTOR',
          is_system_role: false,
          permissions: [
            {
              module_slug: 'PRESCRIPTIONS',
              can_read: true,
              can_create: allowRxCreate,
              can_update: allowRxCreate,
              can_delete: false,
              can_manage: false,
            },
            {
              module_slug: 'PHARMACY',
              can_read: true,
              can_create: allowPharmacyCreate,
              can_update: false,
              can_delete: false,
              can_manage: false,
            },
          ],
        },
      };
    }
    if (url === '/medicines' || url === 'medicines') {
      return { data: { medicines: [] } };
    }
    if (url === 'patients') {
      return { data: [] };
    }
    if (url === 'doctors') {
      return { data: [] };
    }
    if (url === 'labs' || url === 'lab-services' || url === 'medicines/packages/all') {
      return { data: [] };
    }
    return { data: [] };
  });
}

describe('Prescription & Pharmacy Add Medicine Drawer Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('adminRole', 'DOCTOR');
  });

  it('opens the Pharmacy Add Medicine drawer directly from Prescription Add Medicine button and links newly created medicine', async () => {
    setupApiMocks({ allowPrescriptionCreate: true, allowPharmacyCreate: false });

    const createdMedicine = {
      id: 'med-pharm-101',
      medicine_name: 'Azithral 500',
      generic_name: 'Azithromycin',
      dosage_form: 'Tablet',
      strength: '500',
      strength_unit: 'mg',
      therapeutic_category: 'Antibiotics',
      sub_category: '',
      manufacturer: 'Alembic',
      prescription_required: true,
      status: 'Active',
      frequency: '1-0-0',
      duration: '3 Days',
      description: 'Take once daily',
      mrp: 120,
      final_price: 120,
    };

    vi.mocked(api.post).mockResolvedValueOnce({ data: createdMedicine });

    renderWithProviders(
      <PermissionProvider>
        <CreatePrescriptionModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} />
      </PermissionProvider>,
    );

    const addMedicineBtn = await screen.findByRole('button', { name: /Add Medicine/i });
    fireEvent.click(addMedicineBtn);

    expect(await screen.findByText('Create New Medicine')).toBeInTheDocument();
    expect(
      screen.getByText(/Add a new medicine record to the clinical database/i),
    ).toBeInTheDocument();

    const medNameInput = screen.getByLabelText(/Medicine Name/i);
    medNameInput.focus();
    fireEvent.focusIn(medNameInput);
    expect(document.activeElement).toBe(medNameInput);

    fireEvent.change(medNameInput, { target: { value: 'Azithral 500' } });

    const submitBtn = screen.getByRole('button', { name: /Create Medicine/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        'medicines',
        expect.objectContaining({
          medicineName: 'Azithral 500',
          status: 'Active',
        }),
      );
    });

    await waitFor(() => {
      expect(screen.queryByText('Create New Medicine')).not.toBeInTheDocument();
    });

    expect(await screen.findByText('Pharmacy Linked')).toBeInTheDocument();
    expect(screen.getByText(/Azithromycin/i)).toBeInTheDocument();
    expect(screen.getByText(/Alembic/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('Azithral 500')).toBeInTheDocument();
  });

  it('adds another row via Add Row without opening the Pharmacy drawer', async () => {
    setupApiMocks({ allowPrescriptionCreate: true, allowPharmacyCreate: true });

    renderWithProviders(
      <PermissionProvider>
        <CreatePrescriptionModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} />
      </PermissionProvider>,
    );

    const addRowBtn = await screen.findByRole('button', { name: /Add Row/i });
    expect(screen.getByText(/Prescribed Medicines \(1\)/i)).toBeInTheDocument();

    fireEvent.click(addRowBtn);

    expect(await screen.findByText(/Prescribed Medicines \(2\)/i)).toBeInTheDocument();
    expect(screen.queryByText('Create New Medicine')).not.toBeInTheDocument();
  });

  it('hides Add Medicine button when user has neither PHARMACY nor PRESCRIPTIONS create permission', async () => {
    setupApiMocks({ allowPrescriptionCreate: false, allowPharmacyCreate: false });

    renderWithProviders(
      <PermissionProvider>
        <CreatePrescriptionModal open={true} onClose={vi.fn()} onSuccess={vi.fn()} />
      </PermissionProvider>,
    );

    await screen.findByRole('button', { name: /Add Row/i });
    expect(screen.queryByRole('button', { name: /Add Medicine/i })).not.toBeInTheDocument();
  });
});

