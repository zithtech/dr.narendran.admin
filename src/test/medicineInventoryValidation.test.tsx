import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  validatePurchasePrice,
  validateReorderLevel,
  validateStrengthVariantStrength,
  validateTabletsPerStrip,
} from '../components/MedicineStrengthModal';
import StockAdjustModal, {
  validateStockAdjustActualQuantity,
  validateStockAdjustReason,
} from '../components/StockAdjustModal';
import StockInModal, {
  validateStockInQuantity,
  validateStockInReferenceNumber,
  validateStockInUnitCost,
} from '../components/StockInModal';
import StockOutModal, {
  validateStockOutQuantity,
  validateStockOutReason,
  validateStockOutReferenceNumber,
} from '../components/StockOutModal';
import type { MedicineStrength } from '../types/inventory';
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

const mockVariant: MedicineStrength = {
  id: 'var-101',
  medicine_id: 'med-001',
  medicine_name: 'Paracetamol',
  strength: '500',
  strength_unit: 'mg',
  dosage_form: 'Tablet',
  strip_count: 5,
  tablets_per_strip: 10,
  total_tablets: 50,
  available_quantity: 50,
  reorder_level: 10,
  mrp: 30,
  purchase_price: 20,
  discount_type: null,
  discount_value: null,
  final_price: null,
  variant_code: 'VAR-101',
  barcode: null,
  status: 'ACTIVE',
  notes: null,
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-02T10:00:00.000Z',
};

describe('Medicine Inventory Validation Functions', () => {
  describe('Stock-In Validation', () => {
    it('validates stock-in quantity', () => {
      expect(validateStockInQuantity('')).toBe('Quantity received is required.');
      expect(validateStockInQuantity('0')).toBe('Quantity must be greater than zero.');
      expect(validateStockInQuantity('-5')).toBe('Quantity must contain only numbers.');
      expect(validateStockInQuantity('100')).toBeUndefined();
      expect(validateStockInQuantity('1000001')).toBe('Quantity cannot exceed 1,000,000.');
    });

    it('validates stock-in unit cost', () => {
      expect(validateStockInUnitCost('')).toBeUndefined();
      expect(validateStockInUnitCost('15.50')).toBeUndefined();
      expect(validateStockInUnitCost('-2')).toBe('Unit cost cannot be negative.');
      expect(validateStockInUnitCost('abc')).toBe('Unit cost must be a valid number.');
    });

    it('validates stock-in reference number', () => {
      expect(validateStockInReferenceNumber('')).toBeUndefined();
      expect(validateStockInReferenceNumber('INV-2026-9811/A')).toBeUndefined();
      expect(validateStockInReferenceNumber('INV @ 123')).toBe(
        'Reference number contains invalid characters.',
      );
    });
  });

  describe('Stock-Out Validation', () => {
    it('validates stock-out quantity against available stock', () => {
      expect(validateStockOutQuantity('', 50, false)).toBe('Quantity is required.');
      expect(validateStockOutQuantity('0', 50, false)).toBe('Quantity must be greater than zero.');
      expect(validateStockOutQuantity('60', 50, false)).toBe(
        'Cannot issue 60 units. Maximum stock on hand is 50 units.',
      );
      expect(validateStockOutQuantity('60', 50, true)).toBeUndefined(); // Patient return can exceed on-hand
      expect(validateStockOutQuantity('25', 50, false)).toBeUndefined();
    });

    it('validates stock-out audit reason when required', () => {
      expect(validateStockOutReason('', false)).toBeUndefined();
      expect(validateStockOutReason('', true)).toBe(
        'A specific reason is required for this operation.',
      );
      expect(validateStockOutReason('ab', true)).toBe('Reason must be at least 3 characters.');
      expect(validateStockOutReason('Broken during delivery', true)).toBeUndefined();
    });

    it('validates stock-out reference number', () => {
      expect(validateStockOutReferenceNumber('RX-2026-081')).toBeUndefined();
      expect(validateStockOutReferenceNumber('RX#001*')).toBe(
        'Reference number contains invalid characters.',
      );
    });
  });

  describe('Stock Adjust Validation', () => {
    it('validates actual counted quantity and detects zero variance', () => {
      expect(validateStockAdjustActualQuantity('', 50)).toBe('Actual counted stock is required.');
      expect(validateStockAdjustActualQuantity('-1', 50)).toBe(
        'Actual quantity must contain only numbers.',
      );
      expect(validateStockAdjustActualQuantity('50', 50)).toBe(
        'Actual counted quantity matches system balance. No adjustment needed.',
      );
      expect(validateStockAdjustActualQuantity('45', 50)).toBeUndefined();
      expect(validateStockAdjustActualQuantity('55', 50)).toBeUndefined();
    });

    it('validates adjustment reason', () => {
      expect(validateStockAdjustReason('')).toBe('A reason for stock adjustment is required.');
      expect(validateStockAdjustReason('ab')).toBe('Reason must be at least 3 characters.');
      expect(validateStockAdjustReason('Physical audit discrepancy')).toBeUndefined();
    });
  });

  describe('Medicine Strength Variant Packaging Validation', () => {
    it('validates strength and packaging fields', () => {
      expect(validateStrengthVariantStrength('')).toBe('Strength value is required.');
      expect(validateStrengthVariantStrength('500')).toBeUndefined();
      expect(validateStrengthVariantStrength('625/125')).toBeUndefined();

      expect(validateTabletsPerStrip('')).toBe('Tablets per strip is required.');
      expect(validateTabletsPerStrip('0')).toBe('Must be greater than 0.');
      expect(validateTabletsPerStrip('10')).toBeUndefined();

      expect(validateReorderLevel('')).toBe('Reorder threshold is required.');
      expect(validateReorderLevel('10')).toBeUndefined();

      expect(validatePurchasePrice('')).toBeUndefined();
      expect(validatePurchasePrice('25.50')).toBeUndefined();
      expect(validatePurchasePrice('-5')).toBe('Purchase cost cannot be negative.');
    });
  });
});

describe('Medicine Inventory Modals UI Sanitization & Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('StockInModal UI', () => {
    it('strips non-digits from quantity in real time', () => {
      renderWithProviders(
        <StockInModal isOpen={true} onClose={vi.fn()} variant={mockVariant} onSuccess={vi.fn()} />,
      );

      const qtyInput = screen.getByPlaceholderText('e.g. 100') as HTMLInputElement;
      fireEvent.change(qtyInput, { target: { value: '100abc!@#' } });

      expect(qtyInput.value).toBe('100');
    });

    it('displays inline error and blocks submit when quantity is missing', () => {
      renderWithProviders(
        <StockInModal isOpen={true} onClose={vi.fn()} variant={mockVariant} onSuccess={vi.fn()} />,
      );

      const submitBtn = screen.getByRole('button', { name: /Confirm Stock-In/i });
      fireEvent.click(submitBtn);

      expect(screen.getByText('Quantity received is required.')).toBeInTheDocument();
      expect(
        screen.getByText(/Please correct the highlighted fields before saving/i),
      ).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('submits successfully with valid quantity', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
      const handleSuccess = vi.fn();
      const handleClose = vi.fn();

      renderWithProviders(
        <StockInModal
          isOpen={true}
          onClose={handleClose}
          variant={mockVariant}
          onSuccess={handleSuccess}
        />,
      );

      const qtyInput = screen.getByPlaceholderText('e.g. 100');
      fireEvent.change(qtyInput, { target: { value: '50' } });

      const submitBtn = screen.getByRole('button', { name: /Confirm Stock-In/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          'inventory/var-101/stock-in',
          expect.objectContaining({
            quantity: 50,
          }),
        );
        expect(handleSuccess).toHaveBeenCalledTimes(1);
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('StockOutModal UI', () => {
    it('displays error and blocks submit when quantity exceeds available balance', () => {
      renderWithProviders(
        <StockOutModal
          isOpen={true}
          onClose={vi.fn()}
          variant={mockVariant}
          mode="DISPENSE"
          onSuccess={vi.fn()}
        />,
      );

      const qtyInput = screen.getByPlaceholderText('e.g. 10') as HTMLInputElement;
      fireEvent.change(qtyInput, { target: { value: '999' } });

      const submitBtn = screen.getByRole('button', { name: /Confirm Operation/i });
      fireEvent.click(submitBtn);

      expect(
        screen.getByText(/Cannot issue 999 units\. Maximum stock on hand is 50 units/i),
      ).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });
  });

  describe('StockAdjustModal UI', () => {
    it('displays error and blocks submit when count matches current balance', () => {
      renderWithProviders(
        <StockAdjustModal
          isOpen={true}
          onClose={vi.fn()}
          variant={mockVariant}
          onSuccess={vi.fn()}
        />,
      );

      // Default actualQuantity is 50 which equals available_quantity
      const submitBtn = screen.getByRole('button', { name: /Confirm Stock Adjustment/i });
      fireEvent.click(submitBtn);

      expect(
        screen.getByText(/Actual counted quantity matches system balance\. No adjustment needed/i),
      ).toBeInTheDocument();
      expect(api.post).not.toHaveBeenCalled();
    });

    it('submits adjustment when actual count differs from current balance', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
      const handleSuccess = vi.fn();
      const handleClose = vi.fn();

      renderWithProviders(
        <StockAdjustModal
          isOpen={true}
          onClose={handleClose}
          variant={mockVariant}
          onSuccess={handleSuccess}
        />,
      );

      const actualInput = screen.getByPlaceholderText('0');
      fireEvent.change(actualInput, { target: { value: '45' } });

      const submitBtn = screen.getByRole('button', { name: /Confirm Stock Adjustment/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          'inventory/var-101/adjust',
          expect.objectContaining({
            actual_quantity: 45,
          }),
        );
        expect(handleSuccess).toHaveBeenCalledTimes(1);
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });
  });
});
