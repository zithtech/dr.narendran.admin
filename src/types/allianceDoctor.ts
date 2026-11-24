export interface AllianceDoctor {
  id: string;
  name: string;
  category: string | null;
  specialization: string | null;
  qualification: string | null;
  experience_years: number | null;
  gender: string | null;
  mobile_number: string | null;
  alternate_mobile_number: string | null;
  email: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  hospital_clinic_name: string | null;
  registration_number: string | null;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

export interface AllianceDoctorInput {
  name: string;
  category?: string | null;
  specialization?: string | null;
  qualification?: string | null;
  experience_years?: number | null;
  gender?: string | null;
  mobile_number?: string | null;
  alternate_mobile_number?: string | null;
  email?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  district?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  hospital_clinic_name?: string | null;
  registration_number?: string | null;
  description?: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface AllianceCategory {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
  updated_at?: string;
}

export interface AllianceSpecialization {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
  updated_at?: string;
}
