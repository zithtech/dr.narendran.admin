import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Doctor } from '../components/DoctorModal';
import Doctors from '../pages/Doctors';
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

const mockDoctor: Doctor = {
  id: 'doc-001',
  name: 'Dr. Ramesh Kumar',
  hospital_id: 'hosp-1',
  hospital_name: 'Apollo Hospitals',
  branch_id: 'branch-1',
  branch_name: 'Greams Road Branch',
  user_account_id: null,
  phone: '+91 9876543210',
  email: 'ramesh@apollo.com',
  specialization: 'Cardiology',
  status: 'ACTIVE',
  qualification: 'MBBS, MD',
  medical_registration_number: 'TN-MED-12345',
  years_of_experience: 12,
  created_at: '2026-11-01T10:00:00.000Z',
  updated_at: '2026-11-02T10:00:00.000Z',
};

describe('Doctors Page Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders schedule icon with no text, edit icon, and delete icon in actions', async () => {
    vi.mocked(api.get).mockResolvedValue({ data: [mockDoctor] });

    renderWithProviders(<Doctors />);

    await waitFor(() => {
      expect(screen.getByText('Dr. Ramesh Kumar')).toBeInTheDocument();
    });

    // Schedule button: icon-only (title/aria-label "Schedule", textContent is empty)
    const scheduleBtn = screen.getByRole('button', { name: /Schedule Dr. Ramesh Kumar/i });
    expect(scheduleBtn).toBeInTheDocument();
    expect(scheduleBtn.textContent?.trim()).toBe('');

    // Slots button: icon-only (title/aria-label "Slots for ...", textContent is empty)
    const slotsBtn = screen.getByRole('button', { name: /Slots for Dr. Ramesh Kumar/i });
    expect(slotsBtn).toBeInTheDocument();
    expect(slotsBtn.textContent?.trim()).toBe('');

    // Edit button
    const editBtn = screen.getByRole('button', { name: /Edit Dr. Ramesh Kumar/i });
    expect(editBtn).toBeInTheDocument();
    expect(editBtn.textContent?.trim()).toBe('');

    // Delete button
    const deleteBtn = screen.getByRole('button', { name: /Delete Dr. Ramesh Kumar/i });
    expect(deleteBtn).toBeInTheDocument();
    expect(deleteBtn.textContent?.trim()).toBe('');
  });
});
