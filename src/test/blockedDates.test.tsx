import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PermissionProvider } from '../context/PermissionContext';
import DoctorAvailabilityPage from '../pages/DoctorAvailabilityPage';
import api from '../utils/api';
import { renderWithProviders } from './renderWithProviders';

vi.mock('../utils/api', () => {
  const fn = vi.fn();
  (fn as unknown as { get: ReturnType<typeof vi.fn> }).get = vi.fn();
  (fn as unknown as { post: ReturnType<typeof vi.fn> }).post = vi.fn();
  (fn as unknown as { put: ReturnType<typeof vi.fn> }).put = vi.fn();
  (fn as unknown as { delete: ReturnType<typeof vi.fn> }).delete = vi.fn();
  return { default: fn };
});

describe('DoctorAvailabilityPage Blocked Dates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('displays newly created blocked date immediately in the Blocked Dates table and badge', async () => {
    localStorage.setItem('adminRole', 'SUPER_ADMIN');

    const storedBlocks: Array<{
      id: string;
      doctor_id: string;
      blocked_date: string;
      start_time: string;
      end_time: string;
      reason: string | null;
      is_all_day: boolean;
      status: 'UPCOMING' | 'TODAY' | 'PAST';
    }> = [];

    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === 'doctors') {
        return Promise.resolve({
          data: [
            {
              id: 'doc-1',
              name: 'Dr. Bharathi',
              specialization: 'Haematology',
              hospital_id: 'h-1',
              hospital_name: 'Narendran Hospital',
              branch_name: 'Chennai',
            },
          ],
        });
      }
      if (url === 'branches') {
        return Promise.resolve({
          data: [{ id: 'br-1', name: 'Chennai', hospital_id: 'h-1' }],
        });
      }
      if (url === 'doctor-availability/doctor/doc-1') {
        return Promise.resolve({ data: [] });
      }
      if (url === 'doctor-availability/doctor/doc-1/blocked-dates') {
        return Promise.resolve({ data: [...storedBlocks] });
      }
      return Promise.resolve({ data: [] });
    });

    vi.mocked(api.post).mockImplementation((url: string, body: unknown) => {
      if (url === 'doctor-availability/doctor/doc-1/blocked-dates') {
        const payload = body as {
          blocked_date: string;
          start_time?: string;
          end_time?: string;
          reason?: string;
          is_all_day?: boolean;
        };
        const created = {
          id: 'block-1',
          doctor_id: 'doc-1',
          blocked_date: payload.blocked_date,
          start_time: (payload.start_time || '00:00:00').slice(0, 5),
          end_time: (payload.end_time || '23:59:59').slice(0, 5),
          reason: payload.reason || null,
          is_all_day: Boolean(payload.is_all_day),
          status: 'UPCOMING' as const,
        };
        storedBlocks.push(created);
        return Promise.resolve({ data: created });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithProviders(
      <PermissionProvider>
        <DoctorAvailabilityPage />
      </PermissionProvider>,
    );

    const blockTabBtn = await screen.findByRole('button', {
      name: /Blocked Dates & Time Slots/i,
    });
    expect(blockTabBtn).toHaveTextContent('0 Blocked');

    // Open Block Date drawer
    const openBlockBtn = screen.getByRole('button', { name: /Block Date \/ Time/i });
    fireEvent.click(openBlockBtn);

    const reasonInput = await screen.findByPlaceholderText(
      /Annual Leave, Surgery \/ Operation/i,
    );
    fireEvent.change(reasonInput, { target: { value: 'Medical Conference' } });

    const submitBtn = screen.getByRole('button', { name: /Confirm & Block Date/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        'doctor-availability/doctor/doc-1/blocked-dates',
        expect.objectContaining({
          doctor_id: 'doc-1',
          reason: 'Medical Conference',
          is_all_day: true,
        }),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Medical Conference')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Blocked Dates & Time Slots/i })).toHaveTextContent(
        '1 Blocked',
      );
    });
  });
});

