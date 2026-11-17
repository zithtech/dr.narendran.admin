import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MedicineInventoryDrawer from '../components/MedicineInventoryDrawer';
import MedicineModal from '../components/MedicineModal';
import MedicineStrengthModal from '../components/MedicineStrengthModal';
import { PermissionProvider } from '../context/PermissionContext';
import MedicineInventory from '../pages/MedicineInventory';
import Pharmacy from '../pages/Pharmacy';
import type { MedicineStrength } from '../types/inventory';
import type { Medicine } from '../types/pharmacy';
import api from '../utils/api';
import { renderWithProviders } from './renderWithProviders';

vi.mock('../utils/api', () => {
  const fn = vi.fn();
  (fn as any).get = vi.fn();
  (fn as any).post = vi.fn();
  (fn as any).put = vi.fn();
  (fn as any).delete = vi.fn();
  return { default: fn };
});

const mockMedicine = {
  id: 'med-001',
  medicine_name: 'Augmentin 625 Duo',
  generic_name: 'Amoxicillin + Clavulanic Acid',
  dosage_form: 'Tablet',
  strength: '625',
  strength_unit: 'mg',
  therapeutic_category: 'Antibiotics & Antivirals',
  sub_category: 'Penicillins',
  manufacturer: 'GSK',
  prescription_required: true,
  status: 'Active',
  medicine_code: 'AUG-625',
  barcode: '8901234567890',
  mrp: 200,
  discount_type: 'Percentage',
  discount_value: 10,
  final_price: 180,
  frequency: '1-0-1',
  duration: '5 days',
  description: 'Take after meals',
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-02T10:00:00.000Z',
} as Medicine;

const mockVariant = {
  id: 'var-001',
  medicine_id: 'med-001',
  medicine_name: 'Augmentin 625 Duo',
  strength: '625',
  strength_unit: 'mg',
  dosage_form: 'Tablet',
  tablets_per_strip: 10,
  mrp: 200,
  discount_type: 'PERCENTAGE',
  discount_value: 10,
  purchase_price: 150,
  reorder_level: 20,
  variant_code: 'VAR-AUG-625',
  barcode: '8901234567890',
  status: 'ACTIVE',
  notes: 'Store in cool place',
  strip_count: 5,
  total_tablets: 50,
  available_quantity: 50,
  final_price: 180,
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-02T10:00:00.000Z',
} as MedicineStrength;

describe('Medicine Drawer (Pharmacy & Inventory UI Enhancements)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MedicineModal (Pharmacy Add/Edit Drawer)', () => {
    it('renders create drawer with clean section cards, SearchableSelects, and status cards', () => {
      renderWithProviders(
        <MedicineModal isOpen={true} onClose={vi.fn()} medicine={null} onSave={vi.fn()} />,
      );

      expect(screen.getByText('Create New Medicine')).toBeInTheDocument();
      expect(
        screen.getByText(/Add a new medicine record to the clinical database/i),
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/Medicine Name/i)).toBeInTheDocument();
      expect(screen.getByText(/Research Medicine with AI/i)).toBeInTheDocument();
      expect(screen.getByText(/Basic Information/i)).toBeInTheDocument();
      expect(screen.getByText(/Formulation & Dosage/i)).toBeInTheDocument();
      expect(screen.getByText(/Classification & Manufacturer/i)).toBeInTheDocument();
      expect(screen.getByText(/Initial Variant Formulation & Pricing/i)).toBeInTheDocument();
      expect(screen.getByText(/Prescription Instructions & Status/i)).toBeInTheDocument();
      expect(screen.getByText('Active in Catalog')).toBeInTheDocument();
      expect(screen.getByText('Inactive / Suspended')).toBeInTheDocument();
    });

    it('renders edit drawer with populated medicine data and saves changes', async () => {
      vi.mocked(api.put).mockResolvedValue({ data: { success: true } });
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      renderWithProviders(
        <MedicineModal
          isOpen={true}
          onClose={handleClose}
          medicine={mockMedicine}
          onSave={handleSave}
        />,
      );

      expect(screen.getByText('Edit Medicine')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Augmentin 625 Duo')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Amoxicillin + Clavulanic Acid')).toBeInTheDocument();
      expect(screen.getByDisplayValue('GSK')).toBeInTheDocument();

      const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith(
          'medicines/med-001',
          expect.objectContaining({
            medicineName: 'Augmentin 625 Duo',
            genericName: 'Amoxicillin + Clavulanic Acid',
            prescriptionRequired: true,
            status: 'Active',
          }),
        );
        expect(handleSave).toHaveBeenCalledTimes(1);
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });

    it('submits a newly created medicine with valid values', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { id: 'new-med', success: true } });
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      renderWithProviders(
        <MedicineModal isOpen={true} onClose={handleClose} medicine={null} onSave={handleSave} />,
      );

      const nameInput = screen.getByLabelText(/Medicine Name/i);
      fireEvent.change(nameInput, { target: { value: 'Paracetamol 500mg' } });

      const submitBtn = screen.getByRole('button', { name: /Create Medicine/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          'medicines',
          expect.objectContaining({
            medicineName: 'Paracetamol 500mg',
            status: 'Active',
          }),
        );
        expect(handleSave).toHaveBeenCalledTimes(1);
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('MedicineStrengthModal (Medicine Inventory Variant Drawer)', () => {
    it('renders variant creation drawer with Master Medicine SearchableSelect when no medicine preselected', () => {
      renderWithProviders(
        <MedicineStrengthModal
          isOpen={true}
          onClose={vi.fn()}
          medicinesList={[mockMedicine]}
          onSave={vi.fn()}
        />,
      );

      expect(screen.getByText('Add Strength & Packaging Variant')).toBeInTheDocument();
      expect(screen.getByText(/Parent Medicine & Formulation/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Strength & Packaging/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Pricing & Identifiers/i)).toBeInTheDocument();
      expect(screen.getByText(/Operational Status & Notes/i)).toBeInTheDocument();
      expect(screen.getByText('Active for Dispensing')).toBeInTheDocument();
    });

    it('renders edit variant drawer with context banner and saves changes', async () => {
      vi.mocked(api.put).mockResolvedValue({ data: { success: true } });
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      renderWithProviders(
        <MedicineStrengthModal
          isOpen={true}
          onClose={handleClose}
          variant={mockVariant}
          onSave={handleSave}
        />,
      );

      expect(screen.getByText('Edit Strength Variant')).toBeInTheDocument();
      expect(screen.getAllByText(/Augmentin 625 Duo/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByDisplayValue('625')).toBeInTheDocument();
      expect(screen.getAllByDisplayValue('10').length).toBeGreaterThanOrEqual(1);

      const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith(
          'medicine-strengths/var-001',
          expect.objectContaining({
            medicineId: 'med-001',
            strength: '625',
            status: 'ACTIVE',
          }),
        );
        expect(handleSave).toHaveBeenCalledTimes(1);
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Pharmacy Page Row Actions', () => {
    it('renders edit action icon in row actions and opens MedicineModal on click', async () => {
      localStorage.setItem('adminRole', 'ADMIN');
      vi.mocked(api.get).mockImplementation(async (url: string) => {
        if (url.includes('rbac/roles/')) {
          return {
            data: {
              name: 'ADMIN',
              is_system_role: true,
              permissions: [
                {
                  module_slug: 'PHARMACY',
                  can_read: true,
                  can_create: true,
                  can_update: true,
                  can_delete: true,
                  can_manage: true,
                },
              ],
            },
          };
        }
        return {
          data: {
            medicines: [mockMedicine],
            total: 1,
            page: 1,
            limit: 10,
          },
        };
      });

      renderWithProviders(
        <PermissionProvider>
          <Pharmacy />
        </PermissionProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Augmentin 625 Duo')).toBeInTheDocument();
      });

      const editBtn = await screen.findByRole('button', { name: /Edit Augmentin 625 Duo/i });
      expect(editBtn).toBeInTheDocument();

      fireEvent.click(editBtn);

      await waitFor(() => {
        expect(screen.getByText('Edit Medicine')).toBeInTheDocument();
      });
    });
  });

  describe('MedicineInventoryDrawer (Medicine Inventory View Details Drawer)', () => {
    it('renders inventory formulation details, stock cards, packaging breakdown, and action buttons', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: {
          items: [
            {
              id: 'txn-1',
              medicine_strength_id: 'var-001',
              transaction_type: 'STOCK_IN',
              quantity_change: 50,
              quantity_before: 0,
              quantity_after: 50,
              reason: 'Initial Batch PO-1234',
              performer_name: 'Dr. Admin',
              created_at: '2026-11-01T10:00:00.000Z',
            },
          ],
          total: 1,
        },
      });

      const handleClose = vi.fn();
      const handleStockIn = vi.fn();
      const handleStockOut = vi.fn();
      const handleAdjust = vi.fn();
      const handleHistory = vi.fn();
      const handleEdit = vi.fn();

      renderWithProviders(
        <MedicineInventoryDrawer
          variant={mockVariant}
          onClose={handleClose}
          onStockIn={handleStockIn}
          onStockOut={handleStockOut}
          onAdjust={handleAdjust}
          onHistory={handleHistory}
          onEdit={handleEdit}
        />,
      );

      expect(screen.getAllByText('Augmentin 625 Duo').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Medicine Inventory Record')).toBeInTheDocument();
      expect(screen.getByText('Physical Stock & Packaging Status')).toBeInTheDocument();
      expect(screen.getByText('Commercial Pricing & Financials')).toBeInTheDocument();
      expect(screen.getByText('System Identifiers & Barcode')).toBeInTheDocument();

      // Check stock values
      expect(screen.getAllByText('50 units').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Pack of 10 units')).toBeInTheDocument();
      expect(screen.getByText(/5 strips/)).toBeInTheDocument();

      // Check ledger preview item
      await waitFor(() => {
        expect(screen.getByText('Initial Batch PO-1234')).toBeInTheDocument();
        expect(screen.getByText('+50 units')).toBeInTheDocument();
      });

      // Click footer action buttons
      const stockInBtn = screen.getByRole('button', { name: /Stock In/i });
      fireEvent.click(stockInBtn);
      expect(handleStockIn).toHaveBeenCalledWith(mockVariant);

      const stockOutBtn = screen.getByRole('button', { name: /Stock Out/i });
      fireEvent.click(stockOutBtn);
      expect(handleStockOut).toHaveBeenCalledWith(mockVariant);

      const adjustBtn = screen.getByRole('button', { name: /Adjust/i });
      fireEvent.click(adjustBtn);
      expect(handleAdjust).toHaveBeenCalledWith(mockVariant);

      const ledgerBtn = screen.getByTitle('View full audit movement history');
      fireEvent.click(ledgerBtn);
      expect(handleHistory).toHaveBeenCalledWith(mockVariant);

      const editBtn = screen.getByRole('button', { name: /Edit Variant/i });
      fireEvent.click(editBtn);
      expect(handleEdit).toHaveBeenCalledWith(mockVariant);
    });
  });

  describe('MedicineInventory Page View Drawer Integration', () => {
    it('opens view drawer when clicking on the table row or view eye icon', async () => {
      localStorage.setItem('adminRole', 'ADMIN');
      vi.mocked(api.get).mockImplementation(async (url: string) => {
        if (url.includes('rbac/roles/')) {
          return {
            data: {
              name: 'ADMIN',
              is_system_role: true,
              permissions: [
                {
                  module_slug: 'INVENTORY',
                  can_read: true,
                  can_create: true,
                  can_update: true,
                  can_delete: true,
                  can_manage: true,
                },
              ],
            },
          };
        }
        if (url.includes('inventory/summary')) {
          return {
            data: {
              data: {
                total_active_variants: 1,
                in_stock_count: 1,
                low_stock_count: 0,
                out_of_stock_count: 0,
                total_valuation: 9000,
              },
            },
          };
        }
        if (url.includes('medicines')) {
          return { data: [mockMedicine] };
        }
        if (url.includes('inventory/var-001/history')) {
          return { data: { items: [], total: 0 } };
        }
        return {
          data: {
            items: [mockVariant],
            total: 1,
            page: 1,
            limit: 15,
            totalPages: 1,
          },
        };
      });

      renderWithProviders(
        <PermissionProvider>
          <MedicineInventory />
        </PermissionProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Augmentin 625 Duo')).toBeInTheDocument();
      });

      // View eye button should be present in actions
      const viewBtn = screen.getByRole('button', { name: /View Augmentin 625 Duo details/i });
      expect(viewBtn).toBeInTheDocument();

      fireEvent.click(viewBtn);

      // MedicineInventoryDrawer should be open
      await waitFor(() => {
        expect(screen.getByText('Medicine Inventory Record')).toBeInTheDocument();
        expect(screen.getByText('Physical Stock & Packaging Status')).toBeInTheDocument();
      });
    });
  });
});
