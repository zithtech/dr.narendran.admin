import api from '../../../utils/api';

export interface PrescriptionMedicineItem {
  id?: string | undefined;
  prescription_id?: string | undefined;
  medicine_id?: string | undefined;
  medicine_name: string;
  strength?: string | undefined;
  dosage?: string | undefined;
  frequency?: string | undefined;
  duration?: string | undefined;
  food_instruction?: string | undefined;
  instructions?: string | undefined;
  prescribed_quantity?: number | undefined;
  generic_name?: string | undefined;
  dosage_form?: string | undefined;
  manufacturer?: string | undefined;
  therapeutic_category?: string | undefined;
  mrp?: number | null | undefined;
  final_price?: number | null | undefined;
  available_quantity?: number | null | undefined;
}

export interface PrescribedLabTestItem {
  id?: string | undefined;
  prescription_id?: string | undefined;
  lab_test_id?: string | undefined;
  test_name: string;
  instructions?: string | undefined;
  lab_id?: string | undefined;
  lab_name?: string | undefined;
  lab_city?: string | undefined;
  lab_address?: string | undefined;
  lab_phone?: string | undefined;
  lab_email?: string | undefined;
  lab_timings?: string | undefined;
}

export interface Prescription {
  id: string;
  patient_id?: string | undefined;
  patient_name?: string | undefined;
  patient_phone?: string | undefined;
  patient_gender?: string | undefined;
  patient_dob?: string | undefined;
  appointment_id?: string | undefined;
  prescription_date: string;
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  additional_notes?: string | undefined;
  diagnosis?: string | undefined;
  doctor: {
    id: string;
    name: string;
    specialization?: string | undefined;
    specialty?: string | undefined;
  };
  medicines_count: number;
  medicines: PrescriptionMedicineItem[];
  lab_tests_count?: number | undefined;
  lab_tests?: PrescribedLabTestItem[] | undefined;
  created_at: string;
  prescription_type?: string | undefined;
  image_url?: string | undefined;
  prescription_image_url?: string | undefined;
  prescription_url?: string | undefined;
  follow_up_days?: number | null | undefined;
  follow_up_date?: string | null | undefined;
  follow_up_status?: string | null | undefined;
}

export interface CreatePrescriptionPayload {
  patientId: string;
  doctorId?: string | undefined;
  appointmentId?: string | undefined;
  markAppointmentCompleted?: boolean | undefined;
  diagnosis?: string | undefined;
  generalInstructions?: string | undefined;
  prescriptionType?: 'system' | 'upload' | undefined;
  imageUrl?: string | undefined;
  followUpDays?: number | string | undefined;
  followUpDate?: string | undefined;
  medicines?: {
    medicineId?: string | undefined;
    name: string;
    strength?: string | undefined;
    dosage: string;
    frequency: string;
    duration: string;
    mealTiming?: string | undefined;
    instructions?: string | undefined;
    prescribedQuantity?: number | undefined;
  }[] | undefined;
  labTests?: {
    labTestId?: string | undefined;
    testName: string;
    instructions?: string | undefined;
    labId?: string | undefined;
  }[] | undefined;
}

export interface UpdatePrescriptionPayload {
  diagnosis?: string | undefined;
  generalInstructions?: string | undefined;
  status?: ('active' | 'completed' | 'expired' | 'cancelled') | undefined;
  followUpDays?: number | string | undefined;
  followUpDate?: string | undefined;
  medicines?: {
    medicineId?: string | undefined;
    name: string;
    strength?: string | undefined;
    dosage: string;
    frequency: string;
    duration: string;
    mealTiming?: string | undefined;
    instructions?: string | undefined;
    prescribedQuantity?: number | undefined;
  }[] | undefined;
  labTests?: {
    labTestId?: string | undefined;
    testName: string;
    instructions?: string | undefined;
    labId?: string | undefined;
  }[] | undefined;
}

export const prescriptionsApi = {
  async getAll(params?: {
    patient_id?: string | undefined;
    user_id?: string | undefined;
    appointment_id?: string | undefined;
    doctor_id?: string | undefined;
    status?: string | undefined;
    tab?: string | undefined;
    search?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
  }): Promise<Prescription[]> {
    const res = await api.get('/prescriptions', { params });
    return res.data?.data || [];
  },

  async getById(id: string): Promise<Prescription> {
    const res = await api.get(`/prescriptions/${id}`);
    return res.data?.data;
  },

  async getByPatient(patientId: string): Promise<Prescription[]> {
    const res = await api.get(`/prescriptions/patient/${patientId}`);
    return res.data?.data || [];
  },

  async getByAppointment(appointmentId: string): Promise<Prescription[]> {
    const res = await api.get(`/prescriptions/appointment/${appointmentId}`);
    return res.data?.data || [];
  },

  async create(payload: CreatePrescriptionPayload): Promise<Prescription> {
    const res = await api.post('/prescriptions', payload);
    return res.data?.data;
  },

  async update(id: string, payload: UpdatePrescriptionPayload): Promise<Prescription> {
    const res = await api.put(`/prescriptions/${id}`, payload);
    return res.data?.data;
  },

  getPdfDownloadUrl(id: string): string {
    const token = localStorage.getItem('adminToken') || '';
    return `/api/prescriptions/${id}/pdf?token=${encodeURIComponent(token)}`;
  },

  async downloadPdf(id: string, filenameFallback?: string): Promise<void> {
    const res = await api.get<Blob>(`/prescriptions/${id}/pdf`, {
      responseType: 'blob',
    });
    const blob =
      res.data instanceof Blob
        ? res.data
        : new Blob([res.data], { type: 'application/pdf' });
    const disposition =
      typeof res.headers?.['content-disposition'] === 'string'
        ? res.headers['content-disposition']
        : '';
    const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i);
    const filename =
      match?.[1]?.trim() || filenameFallback || `prescription-${id.slice(0, 8)}.pdf`;

    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => {
      window.URL.revokeObjectURL(blobUrl);
    }, 1000);
  },

  getHtmlPreviewUrl(id: string): string {
    const token = localStorage.getItem('adminToken') || '';
    return `/api/prescriptions/${id}/html?token=${encodeURIComponent(token)}`;
  },
};
