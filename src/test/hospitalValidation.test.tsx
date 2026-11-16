import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import HospitalModal, {
  validateHospitalAddressLine,
  validateHospitalCity,
  validateHospitalEmail,
  validateHospitalName,
  validateHospitalPhone,
  validateHospitalPincode,
  validateHospitalState,
} from '../components/HospitalModal';
import api from '../utils/api';
import { renderWithProviders } from './renderWithProviders';

vi.mock('../utils/api', () => ({
  default: vi.fn(),
}));

describe('Hospital validation functions', () => {
  describe('validateHospitalName', () => {
    it('requires hospital name', () => {
      expect(validateHospitalName('')).toBe('Hospital name is required.');
      expect(validateHospitalName('   ')).toBe('Hospital name is required.');
    });

    it('enforces min 2 chars and max 150 chars', () => {
      expect(validateHospitalName('A')).toBe('Hospital name must be at least 2 characters.');
      expect(validateHospitalName('A'.repeat(151))).toBe('Hospital name cannot exceed 150 characters.');
    });

    it('rejects disallowed special characters', () => {
      expect(validateHospitalName('Apollo @ Main')).toBe('Hospital name contains invalid characters.');
      expect(validateHospitalName('City #Hospital')).toBe('Hospital name contains invalid characters.');
    });

    it('accepts valid hospital names', () => {
      expect(validateHospitalName('Apollo Multi-Specialty Hospital')).toBeUndefined();
      expect(validateHospitalName("St. Mary's & Children's Clinic - North")).toBeUndefined();
      expect(validateHospitalName('Hospital 101')).toBeUndefined();
    });
  });

  describe('validateHospitalPhone', () => {
    it('is optional when blank', () => {
      expect(validateHospitalPhone('')).toBeUndefined();
      expect(validateHospitalPhone('   ')).toBeUndefined();
    });

    it('enforces 7 to 15 digits', () => {
      expect(validateHospitalPhone('123456')).toBe('Phone number must be at least 7 digits.');
      expect(validateHospitalPhone('1234567')).toBeUndefined();
      expect(validateHospitalPhone('+914428290200')).toBeUndefined();
      expect(validateHospitalPhone('1234567890123456')).toBe('Phone number cannot exceed 15 digits.');
    });

    it('rejects letters and disallowed special characters', () => {
      expect(validateHospitalPhone('98765abcde')).toBe('Letters are not allowed in phone number.');
      expect(validateHospitalPhone('98765#43210')).toBe('Special characters are not allowed in phone number.');
    });
  });

  describe('validateHospitalEmail', () => {
    it('is optional when blank', () => {
      expect(validateHospitalEmail('')).toBeUndefined();
    });

    it('rejects invalid email formats', () => {
      expect(validateHospitalEmail('not-an-email')).toContain('valid email address');
      expect(validateHospitalEmail('user@domain')).toContain('valid email address');
    });

    it('accepts valid emails', () => {
      expect(validateHospitalEmail('info@apollohospital.org')).toBeUndefined();
      expect(validateHospitalEmail('care@st-marys.co.uk')).toBeUndefined();
    });
  });

  describe('validateHospitalAddressLine', () => {
    it('is optional when blank', () => {
      expect(validateHospitalAddressLine('')).toBeUndefined();
    });

    it('enforces max 255 chars and allowed characters', () => {
      expect(validateHospitalAddressLine('A'.repeat(256))).toBe('Address line cannot exceed 255 characters.');
      expect(validateHospitalAddressLine('21 Greams Lane, 4th Cross')).toBeUndefined();
      expect(validateHospitalAddressLine('Suite #102, Main Rd.')).toBeUndefined();
      expect(validateHospitalAddressLine('Illegal ^ char')).toBe('Address line contains invalid characters.');
    });
  });

  describe('validateHospitalCity and validateHospitalState', () => {
    it('are optional when blank', () => {
      expect(validateHospitalCity('')).toBeUndefined();
      expect(validateHospitalState('')).toBeUndefined();
    });

    it('reject numbers in city and state', () => {
      expect(validateHospitalCity('Chennai 06')).toBe('Numbers are not allowed in city.');
      expect(validateHospitalState('Tamil Nadu 1')).toBe('Numbers are not allowed in state.');
    });

    it('reject invalid characters', () => {
      expect(validateHospitalCity('Chennai@North')).toBe('City can only contain letters, spaces, and hyphens.');
      expect(validateHospitalState('State#East')).toBe('State can only contain letters, spaces, and hyphens.');
    });

    it('accept valid letters, spaces, and hyphens', () => {
      expect(validateHospitalCity('Chennai')).toBeUndefined();
      expect(validateHospitalCity('New-Delhi')).toBeUndefined();
      expect(validateHospitalState('Tamil Nadu')).toBeUndefined();
    });
  });

  describe('validateHospitalPincode', () => {
    it('is optional when blank', () => {
      expect(validateHospitalPincode('')).toBeUndefined();
    });

    it('enforces 5 to 10 digits', () => {
      expect(validateHospitalPincode('1234')).toBe('Pincode must be between 5 and 10 digits.');
      expect(validateHospitalPincode('600006')).toBeUndefined();
      expect(validateHospitalPincode('12345678901')).toBe('Pincode must be between 5 and 10 digits.');
    });

    it('rejects letters and special characters', () => {
      expect(validateHospitalPincode('60000A')).toBe('Pincode must contain only numbers.');
      expect(validateHospitalPincode('600-006')).toBe('Pincode must contain only numbers.');
    });
  });
});

describe('HospitalModal UI validation and sanitization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('strips non-digits and disallowed symbols from phone number input', () => {
    renderWithProviders(
      <HospitalModal isOpen={true} onClose={vi.fn()} hospital={null} onSave={vi.fn()} />
    );

    const phoneInput = screen.getByLabelText(/Phone \/ Helpline/i) as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: '+91 call 44-2829#0200$' } });

    expect(phoneInput.value).toBe('+91  44-28290200');
  });

  it('strips non-digits from pincode input', () => {
    renderWithProviders(
      <HospitalModal isOpen={true} onClose={vi.fn()} hospital={null} onSave={vi.fn()} />
    );

    const pincodeInput = screen.getByLabelText('Pincode / Postal Code') as HTMLInputElement;
    fireEvent.change(pincodeInput, { target: { value: '600abc006#' } });

    expect(pincodeInput.value).toBe('600006');
  });

  it('strips numbers and symbols from city and state inputs', () => {
    renderWithProviders(
      <HospitalModal isOpen={true} onClose={vi.fn()} hospital={null} onSave={vi.fn()} />
    );

    const cityInput = screen.getByLabelText('City / Town') as HTMLInputElement;
    fireEvent.change(cityInput, { target: { value: 'Chennai 123 @North' } });
    expect(cityInput.value).toBe('Chennai  North');

    const stateInput = screen.getByLabelText('State / Province') as HTMLInputElement;
    fireEvent.change(stateInput, { target: { value: 'Tamil Nadu 44!' } });
    expect(stateInput.value).toBe('Tamil Nadu ');
  });

  it('strips disallowed symbols from hospital name input', () => {
    renderWithProviders(
      <HospitalModal isOpen={true} onClose={vi.fn()} hospital={null} onSave={vi.fn()} />
    );

    const nameInput = screen.getByPlaceholderText(/e\.g\. Apollo Multi-Specialty Hospital/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Apollo Hospital @$ Main!' } });

    expect(nameInput.value).toBe('Apollo Hospital  Main');
  });

  it('shows inline errors and prevents submit when hospital name is missing', async () => {
    const handleSave = vi.fn();
    renderWithProviders(
      <HospitalModal isOpen={true} onClose={vi.fn()} hospital={null} onSave={handleSave} />
    );

    const submitBtn = screen.getByRole('button', { name: /Create Hospital/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Hospital name is required.')).toBeInTheDocument();
      expect(screen.getByText('Please correct the highlighted fields before saving.')).toBeInTheDocument();
      expect(api).not.toHaveBeenCalled();
    });
  });

  it('shows inline error when phone number has fewer than 7 digits on submit', async () => {
    renderWithProviders(
      <HospitalModal isOpen={true} onClose={vi.fn()} hospital={null} onSave={vi.fn()} />
    );

    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Apollo Multi-Specialty Hospital/i), {
      target: { value: 'Apollo Hospital' },
    });
    fireEvent.change(screen.getByLabelText(/Phone \/ Helpline/i), {
      target: { value: '12345' },
    });

    const submitBtn = screen.getByRole('button', { name: /Create Hospital/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Phone number must be at least 7 digits.')).toBeInTheDocument();
      expect(api).not.toHaveBeenCalled();
    });
  });

  it('shows inline error when pincode has fewer than 5 digits on blur', async () => {
    renderWithProviders(
      <HospitalModal isOpen={true} onClose={vi.fn()} hospital={null} onSave={vi.fn()} />
    );

    const pincodeInput = screen.getByLabelText('Pincode / Postal Code');
    fireEvent.change(pincodeInput, { target: { value: '123' } });
    fireEvent.blur(pincodeInput);

    await waitFor(() => {
      expect(screen.getByText('Pincode must be between 5 and 10 digits.')).toBeInTheDocument();
    });
  });
});
