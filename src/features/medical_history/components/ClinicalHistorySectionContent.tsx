import { App, Button, Popconfirm, Tag, message as staticMessage } from 'antd';
import {
  Activity,
  AlertCircle,
  Baby,
  Briefcase,
  Building2,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Cigarette,
  Download,
  Droplet,
  Eye,
  FileText,
  FileUp,
  HeartPulse,
  History,
  Moon,
  Pill,
  Plus,
  Scissors,
  ShieldAlert,
  Stethoscope,
  Trash2,
  Upload,
  User,
  Users,
  Utensils,
  Wine,
  X,
} from 'lucide-react';
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

import { getAuthenticatedFileUrl } from '../../../utils/fileUrl';
import { SearchableSelect, type SearchableSelectOption } from '../../../components/ui/SearchableSelect';
import { medicalHistoryApi } from '../services/medicalHistoryApi';
import {
  MEDICAL_DOCUMENT_TYPES,
  type FamilyMemberHistory,
  type HospitalAdmission,
  type MedicalDocumentType,
  type Medication,
  type PatientMedicalDocument,
  type PatientMedicalHistoryRecord,
  type PreviousDisease,
  type Surgery,
} from '../types/medicalHistory.types';

export interface ClinicalHistorySectionHandle {
  save: () => Promise<PatientMedicalHistoryRecord>;
}

export interface ClinicalHistorySectionContentProps {
  isOpen?: boolean;
  patientId: string;
  patientGender?: string | null | undefined;
  patientName?: string | undefined;
  patientAge?: string | number | undefined;
  patientBloodGroup?: string | undefined;
  initialData?: PatientMedicalHistoryRecord | null | undefined;
  activeTab?: SectionTab;
  onTabChange?: (tab: SectionTab) => void;
  onPreviousToPersonal?: () => void;
  onClose: () => void;
  onSuccess: (saved: PatientMedicalHistoryRecord) => void;
  onFinish?: () => void;
  initialVitals?: {
    heightCm?: string;
    weightKg?: string;
    bloodPressure?: string;
    temperature?: string;
    bloodSugar?: string;
    alreadyTakingTablets?: string;
    customVitals?: Array<{ id?: string; label: string; value: string; tablet_name?: string | undefined }>;
  };
  hideStepperHeader?: boolean;
  hideFooter?: boolean;
  ensurePatientSaved?: () => Promise<string>;
}

export type RecordMedicalHistoryDrawerProps = ClinicalHistorySectionContentProps & { isOpen?: boolean };

export type RecordMedicalHistoryModalProps = RecordMedicalHistoryDrawerProps;

const FAMILY_RELATIONSHIPS: string[] = [
  'Father',
  'Mother',
  'Brother',
  'Sister',
  'Grandfather (Paternal)',
  'Grandmother (Paternal)',
  'Grandfather (Maternal)',
  'Grandmother (Maternal)',
  'Son',
  'Daughter',
  'Uncle',
  'Aunt',
  'Cousin',
  'Spouse',
  'Other Relative',
];

export type SectionTab = 'current' | 'previous' | 'family' | 'reproductive' | 'lifestyle' | 'documents';

const CHRONIC_DISEASE_OPTIONS = [
  'Diabetes Mellitus',
  'Hypertension (High Blood Pressure)',
  'Coronary Artery Disease',
  'Chronic Kidney Disease',
  'Liver Cirrhosis / Chronic Liver Disease',
  'Asthma / COPD / Respiratory Disease',
  'Hyperlipidemia / High Cholesterol',
  'Thyroid Disorder',
  'Stroke / Cerebrovascular Disease',
  'Cancer / Oncology History',
  'Epilepsy / Seizure Disorder',
  'Arthritis / Autoimmune Disease',
];

const YES_NO_UNKNOWN_OPTIONS: SearchableSelectOption[] = [
  { value: 'No', label: 'No' },
  { value: 'Yes', label: 'Yes' },
  { value: 'Unknown', label: 'Unknown' },
];

const YES_NO_NA_OPTIONS: SearchableSelectOption[] = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
  { value: 'Not Applicable', label: 'Not Applicable' },
];

function normalizeYesNoUnknown(val: unknown, fallback: 'Yes' | 'No' | 'Unknown' = 'No'): 'Yes' | 'No' | 'Unknown' {
  if (val === true || val === 'true' || val === 'Yes' || val === 'yes') return 'Yes';
  if (val === false || val === 'false' || val === 'No' || val === 'no') return 'No';
  if (val === 'Unknown' || val === 'unknown') return 'Unknown';
  return fallback;
}

function normalizeBreastfeeding(val: unknown): 'Yes' | 'No' | 'Not Applicable' {
  if (val === true || val === 'true' || val === 'Yes' || val === 'yes') return 'Yes';
  if (val === false || val === 'false' || val === 'No' || val === 'no') return 'No';
  if (val === 'Not Applicable' || val === 'not applicable' || val === 'N/A') return 'Not Applicable';
  return 'Not Applicable';
}

function normalizeSmokingStatus(val: unknown): string {
  if (!val) return 'Never';
  const s = String(val).trim().toLowerCase();
  if (s.includes('never') || s.includes('non') || s === 'no') return 'Never';
  if (s.includes('former') || s.includes('quit') || s.includes('ex-')) return 'Former';
  if (s.includes('current') || s.includes('smoker') || s === 'yes') return 'Current';
  return String(val);
}

function normalizeAlcoholConsumption(val: unknown): string {
  if (!val) return 'Never';
  const s = String(val).trim().toLowerCase();
  if (s.includes('never') || s.includes('non') || s === 'no') return 'Never';
  if (s.includes('occasion') || s.includes('social')) return 'Occasionally';
  if (s.includes('regular')) return 'Regularly';
  if (s.includes('heavy') || s.includes('problem')) return 'Heavy / Problematic';
  return String(val);
}

function normalizeDietType(val: unknown): string {
  if (!val) return 'Non-Vegetarian';
  const s = String(val).trim().toLowerCase();
  if (s.includes('non-veg') || s.includes('non veg') || s.includes('nonveg')) return 'Non-Vegetarian';
  if (s.includes('jain')) return 'Jain';
  if (s.includes('vegan')) return 'Vegan';
  if (s.includes('egg')) return 'Eggetarian';
  if (s.includes('veg')) return 'Vegetarian';
  return String(val);
}

function normalizeActivityLevel(val: unknown): string {
  if (!val) return 'Moderate';
  const s = String(val).trim().toLowerCase();
  if (s.includes('sedentary')) return 'Sedentary';
  if (s.includes('light')) return 'Light';
  if (s.includes('moderat')) return 'Moderate';
  if (s.includes('active') || s.includes('heavy') || s.includes('athletic')) return 'Active';
  return String(val);
}

const DISEASE_STATUS_OPTIONS: SearchableSelectOption[] = [
  { value: 'Resolved', label: 'Resolved' },
  { value: 'Active', label: 'Active' },
  { value: 'Under Treatment', label: 'Under Treatment' },
  { value: 'In Remission', label: 'In Remission' },
];

const FAMILY_RELATIONSHIP_OPTIONS: SearchableSelectOption[] = FAMILY_RELATIONSHIPS.map((rel) => ({
  value: rel,
  label: rel,
}));

const FAMILY_HEALTH_STATUS_OPTIONS: SearchableSelectOption[] = [
  { value: 'Healthy / Normal', label: 'Healthy / Normal' },
  { value: 'Living with Condition', label: 'Living with Condition' },
  { value: 'Managed with medication', label: 'Managed with Medication' },
  { value: 'Stable on oral medication', label: 'Stable on Oral Medication' },
  { value: 'Under Treatment', label: 'Under Treatment' },
  { value: 'Deceased', label: 'Deceased' },
  { value: 'Unknown', label: 'Unknown' },
];

const MENSTRUAL_STATUS_OPTIONS: SearchableSelectOption[] = [
  { value: 'Regular', label: 'Regular' },
  { value: 'Irregular', label: 'Irregular' },
  { value: 'Menopause', label: 'Menopause' },
  { value: 'Post-Menopausal', label: 'Post-Menopausal' },
  { value: 'Amenorrhea', label: 'Amenorrhea' },
  { value: 'Oligomenorrhea', label: 'Oligomenorrhea' },
  { value: 'Not Applicable', label: 'Not Applicable' },
];

const SMOKING_STATUS_OPTIONS: SearchableSelectOption[] = [
  { value: 'Never', label: 'Never Smoked' },
  { value: 'Former', label: 'Former Smoker (Quit)' },
  { value: 'Current', label: 'Current Smoker' },
];

const ALCOHOL_OPTIONS: SearchableSelectOption[] = [
  { value: 'Never', label: 'Never (Non-drinker)' },
  { value: 'Occasionally', label: 'Occasionally / Social' },
  { value: 'Regularly', label: 'Regularly' },
  { value: 'Heavy / Problematic', label: 'Heavy / Problematic' },
];

const DIET_OPTIONS: SearchableSelectOption[] = [
  { value: 'Vegetarian', label: 'Vegetarian' },
  { value: 'Non-Vegetarian', label: 'Non-Vegetarian' },
  { value: 'Eggetarian', label: 'Eggetarian' },
  { value: 'Vegan', label: 'Vegan' },
  { value: 'Jain', label: 'Jain Diet' },
  { value: 'Other', label: 'Other' },
];

const ACTIVITY_OPTIONS: SearchableSelectOption[] = [
  { value: 'Sedentary', label: 'Sedentary (Little or no exercise)' },
  { value: 'Light', label: 'Light (1-2 days/week)' },
  { value: 'Moderate', label: 'Moderate (3-5 days/week)' },
  { value: 'Active', label: 'Active / Heavy (Athletic/daily)' },
];

const DOCUMENT_TYPE_OPTIONS: SearchableSelectOption[] = MEDICAL_DOCUMENT_TYPES.map((type) => ({
  value: type,
  label: type,
}));

interface StepDef {
  key: SectionTab;
  stepNum: number;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}

const STEPS: StepDef[] = [
  { key: 'current', stepNum: 1, label: '1. Current Examination & Vitals', shortLabel: 'Examination & Vitals', icon: <HeartPulse size={14} /> },
  { key: 'previous', stepNum: 2, label: '2. Previous Medical History', shortLabel: 'Previous Diseases & Surgeries', icon: <History size={14} /> },
  { key: 'family', stepNum: 3, label: '3. Family Medical History', shortLabel: 'Family Medical History', icon: <Users size={14} /> },
  { key: 'reproductive', stepNum: 4, label: '4. Reproductive & Obstetric', shortLabel: 'Reproductive & Obstetric', icon: <User size={14} /> },
  { key: 'lifestyle', stepNum: 5, label: '5. Lifestyle History', shortLabel: 'Lifestyle & Habits', icon: <Activity size={14} /> },
  { key: 'documents', stepNum: 6, label: '6. Medical Documents & Reports', shortLabel: 'Documents & Reports', icon: <FileText size={14} /> },
];

export const ClinicalHistorySectionContent = forwardRef<
  ClinicalHistorySectionHandle,
  ClinicalHistorySectionContentProps
>(function ClinicalHistorySectionContent(
  {
    isOpen,
    onClose,
    patientId,
    patientGender,
    patientName,
    patientAge,
    patientBloodGroup,
    initialData,
    onSuccess,
    activeTab: controlledTab,
    onTabChange,
    onPreviousToPersonal,
    onFinish,
    initialVitals,
    hideStepperHeader = false,
    hideFooter = false,
    ensurePatientSaved,
  },
  ref,
) {
  const app = App.useApp();
  const message =
    app?.message && typeof app.message.error === 'function'
      ? app.message
      : staticMessage && typeof staticMessage.error === 'function'
        ? staticMessage
        : {
            success: (_m: string) => {},
            error: (_m: string) => {},
            warning: (_m: string) => {},
            info: (_m: string) => {},
          };

  const [localTab, setLocalTab] = useState<SectionTab>('current');
  const activeTab = controlledTab ?? localTab;
  const setActiveTab = (t: SectionTab) => {
    if (onTabChange) onTabChange(t);
    else setLocalTab(t);
  };	
  const [savedHistoryId, setSavedHistoryId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveAction, setSaveAction] = useState<'next' | 'close' | null>(null);

  // General Record Meta
  const [recordedDate, setRecordedDate] = useState(() => new Date().toISOString().split('T')[0] ?? '');
  const [recordedByName, setRecordedByName] = useState('Attending Doctor');
  const [recordNotes, setRecordNotes] = useState('');

  // 1. Current Medical Info
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [currentSymptoms, setCurrentSymptoms] = useState('');
  const [symptomDuration, setSymptomDuration] = useState('');
  const [painLevel, setPainLevel] = useState<number>(0);
  const [currentDiagnosis, setCurrentDiagnosis] = useState('');
  const [clinicalObservations, setClinicalObservations] = useState('');
  const [heightCm, setHeightCm] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [pulseRate, setPulseRate] = useState<string>('');
  const [temperature, setTemperature] = useState<string>('');
  const [oxygenSaturation, setOxygenSaturation] = useState<string>('');
  const [bloodSugar, setBloodSugar] = useState<string>('');
  const [alreadyTakingTablets, setAlreadyTakingTablets] = useState<string>('');
  const [customVitals, setCustomVitals] = useState<
    Array<{ id: string; label: string; value: string; tablet_name?: string }>
  >([]);

  const handleAddCustomVital = () => {
    setCustomVitals((prev) => [
      ...prev,
      {
        id: `vital-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        label: '',
        value: '',
        tablet_name: '',
      },
    ]);
  };

  const handleUpdateCustomVital = (
    id: string,
    field: 'label' | 'value' | 'tablet_name',
    val: string,
  ) => {
    setCustomVitals((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item)),
    );
  };

  const handleRemoveCustomVital = (id: string) => {
    setCustomVitals((prev) => prev.filter((item) => item.id !== id));
  };

  // Sync initial vitals if provided
  useEffect(() => {
    if (initialVitals) {
      if (initialVitals.heightCm && !heightCm) setHeightCm(initialVitals.heightCm);
      if (initialVitals.weightKg && !weightKg) setWeightKg(initialVitals.weightKg);
      if (initialVitals.bloodPressure && !bloodPressure) setBloodPressure(initialVitals.bloodPressure);
      if (initialVitals.temperature && !temperature) setTemperature(initialVitals.temperature);
      if (initialVitals.bloodSugar && !bloodSugar) setBloodSugar(initialVitals.bloodSugar);
      if (initialVitals.alreadyTakingTablets && !alreadyTakingTablets) setAlreadyTakingTablets(initialVitals.alreadyTakingTablets);
      if (initialVitals.customVitals && initialVitals.customVitals.length > 0 && customVitals.length === 0) {
        setCustomVitals(
          initialVitals.customVitals.map((cv: any, idx: number) => ({
            id: cv.id || `vital-init-${idx}`,
            label: cv.label || '',
            value: cv.value || '',
            tablet_name: cv.tablet_name || cv.tabletName || '',
          })),
        );
      }
    }
  }, [initialVitals]);

  // Auto-calculated BMI
  const bmiInfo = useMemo(() => {
    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);
    if (!h || !w || h <= 0 || w <= 0) return null;
    const bmiVal = w / ((h / 100) * (h / 100));
    if (!Number.isFinite(bmiVal)) return null;
    let band = 'Healthy';
    let color = '#16a34a';
    if (bmiVal < 18.5) {
      band = 'Underweight';
      color = '#eab308';
    } else if (bmiVal < 25) {
      band = 'Healthy / Normal';
      color = '#16a34a';
    } else if (bmiVal < 30) {
      band = 'Overweight';
      color = '#f97316';
    } else {
      band = 'Obese';
      color = '#dc2626';
    }
    return { val: bmiVal.toFixed(1), band, color };
  }, [heightCm, weightKg]);

  // 2. Previous Medical History
  const [chronicDiseases, setChronicDiseases] = useState<string[]>([]);
  const [previousDiseases, setPreviousDiseases] = useState<PreviousDisease[]>([]);
  const [diabetesHas, setDiabetesHas] = useState<'Yes' | 'No' | 'Unknown'>('No');
  const [diabetesDetails, setDiabetesDetails] = useState('');
  const [bpHas, setBpHas] = useState<'Yes' | 'No' | 'Unknown'>('No');
  const [bpDetails, setBpDetails] = useState('');
  const [heartHas, setHeartHas] = useState<'Yes' | 'No' | 'Unknown'>('No');
  const [heartDetails, setHeartDetails] = useState('');
  const [kidneyHas, setKidneyHas] = useState<'Yes' | 'No' | 'Unknown'>('No');
  const [kidneyDetails, setKidneyDetails] = useState('');
  const [liverHas, setLiverHas] = useState<'Yes' | 'No' | 'Unknown'>('No');
  const [liverDetails, setLiverDetails] = useState('');
  const [respHas, setRespHas] = useState<'Yes' | 'No' | 'Unknown'>('No');
  const [respDetails, setRespDetails] = useState('');

  const [surgeries, setSurgeries] = useState<Surgery[]>([]);
  const [admissions, setAdmissions] = useState<HospitalAdmission[]>([]);
  const [injuries, setInjuries] = useState('');
  const [transfusionHas, setTransfusionHas] = useState<'Yes' | 'No' | 'Unknown'>('No');
  const [transfusionDetails, setTransfusionDetails] = useState('');
  const [medAllergies, setMedAllergies] = useState('');
  const [foodAllergies, setFoodAllergies] = useState('');
  const [otherAllergies, setOtherAllergies] = useState('');
  const [currentMeds, setCurrentMeds] = useState<Medication[]>([]);
  const [previousMeds, setPreviousMeds] = useState<Medication[]>([]);
  const [ongoingTreatments, setOngoingTreatments] = useState('');

  // 3. Family Medical History
  const [hasFamilyHistory, setHasFamilyHistory] = useState<'Yes' | 'No' | 'Unknown'>('No');
  const [familyMembers, setFamilyMembers] = useState<FamilyMemberHistory[]>([]);

  // 4. Reproductive & Obstetric History
  const isFemale = (patientGender || '').toUpperCase() === 'FEMALE';
  const [reproductiveApplicable, setReproductiveApplicable] = useState(isFemale);
  const [maritalStatus, setMaritalStatus] = useState('');
  const [menarcheAge, setMenarcheAge] = useState<string>('');
  const [menstrualStatus, setMenstrualStatus] = useState('Regular');
  const [menopauseAge, setMenopauseAge] = useState<string>('');
  const [pregnancies, setPregnancies] = useState<string>('');
  const [deliveries, setDeliveries] = useState<string>('');
  const [childrenCount, setChildrenCount] = useState<string>('');
  const [livingChildren, setLivingChildren] = useState<string>('');
  const [miscarriages, setMiscarriages] = useState<string>('');
  const [abortions, setAbortions] = useState<string>('');
  const [firstChildbirthAge, setFirstChildbirthAge] = useState<string>('');
  const [lastChildbirthDate, setLastChildbirthDate] = useState('');
  const [breastfeedingHas, setBreastfeedingHas] = useState<'Yes' | 'No' | 'Not Applicable'>('Not Applicable');
  const [breastfeedingDuration, setBreastfeedingDuration] = useState('');
  const [contraceptiveUsage, setContraceptiveUsage] = useState('');
  const [hormoneTherapy, setHormoneTherapy] = useState('');
  const [infertilityTreatment, setInfertilityTreatment] = useState('');

  // 5. Lifestyle History
  const [smokingStatus, setSmokingStatus] = useState('Never');
  const [smokingDuration, setSmokingDuration] = useState('');
  const [alcoholConsumption, setAlcoholConsumption] = useState('Never');
  const [tobaccoUsage, setTobaccoUsage] = useState('');
  const [chewingTobacco, setChewingTobacco] = useState('');
  const [dietType, setDietType] = useState('Non-Vegetarian');
  const [activityLevel, setActivityLevel] = useState('Moderate');
  const [sleepPattern, setSleepPattern] = useState('');
  const [occupationalExposure, setOccupationalExposure] = useState('');
  const [otherHabits, setOtherHabits] = useState('');

  // 6. Documents State (Inline in Step 6)
  const [attachedDocuments, setAttachedDocuments] = useState<PatientMedicalDocument[]>([]);
  const [docType, setDocType] = useState<MedicalDocumentType>('Previous Medical Report');
  const [docTitle, setDocTitle] = useState('');
  const [docDate, setDocDate] = useState(() => new Date().toISOString().split('T')[0] ?? '');
  const [docNotes, setDocNotes] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDrawerOpen = isOpen !== undefined ? isOpen : true;
  const prevOpenRef = useRef(false);
  const prevLoadedRecordIdRef = useRef<string | null | undefined>(undefined);
  const loadedPatientIdRef = useRef<string | null>(null);

  const initialVitalsRef = useRef(initialVitals);
  useEffect(() => {
    initialVitalsRef.current = initialVitals;
  }, [initialVitals]);

  const populateFromRecord = useCallback((record: PatientMedicalHistoryRecord) => {
    const initV = initialVitalsRef.current;
    setSavedHistoryId(record.id);
    setRecordedDate(record.recorded_date ? record.recorded_date.split('T')[0] ?? '' : '');
    setRecordedByName(record.recorded_by_name || 'Attending Doctor');
    setRecordNotes(record.notes || '');

    const safeObj = (val: any) => {
      if (typeof val === 'string') {
        try {
          return JSON.parse(val);
        } catch {
          return {};
        }
      }
      return val || {};
    };

    const cmi = safeObj(record.current_medical_info);
    setChiefComplaint(cmi.chief_complaint || '');
    setCurrentSymptoms(cmi.current_symptoms || '');
    setSymptomDuration(cmi.duration_of_symptoms || '');
    setPainLevel(cmi.pain_level != null ? (typeof cmi.pain_level === 'number' ? cmi.pain_level : parseInt(String(cmi.pain_level), 10) || 0) : 0);
    setCurrentDiagnosis(cmi.current_diagnosis || '');
    setClinicalObservations(cmi.clinical_observations || '');
    setHeightCm(
      cmi.height_cm != null && String(cmi.height_cm).trim() !== ''
        ? String(cmi.height_cm)
        : initV?.heightCm || ''
    );
    setWeightKg(
      cmi.weight_kg != null && String(cmi.weight_kg).trim() !== ''
        ? String(cmi.weight_kg)
        : initV?.weightKg || ''
    );
    setBloodPressure(cmi.blood_pressure || initV?.bloodPressure || '');
    setPulseRate(cmi.pulse_rate != null ? String(cmi.pulse_rate) : '');
    setTemperature(
      cmi.temperature != null && String(cmi.temperature).trim() !== ''
        ? String(cmi.temperature)
        : initV?.temperature || ''
    );
    setOxygenSaturation(cmi.oxygen_saturation != null ? String(cmi.oxygen_saturation) : '');
    setBloodSugar(cmi.blood_sugar || initV?.bloodSugar || '');
    setAlreadyTakingTablets(cmi.already_taking_tablets || initV?.alreadyTakingTablets || '');
    if (Array.isArray(cmi.custom_vitals)) {
      setCustomVitals(
        cmi.custom_vitals.map((v: any, idx: number) => ({
          id: v.id || `vital-loaded-${idx}`,
          label: v.label || '',
          value: v.value || '',
          tablet_name: v.tablet_name || v.tabletName || '',
        })),
      );
    } else if (initV?.customVitals && initV.customVitals.length > 0) {
      setCustomVitals(
        initV.customVitals.map((v: any, idx: number) => ({
          id: v.id || `vital-init-${idx}`,
          label: v.label || '',
          value: v.value || '',
          tablet_name: v.tablet_name || v.tabletName || '',
        })),
      );
    } else {
      setCustomVitals([]);
    }

    const pmh = safeObj(record.previous_medical_history);
    setChronicDiseases(Array.isArray(pmh.chronic_diseases) ? pmh.chronic_diseases : []);
    setPreviousDiseases(Array.isArray(pmh.previous_diseases) ? pmh.previous_diseases : []);
    setDiabetesHas(normalizeYesNoUnknown(pmh.diabetes_history?.has_history));
    setDiabetesDetails(pmh.diabetes_history?.details || pmh.diabetes_history?.current_treatment || '');
    setBpHas(normalizeYesNoUnknown(pmh.blood_pressure_history?.has_history));
    setBpDetails(pmh.blood_pressure_history?.details || pmh.blood_pressure_history?.current_treatment || '');
    setHeartHas(normalizeYesNoUnknown(pmh.heart_disease_history?.has_history));
    setHeartDetails(pmh.heart_disease_history?.details || '');
    setKidneyHas(normalizeYesNoUnknown(pmh.kidney_disease_history?.has_history));
    setKidneyDetails(pmh.kidney_disease_history?.details || '');
    setLiverHas(normalizeYesNoUnknown(pmh.liver_disease_history?.has_history));
    setLiverDetails(pmh.liver_disease_history?.details || '');
    setRespHas(normalizeYesNoUnknown(pmh.respiratory_disease_history?.has_history));
    setRespDetails(pmh.respiratory_disease_history?.details || '');

    setSurgeries(Array.isArray(pmh.surgeries) ? pmh.surgeries : []);
    setAdmissions(Array.isArray(pmh.hospital_admissions) ? pmh.hospital_admissions : []);
    setInjuries(
      Array.isArray(pmh.injuries_accidents)
        ? pmh.injuries_accidents.map((i: any) => i.description || i).join('\n')
        : typeof pmh.injuries_accidents === 'string'
          ? pmh.injuries_accidents
          : '',
    );
    setTransfusionHas(normalizeYesNoUnknown(pmh.blood_transfusions?.had_transfusion));
    setTransfusionDetails(pmh.blood_transfusions?.reason || '');
    setMedAllergies(pmh.allergies?.medicine_allergies || '');
    setFoodAllergies(pmh.allergies?.food_allergies || '');
    setOtherAllergies(pmh.allergies?.other_allergies || '');
    setCurrentMeds(Array.isArray(pmh.current_medications) ? pmh.current_medications : []);
    setPreviousMeds(Array.isArray(pmh.previous_medications) ? pmh.previous_medications : []);
    setOngoingTreatments(pmh.ongoing_treatments || '');

    const fmh = safeObj(record.family_medical_history);
    setHasFamilyHistory(
      normalizeYesNoUnknown(
        fmh.has_family_history,
        fmh.members && fmh.members.length > 0 ? 'Yes' : 'No'
      )
    );
    if (Array.isArray(fmh.members)) {
      setFamilyMembers(
        fmh.members.map((m: any) => ({
          relationship: m.relationship || m.relation || 'Father',
          disease_name: m.disease_name || m.disease || m.condition || '',
          age_at_diagnosis: m.age_at_diagnosis != null ? m.age_at_diagnosis : null,
          current_health_status: m.current_health_status || m.health_status || 'Living with Condition',
          cause_of_death: m.cause_of_death || '',
          remarks: m.remarks || '',
        }))
      );
    } else {
      setFamilyMembers([]);
    }

    const rep = safeObj(record.reproductive_history);
    setReproductiveApplicable(rep.is_applicable !== false);
    setMaritalStatus(rep.marital_status || '');
    setMenarcheAge(rep.age_at_menarche != null && rep.age_at_menarche !== 0 ? String(rep.age_at_menarche) : '');
    setMenstrualStatus(rep.menstrual_status || 'Regular');
    setMenopauseAge(rep.age_at_menopause != null && rep.age_at_menopause !== 0 ? String(rep.age_at_menopause) : '');
    setPregnancies(rep.number_of_pregnancies != null ? String(rep.number_of_pregnancies) : '');
    setDeliveries(rep.number_of_deliveries != null ? String(rep.number_of_deliveries) : '');
    setChildrenCount(rep.number_of_children != null ? String(rep.number_of_children) : '');
    setLivingChildren(rep.number_of_living_children != null ? String(rep.number_of_living_children) : '');
    setMiscarriages(rep.number_of_miscarriages != null ? String(rep.number_of_miscarriages) : '');
    setAbortions(rep.number_of_abortions != null ? String(rep.number_of_abortions) : '');
    setFirstChildbirthAge(rep.age_at_first_childbirth != null && rep.age_at_first_childbirth !== 0 ? String(rep.age_at_first_childbirth) : '');
    setLastChildbirthDate(rep.date_of_last_childbirth ? String(rep.date_of_last_childbirth).split('T')[0] ?? '' : '');
    setBreastfeedingHas(normalizeBreastfeeding(rep.breastfeeding_history));
    setBreastfeedingDuration(rep.breastfeeding_duration || '');
    setContraceptiveUsage(rep.contraceptive_usage || '');
    setHormoneTherapy(rep.hormone_therapy_history || '');
    setInfertilityTreatment(rep.infertility_treatment_history || '');

    const lh = safeObj(record.lifestyle_history || (record as any).lifecycle_history);
    setSmokingStatus(normalizeSmokingStatus(lh.smoking_status));
    setSmokingDuration(lh.smoking_duration || '');
    setAlcoholConsumption(normalizeAlcoholConsumption(lh.alcohol_consumption));
    setTobaccoUsage(lh.tobacco_usage || '');
    setChewingTobacco(lh.chewing_tobacco || '');
    setDietType(normalizeDietType(lh.diet_type));
    setActivityLevel(normalizeActivityLevel(lh.physical_activity_level));
    setSleepPattern(lh.sleep_pattern || '');
    setOccupationalExposure(lh.occupational_exposure || '');
    setOtherHabits(lh.other_habits || '');
  }, []);

  const resetForm = useCallback(() => {
    const initV = initialVitalsRef.current;
    setSavedHistoryId(null);
    setRecordedDate(new Date().toISOString().split('T')[0] ?? '');
    setRecordedByName('Attending Doctor');
    setRecordNotes('');

    setChiefComplaint('');
    setCurrentSymptoms('');
    setSymptomDuration('');
    setPainLevel(0);
    setCurrentDiagnosis('');
    setClinicalObservations('');
    setHeightCm(initV?.heightCm || '');
    setWeightKg(initV?.weightKg || '');
    setBloodPressure(initV?.bloodPressure || '');
    setPulseRate('');
    setTemperature(initV?.temperature || '');
    setOxygenSaturation('');
    setBloodSugar(initV?.bloodSugar || '');
    setAlreadyTakingTablets(initV?.alreadyTakingTablets || '');
    setCustomVitals([]);

    setChronicDiseases([]);
    setPreviousDiseases([]);
    setDiabetesHas('No');
    setDiabetesDetails('');
    setBpHas('No');
    setBpDetails('');
    setHeartHas('No');
    setHeartDetails('');
    setKidneyHas('No');
    setKidneyDetails('');
    setLiverHas('No');
    setLiverDetails('');
    setRespHas('No');
    setRespDetails('');

    setSurgeries([]);
    setAdmissions([]);
    setInjuries('');
    setTransfusionHas('No');
    setTransfusionDetails('');
    setMedAllergies('');
    setFoodAllergies('');
    setOtherAllergies('');
    setCurrentMeds([]);
    setPreviousMeds([]);
    setOngoingTreatments('');

    setHasFamilyHistory('No');
    setFamilyMembers([]);

    setReproductiveApplicable(isFemale);
    setMaritalStatus('');
    setMenarcheAge('');
    setMenstrualStatus('Regular');
    setMenopauseAge('');
    setPregnancies('');
    setDeliveries('');
    setChildrenCount('');
    setLivingChildren('');
    setMiscarriages('');
    setAbortions('');
    setFirstChildbirthAge('');
    setLastChildbirthDate('');
    setBreastfeedingHas('Not Applicable');
    setBreastfeedingDuration('');
    setContraceptiveUsage('');
    setHormoneTherapy('');
    setInfertilityTreatment('');

    setSmokingStatus('Never');
    setSmokingDuration('');
    setAlcoholConsumption('Never');
    setTobaccoUsage('');
    setChewingTobacco('');
    setDietType('Non-Vegetarian');
    setActivityLevel('Moderate');
    setSleepPattern('');
    setOccupationalExposure('');
    setOtherHabits('');
  }, [isFemale]);

  const fetchPatientDocs = useCallback(async () => {
    if (!patientId) return;
    try {
      const docs = await medicalHistoryApi.getDocuments(patientId);
      setAttachedDocuments(docs);
    } catch {
      // Ignored
    }
  }, [patientId]);

  const lastPopulatedDataRef = useRef<any>(null);
  const lastPopulatedUpdatedAtRef = useRef<any>(null);

  // Initialize form state from initialData, fetch latest history, or reset
  useEffect(() => {
    if (!isDrawerOpen) {
      prevOpenRef.current = false;
      prevLoadedRecordIdRef.current = undefined;
      loadedPatientIdRef.current = null;
      lastPopulatedDataRef.current = null;
      lastPopulatedUpdatedAtRef.current = null;
      return;
    }

    const justOpened = !prevOpenRef.current;
    prevOpenRef.current = true;

    if (initialData) {
      if (
        justOpened ||
        initialData !== lastPopulatedDataRef.current ||
        initialData.id !== prevLoadedRecordIdRef.current ||
        (initialData.updated_at && initialData.updated_at !== lastPopulatedUpdatedAtRef.current)
      ) {
        prevLoadedRecordIdRef.current = initialData.id;
        lastPopulatedDataRef.current = initialData;
        lastPopulatedUpdatedAtRef.current = initialData.updated_at || initialData.id;
        populateFromRecord(initialData);
      }
    } else if (initialData === null) {
      if (justOpened) {
        prevLoadedRecordIdRef.current = null;
        lastPopulatedDataRef.current = null;
        resetForm();
      }
    } else {
      // initialData is undefined (e.g. unified patient registration drawer)
      if (patientId && (justOpened || loadedPatientIdRef.current !== patientId)) {
        loadedPatientIdRef.current = patientId;
        let isCancelled = false;
        medicalHistoryApi
          .getLatestHistory(patientId)
          .then((latest) => {
            if (isCancelled) return;
            if (latest) {
              prevLoadedRecordIdRef.current = latest.id;
              lastPopulatedDataRef.current = latest;
              lastPopulatedUpdatedAtRef.current = latest.updated_at || latest.id;
              populateFromRecord(latest);
            } else {
              resetForm();
            }
          })
          .catch(() => {
            if (!isCancelled) {
              resetForm();
            }
          });
        return () => {
          isCancelled = true;
        };
      } else if (justOpened) {
        resetForm();
      }
    }

    if (patientId) {
      void fetchPatientDocs();
    }
  }, [isDrawerOpen, initialData, patientId, populateFromRecord, resetForm, fetchPatientDocs]);

  // Handlers for dynamic list additions
  const addDisease = () => {
    setPreviousDiseases((prev) => [
      ...prev,
      { disease_name: '', diagnosis_date: '', treatment_details: '', current_status: 'Resolved', remarks: '' },
    ]);
  };

  const removeDisease = (idx: number) => {
    setPreviousDiseases((prev) => prev.filter((_, i) => i !== idx));
  };

  const addSurgery = () => {
    setSurgeries((prev) => [
      ...prev,
      { surgery_name: '', surgery_date: '', hospital_name: '', surgeon_name: '', outcome: '', remarks: '' },
    ]);
  };

  const removeSurgery = (idx: number) => {
    setSurgeries((prev) => prev.filter((_, i) => i !== idx));
  };

  const addAdmission = () => {
    setAdmissions((prev) => [
      ...prev,
      { hospital_name: '', admission_date: '', discharge_date: '', reason: '', treatment_summary: '' },
    ]);
  };

  const removeAdmission = (idx: number) => {
    setAdmissions((prev) => prev.filter((_, i) => i !== idx));
  };

  const addFamilyMember = () => {
    setFamilyMembers((prev) => [
      ...prev,
      { relationship: 'Father', disease_name: '', age_at_diagnosis: null, current_health_status: 'Healthy / Normal', cause_of_death: '', remarks: '' },
    ]);
  };

  const removeFamilyMember = (idx: number) => {
    setFamilyMembers((prev) => prev.filter((_, i) => i !== idx));
  };

  const addCurrentMed = () => {
    setCurrentMeds((prev) => [
      ...prev,
      { medicine_name: '', dosage: '', frequency: '', started_date: '', is_current: true, prescribed_by: '', remarks: '' },
    ]);
  };

  const removeCurrentMed = (idx: number) => {
    setCurrentMeds((prev) => prev.filter((_, i) => i !== idx));
  };

  const addPreviousMed = () => {
    setPreviousMeds((prev) => [
      ...prev,
      { medicine_name: '', dosage: '', frequency: '', is_current: false, remarks: '' },
    ]);
  };

  const removePreviousMed = (idx: number) => {
    setPreviousMeds((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleChronicDisease = (item: string) => {
    setChronicDiseases((prev) =>
      prev.includes(item) ? prev.filter((x) => x !== item) : [...prev, item],
    );
  };

  // Safe numeric parsing helpers to prevent NaN serialization issues
  const safeInt = (v: any): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = parseInt(String(v), 10);
    return Number.isNaN(n) ? null : n;
  };
  const safeFloat = (v: any): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = parseFloat(String(v));
    return Number.isNaN(n) ? null : n;
  };

  // Build structured payload
  const buildPayload = (): Partial<PatientMedicalHistoryRecord> => ({
    recorded_date: recordedDate || (new Date().toISOString().split('T')[0] ?? ''),
    recorded_by_name: recordedByName,
    notes: recordNotes.trim() || null,
    current_medical_info: {
      chief_complaint: chiefComplaint.trim() || null,
      current_symptoms: currentSymptoms.trim() || null,
      duration_of_symptoms: symptomDuration.trim() || null,
      pain_level: painLevel,
      current_diagnosis: currentDiagnosis.trim() || null,
      clinical_observations: clinicalObservations.trim() || null,
      height_cm: safeFloat(heightCm),
      weight_kg: safeFloat(weightKg),
      bmi: bmiInfo ? safeFloat(bmiInfo.val) : null,
      blood_pressure: bloodPressure.trim() || null,
      pulse_rate: safeInt(pulseRate),
      temperature: safeFloat(temperature),
      oxygen_saturation: safeInt(oxygenSaturation),
      blood_sugar: bloodSugar.trim() || null,
      already_taking_tablets: alreadyTakingTablets.trim() || null,
      custom_vitals: customVitals
        .map((cv) => ({
          label: cv.label.trim(),
          value: cv.value.trim(),
          tablet_name: cv.tablet_name?.trim() || undefined,
        }))
        .filter((cv) => cv.label || cv.value || cv.tablet_name),
    },
    previous_medical_history: {
      chronic_diseases: chronicDiseases,
      previous_diseases: previousDiseases.filter((d) => d.disease_name.trim()),
      diabetes_history: {
        has_history: diabetesHas,
        details: diabetesDetails.trim() || null,
        current_treatment: diabetesDetails.trim() || null,
      },
      blood_pressure_history: {
        has_history: bpHas,
        details: bpDetails.trim() || null,
        current_treatment: bpDetails.trim() || null,
      },
      heart_disease_history: {
        has_history: heartHas,
        details: heartDetails.trim() || null,
      },
      kidney_disease_history: {
        has_history: kidneyHas,
        details: kidneyDetails.trim() || null,
      },
      liver_disease_history: {
        has_history: liverHas,
        details: liverDetails.trim() || null,
      },
      respiratory_disease_history: {
        has_history: respHas,
        details: respDetails.trim() || null,
      },
      surgeries: surgeries.filter((s) => s.surgery_name.trim()),
      hospital_admissions: admissions
        .filter((a) => a.hospital_name.trim() || a.reason.trim())
        .map((a) => ({
          ...a,
          hospital_name: a.hospital_name.trim() || 'Hospital Admission',
          reason: a.reason.trim() || 'Medical Admission',
        })),
      injuries_accidents: injuries.trim() ? [{ description: injuries.trim() }] : [],
      blood_transfusions: {
        had_transfusion: transfusionHas,
        reason: transfusionDetails.trim() || null,
      },
      allergies: {
        medicine_allergies: medAllergies.trim() || null,
        food_allergies: foodAllergies.trim() || null,
        other_allergies: otherAllergies.trim() || null,
      },
      current_medications: currentMeds.filter((m) => m.medicine_name.trim()),
      previous_medications: previousMeds.filter((m) => m.medicine_name.trim()),
      ongoing_treatments: ongoingTreatments.trim() || null,
    },
    family_medical_history: {
      has_family_history: hasFamilyHistory,
      members: familyMembers
        .filter(
          (m) =>
            (m.disease_name && String(m.disease_name).trim()) ||
            (m.relationship && String(m.relationship).trim()) ||
            (m.remarks && String(m.remarks).trim()) ||
            (m.cause_of_death && String(m.cause_of_death).trim()),
        )
        .map((m) => ({
          ...m,
          disease_name: (m.disease_name || '').trim(),
          relationship: (m.relationship || 'Family Member').trim(),
          current_health_status: m.current_health_status || 'Living with Condition',
          cause_of_death: m.cause_of_death ? String(m.cause_of_death).trim() : null,
          remarks: m.remarks ? String(m.remarks).trim() : null,
        })),
    },
    reproductive_history: {
      is_applicable: reproductiveApplicable,
      marital_status: (maritalStatus || '').trim() || null,
      age_at_menarche: safeInt(menarcheAge),
      menstrual_status: menstrualStatus,
      age_at_menopause: safeInt(menopauseAge),
      number_of_pregnancies: safeInt(pregnancies),
      number_of_deliveries: safeInt(deliveries),
      number_of_children: safeInt(childrenCount),
      number_of_living_children: safeInt(livingChildren),
      number_of_miscarriages: safeInt(miscarriages),
      number_of_abortions: safeInt(abortions),
      age_at_first_childbirth: safeInt(firstChildbirthAge),
      date_of_last_childbirth: lastChildbirthDate || null,
      breastfeeding_history: breastfeedingHas,
      breastfeeding_duration: (breastfeedingDuration || '').trim() || null,
      contraceptive_usage: (contraceptiveUsage || '').trim() || null,
      hormone_therapy_history: (hormoneTherapy || '').trim() || null,
      infertility_treatment_history: (infertilityTreatment || '').trim() || null,
    },
    lifestyle_history: {
      smoking_status: smokingStatus,
      smoking_duration: (smokingDuration || '').trim() || null,
      alcohol_consumption: alcoholConsumption,
      tobacco_usage: (tobaccoUsage || '').trim() || null,
      chewing_tobacco: (chewingTobacco || '').trim() || null,
      diet_type: dietType,
      physical_activity_level: activityLevel,
      sleep_pattern: (sleepPattern || '').trim() || null,
      occupational_exposure: (occupationalExposure || '').trim() || null,
      other_habits: (otherHabits || '').trim() || null,
    },
  });

  // Save changes to backend
  const persistChanges = async (): Promise<PatientMedicalHistoryRecord> => {
    let effectivePatientId = patientId;
    if (!effectivePatientId && ensurePatientSaved) {
      effectivePatientId = await ensurePatientSaved();
    }
    if (!effectivePatientId) {
      throw new Error('Please complete and save Personal Details first.');
    }
    const payload = buildPayload();
    let result: PatientMedicalHistoryRecord;
    const historyIdToUpdate = savedHistoryId || initialData?.id;

    if (historyIdToUpdate) {
      result = await medicalHistoryApi.updateHistory(effectivePatientId, historyIdToUpdate, payload);
    } else {
      result = await medicalHistoryApi.createHistory(effectivePatientId, payload);
      setSavedHistoryId(result.id);
    }
    prevLoadedRecordIdRef.current = result.id;
    onSuccess(result);
    return result;
  };

  useImperativeHandle(ref, () => ({
    save: persistChanges,
  }));

  // Next Action (automatically persists progress)
  const handleNextWithoutSave = () => {
    void handleSaveAndNext();
  };

  // Save & Next Action
  const handleSaveAndNext = async () => {
    setSaving(true);
    setSaveAction('next');
    try {
      await persistChanges();
      message.success('Progress saved! Moving to the next section.');

      const currentIndex = STEPS.findIndex((s) => s.key === activeTab);
      let nextIndex = currentIndex + 1;
      // If next is reproductive and not applicable, skip to lifestyle
      if (STEPS[nextIndex]?.key === 'reproductive' && !reproductiveApplicable && !isFemale) {
        nextIndex += 1;
      }
      if (nextIndex < STEPS.length) {
        const targetStep = STEPS[nextIndex];
        if (targetStep) {
          setActiveTab(targetStep.key);
        }
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      message.error(e.response?.data?.error || e.message || 'Failed to save progress.');
    } finally {
      setSaving(false);
      setSaveAction(null);
    }
  };

  // Previous Action
  const handlePrevious = () => {
    const currentIndex = STEPS.findIndex((s) => s.key === activeTab);
    if (currentIndex <= 0) {
      if (onPreviousToPersonal) {
        onPreviousToPersonal();
      }
      return;
    }
    let prevIndex = currentIndex - 1;
    if (STEPS[prevIndex]?.key === 'reproductive' && !reproductiveApplicable && !isFemale) {
      prevIndex -= 1;
    }
    if (prevIndex >= 0) {
      const targetStep = STEPS[prevIndex];
      if (targetStep) {
        setActiveTab(targetStep.key);
      }
    } else if (onPreviousToPersonal) {
      onPreviousToPersonal();
    }
  };

  // Save & Close Action
  const handleSaveAndClose = async (isFinishing = false) => {
    setSaving(true);
    setSaveAction('close');
    try {
      await persistChanges();
      message.success(isFinishing ? 'Complete Medical History saved successfully!' : 'Medical history saved successfully.');
      if (isFinishing && onFinish) {
        onFinish();
      } else {
        onClose();
      }
    } catch (err: unknown) {
      console.error('handleSaveAndNext catch:', err);
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      message.error(e.response?.data?.error || e.message || 'Failed to save medical history.');
    } finally {
      setSaving(false);
      setSaveAction(null);
    }
  };

  // Inline Document Upload Handler for Step 6
  const handleUploadDocumentInline = async () => {
    if (!docTitle.trim()) {
      message.warning('Please enter a document title.');
      return;
    }
    if (!docFile) {
      message.warning('Please select a file to upload.');
      return;
    }

    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('document_type', docType);
      formData.append('title', docTitle.trim());
      formData.append('document_date', docDate);
      formData.append('notes', docNotes.trim());
      const targetHistoryId = savedHistoryId || initialData?.id;
      if (targetHistoryId) {
        formData.append('medical_history_id', targetHistoryId);
      }
      formData.append('file', docFile);

      let effectivePatientId = patientId;
      if (!effectivePatientId && ensurePatientSaved) {
        effectivePatientId = await ensurePatientSaved();
      }
      if (!effectivePatientId) {
        throw new Error('Please complete and save Personal Details first.');
      }

      const created = await medicalHistoryApi.uploadDocument(effectivePatientId, formData);
      setAttachedDocuments((prev) => [created, ...prev]);
      message.success('Medical document uploaded and attached successfully.');
      setDocTitle('');
      setDocNotes('');
      setDocFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: unknown) {
      console.error('handleSaveAndNext catch:', err);
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      message.error(e.response?.data?.error || e.message || 'Failed to upload document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleDeleteDocumentInline = async (docId: string) => {
    try {
      let effectivePatientId = patientId;
      if (!effectivePatientId && ensurePatientSaved) {
        effectivePatientId = await ensurePatientSaved();
      }
      if (!effectivePatientId) return;
      await medicalHistoryApi.deleteDocument(effectivePatientId, docId);
      setAttachedDocuments((prev) => prev.filter((d) => d.id !== docId));
      message.success('Document deleted successfully.');
    } catch (err: unknown) {
      console.error('handleSaveAndNext catch:', err);
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      message.error(e.response?.data?.error || e.message || 'Failed to delete document.');
    }
  };

  const currentIndex = STEPS.findIndex((s) => s.key === activeTab);

  return (
    <div
      className="clinical-history-section-root"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        flex: 1,
        overflow: 'hidden',
        background: '#f8fafc',
      }}
    >
      <style>{`
        .clinical-history-section-root .patient-section-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 18px 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: border-color 0.15s ease;
        }
        .clinical-history-section-root .patient-section-card:hover {
          border-color: #cbd5e1;
        }
        .clinical-history-section-root .patient-section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding-bottom: 8px;
          border-bottom: 1px solid #f1f5f9;
        }
        .clinical-history-section-root .patient-section-badge {
          width: 26px;
          height: 26px;
          border-radius: 7px;
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #dbeafe;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .clinical-history-section-root .patient-section-badge svg {
          display: block;
          margin: auto;
        }
        .clinical-history-section-root .patient-section-tag {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.06em;
          color: #475569;
          text-transform: uppercase;
        }
        .clinical-history-section-root label {
          font-size: 12px;
          font-weight: 600;
          color: #334155;
          margin-bottom: 5px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .clinical-history-section-root input.patient-form-input,
        .clinical-history-section-root select.patient-form-input,
        .clinical-history-section-root input[type="text"],
        .clinical-history-section-root input[type="number"],
        .clinical-history-section-root input[type="date"],
        .clinical-history-section-root select {
          height: 38px !important;
          border-radius: 8px !important;
          border: 1px solid #e2e8f0 !important;
          font-size: 13px !important;
          padding: 0 12px !important;
          background: #ffffff !important;
          color: #0f172a !important;
          transition: all 0.15s ease !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        .clinical-history-section-root textarea.patient-form-input,
        .clinical-history-section-root textarea {
          border-radius: 8px !important;
          border: 1px solid #e2e8f0 !important;
          font-size: 13px !important;
          padding: 10px 12px !important;
          background: #ffffff !important;
          color: #0f172a !important;
          transition: all 0.15s ease !important;
          width: 100% !important;
          box-sizing: border-box !important;
        }
        .clinical-history-section-root input:focus,
        .clinical-history-section-root select:focus,
        .clinical-history-section-root textarea:focus,
        .clinical-history-section-root .patient-form-input:focus {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
          outline: none !important;
        }
        .clinical-dynamic-row {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 14px;
          transition: all 0.15s ease;
        }
        .clinical-dynamic-row:hover {
          border-color: #cbd5e1;
        }
        .clinical-add-btn {
          height: 32px;
          border-radius: 8px;
          border: 1px dashed #93c5fd;
          background: #eff6ff;
          color: #1d4ed8;
          font-size: 12px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          padding: 0 12px;
          transition: all 0.15s ease;
        }
        .clinical-add-btn:hover {
          background: #dbeafe;
          border-color: #60a5fa;
        }
      `}</style>

      {/* Pinned Top Header & Stepper Bar (when !hideStepperHeader) */}
      {!hideStepperHeader && (
        <div
          style={{
            flexShrink: 0,
            background: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
          }}
        >
          {/* Header Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px 12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                  color: '#2563eb',
                  border: '1px solid #bfdbfe',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                  boxShadow: '0 2px 6px rgba(37, 99, 235, 0.16)',
                }}
              >
                <Stethoscope size={18} />
              </div>
              <div>
                <div style={{ fontSize: 16.5, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  {initialData ? 'Edit Patient Medical History' : 'Record Complete Medical History'}
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>Patient:</span>
                  <span style={{ fontWeight: 650, color: '#1e293b' }}>{patientName || 'Selected Patient'}</span>
                  {patientAge && <Tag color="blue" style={{ fontSize: 10.5, padding: '0 5px', margin: 0 }}>{patientAge}</Tag>}
                  {patientGender && <Tag color="geekblue" style={{ fontSize: 10.5, padding: '0 5px', margin: 0 }}>{patientGender}</Tag>}
                  {patientBloodGroup && <Tag color="red" style={{ fontSize: 10.5, padding: '0 5px', margin: 0 }}>{patientBloodGroup}</Tag>}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {savedHistoryId && (
                <Tag color="success" style={{ display: 'flex', alignItems: 'center', gap: 4, margin: 0, padding: '2px 8px' }}>
                  <Check size={12} />
                  <span>Draft Saved ({savedHistoryId.slice(0, 8)})</span>
                </Tag>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  color: '#64748b',
                  display: 'grid',
                  placeItems: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Stepper Tabs Bar */}
          <div
            className="patient-drawer-stepper"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 24px 10px',
              borderTop: '1px solid #f1f5f9',
              backgroundColor: '#f8fafc',
              overflowX: 'auto',
            }}
          >
            {STEPS.map((step) => {
              const isActive = activeTab === step.key;
              return (
                <button
                  key={step.key}
                  data-testid={`step-tab-${step.key}`}
                  type="button"
                  onClick={() => setActiveTab(step.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                    backgroundColor: isActive ? '#eff6ff' : '#ffffff',
                    color: isActive ? '#1d4ed8' : '#475569',
                    fontSize: 12,
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      backgroundColor: isActive ? '#2563eb' : '#f1f5f9',
                      color: isActive ? '#ffffff' : '#64748b',
                      fontSize: 10,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                    }}
                  >
                    {step.stepNum}
                  </span>
                  {step.icon}
                  <span>{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Scrollable Clinical History Content Body */}
      <div
        className="clinical-history-scroll-body"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '20px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* TAB 1: CURRENT MEDICAL INFO & VITALS */}
        {activeTab === 'current' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Chief Complaint & Symptoms */}
            <div className="patient-section-card">
              <div className="patient-section-header">
                <div className="patient-section-badge">
                  <HeartPulse size={13} />
                </div>
                <div className="patient-section-tag">Presenting Complaints &amp; Symptoms</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Chief Complaint <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="patient-form-input"
                    placeholder="e.g. Intermittent tension headaches for 3 weeks"
                    value={chiefComplaint}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Duration of Symptoms
                  </label>
                  <input
                    type="text"
                    className="patient-form-input"
                    placeholder="e.g. 3 weeks, 2 days, acute"
                    value={symptomDuration}
                    onChange={(e) => setSymptomDuration(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginTop: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Current Symptoms in Detail
                </label>
                <textarea
                  className="patient-form-input"
                  rows={2}
                  placeholder="Describe symptoms, triggers, relieving factors, severity..."
                  value={currentSymptoms}
                  onChange={(e) => setCurrentSymptoms(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Pain Scale (0-10) */}
              <div style={{ marginTop: 12, padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>
                    Pain Level Assessment (0 – 10 Numeric Scale)
                  </label>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: painLevel === 0 ? '#16a34a' : painLevel < 4 ? '#eab308' : painLevel < 7 ? '#f97316' : '#dc2626',
                    }}
                  >
                    Level {painLevel} / 10 – {painLevel === 0 ? 'No Pain' : painLevel <= 3 ? 'Mild Pain' : painLevel <= 6 ? 'Moderate Pain' : painLevel <= 9 ? 'Severe Pain' : 'Worst Possible'}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  step={1}
                  value={painLevel}
                  onChange={(e) => setPainLevel(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: '#2563eb' }}
                />
              </div>
            </div>

            {/* Diagnosis & Clinical Observations */}
            <div className="patient-section-card">
              <div className="patient-section-header">
                <div className="patient-section-badge">
                  <Stethoscope size={13} />
                </div>
                <div className="patient-section-tag">Diagnosis &amp; Clinical Observations</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Current Working Diagnosis
                  </label>
                  <input
                    type="text"
                    className="patient-form-input"
                    placeholder="e.g. Tension-type Headache / Pre-hypertension"
                    value={currentDiagnosis}
                    onChange={(e) => setCurrentDiagnosis(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Clinical Observations &amp; Exam Notes
                  </label>
                  <input
                    type="text"
                    className="patient-form-input"
                    placeholder="e.g. Neck stiffness, clear chest, normal heart sounds"
                    value={clinicalObservations}
                    onChange={(e) => setClinicalObservations(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Physical Vitals Strip & Auto-Calculated BMI */}
            <div className="patient-section-card">
              <div
                className="patient-section-header"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="patient-section-badge">
                    <Activity size={13} />
                  </div>
                  <div className="patient-section-tag">Physical Vitals &amp; Biometrics</div>
                </div>

                <button
                  type="button"
                  data-testid="add-custom-vital-btn"
                  onClick={handleAddCustomVital}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    height: 28,
                    padding: '0 12px',
                    fontSize: 11.5,
                    fontWeight: 600,
                    borderRadius: 6,
                    background: '#f8fafc',
                    border: '1px solid #cbd5e1',
                    color: '#0f172a',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#f8fafc')}
                >
                  <Plus size={13} />
                  <span>Add Custom Field</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                <div>
                  <label htmlFor="cmi-height" style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>
                    Height (cm)
                  </label>
                  <input
                    id="cmi-height"
                    type="number"
                    step="0.1"
                    className="patient-form-input"
                    placeholder="e.g. 170"
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="cmi-weight" style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>
                    Weight (kg)
                  </label>
                  <input
                    id="cmi-weight"
                    type="number"
                    step="0.1"
                    className="patient-form-input"
                    placeholder="e.g. 70"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                  />
                </div>

                {/* Auto BMI Card */}
                <div
                  style={{
                    backgroundColor: bmiInfo ? `${bmiInfo.color}10` : '#f1f5f9',
                    border: `1px solid ${bmiInfo ? bmiInfo.color : '#cbd5e1'}`,
                    borderRadius: 6,
                    padding: '6px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}
                >
                  <div style={{ fontSize: 10.5, fontWeight: 600, color: '#64748b' }}>BMI Score</div>
                  {bmiInfo ? (
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                      <span style={{ fontSize: 15, fontWeight: 800, color: bmiInfo.color }}>{bmiInfo.val}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: bmiInfo.color }}>{bmiInfo.band}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>Auto-calc</span>
                  )}
                </div>

                <div>
                  <label htmlFor="cmi-blood-pressure" style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>
                    Blood Pressure (BP)
                  </label>
                  <input
                    id="cmi-blood-pressure"
                    type="text"
                    className="patient-form-input"
                    placeholder="e.g. 120/80"
                    value={bloodPressure}
                    onChange={(e) => setBloodPressure(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="cmi-blood-sugar" style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>
                    Blood Sugar
                  </label>
                  <input
                    id="cmi-blood-sugar"
                    type="text"
                    className="patient-form-input"
                    placeholder="e.g. 98 mg/dL"
                    value={bloodSugar}
                    onChange={(e) => setBloodSugar(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="cmi-pulse-rate" style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>
                    Pulse Rate (bpm)
                  </label>
                  <input
                    id="cmi-pulse-rate"
                    type="number"
                    className="patient-form-input"
                    placeholder="e.g. 72"
                    value={pulseRate}
                    onChange={(e) => setPulseRate(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="cmi-temperature" style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>
                    Body Temperature (°F)
                  </label>
                  <input
                    id="cmi-temperature"
                    type="number"
                    step="0.1"
                    className="patient-form-input"
                    placeholder="e.g. 98.6"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="cmi-oxygen-saturation" style={{ fontSize: 11, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 3 }}>
                    SpO2 (%)
                  </label>
                  <input
                    id="cmi-oxygen-saturation"
                    type="number"
                    className="patient-form-input"
                    placeholder="e.g. 98"
                    value={oxygenSaturation}
                    onChange={(e) => setOxygenSaturation(e.target.value)}
                  />
                </div>
              </div>

              {/* Dynamic Custom Vitals Section */}
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px dashed #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                      Additional Custom Vitals &amp; Metrics
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                      Record custom health parameters, value, and tablet names (Metric Name, Value, Tablet Name)
                    </div>
                  </div>

                  <button
                    type="button"
                    data-testid="add-custom-vital-btn"
                    onClick={handleAddCustomVital}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      height: 28,
                      padding: '0 12px',
                      fontSize: 11.5,
                      fontWeight: 600,
                      borderRadius: 6,
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      color: '#0f172a',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#e2e8f0')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#f8fafc')}
                  >
                    <Plus size={13} />
                    <span>Add Custom Field</span>
                  </button>
                </div>

                {customVitals.length === 0 ? (
                  <div
                    style={{
                      padding: '12px 14px',
                      background: '#f8fafc',
                      borderRadius: 6,
                      border: '1px dashed #cbd5e1',
                      textAlign: 'center',
                      fontSize: 11.5,
                      color: '#94a3b8',
                    }}
                  >
                    No custom vitals added yet. Click &ldquo;Add Custom Field&rdquo; to add metric name, value, and tablet name.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Column Headers */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'minmax(130px, 1.2fr) minmax(110px, 1fr) minmax(140px, 1.5fr) 28px',
                        gap: 8,
                        padding: '0 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        color: '#64748b',
                      }}
                    >
                      <div>Metric Name</div>
                      <div>Value</div>
                      <div>Tablet Name (If already taking)</div>
                      <div></div>
                    </div>

                    {customVitals.map((item, idx) => (
                      <div
                        key={item.id}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(130px, 1.2fr) minmax(110px, 1fr) minmax(140px, 1.5fr) 28px',
                          gap: 8,
                          alignItems: 'center',
                          background: '#f8fafc',
                          padding: '8px 10px',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div>
                          <input
                            type="text"
                            className="patient-form-input"
                            style={{ height: 32, fontSize: 12 }}
                            placeholder={`Metric name (e.g. SpO2, Pulse #${idx + 1})`}
                            value={item.label}
                            onChange={(e) => handleUpdateCustomVital(item.id, 'label', e.target.value)}
                            list="cmi-vital-suggestions"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            className="patient-form-input"
                            style={{ height: 32, fontSize: 12 }}
                            placeholder="Value (e.g. 98%, 140/90)"
                            value={item.value}
                            onChange={(e) => handleUpdateCustomVital(item.id, 'value', e.target.value)}
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            className="patient-form-input"
                            style={{ height: 32, fontSize: 12 }}
                            placeholder="Tablet name (if already taking)"
                            value={item.tablet_name || ''}
                            onChange={(e) => handleUpdateCustomVital(item.id, 'tablet_name', e.target.value)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomVital(item.id)}
                          title="Remove custom vital"
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: 5,
                            borderRadius: 6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}

                    <datalist id="cmi-vital-suggestions">
                      <option value="Pulse Rate (bpm)" />
                      <option value="Heart Rate (bpm)" />
                      <option value="SpO2 / Oxygen Saturation (%)" />
                      <option value="Respiratory Rate (breaths/min)" />
                      <option value="Blood Pressure (Sitting)" />
                      <option value="Blood Pressure (Standing)" />
                      <option value="Blood Sugar (Fasting)" />
                      <option value="Blood Sugar (Post Prandial)" />
                      <option value="Random Blood Sugar" />
                      <option value="HbA1c (%)" />
                      <option value="Hemoglobin (g/dL)" />
                      <option value="Total Cholesterol (mg/dL)" />
                      <option value="Serum Creatinine (mg/dL)" />
                      <option value="Uric Acid (mg/dL)" />
                      <option value="TSH / Thyroid (mIU/L)" />
                      <option value="Waist Circumference (cm)" />
                    </datalist>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PREVIOUS MEDICAL HISTORY */}
        {activeTab === 'previous' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Chronic Diseases Checklist */}
            <div className="patient-section-card">
              <div className="patient-section-header" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="patient-section-badge" style={{ background: '#eff6ff', color: '#2563eb', borderColor: '#dbeafe' }}>
                    <Activity size={14} />
                  </div>
                  <div className="patient-section-tag">Common Chronic Diseases</div>
                  {chronicDiseases.length > 0 && (
                    <Tag color="blue" style={{ borderRadius: 12, padding: '0 8px', fontSize: 11, fontWeight: 600 }}>
                      {chronicDiseases.length} selected
                    </Tag>
                  )}
                </div>
                {chronicDiseases.length > 0 && (
                  <Button
                    type="text"
                    size="small"
                    onClick={() => setChronicDiseases([])}
                    style={{ fontSize: 11, color: '#64748b' }}
                  >
                    Clear All
                  </Button>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: -4 }}>
                Select any pre-existing chronic conditions diagnosed in the patient.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                {CHRONIC_DISEASE_OPTIONS.map((disease) => {
                  const checked = chronicDiseases.includes(disease);
                  return (
                    <label
                      key={disease}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 12,
                        padding: '7px 10px',
                        backgroundColor: checked ? '#eff6ff' : '#f8fafc',
                        borderRadius: 8,
                        border: `1.5px solid ${checked ? '#3b82f6' : '#e2e8f0'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: checked ? '0 1px 2px rgba(59, 130, 246, 0.08)' : 'none',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleChronicDisease(disease)}
                        style={{ accentColor: '#2563eb', cursor: 'pointer', width: 14, height: 14 }}
                      />
                      <span style={{ color: checked ? '#1d4ed8' : '#334155', fontWeight: checked ? 600 : 500, flex: 1, userSelect: 'none' }}>
                        {disease}
                      </span>
                      {checked && <Check size={13} style={{ color: '#2563eb', flexShrink: 0 }} />}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Organ-Specific Histories */}
            <div className="patient-section-card">
              <div className="patient-section-header">
                <div className="patient-section-badge" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}>
                  <HeartPulse size={14} />
                </div>
                <div className="patient-section-tag">Specific Organ &amp; System Histories</div>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: -4 }}>
                Screen key vital organ systems for documented pathology, past interventions, and management status.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                {/* Diabetes */}
                <div
                  style={{
                    padding: 12,
                    backgroundColor: diabetesHas === 'Yes' ? '#f0fdf4' : '#f8fafc',
                    borderRadius: 8,
                    border: `1px solid ${diabetesHas === 'Yes' ? '#86efac' : '#e2e8f0'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Droplet size={13} style={{ color: '#0284c7' }} />
                      <span style={{ fontSize: 12.5, fontWeight: 650, color: '#0f172a' }}>Diabetes History</span>
                    </div>
                    <SearchableSelect
                      size="sm"
                      width={110}
                      searchable={false}
                      options={YES_NO_UNKNOWN_OPTIONS}
                      value={diabetesHas}
                      onChange={(val) => setDiabetesHas(val as 'Yes' | 'No' | 'Unknown')}
                    />
                  </div>
                  {diabetesHas === 'Yes' && (
                    <input
                      type="text"
                      className="patient-form-input"
                      placeholder="Type, treatment (e.g. Metformin 500mg, HbA1c 7.2)..."
                      value={diabetesDetails}
                      onChange={(e) => setDiabetesDetails(e.target.value)}
                      style={{ height: 32, fontSize: 11.5 }}
                    />
                  )}
                </div>

                {/* Blood Pressure */}
                <div
                  style={{
                    padding: 12,
                    backgroundColor: bpHas === 'Yes' ? '#fef2f2' : '#f8fafc',
                    borderRadius: 8,
                    border: `1px solid ${bpHas === 'Yes' ? '#fca5a5' : '#e2e8f0'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Activity size={13} style={{ color: '#dc2626' }} />
                      <span style={{ fontSize: 12.5, fontWeight: 650, color: '#0f172a' }}>Blood Pressure (Hypertension)</span>
                    </div>
                    <SearchableSelect
                      size="sm"
                      width={110}
                      searchable={false}
                      options={YES_NO_UNKNOWN_OPTIONS}
                      value={bpHas}
                      onChange={(val) => setBpHas(val as 'Yes' | 'No' | 'Unknown')}
                    />
                  </div>
                  {bpHas === 'Yes' && (
                    <input
                      type="text"
                      className="patient-form-input"
                      placeholder="Medication, control status (e.g. Amlodipine 5mg)..."
                      value={bpDetails}
                      onChange={(e) => setBpDetails(e.target.value)}
                      style={{ height: 32, fontSize: 11.5 }}
                    />
                  )}
                </div>

                {/* Heart Disease */}
                <div
                  style={{
                    padding: 12,
                    backgroundColor: heartHas === 'Yes' ? '#fff1f2' : '#f8fafc',
                    borderRadius: 8,
                    border: `1px solid ${heartHas === 'Yes' ? '#fda4af' : '#e2e8f0'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <HeartPulse size={13} style={{ color: '#e11d48' }} />
                      <span style={{ fontSize: 12.5, fontWeight: 650, color: '#0f172a' }}>Heart Disease History</span>
                    </div>
                    <SearchableSelect
                      size="sm"
                      width={110}
                      searchable={false}
                      options={YES_NO_UNKNOWN_OPTIONS}
                      value={heartHas}
                      onChange={(val) => setHeartHas(val as 'Yes' | 'No' | 'Unknown')}
                    />
                  </div>
                  {heartHas === 'Yes' && (
                    <input
                      type="text"
                      className="patient-form-input"
                      placeholder="Condition, stents, past events, medications..."
                      value={heartDetails}
                      onChange={(e) => setHeartDetails(e.target.value)}
                      style={{ height: 32, fontSize: 11.5 }}
                    />
                  )}
                </div>

                {/* Kidney Disease */}
                <div
                  style={{
                    padding: 12,
                    backgroundColor: kidneyHas === 'Yes' ? '#f0fdfa' : '#f8fafc',
                    borderRadius: 8,
                    border: `1px solid ${kidneyHas === 'Yes' ? '#5eead4' : '#e2e8f0'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ShieldAlert size={13} style={{ color: '#0d9488' }} />
                      <span style={{ fontSize: 12.5, fontWeight: 650, color: '#0f172a' }}>Kidney Disease</span>
                    </div>
                    <SearchableSelect
                      size="sm"
                      width={110}
                      searchable={false}
                      options={YES_NO_UNKNOWN_OPTIONS}
                      value={kidneyHas}
                      onChange={(val) => setKidneyHas(val as 'Yes' | 'No' | 'Unknown')}
                    />
                  </div>
                  {kidneyHas === 'Yes' && (
                    <input
                      type="text"
                      className="patient-form-input"
                      placeholder="e.g. Stones, CKD stage, creatinine..."
                      value={kidneyDetails}
                      onChange={(e) => setKidneyDetails(e.target.value)}
                      style={{ height: 32, fontSize: 11.5 }}
                    />
                  )}
                </div>

                {/* Liver Disease */}
                <div
                  style={{
                    padding: 12,
                    backgroundColor: liverHas === 'Yes' ? '#fffbeb' : '#f8fafc',
                    borderRadius: 8,
                    border: `1px solid ${liverHas === 'Yes' ? '#fde68a' : '#e2e8f0'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Stethoscope size={13} style={{ color: '#d97706' }} />
                      <span style={{ fontSize: 12.5, fontWeight: 650, color: '#0f172a' }}>Liver Disease</span>
                    </div>
                    <SearchableSelect
                      size="sm"
                      width={110}
                      searchable={false}
                      options={YES_NO_UNKNOWN_OPTIONS}
                      value={liverHas}
                      onChange={(val) => setLiverHas(val as 'Yes' | 'No' | 'Unknown')}
                    />
                  </div>
                  {liverHas === 'Yes' && (
                    <input
                      type="text"
                      className="patient-form-input"
                      placeholder="e.g. Fatty liver, hepatitis, jaundice..."
                      value={liverDetails}
                      onChange={(e) => setLiverDetails(e.target.value)}
                      style={{ height: 32, fontSize: 11.5 }}
                    />
                  )}
                </div>

                {/* Respiratory */}
                <div
                  style={{
                    padding: 12,
                    backgroundColor: respHas === 'Yes' ? '#eff6ff' : '#f8fafc',
                    borderRadius: 8,
                    border: `1px solid ${respHas === 'Yes' ? '#bfdbfe' : '#e2e8f0'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Activity size={13} style={{ color: '#2563eb' }} />
                      <span style={{ fontSize: 12.5, fontWeight: 650, color: '#0f172a' }}>Respiratory Diseases</span>
                    </div>
                    <SearchableSelect
                      size="sm"
                      width={110}
                      searchable={false}
                      options={YES_NO_UNKNOWN_OPTIONS}
                      value={respHas}
                      onChange={(val) => setRespHas(val as 'Yes' | 'No' | 'Unknown')}
                    />
                  </div>
                  {respHas === 'Yes' && (
                    <input
                      type="text"
                      className="patient-form-input"
                      placeholder="e.g. Asthma, COPD, inhaler usage..."
                      value={respDetails}
                      onChange={(e) => setRespDetails(e.target.value)}
                      style={{ height: 32, fontSize: 11.5 }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Dynamic Previous Diseases List */}
            <div className="patient-section-card">
              <div className="patient-section-header" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="patient-section-badge">
                    <FileText size={14} />
                  </div>
                  <div>
                    <div className="patient-section-tag">
                      Previous Medical Conditions &amp; Illnesses ({previousDiseases.length})
                    </div>
                  </div>
                </div>
                <Button
                  type="dashed"
                  size="small"
                  onClick={addDisease}
                  icon={<Plus size={13} />}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, borderRadius: 6, fontWeight: 500 }}
                >
                  Add Disease
                </Button>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: -4 }}>
                Add past medical conditions, timeline of diagnosis, treatment received, and recovery status.
              </div>

              {previousDiseases.length === 0 ? (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: 12.5,
                    backgroundColor: '#f8fafc',
                    borderRadius: 8,
                    border: '1px dashed #cbd5e1',
                  }}
                >
                  <FileText size={24} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                  <div>No past conditions added yet.</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    Click &quot;Add Disease&quot; to log previous illnesses.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Table Column Headers */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1.1fr 2fr 1.2fr 2fr 36px',
                      gap: 8,
                      padding: '0 8px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <span>Condition / Disease</span>
                    <span>Diagnosis Date</span>
                    <span>Treatment Details</span>
                    <span>Status</span>
                    <span>Remarks</span>
                    <span></span>
                  </div>

                  {previousDiseases.map((d, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1.1fr 2fr 1.2fr 2fr 36px',
                        gap: 8,
                        alignItems: 'center',
                        backgroundColor: '#f8fafc',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        transition: 'border-color 0.15s ease',
                      }}
                    >
                      <input
                        type="text"
                        className="patient-form-input"
                        placeholder="Condition / Disease Name"
                        value={d.disease_name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPreviousDiseases((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, disease_name: val } : item)),
                          );
                        }}
                        style={{ height: 32 }}
                      />
                      <input
                        type="date"
                        className="patient-form-input"
                        value={d.diagnosis_date || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPreviousDiseases((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, diagnosis_date: val } : item)),
                          );
                        }}
                        style={{ height: 32 }}
                      />
                      <input
                        type="text"
                        className="patient-form-input"
                        placeholder="Treatment Details"
                        value={d.treatment_details || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPreviousDiseases((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, treatment_details: val } : item)),
                          );
                        }}
                        style={{ height: 32 }}
                      />
                      <SearchableSelect
                        size="sm"
                        searchable={false}
                        options={DISEASE_STATUS_OPTIONS}
                        value={d.current_status || 'Resolved'}
                        onChange={(val) => {
                          setPreviousDiseases((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, current_status: val } : item)),
                          );
                        }}
                      />
                      <input
                        type="text"
                        className="patient-form-input"
                        placeholder="Remarks..."
                        value={d.remarks || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setPreviousDiseases((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, remarks: val } : item)),
                          );
                        }}
                        style={{ height: 32 }}
                      />
                      <button
                        type="button"
                        onClick={() => removeDisease(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 6,
                          borderRadius: 6,
                        }}
                        title="Delete Condition"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Surgeries & Procedures */}
            <div className="patient-section-card">
              <div className="patient-section-header" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="patient-section-badge" style={{ background: '#fdf4ff', color: '#a855f7', borderColor: '#f0abfc' }}>
                    <Scissors size={14} />
                  </div>
                  <div>
                    <div className="patient-section-tag">
                      Previous Surgeries &amp; Procedures ({surgeries.length})
                    </div>
                  </div>
                </div>
                <Button
                  type="dashed"
                  size="small"
                  onClick={addSurgery}
                  icon={<Plus size={13} />}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, borderRadius: 6, fontWeight: 500 }}
                >
                  Add Surgery
                </Button>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: -4 }}>
                Log past surgical interventions, operation dates, operating hospital, and primary surgeon.
              </div>

              {surgeries.length === 0 ? (
                <div
                  style={{
                    padding: '24px 16px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: 12.5,
                    backgroundColor: '#f8fafc',
                    borderRadius: 8,
                    border: '1px dashed #cbd5e1',
                  }}
                >
                  <Scissors size={24} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
                  <div>No past surgeries recorded.</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    Click &quot;Add Surgery&quot; if the patient underwent any procedures.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Table Column Headers */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1.2fr 1.5fr 1.5fr 1.5fr 36px',
                      gap: 8,
                      padding: '0 8px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <span>Surgery / Procedure Name</span>
                    <span>Date</span>
                    <span>Hospital / Clinic</span>
                    <span>Surgeon</span>
                    <span>Outcome / Remarks</span>
                    <span></span>
                  </div>

                  {surgeries.map((s, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1.2fr 1.5fr 1.5fr 1.5fr 36px',
                        gap: 8,
                        alignItems: 'center',
                        backgroundColor: '#f8fafc',
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        transition: 'border-color 0.15s ease',
                      }}
                    >
                      <input
                        type="text"
                        className="patient-form-input"
                        placeholder="Surgery Name (e.g. LSCS, Appendectomy)"
                        value={s.surgery_name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSurgeries((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, surgery_name: val } : item)),
                          );
                        }}
                        style={{ height: 32 }}
                      />
                      <input
                        type="date"
                        className="patient-form-input"
                        value={s.surgery_date || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSurgeries((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, surgery_date: val } : item)),
                          );
                        }}
                        style={{ height: 32 }}
                      />
                      <input
                        type="text"
                        className="patient-form-input"
                        placeholder="Hospital Name"
                        value={s.hospital_name || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSurgeries((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, hospital_name: val } : item)),
                          );
                        }}
                        style={{ height: 32 }}
                      />
                      <input
                        type="text"
                        className="patient-form-input"
                        placeholder="Surgeon"
                        value={s.surgeon_name || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSurgeries((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, surgeon_name: val } : item)),
                          );
                        }}
                        style={{ height: 32 }}
                      />
                      <input
                        type="text"
                        className="patient-form-input"
                        placeholder="Outcome / Remarks"
                        value={s.remarks || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSurgeries((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, remarks: val } : item)),
                          );
                        }}
                        style={{ height: 32 }}
                      />
                      <button
                        type="button"
                        onClick={() => removeSurgery(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 6,
                          borderRadius: 6,
                        }}
                        title="Delete Surgery"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Hospital Admissions & Injuries Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {/* Admissions */}
              <div className="patient-section-card" style={{ padding: 16 }}>
                <div className="patient-section-header" style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="patient-section-badge">
                      <Building2 size={14} />
                    </div>
                    <div className="patient-section-tag">Hospital Admissions ({admissions.length})</div>
                  </div>
                  <Button
                    type="dashed"
                    size="small"
                    onClick={addAdmission}
                    icon={<Plus size={12} />}
                    style={{ fontSize: 11, borderRadius: 6 }}
                  >
                    Add
                  </Button>
                </div>
                <div style={{ fontSize: 11.5, color: '#64748b', marginTop: -4 }}>
                  Inpatient stays, admission reasons, and duration.
                </div>
                {admissions.length === 0 ? (
                  <div
                    style={{
                      padding: '16px',
                      textAlign: 'center',
                      color: '#94a3b8',
                      fontSize: 12,
                      backgroundColor: '#f8fafc',
                      borderRadius: 6,
                      border: '1px dashed #e2e8f0',
                    }}
                  >
                    No past admissions recorded.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {admissions.map((adm, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: 10,
                          backgroundColor: '#f8fafc',
                          borderRadius: 8,
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            type="text"
                            className="patient-form-input"
                            placeholder="Hospital Name"
                            value={adm.hospital_name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAdmissions((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, hospital_name: val } : item)),
                              );
                            }}
                            style={{ height: 30, fontSize: 11.5, flex: 1 }}
                          />
                          <input
                            type="text"
                            className="patient-form-input"
                            placeholder="Reason for Admission"
                            value={adm.reason}
                            onChange={(e) => {
                              const val = e.target.value;
                              setAdmissions((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, reason: val } : item)),
                              );
                            }}
                            style={{ height: 30, fontSize: 11.5, flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={() => removeAdmission(idx)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}
                            title="Remove Admission"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 2 }}>Admission Date</span>
                            <input
                              type="date"
                              className="patient-form-input"
                              value={adm.admission_date || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAdmissions((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, admission_date: val } : item)),
                                );
                              }}
                              style={{ height: 28, fontSize: 11 }}
                            />
                          </div>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 2 }}>Discharge Date</span>
                            <input
                              type="date"
                              className="patient-form-input"
                              value={adm.discharge_date || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setAdmissions((prev) =>
                                  prev.map((item, i) => (i === idx ? { ...item, discharge_date: val } : item)),
                                );
                              }}
                              style={{ height: 28, fontSize: 11 }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Injuries & Transfusion */}
              <div className="patient-section-card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="patient-section-header">
                  <div className="patient-section-badge" style={{ background: '#fef2f2', color: '#ef4444', borderColor: '#fecaca' }}>
                    <Droplet size={14} />
                  </div>
                  <div className="patient-section-tag">Injuries &amp; Blood Transfusions</div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 650, color: '#0f172a', display: 'block', marginBottom: 4 }}>
                    Previous Injuries &amp; Accidents
                  </label>
                  <textarea
                    className="patient-form-input"
                    rows={2}
                    placeholder="Fractures, head injuries, major trauma, residual impairments..."
                    value={injuries}
                    onChange={(e) => setInjuries(e.target.value)}
                    style={{ width: '100%', fontSize: 12 }}
                  />
                </div>

                <div
                  style={{
                    backgroundColor: transfusionHas === 'Yes' ? '#fff1f2' : '#f8fafc',
                    padding: 10,
                    borderRadius: 8,
                    border: `1px solid ${transfusionHas === 'Yes' ? '#fecdd3' : '#e2e8f0'}`,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: transfusionHas === 'Yes' ? 8 : 0 }}>
                    <span style={{ fontSize: 12, fontWeight: 650, color: '#0f172a' }}>Blood Transfusion History</span>
                    <SearchableSelect
                      size="sm"
                      width={110}
                      searchable={false}
                      options={YES_NO_UNKNOWN_OPTIONS}
                      value={transfusionHas}
                      onChange={(val) => setTransfusionHas(val as 'Yes' | 'No' | 'Unknown')}
                    />
                  </div>
                  {transfusionHas === 'Yes' && (
                    <input
                      type="text"
                      className="patient-form-input"
                      placeholder="Transfusion reason, reactions, units..."
                      value={transfusionDetails}
                      onChange={(e) => setTransfusionDetails(e.target.value)}
                      style={{ height: 30, fontSize: 11.5 }}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* Known Allergies */}
            <div
              className="patient-section-card"
              style={{
                borderColor: '#fecaca',
                background: 'linear-gradient(to bottom, #ffffff, #fffafa)',
              }}
            >
              <div className="patient-section-header" style={{ borderBottomColor: '#fee2e2' }}>
                <div className="patient-section-badge" style={{ background: '#fef2f2', color: '#dc2626', borderColor: '#fecaca' }}>
                  <AlertCircle size={14} />
                </div>
                <div className="patient-section-tag" style={{ color: '#dc2626' }}>
                  Known Allergies &amp; Adverse Drug Reactions
                </div>
                <Tag color="red" style={{ marginLeft: 'auto', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>
                  Safety Alert
                </Tag>
              </div>
              <div style={{ fontSize: 12, color: '#991b1b', opacity: 0.85, marginTop: -4 }}>
                Record any severe or mild adverse reactions to medications, food allergens, or environmental triggers.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                <div style={{ padding: 10, background: '#ffffff', borderRadius: 8, border: '1px solid #fee2e2' }}>
                  <label style={{ fontSize: 11.5, fontWeight: 650, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <Pill size={12} style={{ color: '#dc2626' }} />
                    Medicine Allergies (e.g. Penicillin, Sulfa, NSAIDs)
                  </label>
                  <input
                    type="text"
                    className="patient-form-input"
                    placeholder="e.g. Penicillin (causes hives/urticaria)"
                    value={medAllergies}
                    onChange={(e) => setMedAllergies(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
                <div style={{ padding: 10, background: '#ffffff', borderRadius: 8, border: '1px solid #fee2e2' }}>
                  <label style={{ fontSize: 11.5, fontWeight: 650, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <AlertCircle size={12} style={{ color: '#dc2626' }} />
                    Food Allergies (e.g. Peanuts, Shellfish, Gluten)
                  </label>
                  <input
                    type="text"
                    className="patient-form-input"
                    placeholder="e.g. Peanuts, shellfish, lactose intolerance"
                    value={foodAllergies}
                    onChange={(e) => setFoodAllergies(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
                <div style={{ padding: 10, background: '#ffffff', borderRadius: 8, border: '1px solid #fee2e2' }}>
                  <label style={{ fontSize: 11.5, fontWeight: 650, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <ShieldAlert size={12} style={{ color: '#dc2626' }} />
                    Other Environmental / Chemical Allergies
                  </label>
                  <input
                    type="text"
                    className="patient-form-input"
                    placeholder="e.g. Dust mites, pollen, latex, contrast dye"
                    value={otherAllergies}
                    onChange={(e) => setOtherAllergies(e.target.value)}
                    style={{ fontSize: 12 }}
                  />
                </div>
              </div>
            </div>

            {/* Medications & Treatments */}
            <div className="patient-section-card">
              <div className="patient-section-header" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="patient-section-badge" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
                    <Pill size={14} />
                  </div>
                  <div>
                    <div className="patient-section-tag">
                      Current Medications &amp; Ongoing Treatments ({currentMeds.length})
                    </div>
                  </div>
                </div>
                <Button
                  type="dashed"
                  size="small"
                  onClick={addCurrentMed}
                  icon={<Plus size={12} />}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, borderRadius: 6, fontWeight: 500 }}
                >
                  Add Medication
                </Button>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: -4 }}>
                List all current active prescription medicines, dosages, frequencies, and start dates.
              </div>

              {currentMeds.length === 0 ? (
                <div
                  style={{
                    padding: '20px 16px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: 12.5,
                    backgroundColor: '#f8fafc',
                    borderRadius: 8,
                    border: '1px dashed #cbd5e1',
                  }}
                >
                  <Pill size={22} style={{ margin: '0 auto 6px', color: '#94a3b8' }} />
                  <div>No current medications listed.</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                    Click &quot;Add Medication&quot; to log current prescriptions.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {/* Table Column Headers */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1.1fr 1.5fr 36px',
                      gap: 6,
                      padding: '0 8px',
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#64748b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <span>Medicine Name</span>
                    <span>Dosage</span>
                    <span>Frequency</span>
                    <span>Started Date</span>
                    <span>Remarks / Prescriber</span>
                    <span></span>
                  </div>

                  {currentMeds.map((m, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '2fr 1fr 1fr 1.1fr 1.5fr 36px',
                        gap: 6,
                        alignItems: 'center',
                        backgroundColor: '#f8fafc',
                        padding: '6px 8px',
                        borderRadius: 8,
                        border: '1px solid #e2e8f0',
                        transition: 'border-color 0.15s ease',
                      }}
                    >
                      <input
                        type="text"
                        className="patient-form-input"
                        placeholder="Medicine Name (e.g. Levothyroxine)"
                        value={m.medicine_name}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCurrentMeds((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, medicine_name: val } : item)),
                          );
                        }}
                        style={{ height: 32 }}
                      />
                      <input
                        type="text"
                        className="patient-form-input"
                        placeholder="Dosage (50mcg)"
                        value={m.dosage || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCurrentMeds((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, dosage: val } : item)),
                          );
                        }}
                        style={{ height: 32 }}
                      />
                      <input
                        type="text"
                        className="patient-form-input"
                        placeholder="Frequency (OD, BD)"
                        value={m.frequency || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCurrentMeds((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, frequency: val } : item)),
                          );
                        }}
                        style={{ height: 32 }}
                      />
                      <input
                        type="date"
                        className="patient-form-input"
                        value={m.started_date || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCurrentMeds((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, started_date: val } : item)),
                          );
                        }}
                        style={{ height: 32 }}
                      />
                      <input
                        type="text"
                        className="patient-form-input"
                        placeholder="Remarks / Prescribed By"
                        value={m.remarks || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCurrentMeds((prev) =>
                            prev.map((item, i) => (i === idx ? { ...item, remarks: val } : item)),
                          );
                        }}
                        style={{ height: 32 }}
                      />
                      <button
                        type="button"
                        onClick={() => removeCurrentMed(idx)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#ef4444',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 4,
                          borderRadius: 6,
                        }}
                        title="Remove Medication"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Ongoing Treatments & Past Medications */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginTop: 4 }}>
                <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', margin: 0 }}>
                      Previous / Discontinued Medications ({previousMeds.length})
                    </label>
                    <Button
                      type="dashed"
                      size="small"
                      onClick={addPreviousMed}
                      icon={<Plus size={10} />}
                      style={{ fontSize: 11, height: 24, borderRadius: 5 }}
                    >
                      Add Past Med
                    </Button>
                  </div>
                  {previousMeds.length === 0 ? (
                    <div style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>
                      No discontinued medications recorded.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {previousMeds.map((pm, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input
                            type="text"
                            className="patient-form-input"
                            placeholder="Past Med (e.g. Omeprazole 20mg)"
                            value={pm.medicine_name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPreviousMeds((prev) =>
                                prev.map((item, i) => (i === idx ? { ...item, medicine_name: val } : item)),
                              );
                            }}
                            style={{ height: 30, fontSize: 11.5, flex: 1 }}
                          />
                          <button
                            type="button"
                            onClick={() => removePreviousMed(idx)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4 }}
                            title="Remove"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
                    Ongoing Clinical Therapies / Special Treatments
                  </label>
                  <textarea
                    className="patient-form-input"
                    rows={2}
                    placeholder="e.g. Physiotherapy twice weekly, CPAP machine, dialysis, chemotherapy..."
                    value={ongoingTreatments}
                    onChange={(e) => setOngoingTreatments(e.target.value)}
                    style={{ width: '100%', fontSize: 11.5 }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FAMILY MEDICAL HISTORY */}
        {activeTab === 'family' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                    Family History of Hereditary / Chronic Diseases
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    Record genetic conditions, early cardiac events, diabetes, or cancer in immediate relatives.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>Family History Present?</span>
                    <SearchableSelect
                      size="sm"
                      width={110}
                      searchable={false}
                      options={YES_NO_UNKNOWN_OPTIONS}
                      value={hasFamilyHistory}
                      onChange={(val) => setHasFamilyHistory(val as 'Yes' | 'No' | 'Unknown')}
                    />
                  </div>

                  <Button
                    type="primary"
                    size="small"
                    onClick={addFamilyMember}
                    icon={<Plus size={13} />}
                    style={{ backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    Add Relative
                  </Button>
                </div>
              </div>

              {familyMembers.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: 12, backgroundColor: '#f8fafc', borderRadius: 6 }}>
                  No family medical records added. Click &quot;Add Relative&quot; to log family history.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {familyMembers.map((fm, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1.4fr 2fr 1fr 1.3fr 1.5fr 1.5fr auto',
                        gap: 8,
                        alignItems: 'center',
                        backgroundColor: '#f8fafc',
                        padding: 10,
                        borderRadius: 6,
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 2 }}>Relationship</label>
                        <SearchableSelect
                          size="sm"
                          searchable={true}
                          placeholder="Select..."
                          searchPlaceholder="Search relationship..."
                          options={FAMILY_RELATIONSHIP_OPTIONS}
                          value={fm.relationship || 'Father'}
                          onChange={(val) => {
                            setFamilyMembers((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, relationship: val } : item)),
                            );
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block' }}>Disease / Condition</label>
                        <input
                          type="text"
                          className="patient-form-input"
                          placeholder="e.g. Type 2 Diabetes, Breast Cancer"
                          value={fm.disease_name || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFamilyMembers((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, disease_name: val } : item)),
                            );
                          }}
                          style={{ height: 30, fontSize: 11 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block' }}>Dx Age</label>
                        <input
                          type="number"
                          className="patient-form-input"
                          placeholder="Age"
                          value={fm.age_at_diagnosis != null ? fm.age_at_diagnosis : ''}
                          onChange={(e) => {
                            const val = e.target.value ? parseInt(e.target.value, 10) : null;
                            setFamilyMembers((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, age_at_diagnosis: val } : item)),
                            );
                          }}
                          style={{ height: 30, fontSize: 11 }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block', marginBottom: 2 }}>Status</label>
                        <SearchableSelect
                          size="sm"
                          searchable={false}
                          options={FAMILY_HEALTH_STATUS_OPTIONS}
                          value={fm.current_health_status || 'Healthy / Normal'}
                          onChange={(val) => {
                            setFamilyMembers((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, current_health_status: val } : item)),
                            );
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block' }}>Cause of Death</label>
                        <input
                          type="text"
                          className="patient-form-input"
                          placeholder={fm.current_health_status === 'Deceased' ? 'e.g. Heart attack at 72' : 'N/A'}
                          disabled={fm.current_health_status !== 'Deceased'}
                          value={fm.cause_of_death || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFamilyMembers((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, cause_of_death: val } : item)),
                            );
                          }}
                          style={{ height: 30, fontSize: 11, backgroundColor: fm.current_health_status !== 'Deceased' ? '#f1f5f9' : '#ffffff' }}
                        />
                      </div>

                      <div>
                        <label style={{ fontSize: 10, fontWeight: 700, color: '#64748b', display: 'block' }}>Remarks</label>
                        <input
                          type="text"
                          className="patient-form-input"
                          placeholder="Additional notes..."
                          value={fm.remarks || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFamilyMembers((prev) =>
                              prev.map((item, i) => (i === idx ? { ...item, remarks: val } : item)),
                            );
                          }}
                          style={{ height: 30, fontSize: 11 }}
                        />
                      </div>

                      <div style={{ paddingTop: 16 }}>
                        <button
                          type="button"
                          onClick={() => removeFamilyMember(idx)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: REPRODUCTIVE & OBSTETRIC HISTORY */}
        {activeTab === 'reproductive' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Applicability Header Card */}
            <div className="patient-section-card">
              <div className="patient-section-header" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="patient-section-badge" style={{ background: '#fdf2f8', color: '#db2777', borderColor: '#fbcfe8' }}>
                    <Baby size={14} />
                  </div>
                  <div className="patient-section-tag">
                    Reproductive &amp; Obstetric Clinical History
                  </div>
                  <Tag color={reproductiveApplicable ? 'magenta' : 'default'} style={{ borderRadius: 12, padding: '0 8px', fontSize: 11, fontWeight: 600 }}>
                    {reproductiveApplicable ? 'Clinically Applicable' : 'Not Applicable (Skipped)'}
                  </Tag>
                </div>
                <label
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 12,
                    fontWeight: 650,
                    color: reproductiveApplicable ? '#be185d' : '#64748b',
                    backgroundColor: reproductiveApplicable ? '#fdf2f8' : '#f1f5f9',
                    border: `1px solid ${reproductiveApplicable ? '#fbcfe8' : '#e2e8f0'}`,
                    borderRadius: 20,
                    padding: '4px 12px',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={reproductiveApplicable}
                    onChange={(e) => setReproductiveApplicable(e.target.checked)}
                    style={{ accentColor: '#db2777', width: 14, height: 14, cursor: 'pointer' }}
                  />
                  <span>Applicable to Patient</span>
                </label>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: -4 }}>
                Standard gynecological, menstrual, and obstetric assessment for female patients or clinical relevance.
              </div>
            </div>

            {!reproductiveApplicable ? (
              <div
                style={{
                  padding: '36px 20px',
                  textAlign: 'center',
                  backgroundColor: '#f8fafc',
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: 12,
                  color: '#64748b',
                }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#f1f5f9', color: '#94a3b8', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                  <Baby size={22} />
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 650, color: '#334155' }}>
                  Reproductive &amp; obstetric history marked as <strong>Not Applicable</strong> for this patient.
                </div>
                <div style={{ fontSize: 11.5, color: '#94a3b8', marginTop: 4 }}>
                  Check &quot;Applicable to Patient&quot; above to enable recording, or click &quot;Save &amp; Next&quot; to proceed to Lifestyle History.
                </div>
              </div>
            ) : (
              <>
                {/* Menstrual & Menopause Profile */}
                <div className="patient-section-card">
                  <div className="patient-section-header">
                    <div className="patient-section-badge" style={{ background: '#fdf2f8', color: '#db2777', borderColor: '#fbcfe8' }}>
                      <Calendar size={14} />
                    </div>
                    <div className="patient-section-tag">Menstrual &amp; Menopause Profile</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: -4 }}>
                    Document menstrual regularity, cycle status, menarche onset, and menopausal transition.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 14 }}>
                    <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
                        Menstrual Status
                      </label>
                      <SearchableSelect
                        searchable={false}
                        options={MENSTRUAL_STATUS_OPTIONS}
                        value={menstrualStatus}
                        onChange={(val) => setMenstrualStatus(val)}
                        placeholder="Select menstrual status..."
                      />
                    </div>

                    <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
                        Age at First Menstruation (Menarche)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="number"
                          className="patient-form-input"
                          placeholder="e.g. 13"
                          value={menarcheAge}
                          onChange={(e) => setMenarcheAge(e.target.value)}
                          style={{ height: 34, fontSize: 12.5 }}
                        />
                        <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>years</span>
                      </div>
                    </div>

                    <div
                      style={{
                        padding: 12,
                        background: menstrualStatus === 'Menopause' ? '#fff1f2' : '#f8fafc',
                        borderRadius: 8,
                        border: `1px solid ${menstrualStatus === 'Menopause' ? '#fecdd3' : '#e2e8f0'}`,
                      }}
                    >
                      <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
                        Age at Menopause (if applicable)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="number"
                          className="patient-form-input"
                          placeholder={menstrualStatus === 'Menopause' ? 'e.g. 50' : 'Select Menopause status first'}
                          disabled={menstrualStatus !== 'Menopause'}
                          value={menopauseAge}
                          onChange={(e) => setMenopauseAge(e.target.value)}
                          style={{ height: 34, fontSize: 12.5, backgroundColor: menstrualStatus !== 'Menopause' ? '#f1f5f9' : '#ffffff' }}
                        />
                        <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>years</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Obstetric History & Parity Counts */}
                <div className="patient-section-card">
                  <div className="patient-section-header">
                    <div className="patient-section-badge" style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}>
                      <Baby size={14} />
                    </div>
                    <div className="patient-section-tag">Obstetric Profile &amp; Parity Counts (G · P · L · A · M)</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: -4 }}>
                    Standard clinical obstetric formula recording gravidity, parity, living children, miscarriages, and abortions.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                    {/* Gravida */}
                    <div style={{ padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                        Gravida (G)
                      </span>
                      <span style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 6 }}>Pregnancies</span>
                      <input
                        type="number"
                        className="patient-form-input"
                        placeholder="0"
                        value={pregnancies}
                        onChange={(e) => setPregnancies(e.target.value)}
                        style={{ height: 32, textAlign: 'center', fontWeight: 700, fontSize: 14 }}
                      />
                    </div>
                    {/* Para */}
                    <div style={{ padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                        Para (P)
                      </span>
                      <span style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 6 }}>Deliveries</span>
                      <input
                        type="number"
                        className="patient-form-input"
                        placeholder="0"
                        value={deliveries}
                        onChange={(e) => setDeliveries(e.target.value)}
                        style={{ height: 32, textAlign: 'center', fontWeight: 700, fontSize: 14 }}
                      />
                    </div>
                    {/* Living */}
                    <div style={{ padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                        Living (L)
                      </span>
                      <span style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 6 }}>Living Children</span>
                      <input
                        type="number"
                        className="patient-form-input"
                        placeholder="0"
                        value={livingChildren}
                        onChange={(e) => setLivingChildren(e.target.value)}
                        style={{ height: 32, textAlign: 'center', fontWeight: 700, fontSize: 14 }}
                      />
                    </div>
                    {/* Total Children */}
                    <div style={{ padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                        Children
                      </span>
                      <span style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 6 }}>Total Count</span>
                      <input
                        type="number"
                        className="patient-form-input"
                        placeholder="0"
                        value={childrenCount}
                        onChange={(e) => setChildrenCount(e.target.value)}
                        style={{ height: 32, textAlign: 'center', fontWeight: 700, fontSize: 14 }}
                      />
                    </div>
                    {/* Miscarriages */}
                    <div style={{ padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#d97706', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                        Miscarriages (M)
                      </span>
                      <span style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 6 }}>Losses &lt; 20 wks</span>
                      <input
                        type="number"
                        className="patient-form-input"
                        placeholder="0"
                        value={miscarriages}
                        onChange={(e) => setMiscarriages(e.target.value)}
                        style={{ height: 32, textAlign: 'center', fontWeight: 700, fontSize: 14 }}
                      />
                    </div>
                    {/* Abortions */}
                    <div style={{ padding: 10, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <span style={{ fontSize: 10.5, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>
                        Abortions (A)
                      </span>
                      <span style={{ fontSize: 10, color: '#64748b', display: 'block', marginBottom: 6 }}>Terminations</span>
                      <input
                        type="number"
                        className="patient-form-input"
                        placeholder="0"
                        value={abortions}
                        onChange={(e) => setAbortions(e.target.value)}
                        style={{ height: 32, textAlign: 'center', fontWeight: 700, fontSize: 14 }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12, marginTop: 4 }}>
                    <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: 11.5, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 4 }}>
                        Age at First Childbirth
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="number"
                          className="patient-form-input"
                          placeholder="e.g. 26"
                          value={firstChildbirthAge}
                          onChange={(e) => setFirstChildbirthAge(e.target.value)}
                          style={{ height: 32 }}
                        />
                        <span style={{ fontSize: 11.5, color: '#64748b', fontWeight: 600 }}>years</span>
                      </div>
                    </div>
                    <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: 11.5, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 4 }}>
                        Date of Last Childbirth
                      </label>
                      <input
                        type="date"
                        className="patient-form-input"
                        value={lastChildbirthDate}
                        onChange={(e) => setLastChildbirthDate(e.target.value)}
                        style={{ height: 32 }}
                      />
                    </div>
                  </div>
                </div>

                {/* Breastfeeding, Contraception, HRT */}
                <div className="patient-section-card">
                  <div className="patient-section-header">
                    <div className="patient-section-badge" style={{ background: '#eff6ff', color: '#2563eb', borderColor: '#dbeafe' }}>
                      <Pill size={14} />
                    </div>
                    <div className="patient-section-tag">
                      Lactation, Contraceptive &amp; Hormone Therapies
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: -4 }}>
                    Screen for hormonal exposure, contraceptive usage, breastfeeding history, and fertility interventions.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                    <div
                      style={{
                        padding: 12,
                        backgroundColor: breastfeedingHas === 'Yes' ? '#f0fdf4' : '#f8fafc',
                        borderRadius: 8,
                        border: `1px solid ${breastfeedingHas === 'Yes' ? '#86efac' : '#e2e8f0'}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12, fontWeight: 650, color: '#0f172a' }}>Breastfeeding History</span>
                        <SearchableSelect
                          size="sm"
                          width={130}
                          searchable={false}
                          options={YES_NO_NA_OPTIONS}
                          value={breastfeedingHas}
                          onChange={(val) => setBreastfeedingHas(val as 'Yes' | 'No' | 'Not Applicable')}
                        />
                      </div>
                      {breastfeedingHas === 'Yes' && (
                        <input
                          type="text"
                          className="patient-form-input"
                          placeholder="Duration (e.g. 12 months, exclusive 6 mos)"
                          value={breastfeedingDuration}
                          onChange={(e) => setBreastfeedingDuration(e.target.value)}
                          style={{ height: 32, fontSize: 11.5 }}
                        />
                      )}
                    </div>

                    <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: 11.5, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 4 }}>
                        Contraceptive Usage
                      </label>
                      <input
                        type="text"
                        className="patient-form-input"
                        placeholder="e.g. OCPs, IUCD (Copper-T), Barrier, None"
                        value={contraceptiveUsage}
                        onChange={(e) => setContraceptiveUsage(e.target.value)}
                        style={{ height: 32, fontSize: 11.5 }}
                      />
                    </div>

                    <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: 11.5, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 4 }}>
                        Hormone Replacement Therapy (HRT)
                      </label>
                      <input
                        type="text"
                        className="patient-form-input"
                        placeholder="e.g. Estrogen therapy, progesterone, duration"
                        value={hormoneTherapy}
                        onChange={(e) => setHormoneTherapy(e.target.value)}
                        style={{ height: 32, fontSize: 11.5 }}
                      />
                    </div>

                    <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: 11.5, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 4 }}>
                        Infertility Treatment History
                      </label>
                      <input
                        type="text"
                        className="patient-form-input"
                        placeholder="e.g. Ovulation induction, IUI, IVF, None"
                        value={infertilityTreatment}
                        onChange={(e) => setInfertilityTreatment(e.target.value)}
                        style={{ height: 32, fontSize: 11.5 }}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* TAB 5: LIFESTYLE HISTORY */}
        {activeTab === 'lifestyle' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Smoking & Tobacco */}
            <div className="patient-section-card">
              <div className="patient-section-header">
                <div className="patient-section-badge" style={{ background: '#fff7ed', color: '#ea580c', borderColor: '#fed7aa' }}>
                  <Cigarette size={14} />
                </div>
                <div className="patient-section-tag">Smoking &amp; Tobacco Usage</div>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: -4 }}>
                Screen for active or former tobacco, cigarette, and chewing nicotine habits.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
                    Smoking Status
                  </label>
                  <SearchableSelect
                    searchable={false}
                    options={SMOKING_STATUS_OPTIONS}
                    value={smokingStatus}
                    onChange={(val) => setSmokingStatus(val)}
                    placeholder="Select smoking status..."
                  />
                </div>

                <div
                  style={{
                    padding: 12,
                    background: smokingStatus === 'Never' ? '#f1f5f9' : '#f8fafc',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
                    Smoking Duration &amp; Pack Years
                  </label>
                  <input
                    type="text"
                    className="patient-form-input"
                    placeholder={smokingStatus === 'Never' ? 'Not Applicable (Never smoked)' : 'e.g. 5 pack-years, quit in 2021'}
                    disabled={smokingStatus === 'Never'}
                    value={smokingDuration}
                    onChange={(e) => setSmokingDuration(e.target.value)}
                    style={{ height: 34, fontSize: 12, backgroundColor: smokingStatus === 'Never' ? '#f1f5f9' : '#ffffff' }}
                  />
                </div>

                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
                    Tobacco Usage / Cigars / Bidi
                  </label>
                  <input
                    type="text"
                    className="patient-form-input"
                    placeholder="Details or None"
                    value={tobaccoUsage}
                    onChange={(e) => setTobaccoUsage(e.target.value)}
                    style={{ height: 34, fontSize: 12 }}
                  />
                </div>

                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
                    Chewing Tobacco / Gutkha / Pan Masala
                  </label>
                  <input
                    type="text"
                    className="patient-form-input"
                    placeholder="e.g. Occasional gutkha, None"
                    value={chewingTobacco}
                    onChange={(e) => setChewingTobacco(e.target.value)}
                    style={{ height: 34, fontSize: 12 }}
                  />
                </div>
              </div>
            </div>

            {/* Alcohol, Diet & Activity */}
            <div className="patient-section-card">
              <div className="patient-section-header">
                <div className="patient-section-badge" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
                  <Utensils size={14} />
                </div>
                <div className="patient-section-tag">Alcohol, Diet &amp; Physical Fitness</div>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: -4 }}>
                Evaluate nutrition profile, alcohol intake, physical exertion level, and sleep quality.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 12 }}>
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Wine size={13} style={{ color: '#7c3aed' }} />
                    Alcohol Consumption
                  </label>
                  <SearchableSelect
                    searchable={false}
                    options={ALCOHOL_OPTIONS}
                    value={alcoholConsumption}
                    onChange={(val) => setAlcoholConsumption(val)}
                    placeholder="Select alcohol consumption..."
                  />
                </div>

                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Utensils size={13} style={{ color: '#059669' }} />
                    Diet Type
                  </label>
                  <SearchableSelect
                    searchable={false}
                    options={DIET_OPTIONS}
                    value={dietType}
                    onChange={(val) => setDietType(val)}
                    placeholder="Select diet type..."
                  />
                </div>

                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Activity size={13} style={{ color: '#2563eb' }} />
                    Physical Activity Level
                  </label>
                  <SearchableSelect
                    searchable={false}
                    options={ACTIVITY_OPTIONS}
                    value={activityLevel}
                    onChange={(val) => setActivityLevel(val)}
                    placeholder="Select activity level..."
                  />
                </div>

                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Moon size={13} style={{ color: '#6366f1' }} />
                    Sleep Pattern &amp; Quality
                  </label>
                  <input
                    type="text"
                    className="patient-form-input"
                    placeholder="e.g. 7-8 hours, insomnia, snoring, normal"
                    value={sleepPattern}
                    onChange={(e) => setSleepPattern(e.target.value)}
                    style={{ height: 34, fontSize: 12 }}
                  />
                </div>
              </div>
            </div>

            {/* Occupational Exposure & Other Habits */}
            <div className="patient-section-card">
              <div className="patient-section-header">
                <div className="patient-section-badge" style={{ background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1' }}>
                  <Briefcase size={14} />
                </div>
                <div className="patient-section-tag">Occupational Environment &amp; Lifestyle Habits</div>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: -4 }}>
                Document workplace environmental risks, ergonomic hazards, and leisure or wellness habits.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
                    Occupational Exposure &amp; Working Environment
                  </label>
                  <textarea
                    className="patient-form-input"
                    rows={3}
                    placeholder="e.g. Dust, chemicals, asbestos, prolonged sitting, night shifts..."
                    value={occupationalExposure}
                    onChange={(e) => setOccupationalExposure(e.target.value)}
                    style={{ width: '100%', fontSize: 12 }}
                  />
                </div>

                <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
                    Other Habits, Hobbies &amp; Wellness Routines
                  </label>
                  <textarea
                    className="patient-form-input"
                    rows={3}
                    placeholder="e.g. High caffeine intake, sports, meditation, travel..."
                    value={otherHabits}
                    onChange={(e) => setOtherHabits(e.target.value)}
                    style={{ width: '100%', fontSize: 12 }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: MEDICAL DOCUMENTS & REPORTS */}
        {activeTab === 'documents' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Upload Box */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14, backgroundColor: '#f8fafc' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Upload size={16} style={{ color: '#2563eb' }} />
                <span>Upload &amp; Attach Medical Documents</span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
                Attach lab reports, previous discharge summaries, scan reports, x-rays, or prescriptions directly to this consultation.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 10 }}>
                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 5 }}>
                    Document Category <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <SearchableSelect
                    searchable={true}
                    searchPlaceholder="Search category..."
                    options={DOCUMENT_TYPE_OPTIONS}
                    value={docType}
                    onChange={(val) => setDocType(val as MedicalDocumentType)}
                    placeholder="Select document category..."
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 3 }}>
                    Document Title / Test Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="patient-form-input"
                    placeholder="e.g. Complete Blood Count (CBC) Report"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 3 }}>
                    Document Date
                  </label>
                  <input
                    type="date"
                    className="patient-form-input"
                    value={docDate}
                    onChange={(e) => setDocDate(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: '#334155', display: 'block', marginBottom: 3 }}>
                  Clinical Notes / Key Findings
                </label>
                <input
                  type="text"
                  className="patient-form-input"
                  placeholder="e.g. Normal values, mild anemia, follow up in 2 weeks..."
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                />
              </div>

              {/* File Dropzone */}
              <div
                style={{
                  border: '1.5px dashed #cbd5e1',
                  borderRadius: 8,
                  padding: '16px',
                  textAlign: 'center',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  marginBottom: 12,
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setDocFile(f);
                      if (!docTitle) {
                        const clean = f.name.replace(/\.[^/.]+$/, '').replace(/[_.-]+/g, ' ');
                        setDocTitle(clean);
                      }
                    }
                  }}
                  accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                />
                {docFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                    <FileText size={20} style={{ color: '#2563eb' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{docFile.name}</span>
                    <span style={{ fontSize: 11, color: '#64748b' }}>({(docFile.size / 1024).toFixed(1)} KB)</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDocFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 2 }}
                    >
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <FileUp size={24} style={{ color: '#94a3b8', margin: '0 auto 6px' }} />
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                      Click or drag file here to attach
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      Supports PDF, PNG, JPG, WEBP, DOCX (up to 25MB)
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  type="primary"
                  onClick={handleUploadDocumentInline}
                  loading={uploadingDoc}
                  disabled={!docFile || !docTitle.trim()}
                  icon={<Upload size={14} />}
                  style={{ backgroundColor: '#2563eb', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  Upload &amp; Attach Document
                </Button>
              </div>
            </div>

            {/* Attached Documents List */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Attached Documents &amp; Reports ({attachedDocuments.length})</span>
                <span style={{ fontSize: 11, color: '#64748b' }}>Patient Archive</span>
              </div>

              {attachedDocuments.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: 12, backgroundColor: '#f8fafc', borderRadius: 6 }}>
                  No medical documents attached yet. Use the upload box above to attach reports.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {attachedDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: 6,
                            backgroundColor: '#eff6ff',
                            color: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <FileText size={16} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 650, color: '#0f172a' }}>{doc.title}</div>
                          <div style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <Tag color="blue" style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>
                              {doc.document_type}
                            </Tag>
                            {doc.document_date && <span>· {doc.document_date}</span>}
                            {doc.file_name && <span>· {doc.file_name}</span>}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Button
                          size="small"
                          type="text"
                          icon={<Eye size={13} />}
                          onClick={() => window.open(getAuthenticatedFileUrl(doc.file_url, false), '_blank')}
                        >
                          View
                        </Button>
                        <Button
                          size="small"
                          type="text"
                          icon={<Download size={13} />}
                          onClick={() => window.open(getAuthenticatedFileUrl(doc.file_url, true), '_blank')}
                        >
                          Download
                        </Button>
                        <Popconfirm
                          title="Delete Document"
                          description="Are you sure you want to remove this attached report?"
                          onConfirm={() => handleDeleteDocumentInline(doc.id)}
                          okText="Delete"
                          okButtonProps={{ danger: true }}
                        >
                          <Button size="small" type="text" danger icon={<Trash2 size={13} />} />
                        </Popconfirm>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Pinned Bottom Actions Footer */}
      {!hideFooter && (
        <div className="patient-drawer-footer clinical-history-footer">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="patient-footer-btn patient-footer-btn-cancel"
            >
              Cancel
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
              <span style={{ fontWeight: 600, color: '#0f172a' }}>
                Step {currentIndex + 2} of 7
              </span>
              <span style={{ color: '#cbd5e1' }}>•</span>
              <span>{STEPS[currentIndex]?.shortLabel || 'Clinical Section'}</span>
              {savedHistoryId && (
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: 11,
                    color: '#475569',
                    backgroundColor: '#f1f5f9',
                    padding: '2px 6px',
                    borderRadius: 4,
                    border: '1px solid #e2e8f0',
                    marginLeft: 4,
                  }}
                >
                  ID: {savedHistoryId.slice(0, 8)}…
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(currentIndex > 0 || onPreviousToPersonal) && (
              <button
                data-testid="prev-step-btn"
                type="button"
                onClick={handlePrevious}
                disabled={saving}
                className="patient-footer-btn patient-footer-btn-neutral"
                title="Return to previous section"
              >
                <ChevronLeft size={15} />
                <span>Previous</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleSaveAndClose(false)}
              disabled={saving}
              className="patient-footer-btn patient-footer-btn-secondary"
              title="Save current progress and close drawer"
            >
              <span>{saving && saveAction === 'close' ? 'Saving…' : 'Save & Close'}</span>
            </button>

            {currentIndex < STEPS.length - 1 ? (
              <>
                <button
                  data-testid="next-step-btn"
                  type="button"
                  onClick={handleNextWithoutSave}
                  disabled={saving}
                  className="patient-footer-btn patient-footer-btn-neutral"
                  title="Proceed to next section without saving"
                >
                  <span>Next</span>
                  <ChevronRight size={15} />
                </button>

                <button
                  data-testid="save-and-next-btn"
                  type="button"
                  onClick={handleSaveAndNext}
                  disabled={saving}
                  className="patient-footer-btn patient-footer-btn-primary"
                  title="Save medical history and proceed to next section"
                >
                  <span>{saving && saveAction === 'next' ? 'Saving…' : 'Save & Next'}</span>
                  <ChevronRight size={15} />
                </button>
              </>
            ) : (
              <button
                data-testid="finish-complete-btn"
                type="button"
                onClick={() => handleSaveAndClose(true)}
                disabled={saving}
                className="patient-footer-btn patient-footer-btn-success"
                title="Complete and finish recording all medical history"
              >
                <Check size={16} />
                <span>{saving ? 'Completing…' : 'Finish & Complete'}</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default ClinicalHistorySectionContent;
