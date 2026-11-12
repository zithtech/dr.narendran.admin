import api from '../utils/api';

export interface DoctorAvailabilitySlot {
  id: string;
  doctor_id: string;
  doctor_name?: string;
  doctor_specialization?: string;
  doctor_qualification?: string;
  doctor_image?: string | null;
  hospital_name?: string;
  branch_id: string;
  branch_name?: string;
  day_of_week: 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';
  start_time: string;
  end_time: string;
  slot_length: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
  updated_at?: string;
}

export interface CreateAvailabilityPayload {
  doctor_id: string;
  branch_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  status: 'ACTIVE' | 'INACTIVE';
  slot_length?: number;
}

export interface DoctorBlockedDate {
  id: string;
  doctor_id: string;
  blocked_date: string;
  start_time: string;
  end_time: string;
  reason?: string | null;
  is_all_day?: boolean;
  status?: 'UPCOMING' | 'TODAY' | 'PAST';
  created_at?: string;
  updated_at?: string;
}

export interface CreateBlockedDatePayload {
  doctor_id?: string | undefined;
  blocked_date: string;
  start_time?: string | undefined;
  end_time?: string | undefined;
  reason?: string | undefined;
  is_all_day?: boolean | undefined;
}

export const doctorAvailabilityApi = {
  /**
   * Fetch all availability slots across all doctors, or optionally filter by doctorId
   */
  async getAll(doctorId?: string): Promise<DoctorAvailabilitySlot[]> {
    const params = doctorId ? { doctorId } : undefined;
    const res = await api.get('doctor-availability', { params });
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data?.data)) return res.data.data;
    return [];
  },

  /**
   * Fetch availability slots for a specific doctor
   */
  async getByDoctor(doctorId: string): Promise<DoctorAvailabilitySlot[]> {
    const res = await api.get(`doctor-availability/doctor/${doctorId}`);
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data?.data)) return res.data.data;
    return [];
  },

  /**
   * Create a new availability slot
   */
  async create(payload: CreateAvailabilityPayload): Promise<DoctorAvailabilitySlot> {
    const res = await api.post('doctor-availability', payload);
    return res.data?.data || res.data;
  },

  /**
   * Update an existing availability slot
   */
  async update(id: string, payload: CreateAvailabilityPayload): Promise<DoctorAvailabilitySlot> {
    const res = await api.put(`doctor-availability/${id}`, payload);
    return res.data?.data || res.data;
  },

  /**
   * Delete an availability slot
   */
  async delete(id: string): Promise<void> {
    await api.delete(`doctor-availability/${id}`);
  },

  /**
   * Bulk update slot duration/length across all availability slots for a doctor
   */
  async updateDoctorSlotLength(
    doctorId: string,
    slotLength: number
  ): Promise<{ success: boolean; count: number; data: DoctorAvailabilitySlot[] }> {
    const res = await api.put(`doctor-availability/doctor/${doctorId}/slot-length`, {
      slot_length: slotLength,
    });
    return res.data;
  },

  /**
   * Fetch all blocked dates and time ranges for a doctor
   */
  async getBlockedDates(doctorId: string): Promise<DoctorBlockedDate[]> {
    const res = await api.get(`doctor-availability/doctor/${doctorId}/blocked-dates`);
    if (Array.isArray(res.data)) return res.data;
    if (Array.isArray(res.data?.data)) return res.data.data;
    return [];
  },

  /**
   * Block a specific date or time range for a doctor
   */
  async createBlockedDate(
    doctorId: string,
    payload: CreateBlockedDatePayload
  ): Promise<DoctorBlockedDate> {
    const res = await api.post(
      `doctor-availability/doctor/${doctorId}/blocked-dates`,
      payload
    );
    return res.data?.data || res.data;
  },

  /**
   * Update an existing blocked date or time range
   */
  async updateBlockedDate(
    doctorId: string,
    blockId: string,
    payload: Partial<CreateBlockedDatePayload>
  ): Promise<DoctorBlockedDate> {
    const res = await api.put(
      `doctor-availability/doctor/${doctorId}/blocked-dates/${blockId}`,
      payload
    );
    return res.data?.data || res.data;
  },

  /**
   * Remove/unblock a blocked date
   */
  async deleteBlockedDate(doctorId: string, blockId: string): Promise<void> {
    await api.delete(`doctor-availability/doctor/${doctorId}/blocked-dates/${blockId}`);
  },
};

