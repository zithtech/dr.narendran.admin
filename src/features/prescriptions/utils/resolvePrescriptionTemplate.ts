import { resolveImageUrl } from '../../../utils/doctorAvatar';
import { DEFAULT_ANNAAMALAI_LOGO_BASE64 } from '../templates/defaultLogo';
import type {
  LabTestItem,
  LetterPadDataContext,
  LetterPadPatientData,
  MedicineItem,
  TemplateResolutionResult,
} from '../types/template';

export interface MedicinesTableRenderOptions {
  showDosage?: boolean;
  showFrequency?: boolean;
  showDuration?: boolean;
  showInstructions?: boolean;
}

/**
 * Generates clean, professional print table for medicines on doctor letterhead
 */
export function renderMedicinesTableHtml(
  medicines?: MedicineItem[],
  options?: MedicinesTableRenderOptions
): string {
  if (!medicines || medicines.length === 0) {
    return `<div style="padding: 6px 0; color: #64748b; font-style: italic; font-size: 11.5px;">No medications prescribed.</div>`;
  }

  const showDosage = options?.showDosage ?? true;
  const showFrequency = options?.showFrequency ?? true;
  const showDuration = options?.showDuration ?? true;
  const showInstructions = options?.showInstructions ?? true;

  const ths = [
    '<th style="width: 28px; text-align: center;">#</th>',
    '<th>Medicine</th>',
    showDosage ? '<th>Dosage</th>' : '',
    showFrequency ? '<th>Frequency</th>' : '',
    showDuration ? '<th>Duration</th>' : '',
    showInstructions ? '<th>Instructions</th>' : '',
  ]
    .filter(Boolean)
    .join('');

  const rows = medicines
    .map((med, index) => {
      const timing = med.mealTiming || med.food_instruction || '';
      const instructionsText = [timing, med.instructions].filter(Boolean).join(' • ') || '-';
      const dosageStr = [med.strength, med.dosage].filter(Boolean).join(' - ') || med.dosage || med.strength || '-';

      const tds = [
        `<td style="width: 28px; text-align: center;">${index + 1}</td>`,
        `<td><strong>${escapeHtml(med.name)}</strong></td>`,
        showDosage ? `<td>${escapeHtml(dosageStr)}</td>` : '',
        showFrequency ? `<td>${escapeHtml(med.frequency || '-')}</td>` : '',
        showDuration ? `<td>${escapeHtml(med.duration || '-')}</td>` : '',
        showInstructions ? `<td>${escapeHtml(instructionsText)}</td>` : '',
      ]
        .filter(Boolean)
        .join('');

      return `<tr>${tds}</tr>`;
    })
    .join('\n');

  return `
    <table class="rx-medicine-table">
      <thead>
        <tr>
          ${ths}
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

  // Clean doctor name (strip any leading "Dr." or multiple "Dr." prefixes)
  let cleanDocName = (doc.name || '').trim();
  cleanDocName = cleanDocName.replace(/^(\s*dr\.?\s*)+/i, '').trim();

  // Doctor signature HTML
  const rawSigUrl = doc.signature_url?.trim();
  const resolvedSigUrl = rawSigUrl ? (resolveImageUrl(rawSigUrl) || rawSigUrl) : '';
  const signatureHtml = resolvedSigUrl
    ? `<img src="${escapeHtml(resolvedSigUrl)}" alt="Signature" class="rx-sig-img" />`
    : `<div class="rx-sig-art">${escapeHtml(cleanDocName || 'Narendran')}</div>`;

  // Hospital logo HTML
  let resolvedHospitalLogo = '';
  const rawHospLogo = hosp.logo_url?.trim();
  if (rawHospLogo) {
    const resolvedUrl = resolveImageUrl(rawHospLogo) || rawHospLogo;
    resolvedHospitalLogo = `<img class="rx-logo-img" src="${escapeHtml(resolvedUrl)}" alt="${escapeHtml(hosp.name || 'Hospital')} Logo" onerror="this.removeAttribute('onerror'); this.src='${DEFAULT_ANNAAMALAI_LOGO_BASE64}';" style="max-width: 77mm; max-height: 32mm; width: auto; height: auto; object-fit: contain; object-position: left center; display: block;" />`;
  } else if (!hosp.name || hosp.name.toLowerCase().includes('annaamalai')) {
    resolvedHospitalLogo = `<img class="rx-logo-img" src="${DEFAULT_ANNAAMALAI_LOGO_BASE64}" alt="Annaamalai Cancer Center Logo" style="max-width: 77mm; max-height: 32mm; width: auto; height: auto; object-fit: contain; object-position: left center; display: block;" />`;
  } else {
    resolvedHospitalLogo = `
<div class="rx-logo-placeholder">
  <div class="rx-logo-placeholder-name">${escapeHtml(hosp.name)}</div>
  <div class="rx-logo-placeholder-sub">Hospital Letterhead</div>
</div>`.trim();
  }

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
    hospital_logo: resolvedHospitalLogo,
    HOSPITAL_LOGO: resolvedHospitalLogo,

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
    pulse_rate: (pat.pulse_rate || pat.vitals?.pulse_rate || '72 bpm').trim(),
    spo2: (pat.spo2 || pat.vitals?.spo2 || '99%').trim(),
    respiratory_rate: (pat.respiratory_rate || pat.vitals?.respiratory_rate || '18 breaths/min').trim(),

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

    ...(pat.custom_vitals && Array.isArray(pat.custom_vitals)
      ? Object.fromEntries(
          pat.custom_vitals
            .filter((c) => c && c.label && c.value)
            .map((c) => [c.label.toLowerCase().replace(/[^a-z0-9_]+/g, '_'), String(c.value)])
        )
      : {}),
    ...(pat.custom_vitals && !Array.isArray(pat.custom_vitals) && typeof pat.custom_vitals === 'object'
      ? pat.custom_vitals
      : {}),

    ...(context.custom_data || {}),
  };

  let rendered = templateHtml;

  // Header normalization: ensure white-space: nowrap is never applied to doctor credentials and split name/qualifications cleanly
  rendered = rendered.replace(
    /\.rx-doctor-name\s*\{([^}]*?)white-space:\s*nowrap;?/gi,
    '.rx-doctor-name {$1white-space: normal; word-wrap: break-word; overflow-wrap: break-word;'
  );
  rendered = rendered.replace(
    /<div\s+class=["']rx-doctor-name["']>\s*Dr\.\s*\{\{doctor_name\}\},\s*\{\{doctor_qualification\}\}\s*<\/div>\s*<div\s+class=["']rx-doctor-qualification["']>\s*\{\{doctor_specialization\}\}\s*<\/div>/i,
    `<div class="rx-doctor-name">Dr. {{doctor_name}}</div>\n          <div class="rx-doctor-qualification">{{doctor_qualification}}</div>\n          <div class="rx-doctor-specialization">{{doctor_specialization}}</div>`
  );

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

  // Safeguard against any double "Dr. Dr."
  rendered = rendered.replace(/\bDr\.?\s+Dr\.?\s+/gi, 'Dr. ');

  // Sanitize and enhance all hospital logo and img tags with proxy routing, aspect fit and error fallback
  rendered = sanitizePrescriptionHtml(
    rendered,
    hosp.logo_url || (hosp.name && !hosp.name.toLowerCase().includes('annaamalai') ? '' : DEFAULT_ANNAAMALAI_LOGO_BASE64),
    hosp.name || 'Annaamalai Cancer Center'
  );

  return {
    renderedHtml: rendered,
    resolvedPlaceholders: Array.from(new Set(resolvedKeys)),
    unresolvedPlaceholders,
    missingRequiredFields: [],
  };
}

/**
 * Post-processes rendered or backend prescription HTML to ensure all hospital logos
 * and images have resolved proxy URLs, correct aspect-ratio fitting styles,
 * and graceful onerror fallback preventing any broken image icons.
 */
export function sanitizePrescriptionHtml(
  html: string,
  fallbackLogoUrl: string = DEFAULT_ANNAAMALAI_LOGO_BASE64,
  hospitalName: string = 'Annaamalai Cancer Center',
): string {
  if (!html) return '';

  let sanitized = html;

  const effectiveFallback = fallbackLogoUrl || DEFAULT_ANNAAMALAI_LOGO_BASE64;
  const resolvedFallback = resolveImageUrl(effectiveFallback) || effectiveFallback;

  // 1. Resolve any remaining unreplaced {{hospital_logo}} or {{HOSPITAL_LOGO}} tokens
  if (sanitized.includes('{{hospital_logo}}') || sanitized.includes('{{HOSPITAL_LOGO}}')) {
    const fallbackLogoHtml = `<img class="rx-logo-img" src="${escapeHtml(resolvedFallback)}" alt="${escapeHtml(hospitalName)} Logo" onerror="this.removeAttribute('onerror'); this.src='${DEFAULT_ANNAAMALAI_LOGO_BASE64}';" style="max-width: 77mm; max-height: 32mm; width: auto; height: auto; object-fit: contain; object-position: left center; display: block;" />`;
    sanitized = sanitized
      .replace(/\{\{hospital_logo\}\}/gi, fallbackLogoHtml)
      .replace(/\{\{HOSPITAL_LOGO\}\}/gi, fallbackLogoHtml);
  }

  // 2. Normalize and proxy unsigned AWS S3 URLs in any img src
  sanitized = sanitized.replace(
    /(<img[^>]*\ssrc=["'])(https?:\/\/[^"']*amazonaws\.com[^"']*)(["'][^>]*>)/gi,
    (full, prefix, rawUrl, suffix) => {
      const resolved = resolveImageUrl(rawUrl);
      return resolved ? `${prefix}${resolved}${suffix}` : full;
    }
  );

  // 3. Normalize and proxy bare upload or branding keys in img src tags
  sanitized = sanitized.replace(
    /(<img[^>]*\ssrc=["'])((?:uploads|branding|prescriptions|doctors)\/[^"']+)(["'][^>]*>)/gi,
    (full, prefix, rawKey, suffix) => {
      const resolved = resolveImageUrl(rawKey);
      return resolved ? `${prefix}${resolved}${suffix}` : full;
    }
  );

  // 4. Normalize localhost backend urls to relative /uploads or /api so Vite dev server proxies them
  sanitized = sanitized.replace(
    /(<img[^>]*\ssrc=["'])(https?:\/\/localhost:\d+\/(?:uploads|api|branding)\/[^"']+)(["'][^>]*>)/gi,
    (full, prefix, rawUrl, suffix) => {
      const resolved = resolveImageUrl(rawUrl);
      return resolved ? `${prefix}${resolved}${suffix}` : full;
    }
  );

  // 5. Inspect and enhance header logo img tags (rx-logo, rx-logo-img, or alt containing Hospital Logo)
  sanitized = sanitized.replace(
    /<img\b([^>]*?)>/gi,
    (fullImgTag, attributes: string) => {
      const isHeaderLogo =
        attributes.includes('rx-logo') ||
        attributes.includes('rx-logo-img') ||
        /alt=["'][^"']*hospital\s*logo[^"']*["']/i.test(attributes) ||
        /alt=["'][^"']*logo[^"']*["']/i.test(attributes);

      if (!isHeaderLogo) {
        return fullImgTag;
      }

      // Extract existing src
      const srcMatch = attributes.match(/src=["']([^"']*)["']/i);
      let srcVal = srcMatch && srcMatch[1] ? srcMatch[1].trim() : '';

      // If src is empty, 'null', 'undefined', or unresolved token
      if (!srcVal || srcVal === 'null' || srcVal === 'undefined' || srcVal.includes('{{')) {
        srcVal = resolvedFallback;
      } else {
        const resolved = resolveImageUrl(srcVal);
        if (resolved) {
          srcVal = resolved;
        }
      }

      // Rebuild attributes with valid src
      let newAttrs = attributes;
      if (srcMatch) {
        newAttrs = newAttrs.replace(/src=["'][^"']*["']/i, `src="${srcVal}"`);
      } else {
        newAttrs += ` src="${srcVal}"`;
      }

      // Ensure onerror attribute exists for graceful fallback
      if (!newAttrs.includes('onerror=')) {
        newAttrs += ` onerror="this.removeAttribute('onerror'); this.src='${DEFAULT_ANNAAMALAI_LOGO_BASE64}';"`;
      }

      // Ensure aspect-ratio and dimension style is present
      const aspectStyle = 'max-width: 77mm; max-height: 32mm; width: auto; height: auto; object-fit: contain; object-position: left center; display: block;';
      if (newAttrs.includes('style=')) {
        newAttrs = newAttrs.replace(/style=["']([^"']*)["']/i, (_m, existingStyle: string) => {
          let s = existingStyle.trim();
          if (!s.endsWith(';')) s += ';';
          if (!s.includes('object-fit')) s += ' object-fit: contain;';
          if (!s.includes('max-height')) s += ' max-height: 32mm;';
          if (!s.includes('max-width')) s += ' max-width: 77mm;';
          return `style="${s}"`;
        });
      } else {
        newAttrs += ` style="${aspectStyle}"`;
      }

      return `<img ${newAttrs.trim()}>`;
    }
  );

  return sanitized;
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
