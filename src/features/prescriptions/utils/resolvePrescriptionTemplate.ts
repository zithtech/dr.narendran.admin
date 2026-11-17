import type {
  LabTestItem,
  LetterPadDataContext,
  LetterPadPatientData,
  MedicineItem,
  TemplateResolutionResult,
} from '../types/template';

/**
 * Generates clean, professional print table for medicines on doctor letterhead
 */
export function renderMedicinesTableHtml(medicines?: MedicineItem[]): string {
  if (!medicines || medicines.length === 0) {
    return `<div style="padding: 6px 0; color: #64748b; font-style: italic; font-size: 11.5px;">No medications prescribed.</div>`;
  }

  const rows = medicines
    .map((med, index) => {
      const timing = med.mealTiming || med.food_instruction || '';
      const instructionsText = [timing, med.instructions].filter(Boolean).join(' • ') || '-';
      const dosageStr = [med.strength, med.dosage].filter(Boolean).join(' - ') || med.dosage || med.strength || '-';

      return `
      <tr>
        <td style="width: 28px; text-align: center;">${index + 1}</td>
        <td><strong>${escapeHtml(med.name)}</strong></td>
        <td>${escapeHtml(dosageStr)}</td>
        <td>${escapeHtml(med.frequency || '-')}</td>
        <td>${escapeHtml(med.duration || '-')}</td>
        <td>${escapeHtml(instructionsText)}</td>
      </tr>
    `.trim();
    })
    .join('\n');

  return `
    <table class="rx-medicine-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Medicine</th>
          <th>Dosage</th>
          <th>Frequency</th>
          <th>Duration</th>
          <th>Instructions</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `.trim();
}

/**
 * Generates clean, professional print table for lab tests
 */
export function renderLabTestsHtml(labTests?: LabTestItem[]): string {
  if (!labTests || labTests.length === 0) {
    return '';
  }

  const rows = labTests
    .map((test, index) => {
      const name = test.testName || test.test_name || '';
      const inst = test.instructions || '-';
      return `
      <tr>
        <td style="width: 28px; text-align: center;">${index + 1}</td>
        <td><strong>${escapeHtml(name)}</strong></td>
        <td>${escapeHtml(inst)}</td>
      </tr>
    `.trim();
    })
    .join('\n');

  return `
    <table class="rx-lab-table">
      <thead>
        <tr>
          <th style="width: 28px; text-align: center;">#</th>
          <th>Test Name</th>
          <th>Instructions</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `.trim();
}

/**
 * Generates clean, professional print table for Physical Vitals & Metrics
 */
export function renderVitalsHtml(pat?: LetterPadPatientData): string {
  if (!pat) return '';

  const bp = (pat.blood_pressure || pat.vitals?.blood_pressure || '').trim();
  const bs = (pat.blood_sugar || pat.vitals?.blood_sugar || '').trim();
  const temp = (pat.body_temperature || pat.vitals?.body_temperature || '').trim();
  const bg = (pat.blood_group || pat.vitals?.blood_group || '').trim();

  const heightVal = pat.height_cm ?? pat.vitals?.height_cm;
  const weightVal = pat.weight_kg ?? pat.vitals?.weight_kg;
  const heightStr = heightVal != null && String(heightVal).trim() !== '' ? `${heightVal} cm` : '';
  const weightStr = weightVal != null && String(weightVal).trim() !== '' ? `${weightVal} kg` : '';

  let bmiStr = '';
  if (heightVal && weightVal) {
    const h = typeof heightVal === 'number' ? heightVal : parseFloat(String(heightVal));
    const w = typeof weightVal === 'number' ? weightVal : parseFloat(String(weightVal));
    if (h > 0 && w > 0) {
      bmiStr = (w / ((h / 100) * (h / 100))).toFixed(1);
    }
  }

  // Parse custom vitals
  const rawCustom = pat.custom_vitals ?? pat.vitals?.custom_vitals;
  const customItems: Array<{ label: string; value: string }> = [];
  if (Array.isArray(rawCustom)) {
    rawCustom.forEach((item) => {
      if (item && item.label && item.value) {
        customItems.push({ label: String(item.label).trim(), value: String(item.value).trim() });
      }
    });
  } else if (rawCustom && typeof rawCustom === 'object') {
    Object.entries(rawCustom).forEach(([key, val]) => {
      if (val != null && String(val).trim()) {
        customItems.push({ label: key.replace(/_/g, ' '), value: String(val).trim() });
      }
    });
  }

  const hasAnyVital = Boolean(bp || bs || temp || bg || heightStr || weightStr || bmiStr || customItems.length > 0);
  if (!hasAnyVital) return '';

  const cells: Array<{ label: string; value: string }> = [];
  if (bp) cells.push({ label: 'Blood Pressure (BP)', value: bp });
  if (bs) cells.push({ label: 'Blood Sugar', value: bs });
  if (temp) cells.push({ label: 'Body Temperature', value: temp });
  if (bg) cells.push({ label: 'Blood Group', value: bg });
  if (heightStr) cells.push({ label: 'Height', value: heightStr });
  if (weightStr) cells.push({ label: 'Weight', value: weightStr });
  if (bmiStr) cells.push({ label: 'BMI', value: bmiStr });
  customItems.forEach((c) => cells.push({ label: c.label, value: c.value }));

  // Render clean table with 4 columns per row
  const rowsHtml: string[] = [];
  const colCount = 4;
  for (let i = 0; i < cells.length; i += colCount) {
    const rowCells = cells.slice(i, i + colCount);
    const tds = rowCells
      .map(
        (c) =>
          `<td style="padding: 1.5mm 2mm; border: 1px solid #e2e8f0; background: #ffffff; vertical-align: top; width: 25%;">
            <div style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px;">${escapeHtml(c.label)}</div>
            <div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 0.5mm;">${escapeHtml(c.value)}</div>
          </td>`
      )
      .join('');

    const emptyCount = colCount - rowCells.length;
    let emptyTds = '';
    for (let j = 0; j < emptyCount; j++) {
      emptyTds += `<td style="border: 1px solid #e2e8f0; background: #f8fafc; width: 25%;"></td>`;
    }

    rowsHtml.push(`<tr>${tds}${emptyTds}</tr>`);
  }

  return `
    <div class="rx-vitals-container" style="width: 100%; margin: 2mm 0 4mm; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden;">
      <div style="background: #f1f5f9; padding: 1.5mm 3mm; border-bottom: 1px solid #cbd5e1; display: table; width: 100%;">
        <span style="font-size: 9px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; display: table-cell; vertical-align: middle;">
          Physical Vitals &amp; Metrics
        </span>
      </div>
      <table style="width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10.5px;">
        <tbody>
          ${rowsHtml.join('\n')}
        </tbody>
      </table>
    </div>
  `.trim();
}

/**
 * Centralized template placeholder resolver
 */
export function resolvePrescriptionTemplate(
  templateHtml: string,
  context: LetterPadDataContext
): TemplateResolutionResult {
  if (!templateHtml) {
    return {
      renderedHtml: '',
      resolvedPlaceholders: [],
      unresolvedPlaceholders: [],
      missingRequiredFields: [],
    };
  }

  const hosp = context.hospital ?? {};
  const branch = context.branch ?? {};
  const doc = context.doctor ?? {};
  const pat = context.patient ?? {};
  const rx = context.prescription ?? {};

  // Clean doctor name
  let cleanDocName = (doc.name || '').trim();
  if (cleanDocName.toLowerCase().startsWith('dr.')) {
    cleanDocName = cleanDocName.substring(3).trim();
  } else if (cleanDocName.toLowerCase().startsWith('dr ')) {
    cleanDocName = cleanDocName.substring(3).trim();
  }

  // Doctor signature HTML
  const signatureHtml = doc.signature_url
    ? `<img src="${escapeHtml(doc.signature_url)}" alt="Signature" class="rx-sig-img" />`
    : `<div class="rx-sig-art">${escapeHtml(cleanDocName || 'Narendran')}</div>`;

  // Format Additional Notes as list items if multiline
  let additionalNotesHtml = rx.additional_notes || rx.general_instructions || '';
  if (additionalNotesHtml && !additionalNotesHtml.includes('<li>')) {
    const lines = additionalNotesHtml.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length > 1) {
      additionalNotesHtml = `<ul style="margin: 0; padding-left: 18px;">${lines.map((l) => `<li>${escapeHtml(l)}</li>`).join('')}</ul>`;
    } else {
      additionalNotesHtml = escapeHtml(additionalNotesHtml);
    }
  }

  const medicinesTableHtml = renderMedicinesTableHtml(rx.medicines);
  const labTestsHtml = renderLabTestsHtml(rx.lab_tests);
  const vitalsHtml = renderVitalsHtml(pat);

  const bpVal = (pat.blood_pressure || pat.vitals?.blood_pressure || '').trim();
  const bsVal = (pat.blood_sugar || pat.vitals?.blood_sugar || '').trim();
  const tempVal = (pat.body_temperature || pat.vitals?.body_temperature || '').trim();
  const bgVal = (pat.blood_group || pat.vitals?.blood_group || '').trim();
  const heightVal = pat.height_cm ?? pat.vitals?.height_cm;
  const weightVal = pat.weight_kg ?? pat.vitals?.weight_kg;
  const heightStr = heightVal != null && String(heightVal).trim() !== '' ? `${heightVal} cm` : '';
  const weightStr = weightVal != null && String(weightVal).trim() !== '' ? `${weightVal} kg` : '';
  let bmiStr = '';
  if (heightVal && weightVal) {
    const h = typeof heightVal === 'number' ? heightVal : parseFloat(String(heightVal));
    const w = typeof weightVal === 'number' ? weightVal : parseFloat(String(weightVal));
    if (h > 0 && w > 0) {
      bmiStr = (w / ((h / 100) * (h / 100))).toFixed(1);
    }
  }

  const values: Record<string, string> = {
    hospital_name: hosp.name || 'Annaamalai Cancer Center',
    hospital_address: hosp.address || 'No. 18, Kottivakkam Kuppam Rd, Thiruvalluvar Nagar, Thiruvanmiyur, Chennai, Tamil Nadu - 600 041.',
    hospital_phone: hosp.phone || '+91 84380 56883',
    hospital_email: hosp.email || 'narenonco@gmail.com',
    hospital_website: hosp.website || 'www.drnarendranoncologist.com',
    hospital_logo: '',

    branch_name: branch.name || '',
    branch_address: branch.address || '',
    branch_phone: branch.phone || '',

    doctor_name: cleanDocName || 'S. Narendran',
    doctor_qualification: doc.qualification || 'M.D (RT)',
    doctor_specialization: doc.specialization || 'Consultant Oncologist.',
    doctor_registration_number: doc.medical_registration_number || '106226',
    doctor_phone: doc.phone || '+91 84380 56883',
    doctor_email: doc.email || 'narenonco@gmail.com',
    doctor_clinic_address: doc.clinic_address || '',
    doctor_signature: signatureHtml,

    patient_name: pat.name || 'BHARATHI M',
    patient_id: pat.patient_id || 'HMS-2026-0456',
    patient_age: pat.age || '28 Years',
    patient_gender: pat.gender || 'Female',
    patient_date_of_birth: pat.date_of_birth || '',
    patient_phone: pat.phone || '',
    patient_address: pat.address || '',

    vitals_html: vitalsHtml,
    vitals_table: vitalsHtml,
    vitals_section: vitalsHtml,
    blood_pressure: bpVal,
    blood_sugar: bsVal,
    body_temperature: tempVal,
    blood_group: bgVal,
    patient_height: heightStr,
    patient_weight: weightStr,
    patient_bmi: bmiStr,

    prescription_id: rx.prescription_id || rx.id || 'PRS-2026-00123',
    prescription_date: rx.prescription_date ? formatDate(rx.prescription_date) : formatDate(new Date().toISOString()),
    appointment_id: rx.appointment_id || 'APT-2026-0789',
    diagnosis: rx.diagnosis || 'General checkup. Follow up as advised.',
    symptoms: rx.symptoms || '',
    clinical_notes: rx.clinical_notes || '',
    additional_notes: additionalNotesHtml,
    additional_instructions: additionalNotesHtml,
    follow_up_date: rx.follow_up_date ? formatDate(rx.follow_up_date) : '',

    medicines_table: medicinesTableHtml,
    lab_tests: labTestsHtml,

    // Backward-compatibility aliases for uppercase & alternate conventions
    PATIENT_NAME: pat.name || 'BHARATHI M',
    PATIENT_ID: pat.patient_id || 'HMS-2026-0456',
    PATIENT_AGE: pat.age || '28 Years',
    PATIENT_GENDER: pat.gender || 'Female',
    PATIENT_DATE: rx.prescription_date ? formatDate(rx.prescription_date) : formatDate(new Date().toISOString()),
    DIAGNOSIS: rx.diagnosis || '',
    MEDICINES: medicinesTableHtml,
    medicines: medicinesTableHtml,
    LAB_TESTS: labTestsHtml,
    ADDITIONAL_NOTES: additionalNotesHtml,
    BLOOD_PRESSURE: bpVal,
    BLOOD_SUGAR: bsVal,
    BODY_TEMPERATURE: tempVal,
    BLOOD_GROUP: bgVal,
    VITALS: vitalsHtml,
    vitals: vitalsHtml,
    DOCTOR_NAME: cleanDocName || 'S. Narendran',
    DOCTOR_REG_NO: doc.medical_registration_number || '106226',
    DOCTOR_QUALIFICATION: doc.qualification || 'M.D (RT)',
    DOCTOR_SPECIALIZATION: doc.specialization || 'Consultant Oncologist.',
    E_SIGNATURE: signatureHtml,
    e_signature: signatureHtml,
    E_SIGN: signatureHtml,
    e_sign: signatureHtml,

    ...(context.custom_data || {}),
  };

  let rendered = templateHtml;
  const resolvedKeys: string[] = [];

  // Conditional blocks (loop to support nested blocks)
  let prevRendered = '';
  while (rendered !== prevRendered) {
    prevRendered = rendered;
    rendered = rendered.replace(/\{\{#([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_match, key, content) => {
      const val = values[key];
      if (val && val.trim() !== '') {
        resolvedKeys.push(key);
        return content;
      }
      return '';
    });
  }

  // Direct replacement
  rendered = rendered.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
    if (key in values) {
      resolvedKeys.push(key);
      return values[key] ?? '';
    }
    return match;
  });

  // Automatically inject Physical Vitals & Metrics after patient table if not explicitly placed
  if (vitalsHtml && !rendered.includes('rx-vitals-container')) {
    if (/<table[^>]*class=["'][^"']*rx-patient-table[^"']*["'][^>]*>[\s\S]*?<\/table>/i.test(rendered)) {
      rendered = rendered.replace(
        /(<table[^>]*class=["'][^"']*rx-patient-table[^"']*["'][^>]*>[\s\S]*?<\/table>)/i,
        `$1\n${vitalsHtml}`
      );
    }
  }

  // Strip any remaining unresolved placeholders or stray tags
  const remainingMatches = rendered.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
  const unresolvedPlaceholders = Array.from(new Set(remainingMatches.map((m) => m.replace(/[{}]/g, ''))));
  rendered = rendered.replace(/\{\{\/?#?[a-zA-Z0-9_]+\}\}/g, '');

  return {
    renderedHtml: rendered,
    resolvedPlaceholders: Array.from(new Set(resolvedKeys)),
    unresolvedPlaceholders,
    missingRequiredFields: [],
  };
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
