import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import DoctorModal, {
  validateDoctorAddressLine,
  validateDoctorCity,
  validateDoctorEmail,
  validateDoctorExperience,
  validateDoctorHospital,
  validateDoctorImageUrl,
  validateDoctorName,
  validateDoctorPhone,
  validateDoctorPincode,
  validateDoctorPodcastUrl,
  validateDoctorQualification,
  validateDoctorRegistrationNumber,
  validateDoctorSpecialization,
  validateDoctorState,
} from '../components/DoctorModal';
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

describe('Doctor validation functions', () => {
  describe('validateDoctorName', () => {
    it('requires doctor name', () => {
      expect(validateDoctorName('')).toBe('Doctor full name is required.');
      expect(validateDoctorName('   ')).toBe('Doctor full name is required.');
    });

    it('enforces min 2 chars and max 100 chars', () => {
      expect(validateDoctorName('A')).toBe('Doctor name must be at least 2 characters.');
      expect(validateDoctorName('A'.repeat(101))).toBe('Doctor name cannot exceed 100 characters.');
    });

    it('rejects numbers and disallowed special characters', () => {
      expect(validateDoctorName('Dr. John 2nd')).toBe('Numbers are not allowed in doctor name.');
      expect(validateDoctorName('Dr. John @ hospital')).toBe(
        'Doctor name can only contain letters, spaces, hyphens, and periods.',
      );
    });

    it('accepts valid doctor names', () => {
      expect(validateDoctorName('Dr. John Doe')).toBeUndefined();
      expect(validateDoctorName('Jane-Anne Smith-Jones')).toBeUndefined();
      expect(validateDoctorName('Dr. A. B. C. Raman')).toBeUndefined();
    });
  });

  describe('validateDoctorPhone', () => {
    it('is optional when blank', () => {
      expect(validateDoctorPhone('')).toBeUndefined();
      expect(validateDoctorPhone('   ')).toBeUndefined();
    });

    it('enforces 7 to 15 digits', () => {
      expect(validateDoctorPhone('123456')).toBe('Phone number must be at least 7 digits.');
      expect(validateDoctorPhone('1234567')).toBeUndefined();
      expect(validateDoctorPhone('+919876543210')).toBeUndefined();
      expect(validateDoctorPhone('1234567890123456')).toBe('Phone number cannot exceed 15 digits.');
    });

    it('rejects letters and special characters', () => {
      expect(validateDoctorPhone('98765abcde')).toBe('Letters are not allowed in phone number.');
      expect(validateDoctorPhone('98765#43210')).toBe('Special characters are not allowed in phone number.');
    });
  });

  describe('validateDoctorEmail', () => {
    it('is optional when blank', () => {
      expect(validateDoctorEmail('')).toBeUndefined();
    });

    it('rejects invalid email formats', () => {
      expect(validateDoctorEmail('not-an-email')).toContain('valid email address');
      expect(validateDoctorEmail('user@domain')).toContain('valid email address');
    });

    it('accepts valid emails', () => {
      expect(validateDoctorEmail('doctor@hospital.org')).toBeUndefined();
    });
  });

  describe('validateDoctorHospital', () => {
    it('requires a hospital selection', () => {
      expect(validateDoctorHospital('')).toBe('Please select an assigned hospital.');
      expect(validateDoctorHospital('hosp-1')).toBeUndefined();
    });
  });

  describe('validateDoctorExperience', () => {
    it('accepts 0 to 70 whole numbers', () => {
      expect(validateDoctorExperience('')).toBeUndefined();
      expect(validateDoctorExperience('0')).toBeUndefined();
      expect(validateDoctorExperience('15')).toBeUndefined();
      expect(validateDoctorExperience('70')).toBeUndefined();
    });

    it('rejects values above 70 or non-numeric', () => {
      expect(validateDoctorExperience('75')).toBe('Years of experience cannot exceed 70.');
      expect(validateDoctorExperience('abc')).toBe('Years of experience must contain only numbers.');
    });
  });

  describe('validateDoctorPincode', () => {
    it('accepts 5 to 10 digits', () => {
      expect(validateDoctorPincode('')).toBeUndefined();
      expect(validateDoctorPincode('60001')).toBeUndefined();
      expect(validateDoctorPincode('600040')).toBeUndefined();
    });

    it('rejects fewer than 5 digits or letters', () => {
      expect(validateDoctorPincode('1234')).toBe('Pincode must be between 5 and 10 digits.');
      expect(validateDoctorPincode('60000A')).toBe('Pincode must contain only numbers.');
    });
  });

  describe('validateDoctorCity & validateDoctorState', () => {
    it('accepts letters, spaces, and hyphens', () => {
      expect(validateDoctorCity('New Delhi')).toBeUndefined();
      expect(validateDoctorState('Tamil Nadu')).toBeUndefined();
    });

    it('rejects numbers in city or state', () => {
      expect(validateDoctorCity('Sector 14')).toBe('Numbers are not allowed in city.');
      expect(validateDoctorState('State 2')).toBe('Numbers are not allowed in state.');
    });
  });

  describe('validateDoctorRegistrationNumber', () => {
    it('accepts alphanumeric, hyphens, and slashes', () => {
      expect(validateDoctorRegistrationNumber('')).toBeUndefined();
      expect(validateDoctorRegistrationNumber('MCI-2018-98421')).toBeUndefined();
      expect(validateDoctorRegistrationNumber('TN/MED/12345')).toBeUndefined();
    });

    it('rejects symbols or < 3 chars', () => {
      expect(validateDoctorRegistrationNumber('AB')).toBe(
        'Registration number must be at least 3 characters.',
      );
      expect(validateDoctorRegistrationNumber('REG#1234')).toBe(
        'Medical registration number can only contain letters, numbers, hyphens, and slashes.',
      );
    });
  });

  describe('validateDoctorSpecialization & Qualification', () => {
    it('accepts letters and academic punctuation', () => {
      expect(validateDoctorSpecialization('Cardiologist (Interventional)')).toBeUndefined();
      expect(validateDoctorQualification('MBBS, MD, FRCP')).toBeUndefined();
    });

    it('rejects numbers in specialization and qualification', () => {
      expect(validateDoctorSpecialization('Cardio 101')).toBe('Numbers are not allowed in specialization.');
      expect(validateDoctorQualification('MD Level 2')).toBe('Numbers are not allowed in qualification.');
    });
  });

  describe('validateDoctorAddressLine, ImageUrl, and PodcastUrl', () => {
    it('validates address line characters and length', () => {
      expect(validateDoctorAddressLine('Suite 400, 2nd Floor')).toBeUndefined();
      expect(validateDoctorAddressLine('A'.repeat(256))).toBe('Address line cannot exceed 255 characters.');
    });

    it('validates image url and podcast url lengths', () => {
      expect(validateDoctorImageUrl('https://example.com/pic.jpg')).toBeUndefined();
      expect(validateDoctorImageUrl('A'.repeat(501))).toBe('Profile image URL cannot exceed 500 characters.');
      expect(validateDoctorPodcastUrl('https://youtube.com/@doc')).toBeUndefined();
      expect(validateDoctorPodcastUrl('A'.repeat(256))).toBe('Podcast link cannot exceed 255 characters.');
    });
  });
});

describe('DoctorModal Real-time Typing Sanitization and Form Validation', () => {
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
      <DoctorModal isOpen={true} onClose={vi.fn()} doctor={null} onSave={vi.fn()} />,
    );

    const phoneInput = screen.getByLabelText('Phone Number') as HTMLInputElement;

    // Type letters and special characters into phone
    fireEvent.change(phoneInput, { target: { value: 'abc+91#98765$43210' } });

    // Sanitizer removes abc, #, $ but keeps + and digits
    expect(phoneInput.value).toBe('+919876543210');
  });

  it('strips numbers and invalid symbols typed into doctor name', async () => {
    renderWithProviders(
      <DoctorModal isOpen={true} onClose={vi.fn()} doctor={null} onSave={vi.fn()} />,
    );

    const nameInput = screen.getByLabelText(/Doctor Full Name/i) as HTMLInputElement;

    fireEvent.change(nameInput, { target: { value: 'Dr. Jane Smith 2nd #Best' } });

    expect(nameInput.value).toBe('Dr. Jane Smith nd Best');
  });

  it('strips non-digits typed into pincode and years of experience', async () => {
    renderWithProviders(
      <DoctorModal isOpen={true} onClose={vi.fn()} doctor={null} onSave={vi.fn()} />,
    );

    const pinInput = screen.getByLabelText('Pincode / Postal Code') as HTMLInputElement;
    fireEvent.change(pinInput, { target: { value: '600abc040#' } });
    expect(pinInput.value).toBe('600040');

    const expInput = screen.getByLabelText('Years of Experience') as HTMLInputElement;
    fireEvent.change(expInput, { target: { value: '12yrs' } });
    expect(expInput.value).toBe('12');
  });

  it('shows validation errors and prevents submit when required fields are missing', async () => {
    const handleSave = vi.fn();
    renderWithProviders(
      <DoctorModal isOpen={true} onClose={vi.fn()} doctor={null} onSave={handleSave} />,
    );

    const submitBtn = screen.getByRole('button', { name: /Create Doctor/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Doctor full name is required.').length).toBeGreaterThanOrEqual(1);
      expect(api).not.toHaveBeenCalledWith(expect.objectContaining({ method: 'POST' }));
    });
  });

  it('shows inline error when phone number has fewer than 7 digits on submit', async () => {
    renderWithProviders(
      <DoctorModal isOpen={true} onClose={vi.fn()} doctor={null} onSave={vi.fn()} />,
    );

    fireEvent.change(screen.getByLabelText(/Doctor Full Name/i), {
      target: { value: 'Dr. Jane Smith' },
    });
    fireEvent.change(screen.getByLabelText(/Assigned Hospital/i), {
      target: { value: 'hosp-1' },
    });
    fireEvent.change(screen.getByLabelText('Phone Number'), {
      target: { value: '12345' },
    });

    const submitBtn = screen.getByRole('button', { name: /Create Doctor/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getAllByText('Phone number must be at least 7 digits.').length).toBeGreaterThanOrEqual(1);
    });
  });
});
