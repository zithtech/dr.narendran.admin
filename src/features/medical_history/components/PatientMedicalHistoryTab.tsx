import { App, Button, Popconfirm, Select, Spin, Tag, Tooltip } from 'antd';
import {
  Activity,
  AlertCircle,
  Eye,
  FileText,
  HeartPulse,
  History,
  Pencil,
  Plus,
  Trash2,
  Upload,
  User,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { Patient } from '../../../components/PatientModal';
import { formatDate, formatPatientAge, timeAgo } from '../../../lib/format';
import { medicalHistoryApi } from '../services/medicalHistoryApi';
import {
  MEDICAL_DOCUMENT_TYPES,
  type PatientMedicalDocument,
  type PatientMedicalHistoryRecord,
} from '../types/medicalHistory.types';
import { RecordMedicalHistoryDrawer } from './RecordMedicalHistoryDrawer';
import { UploadPatientDocumentModal } from './UploadPatientDocumentModal';

interface PatientMedicalHistoryTabProps {
  patient: Patient;
  isEditable?: boolean;
}

export function PatientMedicalHistoryTab({ patient, isEditable = true }: PatientMedicalHistoryTabProps) {
  const { message } = App.useApp();

  const [histories, setHistories] = useState<PatientMedicalHistoryRecord[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string>('');
  const [documents, setDocuments] = useState<PatientMedicalDocument[]>([]);
  const [docFilter, setDocFilter] = useState<string>('ALL');

  const [loading, setLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(true);

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isUploadDocOpen, setIsUploadDocOpen] = useState(false);

  // Fetch histories
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
      console.error('Failed to load patient medical histories:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch documents
  const fetchDocuments = async (filter?: string) => {
    try {
      setDocsLoading(true);
      const docs = await medicalHistoryApi.getDocuments(patient.id, filter || docFilter);
      setDocuments(docs);
    } catch (err: any) {
      console.error('Failed to load patient medical documents:', err);
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistories();
    fetchDocuments('ALL');
  }, [patient.id]);

  const currentRecord = useMemo(() => {
    if (!selectedHistoryId || histories.length === 0) return null;
    return histories.find((h) => h.id === selectedHistoryId) || histories[0];
  }, [selectedHistoryId, histories]);

  const handleDeleteDocument = async (docId: string) => {
    try {
      await medicalHistoryApi.deleteDocument(patient.id, docId);
      message.success('Medical document deleted successfully.');
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err: any) {
      message.error(err.response?.data?.error || 'Failed to delete document.');
    }
  };

  // BMI calculation for current record or patient
  const heightVal = currentRecord?.current_medical_info?.height_cm || patient.height_cm;
  const weightVal = currentRecord?.current_medical_info?.weight_kg || patient.weight_kg;
  const bmiScore = useMemo(() => {
    const h = Number(heightVal);
    const w = Number(weightVal);
    if (!h || !w || h <= 0 || w <= 0) return null;
    const bmi = w / ((h / 100) * (h / 100));
    if (!Number.isFinite(bmi)) return null;
    let band = 'Healthy';
    let color = '#16a34a';
    if (bmi < 18.5) {
      band = 'Underweight';
      color = '#eab308';
    } else if (bmi < 25) {
      band = 'Healthy / Normal';
      color = '#16a34a';
    } else if (bmi < 30) {
      band = 'Overweight';
      color = '#f97316';
    } else {
      band = 'Obese';
      color = '#dc2626';
    }
    return { val: bmi.toFixed(1), band, color };
  }, [heightVal, weightVal]);

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
              No previous history records recorded yet.
            </span>
          )}

          {currentRecord && (
            <span style={{ fontSize: 11.5, color: '#64748b' }}>
              Last modified {timeAgo(currentRecord.updated_at || currentRecord.created_at)}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {isEditable && (
            <Tooltip title="Record New History">
              <Button
                type="primary"
                size="middle"
                icon={<Plus size={15} />}
                onClick={() => {
                  setIsEditMode(false);
                  setIsRecordModalOpen(true);
                }}
                style={{ backgroundColor: '#2563eb' }}
                aria-label="Record New History"
              >
                <span className="sr-only">Record New History</span>
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
          <div style={{ marginTop: 10, fontSize: 13, color: '#64748b' }}>Loading patient medical history...</div>
        </div>
      ) : (
        <>
          {/* ══════════════ 1. CURRENT MEDICAL INFORMATION & VITALS ══════════════ */}
          <div className="patient-card-block">
            <div className="patient-card-block-header">
              <div className="patient-card-block-badge">
                <HeartPulse size={15} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="patient-card-block-title">1. Current Medical Information &amp; Clinical Vitals</div>
                <div className="patient-card-block-subtitle">
                  Present complaints, symptoms, pain score, diagnosis, and biometric measurements
                </div>
              </div>
            </div>

            {/* Vitals Ribbon */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 10,
                marginBottom: 14,
              }}
            >
              <div className="patient-kpi-card">
                <div className="patient-kpi-label">Height</div>
                <div className="patient-kpi-val">{heightVal ? `${heightVal} cm` : '—'}</div>
                <div className="patient-kpi-sub">Stature</div>
              </div>

              <div className="patient-kpi-card">
                <div className="patient-kpi-label">Weight</div>
                <div className="patient-kpi-val">{weightVal ? `${weightVal} kg` : '—'}</div>
                <div className="patient-kpi-sub">Body Mass</div>
              </div>

              <div className="patient-kpi-card">
                <div className="patient-kpi-label">BMI Score</div>
                <div className="patient-kpi-val" style={{ color: bmiScore?.color || '#1d4ed8' }}>
                  {bmiScore?.val || '—'}
                </div>
                <div className="patient-kpi-sub">{bmiScore?.band || 'No data'}</div>
              </div>

              <div className="patient-kpi-card">
                <div className="patient-kpi-label">Blood Pressure</div>
                <div className="patient-kpi-val" style={{ color: '#b91c1c' }}>
                  {currentRecord?.current_medical_info?.blood_pressure || patient.blood_pressure || '—'}
                </div>
                <div className="patient-kpi-sub">mmHg</div>
              </div>

              <div className="patient-kpi-card">
                <div className="patient-kpi-label">Pulse Rate</div>
                <div className="patient-kpi-val" style={{ color: '#7c3aed' }}>
                  {currentRecord?.current_medical_info?.pulse_rate ? `${currentRecord.current_medical_info.pulse_rate} bpm` : '—'}
                </div>
                <div className="patient-kpi-sub">Heart Rate</div>
              </div>

              <div className="patient-kpi-card">
                <div className="patient-kpi-label">Body Temp</div>
                <div className="patient-kpi-val" style={{ color: '#c2410c' }}>
                  {currentRecord?.current_medical_info?.temperature || patient.body_temperature ? `${currentRecord?.current_medical_info?.temperature || patient.body_temperature} °F` : '—'}
                </div>
                <div className="patient-kpi-sub">Oral / Axillary</div>
              </div>

              <div className="patient-kpi-card">
                <div className="patient-kpi-label">Oxygen SpO2</div>
                <div className="patient-kpi-val" style={{ color: '#047857' }}>
                  {currentRecord?.current_medical_info?.oxygen_saturation ? `${currentRecord.current_medical_info.oxygen_saturation}%` : '—'}
                </div>
                <div className="patient-kpi-sub">Pulse Oximetry</div>
              </div>
            </div>

            {/* Complaints, Symptoms, Pain level & Diagnosis */}
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
                <div style={{ marginTop: 6 }}>
                  <span className="patient-info-label">Current Diagnosis / Assessment</span>
                  <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginTop: 2 }}>
                    {currentRecord?.current_medical_info?.current_diagnosis || 'No formal diagnosis recorded on this entry.'}
                  </div>
                </div>
                {currentRecord?.current_medical_info?.clinical_observations && (
                  <div style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>
                    Observations: {currentRecord.current_medical_info.clinical_observations}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ══════════════ 2. PREVIOUS MEDICAL HISTORY ══════════════ */}
          <div className="patient-card-block">
            <div className="patient-card-block-header">
              <div className="patient-card-block-badge">
                <History size={15} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="patient-card-block-title">2. Previous Medical History &amp; Chronic Diseases</div>
                <div className="patient-card-block-subtitle">
                  Chronic conditions, previous illnesses, surgeries, admissions, allergies, and medications
                </div>
              </div>
            </div>

            {/* Chronic Conditions Tags */}
            <div style={{ marginBottom: 14 }}>
              <span className="patient-info-label">Chronic Conditions on File</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
                {currentRecord?.previous_medical_history?.chronic_diseases &&
                currentRecord.previous_medical_history.chronic_diseases.length > 0 ? (
                  currentRecord.previous_medical_history.chronic_diseases.map((cond) => (
                    <Tag key={cond} color="volcano" style={{ fontSize: 12, padding: '3px 10px', borderRadius: 12 }}>
                      {cond}
                    </Tag>
                  ))
                ) : (
                  <span style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                    No chronic conditions marked.
                  </span>
                )}
              </div>
            </div>

            {/* Allergies Critical Banner */}
            <div
              style={{
                padding: '12px 14px',
                backgroundColor: '#fef2f2',
                borderRadius: 8,
                border: '1px solid #fecaca',
                marginBottom: 14,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <AlertCircle size={15} />
                <span>Known Allergies &amp; Drug Sensitivities</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#7f1d1d', textTransform: 'uppercase' }}>Medicine</span>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#991b1b' }}>
                    {currentRecord?.previous_medical_history?.allergies?.medicine_allergies || 'No known drug allergies (NKDA)'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#7f1d1d', textTransform: 'uppercase' }}>Food</span>
                  <div style={{ fontSize: 12.5, color: '#7f1d1d' }}>
                    {currentRecord?.previous_medical_history?.allergies?.food_allergies || 'None reported'}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#7f1d1d', textTransform: 'uppercase' }}>Other</span>
                  <div style={{ fontSize: 12.5, color: '#7f1d1d' }}>
                    {currentRecord?.previous_medical_history?.allergies?.other_allergies || 'None reported'}
                  </div>
                </div>
              </div>
            </div>

            {/* Previous Diseases Table */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                Previous Diseases &amp; Medical Conditions
              </div>
              {currentRecord?.previous_medical_history?.previous_diseases &&
              currentRecord.previous_medical_history.previous_diseases.length > 0 ? (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                        <th style={{ padding: '6px 8px' }}>Disease / Condition</th>
                        <th style={{ padding: '6px 8px' }}>Diagnosis Date</th>
                        <th style={{ padding: '6px 8px' }}>Treatment</th>
                        <th style={{ padding: '6px 8px' }}>Current Status</th>
                        <th style={{ padding: '6px 8px' }}>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRecord.previous_medical_history.previous_diseases.map((d, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0f172a' }}>{d.disease_name}</td>
                          <td style={{ padding: '6px 8px' }}>{d.diagnosis_date ? formatDate(d.diagnosis_date) : '—'}</td>
                          <td style={{ padding: '6px 8px' }}>{d.treatment_details || '—'}</td>
                          <td style={{ padding: '6px 8px' }}>
                            <Tag color={d.current_status === 'Active' ? 'red' : 'green'}>{d.current_status || 'Resolved'}</Tag>
                          </td>
                          <td style={{ padding: '6px 8px', color: '#64748b' }}>{d.remarks || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                  No previous illness entries recorded.
                </div>
              )}
            </div>

            {/* Surgeries & Admissions Tables */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>
              {/* Surgeries */}
              <div style={{ padding: 10, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                  Previous Surgeries &amp; Operations
                </div>
                {currentRecord?.previous_medical_history?.surgeries &&
                currentRecord.previous_medical_history.surgeries.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {currentRecord.previous_medical_history.surgeries.map((s, i) => (
                      <div key={i} style={{ padding: 8, backgroundColor: '#fff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 650, fontSize: 12.5 }}>
                          <span>{s.surgery_name}</span>
                          <span style={{ fontSize: 11.5, color: '#64748b' }}>{s.surgery_date ? formatDate(s.surgery_date) : ''}</span>
                        </div>
                        <div style={{ fontSize: 11.5, color: '#475569', marginTop: 2 }}>
                          {s.hospital_name || ''} {s.surgeon_name ? `· Dr. ${s.surgeon_name}` : ''}
                        </div>
                        {s.remarks && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.remarks}</div>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 11.5, color: '#94a3b8', fontStyle: 'italic' }}>No surgeries recorded.</div>
                )}
              </div>

              {/* Admissions & Transfusion */}
              <div style={{ padding: 10, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
                  Hospital Admissions &amp; Transfusions
                </div>
                {currentRecord?.previous_medical_history?.hospital_admissions &&
                currentRecord.previous_medical_history.hospital_admissions.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {currentRecord.previous_medical_history.hospital_admissions.map((a, i) => (
                      <div key={i} style={{ padding: 8, backgroundColor: '#fff', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontWeight: 600, fontSize: 12.5 }}>{a.reason}</div>
                        <div style={{ fontSize: 11.5, color: '#64748b' }}>{a.hospital_name}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 11.5, color: '#94a3b8', fontStyle: 'italic' }}>No hospital admissions recorded.</div>
                )}

                <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #e2e8f0', fontSize: 12 }}>
                  <span style={{ fontWeight: 600, color: '#475569' }}>Blood Transfusion: </span>
                  <span>{currentRecord?.previous_medical_history?.blood_transfusions?.had_transfusion || 'No'}</span>
                  {currentRecord?.previous_medical_history?.blood_transfusions?.reason && (
                    <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>
                      {currentRecord.previous_medical_history.blood_transfusions.reason}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Current Ongoing Medications */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
                Current Medications
              </div>
              {currentRecord?.previous_medical_history?.current_medications &&
              currentRecord.previous_medical_history.current_medications.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                  {currentRecord.previous_medical_history.current_medications.map((m, i) => (
                    <div key={i} style={{ padding: 8, backgroundColor: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                      <div style={{ fontWeight: 650, fontSize: 13, color: '#0f172a' }}>{m.medicine_name}</div>
                      <div style={{ fontSize: 12, color: '#2563eb' }}>
                        {m.dosage} {m.frequency ? `· ${m.frequency}` : ''}
                      </div>
                      {m.reason && <div style={{ fontSize: 11.5, color: '#64748b' }}>Reason: {m.reason}</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic' }}>
                  No current medications recorded.
                </div>
              )}
            </div>
          </div>

          {/* ══════════════ 3. FAMILY MEDICAL HISTORY ══════════════ */}
          <div className="patient-card-block">
            <div className="patient-card-block-header">
              <div className="patient-card-block-badge">
                <Users size={15} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="patient-card-block-title">3. Family Medical History</div>
                <div className="patient-card-block-subtitle">
                  Hereditary disease risks across parents, siblings, grandparents, and direct relatives
                </div>
              </div>
              <div>
                <Tag color={currentRecord?.family_medical_history?.has_family_history === 'Yes' ? 'orange' : 'default'}>
                  Family History: {currentRecord?.family_medical_history?.has_family_history || 'No'}
                </Tag>
              </div>
            </div>

            {currentRecord?.family_medical_history?.members &&
            currentRecord.family_medical_history.members.length > 0 ? (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px' }}>Relationship</th>
                      <th style={{ padding: '6px 8px' }}>Disease / Condition</th>
                      <th style={{ padding: '6px 8px' }}>Age at Diagnosis</th>
                      <th style={{ padding: '6px 8px' }}>Health Status</th>
                      <th style={{ padding: '6px 8px' }}>Cause of Death</th>
                      <th style={{ padding: '6px 8px' }}>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRecord.family_medical_history.members.map((m, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '6px 8px', fontWeight: 600, color: '#0f172a' }}>{m.relationship}</td>
                        <td style={{ padding: '6px 8px', fontWeight: 600, color: '#2563eb' }}>{m.disease_name}</td>
                        <td style={{ padding: '6px 8px' }}>{m.age_at_diagnosis ? `${m.age_at_diagnosis} yrs` : '—'}</td>
                        <td style={{ padding: '6px 8px' }}>
                          <Tag color={m.current_health_status === 'Deceased' ? 'default' : 'green'}>
                            {m.current_health_status || 'Alive'}
                          </Tag>
                        </td>
                        <td style={{ padding: '6px 8px', color: '#991b1b' }}>{m.cause_of_death || '—'}</td>
                        <td style={{ padding: '6px 8px', color: '#64748b' }}>{m.remarks || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>
                No significant family medical history recorded.
              </div>
            )}
          </div>

          {/* ══════════════ 4. REPRODUCTIVE & OBSTETRIC HISTORY ══════════════ */}
          {(currentRecord?.reproductive_history?.is_applicable !== false || (patient.gender || '').toUpperCase() === 'FEMALE') && (
            <div className="patient-card-block">
              <div className="patient-card-block-header">
                <div className="patient-card-block-badge">
                  <User size={15} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="patient-card-block-title">4. Reproductive &amp; Obstetric History</div>
                  <div className="patient-card-block-subtitle">
                    Menstrual, obstetric (gravida/para), childbirth, breastfeeding, and contraceptive history
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
                <div className="patient-info-item">
                  <span className="patient-info-label">Menarche Age</span>
                  <span className="patient-info-val">
                    {currentRecord?.reproductive_history?.age_at_menarche ? `${currentRecord.reproductive_history.age_at_menarche} years` : '—'}
                  </span>
                </div>

                <div className="patient-info-item">
                  <span className="patient-info-label">Menstrual Status</span>
                  <span className="patient-info-val">
                    <Tag color="magenta">{currentRecord?.reproductive_history?.menstrual_status || 'Regular'}</Tag>
                  </span>
                </div>

                {currentRecord?.reproductive_history?.age_at_menopause && (
                  <div className="patient-info-item">
                    <span className="patient-info-label">Age at Menopause</span>
                    <span className="patient-info-val">{currentRecord.reproductive_history.age_at_menopause} years</span>
                  </div>
                )}

                <div className="patient-info-item">
                  <span className="patient-info-label">Obstetric Profile</span>
                  <span className="patient-info-val" style={{ fontWeight: 650 }}>
                    G: {currentRecord?.reproductive_history?.number_of_pregnancies ?? 0} · P: {currentRecord?.reproductive_history?.number_of_deliveries ?? 0} · L: {currentRecord?.reproductive_history?.number_of_living_children ?? 0}
                  </span>
                </div>

                <div className="patient-info-item">
                  <span className="patient-info-label">Miscarriages / Abortions</span>
                  <span className="patient-info-val">
                    {currentRecord?.reproductive_history?.number_of_miscarriages ?? 0} miscarriages, {currentRecord?.reproductive_history?.number_of_abortions ?? 0} abortions
                  </span>
                </div>

                <div className="patient-info-item">
                  <span className="patient-info-label">Breastfeeding History</span>
                  <span className="patient-info-val">
                    {currentRecord?.reproductive_history?.breastfeeding_history || 'Not Applicable'}
                    {currentRecord?.reproductive_history?.breastfeeding_duration ? ` (${currentRecord.reproductive_history.breastfeeding_duration})` : ''}
                  </span>
                </div>

                <div className="patient-info-item">
                  <span className="patient-info-label">Contraceptive Usage</span>
                  <span className="patient-info-val">{currentRecord?.reproductive_history?.contraceptive_usage || 'None'}</span>
                </div>

                <div className="patient-info-item">
                  <span className="patient-info-label">Hormone / Infertility Therapy</span>
                  <span className="patient-info-val">
                    {currentRecord?.reproductive_history?.hormone_therapy_history || currentRecord?.reproductive_history?.infertility_treatment_history || 'None'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════ 5. LIFESTYLE HISTORY ══════════════ */}
          <div className="patient-card-block">
            <div className="patient-card-block-header">
              <div className="patient-card-block-badge">
                <Activity size={15} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="patient-card-block-title">5. Lifestyle History &amp; Habits</div>
                <div className="patient-card-block-subtitle">
                  Smoking, alcohol consumption, tobacco usage, diet, physical activity, and occupational environment
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div className="patient-info-item">
                <span className="patient-info-label">Smoking Status</span>
                <span className="patient-info-val">
                  <Tag color={currentRecord?.lifestyle_history?.smoking_status === 'Current' ? 'red' : 'green'}>
                    {currentRecord?.lifestyle_history?.smoking_status || 'Never'}
                  </Tag>
                  {currentRecord?.lifestyle_history?.smoking_duration && (
                    <span style={{ fontSize: 11.5, color: '#64748b', display: 'block', marginTop: 2 }}>
                      {currentRecord.lifestyle_history.smoking_duration}
                    </span>
                  )}
                </span>
              </div>

              <div className="patient-info-item">
                <span className="patient-info-label">Alcohol Consumption</span>
                <span className="patient-info-val">
                  <Tag color={currentRecord?.lifestyle_history?.alcohol_consumption === 'Regularly' ? 'volcano' : 'default'}>
                    {currentRecord?.lifestyle_history?.alcohol_consumption || 'Never'}
                  </Tag>
                </span>
              </div>

              <div className="patient-info-item">
                <span className="patient-info-label">Chewing Tobacco</span>
                <span className="patient-info-val">{currentRecord?.lifestyle_history?.chewing_tobacco || 'Never'}</span>
              </div>

              <div className="patient-info-item">
                <span className="patient-info-label">Diet Pattern</span>
                <span className="patient-info-val" style={{ fontWeight: 600 }}>
                  {currentRecord?.lifestyle_history?.diet_type || 'Non-Vegetarian'}
                </span>
              </div>

              <div className="patient-info-item">
                <span className="patient-info-label">Physical Activity Level</span>
                <span className="patient-info-val">{currentRecord?.lifestyle_history?.physical_activity_level || 'Moderate'}</span>
              </div>

              <div className="patient-info-item">
                <span className="patient-info-label">Sleep Pattern</span>
                <span className="patient-info-val">{currentRecord?.lifestyle_history?.sleep_pattern || 'Normal'}</span>
              </div>

              <div className="patient-info-item">
                <span className="patient-info-label">Occupational Exposure</span>
                <span className="patient-info-val">{currentRecord?.lifestyle_history?.occupational_exposure || 'None reported'}</span>
              </div>

              <div className="patient-info-item">
                <span className="patient-info-label">Other Habits</span>
                <span className="patient-info-val">{currentRecord?.lifestyle_history?.other_habits || '—'}</span>
              </div>
            </div>
          </div>

          {/* ══════════════ 6. MEDICAL DOCUMENTS & REPORTS ══════════════ */}
          <div className="patient-card-block">
            <div className="patient-card-block-header">
              <div className="patient-card-block-badge">
                <FileText size={15} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="patient-card-block-title">
                  6. Medical Documents &amp; Reports ({documents.length})
                </div>
                <div className="patient-card-block-subtitle">
                  Lab reports, scans, X-rays, discharge summaries, prescriptions, and external medical records
                </div>
              </div>
              <Button
                type="primary"
                size="small"
                icon={<Upload size={13} />}
                onClick={() => setIsUploadDocOpen(true)}
                style={{ backgroundColor: '#2563eb' }}
              >
                Upload Report
              </Button>
            </div>

            {/* Category Filter Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => {
                  setDocFilter('ALL');
                  fetchDocuments('ALL');
                }}
                style={{
                  padding: '4px 10px',
                  borderRadius: 14,
                  fontSize: 11.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: docFilter === 'ALL' ? '1px solid #2563eb' : '1px solid #cbd5e1',
                  backgroundColor: docFilter === 'ALL' ? '#eff6ff' : '#ffffff',
                  color: docFilter === 'ALL' ? '#1d4ed8' : '#64748b',
                }}
              >
                All Documents ({documents.length})
              </button>
              {MEDICAL_DOCUMENT_TYPES.map((type) => {
                const count = documents.filter((d) => d.document_type === type).length;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      setDocFilter(type);
                      fetchDocuments(type);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 14,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: docFilter === type ? '1px solid #2563eb' : '1px solid #cbd5e1',
                      backgroundColor: docFilter === type ? '#eff6ff' : '#ffffff',
                      color: docFilter === type ? '#1d4ed8' : '#64748b',
                    }}
                  >
                    {type} {count > 0 ? `(${count})` : ''}
                  </button>
                );
              })}
            </div>

            {/* Documents Grid */}
            {docsLoading ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <Spin size="small" />
              </div>
            ) : documents.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontStyle: 'italic' }}>
                No medical documents uploaded in this category. Click "Upload Report" to attach scanned files.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      padding: 12,
                      backgroundColor: '#f8fafc',
                      borderRadius: 8,
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: 8,
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Tag color="blue" style={{ fontSize: 11 }}>
                          {doc.document_type}
                        </Tag>
                        <span style={{ fontSize: 11, color: '#64748b' }}>
                          {doc.document_date ? formatDate(doc.document_date) : formatDate(doc.created_at)}
                        </span>
                      </div>
                      <div style={{ fontWeight: 650, fontSize: 13, color: '#0f172a' }}>{doc.title}</div>
                      <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 2 }}>{doc.file_name}</div>
                      {doc.notes && <div style={{ fontSize: 11.5, color: '#475569', marginTop: 4 }}>{doc.notes}</div>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
                      <span style={{ fontSize: 11, color: '#94a3b8' }}>
                        By {doc.uploaded_by_name || 'Staff'}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: '#2563eb',
                            textDecoration: 'none',
                            padding: '3px 8px',
                            backgroundColor: '#eff6ff',
                            borderRadius: 4,
                          }}
                        >
                          <Eye size={12} /> View
                        </a>
                        <Popconfirm
                          title="Delete Document"
                          description="Are you sure you want to delete this document?"
                          onConfirm={() => handleDeleteDocument(doc.id)}
                          okText="Delete"
                          okButtonProps={{ danger: true }}
                        >
                          <button
                            type="button"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#ef4444',
                              padding: '3px 6px',
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </Popconfirm>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
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

      {/* Upload Document Modal */}
      <UploadPatientDocumentModal
        isOpen={isUploadDocOpen}
        onClose={() => setIsUploadDocOpen(false)}
        patientId={patient.id}
        medicalHistoryId={currentRecord?.id || null}
        onSuccess={() => {
          fetchDocuments();
        }}
      />
    </div>
  );
}
