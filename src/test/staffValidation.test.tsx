import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import StaffModal, {
  validateAddress,
  validateCustomRole,
  validateCustomShift,
  validateDocumentFile,
  validateDocumentTitle,
  validateJoiningDate,
  validateStaffAddressLine,
  validateStaffCity,
  validateStaffEmail,
  validateStaffName,
  validateStaffPhone,
  validateStaffPincode,
  validateStaffState,
} from '../components/StaffModal';
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

const mockBranches = [
  { id: 'branch-1', hospital_id: 'hosp-1', name: 'Main Campus', status: 'ACTIVE' },
];

describe('Staff Validation Unit & Integration Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateStaffName', () => {
    it('requires staff name', () => {
      expect(validateStaffName('')).toBe('Staff full name is required.');
      expect(validateStaffName('   ')).toBe('Staff full name is required.');
    });

    it('enforces min 2 chars and max 100 chars', () => {
      expect(validateStaffName('A')).toBe('Staff name must be at least 2 characters.');
      expect(validateStaffName('A'.repeat(101))).toBe('Staff name cannot exceed 100 characters.');
    });

    it('rejects numbers in staff name', () => {
      expect(validateStaffName('Nurse 101')).toBe('Numbers are not allowed in staff name.');
    });

    it('rejects special characters in staff name', () => {
      expect(validateStaffName('Mary@Joseph')).toBe('Special characters are not allowed in staff name.');
    });

    it('accepts valid staff names with alphabetic letters and spaces', () => {
      expect(validateStaffName('Sister Mary Joseph')).toBeUndefined();
      expect(validateStaffName('Rajesh Kumar')).toBeUndefined();
    });
  });

  describe('validateStaffPhone', () => {
    it('requires phone number', () => {
      expect(validateStaffPhone('')).toBe('Phone number is required.');
      expect(validateStaffPhone('   ')).toBe('Phone number is required.');
    });

    it('rejects letters in phone number', () => {
      expect(validateStaffPhone('98765abcde')).toBe('Letters are not allowed in phone number.');
    });

    it('rejects special characters in phone number', () => {
      expect(validateStaffPhone('98765#43210')).toBe('Special characters are not allowed in phone number.');
    });

    it('enforces 10 to 15 digits', () => {
      expect(validateStaffPhone('12345')).toBe('Phone number must contain at least 10 digits.');
      expect(validateStaffPhone('1234567890123456')).toBe('Phone number cannot exceed 15 digits.');
    });

    it('accepts valid phone numbers', () => {
      expect(validateStaffPhone('+91 98765 43210')).toBeUndefined();
      expect(validateStaffPhone('9876543210')).toBeUndefined();
    });
  });

  describe('validateStaffEmail', () => {
    it('is optional when empty or whitespace', () => {
      expect(validateStaffEmail('')).toBeUndefined();
      expect(validateStaffEmail('   ')).toBeUndefined();
    });

    it('rejects invalid email formats', () => {
      expect(validateStaffEmail('invalid-email')).toContain('valid email address');
      expect(validateStaffEmail('test@domain')).toContain('valid email address');
    });

    it('enforces max 150 chars', () => {
      const longEmail = 'a'.repeat(145) + '@test.com';
      expect(validateStaffEmail(longEmail)).toContain('cannot exceed 150 characters');
    });

    it('accepts valid email', () => {
      expect(validateStaffEmail('staff@hospital.com')).toBeUndefined();
    });
  });

  describe('validateJoiningDate', () => {
    it('requires date of joining', () => {
      expect(validateJoiningDate('')).toBe('Date of joining is required.');
    });

    it('validates date correctness and year range', () => {
      expect(validateJoiningDate('invalid-date')).toBe('Please select a valid date.');
      expect(validateJoiningDate('1850-01-01')).toBe('Please enter a valid year between 1970 and 2099.');
      expect(validateJoiningDate('2025-01-15')).toBeUndefined();
    });
  });

  describe('Address Validation Functions (Doctor Parity)', () => {
    describe('validateStaffAddressLine', () => {
      it('is optional when empty', () => {
        expect(validateStaffAddressLine('')).toBeUndefined();
      });

      it('enforces max 255 characters', () => {
        expect(validateStaffAddressLine('A'.repeat(256), 'Address line 1')).toContain('cannot exceed 255 characters');
      });

      it('rejects invalid characters', () => {
        expect(validateStaffAddressLine('12 Health Colony *!?', 'Address line 1')).toContain('contains invalid characters');
      });

      it('accepts valid address lines', () => {
        expect(validateStaffAddressLine('12/B, Health Colony, Near Apollo')).toBeUndefined();
        expect(validateStaffAddressLine('Flat #402, Block-C')).toBeUndefined();
      });
    });

    describe('validateStaffCity', () => {
      it('is optional when empty', () => {
        expect(validateStaffCity('')).toBeUndefined();
      });

      it('rejects numbers and symbols', () => {
        expect(validateStaffCity('Chennai 101')).toBe('Numbers are not allowed in city.');
        expect(validateStaffCity('Chennai@North')).toBe('City can only contain letters, spaces, and hyphens.');
      });

      it('accepts valid city names', () => {
        expect(validateStaffCity('Chennai')).toBeUndefined();
        expect(validateStaffCity('New-Delhi')).toBeUndefined();
      });
    });

    describe('validateStaffState', () => {
      it('is optional when empty', () => {
        expect(validateStaffState('')).toBeUndefined();
      });

      it('rejects numbers and symbols', () => {
        expect(validateStaffState('Tamil Nadu 1')).toBe('Numbers are not allowed in state.');
        expect(validateStaffState('Tamil_Nadu')).toBe('State can only contain letters, spaces, and hyphens.');
      });

      it('accepts valid state names', () => {
        expect(validateStaffState('Tamil Nadu')).toBeUndefined();
      });
    });

    describe('validateStaffPincode', () => {
      it('is optional when empty', () => {
        expect(validateStaffPincode('')).toBeUndefined();
      });

      it('rejects non-numeric characters', () => {
        expect(validateStaffPincode('60000A')).toBe('Pincode must contain only numbers.');
      });

      it('enforces length between 5 and 10 digits', () => {
        expect(validateStaffPincode('1234')).toBe('Pincode must be between 5 and 10 digits.');
        expect(validateStaffPincode('12345678901')).toBe('Pincode must be between 5 and 10 digits.');
      });

      it('accepts valid pincodes', () => {
        expect(validateStaffPincode('600028')).toBeUndefined();
      });
    });
  });

  describe('validateCustomRole & validateCustomShift', () => {
    it('validates custom role when active', () => {
      expect(validateCustomRole(false, '')).toBeUndefined();
      expect(validateCustomRole(true, '')).toBe('Custom role title is required.');
      expect(validateCustomRole(true, 'A')).toBe('Role title must be at least 2 characters.');
      expect(validateCustomRole(true, 'Role 123')).toBe('Numbers are not allowed in role title.');
      expect(validateCustomRole(true, 'Ward Head')).toBeUndefined();
    });

    it('validates custom shift when active', () => {
      expect(validateCustomShift('Morning', '')).toBeUndefined();
      expect(validateCustomShift('Custom Shift', '')).toContain('Custom shift working hours are required');
      expect(validateCustomShift('Custom Shift', '08:00 AM - 04:00 PM')).toBeUndefined();
    });
  });

  describe('validateAddress & Document Validation', () => {
    it('validates combined address string fallback', () => {
      expect(validateAddress('')).toBeUndefined();
      expect(validateAddress('123')).toBe('Address must be at least 5 characters if provided.');
      expect(validateAddress('12 Health Colony, Chennai')).toBeUndefined();
      expect(validateAddress('A'.repeat(501))).toBe('Address cannot exceed 500 characters.');
    });

    it('validates document title', () => {
      expect(validateDocumentTitle('')).toBe('Document title is required.');
      expect(validateDocumentTitle('A')).toBe('Document title must be at least 2 characters.');
      expect(validateDocumentTitle('12345')).toContain('must contain at least one letter');
      expect(validateDocumentTitle('Nursing Degree')).toBeUndefined();
    });

    it('validates document file extension and size', () => {
      const validFile = new File(['test'], 'cert.pdf', { type: 'application/pdf' });
      expect(validateDocumentFile(validFile)).toBeUndefined();

      const invalidFile = new File(['test'], 'cert.exe', { type: 'application/octet-stream' });
      expect(validateDocumentFile(invalidFile)).toContain('Unsupported file format');
    });
  });

  describe('StaffModal Real-time Sanitization & Drawer Validation', () => {
    beforeEach(() => {
      vi.mocked(api.get).mockImplementation((url: string) => {
        if (url.includes('hospitals')) return Promise.resolve({ data: mockHospitals });
        if (url.includes('branches')) return Promise.resolve({ data: mockBranches });
        return Promise.resolve({ data: [] });
      });
    });

    it('sanitizes city, state, and pincode in real-time as user types', async () => {
      renderWithProviders(
        <StaffModal isOpen={true} onClose={vi.fn()} staff={null} onSave={vi.fn()} />,
      );

      const cityInput = screen.getByLabelText(/City \/ Town/i) as HTMLInputElement;
      const stateInput = screen.getByLabelText(/State \/ Province/i) as HTMLInputElement;
      const pincodeInput = screen.getByLabelText(/Pincode \/ Postal Code/i) as HTMLInputElement;

      // City strips numbers and invalid chars
      fireEvent.change(cityInput, { target: { value: 'Chennai 123!@#' } });
      expect(cityInput.value).toBe('Chennai ');

      // State strips numbers and invalid chars
      fireEvent.change(stateInput, { target: { value: 'Tamil Nadu 456$%^' } });
      expect(stateInput.value).toBe('Tamil Nadu ');

      // Pincode strips non-numeric chars and caps at 10 digits
      fireEvent.change(pincodeInput, { target: { value: '600028ABC12345' } });
      expect(pincodeInput.value).toBe('6000281234');
    });

    it('shows inline validation error and has-error class on blur when required field is empty', async () => {
      renderWithProviders(
        <StaffModal isOpen={true} onClose={vi.fn()} staff={null} onSave={vi.fn()} />,
      );

      const nameInput = screen.getByPlaceholderText(/e\.g\. Sister Mary Joseph/i) as HTMLInputElement;
      fireEvent.focus(nameInput);
      fireEvent.blur(nameInput);

      expect(screen.getByText('Staff full name is required.')).toBeInTheDocument();
      expect(nameInput).toHaveClass('has-error');
    });

    it('clears inline validation error once valid text is typed into the field', async () => {
      renderWithProviders(
        <StaffModal isOpen={true} onClose={vi.fn()} staff={null} onSave={vi.fn()} />,
      );

      const nameInput = screen.getByPlaceholderText(/e\.g\. Sister Mary Joseph/i) as HTMLInputElement;
      fireEvent.focus(nameInput);
      fireEvent.blur(nameInput);
      expect(screen.getByText('Staff full name is required.')).toBeInTheDocument();

      fireEvent.change(nameInput, { target: { value: 'Sister Mary' } });
      expect(screen.queryByText('Staff full name is required.')).not.toBeInTheDocument();
      expect(nameInput).not.toHaveClass('has-error');
    });

    it('prevents form submission when required name or phone are missing', async () => {
      const handleSave = vi.fn();
      renderWithProviders(
        <StaffModal isOpen={true} onClose={vi.fn()} staff={null} onSave={handleSave} />,
      );

      const submitBtn = screen.getByRole('button', { name: /Register Staff/i });
      fireEvent.click(submitBtn);

      expect(screen.getAllByText('Staff full name is required.').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Phone number is required.').length).toBeGreaterThanOrEqual(1);
      expect(api.post).not.toHaveBeenCalled();
      expect(handleSave).not.toHaveBeenCalled();
    });

    it('submits successfully when all fields are valid', async () => {
      vi.mocked(api.post).mockResolvedValue({ data: { data: { id: 'staff-new-1' } } });
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      renderWithProviders(
        <StaffModal isOpen={true} onClose={handleClose} staff={null} onSave={handleSave} />,
      );

      fireEvent.change(screen.getByPlaceholderText(/e\.g\. Sister Mary Joseph/i), {
        target: { value: 'Sister Mary Joseph' },
      });
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. \+91 98765 43210/i), {
        target: { value: '+91 9876543210' },
      });
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. staff@hospital\.com/i), {
        target: { value: 'mary@hospital.com' },
      });
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. 12\/B Health Colony/i), {
        target: { value: '12 Health Colony' },
      });
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. Chennai/i), {
        target: { value: 'Chennai' },
      });
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. Tamil Nadu/i), {
        target: { value: 'Tamil Nadu' },
      });
      fireEvent.change(screen.getByPlaceholderText(/e\.g\. 600006/i), {
        target: { value: '600028' },
      });

      const submitBtn = screen.getByRole('button', { name: /Register Staff/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          'staff',
          expect.objectContaining({
            name: 'Sister Mary Joseph',
            phone: '+91 9876543210',
            email: 'mary@hospital.com',
            address_line_1: '12 Health Colony',
            city: 'Chennai',
            state: 'Tamil Nadu',
            pincode: '600028',
          }),
        );
        expect(handleSave).toHaveBeenCalledTimes(1);
        expect(handleClose).toHaveBeenCalledTimes(1);
      });
    });
  });
});
