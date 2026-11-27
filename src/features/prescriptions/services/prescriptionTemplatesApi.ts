import api from '../../../utils/api';
import type { PrescriptionTemplate } from '../types/template';

export interface TemplateFilterParams {
  hospitalId?: string | null;
  status?: string | null;
  search?: string | null;
}

export const prescriptionTemplatesApi = {
  /**
   * Fetch active template for a hospital / branch
   */
  async getActiveTemplate(hospitalId?: string | null, branchId?: string | null): Promise<PrescriptionTemplate> {
    const params: Record<string, string> = {};
    if (hospitalId) params.hospital_id = hospitalId;
    if (branchId) params.branch_id = branchId;

    const res = await api.get('prescription-templates/active', { params });
    return res.data;
  },

  /**
   * Fetch all templates with optional hospital/status filtering
   */
  async getAllTemplates(filters?: TemplateFilterParams): Promise<PrescriptionTemplate[]> {
    const params: Record<string, string> = {};
    if (filters?.hospitalId) params.hospital_id = filters.hospitalId;
    if (filters?.status) params.status = filters.status;
    if (filters?.search) params.search = filters.search;

    const res = await api.get('prescription-templates', { params });
    return res.data?.templates || [];
  },

  /**
   * Fetch a single template by ID
   */
  async getTemplateById(id: string): Promise<PrescriptionTemplate> {
    const res = await api.get(`prescription-templates/${id}`);
    return res.data?.template || res.data?.data;
  },

  /**
   * Create a new template (draft or active)
   */
  async createTemplate(payload: Partial<PrescriptionTemplate>): Promise<PrescriptionTemplate> {
    const res = await api.post('prescription-templates', payload);
    return res.data?.data || res.data?.template;
  },

  /**
   * Update an existing template (increments version)
   */
  async updateTemplate(id: string, payload: Partial<PrescriptionTemplate>): Promise<PrescriptionTemplate> {
    const res = await api.put(`prescription-templates/${id}`, payload);
    return res.data?.data || res.data;
  },

  /**
   * Activate a template atomically for its hospital
   */
  async activateTemplate(id: string, hospitalId?: string | null): Promise<PrescriptionTemplate> {
    const res = await api.post(`prescription-templates/${id}/activate`, { hospital_id: hospitalId });
    return res.data?.data;
  },

  /**
   * Duplicate a template into a new DRAFT
   */
  async duplicateTemplate(id: string, hospitalId?: string | null): Promise<PrescriptionTemplate> {
    const res = await api.post(`prescription-templates/${id}/duplicate`, { hospital_id: hospitalId });
    return res.data?.data;
  },

  /**
   * Delete a template (if not system active default)
   */
  async deleteTemplate(id: string): Promise<void> {
    await api.delete(`prescription-templates/${id}`);
  },

  /**
   * Generate binary or S3 preview PDF via Puppeteer backend
   */
  async generatePreviewPdf(payload: {
    html?: string;
    data?: any;
    uploadToS3?: boolean;
    hospital_id?: string;
    branch_id?: string;
  }): Promise<Blob | { pdfUrl: string; fileUrl: string }> {
    if (payload.uploadToS3) {
      const res = await api.post('prescription-templates/preview-pdf', payload);
      return res.data?.data;
    }
    const res = await api.post('prescription-templates/preview-pdf', payload, {
      responseType: 'blob',
    });
    return res.data;
  },

  /**
   * Upload image / logo for prescription templates
   * Supports PNG (transparent), JPEG, WebP up to 10MB
   */
  async uploadImage(file: File, hospitalId?: string | null): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    if (hospitalId) formData.append('hospital_id', hospitalId);
    formData.append('folder', 'prescription_templates');

    let uploadedUrl = '';
    try {
      const res = await api.post('prescription-templates/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      uploadedUrl = res.data?.data?.url || res.data?.url || '';
    } catch {
      // Fallback to general /upload/image
      const res = await api.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      uploadedUrl = res.data?.data?.url || res.data?.url || '';
    }
    return uploadedUrl;
  },
};
