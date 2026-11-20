import { App, Drawer, Tag } from 'antd';
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  HeartPulse,
  Pill,
  Plus,
  Sparkles,
  Stethoscope,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import type { Patient } from '../../../components/PatientModal';
import ScheduleAppointmentModal from '../../../components/ScheduleAppointmentModal';
import { formatPatientAge, formatPatientDisplayName } from '../../../lib/format';
import { ClinicalHistorySectionContent } from '../../medical_history/components/ClinicalHistorySectionContent';
import { medicalHistoryApi } from '../../medical_history/services/medicalHistoryApi';
import type { Prescription } from '../../prescriptions/api/prescriptionsApi';
import CreatePrescriptionModal from '../../prescriptions/components/CreatePrescriptionModal';
import {
  PATIENT_JOURNEY_STEPS,
  type PatientJourneyStep,
  type PlanOfManagementData,
} from '../types/patientJourney.types';
import { BasicDetailsStep } from './BasicDetailsStep';
import { PlanOfManagementStep } from './PlanOfManagementStep';

export interface PatientJourneyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialPatient?: Patient | null;
  initialStep?: PatientJourneyStep;
  onJourneyComplete?: (patient: Patient) => void;
}

export function PatientJourneyDrawer({
  isOpen,
  onClose,
  initialPatient = null,
  initialStep = 'basic',
  onJourneyComplete,
}: PatientJourneyDrawerProps) {
  const { message } = App.useApp();

  const [activeStep, setActiveStep] = useState<PatientJourneyStep>(
    initialPatient ? (initialStep === 'basic' ? 'history' : initialStep) : 'basic',
  );
  const [patient, setPatient] = useState<Patient | null>(initialPatient);

  // Management Plan State
  const [managementPlan, setManagementPlan] = useState<PlanOfManagementData | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);

  // Sub-modal triggers
  const [isRxModalOpen, setIsRxModalOpen] = useState(false);
  const [isApptModalOpen, setIsApptModalOpen] = useState(false);

  // Created assets in this session
  const [createdPrescription, setCreatedPrescription] = useState<Prescription | null>(null);
  const [appointmentScheduled, setAppointmentScheduled] = useState(false);

  useEffect(() => {
    if (initialPatient) {
      setPatient(initialPatient);
      // If patient already exists, allow starting at requested step or past medical history
      if (initialStep && initialStep !== 'basic') {
        setActiveStep(initialStep);
      } else {
        setActiveStep('history');
      }
    } else {
      setPatient(null);
      setActiveStep('basic');
    }
  }, [initialPatient, initialStep, isOpen]);

  // Load existing plan of management if available from latest history
  useEffect(() => {
    if (patient?.id && isOpen) {
      void (async () => {
        try {
          const latest = await medicalHistoryApi.getLatestHistory(patient.id);
          if (latest?.current_medical_info) {
            const cmi = latest.current_medical_info;
            const rawTests = cmi.investigations_ordered;
            const tests = Array.isArray(rawTests)
              ? rawTests
              : typeof rawTests === 'string'
                ? rawTests.split(',').map((s) => s.trim())
                : [];

            const planData: PlanOfManagementData = {
              provisionalDiagnosis: cmi.current_diagnosis || '',
              investigationsOrdered: tests,
              treatmentStrategy: cmi.treatment_strategy || '',
            };
            if (cmi.differential_diagnosis) {
              planData.differentialDiagnosis = cmi.differential_diagnosis;
            }
            if (cmi.clinical_observations) {
              planData.clinicalObservations = cmi.clinical_observations;
            }
            if (cmi.care_goals) {
              planData.careGoals = cmi.care_goals;
            }
            setManagementPlan(planData);
          }
        } catch {
          // Ignored
        }
      })();
    }
  }, [patient?.id, isOpen]);

  // Handlers
  const handleBasicDetailsSaved = (savedPatient: Patient) => {
    setPatient(savedPatient);
    setActiveStep('history');
  };

  const handlePlanSaved = async (plan: PlanOfManagementData) => {
    if (!patient?.id) return;
    setSavingPlan(true);
    try {
      setManagementPlan(plan);

      // Save into latest medical history
      const latest = await medicalHistoryApi.getLatestHistory(patient.id);
      const payload = {
        current_medical_info: {
          ...(latest?.current_medical_info || {}),
          current_diagnosis: plan.provisionalDiagnosis,
          differential_diagnosis: plan.differentialDiagnosis || null,
          clinical_observations: plan.clinicalObservations || null,
          investigations_ordered: plan.investigationsOrdered,
          treatment_strategy: plan.treatmentStrategy,
          care_goals: plan.careGoals || null,
        },
      };

      if (latest?.previous_medical_history) {
        (payload as any).previous_medical_history = latest.previous_medical_history;
      }
      if (latest?.family_medical_history) {
        (payload as any).family_medical_history = latest.family_medical_history;
      }
      if (latest?.reproductive_history) {
        (payload as any).reproductive_history = latest.reproductive_history;
      }
      if (latest?.lifestyle_history) {
        (payload as any).lifestyle_history = latest.lifestyle_history;
      }

      if (latest?.id) {
        await medicalHistoryApi.updateHistory(patient.id, latest.id, payload);
      } else {
        await medicalHistoryApi.createHistory(patient.id, payload);
      }

      message.success('Plan of Management saved successfully!');
      setActiveStep('prescription');
    } catch {
      message.error('Failed to save care plan. Please try again.');
    } finally {
      setSavingPlan(false);
    }
  };

  const handlePrescriptionSuccess = (rx: Prescription) => {
    setCreatedPrescription(rx);
    setIsRxModalOpen(false);
    message.success('Prescription generated successfully!');
  };

  const handleAppointmentSuccess = () => {
    setAppointmentScheduled(true);
    setIsApptModalOpen(false);
    message.success('Follow-up consultation booked successfully!');
  };

  const handleFinishJourney = () => {
    message.success('Patient Journey completed successfully!');
    if (patient && onJourneyComplete) {
      onJourneyComplete(patient);
    }
    onClose();
  };

  return (
    <Drawer
      open={isOpen}
      onClose={onClose}
      destroyOnClose
      width={1120}
      title={null}
      footer={null}
      styles={{
        body: {
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          backgroundColor: '#f8fafc',
        },
      }}
    >
      {/* ══════════════ 1. TOP JOURNEY HEADER ══════════════ */}
      <div
        style={{
          padding: '16px 24px',
          background: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
              border: '1px solid #bfdbfe',
              color: '#2563eb',
              display: 'grid',
              placeItems: 'center',
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.16)',
            }}
          >
            <HeartPulse size={20} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Complete Patient Journey
              </span>
              <Tag color="blue" style={{ fontSize: 11, fontWeight: 650, borderRadius: 9999 }}>
                5-Stage Care Flow
              </Tag>
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              Unified clinical pathway: Registration · Past History · Plan of Management · Prescription · Follow-up
            </div>
          </div>
        </div>

        {patient && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 14px',
              borderRadius: 8,
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
            }}
          >
            <User size={14} style={{ color: '#2563eb' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{formatPatientDisplayName(patient.name, patient.patient_id)}</span>
            {patient.gender && (
              <Tag color="geekblue" style={{ margin: 0, fontSize: 10.5 }}>
                {patient.gender}
              </Tag>
            )}
            {patient.date_of_birth && (
              <Tag color="default" style={{ margin: 0, fontSize: 10.5 }}>
                {formatPatientAge(patient.date_of_birth)}
              </Tag>
            )}
          </div>
        )}
      </div>

      {/* ══════════════ 2. INTERACTIVE 5-STEP STEPPER BAR ══════════════ */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '10px 24px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          overflowX: 'auto',
          flexShrink: 0,
        }}
      >
        {PATIENT_JOURNEY_STEPS.map((step) => {
          const isActive = activeStep === step.key;
          const isAccessible = Boolean(patient?.id) || step.key === 'basic';
          return (
            <button
              key={step.key}
              type="button"
              disabled={!isAccessible}
              onClick={() => setActiveStep(step.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 12px',
                borderRadius: 8,
                border: isActive ? '1px solid #2563eb' : '1px solid #e2e8f0',
                backgroundColor: isActive ? '#eff6ff' : isAccessible ? '#ffffff' : '#f1f5f9',
                color: isActive ? '#1d4ed8' : isAccessible ? '#334155' : '#94a3b8',
                fontSize: 12.5,
                fontWeight: isActive ? 700 : 500,
                cursor: isAccessible ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
                boxShadow: isActive ? '0 1px 3px rgba(37, 99, 235, 0.12)' : 'none',
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 9999,
                  background: isActive ? '#2563eb' : '#e2e8f0',
                  color: isActive ? '#ffffff' : '#475569',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {step.stepNum}
              </div>
              <span>{step.label}</span>
            </button>
          );
        })}
      </div>

      {/* ══════════════ 3. SCROLLABLE CONTENT BODY ══════════════ */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: '#f8fafc' }}>
        {/* STAGE 1: BASIC DETAILS */}
        {activeStep === 'basic' && (
          <BasicDetailsStep
            initialPatient={patient}
            onSaveSuccess={handleBasicDetailsSaved}
          />
        )}

        {/* STAGE 2: PAST MEDICAL HISTORY */}
        {activeStep === 'history' && patient && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 24px',
                background: '#eff6ff',
                borderBottom: '1px solid #bfdbfe',
              }}
            >
              <span style={{ fontSize: 12.5, fontWeight: 650, color: '#1e40af' }}>
                Stage 2 of 5: Document past medical conditions, surgeries, allergies, family history, and lifestyle habits.
              </span>
              <button
                type="button"
                onClick={() => setActiveStep('plan')}
                className="patient-footer-btn patient-footer-btn-primary"
                style={{ padding: '4px 12px', fontSize: 12 }}
              >
                <span>Continue to Plan of Management</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <ClinicalHistorySectionContent
              isOpen={isOpen}
              patientId={patient.id}
              patientName={formatPatientDisplayName(patient.name, patient.patient_id)}
              patientGender={patient.gender}
              patientAge={patient.date_of_birth ? formatPatientAge(patient.date_of_birth) : undefined}
              patientBloodGroup={patient.blood_group || undefined}
              hideStepperHeader={false}
              onClose={onClose}
              onSuccess={() => {}}
              onFinish={() => setActiveStep('plan')}
              onPreviousToPersonal={() => setActiveStep('basic')}
            />
          </div>
        )}

        {/* STAGE 3: PLAN OF MANAGEMENT */}
        {activeStep === 'plan' && patient && (
          <PlanOfManagementStep
            initialData={managementPlan || undefined}
            patientName={formatPatientDisplayName(patient.name, patient.patient_id)}
            patientAge={patient.date_of_birth ? formatPatientAge(patient.date_of_birth) : undefined}
            patientGender={patient.gender}
            onSave={handlePlanSaved}
            onPrevious={() => setActiveStep('history')}
            saving={savingPlan}
          />
        )}

        {/* STAGE 4: PRESCRIPTION */}
        {activeStep === 'prescription' && patient && (
          <div style={{ padding: '24px 28px', maxWidth: 1040, margin: '0 auto' }}>
            {/* Context Summary Banner */}
            <div
              style={{
                padding: '16px 20px',
                background: '#ffffff',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                marginBottom: 20,
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Stethoscope size={16} style={{ color: '#2563eb' }} />
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                    Active Clinical Assessment (From Plan of Management)
                  </span>
                </div>
                {managementPlan?.provisionalDiagnosis && (
                  <Tag color="geekblue" style={{ fontSize: 12, padding: '2px 8px', margin: 0 }}>
                    {managementPlan.provisionalDiagnosis}
                  </Tag>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                <div style={{ fontSize: 12.5, color: '#334155' }}>
                  <span style={{ fontWeight: 650, color: '#64748b' }}>Primary Diagnosis: </span>
                  {managementPlan?.provisionalDiagnosis || 'General Clinical Consultation'}
                </div>
                <div style={{ fontSize: 12.5, color: '#334155' }}>
                  <span style={{ fontWeight: 650, color: '#64748b' }}>Ordered Investigations: </span>
                  {managementPlan?.investigationsOrdered?.length ? (
                    <span>{managementPlan.investigationsOrdered.join(', ')}</span>
                  ) : (
                    <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>None specified</span>
                  )}
                </div>
              </div>
            </div>

            {/* Prescription Creation & Status Card */}
            <div
              style={{
                background: '#ffffff',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                padding: '24px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 12,
                  background: '#eff6ff',
                  color: '#2563eb',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 14px',
                  border: '1px solid #bfdbfe',
                }}
              >
                <Pill size={24} />
              </div>

              <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                {createdPrescription ? 'Prescription Generated & On File' : 'Prescribe Medications & Regimen'}
              </h3>
              <p style={{ margin: '0 auto 18px', fontSize: 13, color: '#64748b', maxWidth: 480 }}>
                {createdPrescription
                  ? 'Medications and diagnostic test recommendations have been recorded and formatted for clinic dispensing.'
                  : 'Launch the integrated prescription writer to add medications, dosages, frequency, durations, and food instructions.'}
              </p>

              {createdPrescription ? (
                <div
                  style={{
                    display: 'inline-flex',
                    flexDirection: 'column',
                    gap: 8,
                    textAlign: 'left',
                    padding: '14px 18px',
                    background: '#f8fafc',
                    borderRadius: 8,
                    border: '1px solid #e2e8f0',
                    marginBottom: 18,
                  }}
                >
                  <div style={{ fontSize: 12.5, color: '#0f172a', fontWeight: 650 }}>
                    Prescription ID: #{createdPrescription.id.slice(0, 8)}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    Diagnosis: {createdPrescription.diagnosis || managementPlan?.provisionalDiagnosis || 'Clinical Care'}
                  </div>
                  {createdPrescription.follow_up_days && (
                    <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 600 }}>
                      Recommended Follow-up: after {createdPrescription.follow_up_days} days
                    </div>
                  )}
                </div>
              ) : null}

              <div>
                <button
                  type="button"
                  onClick={() => setIsRxModalOpen(true)}
                  className="patient-footer-btn patient-footer-btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    padding: '0 22px',
                    height: 40,
                    fontSize: 13,
                    boxShadow: '0 2px 8px rgba(37, 99, 235, 0.28)',
                  }}
                >
                  <Plus size={16} />
                  <span>{createdPrescription ? 'Edit / Modify Prescription' : 'Write Clinical Prescription'}</span>
                </button>
              </div>
            </div>

            {/* Footer Navigation */}
            <div
              className="patient-drawer-footer"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 24,
                paddingTop: 16,
                borderTop: '1px solid #e2e8f0',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveStep('plan')}
                className="patient-footer-btn patient-footer-btn-secondary"
              >
                <ChevronLeft size={15} />
                <span>Previous: Plan of Management</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveStep('appointment')}
                className="patient-footer-btn patient-footer-btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                }}
              >
                <span>Next: Schedule Follow-up Appointment</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* STAGE 5: APPOINTMENTS */}
        {activeStep === 'appointment' && patient && (
          <div style={{ padding: '24px 28px', maxWidth: 1040, margin: '0 auto' }}>
            <div
              style={{
                background: '#ffffff',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                padding: '24px',
                textAlign: 'center',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 12,
                  background: '#f0fdf4',
                  color: '#16a34a',
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto 14px',
                  border: '1px solid #bbf7d0',
                }}
              >
                <Calendar size={24} />
              </div>

              <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                {appointmentScheduled ? 'Follow-up Consultation Booked' : 'Schedule Review & Follow-up Visit'}
              </h3>
              <p style={{ margin: '0 auto 18px', fontSize: 13, color: '#64748b', maxWidth: 480 }}>
                {appointmentScheduled
                  ? 'A follow-up consultation appointment has been scheduled and linked to the patient record.'
                  : 'Ensure continuity of care by locking in the next review date, doctor slot, and appointment reminders.'}
              </p>

              <div>
                <button
                  type="button"
                  onClick={() => setIsApptModalOpen(true)}
                  className="patient-footer-btn patient-footer-btn-primary"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                    color: '#ffffff',
                    padding: '0 22px',
                    height: 40,
                    fontSize: 13,
                    boxShadow: '0 2px 8px rgba(22, 163, 74, 0.28)',
                  }}
                >
                  <Plus size={16} />
                  <span>{appointmentScheduled ? 'Book Another Slot' : 'Schedule Follow-up Appointment'}</span>
                </button>
              </div>
            </div>

            {/* Journey Summary & Finish */}
            <div
              style={{
                background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)',
                borderRadius: 8,
                border: '1px solid #bfdbfe',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <Sparkles size={18} style={{ color: '#2563eb' }} />
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1e3a8a' }}>
                  Patient Journey Milestone Checklist
                </h4>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#1e293b' }}>
                  <Check size={14} style={{ color: '#16a34a' }} />
                  <span>1. Basic Registration Completed</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#1e293b' }}>
                  <Check size={14} style={{ color: '#16a34a' }} />
                  <span>2. Clinical History Profile Recorded</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#1e293b' }}>
                  <Check size={14} style={{ color: '#16a34a' }} />
                  <span>3. Plan of Management Documented</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#1e293b' }}>
                  <Check size={14} style={{ color: createdPrescription ? '#16a34a' : '#94a3b8' }} />
                  <span>4. Clinical Prescription Formulated</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#1e293b' }}>
                  <Check size={14} style={{ color: appointmentScheduled ? '#16a34a' : '#94a3b8' }} />
                  <span>5. Review Consultation Scheduled</span>
                </div>
              </div>
            </div>

            {/* Footer Navigation */}
            <div
              className="patient-drawer-footer"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 24,
                paddingTop: 16,
                borderTop: '1px solid #e2e8f0',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveStep('prescription')}
                className="patient-footer-btn patient-footer-btn-secondary"
              >
                <ChevronLeft size={15} />
                <span>Previous: Prescription</span>
              </button>

              <button
                type="button"
                onClick={handleFinishJourney}
                className="patient-footer-btn patient-footer-btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(22, 163, 74, 0.28)',
                  padding: '0 24px',
                  fontWeight: 700,
                }}
              >
                <Check size={16} />
                <span>Complete Patient Journey</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ══════════════ SUB-MODAL 1: PRESCRIPTION MODAL ══════════════ */}
      {patient && (
        <CreatePrescriptionModal
          open={isRxModalOpen}
          onClose={() => setIsRxModalOpen(false)}
          onSuccess={handlePrescriptionSuccess}
          preselectedPatient={{
            id: patient.id,
            name: formatPatientDisplayName(patient.name, patient.patient_id),
            phone: patient.phone || undefined,
            gender: patient.gender || undefined,
            date_of_birth: patient.date_of_birth || undefined,
          }}
          initialDiagnosis={managementPlan?.provisionalDiagnosis}
          initialLabTests={managementPlan?.investigationsOrdered}
        />
      )}

      {/* ══════════════ SUB-MODAL 2: APPOINTMENT MODAL ══════════════ */}
      {patient && (
        <ScheduleAppointmentModal
          isOpen={isApptModalOpen}
          onClose={() => setIsApptModalOpen(false)}
          onSuccess={handleAppointmentSuccess}
          preselectedPatientId={patient.id}
        />
      )}
    </Drawer>
  );
}

export default PatientJourneyDrawer;
