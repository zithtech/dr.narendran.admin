import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import HospitalModal, { type Hospital } from '../components/HospitalModal';
import api from '../utils/api';
import { renderWithProviders } from './renderWithProviders';

vi.mock('../utils/api', () => ({
  default: vi.fn(),
}));

const mockHospital: Hospital = {
  id: 'hosp-1',
  name: 'Apollo Multi-Specialty Hospital',
  hospital_code: 'HSP-001',
  address: '21 Greams Lane, Thousand Lights, Chennai',
  phone: '+91 44 2829 0200',
  email: 'info@apollohospital.org',
  status: 'ACTIVE',
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-02T10:00:00.000Z',
};

describe('Hospital Create/Edit Drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create drawer with modern header, fields, category helpers, and status options', () => {
    const handleClose = vi.fn();
    const handleSave = vi.fn();

    renderWithProviders(
      <HospitalModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
        hospital={null}
      />
    );

    expect(screen.getByText('Create New Hospital')).toBeInTheDocument();
    expect(
      screen.getByText(/Register a healthcare facility or hospital system on the platform/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Hospital Name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Apollo Multi-Specialty Hospital/i)).toBeInTheDocument();
    expect(screen.getByText(/Auto-generated \(e\.g\. HSP-001\)/i)).toBeInTheDocument();

    // Contact & Location
    expect(screen.getByLabelText(/Phone \/ Helpline/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Facility \/ Street Address/i)).toBeInTheDocument();

    // Status Cards
    expect(screen.getByText(/Active & Operational/i)).toBeInTheDocument();
    expect(screen.getByText(/Inactive \/ Suspended/i)).toBeInTheDocument();

    // Submit button
    expect(screen.getByRole('button', { name: /Create Hospital/i })).toBeInTheDocument();
  });

  it('renders edit drawer with pre-filled hospital data and code badge', () => {
    const handleClose = vi.fn();
    const handleSave = vi.fn();

    renderWithProviders(
      <HospitalModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
        hospital={mockHospital}
      />
    );

    expect(screen.getByText('Edit Hospital')).toBeInTheDocument();
    expect(screen.getAllByText(/HSP-001/i).length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('Apollo Multi-Specialty Hospital')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+91 44 2829 0200')).toBeInTheDocument();
    expect(screen.getByDisplayValue('info@apollohospital.org')).toBeInTheDocument();
    expect(screen.getByDisplayValue('21 Greams Lane, Thousand Lights, Chennai')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
  });

  it('validates hospital name is required and shows error on blur or submission', async () => {
    const handleClose = vi.fn();
    const handleSave = vi.fn();

    renderWithProviders(
      <HospitalModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
        hospital={null}
      />
    );

    const nameInput = screen.getByPlaceholderText(/e\.g\. Apollo Multi-Specialty Hospital/i);
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(screen.getByText('Hospital name is required.')).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Create Hospital/i });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(api).not.toHaveBeenCalled();
  });

  it('allows entering hospital name and updates input value', () => {
    renderWithProviders(
      <HospitalModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        hospital={null}
      />
    );

    const nameInput = screen.getByPlaceholderText(/e\.g\. Apollo Multi-Specialty Hospital/i);
    fireEvent.change(nameInput, { target: { value: 'Global Health Center' } });

    expect(screen.getByDisplayValue('Global Health Center')).toBeInTheDocument();
  });

  it('submits new hospital payload and triggers onSave callback', async () => {
    vi.mocked(api).mockResolvedValue({ data: { status: 'success' } });

    const handleClose = vi.fn();
    const handleSave = vi.fn();

    renderWithProviders(
      <HospitalModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
        hospital={null}
      />
    );

    const nameInput = screen.getByPlaceholderText(/e\.g\. Apollo Multi-Specialty Hospital/i);
    fireEvent.change(nameInput, { target: { value: 'City Central Hospital' } });

    const phoneInput = screen.getByPlaceholderText(/e\.g\. \+91 44 2829 0200/i);
    fireEvent.change(phoneInput, { target: { value: '+91 9876543210' } });

    const emailInput = screen.getByPlaceholderText(/e\.g\. contact@apollohospital\.org/i);
    fireEvent.change(emailInput, { target: { value: 'contact@citycentral.org' } });

    const addressInput = screen.getByPlaceholderText(/e\.g\. No\. 21 Greams Lane/i);
    fireEvent.change(addressInput, { target: { value: '45 Lake View Road, Bangalore' } });

    // Switch status to INACTIVE
    const inactiveBtn = screen.getByText(/Inactive \/ Suspended/i);
    fireEvent.click(inactiveBtn);

    const submitBtn = screen.getByRole('button', { name: /Create Hospital/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith({
        method: 'POST',
        url: 'hospitals',
        data: {
          name: 'City Central Hospital',
          phone: '+91 9876543210',
          email: 'contact@citycentral.org',
          address: '45 Lake View Road, Bangalore',
          status: 'INACTIVE',
        },
      });
      expect(handleSave).toHaveBeenCalled();
    });
  });
});
