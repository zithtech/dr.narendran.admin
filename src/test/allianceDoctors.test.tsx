import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AllianceDoctorDrawer from '../components/AllianceDoctorDrawer';
import AllianceDoctorModal, {
  validateAllianceDoctorEmail,
  validateAllianceDoctorExperience,
  validateAllianceDoctorName,
  validateAllianceDoctorPhone,
  validateAllianceDoctorPincode,
} from '../components/AllianceDoctorModal';
import AllianceSettingsDrawer from '../components/AllianceSettingsDrawer';
import AllianceDoctorsPage from '../pages/AllianceDoctorsPage';
import type { AllianceCategory, AllianceDoctor, AllianceSpecialization } from '../types/allianceDoctor';
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

const mockAllianceDoctor: AllianceDoctor = {
  id: 'ad-001',
  name: 'Dr. Ramesh Kumar',
  category: 'Cardiology Specialist',
  specialization: 'Interventional Cardiology',
  qualification: 'MBBS, MD, DM',
  experience_years: 15,
  gender: 'MALE',
  mobile_number: '+91 98765 43210',
  alternate_mobile_number: '+91 91234 56789',
  email: 'ramesh.kumar@cardio.com',
  address_line_1: 'No. 45, Anna Salai',
  address_line_2: 'Mount Road',
  city: 'Chennai',
  district: 'Chennai',
  state: 'Tamil Nadu',
  country: 'India',
  pincode: '600002',
  hospital_clinic_name: 'Apollo Hospital',
  registration_number: 'MCI-2010-98765',
  description: 'Chief consultant for cardiology alliances.',
  status: 'ACTIVE',
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-02T10:00:00.000Z',
};

const mockCategories: AllianceCategory[] = [
  { id: 'cat-1', name: 'Cardiology Specialist', description: 'Heart care', status: 'ACTIVE', created_at: '2026-11-01' },
  { id: 'cat-2', name: 'Orthopedics', description: 'Bones care', status: 'ACTIVE', created_at: '2026-11-01' },
];

const mockSpecializations: AllianceSpecialization[] = [
  { id: 'spec-1', name: 'Interventional Cardiology', description: 'Heart catheter', status: 'ACTIVE', created_at: '2026-11-01' },
  { id: 'spec-2', name: 'Joint Replacement', description: 'Knee and hip', status: 'ACTIVE', created_at: '2026-11-01' },
];

describe('Alliance Doctors Module Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validation Functions', () => {
    it('validates doctor name correctly', () => {
      expect(validateAllianceDoctorName('')).toBe('Doctor full name is required.');
      expect(validateAllianceDoctorName('A')).toBe('Doctor name must be at least 2 characters.');
      expect(validateAllianceDoctorName('Dr. 123')).toBe('Numbers are not allowed in doctor name.');
      expect(validateAllianceDoctorName('Dr. Ramesh Kumar')).toBeUndefined();
    });

    it('validates phone and alternate mobile numbers', () => {
      expect(validateAllianceDoctorPhone('abc', 'Mobile number')).toBe(
        'Letters are not allowed in mobile number.',
      );
      expect(validateAllianceDoctorPhone('123', 'Mobile number')).toBe(
        'Mobile number must be at least 7 digits.',
      );
      expect(validateAllianceDoctorPhone('+91 98765 43210', 'Mobile number')).toBeUndefined();
    });

    it('validates email correctly', () => {
      expect(validateAllianceDoctorEmail('invalid-email')).toBe(
        'Please enter a valid email address (e.g. doctor@example.com).',
      );
      expect(validateAllianceDoctorEmail('valid.doctor@hospital.com')).toBeUndefined();
    });

    it('validates experience correctly', () => {
      expect(validateAllianceDoctorExperience('abc')).toBe('Experience must contain only numbers.');
      expect(validateAllianceDoctorExperience('75')).toBe('Experience cannot exceed 70 years.');
      expect(validateAllianceDoctorExperience('15')).toBeUndefined();
    });

    it('validates pincode correctly', () => {
      expect(validateAllianceDoctorPincode('abc')).toBe('Pincode must contain only numbers.');
      expect(validateAllianceDoctorPincode('12')).toBe('Pincode must be between 4 and 10 digits.');
      expect(validateAllianceDoctorPincode('600001')).toBeUndefined();
    });
  });

  describe('Alliance Doctor Modal (Add / Edit Form with Dynamic Dropdowns)', () => {
    it('renders all sections A, B, C, D and loads Category & Specialization options', async () => {
      (api.get as any).mockImplementation((url: string) => {
        if (url === 'alliances/categories') return Promise.resolve({ data: { data: mockCategories } });
        if (url === 'alliances/specializations') return Promise.resolve({ data: { data: mockSpecializations } });
        return Promise.resolve({ data: [] });
      });

      renderWithProviders(
        <AllianceDoctorModal isOpen={true} onClose={vi.fn()} doctor={null} onSave={vi.fn()} />,
      );

      // Section A: Doctor Information
      expect(screen.getByText('A. Doctor Information')).toBeInTheDocument();
      expect(screen.getByLabelText(/Doctor Name/i)).toBeInTheDocument();
      expect(screen.getByText(/^Category$/i)).toBeInTheDocument();
      expect(screen.getByText(/^Specialization$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Qualification/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Experience \(Years\)/i)).toBeInTheDocument();
      expect(screen.getByText('Gender')).toBeInTheDocument();

      // Section B: Contact Information
      expect(screen.getByText('B. Contact Information')).toBeInTheDocument();
      expect(screen.getByLabelText(/^Mobile Number$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Alternate Mobile Number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();

      // Section C: Address Information (Separate individual fields)
      expect(screen.getByText('C. Address Information')).toBeInTheDocument();
      expect(screen.getByLabelText(/Address Line 1/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Address Line 2/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^City$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^District$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^State$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Country$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^Pincode$/i)).toBeInTheDocument();

      // Section D: Other Information
      expect(screen.getByText('D. Other Information')).toBeInTheDocument();
      expect(screen.getByLabelText(/Hospital \/ Clinic Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Registration Number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description \/ Notes/i)).toBeInTheDocument();
      expect(screen.getByText('Doctor Alliance Status')).toBeInTheDocument();
    });

    it('allows adding a custom category directly from the doctor form', async () => {
      (api.get as any).mockImplementation((url: string) => {
        if (url === 'alliances/categories') return Promise.resolve({ data: { data: mockCategories } });
        if (url === 'alliances/specializations') return Promise.resolve({ data: { data: mockSpecializations } });
        return Promise.resolve({ data: [] });
      });

      (api.post as any).mockResolvedValueOnce({
        data: { data: { id: 'cat-new', name: 'Pediatric Surgery', status: 'ACTIVE' } },
      });

      renderWithProviders(
        <AllianceDoctorModal isOpen={true} onClose={vi.fn()} doctor={null} onSave={vi.fn()} />,
      );

      const addButtons = screen.getAllByRole('button', { name: /Add New/i });
      fireEvent.click(addButtons[0]!); // Click Add New Category

      const input = screen.getByPlaceholderText(/Enter new category name/i);
      expect(input).toBeInTheDocument();
      fireEvent.change(input, { target: { value: 'Pediatric Surgery' } });

      const saveBtn = screen.getByRole('button', { name: /^Add$/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith('alliances/categories', {
          name: 'Pediatric Surgery',
        });
      });
    });

    it('submits create doctor form successfully with API POST', async () => {
      const onSave = vi.fn();
      const onClose = vi.fn();
      (api.get as any).mockResolvedValue({ data: { data: [] } });
      (api.post as any).mockResolvedValueOnce({
        data: { status: 'success', data: mockAllianceDoctor },
      });

      renderWithProviders(
        <AllianceDoctorModal isOpen={true} onClose={onClose} doctor={null} onSave={onSave} />,
      );

      fireEvent.change(screen.getByLabelText(/Doctor Name/i), {
        target: { value: 'Dr. Ramesh Kumar' },
      });
      fireEvent.change(screen.getByLabelText(/Qualification/i), {
        target: { value: 'MBBS, MD, DM' },
      });
      fireEvent.change(screen.getByLabelText(/^Mobile Number$/i), {
        target: { value: '+91 98765 43210' },
      });
      fireEvent.change(screen.getByLabelText(/^City$/i), {
        target: { value: 'Chennai' },
      });

      fireEvent.click(screen.getByRole('button', { name: /Create Alliance Doctor/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          'alliances/doctors',
          expect.objectContaining({
            name: 'Dr. Ramesh Kumar',
            qualification: 'MBBS, MD, DM',
            mobile_number: '+91 98765 43210',
            city: 'Chennai',
          }),
        );
        expect(onSave).toHaveBeenCalled();
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Alliance Settings Drawer (Category & Specialization CRUD)', () => {
    it('renders categories and specializations tabs and allows adding a new category', async () => {
      (api.get as any).mockImplementation((url: string) => {
        if (url === 'alliances/categories') return Promise.resolve({ data: { data: mockCategories } });
        if (url === 'alliances/specializations') return Promise.resolve({ data: { data: mockSpecializations } });
        return Promise.resolve({ data: [] });
      });

      (api.post as any).mockResolvedValueOnce({
        data: { data: { id: 'cat-3', name: 'Neurology', status: 'ACTIVE' } },
      });

      const onUpdated = vi.fn();
      renderWithProviders(
        <AllianceSettingsDrawer isOpen={true} onClose={vi.fn()} onUpdated={onUpdated} />,
      );

      expect(screen.getByText('Alliances Settings')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Specialization')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText('Cardiology Specialist')).toBeInTheDocument();
        expect(screen.getByText('Orthopedics')).toBeInTheDocument();
      });

      // Click Add Category button
      fireEvent.click(screen.getByRole('button', { name: /Add Category/i }));

      const nameInput = screen.getByPlaceholderText(/Cardiology, Orthopedics/i);
      fireEvent.change(nameInput, { target: { value: 'Neurology' } });

      fireEvent.click(screen.getByRole('button', { name: /Save Category/i }));

      await waitFor(() => {
        expect(api.post).toHaveBeenCalledWith(
          'alliances/categories',
          expect.objectContaining({ name: 'Neurology', status: 'ACTIVE' }),
        );
        expect(onUpdated).toHaveBeenCalled();
      });
    });

    it('switches to Specialization tab and displays specializations', async () => {
      (api.get as any).mockImplementation((url: string) => {
        if (url === 'alliances/categories') return Promise.resolve({ data: { data: mockCategories } });
        if (url === 'alliances/specializations') return Promise.resolve({ data: { data: mockSpecializations } });
        return Promise.resolve({ data: [] });
      });

      renderWithProviders(
        <AllianceSettingsDrawer isOpen={true} onClose={vi.fn()} />,
      );

      // Switch to Specialization tab
      const specTab = screen.getByRole('button', { name: /Specialization/i });
      fireEvent.click(specTab);

      await waitFor(() => {
        expect(screen.getByText('Interventional Cardiology')).toBeInTheDocument();
        expect(screen.getByText('Joint Replacement')).toBeInTheDocument();
      });
    });
  });

  describe('Alliance Doctor Details Drawer', () => {
    it('renders all sections and doctor details accurately', () => {
      renderWithProviders(
        <AllianceDoctorDrawer
          doctor={mockAllianceDoctor}
          onClose={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />,
      );

      expect(screen.getAllByText('Dr. Ramesh Kumar').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Cardiology Specialist').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Interventional Cardiology').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('MBBS, MD, DM').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('15 Years').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('+91 98765 43210')).toBeInTheDocument();
      expect(screen.getAllByText('Chennai').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Apollo Hospital').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByRole('button', { name: /Edit Doctor/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
    });
  });

  describe('Alliance Doctors List Page with Settings Action', () => {
    it('renders table columns, Settings icon button, and opens settings drawer when clicked', async () => {
      (api.get as any).mockImplementation((url: string) => {
        if (url.includes('alliances/doctors')) {
          return Promise.resolve({
            data: { status: 'success', data: [mockAllianceDoctor], total: 1 },
          });
        }
        return Promise.resolve({ data: { data: [] } });
      });

      renderWithProviders(<AllianceDoctorsPage />);

      expect(screen.getByText('Alliances – Doctor Management')).toBeInTheDocument();
      expect(screen.getByText('Add Alliance Doctor')).toBeInTheDocument();

      // Find Settings icon button right side of Add Alliance Doctor
      const settingsButton = screen.getByRole('button', { name: /Settings/i });
      expect(settingsButton).toBeInTheDocument();

      // Click settings button
      fireEvent.click(settingsButton);

      await waitFor(() => {
        expect(screen.getByText('Alliances Settings')).toBeInTheDocument();
      });
    });
  });
});
