import type { Patient } from '../../../components/PatientModal';
import { STANDARD_PRESCRIPTION_TEMPLATE_HTML } from '../../prescriptions/templates/templateData';
import { PERFORMANCE_SCALE_GUIDELINES } from '../../patient_journey/components/PlanOfManagementStep';
import type { PatientMedicalHistoryRecord } from '../types/medicalHistory.types';
import type { Prescription } from '../../prescriptions/api/prescriptionsApi';

export interface PatientSummaryPdfParams {
  patient: Patient;
  medicalRecord?: PatientMedicalHistoryRecord | null | undefined;
  prescriptions?: Prescription[] | undefined;
  doctorInfo?: {
    name?: string;
    qualification?: string;
    specialization?: string;
    registrationNumber?: string;
  };
  hospitalInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    address?: string;
    website?: string;
  };
}

function escapeHtml(text?: string | number | null): string {
  if (text === undefined || text === null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatPatientAge(dob?: string | null): string {
  if (!dob) return '—';
  try {
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return '—';
    const now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      years--;
    }
    return years >= 0 ? `${years} yrs` : '—';
  } catch {
    return '—';
  }
}

export function generatePatientSummaryHtml({
  patient,
  medicalRecord,
  prescriptions,
  doctorInfo,
  hospitalInfo,
}: PatientSummaryPdfParams): string {
  // Extract Header, Footer, and CSS from STANDARD_PRESCRIPTION_TEMPLATE_HTML
  const headerMatch = STANDARD_PRESCRIPTION_TEMPLATE_HTML.match(/<header\b[^>]*>([\s\S]*?)<\/header>/i);
  const footerMatch = STANDARD_PRESCRIPTION_TEMPLATE_HTML.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i);
  const styleMatch = STANDARD_PRESCRIPTION_TEMPLATE_HTML.match(/<style\b[^>]*>([\s\S]*?)<\/style>/i);

  let headerHtml = headerMatch ? headerMatch[0] : '';
  let footerHtml = footerMatch ? footerMatch[0] : '';
  const baseCss = styleMatch ? styleMatch[1] : '';

  // Doctor placeholders - aggressively strip all "Dr." prefixes so template's "Dr. {{doctor_name}}" never becomes "Dr. Dr."
  const rawDocName = (doctorInfo?.name || 'S. Narendran').trim();
  const cleanDocName = rawDocName.replace(/^(\s*dr\.?\s*)+/i, '').trim() || 'S. Narendran';

  let cleanDocQual = (doctorInfo?.qualification || 'M.S., M.Ch (Surg Onco)., FAIS., FICS., FMAS.').trim();
  cleanDocQual = cleanDocQual.replace(/,\s*$/, '');

  const docSpec = doctorInfo?.specialization || 'Consultant Surgical Oncologist';
  const docReg = doctorInfo?.registrationNumber || '75510';

  // Clean and robust header construction: ensure doctor name and qualifications are on separate lines
  headerHtml = headerHtml
    .replace(
      /<div\s+class=["']rx-header-right["']>[\s\S]*?<\/div>\s*<\/div>/i,
      `<div class="rx-header-right">
          <div class="rx-doctor-name">Dr. ${escapeHtml(cleanDocName)}</div>
          <div class="rx-doctor-qualification">${escapeHtml(cleanDocQual)}</div>
          <div class="rx-doctor-specialization">${escapeHtml(docSpec)}</div>
          <div class="rx-reg">Reg. No: <span class="rx-reg-number">${escapeHtml(docReg)}</span></div>
        </div>
      </div>`
    )
    .replace(/Dr\.\s*\{\{doctor_name\}\}/gi, `Dr. ${cleanDocName}`)
    .replace(/\{\{doctor_name\}\}/g, escapeHtml(cleanDocName))
    .replace(/\{\{doctor_qualification\}\}/g, escapeHtml(cleanDocQual))
    .replace(/\{\{doctor_specialization\}\}/g, escapeHtml(docSpec))
    .replace(/\{\{doctor_registration_number\}\}/g, escapeHtml(docReg));

  // Explicit safety check: eliminate any accidental "Dr. Dr." in headerHtml
  headerHtml = headerHtml.replace(/\bDr\.?\s+Dr\.?\s+/gi, 'Dr. ');

  // Hospital placeholders
  const hospPhone = hospitalInfo?.phone || '+91 97509 33333';
  const hospEmail = hospitalInfo?.email || 'info@annaamalaicancercenter.com';
  const hospAddr = hospitalInfo?.address || '12/34, Trichy Road, Coimbatore - 641 018, Tamil Nadu, India';
  const hospWeb = hospitalInfo?.website || 'www.annaamalaicancercenter.com';

  footerHtml = footerHtml
    .replace(/\{\{hospital_phone\}\}/g, escapeHtml(hospPhone))
    .replace(/\{\{hospital_email\}\}/g, escapeHtml(hospEmail))
    .replace(/\{\{hospital_address\}\}/g, escapeHtml(hospAddr))
    .replace(/\{\{hospital_website\}\}/g, escapeHtml(hospWeb))
    .replace(/\{\{hospital_name\}\}/g, escapeHtml(hospitalInfo?.name || patient.hospital_name || 'Annaamalai Cancer Center'))
    .replace(/\{\{branch_name\}\}/g, escapeHtml(patient.branch_name || 'Main Centre'))
    .replace(/\{\{prescription_id\}\}/g, '')
    .replace(/\{\{appointment_id\}\}/g, '');

  // Medical History Record Sub-Objects
  const prevMed = medicalRecord?.previous_medical_history;
  const famMed = medicalRecord?.family_medical_history;
  const reprod = medicalRecord?.reproductive_history;
  const lifestyle = medicalRecord?.lifestyle_history;
  const currentInfo = medicalRecord?.current_medical_info;

  // Performance status info
  const perfScoreRaw = currentInfo?.performance_score;
  const perfScoreNum =
    perfScoreRaw !== undefined && perfScoreRaw !== null && perfScoreRaw !== ''
      ? Number(perfScoreRaw)
    : null;
  const rawGuideline = perfScoreNum !== null ? PERFORMANCE_SCALE_GUIDELINES[perfScoreNum] : null;
  // Strictly enforce green, red, blue palette
  const perfGuideline =
    rawGuideline && perfScoreNum !== null
      ? {
          ...rawGuideline,
          color: perfScoreNum <= 1 ? '#15803d' : perfScoreNum === 2 ? '#1d4ed8' : '#b91c1c',
          bg: perfScoreNum <= 1 ? '#f0fdf4' : perfScoreNum === 2 ? '#eff6ff' : '#fef2f2',
          border: perfScoreNum <= 1 ? '#86efac' : perfScoreNum === 2 ? '#93c5fd' : '#fca5a5',
        }
      : null;

  // Emergency contact extraction
  let emContacts = '';
  if (patient.emergency_contacts) {
    if (Array.isArray(patient.emergency_contacts)) {
      emContacts = patient.emergency_contacts
        .map((c: any) => `${c.name || c.relation || 'Contact'}: ${c.phone || c.contact_number || '—'}`)
        .join(' · ');
    } else if (typeof patient.emergency_contacts === 'object') {
      const c = patient.emergency_contacts;
      emContacts = `${c.name || c.relationship || 'Emergency'}: ${c.phone || c.mobile || '—'}`;
    } else {
      emContacts = String(patient.emergency_contacts);
    }
  }

  // Address
  const fullAddress = [
    patient.address || patient.address_line_1,
    patient.address_line_2,
    patient.city,
    patient.state,
    patient.pincode,
  ]
    .filter(Boolean)
    .join(', ');

  // Ordered tests
  let orderedTests: string[] = [];
  if (currentInfo?.investigations_ordered) {
    if (Array.isArray(currentInfo.investigations_ordered)) {
      orderedTests = currentInfo.investigations_ordered;
    } else if (typeof currentInfo.investigations_ordered === 'string') {
      orderedTests = currentInfo.investigations_ordered.split('\n').map((s) => s.trim()).filter(Boolean);
    }
  }

  const outputHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(patient.name)} - Clinical Record Dossier</title>
  <style>
    ${baseCss}

    @page {
      size: A4 portrait;
      /* Balanced, professional margins */
      margin: 8mm 11mm 8mm 11mm;
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      min-height: auto !important;
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, Helvetica, sans-serif;
      color: #1e293b;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-size: 9.5px;
      line-height: 1.4;
    }

    /* Screen preview padding inside the modal iframe */
    @media screen {
      body {
        padding: 16px 20px 32px 20px;
        background: #f1f5f9;
        display: flex;
        justify-content: center;
      }
      .report-table-wrapper {
        background: #ffffff;
        box-shadow: 0 4px 28px rgba(0, 0, 0, 0.08);
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        max-width: 210mm;
        width: 100%;
        padding: 12px 18px;
      }
    }

    .report-footer-fixed {
      display: none;
    }

    @media print {
      html, body {
        width: 100% !important;
        min-height: auto !important;
        background: #ffffff !important;
      }
      .report-table-wrapper {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        max-width: none !important;
        width: 100% !important;
      }
      .report-thead {
        display: table-header-group !important;
      }
      .report-tfoot {
        display: table-footer-group !important;
      }
      /* Keep tfoot as an invisible spacer in the table layout so tbody rows never collide with the footer */
      .report-tfoot .report-footer-wrapper {
        visibility: hidden !important;
      }
      /* Pinned footer fixed to the bottom of EVERY printed page, including the last page */
      .report-footer-fixed {
        display: block !important;
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        width: 100% !important;
        z-index: 1000 !important;
      }
      .report-footer-fixed .report-footer-wrapper {
        padding-top: 0 !important;
      }
    }

    /* Outer Table Layout ensures repeating thead and tfoot across all printed pages */
    .report-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    .report-thead {
      display: table-header-group;
    }

    .report-tfoot {
      display: table-footer-group;
    }

    .report-tbody {
      display: table-row-group;
    }

    /* Header and Footer repeating wrappers */
    .report-header-wrapper {
      width: 100%;
      padding: 0 1mm 7mm 1mm !important;
    }

    .rx-tagline {
      text-align: center !important;
      color: #1e40af !important;
      font-size: 10px !important;
      font-weight: 850 !important;
      line-height: 1.25 !important;
      margin: 3.5mm 0 2mm 0 !important;
      text-transform: uppercase !important;
    }

    /* Header layout overrides: prevent doctor credentials from overflowing */
    .rx-header-row {
      width: 100% !important;
      display: table !important;
      table-layout: fixed !important;
    }

    .rx-header-left {
      width: 46% !important;
      padding-left: 0 !important;
      vertical-align: middle !important;
    }

    .rx-header-right {
      width: 54% !important;
      max-width: 54% !important;
      padding-left: 0 !important;
      padding-right: 0 !important;
      vertical-align: middle !important;
      text-align: right !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
    }

    .rx-doctor-name {
      margin: 0 0 1mm !important;
      font-size: 15px !important;
      line-height: 1.2 !important;
      font-weight: 850 !important;
      color: #000000 !important;
      white-space: normal !important;
      word-break: normal !important;
      overflow-wrap: break-word !important;
      word-wrap: break-word !important;
    }

    .rx-doctor-qualification {
      margin: 0 0 1mm !important;
      font-size: 10px !important;
      line-height: 1.25 !important;
      color: #000000 !important;
      font-weight: 750 !important;
      white-space: normal !important;
      word-break: normal !important;
      overflow-wrap: break-word !important;
      word-wrap: break-word !important;
    }

    .rx-doctor-specialization {
      margin: 0 0 1mm !important;
      font-size: 9.5px !important;
      line-height: 1.25 !important;
      color: #1e40af !important;
      font-weight: 700 !important;
      white-space: normal !important;
    }

    .rx-reg {
      margin: 0 !important;
      font-size: 9.5px !important;
      line-height: 1.2 !important;
      color: #000000 !important;
      font-weight: 800 !important;
    }

    .rx-reg-number {
      color: #1e40af !important;
      font-weight: 850 !important;
    }

    .report-footer-wrapper {
      width: 100%;
      padding: 8mm 1mm 0 1mm !important;
    }

    /* Confine the footer ribbon and elements so they NEVER project upwards into tbody content */
    .report-tfoot .rx-footer,
    .report-footer-fixed .rx-footer {
      position: relative !important;
      overflow: hidden !important;
      margin-top: 0 !important;
    }

    .report-tfoot .rx-ribbon,
    .report-footer-fixed .rx-ribbon {
      position: absolute !important;
      right: -4mm !important;
      bottom: 0 !important;
      height: 42mm !important;
      max-height: 42mm !important;
      width: 42mm !important;
      object-fit: contain !important;
      pointer-events: none !important;
      z-index: 0 !important;
      opacity: 0.82 !important;
    }

    .report-tfoot .rx-footer-line,
    .report-footer-fixed .rx-footer-line {
      width: 78% !important;
      height: 0.45mm !important;
      background: #69c9eb !important;
      margin-top: 0 !important;
      margin-bottom: 2mm !important;
    }

    /* Full-width bottom purple banner: eliminate negative margins and add generous space on left side */
    .report-tfoot .rx-bottom-band,
    .report-footer-fixed .rx-bottom-band {
      width: 100% !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      padding: 3.5mm 8mm !important;
      box-sizing: border-box !important;
      display: table !important;
      table-layout: fixed !important;
      border-radius: 0 !important;
    }

    .report-footer-wrapper,
    .report-tfoot .rx-footer,
    .report-footer-fixed .rx-footer {
      border-radius: 0 !important;
    }

    .report-tfoot .rx-bottom-left,
    .report-footer-fixed .rx-bottom-left {
      width: 44% !important;
      border-right: 0.35mm solid rgba(255,255,255,.75) !important;
      padding-left: 3mm !important;
      padding-right: 4mm !important;
      display: table-cell !important;
      vertical-align: middle !important;
    }

    .report-tfoot .rx-bottom-right,
    .report-footer-fixed .rx-bottom-right {
      width: 56% !important;
      padding-left: 6mm !important;
      display: table-cell !important;
      vertical-align: middle !important;
    }

    .report-tfoot .rx-bottom-title,
    .report-footer-fixed .rx-bottom-title {
      font-size: 9px !important;
      font-weight: 800 !important;
      letter-spacing: 0.03em !important;
      margin-bottom: 1.2mm !important;
      text-transform: uppercase !important;
      color: #ffffff !important;
      white-space: nowrap !important;
    }

    .report-tfoot .rx-bottom-link,
    .report-footer-fixed .rx-bottom-link {
      display: flex !important;
      align-items: center !important;
      gap: 1.8mm !important;
      font-size: 9.5px !important;
      font-weight: 700 !important;
      color: #ffffff !important;
      text-decoration: none !important;
      white-space: nowrap !important;
    }

    .report-content-body {
      width: 100%;
      padding: 1.5mm 1mm 4mm 1mm;
    }

    /* Section Cards - Flow naturally across pages without artificial gaps */
    .pdf-card {
      width: 100%;
      border: 1.2px solid #cbd5e1;
      border-radius: 6px;
      margin-bottom: 2.5mm;
      page-break-inside: auto !important;
      break-inside: auto !important;
      background: #ffffff;
      box-shadow: 0 0.5px 2px rgba(0, 0, 0, 0.02);
      box-decoration-break: clone;
      -webkit-box-decoration-break: clone;
      overflow: hidden;
    }

    .pdf-card-header {
      background: #f8fafc;
      border-bottom: 1.2px solid #cbd5e1;
      padding: 1.8mm 3.2mm;
      display: flex;
      justify-content: space-between;
      align-items: center;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-after: avoid !important;
      break-after: avoid !important;
    }

    .pdf-card-title {
      font-size: 9.5px;
      font-weight: 850;
      color: #000000;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .pdf-card-badge {
      font-size: 8px;
      font-weight: 800;
      color: #1e40af;
      background: #eff6ff;
      border: 1px solid #93c5fd;
      padding: 1px 6px;
      border-radius: 3px;
    }

    .pdf-card-body {
      padding: 2.5mm 3.5mm;
    }

    /* Sub-blocks inside card: avoid splitting mid-sentence or mid-block, but allow card to break between them */
    .pdf-sub-block {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      margin-bottom: 2mm;
    }

    /* Grid Layouts - Compact and balanced */
    .pdf-grid-2 {
      width: 100%;
      display: table;
      table-layout: fixed;
      margin-bottom: 2mm;
    }

    .pdf-grid-3 {
      width: 100%;
      display: table;
      table-layout: fixed;
      margin-bottom: 2mm;
    }

    .pdf-grid-6 {
      width: 100%;
      display: table;
      table-layout: fixed;
      margin-bottom: 2mm;
      box-sizing: border-box;
    }

    .pdf-grid-cell {
      display: table-cell;
      vertical-align: top;
      padding: 1mm 2mm;
    }

    .pdf-grid-6 .pdf-grid-cell {
      padding: 1mm 1.5mm;
    }

    .pdf-grid-6 .pdf-grid-cell:first-child {
      padding-left: 0 !important;
    }

    .pdf-grid-6 .pdf-grid-cell:last-child {
      padding-right: 0 !important;
    }

    .pdf-label {
      font-size: 7.5px;
      font-weight: 800;
      color: #000000; /* Black for labels */
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin-bottom: 0.6mm;
      display: block;
    }

    .pdf-value {
      font-size: 9.5px;
      color: #4b5563; /* Gray for values */
      font-weight: 500;
      line-height: 1.35;
    }

    .pdf-value strong {
      font-weight: 700;
      color: #374151; /* Darker gray for bold values */
    }

    /* Metric Highlight Boxes (for Vitals) - Compact single row dashboard */
    .pdf-metric-box {
      background: #f8fafc;
      border: 1.2px solid #cbd5e1;
      border-radius: 5px;
      padding: 1.6mm 1.2mm;
      text-align: center;
      box-sizing: border-box;
      width: 100%;
    }

    .pdf-metric-box .pdf-label {
      font-size: 7px;
      font-weight: 800;
      color: #000000; /* Black for label */
      margin-bottom: 0.6mm;
      white-space: nowrap;
      overflow: visible;
      text-overflow: clip;
    }

    .pdf-metric-box .pdf-val-metric {
      font-size: 11px;
      font-weight: 800;
      color: #374151; /* Gray for metric value */
      white-space: nowrap;
    }

    /* Inner Data Tables - Crisp, readable, and space-efficient */
    .pdf-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1.5mm;
      font-size: 8.5px;
    }

    .pdf-table tr {
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .pdf-table thead {
      display: table-header-group;
    }

    .pdf-table th {
      background: #f1f5f9;
      color: #000000; /* Black for table header label */
      font-weight: 850;
      text-align: left;
      padding: 1.6mm 2.5mm;
      border: 1px solid #cbd5e1;
      font-size: 7.5px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }

    .pdf-table td {
      padding: 1.6mm 2.5mm;
      border: 0.5px solid #cbd5e1;
      color: #4b5563; /* Gray for table values */
      font-weight: 500;
      vertical-align: middle;
      line-height: 1.35;
    }

    .pdf-table td strong {
      color: #374151;
      font-weight: 700;
    }

    .pdf-table tbody tr:nth-child(even) {
      background: #f8fafc;
    }

    /* Pill Badges - Sleek & compact (Strictly Green, Red, Blue, and Bold Black) */
    .pdf-pill {
      display: inline-block;
      padding: 1.5px 6.5px;
      border-radius: 4px;
      font-size: 8px;
      font-weight: 800;
      margin-right: 4px;
      margin-bottom: 3px;
      line-height: 1.3;
    }
    .pdf-pill-blue { background: #eff6ff; color: #1e40af; border: 1px solid #93c5fd; }
    .pdf-pill-green { background: #f0fdf4; color: #15803d; border: 1px solid #86efac; }
    .pdf-pill-red { background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; }
    .pdf-pill-purple { background: #eff6ff; color: #1e40af; border: 1px solid #93c5fd; }
    .pdf-pill-amber { background: #fef2f2; color: #b91c1c; border: 1px solid #fca5a5; }

    /* Performance Status Box - Compact & elegant */
    .pdf-perf-box {
      border-radius: 6px;
      padding: 2mm 3.2mm;
      margin-bottom: 2mm;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .pdf-perf-score {
      font-size: 16px;
      font-weight: 900;
      line-height: 1;
      padding: 3.5px 9px;
      border-radius: 5px;
      text-align: center;
      flex-shrink: 0;
    }

    /* Doctor Signature Block - Compact */
    .pdf-signature-block {
      page-break-inside: avoid;
      break-inside: avoid;
      margin-top: 3.5mm;
      padding-top: 2.5mm;
      border-top: 1.5px dashed #000000;
      display: table;
      width: 100%;
    }

    .pdf-signature-left {
      display: table-cell;
      vertical-align: top;
      width: 60%;
      font-size: 8px;
      color: #000000;
      font-weight: 650;
      line-height: 1.35;
      padding-right: 5mm;
    }

    .pdf-signature-right {
      display: table-cell;
      vertical-align: top;
      width: 40%;
      text-align: right;
    }

    .pdf-signature-line {
      width: 44mm;
      border-bottom: 2px solid #000000;
      margin-left: auto;
      margin-bottom: 1.5mm;
      height: 9mm;
    }

    .pdf-signature-name {
      font-size: 11px;
      font-weight: 850;
      color: #000000;
    }

    .pdf-signature-title {
      font-size: 8.5px;
      font-weight: 750;
      color: #1e40af;
      margin-top: 0.3mm;
    }
      font-size: 8.5px;
      color: #475569;
      margin-top: 0.3mm;
    }
  </style>
</head>
<body>

  <!-- Pinned footer in print mode: rendered at the bottom of every page (including last page) -->
  <div class="report-footer-fixed">
    <div class="report-footer-wrapper">
      ${footerHtml}
    </div>
  </div>

  <div class="report-table-wrapper">
    <table class="report-table">
      <!-- Header repeated on every printed page -->
      <thead class="report-thead">
        <tr>
          <td>
            <div class="report-header-wrapper">
              ${headerHtml}
            </div>
          </td>
        </tr>
      </thead>

      <!-- Body of report -->
      <tbody class="report-tbody">
        <tr>
          <td>
            <div class="report-content-body">

              <!-- 1. FULL PATIENT DETAILS & DEMOGRAPHICS -->
              <div class="pdf-card">
                <div class="pdf-card-header">
                  <h3 class="pdf-card-title">1. Patient Profile &amp; Demographics</h3>
                  <span class="pdf-card-badge">UHID: ${escapeHtml(patient.patient_id || patient.id.slice(0, 8).toUpperCase())}</span>
                </div>
                <div class="pdf-card-body">
                  <div class="pdf-grid-3">
                    <div class="pdf-grid-cell">
                      <span class="pdf-label">Full Name</span>
                      <span class="pdf-value"><strong>${escapeHtml(patient.name)}</strong></span>
                    </div>
                    <div class="pdf-grid-cell">
                      <span class="pdf-label">Age / Gender</span>
                      <span class="pdf-value">${formatPatientAge(patient.date_of_birth)} / ${escapeHtml(patient.gender || '—')}</span>
                    </div>
                    <div class="pdf-grid-cell">
                      <span class="pdf-label">Blood Group</span>
                      <span class="pdf-value"><strong>${escapeHtml(patient.blood_group || '—')}</strong></span>
                    </div>
                  </div>

                  <div class="pdf-grid-3">
                    <div class="pdf-grid-cell">
                      <span class="pdf-label">Date of Birth</span>
                      <span class="pdf-value">${formatDate(patient.date_of_birth)}</span>
                    </div>
                    <div class="pdf-grid-cell">
                      <span class="pdf-label">Primary Phone</span>
                      <span class="pdf-value">${escapeHtml(patient.phone || '—')}</span>
                    </div>
                    <div class="pdf-grid-cell">
                      <span class="pdf-label">Email Address</span>
                      <span class="pdf-value">${escapeHtml(patient.email || '—')}</span>
                    </div>
                  </div>

                  <div class="pdf-grid-3">
                    <div class="pdf-grid-cell">
                      <span class="pdf-label">Marital Status</span>
                      <span class="pdf-value">${escapeHtml(patient.marital_status || reprod?.marital_status || '—')}</span>
                    </div>
                    <div class="pdf-grid-cell">
                      <span class="pdf-label">Occupation</span>
                      <span class="pdf-value">${escapeHtml(patient.occupation || '—')}</span>
                    </div>
                    <div class="pdf-grid-cell">
                      <span class="pdf-label">Emergency Contacts</span>
                      <span class="pdf-value">${escapeHtml(emContacts || '—')}</span>
                    </div>
                  </div>

                  <div class="pdf-grid-2" style="margin-bottom: 0;">
                    <div class="pdf-grid-cell" style="width: 70%;">
                      <span class="pdf-label">Residential Address</span>
                      <span class="pdf-value">${escapeHtml(fullAddress || '—')}</span>
                    </div>
                    <div class="pdf-grid-cell" style="width: 30%;">
                      <span class="pdf-label">Hospital Branch</span>
                      <span class="pdf-value">${escapeHtml(patient.branch_name || patient.hospital_name || 'Main Centre')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 2. OVERVIEW: PHYSICAL VITALS & BIOMETRICS -->
              <div class="pdf-card">
                <div class="pdf-card-header">
                  <h3 class="pdf-card-title">2. Physical Vitals &amp; Biometric Overview</h3>
                  <span class="pdf-card-badge">Clinical Baseline</span>
                </div>
                <div class="pdf-card-body">
                  ${(() => {
                    const ht = Number(patient.height_cm || currentInfo?.height_cm);
                    const wt = Number(patient.weight_kg || currentInfo?.weight_kg);
                    let bmi = currentInfo?.bmi ? Number(currentInfo.bmi) : null;
                    if (!bmi && ht > 0 && wt > 0) {
                      bmi = Number((wt / ((ht / 100) * (ht / 100))).toFixed(1));
                    }
                    const htWtStr = (patient.height_cm || currentInfo?.height_cm) && (patient.weight_kg || currentInfo?.weight_kg)
                      ? `${patient.height_cm || currentInfo?.height_cm}cm / ${patient.weight_kg || currentInfo?.weight_kg}kg`
                      : '—';
                    return `
                      <div class="pdf-grid-6" style="margin-bottom: 0;">
                        <div class="pdf-grid-cell" style="width: 13%;">
                          <div class="pdf-metric-box">
                            <span class="pdf-label">Blood Pressure</span>
                            <div class="pdf-val-metric">${escapeHtml(patient.blood_pressure || currentInfo?.blood_pressure || '—')}</div>
                          </div>
                        </div>
                        <div class="pdf-grid-cell" style="width: 11%;">
                          <div class="pdf-metric-box">
                            <span class="pdf-label">Pulse Rate</span>
                            <div class="pdf-val-metric">${escapeHtml(currentInfo?.pulse_rate ? `${currentInfo.pulse_rate} bpm` : '—')}</div>
                          </div>
                        </div>
                        <div class="pdf-grid-cell" style="width: 11%;">
                          <div class="pdf-metric-box">
                            <span class="pdf-label">Body Temp</span>
                            <div class="pdf-val-metric">${escapeHtml(patient.body_temperature || (currentInfo?.temperature ? `${currentInfo.temperature} °F` : '—'))}</div>
                          </div>
                        </div>
                        <div class="pdf-grid-cell" style="width: 12%;">
                          <div class="pdf-metric-box">
                            <span class="pdf-label">SpO2 (Oxygen)</span>
                            <div class="pdf-val-metric">${escapeHtml(currentInfo?.oxygen_saturation ? `${currentInfo.oxygen_saturation} %` : '—')}</div>
                          </div>
                        </div>
                        <div class="pdf-grid-cell" style="width: 12%;">
                          <div class="pdf-metric-box">
                            <span class="pdf-label">Blood Sugar</span>
                            <div class="pdf-val-metric">${escapeHtml(patient.blood_sugar || currentInfo?.blood_sugar || '—')}</div>
                          </div>
                        </div>
                        <div class="pdf-grid-cell" style="width: 41%;">
                          <div class="pdf-metric-box" style="padding: 1.6mm 1.5mm;">
                            <span class="pdf-label" style="text-overflow: clip; overflow: visible; white-space: nowrap;">Height / Weight / BMI</span>
                            <div class="pdf-val-metric" style="font-size: 9.5px; font-weight: 800; white-space: nowrap;">
                              ${htWtStr}${bmi ? ` · ${bmi}` : ''}
                            </div>
                          </div>
                        </div>
                      </div>
                    `;
                  })()}
                </div>
              </div>

              <!-- 3. PREVIOUS MEDICAL HISTORY & CHRONIC DISEASES -->
              <div class="pdf-card">
                <div class="pdf-card-header">
                  <h3 class="pdf-card-title">3. Previous Medical History &amp; Chronic Diseases</h3>
                  <span class="pdf-card-badge">History &amp; Treatments</span>
                </div>
                <div class="pdf-card-body">
                  <!-- Allergies -->
                  <div class="pdf-sub-block">
                    <span class="pdf-label">Documented Allergies</span>
                    <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 0.6mm;">
                      ${prevMed?.allergies?.medicine_allergies
                        ? `<span class="pdf-pill pdf-pill-red">Drug: ${escapeHtml(prevMed.allergies.medicine_allergies)}</span>`
                        : '<span class="pdf-pill pdf-pill-green">No Known Drug Allergies (NKDA)</span>'}
                      ${prevMed?.allergies?.food_allergies
                        ? `<span class="pdf-pill pdf-pill-red">Food: ${escapeHtml(prevMed.allergies.food_allergies)}</span>`
                        : ''}
                      ${prevMed?.allergies?.other_allergies
                        ? `<span class="pdf-pill pdf-pill-blue">Other: ${escapeHtml(prevMed.allergies.other_allergies)}</span>`
                        : ''}
                    </div>
                  </div>

                  <!-- Chronic Diseases List -->
                  ${prevMed?.chronic_diseases && prevMed.chronic_diseases.length > 0 ? `
                    <div class="pdf-sub-block">
                      <span class="pdf-label">Chronic Conditions &amp; Co-morbidities</span>
                      <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 0.6mm;">
                        ${prevMed.chronic_diseases.map((d) => `<span class="pdf-pill pdf-pill-blue">${escapeHtml(d)}</span>`).join('')}
                      </div>
                    </div>
                  ` : ''}

                  <!-- Previous Diseases Table -->
                  ${prevMed?.previous_diseases && prevMed.previous_diseases.length > 0 ? `
                    <div class="pdf-sub-block">
                      <span class="pdf-label">Past Illnesses &amp; Hospital Records</span>
                      <table class="pdf-table">
                        <thead>
                          <tr>
                            <th>Condition / Disease</th>
                            <th>Diagnosis Date</th>
                            <th>Treatment Details</th>
                            <th>Current Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${prevMed.previous_diseases.map((dis) => `
                            <tr>
                              <td><strong>${escapeHtml(dis.disease_name)}</strong></td>
                              <td>${formatDate(dis.diagnosis_date)}</td>
                              <td>${escapeHtml(dis.treatment_details || '—')}</td>
                              <td>${escapeHtml(dis.current_status || '—')}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  ` : ''}

                  <!-- Surgeries -->
                  ${prevMed?.surgeries && prevMed.surgeries.length > 0 ? `
                    <div class="pdf-sub-block">
                      <span class="pdf-label">Past Surgical Interventions</span>
                      <table class="pdf-table">
                        <thead>
                          <tr>
                            <th>Surgical Procedure</th>
                            <th>Date</th>
                            <th>Hospital / Centre</th>
                            <th>Surgeon</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${prevMed.surgeries.map((surg) => `
                            <tr>
                              <td><strong>${escapeHtml(surg.surgery_name)}</strong></td>
                              <td>${formatDate(surg.surgery_date)}</td>
                              <td>${escapeHtml(surg.hospital_name || '—')}</td>
                              <td>${escapeHtml(surg.surgeon_name || '—')}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  ` : ''}

                  <!-- Blood Transfusions -->
                  <div class="pdf-sub-block">
                    <div class="pdf-grid-2" style="margin-bottom: 0;">
                      <div class="pdf-grid-cell">
                        <span class="pdf-label">Blood Transfusion History</span>
                        <span class="pdf-value">
                          ${prevMed?.blood_transfusions?.had_transfusion === true || String(prevMed?.blood_transfusions?.had_transfusion).toLowerCase() === 'yes'
                            ? `Yes (${escapeHtml(prevMed?.blood_transfusions?.number_of_units || 1)} units) · Date: ${formatDate(prevMed?.blood_transfusions?.transfusion_date)} ${prevMed?.blood_transfusions?.reactions ? `· Reaction: ${escapeHtml(prevMed?.blood_transfusions?.reactions)}` : ''}`
                            : 'No Blood Transfusions Recorded'}
                        </span>
                      </div>
                      <div class="pdf-grid-cell">
                        <span class="pdf-label">Ongoing Medical Care</span>
                        <span class="pdf-value">${escapeHtml(prevMed?.ongoing_treatments || 'None documented')}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Ongoing Medications -->
                  ${prevMed?.current_medications && prevMed.current_medications.length > 0 ? `
                    <div class="pdf-sub-block" style="margin-top: 2mm;">
                      <span class="pdf-label">Current / Ongoing Medications</span>
                      <table class="pdf-table">
                        <thead>
                          <tr>
                            <th>Medicine</th>
                            <th>Dosage</th>
                            <th>Frequency</th>
                            <th>Route</th>
                            <th>Started</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${prevMed.current_medications.map((m) => `
                            <tr>
                              <td><strong>${escapeHtml(m.medicine_name)}</strong></td>
                              <td>${escapeHtml(m.dosage || '—')}</td>
                              <td>${escapeHtml(m.frequency || '—')}</td>
                              <td>${escapeHtml(m.route || 'Oral')}</td>
                              <td>${formatDate(m.started_date)}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- 4. FAMILY, REPRODUCTIVE & LIFESTYLE HISTORY -->
              <div class="pdf-card">
                <div class="pdf-card-header">
                  <h3 class="pdf-card-title">4. Family, Reproductive &amp; Lifestyle Profile</h3>
                  <span class="pdf-card-badge">Risk Factors</span>
                </div>
                <div class="pdf-card-body">
                  <!-- Family History -->
                  <div class="pdf-sub-block">
                    <span class="pdf-label">Family Medical &amp; Oncology History</span>
                    ${famMed?.members && famMed.members.length > 0 ? `
                      <table class="pdf-table">
                        <thead>
                          <tr>
                            <th>Relation</th>
                            <th>Disease / Malignancy</th>
                            <th>Age at Diagnosis</th>
                            <th>Health Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${famMed.members.map((fm) => `
                            <tr>
                              <td><strong>${escapeHtml(fm.relationship)}</strong></td>
                              <td>${escapeHtml(fm.disease_name)}</td>
                              <td>${escapeHtml(fm.age_at_diagnosis || '—')}</td>
                              <td>${escapeHtml(fm.current_health_status || '—')}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    ` : '<span class="pdf-value" style="color: #64748b;">No significant hereditary or malignant familial conditions documented.</span>'}
                  </div>

                  <!-- Reproductive / Obstetric History (if female or applicable) -->
                  ${reprod && (reprod.is_applicable || patient.gender?.toLowerCase() === 'female') ? `
                    <div class="pdf-sub-block" style="padding-top: 1.8mm; border-top: 0.5px solid #f1f5f9;">
                      <span class="pdf-label">Obstetric &amp; Reproductive History</span>
                      <div class="pdf-grid-3">
                        <div class="pdf-grid-cell">
                          <span class="pdf-label">Menarche / Menopause</span>
                          <span class="pdf-value">${escapeHtml(reprod.age_at_menarche || '—')} yrs / ${escapeHtml(reprod.age_at_menopause || '—')} yrs</span>
                        </div>
                        <div class="pdf-grid-cell">
                          <span class="pdf-label">Menstrual Status</span>
                          <span class="pdf-value">${escapeHtml(reprod.menstrual_status || '—')}</span>
                        </div>
                        <div class="pdf-grid-cell">
                          <span class="pdf-label">Parity (G/P/L/A)</span>
                          <span class="pdf-value">
                            P: ${escapeHtml(reprod.number_of_pregnancies || 0)}, D: ${escapeHtml(reprod.number_of_deliveries || 0)}, L: ${escapeHtml(reprod.number_of_living_children || 0)}, A: ${escapeHtml(reprod.number_of_abortions || 0)}
                          </span>
                        </div>
                      </div>
                      <div class="pdf-grid-2" style="margin-bottom: 0;">
                        <div class="pdf-grid-cell">
                          <span class="pdf-label">Breastfeeding History</span>
                          <span class="pdf-value">${escapeHtml(reprod.breastfeeding_history ? `Yes (${reprod.breastfeeding_duration || 'Documented'})` : 'No / None')}</span>
                        </div>
                        <div class="pdf-grid-cell">
                          <span class="pdf-label">Contraceptives &amp; Hormone Therapy</span>
                          <span class="pdf-value">${escapeHtml(reprod.contraceptive_usage || reprod.hormone_therapy_history || 'None documented')}</span>
                        </div>
                      </div>
                    </div>
                  ` : ''}

                  <!-- Lifestyle Habits -->
                  <div class="pdf-sub-block" style="padding-top: 1.8mm; border-top: 0.5px solid #f1f5f9;">
                    <span class="pdf-label">Lifestyle Factors &amp; Habits</span>
                    <div class="pdf-grid-3">
                      <div class="pdf-grid-cell">
                        <span class="pdf-label">Smoking Status</span>
                        <span class="pdf-value">${escapeHtml(lifestyle?.smoking_status || 'Non-Smoker')}</span>
                      </div>
                      <div class="pdf-grid-cell">
                        <span class="pdf-label">Alcohol Consumption</span>
                        <span class="pdf-value">${escapeHtml(lifestyle?.alcohol_consumption || 'Non-Drinker')}</span>
                      </div>
                      <div class="pdf-grid-cell">
                        <span class="pdf-label">Tobacco / Betel Nut</span>
                        <span class="pdf-value">${escapeHtml(lifestyle?.tobacco_usage || lifestyle?.chewing_tobacco || 'No')}</span>
                      </div>
                    </div>
                    <div class="pdf-grid-3" style="margin-bottom: 0;">
                      <div class="pdf-grid-cell">
                        <span class="pdf-label">Dietary Pattern</span>
                        <span class="pdf-value">${escapeHtml(lifestyle?.diet_type || 'Mixed / Standard')}</span>
                      </div>
                      <div class="pdf-grid-cell">
                        <span class="pdf-label">Physical Activity</span>
                        <span class="pdf-value">${escapeHtml(lifestyle?.physical_activity_level || 'Sedentary to Moderate')}</span>
                      </div>
                      <div class="pdf-grid-cell">
                        <span class="pdf-label">Sleep &amp; Occupational</span>
                        <span class="pdf-value">${escapeHtml(lifestyle?.sleep_pattern || lifestyle?.occupational_exposure || 'Normal')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 5. CURRENT MEDICAL INFORMATION & CLINICAL EXAMINATION -->
              <div class="pdf-card">
                <div class="pdf-card-header">
                  <h3 class="pdf-card-title">5. Current Medical Information &amp; Clinical Exam</h3>
                  <span class="pdf-card-badge">Presenting Illness</span>
                </div>
                <div class="pdf-card-body">
                  <div class="pdf-sub-block">
                    <div class="pdf-grid-2">
                      <div class="pdf-grid-cell">
                        <span class="pdf-label">Chief Complaint &amp; Symptoms</span>
                        <span class="pdf-value"><strong>${escapeHtml(currentInfo?.chief_complaint || 'General Oncological Consultation / Review')}</strong></span>
                      </div>
                      <div class="pdf-grid-cell">
                        <span class="pdf-label">Duration of Symptoms</span>
                        <span class="pdf-value">${escapeHtml(currentInfo?.duration_of_symptoms || '—')}</span>
                      </div>
                    </div>
                  </div>

                  ${currentInfo?.current_symptoms ? `
                    <div class="pdf-sub-block" style="background: #eff6ff; border: 1px solid #bfdbfe; border-left: 3.5px solid #2563eb; padding: 2mm 3mm; border-radius: 5px;">
                      <span class="pdf-label" style="color: #1e40af; font-weight: 850; margin-bottom: 0.4mm;">Symptom Details &amp; History of Present Illness</span>
                      <div class="pdf-value" style="white-space: pre-line; margin-top: 0.5mm; font-weight: 500; color: #4b5563;">${escapeHtml(currentInfo.current_symptoms)}</div>
                    </div>
                  ` : ''}

                  <div class="pdf-sub-block">
                    <div class="pdf-grid-2" style="margin-bottom: 0;">
                      <div class="pdf-grid-cell">
                        <span class="pdf-label">Pain Scale Assessment</span>
                        <span class="pdf-value">
                          ${currentInfo?.pain_level !== undefined && currentInfo?.pain_level !== null
                            ? `<strong>${currentInfo.pain_level} / 10</strong> ${
                                Number(currentInfo.pain_level) === 0
                                  ? '<span style="color: #15803d; font-weight: 800;">(No Pain)</span>'
                                  : Number(currentInfo.pain_level) <= 3
                                    ? '<span style="color: #1e40af; font-weight: 800;">(Mild)</span>'
                                    : `<span style="color: #b91c1c; font-weight: 800;">${Number(currentInfo.pain_level) <= 6 ? '(Moderate)' : '(Severe)'}</span>`
                              }`
                            : '<span style="color: #15803d; font-weight: 800;">Not Reported (0/10)</span>'}
                        </span>
                      </div>
                      <div class="pdf-grid-cell">
                        <span class="pdf-label">Prior Medication Underway</span>
                        <span class="pdf-value">${escapeHtml(currentInfo?.already_taking_tablets || 'None')}</span>
                      </div>
                    </div>
                  </div>

                  ${currentInfo?.clinical_observations ? `
                    <div class="pdf-sub-block" style="padding-top: 2mm; border-top: 0.5px solid #f1f5f9;">
                      <span class="pdf-label" style="margin-bottom: 0.4mm;">Physical &amp; Clinical Examination Observations</span>
                      <div class="pdf-value" style="white-space: pre-line; margin-top: 0.5mm; font-weight: 500; color: #4b5563;">${escapeHtml(currentInfo.clinical_observations)}</div>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- 6. PLAN OF MANAGEMENT & CARE STRATEGY -->
              <div class="pdf-card">
                <div class="pdf-card-header">
                  <h3 class="pdf-card-title">6. Plan of Management &amp; Treatment Strategy</h3>
                  <span class="pdf-card-badge">Clinical Roadmap</span>
                </div>
                <div class="pdf-card-body">
                  <!-- Clinical Diagnosis -->
                  <div class="pdf-sub-block">
                    <span class="pdf-label">Doctor's Clinical / Provisional Diagnosis</span>
                    <div class="pdf-value" style="font-size: 11.5px; font-weight: 750; color: #374151; margin-top: 0.3mm;">
                      ${escapeHtml(currentInfo?.current_diagnosis || 'Clinical Consultation Underway')}
                    </div>
                    ${currentInfo?.differential_diagnosis ? `
                      <div style="font-size: 9px; color: #1e40af; font-weight: 750; margin-top: 0.5mm;">
                        <strong>Differential Diagnosis:</strong> ${escapeHtml(currentInfo.differential_diagnosis)}
                      </div>
                    ` : ''}
                  </div>

                  <!-- Performance Status Card -->
                  ${perfScoreNum !== null && perfGuideline ? `
                    <div class="pdf-sub-block">
                      <div class="pdf-perf-box" style="background: ${perfGuideline.bg}; border: 1px solid ${perfGuideline.border};">
                        <div class="pdf-perf-score" style="background: ${perfGuideline.color}; color: #ffffff;">
                          ${perfScoreNum}
                        </div>
                        <div>
                          <div style="font-weight: 850; font-size: 10px; color: ${perfGuideline.color};">
                            ${escapeHtml(perfGuideline.title)}
                          </div>
                          <div style="font-size: 8.5px; color: #4b5563; font-weight: 500; margin-top: 0.5mm; line-height: 1.3;">
                            ${escapeHtml(currentInfo?.performance_description || perfGuideline.desc)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ` : ''}

                  <!-- Recommended Investigations -->
                  <div class="pdf-sub-block">
                    <span class="pdf-label">Recommended Diagnostic Investigations &amp; Laboratory Panels (${orderedTests.length})</span>
                    ${orderedTests.length > 0 ? `
                      <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 1mm;">
                        ${orderedTests.map((t) => `<span class="pdf-pill pdf-pill-blue">✓ ${escapeHtml(t)}</span>`).join('')}
                      </div>
                    ` : '<span class="pdf-value" style="color: #64748b;">No specific diagnostic laboratory or imaging tests ordered at this visit.</span>'}
                  </div>

                  <!-- Overall Treatment Strategy -->
                  <div class="pdf-sub-block">
                    <span class="pdf-label">Overall Treatment Strategy &amp; Care Plan</span>
                    <div class="pdf-value" style="white-space: pre-line; background: #f8fafc; padding: 2mm 3mm; border-radius: 5px; border: 0.5px solid #cbd5e1; border-left: 3.5px solid #2563eb; margin-top: 0.8mm; color: #4b5563; font-weight: 500;">
                      ${escapeHtml(currentInfo?.treatment_strategy || 'Continue supportive medical care and scheduled monitoring.')}
                    </div>
                  </div>

                  <!-- Care Goals & Dietary Instructions -->
                  <div class="pdf-sub-block">
                    <div class="pdf-grid-2" style="margin-bottom: 0;">
                      <div class="pdf-grid-cell">
                        <span class="pdf-label">Target Health Goals &amp; Expected Outcomes</span>
                        <div class="pdf-value" style="white-space: pre-line; margin-top: 0.5mm;">${escapeHtml(currentInfo?.care_goals || 'Disease remission, symptom relief, optimal functional capacity.')}</div>
                      </div>
                      <div class="pdf-grid-cell">
                        <span class="pdf-label">Dietary Instructions &amp; Lifestyle Advice</span>
                        <div class="pdf-value" style="white-space: pre-line; margin-top: 0.5mm;">${escapeHtml(currentInfo?.dietary_advice || 'Nutritious balanced diet, hydration, and light physical activity as tolerated.')}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              ${(() => {
                const rxList: Prescription[] = Array.isArray(prescriptions) ? prescriptions : [];
                const currentMedsFallback = prevMed?.current_medications || [];

                if (rxList.length > 0) {
                  return rxList
                    .map((rx, rxIdx) => {
                      const rxNum = rx.prescription_number || `RX-${rx.id.slice(0, 8).toUpperCase()}`;
                      const rxDate = formatDate(rx.prescription_date || rx.created_at);
                      const rxDoc = rx.doctor?.name ? `Dr. ${rx.doctor.name.replace(/^(\s*dr\.?\s*)+/i, '')}` : `Dr. ${cleanDocName}`;
                      const rxStatus = (rx.status || 'active').toUpperCase();
                      const followUpText = rx.follow_up_days
                        ? `Follow-up in ${rx.follow_up_days} days`
                        : rx.follow_up_date
                          ? `Follow-up on ${formatDate(rx.follow_up_date)}`
                          : null;

                      const meds = Array.isArray(rx.medicines) ? rx.medicines : [];
                      const labTests = Array.isArray(rx.lab_tests) ? rx.lab_tests : [];

                      return `
              <!-- 7. AUTHORIZED PRESCRIPTIONS & CLINICAL RX REGIMEN -->
              <div class="pdf-card">
                <div class="pdf-card-header">
                  <h3 class="pdf-card-title">7${rxList.length > 1 ? `.${rxIdx + 1}` : ''}. Authorized Prescription &amp; Clinical Rx Regimen</h3>
                  <span class="pdf-card-badge">Rx No: ${escapeHtml(rxNum)}</span>
                </div>
                <div class="pdf-card-body">
                  <!-- Prescription Metadata Bar -->
                  <div class="pdf-sub-block" style="background: #f8fafc; border: 0.5px solid #e2e8f0; border-radius: 5px; padding: 1.8mm 2.5mm; margin-bottom: 2mm;">
                    <div class="pdf-grid-3" style="margin-bottom: 0;">
                      <div class="pdf-grid-cell">
                        <span class="pdf-label">Prescription No &amp; Date</span>
                        <span class="pdf-value"><strong>${escapeHtml(rxNum)}</strong> · ${rxDate}</span>
                      </div>
                      <div class="pdf-grid-cell">
                        <span class="pdf-label">Prescribing Physician</span>
                        <span class="pdf-value"><strong>${escapeHtml(rxDoc)}</strong></span>
                      </div>
                      <div class="pdf-grid-cell">
                        <span class="pdf-label">Status &amp; Follow-Up</span>
                        <span class="pdf-value">
                          <span class="pdf-pill ${rxStatus === 'ACTIVE' ? 'pdf-pill-green' : 'pdf-pill-blue'}" style="margin: 0 4px 0 0;">${escapeHtml(rxStatus)}</span>
                          ${followUpText ? `<span class="pdf-pill pdf-pill-blue" style="margin: 0;">${escapeHtml(followUpText)}</span>` : ''}
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Medicines Table -->
                  <div class="pdf-sub-block">
                    <span class="pdf-label">Prescribed Medications &amp; Dosage Instructions (${meds.length})</span>
                    ${meds.length > 0 ? `
                      <table class="pdf-table">
                        <thead>
                          <tr>
                            <th style="width: 5%; text-align: center;">#</th>
                            <th style="width: 32%;">Medicine Name &amp; Strength</th>
                            <th style="width: 14%;">Dosage</th>
                            <th style="width: 18%;">Frequency / Timing</th>
                            <th style="width: 13%;">Duration</th>
                            <th style="width: 18%;">Food &amp; Instructions</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${meds.map((m, mIdx) => `
                            <tr>
                              <td style="text-align: center; color: #6b7280; font-weight: 600;">${mIdx + 1}</td>
                              <td>
                                <div style="font-weight: 700; color: #374151; font-size: 9.5px;">${escapeHtml(m.medicine_name)}</div>
                                ${m.strength ? `<div style="font-size: 8px; color: #1e40af; font-weight: 800; margin-top: 0.3mm;">Strength: ${escapeHtml(m.strength)}</div>` : ''}
                              </td>
                              <td>
                                <span style="font-weight: 600; color: #4b5563;">${escapeHtml(m.dosage || '1 unit')}</span>
                              </td>
                              <td>
                                <span class="pdf-pill pdf-pill-blue" style="margin: 0; font-size: 8px; font-weight: 800;">${escapeHtml(m.frequency || 'As directed')}</span>
                              </td>
                              <td>
                                <span style="font-weight: 600; color: #4b5563;">${escapeHtml(m.duration || '—')}</span>
                              </td>
                              <td>
                                ${m.food_instruction ? `<span class="pdf-pill ${m.food_instruction.toLowerCase().includes('after') ? 'pdf-pill-green' : 'pdf-pill-blue'}" style="margin: 0 0 2px 0; font-size: 7.5px; display: inline-block;">${escapeHtml(m.food_instruction)}</span><br/>` : ''}
                                <span style="font-size: 8px; color: #6b7280; font-weight: 500;">${escapeHtml(m.instructions || 'As advised')}</span>
                              </td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    ` : '<div class="pdf-value" style="color: #64748b; padding: 1mm 0;">No individual medicines itemized on this prescription.</div>'}
                  </div>

                  <!-- Prescribed Lab Tests (if any) -->
                  ${labTests.length > 0 ? `
                    <div class="pdf-sub-block" style="margin-top: 2mm; padding-top: 1.8mm; border-top: 0.5px solid #f1f5f9;">
                      <span class="pdf-label">Ordered Diagnostic Investigations &amp; Panels (${labTests.length})</span>
                      <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 1mm;">
                        ${labTests.map((t) => `<span class="pdf-pill pdf-pill-blue">✓ ${escapeHtml(t.test_name)}${t.instructions ? ` (${escapeHtml(t.instructions)})` : ''}</span>`).join('')}
                      </div>
                    </div>
                  ` : ''}

                  <!-- Doctor's Advice / Special Instructions -->
                  ${rx.additional_notes ? `
                    <div class="pdf-sub-block" style="margin-top: 2mm; padding-top: 1.8mm; border-top: 0.5px solid #f1f5f9;">
                      <span class="pdf-label">Doctor's Advice &amp; Special Clinical Instructions</span>
                      <div class="pdf-value" style="white-space: pre-line; background: #eff6ff; border: 1px solid #bfdbfe; border-left: 3.5px solid #2563eb; padding: 1.8mm 2.5mm; border-radius: 4px; margin-top: 0.5mm; color: #4b5563; font-weight: 500;">
                        ${escapeHtml(rx.additional_notes)}
                      </div>
                    </div>
                  ` : ''}
                </div>
              </div>
                      `;
                    })
                    .join('');
                }

                if (currentMedsFallback.length > 0) {
                  return `
              <!-- 7. AUTHORIZED PRESCRIPTIONS & CLINICAL RX REGIMEN -->
              <div class="pdf-card">
                <div class="pdf-card-header">
                  <h3 class="pdf-card-title">7. Clinical Medications &amp; Rx Regimen</h3>
                  <span class="pdf-card-badge">Documented Regimen</span>
                </div>
                <div class="pdf-card-body">
                  <div class="pdf-sub-block">
                    <span class="pdf-label">Active Medications Recorded During Clinical Consultation (${currentMedsFallback.length})</span>
                    <table class="pdf-table">
                      <thead>
                        <tr>
                          <th style="width: 5%; text-align: center;">#</th>
                          <th style="width: 35%;">Medicine Name</th>
                          <th style="width: 15%;">Dosage</th>
                          <th style="width: 20%;">Frequency</th>
                          <th style="width: 10%;">Route</th>
                          <th style="width: 15%;">Started Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${currentMedsFallback.map((m, mIdx) => `
                          <tr>
                            <td style="text-align: center; color: #6b7280; font-weight: 600;">${mIdx + 1}</td>
                            <td><strong style="color: #374151;">${escapeHtml(m.medicine_name)}</strong></td>
                            <td style="font-weight: 600; color: #4b5563;">${escapeHtml(m.dosage || '—')}</td>
                            <td><span class="pdf-pill pdf-pill-blue" style="margin: 0; font-size: 8px;">${escapeHtml(m.frequency || '—')}</span></td>
                            <td style="color: #4b5563; font-weight: 500;">${escapeHtml(m.route || 'Oral')}</td>
                            <td style="color: #4b5563; font-weight: 500;">${formatDate(m.started_date)}</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
                  `;
                }

                return `
              <!-- 7. AUTHORIZED PRESCRIPTIONS & CLINICAL RX REGIMEN -->
              <div class="pdf-card">
                <div class="pdf-card-header">
                  <h3 class="pdf-card-title">7. Authorized Prescriptions &amp; Clinical Rx Regimen</h3>
                  <span class="pdf-card-badge">Rx Details</span>
                </div>
                <div class="pdf-card-body">
                  <div class="pdf-sub-block">
                    <span class="pdf-value" style="color: #64748b;">No active outpatient prescriptions recorded for this patient at this visit.</span>
                  </div>
                </div>
              </div>
                `;
              })()}

              <!-- Attending Doctor Verification & Signature Block -->
              <div class="pdf-signature-block">
                <div class="pdf-signature-left">
                  <strong>Certified Clinical Record:</strong> This dossier reflects the comprehensive clinical history, assessment findings, and authorized management plan for the patient identified above. Valid for medical review, specialist referral, and official hospital records.
                </div>
                <div class="pdf-signature-right">
                  <div class="pdf-signature-line"></div>
                  <div class="pdf-signature-name">Dr. ${escapeHtml(cleanDocName)}</div>
                  <div class="pdf-signature-title">${escapeHtml(cleanDocQual)}</div>
                  <div class="pdf-signature-title">Regn No: ${escapeHtml(docReg)}</div>
                </div>
              </div>

            </div>
          </td>
        </tr>
      </tbody>

      <!-- Footer repeated on every printed page -->
      <tfoot class="report-tfoot">
        <tr>
          <td>
            <div class="report-footer-wrapper">
              ${footerHtml}
            </div>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>

</body>
</html>
`;

  return outputHtml.replace(/\bDr\.?\s+Dr\.?\s+/gi, 'Dr. ');
}
