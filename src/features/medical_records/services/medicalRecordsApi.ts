import api from '../../../utils/api';
import type {
  MedicalRecord,
  MedicalRecordsFilterParams,
  MedicalRecordsListResponse,
  PatientDossier,
  UpdateMedicalRecordPayload,
  UploadMedicalRecordPayload,
} from '../types/medicalRecords';

export const medicalRecordsApi = {
  async getMedicalRecords(
    params: MedicalRecordsFilterParams = {}
  ): Promise<MedicalRecordsListResponse> {
    const res = await api.get('medical-records', { params });
    return res.data;
  },

  async getPatientDossier(patientId: string): Promise<PatientDossier> {
    const res = await api.get(`medical-records/patients/${patientId}/dossier`);
    return res.data;
  },

  async uploadMedicalRecord(
    payload: UploadMedicalRecordPayload
  ): Promise<MedicalRecord> {
    const formData = new FormData();
    formData.append('file', payload.file);
    formData.append('patientId', payload.patientId);
    formData.append('testName', payload.testName);

    if (payload.reportDate) {
      formData.append('reportDate', payload.reportDate);
    }
    if (payload.notes) {
      formData.append('notes', payload.notes);
    }
    if (payload.prescriptionLabTestId) {
      formData.append('prescriptionLabTestId', payload.prescriptionLabTestId);
    }
    if (payload.isExternal !== undefined) {
      formData.append('isExternal', String(payload.isExternal));
    }
    if (payload.allowDuplicate !== undefined) {
      formData.append('allowDuplicate', String(payload.allowDuplicate));
    }

    const res = await api.post('medical-records/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },

  async updateMedicalRecord(
    id: string,
    updates: UpdateMedicalRecordPayload
  ): Promise<MedicalRecord> {
    const res = await api.patch(`medical-records/${id}`, updates);
    return res.data;
  },

  async deleteMedicalRecord(id: string): Promise<{ success: boolean; message: string }> {
    const res = await api.delete(`medical-records/${id}`);
    return res.data;
  },

  async getDownloadUrl(
    id: string
  ): Promise<{ downloadUrl: string; fileName: string; fileType: string }> {
    const res = await api.get(`medical-records/${id}/download`);
    return res.data;
  },

  async getAllPatients(): Promise<Array<{ id: string; name: string; phone?: string | null; email?: string | null }>> {
    try {
      const timelineRes = await api.get('admin/patient-timelines/patients', {
        params: { limit: 100 },
      });
      const timelineList = timelineRes.data?.data || timelineRes.data?.patients || [];
      if (Array.isArray(timelineList) && timelineList.length > 0) {
        return timelineList;
      }
    } catch {
      // Fallback
    }

    try {
      const res = await api.get('patients');
      const rawList = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.patients || []);
      return Array.isArray(rawList) ? rawList : [];
    } catch {
      return [];
    }
  },

  async searchPatients(query: string): Promise<Array<{ id: string; name: string; phone?: string | null; email?: string | null }>> {
    if (!query.trim()) return [];
    try {
      const res = await api.get('admin/patient-timelines/patients', {
        params: { search: query.trim(), limit: 10 },
      });
      const rawList = res.data?.data || res.data?.patients || [];
      if (Array.isArray(rawList) && rawList.length > 0) {
        return rawList;
      }
    } catch {
      // Fallback below
    }

    try {
      const res = await api.get('patients');
      const rawList = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.patients || []);
      const q = query.trim().toLowerCase();
      return rawList.filter((p: any) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.phone && p.phone.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
      );
    } catch {
      return [];
    }
  },
};
