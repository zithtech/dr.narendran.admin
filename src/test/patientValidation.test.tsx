import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PatientModal, {
  validatePatientAddressLine,
  validatePatientCity,
  validatePatientEmail,
  validatePatientEmergencyName,
  validatePatientEmergencyPhone,
  validatePatientEmergencyRelation,
  validatePatientHeight,
  validatePatientHospital,
  validatePatientImageUrl,
  validatePatientName,
  validatePatientPhone,
  validatePatientPincode,
  validatePatientState,
  validatePatientWeight,
} from '../components/PatientModal';
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
  { id: 'hosp-1', name: 'Apollo Hospitals', code: 'APL', status: 'ACTIVE' },
];

describe('Patient validation functions', () => {
  describe('validatePatientName', () => {
    it('requires patient full name', () => {
      expect(validatePatientName('')).toBe('Patient full name is required.');
      expect(validatePatientName('   ')).toBe('Patient full name is required.');
    });

    it('enforces min 2 chars and max 100 chars', () => {
      expect(validatePatientName('A')).toBe('Patient name must be at least 2 characters.');
      expect(validatePatientName('A'.repeat(101))).toBe('Patient name cannot exceed 100 characters.');
    });

    it('rejects numbers and disallowed special characters', () => {
      expect(validatePatientName('Patient 123')).toBe('Numbers are not allowed in patient name.');
      expect(validatePatientName('John @ Hospital')).toBe(
        'Patient name can only contain letters, spaces, hyphens, and periods.',
      );
    });

    it('accepts valid patient names', () => {
      expect(validatePatientName('Jane Doe')).toBeUndefined();
      expect(validatePatientName('Mary-Jane Watson')).toBeUndefined();
      expect(validatePatientName('A. B. C. Raman')).toBeUndefined();
    });
  });

  describe('validatePatientPhone', () => {
    it('is optional when blank', () => {
      expect(validatePatientPhone('')).toBeUndefined();
      expect(validatePatientPhone('   ')).toBeUndefined();
    });

    it('enforces 7 to 15 digits', () => {
      expect(validatePatientPhone('123456')).toBe('Phone number must be at least 7 digits.');
      expect(validatePatientPhone('1234567')).toBeUndefined();
      expect(validatePatientPhone('+919876543210')).toBeUndefined();
      expect(validatePatientPhone('1234567890123456')).toBe('Phone number cannot exceed 15 digits.');
    });

    it('rejects letters and special characters', () => {
      expect(validatePatientPhone('98765abcde')).toBe('Letters are not allowed in phone number.');
      expect(validatePatientPhone('98765#43210')).toBe('Special characters are not allowed in phone number.');
    });
  });

  describe('validatePatientEmail', () => {
    it('is optional when blank', () => {
      expect(validatePatientEmail('')).toBeUndefined();
    });

    it('rejects invalid email formats', () => {
      expect(validatePatientEmail('not-an-email')).toContain('valid email address');
      expect(validatePatientEmail('user@domain')).toContain('valid email address');
    });

    it('accepts valid emails', () => {
      expect(validatePatientEmail('patient@example.com')).toBeUndefined();
    });
  });

  describe('validatePatientHospital', () => {
    it('requires a hospital selection', () => {
      expect(validatePatientHospital('')).toBe('Please select an assigned hospital.');
      expect(validatePatientHospital('hosp-1')).toBeUndefined();
    });
  });

  describe('validatePatientPincode', () => {
    it('accepts 5 to 10 digits', () => {
      expect(validatePatientPincode('')).toBeUndefined();
      expect(validatePatientPincode('60001')).toBeUndefined();
      expect(validatePatientPincode('600040')).toBeUndefined();
    });

    it('rejects fewer than 5 digits or letters', () => {
      expect(validatePatientPincode('1234')).toBe('Pincode must be between 5 and 10 digits.');
      expect(validatePatientPincode('60000A')).toBe('Pincode must contain only numbers.');
    });
  });

  describe('validatePatientCity & validatePatientState', () => {
    it('accepts letters, spaces, and hyphens', () => {
      expect(validatePatientCity('New Delhi')).toBeUndefined();
      expect(validatePatientState('Tamil Nadu')).toBeUndefined();
    });

    it('rejects numbers in city or state', () => {
      expect(validatePatientCity('City 123')).toBe('Numbers are not allowed in city.');
      expect(validatePatientState('State 2')).toBe('Numbers are not allowed in state.');
    });
  });

  describe('validatePatientHeight & validatePatientWeight', () => {
    it('accepts valid ranges', () => {
      expect(validatePatientHeight('170')).toBeUndefined();
      expect(validatePatientWeight('65')).toBeUndefined();
    });

    it('rejects out-of-range values', () => {
      expect(validatePatientHeight('10')).toBe('Height must be between 20 cm and 300 cm.');
      expect(validatePatientHeight('350')).toBe('Height must be between 20 cm and 300 cm.');
      expect(validatePatientWeight('0')).toBe('Weight must be between 1 kg and 500 kg.');
      expect(validatePatientWeight('600')).toBe('Weight must be between 1 kg and 500 kg.');
    });
  });

  describe('validatePatientEmergencyContacts', () => {
    it('validates emergency name, phone, and relation', () => {
      expect(validatePatientEmergencyName('Jane Doe')).toBeUndefined();
      expect(validatePatientEmergencyName('Jane 123')).toBe('Numbers are not allowed in contact person name.');

      expect(validatePatientEmergencyPhone('+919876543210')).toBeUndefined();
      expect(validatePatientEmergencyPhone('123')).toBe('Emergency contact phone must be at least 7 digits.');
      expect(validatePatientEmergencyPhone('abc')).toBe('Letters are not allowed in emergency contact phone.');

      expect(validatePatientEmergencyRelation('Spouse')).toBeUndefined();
      expect(validatePatientEmergencyRelation('Parent/Guardian')).toBeUndefined();
      expect(validatePatientEmergencyRelation('123')).toBe('Relationship can only contain letters, spaces, and hyphens/slashes.');
    });
  });

  describe('validatePatientAddressLine and validatePatientImageUrl', () => {
    it('validates address line characters and length', () => {
      expect(validatePatientAddressLine('Suite 400, 2nd Floor')).toBeUndefined();
      expect(validatePatientAddressLine('A'.repeat(256))).toBe('Address line cannot exceed 255 characters.');
    });

    it('validates image url length', () => {
      expect(validatePatientImageUrl('https://example.com/pic.jpg')).toBeUndefined();
      expect(validatePatientImageUrl('A'.repeat(501))).toBe('Profile image URL cannot exceed 500 characters.');
    });
  });
});

describe('PatientModal Real-time Typing Sanitization and Form Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === 'hospitals') return Promise.resolve({ data: mockHospitals });
      if (url === 'branches') return Promise.resolve({ data: [] });
      if (url === 'user-accounts') return Promise.resolve({ data: [] });
      return Promise.resolve({ data: [] });
    });
  });

  it('strips letters and special characters typed into the phone field', async () => {
    renderWithProviders(
      <PatientModal isOpen={true} onClose={vi.fn()} patient={null} onSave={vi.fn()} />,
    );

    const phoneInput = screen.getByLabelText('Phone Number') as HTMLInputElement;

    // Type letters and special characters into phone
    fireEvent.change(phoneInput, { target: { value: 'abc+91#98765$43210' } });

    // Sanitizer removes abc, #, $ but keeps + and digits
    expect(phoneInput.value).toBe('+919876543210');
  });

  it('strips numbers and invalid symbols typed into patient full name', async () => {
    renderWithProviders(
      <PatientModal isOpen={true} onClose={vi.fn()} patient={null} onSave={vi.fn()} />,
    );

    const nameInput = screen.getByPlaceholderText(/e.g. John Doe/i) as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: 'Jane Doe 2nd #Best' } });

    expect(nameInput.value).toBe('Jane Doe nd Best');
  });

  it('strips non-digits typed into pincode', async () => {
    renderWithProviders(
      <PatientModal isOpen={true} onClose={vi.fn()} patient={null} onSave={vi.fn()} />,
    );

    const pinInput = screen.getByLabelText('Pincode / Postal Code') as HTMLInputElement;
    fireEvent.change(pinInput, { target: { value: '600abc040#' } });
    expect(pinInput.value).toBe('600040');
  });

  it('strips invalid characters in emergency phone and name', async () => {
    renderWithProviders(
      <PatientModal isOpen={true} onClose={vi.fn()} patient={null} onSave={vi.fn()} />,
    );

    const emNameInput = screen.getByLabelText('Contact Person Name') as HTMLInputElement;
    fireEvent.change(emNameInput, { target: { value: 'Mary 123 Doe!' } });
    expect(emNameInput.value).toBe('Mary  Doe');

    const emPhoneInput = screen.getByLabelText('Contact Phone') as HTMLInputElement;
    fireEvent.change(emPhoneInput, { target: { value: 'call98765#43210' } });
    expect(emPhoneInput.value).toBe('9876543210');
  });

  it('shows validation errors and prevents submit when required fields are missing', async () => {
    const handleSave = vi.fn();
    renderWithProviders(
      <PatientModal isOpen={true} onClose={vi.fn()} patient={null} onSave={handleSave} />,
    );

    const submitBtn = screen.getByRole('button', { name: /Register Patient/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Patient full name is required.').length).toBeGreaterThanOrEqual(1);
      expect(api).not.toHaveBeenCalledWith(expect.objectContaining({ method: 'POST' }));
    });
  });

  it('shows inline error when phone number has fewer than 7 digits on submit', async () => {
    renderWithProviders(
      <PatientModal isOpen={true} onClose={vi.fn()} patient={null} onSave={vi.fn()} />,
    );

    fireEvent.change(screen.getByPlaceholderText(/e.g. John Doe/i), {
      target: { value: 'Jane Doe' },
    });
    fireEvent.change(screen.getByLabelText(/Assigned Hospital/i), {
      target: { value: 'hosp-1' },
    });
    fireEvent.change(screen.getByLabelText('Phone Number'), {
      target: { value: '12345' },
    });

    const submitBtn = screen.getByRole('button', { name: /Register Patient/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Phone number must be at least 7 digits.').length).toBeGreaterThanOrEqual(1);
    });
  });
});

