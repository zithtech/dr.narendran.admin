import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LabServiceModal, { type LabService } from '../components/LabServiceModal';
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

const mockService: LabService = {
  id: 'srv-001',
  name: 'Complete Blood Count (CBC)',
  status: 'ACTIVE',
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-02T10:00:00.000Z',
};

describe('Linked Services Create/Edit Drawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders create drawer with modern header, section cards, status options, and fields', () => {
    renderWithProviders(
      <LabServiceModal isOpen={true} onClose={vi.fn()} service={null} onSave={vi.fn()} />,
    );

    expect(screen.getAllByText('Create Diagnostic Service').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/Add a new laboratory test or clinical investigation/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Diagnostic Service \/ Test Name/i)).toBeInTheDocument();
    expect(screen.getByText(/Service Specification/i)).toBeInTheDocument();
    expect(screen.getByText(/Catalog Availability & Status/i)).toBeInTheDocument();
    expect(screen.getByText('Active in Catalog')).toBeInTheDocument();
    expect(screen.getByText('Inactive / Suspended')).toBeInTheDocument();
  });

  it('renders edit drawer with populated service data and saves changes', async () => {
    vi.mocked(api).mockResolvedValue({ data: { success: true } });
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    renderWithProviders(
      <LabServiceModal
        isOpen={true}
        onClose={handleClose}
        service={mockService}
        onSave={handleSave}
      />,
    );

    expect(screen.getByText('Edit Diagnostic Service')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Complete Blood Count (CBC)')).toBeInTheDocument();

    const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PUT',
          url: 'lab-services/srv-001',
          data: expect.objectContaining({
            name: 'Complete Blood Count (CBC)',
            status: 'ACTIVE',
          }),
        }),
      );
      expect(handleSave).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('creates a new diagnostic service with valid inputs', async () => {
    vi.mocked(api).mockResolvedValue({ data: { id: 'new-srv', success: true } });
    const handleSave = vi.fn();
    const handleClose = vi.fn();

    renderWithProviders(
      <LabServiceModal isOpen={true} onClose={handleClose} service={null} onSave={handleSave} />,
    );

    const nameInput = screen.getByLabelText(/Diagnostic Service \/ Test Name/i);
    fireEvent.change(nameInput, { target: { value: 'Lipid Profile Panel' } });

    const submitBtn = screen.getByRole('button', { name: /Create Diagnostic Service/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'lab-services',
          data: expect.objectContaining({
            name: 'Lipid Profile Panel',
            status: 'ACTIVE',
          }),
        }),
      );
      expect(handleSave).toHaveBeenCalledTimes(1);
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  it('validates that service name is required', async () => {
    renderWithProviders(
      <LabServiceModal isOpen={true} onClose={vi.fn()} service={null} onSave={vi.fn()} />,
    );

    const submitBtn = screen.getByRole('button', { name: /Create Diagnostic Service/i });
    fireEvent.submit(submitBtn.closest('form')!);

    expect(screen.getByText(/Service name is required/i)).toBeInTheDocument();
  });
});

