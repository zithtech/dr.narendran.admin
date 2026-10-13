import type {
  LabTestItem,
  LetterPadDataContext,
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
