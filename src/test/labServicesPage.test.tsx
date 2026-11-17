import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LabServices from '../pages/LabServices';
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

const mockLabServices = [
  {
    id: 'srv-1',
    name: 'Complete Blood Count (CBC)',
    service_code: 'CBC-100',
    category: 'Hematology',
    service_category: 'Hematology',
    sample_type: 'Whole Blood (EDTA)',
    price: 450,
    service_price: 450,
    status: 'ACTIVE',
    created_at: '2026-11-01T10:00:00.000Z',
    updated_at: '2026-11-02T10:00:00.000Z',
  },
  {
    id: 'srv-2',
    name: 'Lipid Profile Screen',
    service_code: 'LIPID-200',
    category: 'Biochemistry',
    service_category: 'Biochemistry',
    sample_type: 'Serum',
    price: 850.5,
    service_price: 850.5,
    status: 'ACTIVE',
    created_at: '2026-11-05T10:00:00.000Z',
    updated_at: '2026-11-05T10:00:00.000Z',
  },
  {
    id: 'srv-3',
    name: 'Routine Diagnostic Consultation',
    service_code: null,
    category: null,
    service_category: null,
    sample_type: null,
    price: 0,
    service_price: 0,
    status: 'INACTIVE',
    created_at: '2026-11-08T10:00:00.000Z',
    updated_at: '2026-11-08T10:00:00.000Z',
  },
];

describe('Lab Services Management Table', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue({ data: mockLabServices });
  });

  it('renders all requested columns: Service Code, Service Category, Sample Type, Service Price', async () => {
    renderWithProviders(<LabServices />);

    // Wait for services to load
    await waitFor(() => {
      expect(screen.getByText('Complete Blood Count (CBC)')).toBeInTheDocument();
    });

    // Check column headers exist in table
    expect(screen.getByText('Service Name')).toBeInTheDocument();
    expect(screen.getByText('Service Code')).toBeInTheDocument();
    expect(screen.getByText('Service Category')).toBeInTheDocument();
    expect(screen.getByText('Sample Type')).toBeInTheDocument();
    expect(screen.getByText('Service Price')).toBeInTheDocument();

    // Check row data values
    expect(screen.getByText('CBC-100')).toBeInTheDocument();
    expect(screen.getByText('Hematology')).toBeInTheDocument();
    expect(screen.getByText('Whole Blood (EDTA)')).toBeInTheDocument();
    expect(screen.getByText('₹450.00')).toBeInTheDocument();

    expect(screen.getByText('LIPID-200')).toBeInTheDocument();
    expect(screen.getByText('Biochemistry')).toBeInTheDocument();
    expect(screen.getByText('Serum')).toBeInTheDocument();
    expect(screen.getByText('₹850.50')).toBeInTheDocument();

    // Routine Diagnostic Consultation has 0 price
    expect(screen.getByText('Routine Diagnostic Consultation')).toBeInTheDocument();
    expect(screen.getByText('₹0.00')).toBeInTheDocument();
  });
});
