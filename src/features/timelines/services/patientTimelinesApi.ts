import api from '../../../utils/api';
import type {
  AdminPatientListResponse,
  MedicalTimelineResponse,
} from '../types/patientTimelines';

export interface GetPatientsParams {
  search?: string;
  gender?: string;
  status?: string;
  registeredFrom?: string;
  registeredTo?: string;
  page?: number;
  limit?: number;
}

export interface GetPatientTimelineParams {
  page?: number;
  limit?: number;
  type?: string;
  from_date?: string;
  to_date?: string;
  year?: string;
}

export const patientTimelinesApi = {
  /**
   * Fetch paginated registered patients list
   */
  async getPatients(params?: GetPatientsParams): Promise<AdminPatientListResponse> {
    const res = await api.get<AdminPatientListResponse>('admin/patient-timelines/patients', {
      params,
    });
    return res.data;
  },

  /**
   * Fetch comprehensive medical timeline for a single patient
   */
  async getPatientTimeline(
    patientId: string,
    params?: GetPatientTimelineParams,
  ): Promise<MedicalTimelineResponse> {
    const queryParams: Record<string, any> = {};
    if (params) {
      if (params.page !== undefined) queryParams.page = params.page;
      if (params.limit !== undefined) queryParams.limit = params.limit;
      if (params.type && params.type !== 'All') queryParams.type = params.type;
      if (params.from_date) queryParams.from_date = params.from_date;
      if (params.to_date) queryParams.to_date = params.to_date;
      if (params.year && params.year !== 'All') queryParams.year = params.year;
    }

    const res = await api.get<{ status: string; data: MedicalTimelineResponse }>(
      `admin/patient-timelines/${patientId}`,
      { params: queryParams },
    );
    return res.data.data;
  },

  /**
   * Download patient medical history summary PDF
   */
  async downloadPatientHistoryPdf(patientId: string, patientName?: string): Promise<void> {
    const res = await api.get(`admin/patient-timelines/${patientId}/pdf`, {
      responseType: 'blob',
    });

    const blob = new Blob([res.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const sanitizedName = (patientName || 'patient').replace(/[^a-zA-Z0-9_-]/g, '_');
    link.download = `medical_history_${sanitizedName}_${patientId.slice(0, 8)}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

