import api from '../../../utils/api';
import type {
  AdminPatientListItem,
  MedicalTimelineResponse,
  PatientListFilters,
  PatientListResponse,
  TimelineQueryParams,
} from '../types/timelines';

export const timelinesApi = {
  /**
   * Fetch registered patients with search, filtering and server-side pagination
   */
  async getPatients(filters?: PatientListFilters): Promise<PatientListResponse> {
    const params: Record<string, any> = {};
    if (filters?.page) params.page = filters.page;
    if (filters?.limit) params.limit = filters.limit;
    if (filters?.search?.trim()) params.search = filters.search.trim();
    if (filters?.gender && filters.gender !== 'ALL') params.gender = filters.gender;
    if (filters?.status && filters.status !== 'ALL') params.status = filters.status;
    if (filters?.registeredFrom) params.registeredFrom = filters.registeredFrom;
    if (filters?.registeredTo) params.registeredTo = filters.registeredTo;
    if (filters?.hospitalId) params.hospitalId = filters.hospitalId;
    if (filters?.branchId) params.branchId = filters.branchId;

    try {
      const res = await api.get<{
        status: string;
        data: AdminPatientListItem[];
        pagination: {
          page: number;
          limit: number;
          total?: number;
          totalCount?: number;
          totalPages: number;
        };
      }>('admin/patient-timelines/patients', { params });

      const pagination = res.data.pagination || {
        page: 1,
        limit: 15,
        total: 0,
        totalPages: 1,
      };

      return {
        patients: res.data.data || [],
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total ?? pagination.totalCount ?? 0,
          totalPages: pagination.totalPages,
        },
      };
    } catch {
      // Fallback in case route mounted under /patient-timelines/patients
      const resFallback = await api.get<{
        status: string;
        data: AdminPatientListItem[];
        pagination: {
          page: number;
          limit: number;
          total?: number;
          totalCount?: number;
          totalPages: number;
        };
      }>('patient-timelines/patients', { params });

      const pagination = resFallback.data.pagination || {
        page: 1,
        limit: 15,
        total: 0,
        totalPages: 1,
      };

      return {
        patients: resFallback.data.data || [],
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: pagination.total ?? pagination.totalCount ?? 0,
          totalPages: pagination.totalPages,
        },
      };
    }
  },

  /**
   * Fetch comprehensive medical timeline for a specific patient
   */
  async getPatientTimeline(
    patientId: string,
    params?: TimelineQueryParams,
  ): Promise<MedicalTimelineResponse> {
    const queryParams: Record<string, any> = {};
    if (params?.page) queryParams.page = params.page;
    if (params?.limit) queryParams.limit = params.limit;
    if (params?.type && params.type !== 'All') queryParams.type = params.type;
    if (params?.year && params.year !== 'All') queryParams.year = params.year;
    if (params?.fromDate) queryParams.from_date = params.fromDate;
    if (params?.toDate) queryParams.to_date = params.toDate;
    if (params?.from_date) queryParams.from_date = params.from_date;
    if (params?.to_date) queryParams.to_date = params.to_date;

    try {
      const res = await api.get<{
        status: string;
        data: MedicalTimelineResponse;
      }>(`admin/patient-timelines/${patientId}`, { params: queryParams });

      return res.data.data;
    } catch {
      // Fallback in case route mounted directly under /patient-timelines/:id
      const resFallback = await api.get<{
        status: string;
        data: MedicalTimelineResponse;
      }>(`patient-timelines/${patientId}`, { params: queryParams });

      return resFallback.data.data;
    }
  },

  /**
   * Download patient clinical history summary PDF
   */
  async downloadPatientTimelinePdf(patientId: string, patientName?: string): Promise<void> {
    const res = await api.get(`admin/patient-timelines/${patientId}/pdf`, {
      responseType: 'blob',
    });

    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const safeName = (patientName || 'patient').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.setAttribute('download', `medical_timeline_${safeName}_${patientId.slice(0, 8)}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

