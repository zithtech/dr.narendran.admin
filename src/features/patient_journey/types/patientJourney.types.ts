export type PatientJourneyStep =
  | 'basic'
  | 'history'
  | 'plan'
  | 'prescription'
  | 'appointment';

export interface PlanOfManagementData {
  provisionalDiagnosis: string;
  differentialDiagnosis?: string | undefined;
  investigationsOrdered: string[];
  customInvestigations?: string | undefined;
  clinicalObservations?: string | undefined;
  performanceScore?: number | null | undefined;
  performanceDescription?: string | undefined;
  treatmentStrategy: string;
  careGoals?: string | undefined;
  recommendedFollowUpDays?: number | undefined;
  dietaryAdvice?: string | undefined;
  notes?: string | undefined;
}

export interface PatientJourneyStepDef {
  key: PatientJourneyStep;
  stepNum: number;
  label: string;
  shortLabel: string;
  description: string;
  iconName: string;
}

export const PATIENT_JOURNEY_STEPS: PatientJourneyStepDef[] = [
  {
    key: 'basic',
    stepNum: 1,
    label: '1. Basic Details',
    shortLabel: 'Registration',
    description: 'Patient identity, contact, address & base vitals',
    iconName: 'User',
  },
  {
    key: 'history',
    stepNum: 2,
    label: '2. Past Medical History',
    shortLabel: 'Medical History',
    description: 'Diseases, surgeries, allergies, family & lifestyle',
    iconName: 'History',
  },
  {
    key: 'plan',
    stepNum: 3,
    label: '3. Plan of Management',
    shortLabel: 'Care Plan',
    description: 'Doctor diagnosis, investigations & treatment strategy',
    iconName: 'Stethoscope',
  },
  {
    key: 'prescription',
    stepNum: 4,
    label: '4. Prescription',
    shortLabel: 'Prescription',
    description: 'Medicines, dosage, frequency & duration',
    iconName: 'Pill',
  },
  {
    key: 'appointment',
    stepNum: 5,
    label: '5. Appointments',
    shortLabel: 'Follow-up',
    description: 'Schedule consultations & review visits',
    iconName: 'Calendar',
  },
];
