import type {
  LabTestItem,
  LetterPadDataContext,
  MedicineItem,
  TemplateResolutionResult,
} from '../types/template';

/**
 * Generates dynamic HTML table for medicines matching the teal prescription design
 */
export function renderMedicinesTableHtml(medicines?: MedicineItem[]): string {
  if (!medicines || medicines.length === 0) {
    return `<div style="padding: 12px; text-align: center; color: #829e9b; background: #f8fcfa; border: 1px dashed #cce5e3; border-radius: 8px;">No medications prescribed.</div>`;
  }

  const rows = medicines
    .map((med, index) => {
      const timing = med.mealTiming || med.food_instruction || '';
      const instructionsText = [timing, med.instructions].filter(Boolean).join(' • ') || '-';
      const dosageStr = [med.strength, med.dosage].filter(Boolean).join(' - ') || med.dosage || med.strength || '-';

      return `
      <tr>
        <td style="width: 38px; text-align: center; font-weight: 700; color: #00544d;">${index + 1}</td>
        <td>
          <div class="rx-med-name">${escapeHtml(med.name)}</div>
        </td>
        <td><strong>${escapeHtml(dosageStr)}</strong></td>
        <td>${escapeHtml(med.frequency || '-')}</td>
        <td>${escapeHtml(med.duration || '-')}</td>
        <td>${escapeHtml(instructionsText)}</td>
      </tr>
    `.trim();
    })
    .join('\n');

  return `
    <div class="rx-table-container">
      <table class="rx-med-table">
        <thead>
          <tr>
            <th style="width: 38px; text-align: center;">#</th>
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
    </div>
  `.trim();
}

/**
 * Generates dynamic HTML table/list for lab tests
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
        <td style="width: 38px; text-align: center; font-weight: 700; color: #0b8074;">${index + 1}</td>
        <td><strong>${escapeHtml(name)}</strong></td>
        <td>${escapeHtml(inst)}</td>
      </tr>
    `.trim();
    })
    .join('\n');

  return `
    <div class="rx-table-container" style="border-color: #bbf7d0;">
      <table class="rx-med-table">
        <thead>
          <tr style="background: #0b8074;">
            <th style="width: 38px; text-align: center;">#</th>
            <th>Test Name</th>
            <th>Instructions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
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

  const values: Record<string, string> = {
    hospital_name: hosp.name || 'Dr. Narendran Clinic',
    hospital_address: hosp.address || 'No. 12, Green Park Road, Villupuram - 605602, Tamil Nadu',
    hospital_phone: hosp.phone || '+91 98765 43210',
    hospital_email: hosp.email || 'care@drnarendranclinic.com',
    hospital_website: hosp.website || 'www.drnarendranclinic.com',
    hospital_logo: '',

    branch_name: branch.name || '',
    branch_address: branch.address || '',
    branch_phone: branch.phone || '',

    doctor_name: cleanDocName || 'Narendran',
    doctor_qualification: doc.qualification || 'MBBS, MD (Internal Medicine)',
    doctor_specialization: doc.specialization || 'Consultant Physician',
    doctor_registration_number: doc.medical_registration_number || '',
    doctor_phone: doc.phone || '+91 98765 43210',
    doctor_email: doc.email || 'care@drnarendranclinic.com',
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

    ...(context.custom_data || {}),
  };

  let rendered = templateHtml;
  const resolvedKeys: string[] = [];

  // Conditional blocks
  rendered = rendered.replace(/\{\{#([a-zA-Z0-9_]+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_match, key, content) => {
    const val = values[key];
    if (val && val.trim() !== '') {
      resolvedKeys.push(key);
      return content;
    }
    return '';
  });

  // Direct replacement
  rendered = rendered.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (match, key) => {
    if (key in values) {
      resolvedKeys.push(key);
      return values[key] ?? '';
    }
    return match;
  });

  // Strip unresolved
  const remainingMatches = rendered.match(/\{\{([a-zA-Z0-9_]+)\}\}/g) || [];
  const unresolvedPlaceholders = Array.from(new Set(remainingMatches.map((m) => m.replace(/[{}]/g, ''))));
  rendered = rendered.replace(/\{\{[a-zA-Z0-9_]+\}\}/g, '');

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
