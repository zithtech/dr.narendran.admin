import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LabModal, { type Lab } from '../components/LabModal';
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

const mockLab: Lab = {
  id: 'lab-001',
  name: 'Metropolis Diagnostics Center',
  address_line_1: 'Plot 42, Medical Enclave',
  address_line_2: 'Anna Nagar West',
  city: 'Chennai',
  state: 'Tamil Nadu',
  pincode: '600040',
  phone: '+91 44 2829 0250',
  email: 'reports@metropolislab.com',
  map_link: 'https://maps.google.com/?q=metropolis',
  start_time: '07:00',
  end_time: '21:00',
  services: [
    { id: 'srv-1', name: 'Complete Blood Count (CBC)' },
    { id: 'srv-2', name: 'Lipid Profile' },
  ],
  status: 'ACTIVE',
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-02T10:00:00.000Z',
};

const mockAvailableServices = [
  { id: 'srv-1', name: 'Complete Blood Count (CBC)', status: 'ACTIVE' },
  { id: 'srv-2', name: 'Lipid Profile', status: 'ACTIVE' },
  { id: 'srv-3', name: 'Thyroid Panel', status: 'ACTIVE' },
];

describe('Linked Lab Create/Edit Drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: mockAvailableServices });
  });

  it('renders create drawer with modern header, section cards, status options, and fields', async () => {
    renderWithProviders(
      <LabModal isOpen={true} onClose={vi.fn()} lab={null} onSave={vi.fn()} />,
    );

    expect(screen.getAllByText('Create Linked Lab').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Register a diagnostic laboratory or pathology center/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Laboratory \/ Diagnostic Center Name/i)).toBeInTheDocument();
    expect(screen.getByText(/Laboratory Information/i)).toBeInTheDocument();
    expect(screen.getByText(/Location & Physical Address/i)).toBeInTheDocument();
    expect(screen.getByText(/Operating Hours & Timing/i)).toBeInTheDocument();
    expect(screen.getByText(/Diagnostic Services Offered/i)).toBeInTheDocument();
    expect(screen.getByText(/Referral Status & Visibility/i)).toBeInTheDocument();
    expect(screen.getByText('Active for Referrals')).toBeInTheDocument();
    expect(screen.getByText('Inactive / Suspended')).toBeInTheDocument();
  });

  it('renders edit drawer with populated lab data and saves changes', async () => {
    vi.mocked(api).mockResolvedValue({ data: { success: true } });
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    renderWithProviders(
      <LabModal isOpen={true} onClose={handleClose} lab={mockLab} onSave={handleSave} />,
    );

    expect(screen.getByText('Edit Linked Lab')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Metropolis Diagnostics Center')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Plot 42, Medical Enclave')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Chennai')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+91 44 2829 0250')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: 'labs/lab-001',
          data: expect.objectContaining({
            name: 'Metropolis Diagnostics Center',
            city: 'Chennai',
            status: 'ACTIVE',
          }),
        }),
      );
      expect(handleSave).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('creates a new linked lab with valid inputs', async () => {
    vi.mocked(api).mockResolvedValue({ data: { id: 'new-lab', success: true } });
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    renderWithProviders(
      <LabModal isOpen={true} onClose={handleClose} lab={null} onSave={handleSave} />,
    );

    const nameInput = screen.getByLabelText(/Laboratory \/ Diagnostic Center Name/i);
    fireEvent.change(nameInput, { target: { value: 'Apollo Diagnostics Anna Nagar' } });

    const phoneInput = screen.getByPlaceholderText(/e\.g\. \+91 44 2829 0250/i);
    fireEvent.change(phoneInput, { target: { value: '+91 44 1122 3344' } });

    const submitBtn = screen.getByRole('button', { name: /Create Linked Lab/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'labs',
          data: expect.objectContaining({
            name: 'Apollo Diagnostics Anna Nagar',
            phone: '+91 44 1122 3344',
            status: 'ACTIVE',
          }),
        }),
      );
      expect(handleSave).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('validates that laboratory name is required', async () => {
    renderWithProviders(
      <LabModal isOpen={true} onClose={vi.fn()} lab={null} onSave={vi.fn()} />,
    );

    const submitBtn = screen.getByRole('button', { name: /Create Linked Lab/i });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(screen.getByText(/Laboratory name is required/i)).toBeInTheDocument();
  });
});
