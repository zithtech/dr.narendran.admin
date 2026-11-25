import { Tag } from 'antd';
import {
  Activity,
  Check,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  FlaskConical,
  Gauge,
  HeartPulse,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { forwardRef, useImperativeHandle, useState } from 'react';

import { SearchableSelect, type SearchableSelectOption } from '../../../components/ui/SearchableSelect';
import type { PlanOfManagementData } from '../types/patientJourney.types';

export const COMMON_DIAGNOSES = [
  'General Clinical Consultation',
  'Hypertension (Primary / Essential)',
  'Type 2 Diabetes Mellitus',
  'Upper Respiratory Tract Infection (URTI)',
  'Acute Gastritis / Acid Peptic Disease',
  'Viral Fever / Pyrexia of Unknown Origin',
  'Migraine / Tension-type Headache',
  'Allergic Rhinitis / Bronchial Asthma',
  'Musculoskeletal Back Pain / Lumbar Spondylosis',
  'Dyslipidemia / Hypercholesterolemia',
  'Hypothyroidism',
  'Urinary Tract Infection (UTI)',
  'Breast Lump / Suspected Fibroadenoma',
  'Cervical Lymphadenopathy',
  'Gastroesophageal Reflux Disease (GERD)',
  'Oral Leukoplakia / Premalignant Lesion',
  'Colorectal Polyps / Evaluation',
  'Anemia (Iron Deficiency)',
];

export const COMMON_INVESTIGATIONS = [
  // Routine Hematology & Biochemistry
  { category: 'Routine Labs', name: 'Complete Blood Count (CBC) with ESR' },
  { category: 'Routine Labs', name: 'Liver Function Tests (LFT)' },
  { category: 'Routine Labs', name: 'Renal / Kidney Function Tests (RFT / Urea / Creatinine)' },
  { category: 'Routine Labs', name: 'Fasting Blood Sugar (FBS) & HbA1c' },
  { category: 'Routine Labs', name: 'Post-Prandial Blood Sugar (PPBS)' },
  { category: 'Routine Labs', name: 'Lipid Profile (Cholesterol / Triglycerides)' },
  { category: 'Routine Labs', name: 'Thyroid Profile (T3, T4, TSH)' },
  { category: 'Routine Labs', name: 'Urine Routine & Microscopic Examination' },
  { category: 'Routine Labs', name: 'Serum Electrolytes (Na+, K+, Cl-)' },
  // Imaging & Radiography
  { category: 'Scans & Imaging', name: 'Chest X-Ray (PA View)' },
  { category: 'Scans & Imaging', name: 'Ultrasound Abdomen & Pelvis (USG)' },
  { category: 'Scans & Imaging', name: 'CECT Abdomen & Pelvis' },
  { category: 'Scans & Imaging', name: 'CECT Thorax / Chest' },
  { category: 'Scans & Imaging', name: 'MRI Brain / Spine' },
  { category: 'Scans & Imaging', name: 'Whole Body PET-CT Scan' },
  { category: 'Scans & Imaging', name: 'Mammography (Bilateral)' },
  // Pathology & Cytology
  { category: 'Pathology & Biopsy', name: 'FNAC (Fine Needle Aspiration Cytology)' },
  { category: 'Pathology & Biopsy', name: 'Core Needle Biopsy' },
  { category: 'Pathology & Biopsy', name: 'Histopathology Examination (HPE)' },
  { category: 'Pathology & Biopsy', name: 'Immunohistochemistry (IHC) Panel' },
  { category: 'Pathology & Biopsy', name: 'Serum Tumor Markers (CEA / CA-125 / PSA)' },
];

const TREATMENT_STRATEGY_TEMPLATES: Array<{ label: string; text: string }> = [
  {
    label: 'Standard Medical Management',
    text: 'Initiate empirical oral medication therapy with regular monitoring. Advise adequate hydration, rest, and follow-up with ordered lab investigations.',
  },
  {
    label: 'Pre-operative Diagnostic Workup',
    text: 'Complete baseline laboratory evaluations, cardiopulmonary clearance, and radiological imaging before scheduling definitive surgical intervention.',
  },
  {
    label: 'Oncology Staging & Multidisciplinary Review',
    text: 'Obtain histopathology review, tissue biopsy, and contrast imaging for accurate TNM staging. Discuss in Multidisciplinary Tumor Board (MDT) for multimodal therapy planning.',
  },
  {
    label: 'Conservative & Symptomatic Relief',
    text: 'Conservative symptomatic management with analgesics, anti-inflammatory agents, and dietary modifications. Reassess clinical progress in 7-10 days.',
  },
];

export const PERFORMANCE_SCALE_GUIDELINES: Record<
  number,
  { title: string; desc: string; tone: string; color: string; bg: string; border: string }
> = {
  0: { title: 'Score 0 · Normal / Fully Active', desc: 'Able to carry on all pre-disease activities without restriction.', tone: 'green', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  1: { title: 'Score 1 · Restricted Strenuous Work', desc: 'Restricted in physically strenuous activity, but ambulatory and able to carry out light work.', tone: 'green', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  2: { title: 'Score 2 · Light Ambulation', desc: 'Ambulatory and capable of all self-care, but unable to carry out any work activities; up and about > 50% of waking hours.', tone: 'blue', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  3: { title: 'Score 3 · Limited Self-Care', desc: 'Capable of only limited self-care; confined to bed or chair > 50% of waking hours.', tone: 'blue', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  4: { title: 'Score 4 · Significant Impairment', desc: 'Capable of minimal self-care; up and about for brief periods, requires occasional support.', tone: 'gold', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  5: { title: 'Score 5 · Moderate Impairment', desc: 'Requires considerable assistance and frequent medical care; spends roughly half the day in bed/chair.', tone: 'gold', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  6: { title: 'Score 6 · Major Assistance Required', desc: 'Requires occasional assistance but is able to care for most of personal needs.', tone: 'gold', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  7: { title: 'Score 7 · Severely Disabled', desc: 'Severely disabled; hospital admission indicated although death not imminent.', tone: 'orange', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  8: { title: 'Score 8 · Very Sick / Bedridden', desc: 'Very sick; active supportive hospital treatment necessary.', tone: 'orange', color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  9: { title: 'Score 9 · Moribund / Critical', desc: 'Moribund; fatal processes progressing rapidly.', tone: 'red', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  10: { title: 'Score 10 · Completely Bedbound / Terminal', desc: 'Completely disabled, cannot carry on any self-care; totally confined to bed or chair.', tone: 'red', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

export interface PlanOfManagementStepRef {
  submit: () => void;
}

export interface PlanOfManagementStepProps {
  initialData?: PlanOfManagementData | undefined;
  patientName?: string | undefined;
  patientAge?: string | number | undefined;
  patientGender?: string | null | undefined;
  onSave: (data: PlanOfManagementData) => void;
  onPrevious: () => void;
  saving?: boolean | undefined;
  hideFooter?: boolean | undefined;
}

export const PlanOfManagementStep = forwardRef<PlanOfManagementStepRef, PlanOfManagementStepProps>(
  function PlanOfManagementStep(
    {
      initialData,
      onSave,
      onPrevious,
      saving = false,
      hideFooter = false,
    },
    ref,
  ) {
    const [provisionalDiagnosis, setProvisionalDiagnosis] = useState(
      initialData?.provisionalDiagnosis || '',
    );
    const [differentialDiagnosis, setDifferentialDiagnosis] = useState(
      initialData?.differentialDiagnosis || '',
    );
    const [clinicalObservations, setClinicalObservations] = useState(
      initialData?.clinicalObservations || '',
    );
    const [performanceScore, setPerformanceScore] = useState<number | null>(
      initialData?.performanceScore !== undefined && initialData?.performanceScore !== null
        ? initialData.performanceScore
        : null,
    );
    const [performanceDescription, setPerformanceDescription] = useState<string>(
      initialData?.performanceDescription || '',
    );
    const [selectedInvestigations, setSelectedInvestigations] = useState<string[]>(
      initialData?.investigationsOrdered || [],
    );
    const [customInvestigationInput, setCustomInvestigationInput] = useState('');
    const [treatmentStrategy, setTreatmentStrategy] = useState(
      initialData?.treatmentStrategy || '',
    );
    const [careGoals, setCareGoals] = useState(initialData?.careGoals || '');
    const [dietaryAdvice, setDietaryAdvice] = useState(initialData?.dietaryAdvice || '');

    const [activeCategory, setActiveCategory] = useState<string>('All');

    const toggleInvestigation = (testName: string) => {
      setSelectedInvestigations((prev) =>
        prev.includes(testName) ? prev.filter((t) => t !== testName) : [...prev, testName],
      );
    };

    const addCustomInvestigation = () => {
      const trimmed = customInvestigationInput.trim();
      if (trimmed && !selectedInvestigations.includes(trimmed)) {
        setSelectedInvestigations((prev) => [...prev, trimmed]);
        setCustomInvestigationInput('');
      }
    };

    const handleApplyTemplate = (text: string) => {
      setTreatmentStrategy((prev) => (prev ? `${prev}\n${text}` : text));
    };

    const handleNext = () => {
      onSave({
        provisionalDiagnosis: provisionalDiagnosis.trim(),
        differentialDiagnosis: differentialDiagnosis.trim() || undefined,
        clinicalObservations: clinicalObservations.trim() || undefined,
        performanceScore: performanceScore !== null ? performanceScore : undefined,
        performanceDescription: performanceDescription.trim() || undefined,
        investigationsOrdered: selectedInvestigations,
        treatmentStrategy: treatmentStrategy.trim(),
        careGoals: careGoals.trim() || undefined,
        dietaryAdvice: dietaryAdvice.trim() || undefined,
      });
    };

    useImperativeHandle(ref, () => ({
      submit: handleNext,
    }));

    const categories = ['All', 'Routine Labs', 'Scans & Imaging', 'Pathology & Biopsy'];
    const filteredInvestigations =
      activeCategory === 'All'
        ? COMMON_INVESTIGATIONS
        : COMMON_INVESTIGATIONS.filter((i) => i.category === activeCategory);

    const diagnosisOptions: SearchableSelectOption[] = COMMON_DIAGNOSES.map((d) => ({
      value: d,
      label: d,
    }));

  return (
    <div className="plan-of-management-container" style={{ padding: '20px 24px', width: '100%', boxSizing: 'border-box' }}>
      <style>{`
        .custom-investigation-input-box:focus-within {
          border-color: #2563eb !important;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12) !important;
        }
        .custom-investigation-input-box input.custom-test-text-input {
          border: none !important;
          outline: none !important;
          background: transparent !important;
          box-shadow: none !important;
          padding: 0 !important;
          height: 100% !important;
          font-size: 13px !important;
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* ── SECTION 1: PROVISIONAL & DIFFERENTIAL DIAGNOSIS ── */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            padding: '20px 22px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: '#eff6ff',
                  color: '#2563eb',
                  border: '1px solid #dbeafe',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Activity size={15} />
              </div>
              <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                1. Doctor's Clinical Diagnosis
              </h4>
            </div>
            <Tag color="blue" style={{ borderRadius: 12, padding: '0 8px', fontSize: 11, fontWeight: 600 }}>
              Primary Assessment
            </Tag>
          </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                  Provisional / Primary Working Diagnosis <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <SearchableSelect
                  options={diagnosisOptions}
                  value={provisionalDiagnosis}
                  onChange={(val) => setProvisionalDiagnosis(val)}
                  placeholder="Search or select primary diagnosis..."
                  searchPlaceholder="Search condition or disease..."
                />
                <div style={{ marginTop: 8 }}>
                  <input
                    type="text"
                    className="patient-form-input"
                    placeholder="Or type custom diagnosis..."
                    value={provisionalDiagnosis}
                    onChange={(e) => setProvisionalDiagnosis(e.target.value)}
                    style={{ height: 38, fontSize: 12.5 }}
                  />
                </div>
              </div>

              <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Differential Diagnoses (Optional)
                </label>
                <input
                  type="text"
                  className="patient-form-input"
                  placeholder="e.g. Rule out Cervical Radiculopathy, Fibromyalgia"
                  value={differentialDiagnosis}
                  onChange={(e) => setDifferentialDiagnosis(e.target.value)}
                  style={{ height: 38, fontSize: 12.5 }}
                />
                <span style={{ fontSize: 11, color: '#64748b', display: 'block', marginTop: 6 }}>
                  Enter possible alternate conditions under clinical consideration or rule-out.
                </span>
              </div>
            </div>

            <div>
              <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
                Clinical Examination Findings &amp; Physical Observations
              </label>
              <textarea
                className="patient-form-input"
                rows={3}
                placeholder="e.g. Chest clear to auscultation, soft abdomen, no palpable hepatosplenomegaly, peripheral pulses normal..."
                value={clinicalObservations}
                onChange={(e) => setClinicalObservations(e.target.value)}
                style={{ width: '100%', fontSize: 12.5 }}
              />
            </div>
          </div>

          {/* ── PERFORMANCE STATUS ASSESSMENT CARD ── */}
          <div
            data-testid="performance-status-card"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              padding: '20px 22px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Gauge size={15} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                    Performance Status
                  </h4>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {performanceScore !== null && (
                  <Tag color={PERFORMANCE_SCALE_GUIDELINES[performanceScore]?.tone || 'blue'} style={{ borderRadius: 12, padding: '0 8px', fontSize: 11, fontWeight: 600 }}>
                    Selected: Score {performanceScore} / 10
                  </Tag>
                )}
                <Tag color="cyan" style={{ borderRadius: 12, padding: '0 8px', fontSize: 11, fontWeight: 600 }}>
                  Scale 0 – 10
                </Tag>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* 0 to 10 Number Selection Buttons */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'flex', alignItems: 'center', gap: 4, margin: 0 }}>
                    Choose Performance Score (0 to 10)
                  </label>
                  {performanceScore !== null && (
                    <button
                      type="button"
                      onClick={() => setPerformanceScore(null)}
                      style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer', padding: 0 }}
                      className="hover:underline"
                    >
                      Clear selection
                    </button>
                  )}
                </div>

                {/* Number Buttons Grid 0 to 10 */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(11, minmax(0, 1fr))',
                    gap: 8,
                  }}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                    const isSelected = performanceScore === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPerformanceScore(num)}
                        data-testid={`performance-score-btn-${num}`}
                        style={{
                          height: 38,
                          borderRadius: 8,
                          border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                          backgroundColor: isSelected ? '#2563eb' : '#f8fafc',
                          color: isSelected ? '#ffffff' : '#0f172a',
                          fontWeight: isSelected ? 750 : 600,
                          fontSize: 14,
                          cursor: 'pointer',
                          display: 'grid',
                          placeItems: 'center',
                          transition: 'all 0.15s ease',
                          boxShadow: isSelected ? '0 2px 6px rgba(37, 99, 235, 0.3)' : 'none',
                        }}
                        title={`Score ${num}`}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Score Guideline Callout */}
                <div
                  style={{
                    marginTop: 10,
                    padding: '10px 14px',
                    borderRadius: 8,
                    backgroundColor: performanceScore !== null ? PERFORMANCE_SCALE_GUIDELINES[performanceScore]?.bg : '#f8fafc',
                    border: `1px solid ${performanceScore !== null ? PERFORMANCE_SCALE_GUIDELINES[performanceScore]?.border : '#e2e8f0'}`,
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  {performanceScore !== null ? (
                    <div>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: PERFORMANCE_SCALE_GUIDELINES[performanceScore]?.color }}>
                        {PERFORMANCE_SCALE_GUIDELINES[performanceScore]?.title}:
                      </span>{' '}
                      <span style={{ fontSize: 12, color: '#334155' }}>
                        {PERFORMANCE_SCALE_GUIDELINES[performanceScore]?.desc}
                      </span>
                    </div>
                  ) : (
                    <span style={{ fontSize: 12, color: '#64748b' }}>
                      Click any score from 0 (Normal / Fully Active) to 10 (Completely Bedbound) to log performance status.
                    </span>
                  )}
                </div>
              </div>

              {/* Description Textarea */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Performance Status Description
                </label>
                <textarea
                  className="patient-form-input"
                  rows={3}
                  placeholder="Enter performance status description, functional capacity observations, ambulatory stamina, or daily living activity notes..."
                  value={performanceDescription}
                  onChange={(e) => setPerformanceDescription(e.target.value)}
                  style={{ width: '100%', fontSize: 12.5, minHeight: 76 }}
                />
              </div>
            </div>
          </div>

          {/* ── SECTION 2: DIAGNOSTIC INVESTIGATIONS & LABS ── */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              padding: '20px 22px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: '#f5f3ff',
                    color: '#7c3aed',
                    border: '1px solid #ddd6fe',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <FlaskConical size={16} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                    2. Recommended Investigations &amp; Diagnostic Labs ({selectedInvestigations.length} selected)
                  </h4>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Tag color="purple" style={{ borderRadius: 12, padding: '0 8px', fontSize: 11, fontWeight: 600 }}>
                  {selectedInvestigations.length} selected
                </Tag>
                {selectedInvestigations.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedInvestigations([])}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '3px 8px',
                      borderRadius: 6,
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#dc2626',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    title="Deselect all ordered investigations"
                  >
                    <Trash2 size={11} />
                    <span>Clear All</span>
                  </button>
                )}
              </div>
            </div>

            {/* Filter Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11.5, fontWeight: 650, color: '#64748b', marginRight: 2 }}>Category:</span>
                {categories.map((cat) => {
                  const count = cat === 'All' ? COMMON_INVESTIGATIONS.length : COMMON_INVESTIGATIONS.filter((i) => i.category === cat).length;
                  const isActive = activeCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 20,
                        fontSize: 11.5,
                        fontWeight: isActive ? 700 : 500,
                        border: isActive ? '1px solid #7c3aed' : '1px solid #cbd5e1',
                        background: isActive ? '#7c3aed' : '#ffffff',
                        color: isActive ? '#ffffff' : '#475569',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        transition: 'all 0.15s ease',
                        boxShadow: isActive ? '0 1px 4px rgba(124, 58, 237, 0.25)' : 'none',
                      }}
                    >
                      <span>{cat}</span>
                      <span
                        style={{
                          fontSize: 10,
                          padding: '0px 5px',
                          borderRadius: 10,
                          background: isActive ? 'rgba(255,255,255,0.25)' : '#f1f5f9',
                          color: isActive ? '#ffffff' : '#64748b',
                          fontWeight: 600,
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
              <span style={{ fontSize: 11, color: '#64748b' }}>
                Showing {filteredInvestigations.length} tests
              </span>
            </div>

            {/* Selected Badges */}
            {selectedInvestigations.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  padding: '10px 12px',
                  background: '#faf5ff',
                  borderRadius: 8,
                  border: '1px solid #e9d5ff',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: '#6b21a8', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Check size={12} strokeWidth={2.5} /> Ordered Investigations ({selectedInvestigations.length}):
                  </span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedInvestigations.map((test) => (
                    <span
                      key={test}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        fontSize: 11.5,
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: 9999,
                        background: '#ffffff',
                        border: '1px solid #d8b4fe',
                        color: '#581c87',
                        boxShadow: '0 1px 3px rgba(124, 58, 237, 0.08)',
                      }}
                    >
                      <Check size={11} strokeWidth={3} style={{ color: '#7c3aed' }} />
                      <span>{test}</span>
                      <button
                        type="button"
                        onClick={() => toggleInvestigation(test)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          color: '#9333ea',
                          display: 'flex',
                          alignItems: 'center',
                          marginLeft: 2,
                        }}
                        title={`Remove ${test}`}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Choice Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 8,
                maxHeight: 240,
                overflowY: 'auto',
                padding: '2px',
              }}
            >
              {filteredInvestigations.map((item) => {
                const isSelected = selectedInvestigations.includes(item.name);
                return (
                  <div
                    key={item.name}
                    onClick={() => toggleInvestigation(item.name)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: isSelected ? '1.5px solid #7c3aed' : '1px solid #e2e8f0',
                      background: isSelected ? '#f5f3ff' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      boxShadow: isSelected ? '0 1px 4px rgba(124, 58, 237, 0.1)' : '0 1px 2px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 5,
                          border: isSelected ? '1.5px solid #7c3aed' : '1.5px solid #cbd5e1',
                          background: isSelected ? '#7c3aed' : '#ffffff',
                          display: 'grid',
                          placeItems: 'center',
                          color: '#ffffff',
                          flexShrink: 0,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: isSelected ? 650 : 500,
                          color: isSelected ? '#4c1d95' : '#1e293b',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={item.name}
                      >
                        {item.name}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: isSelected ? '#ede9fe' : '#f1f5f9',
                        color: isSelected ? '#6d28d9' : '#64748b',
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      {item.category === 'Routine Labs' ? 'Lab' : item.category === 'Scans & Imaging' ? 'Scan' : 'Biopsy'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Custom Investigation Input Bar */}
            <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid #f1f5f9' }}>
              <div
                className="custom-investigation-input-box"
                style={{
                  position: 'relative',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: 8,
                  height: 38,
                  padding: '0 12px',
                  gap: 8,
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              >
                <Search
                  size={15}
                  style={{
                    color: '#94a3b8',
                    flexShrink: 0,
                    pointerEvents: 'none',
                  }}
                />
                <input
                  type="text"
                  className="custom-test-text-input"
                  placeholder="Type custom diagnostic test, imaging or special panel (e.g. 2D Echocardiogram, Trop-I)..."
                  value={customInvestigationInput}
                  onChange={(e) => setCustomInvestigationInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomInvestigation();
                    }
                  }}
                  style={{
                    flex: 1,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 13,
                    color: '#0f172a',
                    padding: 0,
                    margin: 0,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <button
                type="button"
                className="ui-btn"
                onClick={addCustomInvestigation}
                disabled={!customInvestigationInput.trim()}
                style={{
                  height: 38,
                  fontSize: 12.5,
                  fontWeight: 600,
                  padding: '0 16px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  borderRadius: 8,
                  background: customInvestigationInput.trim() ? '#7c3aed' : '#f1f5f9',
                  color: customInvestigationInput.trim() ? '#ffffff' : '#94a3b8',
                  border: 'none',
                  cursor: customInvestigationInput.trim() ? 'pointer' : 'not-allowed',
                  boxShadow: customInvestigationInput.trim() ? '0 2px 6px rgba(124, 58, 237, 0.25)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                <Plus size={14} />
                <span>Add Test</span>
              </button>
            </div>
          </div>

          {/* ── SECTION 3: TREATMENT STRATEGY & CARE GOALS ── */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              border: '1px solid #e2e8f0',
              padding: '20px 22px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    background: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <FileSearch size={16} />
                </div>
                <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                  3. Overall Treatment Strategy &amp; Care Plan
                </h4>
              </div>

              <Tag color="green" style={{ borderRadius: 12, padding: '0 8px', fontSize: 11, fontWeight: 600 }}>
                Care Strategy
              </Tag>
            </div>

            {/* Quick Clinical Protocol Templates Bar */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: '10px 14px',
                background: '#f0fdf4',
                borderRadius: 8,
                border: '1px solid #bbf7d0',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={13} style={{ color: '#16a34a' }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#166534' }}>
                  Quick Clinical Protocol Templates (click to insert):
                </span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {TREATMENT_STRATEGY_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.label}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl.text)}
                    style={{
                      fontSize: 11,
                      padding: '4px 10px',
                      borderRadius: 14,
                      background: '#ffffff',
                      border: '1px solid #86efac',
                      color: '#15803d',
                      cursor: 'pointer',
                      fontWeight: 600,
                      transition: 'all 0.15s ease',
                      boxShadow: '0 1px 2px rgba(22, 163, 74, 0.06)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    title={`Insert: "${tmpl.text}"`}
                  >
                    <Plus size={11} />
                    <span>{tmpl.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              {/* Left Column: Treatment Protocol */}
              <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span>
                    Doctor's Treatment Protocol / Regimen Strategy <span style={{ color: '#ef4444' }}>*</span>
                  </span>
                  <span style={{ fontSize: 10.5, color: '#64748b', fontWeight: 500 }}>Clinical Directive</span>
                </label>
                <textarea
                  className="patient-form-input"
                  rows={6}
                  placeholder="Outline definitive clinical treatment strategy, therapeutic goals, medication approach, operative plans, or interventional pathway..."
                  value={treatmentStrategy}
                  onChange={(e) => setTreatmentStrategy(e.target.value)}
                  style={{ width: '100%', fontSize: 12.5, lineHeight: 1.55, minHeight: 140, flex: 1 }}
                />
              </div>

              {/* Right Column: Structured Health Goals & Directives */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, background: '#eff6ff', color: '#2563eb', display: 'grid', placeItems: 'center' }}>
                      <Target size={12} />
                    </div>
                    <span>Target Health Goals &amp; Expected Outcomes</span>
                  </label>
                  <textarea
                    className="patient-form-input"
                    rows={2}
                    placeholder="e.g. SBP < 130 mmHg, HbA1c < 7.0%, Full pain remission, Target discharge in 48h..."
                    value={careGoals}
                    onChange={(e) => setCareGoals(e.target.value)}
                    style={{ width: '100%', height: 48, fontSize: 12.5, resize: 'vertical' }}
                  />
                </div>

                <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 5, background: '#fff1f2', color: '#e11d48', display: 'grid', placeItems: 'center' }}>
                      <HeartPulse size={12} />
                    </div>
                    <span>Dietary &amp; Lifestyle Instructions</span>
                  </label>
                  <textarea
                    className="patient-form-input"
                    rows={2}
                    placeholder="e.g. Low sodium DASH diet, 30 min daily brisk walk, diabetic plate method..."
                    value={dietaryAdvice}
                    onChange={(e) => setDietaryAdvice(e.target.value)}
                    style={{ width: '100%', height: 48, fontSize: 12.5, resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* ── Footer Navigation Actions (hidden when hideFooter is true) ── */}
        {!hideFooter && (
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
              onClick={onPrevious}
              className="patient-footer-btn patient-footer-btn-secondary"
            >
              <ChevronLeft size={15} />
              <span>Previous: Past Medical History</span>
            </button>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={handleNext}
                disabled={saving}
                className="patient-footer-btn patient-footer-btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
                }}
              >
                <span>{saving ? 'Saving...' : 'Save & Next: Prescription'}</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    );
  });

export default PlanOfManagementStep;
