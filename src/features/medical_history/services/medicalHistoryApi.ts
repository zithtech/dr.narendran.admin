import api from '../../../utils/api';
import type {
  PatientMedicalDocument,
  PatientMedicalHistoryRecord,
} from '../types/medicalHistory.types';

export const medicalHistoryApi = {
  async getHistories(patientId: string): Promise<PatientMedicalHistoryRecord[]> {
    const res = await api.get<PatientMedicalHistoryRecord[]>(
      `patients/${patientId}/medical-histories`,
    );
    return res.data;
  },

  async getLatestHistory(patientId: string): Promise<PatientMedicalHistoryRecord | null> {
    const res = await api.get<PatientMedicalHistoryRecord | null>(
      `patients/${patientId}/medical-histories/latest`,
    );
    return res.data;
  },

  async getHistoryById(patientId: string, historyId: string): Promise<PatientMedicalHistoryRecord> {
    const res = await api.get<PatientMedicalHistoryRecord>(
      `patients/${patientId}/medical-histories/${historyId}`,
    );
    return res.data;
  },

  async createHistory(
    patientId: string,
    data: Partial<PatientMedicalHistoryRecord>,
  ): Promise<PatientMedicalHistoryRecord> {
    const res = await api.post<PatientMedicalHistoryRecord>(
      `patients/${patientId}/medical-histories`,
      data,
    );
    return res.data;
  },

  async updateHistory(
    patientId: string,
    historyId: string,
    data: Partial<PatientMedicalHistoryRecord>,
  ): Promise<PatientMedicalHistoryRecord> {
    const res = await api.put<PatientMedicalHistoryRecord>(
      `patients/${patientId}/medical-histories/${historyId}`,
      data,
    );
    return res.data;
  },

  async deleteHistory(patientId: string, historyId: string): Promise<boolean> {
    const res = await api.delete<{ success: boolean }>(
      `patients/${patientId}/medical-histories/${historyId}`,
    );
    return res.data.success;
  },

  async getDocuments(
    patientId: string,
    type?: string,
  ): Promise<PatientMedicalDocument[]> {
    const params = type && type !== 'ALL' ? { type } : undefined;
    const res = await api.get<PatientMedicalDocument[]>(
      `patients/${patientId}/medical-documents`,
      { params },
    );
    return res.data;
  },

  async uploadDocument(
    patientId: string,
    formData: FormData,
  ): Promise<PatientMedicalDocument> {
    const res = await api.post<PatientMedicalDocument>(
      `patients/${patientId}/medical-documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return res.data;
  },

  async deleteDocument(patientId: string, documentId: string): Promise<boolean> {
    const res = await api.delete<{ success: boolean }>(
      `patients/${patientId}/medical-documents/${documentId}`,
    );
    return res.data.success;
  },
};
