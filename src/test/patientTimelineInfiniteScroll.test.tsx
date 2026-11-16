import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { patientTimelinesApi } from '../features/timelines/services/patientTimelinesApi';
import type { MedicalTimelineResponse } from '../features/timelines/types/patientTimelines';
import PatientTimelineDetailPage from '../pages/PatientTimelineDetailPage';

// Mock ResizeObserver
if (typeof window !== 'undefined') {
  (window as any).ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

describe('Patient Timeline Infinite Scroll & Older Records Auto-Loading', () => {
  let capturedObserverCallback: (entries: IntersectionObserverEntry[]) => void = () => {};

  const mockPatientHeader = {
    id: 'p-1',
    name: 'Priya',
    patient_id: '34554ED1',
    gender: 'Female',
    age: 28,
    blood_group: 'B+',
    phone: '6382123757',
    email: 'priya123@gmail.com',
  };

  const mockSummary = {
    primary_condition: 'Hypertension',
    current_medicines_count: 1,
    active_medications: ['Amlodipine'],
    recent_consultation_date: '2026-11-03',
    upcoming_followup_date: '2026-11-17',
    consultations_count: 10,
    prescriptions_count: 8,
    investigations_count: 4,
    medical_records_count: 2,
  };

  const page1Events = [
    {
      id: 'evt-1',
      date: '2026-11-03T10:00:00Z',
      occurred_at: '2026-11-03T10:00:00Z',
      type: 'Consultation' as const,
      title: 'Consultation: Routine review',
      doctor_name: 'Dr. Bharathi',
      department: 'Haematology',
      details: { diagnosis: 'Hypertension' },
    },
    {
      id: 'evt-2',
      date: '2026-11-03T05:30:00Z',
      occurred_at: '2026-11-03T05:30:00Z',
      type: 'Prescriptions' as const,
      title: 'Prescription',
      doctor_name: 'Dr. Bharathi',
      department: 'Haematology',
      details: { diagnosis: 'Fever and cold', medicines_count: 1 },
    },
  ];

  const page2Events = [
    {
      id: 'evt-3',
      date: '2026-10-15T09:00:00Z',
      occurred_at: '2026-10-15T09:00:00Z',
      type: 'Consultation' as const,
      title: 'Older Consultation: Initial checkup',
      doctor_name: 'Dr. Bharathi',
      department: 'Haematology',
      details: { diagnosis: 'Initial hypertension diagnosis' },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    if (typeof window !== 'undefined') {
      (window as any).IntersectionObserver = class IntersectionObserver {
        readonly root: Element | Document | null = null;
        readonly rootMargin: string = '';
        readonly thresholds: ReadonlyArray<number> = [];
        constructor(callback: IntersectionObserverCallback) {
          capturedObserverCallback = callback as any;
        }
        observe() {}
        unobserve() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      };
    }
  });

  it('renders timeline and verifies the manual "Load Older Medical Events" button is removed', async () => {
    vi.spyOn(patientTimelinesApi, 'getPatientTimeline').mockResolvedValueOnce({
      patient: mockPatientHeader,
      summary: mockSummary,
      timeline: page1Events,
      pagination: {
        page: 1,
        limit: 20,
        total: 3,
        total_pages: 2,
        has_next: true,
        has_prev: false,
      },
    } as unknown as MedicalTimelineResponse);

    render(
      <MemoryRouter initialEntries={['/patient-timelines/p-1']}>
        <Routes>
          <Route path="/patient-timelines/:patientId" element={<PatientTimelineDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText('Priya')).toBeInTheDocument();
      expect(screen.getByText('Consultation: Routine review')).toBeInTheDocument();
    });

    // Verify the manual "Load Older Medical Events" button is NOT present in the document
    expect(screen.queryByRole('button', { name: /load older medical events/i })).toBeNull();

    // Verify the automatic scroll indicator is shown
    expect(screen.getByText(/loading older records as you scroll.../i)).toBeInTheDocument();
  });

  it('automatically triggers older medical records loading when sentinel intersects or scrolls', async () => {
    const getTimelineSpy = vi
      .spyOn(patientTimelinesApi, 'getPatientTimeline')
      .mockResolvedValueOnce({
        patient: mockPatientHeader,
        summary: mockSummary,
        timeline: page1Events,
        pagination: {
          page: 1,
          limit: 20,
          total: 3,
          total_pages: 2,
          has_next: true,
          has_prev: false,
        },
      } as unknown as MedicalTimelineResponse)
      .mockResolvedValueOnce({
        patient: mockPatientHeader,
        summary: mockSummary,
        timeline: page2Events,
        pagination: {
          page: 2,
          limit: 20,
          total: 3,
          total_pages: 2,
          has_next: false,
          has_prev: true,
        },
      } as unknown as MedicalTimelineResponse);

    render(
      <MemoryRouter initialEntries={['/patient-timelines/p-1']}>
        <Routes>
          <Route path="/patient-timelines/:patientId" element={<PatientTimelineDetailPage />} />
        </Routes>
      </MemoryRouter>,
    );

    // Initial page loaded
    await waitFor(() => {
      expect(screen.getByText('Consultation: Routine review')).toBeInTheDocument();
    });
    expect(getTimelineSpy).toHaveBeenCalledTimes(1);

    // Simulate intersection observer firing as user scrolls down to sentinel
    act(() => {
      capturedObserverCallback([{ isIntersecting: true } as IntersectionObserverEntry]);
    });

    // Page 2 older records loaded automatically
    await waitFor(() => {
      expect(screen.getByText('Older Consultation: Initial checkup')).toBeInTheDocument();
    });
    expect(getTimelineSpy).toHaveBeenCalledTimes(2);
    expect(getTimelineSpy).toHaveBeenLastCalledWith('p-1', expect.objectContaining({ page: 2 }));

    // When has_next is false, verifies end-of-records message
    expect(screen.getByText('All medical events loaded')).toBeInTheDocument();
  });
});
