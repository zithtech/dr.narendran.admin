import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LinkedMedicalModal, {
  validateMedicalAddressLine,
  validateMedicalCity,
  validateMedicalEmail,
  validateMedicalName,
  validateMedicalPhone,
  validateMedicalPincode,
  validateMedicalState,
} from '../components/LinkedMedicalModal';
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

describe('Linked Medical validation functions', () => {
  describe('validateMedicalName', () => {
    it('requires pharmacy name', () => {
      expect(validateMedicalName('')).toBe('Pharmacy or medical store name is required.');
      expect(validateMedicalName('   ')).toBe('Pharmacy or medical store name is required.');
    });

    it('enforces min 2 chars and max 150 chars', () => {
      expect(validateMedicalName('A')).toBe('Pharmacy name must be at least 2 characters.');
      expect(validateMedicalName('A'.repeat(151))).toBe('Pharmacy name cannot exceed 150 characters.');
    });

    it('rejects disallowed special characters', () => {
      expect(validateMedicalName('Apollo @ Greams')).toBe('Pharmacy name contains invalid characters.');
      expect(validateMedicalName('MedPlus #1')).toBe('Pharmacy name contains invalid characters.');
    });

    it('accepts valid pharmacy names', () => {
      expect(validateMedicalName('Apollo Pharmacy')).toBeUndefined();
      expect(validateMedicalName("St. Jude's & Care Chemist")).toBeUndefined();
      expect(validateMedicalName('Store 101')).toBeUndefined();
    });
  });

  describe('validateMedicalPhone', () => {
    it('is optional when blank', () => {
      expect(validateMedicalPhone('')).toBeUndefined();
      expect(validateMedicalPhone('   ')).toBeUndefined();
    });

    it('enforces 7 to 15 digits', () => {
      expect(validateMedicalPhone('123456')).toBe('Phone number must be at least 7 digits.');
      expect(validateMedicalPhone('1234567')).toBeUndefined();
      expect(validateMedicalPhone('+914428290250')).toBeUndefined();
      expect(validateMedicalPhone('1234567890123456')).toBe('Phone number cannot exceed 15 digits.');
    });

    it('rejects letters and disallowed special characters', () => {
      expect(validateMedicalPhone('98765abcde')).toBe('Letters are not allowed in phone number.');
      expect(validateMedicalPhone('98765#43210')).toBe('Special characters are not allowed in phone number.');
    });
  });

  describe('validateMedicalEmail', () => {
    it('is optional when blank', () => {
      expect(validateMedicalEmail('')).toBeUndefined();
    });

    it('rejects invalid email formats', () => {
      expect(validateMedicalEmail('not-an-email')).toContain('valid email address');
      expect(validateMedicalEmail('user@domain')).toContain('valid email address');
    });

    it('accepts valid emails', () => {
      expect(validateMedicalEmail('orders@apollopharmacy.com')).toBeUndefined();
      expect(validateMedicalEmail('info@lifecare.org')).toBeUndefined();
    });
  });

  describe('validateMedicalAddressLine', () => {
    it('is optional when blank', () => {
      expect(validateMedicalAddressLine('')).toBeUndefined();
    });

    it('enforces max 255 chars and allowed characters', () => {
      expect(validateMedicalAddressLine('A'.repeat(256))).toBe('Address line cannot exceed 255 characters.');
      expect(validateMedicalAddressLine('Shop No. 12, Ground Floor, Hospital Road')).toBeUndefined();
      expect(validateMedicalAddressLine('Suite #102, Main Rd.')).toBeUndefined();
      expect(validateMedicalAddressLine('Illegal ^ char')).toBe('Address line contains invalid characters.');
    });
  });

  describe('validateMedicalCity and validateMedicalState', () => {
    it('are optional when blank', () => {
      expect(validateMedicalCity('')).toBeUndefined();
      expect(validateMedicalState('')).toBeUndefined();
    });

    it('reject numbers in city and state', () => {
      expect(validateMedicalCity('Chennai 06')).toBe('Numbers are not allowed in city.');
      expect(validateMedicalState('Tamil Nadu 1')).toBe('Numbers are not allowed in state.');
    });

    it('reject invalid characters', () => {
      expect(validateMedicalCity('Chennai@North')).toBe('City can only contain letters, spaces, and hyphens.');
      expect(validateMedicalState('State#East')).toBe('State can only contain letters, spaces, and hyphens.');
    });

    it('accept valid letters, spaces, and hyphens', () => {
      expect(validateMedicalCity('Chennai')).toBeUndefined();
      expect(validateMedicalCity('New-Delhi')).toBeUndefined();
      expect(validateMedicalState('Tamil Nadu')).toBeUndefined();
    });
  });

  describe('validateMedicalPincode', () => {
    it('is optional when blank', () => {
      expect(validateMedicalPincode('')).toBeUndefined();
    });

    it('enforces 5 to 10 digits', () => {
      expect(validateMedicalPincode('1234')).toBe('Pincode must be between 5 and 10 digits.');
      expect(validateMedicalPincode('600006')).toBeUndefined();
      expect(validateMedicalPincode('12345678901')).toBe('Pincode must be between 5 and 10 digits.');
    });

    it('rejects letters and special characters', () => {
      expect(validateMedicalPincode('60000A')).toBe('Pincode must contain only numbers.');
      expect(validateMedicalPincode('600-006')).toBe('Pincode must contain only numbers.');
    });
  });
});

describe('LinkedMedicalModal UI validation and sanitization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('strips non-digits and disallowed symbols from phone number input', () => {
    renderWithProviders(
      <LinkedMedicalModal isOpen={true} onClose={vi.fn()} medical={null} onSave={vi.fn()} />
    );

    const phoneInput = screen.getByPlaceholderText(/e\.g\. \+91 44 2829 0250/i) as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: '+91 call 44-2829#0250$' } });

    expect(phoneInput.value).toBe('+91  44-28290250');
  });

  it('strips non-digits from pincode input', () => {
    renderWithProviders(
      <LinkedMedicalModal isOpen={true} onClose={vi.fn()} medical={null} onSave={vi.fn()} />
    );

    const pincodeInput = screen.getByPlaceholderText('e.g. 600006') as HTMLInputElement;
    fireEvent.change(pincodeInput, { target: { value: '600006abc!@#' } });

    expect(pincodeInput.value).toBe('600006');
  });

  it('strips numbers and symbols from city and state inputs', () => {
    renderWithProviders(
      <LinkedMedicalModal isOpen={true} onClose={vi.fn()} medical={null} onSave={vi.fn()} />
    );

    const cityInput = screen.getByPlaceholderText('e.g. Chennai') as HTMLInputElement;
    fireEvent.change(cityInput, { target: { value: 'Chennai-600 #West' } });

    expect(cityInput.value).toBe('Chennai- West');

    const stateInput = screen.getByPlaceholderText('e.g. Tamil Nadu') as HTMLInputElement;
    fireEvent.change(stateInput, { target: { value: 'Tamil Nadu 123' } });

    expect(stateInput.value).toBe('Tamil Nadu ');
  });

  it('strips disallowed characters from medical name input', () => {
    renderWithProviders(
      <LinkedMedicalModal isOpen={true} onClose={vi.fn()} medical={null} onSave={vi.fn()} />
    );

    const nameInput = screen.getByLabelText(/Pharmacy \/ Medical Store Name/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Apollo Pharmacy #1 @ Greams*' } });

    expect(nameInput.value).toBe('Apollo Pharmacy 1  Greams');
  });

  it('displays inline validation errors and blocks form submission when fields are invalid', async () => {
    renderWithProviders(
      <LinkedMedicalModal isOpen={true} onClose={vi.fn()} medical={null} onSave={vi.fn()} />
    );

    const submitBtn = screen.getByRole('button', { name: /Create Linked Medical/i });
    fireEvent.click(submitBtn);

    expect(screen.getByText('Pharmacy or medical store name is required.')).toBeInTheDocument();
    expect(screen.getByText(/Please correct the highlighted fields before saving/i)).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();

    const nameInput = screen.getByLabelText(/Pharmacy \/ Medical Store Name/i);
    fireEvent.change(nameInput, { target: { value: 'A' } });
    fireEvent.blur(nameInput);

    expect(screen.getByText('Pharmacy name must be at least 2 characters.')).toBeInTheDocument();

    const phoneInput = screen.getByPlaceholderText(/e\.g\. \+91 44 2829 0250/i);
    fireEvent.change(phoneInput, { target: { value: '123' } });
    fireEvent.blur(phoneInput);

    expect(screen.getByText('Phone number must be at least 7 digits.')).toBeInTheDocument();
  });
});
