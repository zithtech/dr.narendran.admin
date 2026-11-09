import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import BranchModal, { type Branch } from '../components/BranchModal';
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
    id: 'hosp-1',
    name: 'Apollo Multi-Specialty Hospital',
    hospital_code: 'HSP-001',
    status: 'ACTIVE' as const,
  },
  {
    id: 'hosp-2',
    name: 'Fortis Healthcare Center',
    hospital_code: 'HSP-002',
    status: 'ACTIVE' as const,
  },
];

const mockBranch: Branch = {
  id: 'branch-1',
  hospital_id: 'hosp-1',
  hospital_name: 'Apollo Multi-Specialty Hospital',
  branch_code: 'BRN-001',
  name: 'Apollo South Campus',
  address: 'Block C, South Wing, Greams Road, Chennai',
  phone: '+91 44 2829 0250',
  status: 'ACTIVE',
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-02T10:00:00.000Z',
};

describe('Branch Create/Edit Drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create drawer with parent hospital SearchableSelect, branch name, tags, and status cards', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockHospitals });

    const handleClose = vi.fn();
    const handleSave = vi.fn();

    renderWithProviders(
      <BranchModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
        branch={null}
      />
    );

    expect(screen.getByText('Create New Branch')).toBeInTheDocument();
    expect(
      screen.getByText(/Add a new hospital branch, satellite center or regional clinic/i)
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Parent Hospital System/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Branch Name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e\.g\. Apollo South Campus/i)).toBeInTheDocument();
    expect(screen.getByText(/Auto-generated \(e\.g\. BRN-001\)/i)).toBeInTheDocument();

    // Contact & Location
    expect(screen.getByLabelText(/Branch Phone \/ Reception Contact/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Branch \/ Street Address/i)).toBeInTheDocument();

    // Status cards
    expect(screen.getByText(/Active & Operational/i)).toBeInTheDocument();
    expect(screen.getByText(/Inactive \/ Suspended/i)).toBeInTheDocument();

    // Submit button
    expect(screen.getByRole('button', { name: /Create Branch/i })).toBeInTheDocument();
  });

  it('renders edit drawer with pre-filled branch data, hospital name, and code badge', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockHospitals });

    const handleClose = vi.fn();
    const handleSave = vi.fn();

    renderWithProviders(
      <BranchModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
        branch={mockBranch}
      />
    );

    expect(screen.getByText('Edit Branch')).toBeInTheDocument();
    expect(screen.getAllByText(/BRN-001/i).length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('Apollo South Campus')).toBeInTheDocument();
    expect(screen.getByDisplayValue('+91 44 2829 0250')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Block C, South Wing, Greams Road, Chennai')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
  });

  it('validates branch name is required and shows error on blur', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockHospitals });

    const handleClose = vi.fn();
    const handleSave = vi.fn();

    renderWithProviders(
      <BranchModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
        branch={null}
      />
    );

    const nameInput = screen.getByPlaceholderText(/e\.g\. Apollo South Campus/i);
    fireEvent.blur(nameInput);

    await waitFor(() => {
      expect(screen.getByText('Branch name is required.')).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /Create Branch/i });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(api).not.toHaveBeenCalled();
  });

  it('allows entering branch name and updates input value', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockHospitals });

    renderWithProviders(
      <BranchModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        branch={null}
      />
    );

    const nameInput = screen.getByPlaceholderText(/e\.g\. Apollo South Campus/i);
    fireEvent.change(nameInput, { target: { value: 'Apollo Emergency Care' } });

    expect(screen.getByDisplayValue('Apollo Emergency Care')).toBeInTheDocument();
  });

  it('selects parent hospital via SearchableSelect and submits new branch payload', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: mockHospitals });
    vi.mocked(api).mockResolvedValue({ data: { status: 'success' } });

    const handleClose = vi.fn();
    const handleSave = vi.fn();

    renderWithProviders(
      <BranchModal
        isOpen={true}
        onClose={handleClose}
        onSave={handleSave}
        branch={null}
      />
    );

    // Wait for hospital options to load
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Apollo Multi-Specialty Hospital/i })).toBeInTheDocument();
    });

    // Select parent hospital
    const hospitalSelect = screen.getByLabelText(/Parent Hospital System/i);
    fireEvent.change(hospitalSelect, { target: { value: 'hosp-1' } });

    // Enter branch name
    const nameInput = screen.getByPlaceholderText(/e\.g\. Apollo South Campus/i);
    fireEvent.change(nameInput, { target: { value: 'Apollo North Wing' } });

    // Enter phone
    const phoneInput = screen.getByPlaceholderText(/e\.g\. \+91 44 2829 0250/i);
    fireEvent.change(phoneInput, { target: { value: '+91 44 2829 0300' } });

    // Enter address
    const addressInput = screen.getByPlaceholderText(/e\.g\. Block C, South Wing/i);
    fireEvent.change(addressInput, { target: { value: 'North Wing, Greams Road' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Create Branch/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith({
        method: 'POST',
        url: 'branches',
        data: {
          hospital_id: 'hosp-1',
          name: 'Apollo North Wing',
          phone: '+91 44 2829 0300',
          address: 'North Wing, Greams Road',
          status: 'ACTIVE',
        },
      });
      expect(handleSave).toHaveBeenCalled();
    });
  });
});
