export interface DoctorLocation {
  id: string;
  doctor_id: string;
  location_name: string;
  address: string | null;
  map_link: string | null;
  is_primary: boolean;
  status: 'Active' | 'Inactive' | string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateLocationInput {
  location_name: string;
  address?: string | null;
  map_link?: string | null;
  is_primary?: boolean;
  status?: string;
}

export interface UpdateLocationInput {
  location_name?: string;
  address?: string | null;
  map_link?: string | null;
  is_primary?: boolean;
  status?: string;
}

export interface DoctorSummaryWithLocations {
  id: string;
  name: string;
  specialty?: string;
  specialization?: string;
  qualification?: string;
  phone?: string;
  email?: string;
  profile_image_url?: string | null;
  hospital_name?: string;
  branch_name?: string;
  status?: string;
  locations_count?: number;
}

