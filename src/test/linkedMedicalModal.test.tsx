import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LinkedMedicalModal, { type LinkedMedical } from '../components/LinkedMedicalModal';
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

const mockMedical: LinkedMedical = {
  id: 'med-store-001',
  name: 'Apollo Pharmacy Greams Road',
  address_line_1: 'Shop No. 12, Ground Floor',
  address_line_2: 'Near Apollo Main Hospital',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600006',
  phone: '+91 44 2829 0250',
  email: 'orders@apollopharmacy.com',
  map_link: 'https://maps.google.com/?q=apollo+greams',
  start_time: '08:00',
  end_time: '23:00',
  status: 'ACTIVE',
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-02T10:00:00.000Z',
};

describe('Linked Medical Create/Edit Drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create drawer with modern header, section cards, status options, and fields', () => {
    renderWithProviders(
      <LinkedMedicalModal isOpen={true} onClose={vi.fn()} medical={null} onSave={vi.fn()} />,
    );

    expect(screen.getAllByText('Create Linked Medical').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Register a partner pharmacy or medical shop/i),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Pharmacy \/ Medical Store Name/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Pharmacy & Contact Details/i)).toBeInTheDocument();
    expect(screen.getByText(/Location & Physical Address/i)).toBeInTheDocument();
    expect(screen.getByText(/Operating Hours & Schedule/i)).toBeInTheDocument();
    expect(screen.getByText(/Referral Status & Visibility/i)).toBeInTheDocument();
    expect(screen.getByText('Active for Referrals')).toBeInTheDocument();
    expect(screen.getByText('Inactive / Suspended')).toBeInTheDocument();
  });

  it('renders edit drawer with populated pharmacy data and saves changes', async () => {
    vi.mocked(api).mockResolvedValue({ data: { success: true } });
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    renderWithProviders(
      <LinkedMedicalModal
        isOpen={true}
        onClose={handleClose}
        medical={mockMedical}
        onSave={handleSave}
      />,
    );

    expect(screen.getByText('Edit Linked Medical')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Apollo Pharmacy Greams Road')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Shop No. 12, Ground Floor')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Chennai')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+91 44 2829 0250')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: 'linked-medicals/med-store-001',
          data: expect.objectContaining({
            name: 'Apollo Pharmacy Greams Road',
            city: 'Chennai',
            status: 'ACTIVE',
          }),
        }),
      );
      expect(handleSave).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('creates a new linked medical pharmacy with valid inputs', async () => {
    vi.mocked(api).mockResolvedValue({ data: { id: 'new-med', success: true } });
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    renderWithProviders(
      <LinkedMedicalModal isOpen={true} onClose={handleClose} medical={null} onSave={handleSave} />,
    );

    const nameInput = screen.getByLabelText(/Pharmacy \/ Medical Store Name/i);
    fireEvent.change(nameInput, { target: { value: 'MedPlus Pharmacy Anna Nagar' } });

    const phoneInput = screen.getByPlaceholderText(/e\.g\. \+91 44 2829 0250/i);
    fireEvent.change(phoneInput, { target: { value: '+91 44 9988 7766' } });

    const submitBtn = screen.getByRole('button', { name: /Create Linked Medical/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'linked-medicals',
          data: expect.objectContaining({
            name: 'MedPlus Pharmacy Anna Nagar',
            phone: '+91 44 9988 7766',
            status: 'ACTIVE',
          }),
        }),
      );
      expect(handleSave).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('validates that pharmacy name is required', async () => {
    renderWithProviders(
      <LinkedMedicalModal isOpen={true} onClose={vi.fn()} medical={null} onSave={vi.fn()} />,
    );

    const submitBtn = screen.getByRole('button', { name: /Create Linked Medical/i });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(screen.getByText(/Pharmacy or medical store name is required/i)).toBeInTheDocument();
  });
});

