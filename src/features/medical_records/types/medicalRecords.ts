export interface MedicalRecord {
  id: string;
  prescriptionLabTestId: string | null;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  patientEmail: string | null;
  fileName: string;
  fileType: string;
  fileSize: number;
  reportDate: string;
  documentUrl: string;
  storageKey: string | null;
  notes: string | null;
  uploadedBy: string;
  uploadedById: string;
  uploaderName: string;
  isExternal: boolean;
  testName: string;
  prescriptionId: string | null;
  prescriptionDate: string | null;
  doctorName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PrescribedPendingTest {
  id: string;
  prescriptionId: string;
  patientId: string;
  labTestId: string | null;
  testName: string;
  instructions: string | null;
  prescriptionDate: string | null;
  doctorName: string | null;
  doctorSpecialization: string | null;
  status: 'Pending' | 'Uploaded';
  reportsCount: number;
  createdAt: string;
}

export interface PatientDossier {
  patient: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    dateOfBirth: string | null;
    gender: string | null;
    bloodGroup: string | null;
    address: string | null;
    profileImageUrl: string | null;
  };
  pendingPrescribedTests: PrescribedPendingTest[];
  records: MedicalRecord[];
}

export interface MedicalRecordsListResponse {
  records: MedicalRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface MedicalRecordsFilterParams {
  page?: number;
  limit?: number;
  search?: string;
  patientId?: string;
  type?: 'ALL' | 'PRESCRIBED' | 'EXTERNAL';
  uploadedBy?: string;
  fromDate?: string;
  toDate?: string;
}

export interface UploadMedicalRecordPayload {
  file: File;
  patientId: string;
  testName: string;
  reportDate?: string;
  notes?: string;
  prescriptionLabTestId?: string;
  isExternal?: boolean;
  allowDuplicate?: boolean;
}

export interface UpdateMedicalRecordPayload {
  testName?: string;
  reportDate?: string;
  notes?: string;
}
