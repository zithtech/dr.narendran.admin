import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LabModal, {
  validateLabAddressLine,
  validateLabCity,
  validateLabEmail,
  validateLabName,
  validateLabPhone,
  validateLabPincode,
  validateLabState,
} from '../components/LabModal';
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

describe('Lab validation functions', () => {
  describe('validateLabName', () => {
    it('requires laboratory name', () => {
      expect(validateLabName('')).toBe('Laboratory name is required.');
      expect(validateLabName('   ')).toBe('Laboratory name is required.');
    });

    it('enforces min 2 chars and max 150 chars', () => {
      expect(validateLabName('A')).toBe('Laboratory name must be at least 2 characters.');
      expect(validateLabName('A'.repeat(151))).toBe('Laboratory name cannot exceed 150 characters.');
    });

    it('rejects disallowed special characters', () => {
      expect(validateLabName('Lab @ Anna Nagar')).toBe('Laboratory name contains invalid characters.');
      expect(validateLabName('Metropolis #1')).toBe('Laboratory name contains invalid characters.');
    });

    it('accepts valid lab names', () => {
      expect(validateLabName('Metropolis Diagnostics Center')).toBeUndefined();
      expect(validateLabName("St. Jude's & Care Lab")).toBeUndefined();
      expect(validateLabName('Lab 101')).toBeUndefined();
    });
  });

  describe('validateLabPhone', () => {
    it('is optional when blank', () => {
      expect(validateLabPhone('')).toBeUndefined();
      expect(validateLabPhone('   ')).toBeUndefined();
    });

    it('enforces 7 to 15 digits', () => {
      expect(validateLabPhone('123456')).toBe('Phone number must be at least 7 digits.');
      expect(validateLabPhone('1234567')).toBeUndefined();
      expect(validateLabPhone('+914428290250')).toBeUndefined();
      expect(validateLabPhone('1234567890123456')).toBe('Phone number cannot exceed 15 digits.');
    });

    it('rejects letters and disallowed special characters', () => {
      expect(validateLabPhone('98765abcde')).toBe('Letters are not allowed in phone number.');
      expect(validateLabPhone('98765#43210')).toBe('Special characters are not allowed in phone number.');
    });
  });

  describe('validateLabEmail', () => {
    it('is optional when blank', () => {
      expect(validateLabEmail('')).toBeUndefined();
    });

    it('rejects invalid email formats', () => {
      expect(validateLabEmail('not-an-email')).toContain('valid email address');
      expect(validateLabEmail('user@domain')).toContain('valid email address');
    });

    it('accepts valid emails', () => {
      expect(validateLabEmail('reports@metropolislab.com')).toBeUndefined();
      expect(validateLabEmail('care@diagnostics.org')).toBeUndefined();
    });
  });

  describe('validateLabAddressLine', () => {
    it('is optional when blank', () => {
      expect(validateLabAddressLine('')).toBeUndefined();
    });

    it('enforces max 255 chars and allowed characters', () => {
      expect(validateLabAddressLine('A'.repeat(256))).toBe('Address line cannot exceed 255 characters.');
      expect(validateLabAddressLine('Plot 42, Medical Enclave, 1st Cross')).toBeUndefined();
      expect(validateLabAddressLine('Suite #102, Main Rd.')).toBeUndefined();
      expect(validateLabAddressLine('Illegal ^ char')).toBe('Address line contains invalid characters.');
    });
  });

  describe('validateLabCity and validateLabState', () => {
    it('are optional when blank', () => {
      expect(validateLabCity('')).toBeUndefined();
      expect(validateLabState('')).toBeUndefined();
    });

    it('reject numbers in city and state', () => {
      expect(validateLabCity('Chennai 06')).toBe('Numbers are not allowed in city.');
      expect(validateLabState('Tamil Nadu 1')).toBe('Numbers are not allowed in state.');
    });

    it('reject invalid characters', () => {
      expect(validateLabCity('Chennai@North')).toBe('City can only contain letters, spaces, and hyphens.');
      expect(validateLabState('State#East')).toBe('State can only contain letters, spaces, and hyphens.');
    });

    it('accept valid letters, spaces, and hyphens', () => {
      expect(validateLabCity('Chennai')).toBeUndefined();
      expect(validateLabCity('New-Delhi')).toBeUndefined();
      expect(validateLabState('Tamil Nadu')).toBeUndefined();
    });
  });

  describe('validateLabPincode', () => {
    it('is optional when blank', () => {
      expect(validateLabPincode('')).toBeUndefined();
    });

    it('enforces 5 to 10 digits', () => {
      expect(validateLabPincode('1234')).toBe('Pincode must be between 5 and 10 digits.');
      expect(validateLabPincode('600040')).toBeUndefined();
      expect(validateLabPincode('12345678901')).toBe('Pincode must be between 5 and 10 digits.');
    });

    it('rejects letters and special characters', () => {
      expect(validateLabPincode('60004A')).toBe('Pincode must contain only numbers.');
      expect(validateLabPincode('600-040')).toBe('Pincode must contain only numbers.');
    });
  });
});

describe('LabModal UI validation and sanitization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: [] });
  });

  it('strips non-digits and disallowed symbols from phone number input', () => {
    renderWithProviders(
      <LabModal isOpen={true} onClose={vi.fn()} lab={null} onSave={vi.fn()} />
    );

    const phoneInput = screen.getByPlaceholderText(/e\.g\. \+91 44 2829 0250/i) as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: '+91 call 44-2829#0250$' } });

    expect(phoneInput.value).toBe('+91  44-28290250');
  });

  it('strips non-digits from pincode input', () => {
    renderWithProviders(
      <LabModal isOpen={true} onClose={vi.fn()} lab={null} onSave={vi.fn()} />
    );

    const pincodeInput = screen.getByPlaceholderText('e.g. 600040') as HTMLInputElement;
    fireEvent.change(pincodeInput, { target: { value: '600abc040#' } });

    expect(pincodeInput.value).toBe('600040');
  });

  it('strips numbers and symbols from city and state inputs', () => {
    renderWithProviders(
      <LabModal isOpen={true} onClose={vi.fn()} lab={null} onSave={vi.fn()} />
    );

    const cityInput = screen.getByPlaceholderText('e.g. Chennai') as HTMLInputElement;
    fireEvent.change(cityInput, { target: { value: 'Chennai 123 @North' } });
    expect(cityInput.value).toBe('Chennai  North');

    const stateInput = screen.getByPlaceholderText('e.g. Tamil Nadu') as HTMLInputElement;
    fireEvent.change(stateInput, { target: { value: 'Tamil Nadu 44!' } });
    expect(stateInput.value).toBe('Tamil Nadu ');
  });

  it('strips disallowed symbols from lab name input', () => {
    renderWithProviders(
      <LabModal isOpen={true} onClose={vi.fn()} lab={null} onSave={vi.fn()} />
    );

    const nameInput = screen.getByLabelText(/Laboratory \/ Diagnostic Center Name/i) as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Metropolis Lab @$ West!' } });

    expect(nameInput.value).toBe('Metropolis Lab  West');
  });

  it('shows inline error and prevents submit when laboratory name is missing', async () => {
    const handleSave = vi.fn();
    renderWithProviders(
      <LabModal isOpen={true} onClose={vi.fn()} lab={null} onSave={handleSave} />
    );

    const submitBtn = screen.getByRole('button', { name: /Create Linked Lab/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Laboratory name is required.')).toBeInTheDocument();
      expect(screen.getByText('Please correct the highlighted fields before saving.')).toBeInTheDocument();
      expect(api).not.toHaveBeenCalledWith(expect.objectContaining({ method: 'POST' }));
    });
  });

  it('shows inline error when phone number has fewer than 7 digits on submit', async () => {
    renderWithProviders(
      <LabModal isOpen={true} onClose={vi.fn()} lab={null} onSave={vi.fn()} />
    );

    fireEvent.change(screen.getByLabelText(/Laboratory \/ Diagnostic Center Name/i), {
      target: { value: 'Apollo Diagnostics' },
    });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. \+91 44 2829 0250/i), {
      target: { value: '12345' },
    });

    const submitBtn = screen.getByRole('button', { name: /Create Linked Lab/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Phone number must be at least 7 digits.')).toBeInTheDocument();
      expect(api).not.toHaveBeenCalledWith(expect.objectContaining({ method: 'POST' }));
    });
  });

  it('shows inline error when pincode has fewer than 5 digits on blur', async () => {
    renderWithProviders(
      <LabModal isOpen={true} onClose={vi.fn()} lab={null} onSave={vi.fn()} />
    );

    const pincodeInput = screen.getByPlaceholderText('e.g. 600040');
    fireEvent.change(pincodeInput, { target: { value: '123' } });
    fireEvent.blur(pincodeInput);

    await waitFor(() => {
      expect(screen.getByText('Pincode must be between 5 and 10 digits.')).toBeInTheDocument();
    });
  });
});

