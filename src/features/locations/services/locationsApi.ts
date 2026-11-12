import api from '../../../utils/api';
import type {
  CreateLocationInput,
  DoctorLocation,
  DoctorSummaryWithLocations,
  UpdateLocationInput,
} from '../types/locations';

export const locationsApi = {
  async getLocations(doctorId?: string): Promise<DoctorLocation[]> {
    const endpoint = doctorId ? `doctors/${doctorId}/locations/all` : 'doctors/me/locations';
    const res = await api.get(endpoint);
    return Array.isArray(res.data) ? res.data : (res.data?.data || []);
  },

  async createLocation(
    data: CreateLocationInput,
    doctorId?: string
  ): Promise<DoctorLocation> {
    const endpoint = doctorId ? `doctors/${doctorId}/locations` : 'doctors/me/locations';
    const res = await api.post(endpoint, data);
    return res.data;
  },

  async updateLocation(
    locationId: string,
    data: UpdateLocationInput,
    doctorId?: string
  ): Promise<DoctorLocation> {
    const endpoint = doctorId
      ? `doctors/${doctorId}/locations/${locationId}`
      : `doctors/me/locations/${locationId}`;
    const res = await api.put(endpoint, data);
    return res.data;
  },

  async deleteLocation(locationId: string, doctorId?: string): Promise<void> {
    const endpoint = doctorId
      ? `doctors/${doctorId}/locations/${locationId}`
      : `doctors/me/locations/${locationId}`;
    await api.delete(endpoint);
  },

  async setPrimaryLocation(locationId: string, doctorId?: string): Promise<void> {
    const endpoint = doctorId
      ? `doctors/${doctorId}/locations/${locationId}/primary`
      : `doctors/me/locations/${locationId}/primary`;
    await api.put(endpoint);
  },

  async getDoctors(search?: string): Promise<DoctorSummaryWithLocations[]> {
    const params: Record<string, string> = {};
    if (search && search.trim()) {
      params['search'] = search.trim();
    }
    const res = await api.get('doctors', { params });
    const list = res.data?.data || res.data || [];
    return Array.isArray(list) ? list : [];
  },

  async getCurrentDoctorProfile(): Promise<DoctorSummaryWithLocations | null> {
    try {
      const res = await api.get('doctors/me');
      return res.data || null;
    } catch {
      return null;
    }
  },
};

