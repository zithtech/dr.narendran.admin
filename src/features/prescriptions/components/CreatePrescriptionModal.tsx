import { App, AutoComplete, Drawer, Dropdown, Select, Spin, Tag, Tooltip } from 'antd';
import dayjs from 'dayjs';
import {
  Building2,
  ChevronDown,
  Clock,
  FlaskConical,
  MapPin,
  Package,
  Phone,
  Pill,
  Plus,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  Trash2,
  User,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { medicinePackagesApi } from '../../../api/medicinePackagesApi';
import MedicineModal from '../../../components/MedicineModal';
import { SearchableSelect, type SearchableSelectOption } from '../../../components/ui/SearchableSelect';
import { usePermission } from '../../../context/PermissionContext';
import type { Medicine, MedicinePackage } from '../../../types/pharmacy';
import api from '../../../utils/api';
import { getErrorMessage } from '../../../utils/errors';
import {
  type CreatePrescriptionPayload,
  type Prescription,
  prescriptionsApi,
} from '../api/prescriptionsApi';

interface PatientOption {
  id: string;
  name: string;
  phone?: string | undefined;
  gender?: string | undefined;
  date_of_birth?: string | undefined;
}

interface DoctorOption {
  id: string;
  name: string;
  specialization?: string | undefined;
}

export interface LinkedLabItem {
  id: string;
  name: string;
  phone?: string | null | undefined;
  email?: string | null | undefined;
  address_line_1?: string | null | undefined;
  address_line_2?: string | null | undefined;
  city?: string | null | undefined;
  state?: string | null | undefined;
  pincode?: string | null | undefined;
  start_time?: string | null | undefined;
  end_time?: string | null | undefined;
  map_link?: string | null | undefined;
  services?: { id: string; name: string }[] | undefined;
  status?: string | undefined;
}

export interface PharmacyMedicineVariant {
  id: string;
  strength: string;
  strength_unit?: string | null | undefined;
  dosage_form: string;
  available_quantity?: number | null | undefined;
  mrp?: number | null | undefined;
  final_price?: number | null | undefined;
  variant_code?: string | null | undefined;
  status?: string | undefined;
}

export interface MedicineRow {
  key: string;
  medicineId?: string | undefined;
  name: string;
  // Pharmacy module populated fields
  genericName?: string | undefined;
  dosageForm?: string | undefined;
  strength: string;
  dosage: string;
  therapeuticCategory?: string | undefined;
  subCategory?: string | undefined;
  manufacturer?: string | undefined;
  prescriptionRequired?: boolean | undefined;
  mrp?: number | null | undefined;
  finalPrice?: number | null | undefined;
  availableStock?: number | null | undefined;
  variants?: PharmacyMedicineVariant[] | undefined;
  selectedVariantId?: string | undefined;
  // Prescription clinical fields
  frequency: string;
  duration: string;
  mealTiming: string;
  instructions: string;
  prescribedQuantity: number;
}

export interface LabRow {
  key: string;
  labTestId?: string | undefined;
  testName: string;
  instructions: string;
  labId?: string | undefined;
  selectedLab?: LinkedLabItem | null | undefined;
}

interface CreatePrescriptionModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (prescription: Prescription) => void;
  /** If creating for a specific patient */
  preselectedPatient?: {
    id: string;
    name: string;
    phone?: string | undefined;
    gender?: string | undefined;
    date_of_birth?: string | undefined;
  } | undefined;
  /** If creating for a specific appointment/consultation */
  appointmentId?: string | undefined;
  appointmentToken?: string | number | undefined;
  appointmentDoctorId?: string | undefined;
  /** If editing an existing prescription */
  editingPrescription?: Prescription | null | undefined;
}

const COMMON_DIAGNOSES = [
  'General Consultation',
  'Hypertension',
  'Type 2 Diabetes Mellitus',
  'Upper Respiratory Infection',
  'Acute Gastritis',
  'Viral Fever',
  'Migraine / Headache',
  'Allergic Rhinitis',
  'Musculoskeletal Pain',
  'Dyslipidemia',
];

const COMMON_FREQUENCIES = [
  { label: '1-0-1 (Twice daily)', value: '1-0-1' },
  { label: '1-0-0 (Morning)', value: '1-0-0' },
  { label: '0-0-1 (Night)', value: '0-0-1' },
  { label: '1-1-1 (Thrice daily)', value: '1-1-1' },
  { label: '1-1-1-1 (4 times daily)', value: '1-1-1-1' },
  { label: 'SOS (As needed)', value: 'SOS' },
];

const COMMON_MEAL_TIMINGS = ['After Food', 'Before Food', 'With Food', 'Empty Stomach'];

const COMMON_DURATIONS = ['3 Days', '5 Days', '7 Days', '10 Days', '14 Days', '1 Month'];

const COMMON_LAB_INVESTIGATIONS = [
  'Complete Blood Count (CBC)',
  'Fasting Blood Sugar (FBS)',
  'Post-Prandial Blood Sugar (PPBS)',
  'HbA1c (Glycated Hemoglobin)',
  'Lipid Profile',
  'Liver Function Test (LFT)',
  'Renal / Kidney Function Test (KFT)',
  'Thyroid Profile (T3, T4, TSH)',
  'Urine Routine & Microscopic',
  'Serum Creatinine & Urea',
  'Serum Electrolytes',
  'Serum Uric Acid',
  'Vitamin D3 (25-OH)',
  'Vitamin B12',
  'C-Reactive Protein (CRP)',
  'Chest X-Ray (PA View)',
  '12-Lead Electrocardiogram (ECG)',
  'Ultrasound Abdomen & Pelvis (USG)',
];

const COMMON_LAB_PREPARATIONS = [
  'Fasting 10-12 hrs',
  'Post-prandial (2 hrs after food)',
  'Morning first mid-stream urine',
  'Random / No special prep',
  'Avoid iron / medication 24h prior',
];

export default function CreatePrescriptionModal({
  open,
  onClose,
  onSuccess,
  preselectedPatient,
  appointmentId,
  appointmentToken,
  appointmentDoctorId,
  editingPrescription,
}: CreatePrescriptionModalProps) {
  const { message } = App.useApp();
  const { canCreate } = usePermission();
  const canAddPharmacyMedicine = canCreate('PHARMACY') || canCreate('PRESCRIPTIONS');

  const [isAddMedicineModalOpen, setIsAddMedicineModalOpen] = useState(false);
  const [medicineModalInitialName, setMedicineModalInitialName] = useState('');
  const [medicineModalTargetRowIndex, setMedicineModalTargetRowIndex] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<PatientOption | null>(null);

  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');

  const [diagnosis, setDiagnosis] = useState('');
  const [generalInstructions, setGeneralInstructions] = useState('');
  const [followUpDate, setFollowUpDate] = useState<string>('');
  const [followUpDays, setFollowUpDays] = useState<number | undefined>(undefined);
  const [markCompleted, setMarkCompleted] = useState(true);

  // Pharmacy catalog options for autocomplete
  const [medicineOptions, setMedicineOptions] = useState<
    { key: string; value: string; label: React.ReactNode; raw: any; searchKey: string }[]
  >([]);
  const [medicineSearching, setMedicineSearching] = useState(false);
  const medicinesMapRef = useRef<Map<string, any>>(new Map());
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSearchQueryRef = useRef<string>('');

  // Linked Labs & Lab Services catalog
  const [availableLabs, setAvailableLabs] = useState<LinkedLabItem[]>([]);
  const [labsLoading, setLabsLoading] = useState(false);
  const [systemLabServices, setSystemLabServices] = useState<{ id: string; name: string }[]>([]);

  const [medicines, setMedicines] = useState<MedicineRow[]>([
    {
      key: 'med-1',
      name: '',
      strength: '',
      dosage: '1 Tablet',
      dosageForm: 'Tablet',
      frequency: '1-0-1',
      duration: '5 Days',
      mealTiming: 'After Food',
      instructions: '',
      prescribedQuantity: 10,
    },
  ]);

  const [labTests, setLabTests] = useState<LabRow[]>([]);

  // Available medicine packages for quick application
  const [availablePackages, setAvailablePackages] = useState<MedicinePackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);

  // Fetch registered patients
  const fetchPatients = useCallback(async (query?: string) => {
    setPatientSearchLoading(true);
    try {
      const res = await api.get<PatientOption[]>('patients', {
        params: query?.trim() ? { search: query.trim() } : undefined,
      });
      const rawPatients = Array.isArray(res.data)
        ? res.data
        : (res.data as any)?.data || [];
      const patientsList: PatientOption[] = rawPatients.map((p: any) => ({
        id: p.id,
        name: p.name || 'Unnamed Patient',
        phone: p.phone ?? undefined,
        gender: p.gender ?? undefined,
        date_of_birth: p.date_of_birth ?? undefined,
      }));
      setPatients(patientsList);
      return patientsList;
    } catch (err: unknown) {
      console.error('Failed to load patients list:', err);
      message.error(getErrorMessage(err, 'Failed to load patients list'));
      return [];
    } finally {
      setPatientSearchLoading(false);
    }
  }, [message]);

  // Map patient list to SearchableSelect options
  const patientOptions = useMemo<SearchableSelectOption[]>(() => {
    return patients.map((p) => {
      const details = [p.phone, p.gender].filter(Boolean).join(' • ');
      return {
        value: p.id,
        label: p.name,
        sublabel: details || undefined,
        badge: p.gender ? p.gender.toUpperCase() : undefined,
        badgeTone: p.gender?.toLowerCase() === 'female' ? 'violet' : 'blue',
        extraSearchTerms: [p.phone || '', p.gender || '', p.id],
      };
    });
  }, [patients]);

  // Load doctors, linked labs, lab services, patients & medicine packages on modal open
  useEffect(() => {
    if (!open) return;

    void fetchMedicines('');
    void fetchPatients();

    void (async () => {
      setLabsLoading(true);
      setPackagesLoading(true);
      try {
        const [docsRes, labsRes, servicesRes, packagesRes] = await Promise.all([
          api.get('doctors'),
          api.get('labs').catch(() => ({ data: [] })),
          api.get('lab-services').catch(() => ({ data: [] })),
          medicinePackagesApi.getAll().catch(() => []),
        ]);

        setAvailablePackages(packagesRes);

        const docsList = (docsRes.data?.data || docsRes.data || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          specialization: d.specialization,
        }));
        setDoctors(docsList);

        if (appointmentDoctorId) {
          setSelectedDoctorId(appointmentDoctorId);
        } else if (docsList.length > 0 && !selectedDoctorId) {
          setSelectedDoctorId(docsList[0].id);
        }

        const rawLabs = labsRes.data?.data || labsRes.data || [];
        const labsList: LinkedLabItem[] = rawLabs.map((l: any) => ({
          id: l.id,
          name: l.name,
          phone: l.phone,
          email: l.email,
          address_line_1: l.address_line_1,
          address_line_2: l.address_line_2,
          city: l.city,
          state: l.state,
          pincode: l.pincode,
          start_time: l.start_time,
          end_time: l.end_time,
          map_link: l.map_link,
          services: Array.isArray(l.services) ? l.services : [],
          status: l.status || 'ACTIVE',
        }));
        setAvailableLabs(labsList);

        const rawServices = servicesRes.data?.data || servicesRes.data || [];
        const sList = rawServices.map((s: any) => ({ id: s.id, name: s.name }));
        setSystemLabServices(sList);
      } catch (err) {
        console.error('Failed to preload doctors/labs/packages:', err);
      } finally {
        setLabsLoading(false);
        setPackagesLoading(false);
      }
    })();
  }, [open, appointmentDoctorId, fetchPatients]);

  // Set patient state
  useEffect(() => {
    if (preselectedPatient) {
      setSelectedPatientId(preselectedPatient.id);
      setSelectedPatient(preselectedPatient);
    } else if (editingPrescription?.patient_id) {
      setSelectedPatientId(editingPrescription.patient_id);
      setSelectedPatient({
        id: editingPrescription.patient_id,
        name: editingPrescription.patient_name || 'Patient',
        phone: editingPrescription.patient_phone ?? undefined,
        gender: editingPrescription.patient_gender ?? undefined,
        date_of_birth: editingPrescription.patient_dob ?? undefined,
      });
    }
  }, [preselectedPatient, editingPrescription]);

  // Populate fields if in edit mode
  useEffect(() => {
    if (editingPrescription) {
      setDiagnosis(editingPrescription.diagnosis || editingPrescription.additional_notes || '');
      setGeneralInstructions(editingPrescription.additional_notes || '');
      if (editingPrescription.follow_up_date) {
        setFollowUpDate(editingPrescription.follow_up_date);
      }
      if (editingPrescription.follow_up_days) {
        setFollowUpDays(editingPrescription.follow_up_days);
      }
      if (editingPrescription.doctor?.id) {
        setSelectedDoctorId(editingPrescription.doctor.id);
      }

      if (editingPrescription.medicines?.length > 0) {
        setMedicines(
          editingPrescription.medicines.map((m, idx) => ({
            key: `med-edit-${idx}`,
            medicineId: m.medicine_id ?? undefined,
            name: m.medicine_name,
            genericName: m.generic_name,
            dosageForm: m.dosage_form || 'Tablet',
            strength: m.strength || '',
            dosage: m.dosage || '1 Tablet',
            frequency: m.frequency || '1-0-1',
            duration: m.duration || '5 Days',
            mealTiming: m.food_instruction || 'After Food',
            instructions: m.instructions || '',
            prescribedQuantity: m.prescribed_quantity || 10,
            manufacturer: m.manufacturer,
            therapeuticCategory: m.therapeutic_category,
            mrp: m.mrp,
            finalPrice: m.final_price,
            availableStock: m.available_quantity,
          }))
        );
      }

      if (editingPrescription.lab_tests && editingPrescription.lab_tests.length > 0) {
        setLabTests(
          editingPrescription.lab_tests.map((l, idx) => {
            const matchedLab = availableLabs.find((lab) => lab.id === l.lab_id);
            return {
              key: `lab-edit-${idx}`,
              labTestId: l.lab_test_id ?? undefined,
              testName: l.test_name,
              instructions: l.instructions || '',
              labId: l.lab_id ?? undefined,
              selectedLab: matchedLab || (l.lab_name ? {
                id: l.lab_id || '',
                name: l.lab_name,
                city: l.lab_city,
                address_line_1: l.lab_address,
                phone: l.lab_phone,
              } : undefined),
            };
          })
        );
      }
    } else if (open && !preselectedPatient) {
      // Reset if newly opened
      setDiagnosis('');
      setGeneralInstructions('');
      setFollowUpDate('');
      setFollowUpDays(undefined);
      setMedicines([
        {
          key: 'med-1',
          name: '',
          strength: '',
          dosage: '1 Tablet',
          dosageForm: 'Tablet',
          frequency: '1-0-1',
          duration: '5 Days',
          mealTiming: 'After Food',
          instructions: '',
          prescribedQuantity: 10,
        },
      ]);
      setLabTests([]);
    }
    if (!open) {
      setIsAddMedicineModalOpen(false);
      setMedicineModalInitialName('');
      setMedicineModalTargetRowIndex(null);
    }
  }, [editingPrescription, open, preselectedPatient]);

  useEffect(() => {
    if (!open || !editingPrescription || availableLabs.length === 0) return;
    setLabTests((prev) =>
      prev.map((item) => {
        if (!item.labId) return item;
        const matched = availableLabs.find((lab) => lab.id === item.labId);
        return matched ? { ...item, selectedLab: matched } : item;
      }),
    );
  }, [editingPrescription, open, availableLabs]);

  const toMedicineOption = useCallback((m: any) => {
    const totalStock =
      m.variants && m.variants.length > 0
        ? m.variants.reduce((acc: number, v: any) => acc + (Number(v.available_quantity) || 0), 0)
        : m.available_quantity != null
          ? Number(m.available_quantity)
          : null;

    const price = m.final_price || m.mrp || m.variants?.[0]?.final_price || m.variants?.[0]?.mrp || null;
    const formStr = m.dosage_form || m.variants?.[0]?.dosage_form || 'Tablet';
    const strengthStr = m.strength
      ? `${m.strength} ${m.strength_unit || ''}`.trim()
      : m.variants?.[0]?.strength
        ? `${m.variants[0].strength} ${m.variants[0].strength_unit || ''}`.trim()
        : '';

    return {
      key: m.id || `${m.medicine_name}-${Math.random()}`,
      value: m.medicine_name || m.name,
      searchKey: `${m.medicine_name || m.name} ${m.generic_name || ''} ${m.manufacturer || ''}`,
      raw: m,
      label: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '4px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontWeight: 650, color: '#0f172a', fontSize: 13 }}>
              {m.medicine_name || m.name}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {formStr && (
                <span
                  style={{
                    fontSize: 10.5,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: '#f1f5f9',
                    color: '#475569',
                    fontWeight: 500,
                  }}
                >
                  {formStr}
                </span>
              )}
              {strengthStr && (
                <span
                  style={{
                    fontSize: 10.5,
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: '#f5f3ff',
                    color: '#7c3aed',
                    fontWeight: 600,
                    border: '1px solid #ede9fe',
                  }}
                >
                  {strengthStr}
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#64748b' }}>
            <span style={{ fontStyle: m.generic_name ? 'normal' : 'italic' }}>
              {m.generic_name ? `Comp: ${m.generic_name}` : m.therapeutic_category || 'General'}
            </span>
            {totalStock !== null && (
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: totalStock > 0 ? '#15803d' : '#dc2626',
                }}
              >
                {totalStock > 0 ? `Stock: ${totalStock}` : 'Out of stock'}
              </span>
            )}
          </div>

          {(m.manufacturer || price) && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10.5, color: '#94a3b8' }}>
              <span>{m.manufacturer ? `Mfr: ${m.manufacturer}` : ''}</span>
              {price && <span style={{ fontWeight: 600, color: '#0f172a' }}>₹{Number(price).toFixed(2)}</span>}
            </div>
          )}
        </div>
      ),
    };
  }, []);


  // Search medicines from the Pharmacy module
  const fetchMedicines = async (query: string) => {
    latestSearchQueryRef.current = query;
    setMedicineSearching(true);
    try {
      const params: Record<string, any> = { limit: 30 };
      if (query && query.trim()) {
        params.search = query.trim();
      }
      const res = await api.get('/medicines', { params });

      // Discard results if a newer search was initiated
      if (latestSearchQueryRef.current !== query) {
        return;
      }

      const raw = res.data;
      const items: any[] = Array.isArray(raw?.medicines)
        ? raw.medicines
        : Array.isArray(raw?.data)
        ? raw.data
        : Array.isArray(raw)
        ? raw
        : [];

      items.forEach((m: any) => {
        if (m.id) medicinesMapRef.current.set(m.id, m);
        if (m.medicine_name) medicinesMapRef.current.set(m.medicine_name, m);
      });

      const opts = items.map(toMedicineOption);

      setMedicineOptions(opts);
    } catch {
      setMedicineOptions([]);
    } finally {
      setMedicineSearching(false);
    }
  };

  const handleSearchMedicines = (term: string, immediate = false) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (immediate) {
      void fetchMedicines(term);
    } else {
      searchTimeoutRef.current = setTimeout(() => {
        void fetchMedicines(term);
      }, 200);
    }
  };

  // Auto-calculate quantity
  const calculateQuantity = (freq: string, dur: string): number => {
    let timesPerDay = 1;
    if (freq.includes('1-1-1-1')) timesPerDay = 4;
    else if (freq.includes('1-1-1')) timesPerDay = 3;
    else if (freq.includes('1-0-1')) timesPerDay = 2;
    else if (freq.includes('1-0-0') || freq.includes('0-0-1') || freq.includes('0-1-0')) timesPerDay = 1;
    else if (freq.toLowerCase().includes('twice')) timesPerDay = 2;
    else if (freq.toLowerCase().includes('thrice')) timesPerDay = 3;

    let days = 5;
    const durNum = parseInt(dur.replace(/\D/g, ''), 10);
    if (!isNaN(durNum) && durNum > 0) {
      if (dur.toLowerCase().includes('month')) days = durNum * 30;
      else if (dur.toLowerCase().includes('week')) days = durNum * 7;
      else days = durNum;
    }
    return Math.max(1, timesPerDay * days);
  };

  const handleUpdateMedicine = (index: number, field: keyof MedicineRow, value: any) => {
    setMedicines((prev) => {
      const copy = [...prev];
      const row = copy[index];
      if (!row) return prev;
      copy[index] = { ...row, [field]: value };
      if (field === 'frequency' || field === 'duration') {
        const qty = calculateQuantity(
          field === 'frequency' ? value : row.frequency,
          field === 'duration' ? value : row.duration
        );
        const updatedRow = copy[index];
        if (updatedRow) {
          updatedRow.prescribedQuantity = qty;
        }
      }
      return copy;
    });
  };

  const buildMedicineRowFromCatalog = (
    raw: any,
    existingKey?: string,
    existingInstructions?: string,
  ): MedicineRow => {
    const variants: PharmacyMedicineVariant[] = Array.isArray(raw.variants) ? raw.variants : [];
    const firstVariant = variants.length > 0 ? variants[0] : null;

    const form = raw.dosage_form || firstVariant?.dosage_form || 'Tablet';
    const strengthStr = raw.strength
      ? `${raw.strength} ${raw.strength_unit || ''}`.trim()
      : firstVariant?.strength
      ? `${firstVariant.strength} ${firstVariant.strength_unit || ''}`.trim()
      : '';

    const price = raw.final_price || raw.mrp || firstVariant?.final_price || firstVariant?.mrp || null;
    const totalStock = variants.length > 0
      ? variants.reduce((acc, v) => acc + (Number(v.available_quantity) || 0), 0)
      : (raw.available_quantity != null ? Number(raw.available_quantity) : null);

    const defaultFreq = raw.frequency || '1-0-1';
    const defaultDur = raw.duration || '5 Days';
    const autoQty = calculateQuantity(defaultFreq, defaultDur);

    return {
      key: existingKey || `med-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      medicineId: raw.id,
      name: raw.medicine_name || raw.name,
      genericName: raw.generic_name || '',
      dosageForm: form,
      strength: strengthStr,
      dosage: `1 ${form}`,
      therapeuticCategory: raw.therapeutic_category || '',
      subCategory: raw.sub_category || '',
      manufacturer: raw.manufacturer || '',
      prescriptionRequired: Boolean(raw.prescription_required),
      mrp: raw.mrp ? Number(raw.mrp) : null,
      finalPrice: price ? Number(price) : null,
      availableStock: totalStock,
      variants,
      selectedVariantId: firstVariant?.id,
      frequency: defaultFreq,
      duration: defaultDur,
      mealTiming: 'After Food',
      instructions: raw.description || existingInstructions || '',
      prescribedQuantity: autoQty,
    };
  };

  // Auto-populate all details from Pharmacy module upon selection
  const handleSelectMedicineOption = (index: number, option: any) => {
    const raw =
      option?.raw ||
      (option?.key ? medicinesMapRef.current.get(option.key) : null) ||
      (option?.value ? medicinesMapRef.current.get(option.value) : null);
    if (!raw) return;

    setMedicines((prev) => {
      const copy = [...prev];
      const row = copy[index];
      if (!row) return prev;
      copy[index] = buildMedicineRowFromCatalog(raw, row.key, row.instructions);
      return copy;
    });
  };

  // Switch strength variant of an already selected medicine
  const handleSelectVariant = (index: number, variantId?: string | undefined) => {
    if (!variantId) return;
    setMedicines((prev) => {
      const copy = [...prev];
      const row = copy[index];
      if (!row || !row.variants) return prev;
      const v = row.variants.find((item) => item.id === variantId);
      if (!v) return prev;

      const strengthStr = `${v.strength} ${v.strength_unit || ''}`.trim();
      const form = v.dosage_form || row.dosageForm || 'Tablet';
      copy[index] = {
        ...row,
        selectedVariantId: v.id,
        strength: strengthStr,
        dosageForm: form,
        dosage: `1 ${form}`,
        finalPrice: v.final_price || v.mrp || row.finalPrice,
        availableStock: v.available_quantity != null ? Number(v.available_quantity) : row.availableStock,
      };
      return copy;
    });
  };

  // Apply a medicine package: populate all medicines from the package into prescription
  const handleApplyPackage = (pkg: MedicinePackage) => {
    if (!pkg.medicines || pkg.medicines.length === 0) {
      message.warning(`Package "${pkg.name}" contains no medicines.`);
      return;
    }

    const packageRows: MedicineRow[] = pkg.medicines.map((m, idx) => {
      const dosageForm = m.dosage_form?.trim() || 'Tablet';
      const strength = [m.strength, m.strength_unit].filter(Boolean).join(' ') || m.strength || '';

      return {
        key: `med-pkg-${Date.now()}-${idx}-${m.id.slice(0, 6)}`,
        medicineId: m.id, // Reuses existing Pharmacy medicine record - NO duplicate records!
        name: m.medicine_name,
        genericName: m.generic_name || undefined,
        dosageForm,
        strength,
        dosage: `1 ${dosageForm}`,
        frequency: '', // Left blank so the doctor manually selects frequency
        duration: '5 Days',
        mealTiming: 'After Food',
        instructions: '',
        prescribedQuantity: 10,
        manufacturer: m.manufacturer || undefined,
        therapeuticCategory: m.therapeutic_category || undefined,
        mrp: m.mrp ? Number(m.mrp) : undefined,
        finalPrice: m.final_price ? Number(m.final_price) : undefined,
        availableStock:
          (m as any).available_quantity ??
          (m.variants && m.variants.length > 0
            ? m.variants.reduce((acc, v) => acc + (Number(v.available_quantity) || 0), 0)
            : undefined),
      };
    });

    setMedicines((prev) => {
      // If the current list has only 1 blank row without any input, replace it
      const isSingleBlank = prev.length === 1 && !prev[0]?.name.trim() && !prev[0]?.medicineId;
      if (isSingleBlank) {
        return packageRows;
      }
      return [...prev, ...packageRows];
    });

    message.success(
      `Package "${pkg.name}" applied (${packageRows.length} medicine${packageRows.length > 1 ? 's' : ''}). Please enter frequency for each medicine.`
    );
  };

  const handleAddMedicineRow = () => {
    setMedicines((prev) => [
      ...prev,
      {
        key: `med-${Date.now()}`,
        name: '',
        strength: '',
        dosage: '1 Tablet',
        dosageForm: 'Tablet',
        frequency: '1-0-1',
        duration: '5 Days',
        mealTiming: 'After Food',
        instructions: '',
        prescribedQuantity: 10,
      },
    ]);
  };

  const handleOpenAddMedicineDrawer = (targetRowIndex: number | null = null, initialName = '') => {
    setMedicineModalTargetRowIndex(targetRowIndex);
    setMedicineModalInitialName(initialName.trim());
    setIsAddMedicineModalOpen(true);
  };

  const handlePharmacyMedicineSaved = (savedMedicine?: Medicine) => {
    if (!savedMedicine) {
      void fetchMedicines('');
      return;
    }

    if (savedMedicine.id) medicinesMapRef.current.set(savedMedicine.id, savedMedicine);
    if (savedMedicine.medicine_name) medicinesMapRef.current.set(savedMedicine.medicine_name, savedMedicine);

    const newOpt = toMedicineOption(savedMedicine);
    setMedicineOptions((prev) => {
      const filtered = prev.filter((opt) => opt.key !== newOpt.key);
      return [newOpt, ...filtered];
    });

    setMedicines((prev) => {
      const targetIdx =
        medicineModalTargetRowIndex !== null && prev[medicineModalTargetRowIndex]
          ? medicineModalTargetRowIndex
          : prev.findIndex((row) => !row.name.trim() && !row.medicineId);

      if (targetIdx >= 0) {
        const copy = [...prev];
        const existingRow = copy[targetIdx];
        copy[targetIdx] = buildMedicineRowFromCatalog(
          savedMedicine,
          existingRow?.key,
          existingRow?.instructions,
        );
        return copy;
      }

      return [...prev, buildMedicineRowFromCatalog(savedMedicine)];
    });

    setMedicineModalTargetRowIndex(null);
    setMedicineModalInitialName('');
    message.success(
      `${savedMedicine.medicine_name || 'Medicine'} added to Pharmacy and selected in prescription.`,
    );
    void fetchMedicines('');
  };

  const handleRemoveMedicine = (index: number) => {
    if (medicines.length <= 1) return;
    setMedicines((prev) => prev.filter((_, i) => i !== index));
  };

  // Linked Labs management
  const handleAddLabTest = () => {
    // If previous lab was assigned, carry it over as friendly default
    const lastLab = labTests.length > 0 ? labTests[labTests.length - 1]?.selectedLab : availableLabs[0];
    setLabTests((prev) => [
      ...prev,
      {
        key: `lab-${Date.now()}`,
        testName: '',
        instructions: '',
        labId: lastLab?.id,
        selectedLab: lastLab,
      },
    ]);
  };

  const handleRemoveLabTest = (index: number) => {
    setLabTests((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectLab = (index: number, labId?: string | undefined) => {
    const lab = labId ? availableLabs.find((l) => l.id === labId) : null;
    setLabTests((prev) => {
      const copy = [...prev];
      const item = copy[index];
      if (!item) return prev;
      copy[index] = {
        ...item,
        labId: lab?.id,
        selectedLab: lab || null,
      };
      return copy;
    });
  };

  const handleQuickFollowUp = (days: number) => {
    setFollowUpDays(days);
    const d = dayjs().add(days, 'day');
    setFollowUpDate(d.format('YYYY-MM-DD'));
  };

  const handleSubmit = async () => {
    if (!selectedPatientId) {
      message.error('Please select a patient');
      return;
    }

    const validMedicines = medicines
      .filter((m) => m.name.trim().length > 0)
      .map((m) => ({
        medicineId: m.medicineId,
        name: m.name.trim(),
        strength: m.strength.trim() || undefined,
        dosage: m.dosage.trim() || '1 Tablet',
        frequency: m.frequency.trim() || '1-0-1',
        duration: m.duration.trim() || '5 Days',
        mealTiming: m.mealTiming || 'After Food',
        instructions: m.instructions.trim() || undefined,
        prescribedQuantity: m.prescribedQuantity || 1,
      }));

    const validLabs = labTests
      .filter((l) => l.testName.trim().length > 0)
      .map((l) => ({
        labTestId: l.labTestId,
        testName: l.testName.trim(),
        instructions: l.instructions.trim() || undefined,
        labId: l.labId,
      }));

    if (validMedicines.length === 0 && validLabs.length === 0) {
      message.error('Please add at least one medicine or lab test');
      return;
    }

    // Ensure the doctor has manually selected the frequency for each prescribed medicine
    const medicineMissingFreq = medicines.find((m) => m.name.trim() && !m.frequency.trim());
    if (medicineMissingFreq) {
      message.error(`Please select the frequency for "${medicineMissingFreq.name}"`);
      return;
    }

    setLoading(true);
    try {
      if (editingPrescription) {
        const payload = {
          diagnosis: diagnosis.trim() || 'General Consultation',
          generalInstructions: generalInstructions.trim() || undefined,
          followUpDays,
          followUpDate: followUpDate || undefined,
          medicines: validMedicines,
          labTests: validLabs,
        };
        const updated = await prescriptionsApi.update(editingPrescription.id, payload);
        message.success('Prescription updated successfully!');
        onSuccess(updated);
        onClose();
      } else {
        const payload: CreatePrescriptionPayload = {
          patientId: selectedPatientId,
          doctorId: selectedDoctorId || undefined,
          appointmentId: appointmentId || undefined,
          markAppointmentCompleted: appointmentId ? markCompleted : false,
          diagnosis: diagnosis.trim() || 'General Consultation',
          generalInstructions: generalInstructions.trim() || undefined,
          prescriptionType: 'system',
          followUpDays,
          followUpDate: followUpDate || undefined,
          medicines: validMedicines,
          labTests: validLabs,
        };
        const created = await prescriptionsApi.create(payload);
        message.success('Prescription created and saved successfully!');
        onSuccess(created);
        onClose();
      }
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Failed to save prescription'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Drawer
      open={open}
      onClose={onClose}
      keyboard={!isAddMedicineModalOpen}
      focusable={{ trap: !isAddMedicineModalOpen }}
      width="min(1150px, 95vw)"
      destroyOnClose
      styles={{
        header: {
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          background: '#ffffff',
        },
        body: {
          padding: '20px 24px 36px 24px',
          background: '#f8fafc',
          overflowY: 'auto',
        },
        footer: {
          padding: '14px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
        },
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 6 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              background: '#f5f3ff',
              border: '1px solid #ede9fe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7c3aed',
            }}
          >
            <Stethoscope size={20} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              {editingPrescription ? 'Edit Prescription' : 'Create Prescription'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              Integrated with Pharmacy Medicines & Linked Diagnostic Labs
            </div>
          </div>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            <span style={{ fontWeight: 600, color: '#0f172a' }}>
              {medicines.filter((m) => m.name.trim()).length}
            </span>{' '}
            medicine(s) ·{' '}
            <span style={{ fontWeight: 600, color: '#0f172a' }}>
              {labTests.filter((l) => l.testName.trim()).length}
            </span>{' '}
            investigation(s)
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="ui-btn"
              onClick={onClose}
              disabled={loading}
              style={{ padding: '6px 14px', fontSize: 13 }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-primary"
              onClick={handleSubmit}
              disabled={loading}
              style={{
                padding: '6px 20px',
                fontSize: 13,
                fontWeight: 600,
                background: '#7c3aed',
                borderColor: '#7c3aed',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {loading && <Spin size="small" />}
              <span>
                {editingPrescription
                  ? 'Update Prescription'
                  : appointmentId && markCompleted
                    ? 'Save & Complete Consultation'
                    : 'Save Prescription'}
              </span>
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Patient & Prescribing Doctor Header */}
        <div
          style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 10,
            padding: 14,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 12,
          }}
        >
          {/* Patient Selector / Card */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <label htmlFor="prescription-patient-select" style={{ fontSize: 11.5, fontWeight: 600, color: '#475569' }}>
                PATIENT *
              </label>
              {!selectedPatient && (
                <button
                  type="button"
                  onClick={() => void fetchPatients()}
                  disabled={patientSearchLoading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#7c3aed',
                    fontSize: 11,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    padding: 0,
                  }}
                  title="Reload patient list"
                >
                  <RefreshCw size={11} className={patientSearchLoading ? 'animate-spin' : ''} />
                  Refresh
                </button>
              )}
            </div>
            {selectedPatient ? (
              <div
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  minHeight: 36,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <User size={16} style={{ color: '#7c3aed' }} />
                  <div>
                    <span style={{ fontWeight: 650, color: '#0f172a', fontSize: 13 }}>
                      {selectedPatient.name}
                    </span>
                    <span style={{ fontSize: 11, color: '#64748b', marginLeft: 6 }}>
                      {[selectedPatient.gender, selectedPatient.phone].filter(Boolean).join(' · ')}
                    </span>
                  </div>
                </div>
                {!preselectedPatient && !editingPrescription && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPatient(null);
                      setSelectedPatientId('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#7c3aed',
                      fontSize: 11.5,
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    Change
                  </button>
                )}
              </div>
            ) : (
              <SearchableSelect
                id="prescription-patient-select"
                placeholder="Search patient by name or phone..."
                searchPlaceholder="Search by name, phone, or gender..."
                value={selectedPatientId}
                options={patientOptions}
                onChange={(val) => {
                  setSelectedPatientId(val);
                  const p = patients.find((pt) => pt.id === val);
                  if (p) setSelectedPatient(p);
                }}
                disabled={Boolean(preselectedPatient)}
                loading={patientSearchLoading}
                emptyText={
                  patientSearchLoading
                    ? 'Loading registered patients...'
                    : 'No registered patients found. Click Refresh to reload.'
                }
                width="100%"
                searchable={true}
              />
            )}
          </div>

          {/* Doctor Selection */}
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
              PRESCRIBING DOCTOR *
            </label>
            <Select
              value={selectedDoctorId || undefined}
              onChange={(val) => setSelectedDoctorId(val ?? '')}
              placeholder="Select Doctor"
              style={{ width: '100%' }}
              options={doctors.map((d) => ({
                value: d.id,
                label: `${d.name} (${d.specialization || 'General Medicine'})`,
              }))}
            />
          </div>

          {/* Appointment Context Banner */}
          {appointmentId && (
            <div style={{ gridColumn: '1 / -1', marginTop: 2, display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  fontSize: 11.5,
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: '#f5f3ff',
                  border: '1px solid #ede9fe',
                  color: '#6d28d9',
                  fontWeight: 600,
                }}
              >
                Consultation #{appointmentToken || appointmentId.slice(0, 6)}
              </span>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer', color: '#1e293b' }}>
                <input
                  type="checkbox"
                  checked={markCompleted}
                  onChange={(e) => setMarkCompleted(e.target.checked)}
                />
                <span style={{ fontWeight: 500 }}>
                  Mark appointment as <strong>Completed</strong> upon saving
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Diagnosis & Clinical Impression */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 6 }}>
            DIAGNOSIS & CLINICAL IMPRESSION
          </label>
          <AutoComplete
            value={diagnosis}
            onChange={(val) => setDiagnosis(val)}
            placeholder="e.g. Hypertension, Acute Gastritis, Type 2 Diabetes, Viral Fever..."
            options={COMMON_DIAGNOSES.map((d) => ({ value: d }))}
            style={{ width: '100%' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {COMMON_DIAGNOSES.slice(0, 6).map((cd) => (
              <button
                key={cd}
                type="button"
                onClick={() => setDiagnosis(cd)}
                style={{
                  fontSize: 11,
                  padding: '2px 8px',
                  borderRadius: 4,
                  border: '1px solid #e2e8f0',
                  background: diagnosis === cd ? '#f5f3ff' : '#ffffff',
                  color: diagnosis === cd ? '#7c3aed' : '#475569',
                  cursor: 'pointer',
                  fontWeight: diagnosis === cd ? 600 : 400,
                }}
              >
                + {cd}
              </button>
            ))}
          </div>
        </div>

        {/* 1. Pharmacy Medicines Section */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: '#f5f3ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7c3aed',
                }}
              >
                <Pill size={16} />
              </div>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  Prescribed Medicines ({medicines.length})
                </span>
                <span style={{ fontSize: 11.5, color: '#64748b', marginLeft: 8 }}>
                  Search & auto-populate from Pharmacy catalog
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Available Packages Dropdown Button */}
              <Dropdown
                menu={{
                  items: packagesLoading
                    ? [
                        {
                          key: 'loading',
                          label: (
                            <div style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>
                              <Spin size="small" style={{ marginRight: 6 }} /> Loading packages...
                            </div>
                          ),
                          disabled: true,
                        },
                      ]
                    : availablePackages.length === 0
                    ? [
                        {
                          key: 'empty',
                          label: (
                            <div style={{ padding: '8px 12px', color: '#64748b', fontSize: 12 }}>
                              No medicine packages found. Create packages in Medicine Packages module.
                            </div>
                          ),
                          disabled: true,
                        },
                      ]
                    : availablePackages.map((pkg) => ({
                        key: pkg.id,
                        label: (
                          <div style={{ padding: '4px 2px', minWidth: 260 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                              <span style={{ fontWeight: 650, color: '#0f172a' }}>{pkg.name}</span>
                              <Tag color="purple" style={{ margin: 0, fontSize: 10.5, borderRadius: 4 }}>
                                {pkg.medicines?.length || 0} meds
                              </Tag>
                            </div>
                            {pkg.description && (
                              <div
                                style={{
                                  fontSize: 11,
                                  color: '#64748b',
                                  marginTop: 2,
                                  maxWidth: 300,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {pkg.description}
                              </div>
                            )}
                            <div style={{ fontSize: 10.5, color: '#7c3aed', marginTop: 3 }}>
                              {(pkg.medicines || []).slice(0, 3).map((m) => m.medicine_name).join(', ')}
                              {(pkg.medicines?.length || 0) > 3 ? ` +${(pkg.medicines?.length || 0) - 3} more` : ''}
                            </div>
                          </div>
                        ),
                        onClick: () => handleApplyPackage(pkg),
                      })),
                }}
                trigger={['click']}
                placement="bottomRight"
              >
                <button
                  type="button"
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#7c3aed',
                    background: '#f5f3ff',
                    border: '1px solid #ddd6fe',
                    borderRadius: 6,
                    padding: '5px 12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Package size={14} /> Available Packages <ChevronDown size={12} />
                </button>
              </Dropdown>

              <button
                type="button"
                onClick={handleAddMedicineRow}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: '#475569',
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  padding: '5px 12px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Plus size={14} /> Add Row
              </button>

              {canAddPharmacyMedicine && (
                <button
                  type="button"
                  onClick={() => handleOpenAddMedicineDrawer()}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: '#7c3aed',
                    background: '#f5f3ff',
                    border: '1px solid #ede9fe',
                    borderRadius: 6,
                    padding: '5px 12px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <Plus size={14} /> Add Medicine
                </button>
              )}
            </div>
          </div>

          {/* Quick Apply Package Chips Bar */}
          {availablePackages.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 6,
                marginBottom: 14,
                padding: '8px 12px',
                background: '#faf5ff',
                border: '1px solid #ede9fe',
                borderRadius: 8,
              }}
            >
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: '#6b21a8',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  marginRight: 4,
                }}
              >
                <Package size={13} style={{ color: '#7c3aed' }} /> Available Packages:
              </span>
              {availablePackages.map((pkg) => {
                const medNames = (pkg.medicines || []).map((m) => m.medicine_name).join(', ');
                return (
                  <Tooltip
                    key={pkg.id}
                    title={
                      <div style={{ maxWidth: 280, fontSize: 11.5 }}>
                        <div style={{ fontWeight: 650 }}>{pkg.name}</div>
                        {pkg.description && (
                          <div style={{ color: '#cbd5e1', marginTop: 2 }}>{pkg.description}</div>
                        )}
                        <div style={{ marginTop: 4, color: '#e9d5ff' }}>
                          <strong>Includes:</strong> {medNames || 'No medicines'}
                        </div>
                      </div>
                    }
                  >
                    <button
                      type="button"
                      onClick={() => handleApplyPackage(pkg)}
                      style={{
                        fontSize: 11,
                        padding: '3px 9px',
                        borderRadius: 6,
                        border: '1px solid #d8b4fe',
                        background: '#ffffff',
                        color: '#6b21a8',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#7c3aed';
                        e.currentTarget.style.color = '#ffffff';
                        e.currentTarget.style.borderColor = '#7c3aed';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#ffffff';
                        e.currentTarget.style.color = '#6b21a8';
                        e.currentTarget.style.borderColor = '#d8b4fe';
                      }}
                    >
                      <Plus size={11} />
                      <span>{pkg.name}</span>
                      <span style={{ fontSize: 10, opacity: 0.75 }}>({pkg.medicines?.length || 0})</span>
                    </button>
                  </Tooltip>
                );
              })}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {medicines.map((med, index) => {
              const isCatalogLinked = Boolean(med.medicineId);
              return (
                <div
                  key={med.key}
                  style={{
                    border: isCatalogLinked ? '1px solid #ddd6fe' : '1px solid #e2e8f0',
                    borderRadius: 8,
                    background: isCatalogLinked ? '#fdfcff' : '#fafafa',
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    boxShadow: isCatalogLinked ? '0 1px 3px rgba(124, 58, 237, 0.05)' : 'none',
                  }}
                >
                  {/* Top Bar: Number badge, Search/Name Autocomplete, Variants selector, Delete */}
                  <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr auto auto', gap: 8, alignItems: 'center' }}>
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: isCatalogLinked ? '#7c3aed' : '#ede9fe',
                        color: isCatalogLinked ? '#ffffff' : '#6d28d9',
                        fontSize: 11,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {index + 1}
                    </span>

                    {/* Autocomplete Search input */}
                    <AutoComplete
                      value={med.name}
                      placeholder="Search medicine by trade name, generic composition, or manufacturer..."
                      options={medicineOptions}
                      onSearch={(term) => handleSearchMedicines(term)}
                      onSelect={(_val, opt) => handleSelectMedicineOption(index, opt)}
                      onChange={(val) => handleUpdateMedicine(index, 'name', val)}
                      onFocus={() => {
                        if (medicineOptions.length === 0) {
                          handleSearchMedicines(med.name || '', true);
                        }
                      }}
                      filterOption={false}
                      defaultActiveFirstOption={true}
                      notFoundContent={
                        medicineSearching ? (
                          <div style={{ padding: 12, textAlign: 'center', color: '#64748b' }}>
                            <Spin size="small" style={{ marginRight: 8 }} />
                            <span>Searching pharmacy medicines...</span>
                          </div>
                        ) : (
                          <div style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ color: '#94a3b8', fontSize: 12 }}>
                              No matching medicines found in Pharmacy catalog.
                            </span>
                            {canAddPharmacyMedicine && (
                              <button
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => handleOpenAddMedicineDrawer(index, med.name)}
                                style={{
                                  fontSize: 11.5,
                                  fontWeight: 600,
                                  color: '#7c3aed',
                                  background: '#f5f3ff',
                                  border: '1px solid #ddd6fe',
                                  borderRadius: 5,
                                  padding: '3px 9px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 4,
                                }}
                              >
                                <Plus size={12} />
                                {med.name.trim() ? `Add "${med.name.trim()}" in Pharmacy` : 'Add Medicine in Pharmacy'}
                              </button>
                            )}
                          </div>
                        )
                      }
                      style={{ width: '100%' }}
                    />

                    {/* Variant / Strength quick picker if multiple variants exist in pharmacy */}
                    {med.variants && med.variants.length > 1 && (
                      <Select
                        value={med.selectedVariantId}
                        onChange={(val) => handleSelectVariant(index, val)}
                        size="small"
                        placeholder="Variant"
                        style={{ minWidth: 150 }}
                        options={med.variants.map((v) => ({
                          value: v.id,
                          label: `${v.strength} ${v.strength_unit || ''} ${v.dosage_form} ${v.available_quantity != null ? `(${v.available_quantity} in stock)` : ''}`,
                        }))}
                      />
                    )}

                    {/* Remove Medicine */}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedicine(index)}
                      disabled={medicines.length <= 1}
                      title="Remove medicine"
                      style={{
                        border: 'none',
                        background: 'none',
                        color: medicines.length <= 1 ? '#cbd5e1' : '#ef4444',
                        cursor: medicines.length <= 1 ? 'not-allowed' : 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Auto-populated Pharmacy Fields Banner */}
                  {(isCatalogLinked || med.genericName || med.manufacturer || med.therapeuticCategory) && (
                    <div
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                        padding: '6px 10px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 11,
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontWeight: 650,
                          color: '#7c3aed',
                        }}
                      >
                        <ShieldCheck size={13} />
                        Pharmacy Linked
                      </span>

                      {med.genericName && (
                        <span style={{ color: '#334155', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>
                          <strong>Generic:</strong> {med.genericName}
                        </span>
                      )}

                      {med.manufacturer && (
                        <span style={{ color: '#334155', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>
                          <strong>Mfr:</strong> {med.manufacturer}
                        </span>
                      )}

                      {med.therapeuticCategory && (
                        <span style={{ color: '#475569', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>
                          <strong>Category:</strong> {med.therapeuticCategory}
                        </span>
                      )}

                      {med.availableStock !== undefined && med.availableStock !== null && (
                        <span
                          style={{
                            fontWeight: 600,
                            padding: '1px 6px',
                            borderRadius: 4,
                            background: med.availableStock > 0 ? '#dcfce7' : '#fee2e2',
                            color: med.availableStock > 0 ? '#15803d' : '#b91c1c',
                          }}
                        >
                          {med.availableStock > 0 ? `Stock: ${med.availableStock}` : 'Out of stock'}
                        </span>
                      )}

                      {(med.finalPrice || med.mrp) && (
                        <span style={{ color: '#0f172a', fontWeight: 600 }}>
                          MRP: ₹{Number(med.finalPrice || med.mrp).toFixed(2)}
                        </span>
                      )}

                      {med.prescriptionRequired && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: 3,
                            background: '#fee2e2',
                            color: '#991b1b',
                          }}
                        >
                          Rx REQUIRED
                        </span>
                      )}
                    </div>
                  )}

                  {/* Clinical Dosage & Administration Grid */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                      gap: 8,
                      alignItems: 'center',
                      paddingTop: 2,
                    }}
                  >
                    {/* Dosage Form / Dose */}
                    <div>
                      <label style={{ fontSize: 10.5, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 2 }}>
                        DOSAGE / DOSE
                      </label>
                      <input
                        type="text"
                        value={med.dosage}
                        onChange={(e) => handleUpdateMedicine(index, 'dosage', e.target.value)}
                        placeholder="e.g. 1 Tablet"
                        className="ui-input"
                        style={{ height: 28, fontSize: 12, padding: '0 8px' }}
                      />
                    </div>

                    {/* Strength */}
                    <div>
                      <label style={{ fontSize: 10.5, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 2 }}>
                        STRENGTH
                      </label>
                      <input
                        type="text"
                        value={med.strength}
                        onChange={(e) => handleUpdateMedicine(index, 'strength', e.target.value)}
                        placeholder="e.g. 500mg, 10ml"
                        className="ui-input"
                        style={{ height: 28, fontSize: 12, padding: '0 8px' }}
                      />
                    </div>

                    {/* Frequency */}
                    <div>
                      <label
                        style={{
                          fontSize: 10.5,
                          fontWeight: 600,
                          color: !med.frequency && med.name.trim() ? '#b45309' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: 2,
                        }}
                      >
                        <span>
                          FREQUENCY <span style={{ color: '#ef4444' }}>*</span>
                        </span>
                        {!med.frequency && med.name.trim() && (
                          <span
                            style={{
                              fontSize: 9.5,
                              fontWeight: 700,
                              color: '#b45309',
                              background: '#fef3c7',
                              padding: '0 4px',
                              borderRadius: 3,
                              border: '1px solid #fde68a',
                            }}
                          >
                            Required
                          </span>
                        )}
                      </label>
                      <Select
                        value={med.frequency || undefined}
                        placeholder="Select frequency *"
                        status={!med.frequency && med.name.trim() ? 'warning' : ''}
                        onChange={(val) => handleUpdateMedicine(index, 'frequency', val)}
                        style={{ width: '100%' }}
                        size="small"
                        options={COMMON_FREQUENCIES}
                      />
                    </div>

                    {/* Meal Timing */}
                    <div>
                      <label style={{ fontSize: 10.5, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 2 }}>
                        MEAL TIMING
                      </label>
                      <Select
                        value={med.mealTiming}
                        onChange={(val) => handleUpdateMedicine(index, 'mealTiming', val)}
                        style={{ width: '100%' }}
                        size="small"
                        options={COMMON_MEAL_TIMINGS.map((m) => ({ label: m, value: m }))}
                      />
                    </div>

                    {/* Duration */}
                    <div>
                      <label style={{ fontSize: 10.5, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 2 }}>
                        DURATION
                      </label>
                      <Select
                        value={med.duration}
                        onChange={(val) => handleUpdateMedicine(index, 'duration', val)}
                        style={{ width: '100%' }}
                        size="small"
                        options={COMMON_DURATIONS.map((d) => ({ label: d, value: d }))}
                      />
                    </div>

                    {/* Prescribed Quantity */}
                    <div>
                      <label style={{ fontSize: 10.5, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 2 }}>
                        TOTAL QTY
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={med.prescribedQuantity}
                        onChange={(e) =>
                          handleUpdateMedicine(index, 'prescribedQuantity', parseInt(e.target.value, 10) || 1)
                        }
                        className="ui-input"
                        style={{ height: 28, fontSize: 12, padding: '0 8px' }}
                      />
                    </div>
                  </div>

                  {/* Special Instructions */}
                  <div>
                    <label style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 2 }}>
                      SPECIFIC INSTRUCTIONS / REMARKS
                    </label>
                    <input
                      type="text"
                      value={med.instructions}
                      onChange={(e) => handleUpdateMedicine(index, 'instructions', e.target.value)}
                      placeholder="e.g. Take with plenty of warm water. Avoid dairy products within 1 hour."
                      className="ui-input"
                      style={{ height: 28, fontSize: 12, padding: '0 8px' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Linked Labs & Diagnostic Investigations Section */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, background: '#ffffff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: '#f0f9ff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0284c7',
                }}
              >
                <FlaskConical size={16} />
              </div>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
                  Recommended Lab Investigations ({labTests.length})
                </span>
                <span style={{ fontSize: 11.5, color: '#64748b', marginLeft: 8 }}>
                  Search and assign from Linked Labs network
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddLabTest}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#0284c7',
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 6,
                padding: '5px 12px',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              <Plus size={14} /> Add Investigation
            </button>
          </div>

          {labTests.length === 0 ? (
            <div
              style={{
                fontSize: 12,
                color: '#64748b',
                background: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: 8,
                padding: '16px',
                textAlign: 'center',
              }}
            >
              No diagnostic tests recommended yet. Click <strong>"+ Add Investigation"</strong> to select a Linked Lab and prescribe diagnostic tests.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {labTests.map((lab, index) => {
                const labObj = lab.selectedLab;
                const labServices = labObj?.services || [];

                // Tests available for autocomplete: this lab's services + system services + common panels
                const suggestedTests = [
                  ...labServices.map((s) => s.name),
                  ...systemLabServices.map((s) => s.name),
                  ...COMMON_LAB_INVESTIGATIONS,
                ];
                const uniqueSuggestedTests = Array.from(new Set(suggestedTests));

                return (
                  <div
                    key={lab.key}
                    style={{
                      border: labObj ? '1px solid #bae6fd' : '1px solid #e2e8f0',
                      borderRadius: 8,
                      background: labObj ? '#f8fcff' : '#fafafa',
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                      boxShadow: labObj ? '0 1px 3px rgba(2, 132, 199, 0.05)' : 'none',
                    }}
                  >
                    {/* Top Row: Lab Selection & Test Name */}
                    <div style={{ display: 'grid', gridTemplateColumns: '26px 1fr 1fr auto', gap: 10, alignItems: 'center' }}>
                      <span
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: labObj ? '#0284c7' : '#e0f2fe',
                          color: labObj ? '#ffffff' : '#0369a1',
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {index + 1}
                      </span>

                      {/* Select Linked Lab */}
                      <div>
                        <label style={{ fontSize: 10.5, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 2 }}>
                          ASSIGN LINKED LAB *
                        </label>
                        <Select
                          showSearch
                          value={lab.labId || undefined}
                          onChange={(val) => handleSelectLab(index, val)}
                          placeholder="Select Linked Lab..."
                          loading={labsLoading}
                          style={{ width: '100%' }}
                          filterOption={(input, option) =>
                            String(option?.label ?? '')
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          }
                          options={availableLabs.map((l) => ({
                            value: l.id,
                            label: `${l.name}${l.city ? ` · ${l.city}` : ''}${l.phone ? ` (${l.phone})` : ''}`,
                          }))}
                        />
                      </div>

                      {/* Test / Investigation Name Autocomplete */}
                      <div>
                        <label style={{ fontSize: 10.5, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 2 }}>
                          TEST / INVESTIGATION NAME *
                        </label>
                        <AutoComplete
                          value={lab.testName}
                          onChange={(val) => {
                            const copy = [...labTests];
                            const item = copy[index];
                            if (item) {
                              item.testName = val;
                              setLabTests(copy);
                            }
                          }}
                          placeholder="e.g. Complete Blood Count (CBC), Fasting Blood Sugar..."
                          options={uniqueSuggestedTests.map((t) => ({ value: t }))}
                          style={{ width: '100%' }}
                        />
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveLabTest(index)}
                        style={{
                          border: 'none',
                          background: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginTop: 14,
                        }}
                        title="Remove investigation"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Linked Lab Details Card */}
                    {labObj && (
                      <div
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e0f2fe',
                          borderRadius: 6,
                          padding: '8px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Building2 size={14} style={{ color: '#0284c7' }} />
                            <span style={{ fontWeight: 650, color: '#0369a1', fontSize: 12.5 }}>
                              {labObj.name}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                background: '#dcfce7',
                                color: '#15803d',
                                fontWeight: 600,
                                padding: '1px 5px',
                                borderRadius: 3,
                              }}
                            >
                              LINKED LAB
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#64748b' }}>
                            {labObj.phone && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <Phone size={12} style={{ color: '#0284c7' }} />
                                {labObj.phone}
                              </span>
                            )}
                            {(labObj.start_time || labObj.end_time) && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                <Clock size={12} style={{ color: '#0284c7' }} />
                                {labObj.start_time || '08:00'} - {labObj.end_time || '20:00'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Location address */}
                        {(labObj.address_line_1 || labObj.city) && (
                          <div style={{ fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <MapPin size={12} style={{ color: '#94a3b8', flexShrink: 0 }} />
                            <span>
                              {[labObj.address_line_1, labObj.address_line_2, labObj.city, labObj.state, labObj.pincode]
                                .filter(Boolean)
                                .join(', ')}
                            </span>
                          </div>
                        )}

                        {/* Quick pick lab's offered services */}
                        {labServices.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingTop: 2 }}>
                            <span style={{ fontSize: 10.5, color: '#64748b', fontWeight: 600 }}>
                              Available Tests:
                            </span>
                            {labServices.map((svc) => (
                              <button
                                key={svc.id}
                                type="button"
                                onClick={() => {
                                  const copy = [...labTests];
                                  const item = copy[index];
                                  if (item) {
                                    item.testName = svc.name;
                                    setLabTests(copy);
                                  }
                                }}
                                style={{
                                  fontSize: 10.5,
                                  padding: '1px 6px',
                                  borderRadius: 4,
                                  background: lab.testName === svc.name ? '#e0f2fe' : '#f1f5f9',
                                  color: lab.testName === svc.name ? '#0369a1' : '#334155',
                                  border: lab.testName === svc.name ? '1px solid #7dd3fc' : '1px solid #e2e8f0',
                                  cursor: 'pointer',
                                  fontWeight: lab.testName === svc.name ? 600 : 400,
                                }}
                              >
                                + {svc.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Patient Preparation Instructions */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                        <label style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b' }}>
                          PATIENT PREPARATION / INSTRUCTIONS
                        </label>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {COMMON_LAB_PREPARATIONS.slice(0, 3).map((prep) => (
                            <button
                              key={prep}
                              type="button"
                              onClick={() => {
                                const copy = [...labTests];
                                const item = copy[index];
                                if (item) {
                                  item.instructions = prep;
                                  setLabTests(copy);
                                }
                              }}
                              style={{
                                fontSize: 10,
                                padding: '1px 5px',
                                borderRadius: 3,
                                background: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                color: '#475569',
                                cursor: 'pointer',
                              }}
                            >
                              {prep}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input
                        type="text"
                        value={lab.instructions}
                        onChange={(e) => {
                          const copy = [...labTests];
                          const item = copy[index];
                          if (item) {
                            item.instructions = e.target.value;
                            setLabTests(copy);
                          }
                        }}
                        placeholder="e.g. 10-12 hours overnight fasting required. Water intake allowed."
                        className="ui-input"
                        style={{ height: 28, fontSize: 12, padding: '0 8px' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* General Advice & Follow-up Scheduling */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {/* General instructions */}
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
              GENERAL ADVICE / DIETARY INSTRUCTIONS
            </label>
            <textarea
              value={generalInstructions}
              onChange={(e) => setGeneralInstructions(e.target.value)}
              placeholder="e.g. Drink at least 3 liters of water daily. Avoid oily and spicy foods. Complete full antibiotic course."
              rows={3}
              className="ui-input"
              style={{ width: '100%', height: 74, padding: '8px', fontSize: 12 }}
            />
          </div>

          {/* Follow-up appointment scheduling */}
          <div>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
              RECOMMENDED FOLLOW-UP
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {[3, 5, 7, 14, 30].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => handleQuickFollowUp(days)}
                    style={{
                      flex: 1,
                      padding: '4px 0',
                      fontSize: 11,
                      fontWeight: followUpDays === days ? 600 : 400,
                      borderRadius: 4,
                      border: '1px solid #cbd5e1',
                      background: followUpDays === days ? '#7c3aed' : '#ffffff',
                      color: followUpDays === days ? '#ffffff' : '#334155',
                      cursor: 'pointer',
                    }}
                  >
                    {days < 30 ? `${days}d` : '1m'}
                  </button>
                ))}
              </div>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => {
                  setFollowUpDate(e.target.value);
                  setFollowUpDays(undefined);
                }}
                className="ui-input"
                style={{ height: 32, fontSize: 12, padding: '0 8px' }}
              />
            </div>
          </div>
        </div>
      </div>
    </Drawer>

    <MedicineModal
      isOpen={isAddMedicineModalOpen}
      onClose={() => {
        setIsAddMedicineModalOpen(false);
        setMedicineModalInitialName('');
        setMedicineModalTargetRowIndex(null);
      }}
      medicine={null}
      onSave={handlePharmacyMedicineSaved}
      initialMedicineName={medicineModalInitialName}
      zIndex={1100}
    />
    </>
  );
}

export const CreatePrescriptionDrawer = CreatePrescriptionModal;
