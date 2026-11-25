import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ReferralModal, { type Referral } from '../components/ReferralModal';
import Referrals from '../pages/Referrals';
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

const mockReferral: Referral = {
  id: 'ref-001',
  name: 'Dr. Sarah Connor',
  phone: '9876543210',
  email: 'sarah.connor@example.com',
  gender: 'FEMALE',
  occupation: 'Cardiologist',
  profile_image_url: 'https://example.com/avatar.jpg',
  address_line_1: '123 Medical Centre Road',
  address_line_2: 'Suite 405',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600001',
  status: 'ACTIVE',
  notes: 'Key referral partner in central Chennai',
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-02T10:00:00.000Z',
};

describe('ReferralModal & Referrals Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ReferralModal', () => {
    it('renders create modal with all 11 required/optional fields and section headers', () => {
      renderWithProviders(
        <ReferralModal isOpen={true} onClose={vi.fn()} referral={null} onSave={vi.fn()} />,
      );

      expect(screen.getAllByText('Register New Referral').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Enter referral partner details, contact info, occupation, and verified address/i)).toBeInTheDocument();

      // Check sections
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Address Details')).toBeInTheDocument();
      expect(screen.getByText('Account & Status')).toBeInTheDocument();

      // Check all 11 fields
      expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Gender')).toBeInTheDocument();
      expect(screen.getByLabelText('Occupation / Specialty')).toBeInTheDocument();
      expect(screen.getByLabelText(/Phone Number/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Address Line 1/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Address Line 2/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/City \/ Town/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/State \/ Province/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Pincode \/ Postal Code/i)).toBeInTheDocument();

      // Check Status toggles
      expect(screen.getByText('Active in Referral Network')).toBeInTheDocument();
    });

    it('populates fields when editing an existing referral and submits update', async () => {
      vi.mocked(api.put).mockResolvedValueOnce({
        data: { data: { ...mockReferral, name: 'Dr. Sarah Connor Updated' } },
      });

      const onSaveMock = vi.fn();
      renderWithProviders(
        <ReferralModal
          isOpen={true}
          onClose={vi.fn()}
          referral={mockReferral}
          onSave={onSaveMock}
        />,
      );

      expect(screen.getByDisplayValue('Dr. Sarah Connor')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Cardiologist')).toBeInTheDocument();
      expect(screen.getByDisplayValue('9876543210')).toBeInTheDocument();
      expect(screen.getByDisplayValue('sarah.connor@example.com')).toBeInTheDocument();
      expect(screen.getByDisplayValue('123 Medical Centre Road')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Suite 405')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Chennai')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Tamil Nadu')).toBeInTheDocument();
      expect(screen.getByDisplayValue('600001')).toBeInTheDocument();

      // Modify name
      const nameInput = screen.getByLabelText(/Full Name/i);
      fireEvent.change(nameInput, { target: { value: 'Dr. Sarah Connor Updated' } });

      const saveBtn = screen.getByRole('button', { name: /Save Changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith(
          'referrals/ref-001',
          expect.objectContaining({
            name: 'Dr. Sarah Connor Updated',
            occupation: 'Cardiologist',
            phone: '9876543210',
            email: 'sarah.connor@example.com',
            city: 'Chennai',
            state: 'Tamil Nadu',
            pincode: '600001',
          }),
        );
        expect(onSaveMock).toHaveBeenCalled();
      });
    });

    it('validates required fields on create before submission', async () => {
      renderWithProviders(
        <ReferralModal isOpen={true} onClose={vi.fn()} referral={null} onSave={vi.fn()} />,
      );

      const submitBtn = screen.getByRole('button', { name: /Register Referral/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Full name is required.')).toBeInTheDocument();
        expect(screen.getByText('Phone number is required.')).toBeInTheDocument();
      });

      expect(api.post).not.toHaveBeenCalled();
    });
  });

  describe('Referrals Page with DataView', () => {
    it('fetches and displays referrals using DataView', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: [mockReferral],
      });

      renderWithProviders(<Referrals />);

      await waitFor(() => {
        expect(api.get).toHaveBeenCalledWith('referrals');
      });

      // Confirm referral partner appears in DataView
      await waitFor(() => {
        expect(screen.getByText('Dr. Sarah Connor')).toBeInTheDocument();
      });

      expect(screen.getAllByText('Cardiologist').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('9876543210')).toBeInTheDocument();
    });
  });
});
