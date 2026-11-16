import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BranchModal, {
  validateBranchAddressLine,
  validateBranchCity,
  validateBranchHospital,
  validateBranchName,
  validateBranchPhone,
  validateBranchPincode,
  validateBranchState,
} from '../components/BranchModal';
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

const mockHospitals = [
  {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Apollo Multi-Specialty Hospital',
    hospital_code: 'HSP-001',
    status: 'ACTIVE' as const,
  },
];

describe('Branch validation functions', () => {
  describe('validateBranchName', () => {
    it('requires branch name', () => {
      expect(validateBranchName('')).toBe('Branch name is required.');
      expect(validateBranchName('   ')).toBe('Branch name is required.');
    });

    it('enforces min 2 chars and max 150 chars', () => {
      expect(validateBranchName('A')).toBe('Branch name must be at least 2 characters.');
      expect(validateBranchName('A'.repeat(151))).toBe('Branch name cannot exceed 150 characters.');
    });

    it('rejects disallowed special characters', () => {
      expect(validateBranchName('Branch @ South')).toBe('Branch name contains invalid characters.');
      expect(validateBranchName('Apollo #1')).toBe('Branch name contains invalid characters.');
    });

    it('accepts valid branch names', () => {
      expect(validateBranchName('Apollo South Campus')).toBeUndefined();
      expect(validateBranchName("St. Jude's & Children's Clinic")).toBeUndefined();
      expect(validateBranchName('Branch 101')).toBeUndefined();
    });
  });

  describe('validateBranchHospital', () => {
    it('requires parent hospital selection', () => {
      expect(validateBranchHospital('')).toBe('Please select a parent hospital.');
      expect(validateBranchHospital('   ')).toBe('Please select a parent hospital.');
      expect(validateBranchHospital('123e4567-e89b-12d3-a456-426614174000')).toBeUndefined();
    });
  });

  describe('validateBranchPhone', () => {
    it('is optional when blank', () => {
      expect(validateBranchPhone('')).toBeUndefined();
      expect(validateBranchPhone('   ')).toBeUndefined();
    });

    it('enforces 7 to 15 digits', () => {
      expect(validateBranchPhone('123456')).toBe('Phone number must be at least 7 digits.');
      expect(validateBranchPhone('1234567')).toBeUndefined();
      expect(validateBranchPhone('+914428290250')).toBeUndefined();
      expect(validateBranchPhone('1234567890123456')).toBe('Phone number cannot exceed 15 digits.');
    });

    it('rejects letters and disallowed special characters', () => {
      expect(validateBranchPhone('98765abcde')).toBe('Letters are not allowed in phone number.');
      expect(validateBranchPhone('98765#43210')).toBe('Special characters are not allowed in phone number.');
    });
  });

  describe('validateBranchAddressLine', () => {
    it('is optional when blank', () => {
      expect(validateBranchAddressLine('')).toBeUndefined();
    });

    it('enforces max 255 chars and allowed characters', () => {
      expect(validateBranchAddressLine('A'.repeat(256))).toBe('Address line cannot exceed 255 characters.');
      expect(validateBranchAddressLine('Block C, South Wing, Greams Road')).toBeUndefined();
      expect(validateBranchAddressLine('Suite #102, Main Rd.')).toBeUndefined();
      expect(validateBranchAddressLine('Illegal ^ char')).toBe('Address line contains invalid characters.');
    });
  });

  describe('validateBranchCity and validateBranchState', () => {
    it('are optional when blank', () => {
      expect(validateBranchCity('')).toBeUndefined();
      expect(validateBranchState('')).toBeUndefined();
    });

    it('reject numbers in city and state', () => {
      expect(validateBranchCity('Chennai 06')).toBe('Numbers are not allowed in city.');
      expect(validateBranchState('Tamil Nadu 1')).toBe('Numbers are not allowed in state.');
    });

    it('reject invalid characters', () => {
      expect(validateBranchCity('Chennai@North')).toBe('City can only contain letters, spaces, and hyphens.');
      expect(validateBranchState('State#East')).toBe('State can only contain letters, spaces, and hyphens.');
    });

    it('accept valid letters, spaces, and hyphens', () => {
      expect(validateBranchCity('Chennai')).toBeUndefined();
      expect(validateBranchCity('New-Delhi')).toBeUndefined();
      expect(validateBranchState('Tamil Nadu')).toBeUndefined();
    });
  });

  describe('validateBranchPincode', () => {
    it('is optional when blank', () => {
      expect(validateBranchPincode('')).toBeUndefined();
    });

    it('enforces 5 to 10 digits', () => {
      expect(validateBranchPincode('1234')).toBe('Pincode must be between 5 and 10 digits.');
      expect(validateBranchPincode('600006')).toBeUndefined();
      expect(validateBranchPincode('12345678901')).toBe('Pincode must be between 5 and 10 digits.');
    });

    it('rejects letters and special characters', () => {
      expect(validateBranchPincode('60000A')).toBe('Pincode must contain only numbers.');
      expect(validateBranchPincode('600-006')).toBe('Pincode must contain only numbers.');
    });
  });
});

describe('BranchModal UI validation and sanitization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: mockHospitals });
  });

  it('strips non-digits and disallowed symbols from phone number input', () => {
    renderWithProviders(
      <BranchModal isOpen={true} onClose={vi.fn()} branch={null} onSave={vi.fn()} />
    );

    const phoneInput = screen.getByLabelText(/Branch Phone \/ Reception Contact/i) as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: '+91 call 44-2829#0250$' } });

    expect(phoneInput.value).toBe('+91  44-28290250');
  });

  it('strips non-digits from pincode input', () => {
    renderWithProviders(
      <BranchModal isOpen={true} onClose={vi.fn()} branch={null} onSave={vi.fn()} />
    );

    const pincodeInput = screen.getByLabelText('Pincode / Postal Code') as HTMLInputElement;
    fireEvent.change(pincodeInput, { target: { value: '600abc006#' } });

    expect(pincodeInput.value).toBe('600006');
  });

  it('strips numbers and symbols from city and state inputs', () => {
    renderWithProviders(
      <BranchModal isOpen={true} onClose={vi.fn()} branch={null} onSave={vi.fn()} />
    );

    const cityInput = screen.getByLabelText('City / Town') as HTMLInputElement;
    fireEvent.change(cityInput, { target: { value: 'Chennai 123 @North' } });
    expect(cityInput.value).toBe('Chennai  North');

    const stateInput = screen.getByLabelText('State / Province') as HTMLInputElement;
    fireEvent.change(stateInput, { target: { value: 'Tamil Nadu 44!' } });
    expect(stateInput.value).toBe('Tamil Nadu ');
  });

  it('strips disallowed symbols from branch name input', () => {
    renderWithProviders(
      <BranchModal isOpen={true} onClose={vi.fn()} branch={null} onSave={vi.fn()} />
    );

    const nameInput = screen.getByPlaceholderText(/e\.g\. Apollo South Campus/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Apollo Campus @$ South!' } });

    expect(nameInput.value).toBe('Apollo Campus  South');
  });

  it('shows inline errors and prevents submit when required fields are missing', async () => {
    const handleSave = vi.fn();
    renderWithProviders(
      <BranchModal isOpen={true} onClose={vi.fn()} branch={null} onSave={handleSave} />
    );

    const submitBtn = screen.getByRole('button', { name: /Create Branch/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Branch name is required.')).toBeInTheDocument();
      expect(screen.getByText('Please select a parent hospital.')).toBeInTheDocument();
      expect(screen.getByText('Please correct the highlighted fields before saving.')).toBeInTheDocument();
      expect(api).not.toHaveBeenCalled();
    });
  });

  it('shows inline error when phone number has fewer than 7 digits on submit', async () => {
    renderWithProviders(
      <BranchModal isOpen={true} onClose={vi.fn()} branch={null} onSave={vi.fn()} />
    );

    // Wait for hospital options
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Apollo Multi-Specialty Hospital/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Parent Hospital System/i), {
      target: { value: '123e4567-e89b-12d3-a456-426614174000' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Apollo South Campus/i), {
      target: { value: 'Apollo Branch' },
    });
    fireEvent.change(screen.getByLabelText(/Branch Phone \/ Reception Contact/i), {
      target: { value: '12345' },
    });

    const submitBtn = screen.getByRole('button', { name: /Create Branch/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Phone number must be at least 7 digits.')).toBeInTheDocument();
      expect(api).not.toHaveBeenCalled();
    });
  });

  it('shows inline error when pincode has fewer than 5 digits on blur', async () => {
    renderWithProviders(
      <BranchModal isOpen={true} onClose={vi.fn()} branch={null} onSave={vi.fn()} />
    );

    const pincodeInput = screen.getByLabelText('Pincode / Postal Code');
    fireEvent.change(pincodeInput, { target: { value: '123' } });
    fireEvent.blur(pincodeInput);

    await waitFor(() => {
      expect(screen.getByText('Pincode must be between 5 and 10 digits.')).toBeInTheDocument();
    });
  });
});

