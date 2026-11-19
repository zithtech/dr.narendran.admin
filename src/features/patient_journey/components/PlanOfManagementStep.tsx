import { Tag } from 'antd';
import {
  Activity,
  Check,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  FlaskConical,
  Plus,
  Stethoscope,
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
      patientName,
      patientAge,
      patientGender,
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
    <div className="plan-of-management-container" style={{ padding: '24px 28px', maxWidth: 1040, margin: '0 auto' }}>
      {/* ── Subtitle & Patient Banner ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 20px',
          background: 'linear-gradient(to right, #f8fafc, #eff6ff)',
          borderRadius: 12,
          border: '1px solid #bfdbfe',
          marginBottom: 20,
          boxShadow: '0 1px 3px rgba(37, 99, 235, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: '#eff6ff',
              color: '#2563eb',
              display: 'grid',
              placeItems: 'center',
              border: '1px solid #bfdbfe',
              flexShrink: 0,
            }}
          >
            <Stethoscope size={18} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              Phase 3 · Clinical Assessment & Care Strategy
            </div>
            <div style={{ fontSize: 11.5, color: '#64748b', marginTop: 1 }}>
              Document provisional diagnosis, prescribe diagnostic investigations, and chart the management plan.
            </div>
          </div>
        </div>

        {patientName && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
            <span style={{ color: '#64748b' }}>Patient:</span>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{patientName}</span>
            {patientAge && <Tag color="blue" style={{ margin: 0, fontSize: 11, borderRadius: 10, fontWeight: 600 }}>{patientAge}</Tag>}
            {patientGender && <Tag color="geekblue" style={{ margin: 0, fontSize: 11, borderRadius: 10, fontWeight: 600 }}>{patientGender}</Tag>}
          </div>
        )}
      </div>

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
                  style={{ height: 34, fontSize: 12.5 }}
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
                style={{ height: 34, fontSize: 12.5 }}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 7,
                  background: '#f5f3ff',
                  color: '#7c3aed',
                  border: '1px solid #ddd6fe',
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <FlaskConical size={15} />
              </div>
              <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                2. Recommended Investigations &amp; Diagnostic Labs ({selectedInvestigations.length} selected)
              </h4>
            </div>

            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {selectedInvestigations.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedInvestigations([])}
                  style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 11, cursor: 'pointer', marginRight: 4 }}
                  className="hover:underline"
                >
                  Clear All
                </button>
              )}
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 16,
                    fontSize: 11.5,
                    fontWeight: activeCategory === cat ? 700 : 500,
                    border: activeCategory === cat ? '1px solid #7c3aed' : '1px solid #e2e8f0',
                    background: activeCategory === cat ? '#f5f3ff' : '#ffffff',
                    color: activeCategory === cat ? '#6d28d9' : '#64748b',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Badges */}
          {selectedInvestigations.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 6,
                padding: '10px 12px',
                background: '#faf5ff',
                borderRadius: 8,
                border: '1px solid #e9d5ff',
              }}
            >
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
                    color: '#6b21a8',
                    boxShadow: '0 1px 2px rgba(124, 58, 237, 0.06)',
                  }}
                >
                  <Check size={11} style={{ color: '#7c3aed' }} />
                  <span>{test}</span>
                  <button
                    type="button"
                    onClick={() => toggleInvestigation(test)}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#a855f7', display: 'flex', alignItems: 'center' }}
                    title={`Remove ${test}`}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Quick Choice Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 8,
              maxHeight: 220,
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
                    gap: 8,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: isSelected ? '1.5px solid #7c3aed' : '1px solid #e2e8f0',
                    background: isSelected ? '#f5f3ff' : '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      borderRadius: 4,
                      border: isSelected ? '1px solid #7c3aed' : '1px solid #cbd5e1',
                      background: isSelected ? '#7c3aed' : '#ffffff',
                      display: 'grid',
                      placeItems: 'center',
                      color: '#ffffff',
                      flexShrink: 0,
                    }}
                  >
                    {isSelected && <Check size={11} strokeWidth={3} />}
                  </div>
                  <span style={{ fontSize: 12, fontWeight: isSelected ? 650 : 500, color: isSelected ? '#581c87' : '#334155' }}>
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Custom Investigation Input */}
          <div style={{ display: 'flex', gap: 8, paddingTop: 10, borderTop: '1px solid #f1f5f9' }}>
            <input
              type="text"
              className="patient-form-input"
              placeholder="Add other custom test or imaging (e.g. 2D Echocardiogram)..."
              value={customInvestigationInput}
              onChange={(e) => setCustomInvestigationInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomInvestigation();
                }
              }}
              style={{ flex: 1, height: 34, fontSize: 12.5 }}
            />
            <button
              type="button"
              className="ui-btn ui-btn-neutral"
              onClick={addCustomInvestigation}
              disabled={!customInvestigationInput.trim()}
              style={{ height: 34, fontSize: 12, padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 6 }}
            >
              <Plus size={13} />
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
                <FileSearch size={15} />
              </div>
              <h4 style={{ margin: 0, fontSize: 13.5, fontWeight: 700, color: '#0f172a' }}>
                3. Overall Treatment Strategy &amp; Care Plan
              </h4>
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {TREATMENT_STRATEGY_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.label}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl.text)}
                  style={{
                    fontSize: 11,
                    padding: '4px 9px',
                    borderRadius: 14,
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    color: '#166534',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.15s ease',
                  }}
                  title="Click to insert template into strategy"
                >
                  + {tmpl.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 6 }}>
                Doctor's Treatment Protocol / Regimen Strategy <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                className="patient-form-input"
                rows={5}
                placeholder="Outline clinical treatment strategy, therapeutic goals, medication approach, or operative plans..."
                value={treatmentStrategy}
                onChange={(e) => setTreatmentStrategy(e.target.value)}
                style={{ width: '100%', fontSize: 12.5 }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Target Health Goals
                </label>
                <input
                  type="text"
                  className="patient-form-input"
                  placeholder="e.g. SBP < 130 mmHg, HbA1c < 7.0%, Symptom relief"
                  value={careGoals}
                  onChange={(e) => setCareGoals(e.target.value)}
                  style={{ height: 34, fontSize: 12.5 }}
                />
              </div>

              <div style={{ padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                <label style={{ fontSize: 12, fontWeight: 650, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Dietary &amp; Lifestyle Instructions
                </label>
                <input
                  type="text"
                  className="patient-form-input"
                  placeholder="e.g. Low salt diet, 30 min brisk walk, diabetic diet"
                  value={dietaryAdvice}
                  onChange={(e) => setDietaryAdvice(e.target.value)}
                  style={{ height: 34, fontSize: 12.5 }}
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
