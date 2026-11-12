import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../../../utils/api';
import { patientTimelinesApi } from '../services/patientTimelinesApi';
import { timelinesApi } from '../services/timelinesApi';

vi.mock('../../../utils/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('Admin Patient Timelines API Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('patientTimelinesApi.getPatients', () => {
    it('fetches registered patients with default parameters', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          data: [
            {
              id: 'pat-1',
              name: 'John Doe',
              gender: 'MALE',
              status: 'ACTIVE',
              created_at: '2026-01-01T00:00:00Z',
            },
          ],
          pagination: {
            page: 1,
            limit: 15,
            totalCount: 1,
            totalPages: 1,
          },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const res = await patientTimelinesApi.getPatients({ page: 1, limit: 15 });

      expect(api.get).toHaveBeenCalledWith('admin/patient-timelines/patients', {
        params: { page: 1, limit: 15 },
      });
      expect(res.data).toHaveLength(1);
      expect(res.data[0]?.name).toBe('John Doe');
      expect(res.pagination?.totalCount).toBe(1);
    });

    it('applies search, gender, and status filter parameters', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          data: [],
          pagination: { page: 1, limit: 10, totalCount: 0, totalPages: 1 },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      await patientTimelinesApi.getPatients({
        search: 'Jane',
        gender: 'FEMALE',
        status: 'ACTIVE',
        registeredFrom: '2026-01-01',
        registeredTo: '2026-12-31',
      });

      expect(api.get).toHaveBeenCalledWith('admin/patient-timelines/patients', {
        params: {
          search: 'Jane',
          gender: 'FEMALE',
          status: 'ACTIVE',
          registeredFrom: '2026-01-01',
          registeredTo: '2026-12-31',
        },
      });
    });
  });

  describe('patientTimelinesApi.getPatientTimeline', () => {
    it('fetches patient timeline with patientId and query params', async () => {
      const mockTimeline = {
        data: {
          status: 'success',
          data: {
            patient: { id: 'pat-123', name: 'John Doe', age: 35, gender: 'Male' },
            summary: {
              primary_condition: 'General Care',
              current_medicines_count: 2,
              consultations_count: 3,
              prescriptions_count: 2,
              investigations_count: 1,
              medical_records_count: 2,
            },
            timeline: [
              {
                id: 'evt-1',
                type: 'CONSULTATION',
                occurred_at: '2026-03-01T10:00:00Z',
                title: 'Doctor Consultation',
              },
            ],
            pagination: { page: 1, limit: 20, total: 1, has_next: false },
          },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockTimeline);

      const res = await patientTimelinesApi.getPatientTimeline('pat-123', {
        type: 'Consultations',
        year: '2026',
      });

      expect(api.get).toHaveBeenCalledWith('admin/patient-timelines/pat-123', {
        params: { type: 'Consultations', year: '2026' },
      });
      expect(res.patient.name).toBe('John Doe');
      expect(res.timeline).toHaveLength(1);
      expect(res.timeline[0]?.type).toBe('CONSULTATION');
    });
  });

  describe('timelinesApi unified service', () => {
    it('fetches patients list and maps pagination correctly', async () => {
      const mockResponse = {
        data: {
          status: 'success',
          data: [
            {
              id: 'p-1',
              name: 'Alice',
              status: 'ACTIVE',
              created_at: '2026-02-01T00:00:00Z',
            },
          ],
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockResponse);

      const res = await timelinesApi.getPatients({ search: 'Alice' });

      expect(res.patients).toHaveLength(1);
      expect(res.pagination.total).toBe(1);
    });

    it('fetches timeline for patient with fallback handling', async () => {
      const mockTimeline = {
        data: {
          status: 'success',
          data: {
            patient: { id: 'p-1', name: 'Alice' },
            summary: { primary_condition: 'Cardiology', current_medicines_count: 1 },
            timeline: [],
            pagination: { page: 1, limit: 20, total: 0, has_next: false },
          },
        },
      };

      vi.mocked(api.get).mockResolvedValueOnce(mockTimeline);

      const res = await timelinesApi.getPatientTimeline('p-1', { type: 'All' });

      expect(res.patient.name).toBe('Alice');
      expect(res.timeline).toEqual([]);
    });
  });
});

