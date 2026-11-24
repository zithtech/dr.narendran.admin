import { Button, Select, Spin, Tag, Tooltip } from 'antd';
import {
  Check,
  FileSearch,
  FlaskConical,
  Gauge,
  HeartPulse,
  Pencil,
  Plus,
  Printer,
  Stethoscope,
  Target,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { Patient } from '../../../components/PatientModal';
import { formatDate, formatPatientAge, timeAgo } from '../../../lib/format';
import {
  COMMON_INVESTIGATIONS,
  PERFORMANCE_SCALE_GUIDELINES,
} from '../../patient_journey/components/PlanOfManagementStep';
import { medicalHistoryApi } from '../services/medicalHistoryApi';
import type { PatientMedicalHistoryRecord } from '../types/medicalHistory.types';
import { RecordMedicalHistoryDrawer } from './RecordMedicalHistoryDrawer';
import { PatientSummaryPdfModal } from './PatientSummaryPdfModal';

interface PatientCurrentPlanTabProps {
  patient: Patient;
  isEditable?: boolean;
}

export function PatientCurrentPlanTab({
  patient,
  isEditable = true,
}: PatientCurrentPlanTabProps) {
  const [histories, setHistories] = useState<PatientMedicalHistoryRecord[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Drawer state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const fetchHistories = async () => {
    try {
      setLoading(true);
      const data = await medicalHistoryApi.getHistories(patient.id);
      setHistories(data);
      if (data.length > 0 && data[0]) {
        setSelectedHistoryId((prev) => (prev && data.some((h) => h.id === prev) ? prev : data[0]!.id));
      } else {
        setSelectedHistoryId('');
      }
    } catch (err: any) {
      console.error('Failed to load patient histories for current plan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistories();
  }, [patient.id]);

  const currentRecord = useMemo(() => {
    if (!selectedHistoryId || histories.length === 0) return null;
    return histories.find((h) => h.id === selectedHistoryId) || histories[0];
  }, [selectedHistoryId, histories]);

  const orderedTests = useMemo(() => {
    const raw = currentRecord?.current_medical_info?.investigations_ordered;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      return raw.split('\n').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }, [currentRecord?.current_medical_info?.investigations_ordered]);

  const perfScore =
    currentRecord?.current_medical_info?.performance_score !== undefined &&
    currentRecord?.current_medical_info?.performance_score !== null &&
    currentRecord?.current_medical_info?.performance_score !== ''
      ? Number(currentRecord.current_medical_info.performance_score)
      : null;

  return (
    <div className="patient-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* ── Top Bar: Historical Record Selector & Actions ── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          padding: '12px 16px',
          backgroundColor: '#ffffff',
          borderRadius: 8,
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          {histories.length > 0 ? (
            <Select
              value={selectedHistoryId}
              onChange={(val) => setSelectedHistoryId(val)}
              style={{ minWidth: 260 }}
              options={histories.map((h, i) => ({
                value: h.id,
                label: `${formatDate(h.recorded_date)} · ${h.recorded_by_name || 'Attending'} ${i === 0 ? '(Latest)' : ''}`,
              }))}
            />
          ) : (
            <span style={{ fontSize: 12.5, color: '#94a3b8', fontStyle: 'italic' }}>
              No clinical records recorded yet.
            </span>
          )}

          {currentRecord && (
            <span style={{ fontSize: 11.5, color: '#64748b' }}>
              Last modified {timeAgo(currentRecord.updated_at || currentRecord.created_at)}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            icon={<Printer size={14} />}
            onClick={() => setIsPdfModalOpen(true)}
            style={{
              fontWeight: 600,
              fontSize: 12.5,
              borderColor: '#c4b5fd',
              color: '#67358f',
              background: '#fdf4ff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Export Clinical PDF
          </Button>

          {isEditable && (
            <Tooltip title="Record New Assessment">
              <Button
                type="primary"
                size="middle"
                icon={<Plus size={15} />}
                onClick={() => {
                  setIsEditMode(false);
                  setIsRecordModalOpen(true);
                }}
                style={{ backgroundColor: '#2563eb' }}
                aria-label="Record New Assessment"
              >
                <span className="sr-only">Record New Assessment</span>
              </Button>
            </Tooltip>
          )}

          {isEditable && currentRecord && (
            <Tooltip title="Edit This Record">
              <Button
                size="middle"
                icon={<Pencil size={14} />}
                onClick={() => {
                  setIsEditMode(true);
                  setIsRecordModalOpen(true);
                }}
                aria-label="Edit This Record"
              >
                <span className="sr-only">Edit This Record</span>
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 10, fontSize: 13, color: '#64748b' }}>Loading clinical information...</div>
        </div>
      ) : (
        <>
          {/* ══════════════ CURRENT MEDICAL INFORMATION & CLINICAL EXAMINATION ══════════════ */}
          <div className="patient-card-block">
            <div className="patient-card-block-header">
              <div className="patient-card-block-badge">
                <HeartPulse size={15} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="patient-card-block-title">Current Medical Information &amp; Clinical Examination</div>
                <div className="patient-card-block-subtitle">
                  Present complaints, symptoms, pain score assessment, and clinical observations
                </div>
              </div>
            </div>

            {/* Complaints, Symptoms, Pain level & Clinical observations */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <span className="patient-info-label">Chief Complaint &amp; Duration</span>
                <div style={{ fontWeight: 650, fontSize: 13.5, color: '#0f172a', marginTop: 2 }}>
                  {currentRecord?.current_medical_info?.chief_complaint || 'No acute chief complaint noted.'}
                </div>
                {currentRecord?.current_medical_info?.duration_of_symptoms && (
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                    Duration: {currentRecord.current_medical_info.duration_of_symptoms}
                  </div>
                )}
                {currentRecord?.current_medical_info?.current_symptoms && (
                  <div style={{ fontSize: 12.5, color: '#334155', marginTop: 6 }}>
                    Symptoms: {currentRecord.current_medical_info.current_symptoms}
                  </div>
                )}
              </div>

              <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span className="patient-info-label">Pain Level Scale (0–10)</span>
                  <Tag color={Number(currentRecord?.current_medical_info?.pain_level) > 5 ? 'red' : 'blue'}>
                    Level {currentRecord?.current_medical_info?.pain_level ?? 0} / 10
                  </Tag>
                </div>
                {currentRecord?.current_medical_info?.clinical_observations ? (
                  <div style={{ marginTop: 8 }}>
                    <span className="patient-info-label">Clinical Observations &amp; Exam Notes</span>
                    <div style={{ fontSize: 12.5, color: '#334155', marginTop: 3, lineHeight: 1.5 }}>
                      {currentRecord.current_medical_info.clinical_observations}
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', marginTop: 8 }}>
                    No specific clinical observations recorded.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ══════════════ PLAN OF MANAGEMENT & CARE STRATEGY ══════════════ */}
          <div className="patient-card-block">
            <div className="patient-card-block-header">
              <div className="patient-card-block-badge">
                <Target size={15} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="patient-card-block-title">Plan of Management &amp; Care Strategy</div>
                <div className="patient-card-block-subtitle">
                  Doctor's clinical diagnosis, performance score, recommended investigations, and treatment plan
                </div>
              </div>
            </div>

            {/* 1. Doctor's Clinical Diagnosis */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Stethoscope size={14} color="#2563eb" />
                <span>1. Doctor&apos;s Clinical Diagnosis</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                <div style={{ padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                  <span className="patient-info-label" style={{ color: '#166534' }}>Primary Diagnosis</span>
                  <div style={{ fontWeight: 650, fontSize: 13.5, color: '#14532d', marginTop: 2 }}>
                    {currentRecord?.current_medical_info?.current_diagnosis || 'No formal diagnosis recorded.'}
                  </div>
                </div>
                <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <span className="patient-info-label">Differential Diagnosis / Considerations</span>
                  <div style={{ fontSize: 13, color: '#334155', marginTop: 2 }}>
                    {currentRecord?.current_medical_info?.differential_diagnosis || 'None listed.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Performance Status Assessment */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Gauge size={14} color="#d97706" />
                <span>Performance Status Assessment (Score 0 to 10)</span>
              </div>
              {perfScore !== null && PERFORMANCE_SCALE_GUIDELINES[perfScore] ? (
                <div
                  style={{
                    padding: 12,
                    backgroundColor: PERFORMANCE_SCALE_GUIDELINES[perfScore].bg,
                    borderRadius: 8,
                    border: `1px solid ${PERFORMANCE_SCALE_GUIDELINES[perfScore].border}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: PERFORMANCE_SCALE_GUIDELINES[perfScore].color }}>
                      {PERFORMANCE_SCALE_GUIDELINES[perfScore].title}
                    </div>
                    <Tag color={PERFORMANCE_SCALE_GUIDELINES[perfScore].tone}>
                      Score {perfScore} / 10
                    </Tag>
                  </div>
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
                    {PERFORMANCE_SCALE_GUIDELINES[perfScore].desc}
                  </div>
                  {currentRecord?.current_medical_info?.performance_description && (
                    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(0,0,0,0.06)', fontSize: 12.5, color: '#1e293b' }}>
                      <span style={{ fontWeight: 600 }}>Clinical Notes: </span>
                      {currentRecord.current_medical_info.performance_description}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                  Performance score not recorded for this session.
                </div>
              )}
            </div>

            {/* 2. Recommended Investigations & Diagnostic Labs */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FlaskConical size={14} color="#7c3aed" />
                <span>2. Recommended Investigations &amp; Diagnostic Labs ({orderedTests.length} selected)</span>
              </div>
              {orderedTests.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {orderedTests.map((testName, i) => {
                    const matched = COMMON_INVESTIGATIONS.find((c) => c.name.toLowerCase() === testName.toLowerCase());
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '6px 12px',
                          backgroundColor: '#f1f5f9',
                          borderRadius: 6,
                          border: '1px solid #cbd5e1',
                          fontSize: 12.5,
                          fontWeight: 600,
                          color: '#0f172a',
                        }}
                      >
                        <Check size={13} color="#2563eb" />
                        <span>{testName}</span>
                        {matched && (
                          <span style={{ fontSize: 10.5, color: '#64748b', fontWeight: 500, backgroundColor: '#e2e8f0', padding: '1px 6px', borderRadius: 4 }}>
                            {matched.category}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                  No diagnostic investigations currently ordered.
                </div>
              )}
            </div>

            {/* 3. Overall Treatment Strategy & Care Plan */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <FileSearch size={14} color="#059669" />
                <span>3. Overall Treatment Strategy &amp; Care Plan</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <span className="patient-info-label">Overall Treatment Strategy</span>
                  <div style={{ fontSize: 12.5, color: '#1e293b', marginTop: 4, lineHeight: 1.5 }}>
                    {currentRecord?.current_medical_info?.treatment_strategy || 'No specific treatment strategy documented.'}
                  </div>
                </div>

                <div style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <span className="patient-info-label">Care Goals &amp; Expected Outcomes</span>
                  <div style={{ fontSize: 12.5, color: '#1e293b', marginTop: 4, lineHeight: 1.5 }}>
                    {currentRecord?.current_medical_info?.care_goals || 'No specific care goals documented.'}
                  </div>
                </div>

                {currentRecord?.current_medical_info?.dietary_advice && (
                  <div style={{ padding: 12, backgroundColor: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', gridColumn: '1 / -1' }}>
                    <span className="patient-info-label" style={{ color: '#166534' }}>Dietary Advice &amp; Nutritional Guidance</span>
                    <div style={{ fontSize: 12.5, color: '#14532d', marginTop: 4, lineHeight: 1.5 }}>
                      {currentRecord.current_medical_info.dietary_advice}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Record / Edit Medical History Create Drawer */}
      <RecordMedicalHistoryDrawer
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        patientId={patient.id}
        patientGender={patient.gender}
        patientName={patient.name}
        patientAge={patient.date_of_birth ? formatPatientAge(patient.date_of_birth) : undefined}
        patientBloodGroup={patient.blood_group || undefined}
        initialData={isEditMode ? currentRecord : null}
        onSuccess={() => {
          fetchHistories();
        }}
      />

      {/* Comprehensive Patient Dossier / Clinical Summary PDF Preview Modal */}
      <PatientSummaryPdfModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        patient={patient}
        medicalRecord={currentRecord}
      />
    </div>
  );
}
