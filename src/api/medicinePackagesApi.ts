import api from '../utils/api';
import type {
  CreatePackagePayload,
  Medicine,
  MedicinePackage,
  UpdatePackagePayload,
} from '../types/pharmacy';

export const medicinePackagesApi = {
  /**
   * Fetch all medicine packages (including nested medicines and doctor details)
   */
  async getAll(doctorId?: string): Promise<MedicinePackage[]> {
    const params = doctorId ? { doctor_id: doctorId } : undefined;
    const res = await api.get('medicines/packages/all', { params });
    if (Array.isArray(res.data)) {
      return res.data;
    }
    if (Array.isArray(res.data?.data)) {
      return res.data.data;
    }
    return [];
  },

  /**
   * Fetch a single medicine package by its UUID
   */
  async getById(id: string): Promise<MedicinePackage> {
    const res = await api.get(`medicines/packages/${id}`);
    return res.data?.data || res.data;
  },

  /**
   * Create a new grouped medicine package
   */
  async create(payload: CreatePackagePayload): Promise<MedicinePackage> {
    const res = await api.post('medicines/packages', payload);
    return res.data?.data || res.data;
  },

  /**
   * Update an existing medicine package (name, description, medicine associations)
   */
  async update(id: string, payload: UpdatePackagePayload): Promise<MedicinePackage> {
    const res = await api.put(`medicines/packages/${id}`, payload);
    return res.data?.data || res.data;
  },

  /**
   * Delete a medicine package (without removing original pharmacy medicines)
   */
  async delete(id: string): Promise<void> {
    await api.delete(`medicines/packages/${id}`);
  },

  /**
   * Fetch all medicines from the existing Pharmacy module
   */
  async getPharmacyMedicines(): Promise<Medicine[]> {
    const res = await api.get('medicines', { params: { limit: 1000, offset: 0 } });
    if (res.data?.medicines && Array.isArray(res.data.medicines)) {
      return res.data.medicines;
    }
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data?.data || [];
  },
};

