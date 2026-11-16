import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MedicineModal, {
  validateBarcode,
  validateDiscountValue,
  validateDuration,
  validateFinalPrice,
  validateFrequency,
  validateGenericName,
  validateManufacturer,
  validateMedicineCode,
  validateMedicineName,
  validateMrp,
  validateStrength,
  validateSubCategory,
} from '../components/MedicineModal';
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

describe('Pharmacy Management Validation (MedicineModal)', () => {
  describe('validateMedicineName', () => {
    it('requires medicine name', () => {
      expect(validateMedicineName('')).toBe('Medicine name is required.');
      expect(validateMedicineName('   ')).toBe('Medicine name is required.');
    });

    it('enforces min 2 chars and max 150 chars', () => {
      expect(validateMedicineName('A')).toBe('Medicine name must be at least 2 characters.');
      expect(validateMedicineName('Ab')).toBeUndefined();
      expect(validateMedicineName('A'.repeat(151))).toBe(
        'Medicine name cannot exceed 150 characters.',
      );
    });

    it('rejects disallowed special characters', () => {
      expect(validateMedicineName('Paracetamol @ 500')).toBe(
        'Medicine name contains invalid characters.',
      );
      expect(validateMedicineName('Augmentin #1')).toBe(
        'Medicine name contains invalid characters.',
      );
    });

    it('accepts valid clinical names with allowed punctuation', () => {
      expect(validateMedicineName('Paracetamol 500mg Tablet')).toBeUndefined();
      expect(validateMedicineName('Augmentin 625 Duo')).toBeUndefined();
      expect(
        validateMedicineName('Amoxicillin + Clavulanic Acid (500mg/125mg)'),
      ).toBeUndefined();
      expect(validateMedicineName("Dr. Reddy's Omez-D & Cap")).toBeUndefined();
    });
  });

  describe('validateGenericName', () => {
    it('is optional when blank', () => {
      expect(validateGenericName('')).toBeUndefined();
      expect(validateGenericName('   ')).toBeUndefined();
    });

    it('enforces max 150 chars and character restrictions', () => {
      expect(validateGenericName('A'.repeat(151))).toBe(
        'Generic name cannot exceed 150 characters.',
      );
      expect(validateGenericName('Paracetamol @ API')).toBe(
        'Generic name contains invalid characters.',
      );
      expect(
        validateGenericName('Amoxicillin + Clavulanic Acid (API)'),
      ).toBeUndefined();
    });
  });

  describe('validateStrength', () => {
    it('is optional when blank', () => {
      expect(validateStrength('')).toBeUndefined();
    });

    it('accepts valid strength combinations', () => {
      expect(validateStrength('500')).toBeUndefined();
      expect(validateStrength('625')).toBeUndefined();
      expect(validateStrength('120/5')).toBeUndefined();
      expect(validateStrength('500 + 125')).toBeUndefined();
    });

    it('rejects disallowed special characters', () => {
      expect(validateStrength('500mg @ high')).toBe('Strength contains invalid characters.');
    });
  });

  describe('validateSubCategory', () => {
    it('is optional when blank', () => {
      expect(validateSubCategory('')).toBeUndefined();
    });

    it('rejects numbers in sub category', () => {
      expect(validateSubCategory('Pain Relief 1')).toBe(
        'Numbers are not allowed in sub category.',
      );
    });

    it('rejects disallowed characters', () => {
      expect(validateSubCategory('Pain @ Relief')).toBe(
        'Sub category can only contain letters, spaces, hyphens, and slashes.',
      );
    });

    it('accepts valid letters, spaces, hyphens, and slashes', () => {
      expect(validateSubCategory('Pain Relief / NSAIDs')).toBeUndefined();
      expect(validateSubCategory('Anti-Allergy')).toBeUndefined();
    });
  });

  describe('validateManufacturer', () => {
    it('is optional when blank', () => {
      expect(validateManufacturer('')).toBeUndefined();
    });

    it('enforces max 150 chars and allowed characters', () => {
      expect(validateManufacturer('A'.repeat(151))).toBe(
        'Manufacturer cannot exceed 150 characters.',
      );
      expect(validateManufacturer('Cipla @ Global')).toBe(
        'Manufacturer contains invalid characters.',
      );
      expect(validateManufacturer("Cipla Ltd., Dr. Reddy's & Sun Pharma")).toBeUndefined();
    });
  });

  describe('validateMedicineCode and validateBarcode', () => {
    it('are optional when blank', () => {
      expect(validateMedicineCode('')).toBeUndefined();
      expect(validateBarcode('')).toBeUndefined();
    });

    it('validate medicine code allowed characters', () => {
      expect(validateMedicineCode('MED_PARA-500')).toBeUndefined();
      expect(validateMedicineCode('MED 001')).toBe(
        'Medicine code can only contain letters, numbers, hyphens, and underscores.',
      );
      expect(validateMedicineCode('MED#001')).toBe(
        'Medicine code can only contain letters, numbers, hyphens, and underscores.',
      );
    });

    it('validate barcode allowed characters', () => {
      expect(validateBarcode('8901234567890')).toBeUndefined();
      expect(validateBarcode('EAN-13-890123')).toBeUndefined();
      expect(validateBarcode('BAR CODE')).toBe(
        'Barcode can only contain letters, numbers, and hyphens.',
      );
    });
  });

  describe('validateMrp, validateDiscountValue, and validateFinalPrice', () => {
    it('validate MRP constraints', () => {
      expect(validateMrp('')).toBeUndefined();
      expect(validateMrp('abc')).toBe('MRP must be a valid number.');
      expect(validateMrp('-10')).toBe('MRP cannot be negative.');
      expect(validateMrp('150.50')).toBeUndefined();
      expect(validateMrp('1000000')).toBe('MRP cannot exceed 999,999.99.');
    });

    it('validate discount value constraints', () => {
      expect(validateDiscountValue('', 'Percentage')).toBeUndefined();
      expect(validateDiscountValue('10', 'Percentage')).toBeUndefined();
      expect(validateDiscountValue('110', 'Percentage')).toBe(
        'Percentage discount cannot exceed 100%.',
      );
      expect(validateDiscountValue('50', 'Fixed Amount', '40')).toBe(
        'Fixed discount cannot exceed MRP.',
      );
      expect(validateDiscountValue('25', 'Fixed Amount', '40')).toBeUndefined();
    });

    it('validate final price constraints', () => {
      expect(validateFinalPrice('')).toBeUndefined();
      expect(validateFinalPrice('-5')).toBe('Final price cannot be negative.');
      expect(validateFinalPrice('125.75')).toBeUndefined();
    });
  });

  describe('validateFrequency and validateDuration', () => {
    it('are optional when blank', () => {
      expect(validateFrequency('')).toBeUndefined();
      expect(validateDuration('')).toBeUndefined();
    });

    it('accept valid frequency and duration strings', () => {
      expect(validateFrequency('1-0-1')).toBeUndefined();
      expect(validateFrequency('1-1-1, after meals')).toBeUndefined();
      expect(validateDuration('5 days')).toBeUndefined();
      expect(validateDuration('1 month')).toBeUndefined();
    });

    it('reject invalid characters in frequency and duration', () => {
      expect(validateFrequency('1-0-1 @ night')).toBe('Frequency contains invalid characters.');
      expect(validateDuration('5 days #1')).toBe('Duration contains invalid characters.');
    });
  });
});

describe('MedicineModal Real-time Typing Sanitization and UI Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('strips disallowed characters from medicine name input in real time', () => {
    renderWithProviders(
      <MedicineModal isOpen={true} onClose={vi.fn()} medicine={null} onSave={vi.fn()} />,
    );

    const nameInput = screen.getByLabelText(/Medicine Name/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Paracetamol 500mg @ #1 *' } });

    expect(nameInput.value).toBe('Paracetamol 500mg  1 ');
  });

  it('strips numbers and invalid characters from sub category input in real time', () => {
    renderWithProviders(
      <MedicineModal isOpen={true} onClose={vi.fn()} medicine={null} onSave={vi.fn()} />,
    );

    const subCatInput = screen.getByLabelText(/Sub Category/i) as HTMLInputElement;
    fireEvent.change(subCatInput, { target: { value: 'Pain Relief 123' } });

    expect(subCatInput.value).toBe('Pain Relief ');
  });

  it('restricts MRP and discount inputs to valid numbers and max 2 decimal places', () => {
    renderWithProviders(
      <MedicineModal isOpen={true} onClose={vi.fn()} medicine={null} onSave={vi.fn()} />,
    );

    const mrpInput = screen.getByLabelText(/MRP \(₹\)/i) as HTMLInputElement;
    fireEvent.change(mrpInput, { target: { value: '125.509abc' } });

    expect(mrpInput.value).toBe('125.50');
  });

  it('strips spaces and symbols from medicine code input in real time', () => {
    renderWithProviders(
      <MedicineModal isOpen={true} onClose={vi.fn()} medicine={null} onSave={vi.fn()} />,
    );

    const codeInput = screen.getByLabelText(/Medicine Code \/ SKU/i) as HTMLInputElement;
    fireEvent.change(codeInput, { target: { value: 'MED 001 #PARA$' } });

    expect(codeInput.value).toBe('MED001PARA');
  });

  it('displays inline validation errors and prevents submission when required fields are missing or invalid', async () => {
    renderWithProviders(
      <MedicineModal isOpen={true} onClose={vi.fn()} medicine={null} onSave={vi.fn()} />,
    );

    const submitBtn = screen.getByRole('button', { name: /Create Medicine/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Medicine name is required.')).toBeInTheDocument();
    expect(
      screen.getByText(/Please correct the highlighted fields before saving/i),
    ).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();

    const nameInput = screen.getByLabelText(/Medicine Name/i);
    fireEvent.change(nameInput, { target: { value: 'A' } });
    fireEvent.blur(nameInput);

    expect(screen.getByText('Medicine name must be at least 2 characters.')).toBeInTheDocument();
  });

  it('clears inline errors and successfully submits when valid data is entered', async () => {
    vi.mocked(api.post).mockResolvedValue({ data: { success: true } });
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    renderWithProviders(
      <MedicineModal
        isOpen={true}
        onClose={handleClose}
        medicine={null}
        onSave={handleSave}
      />,
    );

    const nameInput = screen.getByLabelText(/Medicine Name/i);
    fireEvent.change(nameInput, { target: { value: 'Augmentin 625 Duo' } });
    fireEvent.blur(nameInput);

    expect(screen.queryByText('Medicine name is required.')).not.toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Create Medicine/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        'medicines',
        expect.objectContaining({
          medicineName: 'Augmentin 625 Duo',
          status: 'Active',
        }),
      );
      expect(handleSave).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });
});
