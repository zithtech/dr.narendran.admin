import { DEFAULT_ANNAAMALAI_LOGO_BASE64 } from '../templates/defaultLogo';
import {
  DEFAULT_VITALS_FIELDS,
  type TemplateLayoutConfig,
  type TemplateSectionBlock,
  type TemplateThemeConfig,
  type VitalsBlockProps,
} from '../types/template';

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const DEFAULT_THEME_CONFIG: TemplateThemeConfig = {
  primaryColor: '#67358f',
  secondaryColor: '#69c9eb',
  accentColor: '#7a2886',
  textColor: '#202020',
  backgroundColor: '#ffffff',
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: '11px',
  headerBorderColor: '#69c9eb',
  tableBorderColor: '#c9c9c9',
  showTagline: true,
  customTagline: 'QUALITY OF LIFE – LIFE AFTER CANCER – HELP YOU TO LIVE BETTER BEYOND CANCER',
  compactMode: false,
};

export const DEFAULT_SECTION_BLOCKS: TemplateSectionBlock[] = [
  {
    id: 'sec_header',
    type: 'HEADER_LETTERHEAD',
    title: 'Hospital Letterhead & Doctor Header',
    enabled: true,
    order: 1,
    props: {
      showLogo: true,
      logoPosition: 'left',
      showTagline: true,
      showRegNumber: true,
      taglineText: 'QUALITY OF LIFE – LIFE AFTER CANCER – HELP YOU TO LIVE BETTER BEYOND CANCER',
    },
  },
  {
    id: 'sec_patient',
    type: 'PATIENT_DETAILS',
    title: 'Patient Demographics Grid',
    enabled: true,
    order: 2,
    props: {
      showAgeGender: true,
      showAppointmentId: true,
      showBranch: true,
      showDate: true,
    },
  },
  {
    id: 'sec_vitals',
    type: 'VITALS_BLOCK',
    title: 'Physical Vitals & Clinical Metrics',
    enabled: true,
    order: 3,
    props: {
      style: 'bordered-table',
      showTitle: true,
      title: 'Physical Vitals & Metrics',
      columnsPerRow: 4,
      fields: DEFAULT_VITALS_FIELDS,
    },
  },
  {
    id: 'sec_diagnosis',
    type: 'DIAGNOSIS_BLOCK',
    title: 'Diagnosis & Clinical Symptoms',
    enabled: true,
    order: 4,
    props: {
      showRxSymbol: true,
    },
  },
  {
    id: 'sec_medicines',
    type: 'MEDICINES_TABLE',
    title: 'Prescribed Medications (Rx Table)',
    enabled: true,
    order: 5,
    props: {
      showBorder: true,
      showDosage: true,
      showInstructions: true,
      showDuration: true,
      showFrequency: true,
    },
  },
  {
    id: 'sec_labs',
    type: 'LAB_TESTS_BLOCK',
    title: 'Lab Tests & Diagnostic Investigations',
    enabled: true,
    order: 6,
    props: {
      title: 'Lab Tests & Investigations:',
    },
  },
  {
    id: 'sec_notes',
    type: 'ADVICE_NOTES_BLOCK',
    title: 'Advice, Instructions & Follow-up',
    enabled: true,
    order: 7,
    props: {
      title: 'Advice & Instructions:',
      showFollowUp: true,
    },
  },
  {
    id: 'sec_signature',
    type: 'SIGNATURE_BLOCK',
    title: 'Doctor E-Signature Block',
    enabled: true,
    order: 8,
    props: {
      alignment: 'right',
      showQualifications: true,
      showDoctorName: true,
    },
  },
  {
    id: 'sec_footer',
    type: 'FOOTER_LETTERHEAD',
    title: 'Hospital Letterhead Footer & Contact Info',
    enabled: true,
    order: 9,
    props: {
      showHospitalPhone: true,
      showHospitalEmail: true,
      showHospitalAddress: true,
      showWebsite: true,
      showRibbon: true,
      footerTheme: 'purple',
    },
  },
];

export const DEFAULT_LAYOUT_CONFIG: TemplateLayoutConfig = {
  theme: DEFAULT_THEME_CONFIG,
  sections: DEFAULT_SECTION_BLOCKS,
};

export const BLANK_LAYOUT_CONFIG: TemplateLayoutConfig = {
  theme: DEFAULT_THEME_CONFIG,
  sections: [],
};

/**
 * Compiles a visual layout configuration into standard, pixel-perfect A4 CSS HTML
 */
export function compileLayoutToHtml(config?: TemplateLayoutConfig | null): string {
  const theme = config?.theme || DEFAULT_THEME_CONFIG;
  const sections = (config?.sections || DEFAULT_SECTION_BLOCKS)
    .filter((s) => s.enabled)
    .sort((a, b) => a.order - b.order);

  const primaryColor = theme.primaryColor || '#67358f';
  const secondaryColor = theme.secondaryColor || '#69c9eb';
  const accentColor = theme.accentColor || '#7a2886';
  const textColor = theme.textColor || '#202020';
  const fontFamily = theme.fontFamily || 'Arial, Helvetica, sans-serif';
  const fontSize = theme.fontSize || '11px';
  const headerBorder = theme.headerBorderColor || secondaryColor;
  const tableBorder = theme.tableBorderColor || '#c9c9c9';

  // Build HTML sections in order
  const sectionsHtml = sections
    .map((sec) => {
      switch (sec.type) {
        case 'HEADER_LETTERHEAD': {
          const showTagline = sec.props?.showTagline ?? theme.showTagline ?? true;
          const taglineText = sec.props?.taglineText || theme.customTagline || 'QUALITY OF LIFE – LIFE AFTER CANCER – HELP YOU TO LIVE BETTER BEYOND CANCER';
          const logoHtml = sec.props?.customLogoUrl
            ? `<img class="rx-logo-img" src="${sec.props.customLogoUrl}" alt="${sec.props?.logoAlt || 'Hospital Logo'}" onerror="this.removeAttribute('onerror'); this.src='${DEFAULT_ANNAAMALAI_LOGO_BASE64}';" style="width: ${sec.props?.logoWidth || '77mm'}; max-height: ${sec.props?.logoHeight || '32mm'}; object-fit: ${sec.props?.logoFit || 'contain'}; object-position: ${sec.props?.logoAlign || 'left'} center; display: block;" />`
            : `{{hospital_logo}}`;

          return `
    <!-- HEADER -->
    <header class="rx-header">
      <div class="rx-header-row">
        <div class="rx-header-left">
          ${logoHtml}
        </div>
        <div class="rx-header-right">
          <div class="rx-doctor-name">Dr. {{doctor_name}}</div>
          <div class="rx-doctor-qualification">{{doctor_qualification}}</div>
          <div class="rx-doctor-specialization">{{doctor_specialization}}</div>
          <div class="rx-reg">
            Reg. No: <span class="rx-reg-number">{{doctor_registration_number}}</span>
          </div>
        </div>
      </div>
      <div class="rx-header-line"></div>
      ${showTagline ? `<div class="rx-tagline">${taglineText}</div>` : ''}
    </header>`.trim();
        }

        case 'CUSTOM_IMAGE': {
          const url = sec.props?.imageUrl || '';
          const alt = sec.props?.altText || 'Prescription Image';
          const align = sec.props?.alignment || 'center';
          const width = sec.props?.width || '60mm';
          const height = sec.props?.height || 'auto';
          const fit = sec.props?.objectFit || 'contain';
          const caption = sec.props?.caption || '';
          const textAlign = align === 'left' ? 'left' : align === 'right' ? 'right' : 'center';

          if (!url) {
            return `
      <!-- Custom Image Placeholder -->
      <div class="rx-custom-image-block" style="text-align: ${textAlign}; margin: 2.5mm 0; width: 100%;">
        <div style="display: inline-block; padding: 5mm 8mm; border: 1px dashed #cbd5e1; border-radius: 4px; background: #f8fafc; color: #94a3b8; font-size: 10px; font-weight: 500;">
          [ Image / Logo Block: No image uploaded ]
        </div>
      </div>`.trim();
          }

          return `
      <!-- Custom Image -->
      <div class="rx-custom-image-block" style="text-align: ${textAlign}; margin: 2.5mm 0; width: 100%;">
        <img
          src="${url}"
          alt="${alt}"
          style="width: ${width}; max-width: 100%; height: ${height}; max-height: 55mm; object-fit: ${fit}; display: inline-block;"
        />
        ${caption ? `<div style="font-size: 8.5px; color: #64748b; margin-top: 1mm; font-weight: 500;">${caption}</div>` : ''}
      </div>`.trim();
        }

        case 'HEADING': {
          const text = sec.props?.text || 'Prescription Heading';
          const level = sec.props?.level || 'h2';
          const align = sec.props?.alignment || 'left';
          const color = sec.props?.color || primaryColor;
          const defaultSize =
            level === 'h1' ? '18px' : level === 'h2' ? '14px' : level === 'h3' ? '12px' : '13px';
          const headingSize = sec.props?.fontSize || defaultSize;
          const fontWeight = sec.props?.fontWeight || 'bold';
          const mb = sec.props?.marginBottom || '2.5mm';
          return `
      <!-- Heading -->
      <div data-section-id="${sec.id}" data-field="text" class="rx-heading rx-heading-${level}" style="text-align: ${align}; color: ${color}; font-size: ${headingSize}; font-weight: ${fontWeight}; margin: 2mm 0 ${mb}; line-height: 1.3;">
        ${text}
      </div>`.trim();
        }

        case 'PARAGRAPH': {
          const content = sec.props?.content || 'Enter clinical notes or instructions here.';
          const align = sec.props?.alignment || 'left';
          const pColor = sec.props?.color || textColor;
          const pSize = sec.props?.fontSize || fontSize;
          const pWeight = sec.props?.fontWeight || 'normal';
          const pLineHeight = sec.props?.lineHeight || '1.45';
          const mb = sec.props?.marginBottom || '3mm';
          return `
      <!-- Paragraph -->
      <div data-section-id="${sec.id}" data-field="content" class="rx-paragraph" style="text-align: ${align}; color: ${pColor}; font-size: ${pSize}; font-weight: ${pWeight}; line-height: ${pLineHeight}; margin: 1.5mm 0 ${mb}; white-space: pre-wrap;">
        ${content}
      </div>`.trim();
        }

        case 'TABLE': {
          const mode = sec.props?.mode || 'static';
          const dynamicSource = sec.props?.dynamicSource || 'none';
          if (mode === 'dynamic') {
            if (dynamicSource === 'medicines') {
              const showDosage = sec.props?.showDosage ?? true;
              const showFrequency = sec.props?.showFrequency ?? true;
              const showDuration = sec.props?.showDuration ?? true;
              const showInstructions = sec.props?.showInstructions ?? true;
              const showBorder = sec.props?.showBorder ?? true;
              return `
      <!-- Prescribed medicines table -->
      <div data-section-id="${sec.id}" class="rx-medicines-table-wrapper"
           data-show-dosage="${showDosage}"
           data-show-frequency="${showFrequency}"
           data-show-duration="${showDuration}"
           data-show-instructions="${showInstructions}"
           data-show-border="${showBorder}">
        {{medicines_table}}
      </div>`.trim();
            }
            if (dynamicSource === 'lab_tests') {
              return `
      <!-- Lab tests -->
      <div data-section-id="${sec.id}" class="rx-lab-tests-wrapper">
        {{#lab_tests}}
        <div class="rx-sec-title">Lab Tests & Investigations:</div>
        <div class="rx-sec-content">
          {{lab_tests}}
        </div>
        {{/lab_tests}}
      </div>`.trim();
            }
          }

          const rows = Number(sec.props?.rows) || (Array.isArray(sec.props?.data) ? sec.props.data.length : 3);
          const cols = Number(sec.props?.columns) || (Array.isArray(sec.props?.headers) ? sec.props.headers.length : 3);
          const headers: string[] =
            Array.isArray(sec.props?.headers) && sec.props.headers.length === cols
              ? sec.props.headers
              : Array.from({ length: cols }, (_, i) => `Column ${i + 1}`);
          const rawData: any[] = Array.isArray(sec.props?.data)
            ? sec.props.data
            : Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));
          const bordered = sec.props?.bordered ?? true;
          const bColor = sec.props?.borderColor || tableBorder;
          const headerBg = sec.props?.headerBg || '#f8fafc';
          const headerColor = sec.props?.headerColor || '#0f172a';
          const cellPadding = sec.props?.cellPadding || '2mm 1.5mm';
          const tableFontSize = sec.props?.fontSize || '10px';
          const columnWidths: string[] = Array.isArray(sec.props?.columnWidths) ? sec.props.columnWidths : [];
          const alignments: string[] = Array.isArray(sec.props?.alignments) ? sec.props.alignments : [];

          const ths = headers
            .map((h, cIdx) => {
              const w = columnWidths[cIdx] ? `width: ${columnWidths[cIdx]};` : '';
              const align = alignments[cIdx] || 'left';
              return `<th data-section-id="${sec.id}" data-col-idx="${cIdx}" style="border: ${bordered ? `0.3mm solid ${bColor}` : 'none'}; background: ${headerBg}; color: ${headerColor}; padding: ${cellPadding}; font-weight: 700; text-align: ${align}; ${w}">${h}</th>`;
            })
            .join('');

          const trs = Array.from({ length: rows }, (_, r) => {
            const rowData = Array.isArray(rawData[r]) ? rawData[r] : [];
            const tds = Array.from({ length: cols }, (_, c) => {
              const cellVal = rowData[c] !== undefined && rowData[c] !== null ? String(rowData[c]) : '';
              const displayVal = cellVal.trim() === '' ? '&nbsp;' : cellVal;
              const w = columnWidths[c] ? `width: ${columnWidths[c]};` : '';
              const align = alignments[c] || 'left';
              return `<td data-section-id="${sec.id}" data-cell-row="${r}" data-cell-col="${c}" class="rx-table-cell" style="border: ${bordered ? `0.3mm solid ${bColor}` : 'none'}; padding: ${cellPadding}; vertical-align: top; text-align: ${align}; ${w}">${displayVal}</td>`;
            }).join('');
            return `<tr>${tds}</tr>`;
          }).join('\n');

          return `
      <!-- Custom Table -->
      <table data-section-id="${sec.id}" class="rx-table-custom" style="width: 100%; border-collapse: collapse; margin: 2.5mm 0 4mm; font-size: ${tableFontSize}; table-layout: auto;">
        <thead>
          <tr>${ths}</tr>
        </thead>
        <tbody>
          ${trs}
        </tbody>
      </table>`.trim();
        }

        case 'DIVIDER': {
          const style = sec.props?.style || 'solid';
          const thickness = sec.props?.thickness || '0.45mm';
          const dColor = sec.props?.color || secondaryColor;
          const margin = sec.props?.margin || '3mm';
          const width = sec.props?.width || '100%';
          const align = sec.props?.alignment || 'center';
          const marginLeft = align === 'right' ? 'auto' : align === 'center' ? 'auto' : '0';
          const marginRight = align === 'left' ? 'auto' : align === 'center' ? 'auto' : '0';

          return `
      <!-- Divider -->
      <div data-section-id="${sec.id}" class="rx-divider" style="width: ${width}; height: 0; border-top: ${thickness} ${style} ${dColor}; margin-top: ${margin}; margin-bottom: ${margin}; margin-left: ${marginLeft}; margin-right: ${marginRight};"></div>`.trim();
        }

        case 'SPACER': {
          const height = sec.props?.height || '5mm';
          return `
      <!-- Spacer -->
      <div data-section-id="${sec.id}" class="rx-spacer" style="height: ${height}; width: 100%;"></div>`.trim();
        }

        case 'PLACEHOLDER_BLOCK': {
          const token = sec.props?.token || '{{patient_name}}';
          const prefix = sec.props?.prefix !== undefined ? sec.props.prefix : 'Patient Name: ';
          const align = sec.props?.alignment || 'left';
          const plColor = sec.props?.color || textColor;
          const plSize = sec.props?.fontSize || fontSize;
          const boldValue = sec.props?.boldValue ?? true;

          return `
      <!-- Placeholder Block -->
      <div data-section-id="${sec.id}" data-field="token" class="rx-placeholder-block" style="text-align: ${align}; color: ${plColor}; font-size: ${plSize}; margin: 1.5mm 0;">
        ${prefix ? `<span class="rx-pl-label" style="font-weight: 600;">${prefix}</span>` : ''}
        <span class="rx-pl-val" style="font-weight: ${boldValue ? '700' : '500'};">${token}</span>
      </div>`.trim();
        }

        case 'DOCTOR_DETAILS': {
          const align = sec.props?.alignment || 'left';
          const showName = sec.props?.showDoctorName ?? true;
          const showQual = sec.props?.showQualifications ?? true;
          const showSpec = sec.props?.showSpecialization ?? true;
          const showReg = sec.props?.showRegistration ?? true;

          return `
      <!-- Doctor Details Block -->
      <div data-section-id="${sec.id}" class="rx-doctor-details-block" style="text-align: ${align}; margin: 2mm 0 4mm;">
        ${showName ? `<div class="rx-doctor-name" style="font-size: 14px; font-weight: 700; color: ${primaryColor}; margin-bottom: 1mm;">Dr. {{doctor_name}}</div>` : ''}
        ${showQual ? `<div class="rx-doctor-qualification" style="font-size: 10.5px; font-weight: 600; color: #222; margin-bottom: 0.8mm;">{{doctor_qualification}}</div>` : ''}
        ${showSpec ? `<div class="rx-doctor-specialization" style="font-size: 10px; font-weight: 500; color: #475569; margin-bottom: 1mm;">{{doctor_specialization}}</div>` : ''}
        ${showReg ? `<div class="rx-reg" style="font-size: 11px; font-weight: 700; color: ${primaryColor};">Reg. No: <span class="rx-reg-number" style="color: #333; font-weight: 500;">{{doctor_registration_number}}</span></div>` : ''}
      </div>`.trim();
        }

        case 'PATIENT_DETAILS':
          return `
      <!-- Patient details -->
      <table data-section-id="${sec.id}" class="rx-patient-table">
        <tr>
          <td class="rx-lbl">Patient Name:</td>
          <td class="rx-val">{{patient_name}}</td>
          <td class="rx-lbl rx-right">Date:</td>
          <td class="rx-val rx-right-val">{{prescription_date}}</td>
        </tr>
        <tr>
          <td class="rx-lbl">Patient ID:</td>
          <td class="rx-val">{{patient_id}}</td>
          <td class="rx-lbl rx-right">Appointment ID:</td>
          <td class="rx-val rx-right-val">{{appointment_id}}</td>
        </tr>
        <tr>
          <td class="rx-lbl">Age / Gender:</td>
          <td class="rx-val">{{patient_age}} / {{patient_gender}}</td>
          <td class="rx-lbl rx-right">Branch:</td>
          <td class="rx-val rx-right-val">{{branch_name}}</td>
        </tr>
      </table>`.trim();

        case 'VITALS_BLOCK': {
          const vitalsConfig = sec.props as VitalsBlockProps | undefined;
          const columnsPerRow = Number(vitalsConfig?.columnsPerRow) || 4;
          const showTitle = vitalsConfig?.showTitle ?? true;
          const title = vitalsConfig?.title || 'Physical Vitals & Metrics';
          const fields =
            Array.isArray(vitalsConfig?.fields) && vitalsConfig.fields.length > 0
              ? vitalsConfig.fields.filter((f) => f.enabled !== false)
              : DEFAULT_VITALS_FIELDS.filter((f) => f.enabled !== false);

          const colWidth = (100 / columnsPerRow).toFixed(1);
          const rows: string[] = [];
          for (let i = 0; i < fields.length; i += columnsPerRow) {
            const chunk = fields.slice(i, i + columnsPerRow);
            const tds = chunk
              .map((f) => {
                const unitSuffix = f.unit
                  ? ` <span style="font-size: 8.5px; font-weight: 500; color: #64748b;">${escapeHtml(f.unit)}</span>`
                  : '';
                return `<td data-section-id="${sec.id}" data-vital-id="${f.id}" style="padding: 1.5mm 2mm; border: 1px solid #e2e8f0; background: #ffffff; vertical-align: top; width: ${colWidth}%;">
                  <div style="font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.3px;">${escapeHtml(f.label)}</div>
                  <div style="font-size: 11px; font-weight: 700; color: #0f172a; margin-top: 0.5mm;">{{${f.key}}}${unitSuffix}</div>
                </td>`;
              })
              .join('');

            const emptyCount = columnsPerRow - chunk.length;
            let emptyTds = '';
            for (let j = 0; j < emptyCount; j++) {
              emptyTds += `<td style="border: 1px solid #e2e8f0; background: #f8fafc; width: ${colWidth}%;"></td>`;
            }
            rows.push(`<tr>${tds}${emptyTds}</tr>`);
          }

          return `
      <!-- Physical Vitals & Metrics -->
      <div data-section-id="${sec.id}" class="rx-vitals-container" style="width: 100%; margin: 2mm 0 4mm; border: 1px solid #cbd5e1; border-radius: 4px; overflow: hidden;">
        ${
          showTitle
            ? `<div style="background: #f1f5f9; padding: 1.5mm 3mm; border-bottom: 1px solid #cbd5e1; display: table; width: 100%;">
          <span style="font-size: 9px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; display: table-cell; vertical-align: middle;">
            ${escapeHtml(title)}
          </span>
        </div>`
            : ''
        }
        <table style="width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 10.5px;">
          <tbody>
            ${rows.join('\n')}
          </tbody>
        </table>
      </div>`.trim();
        }

        case 'DIAGNOSIS_BLOCK': {
          const showRx = sec.props?.showRxSymbol ?? true;
          return `
      <!-- Diagnosis -->
      <div data-section-id="${sec.id}" class="rx-diagnosis-block">
        {{#diagnosis}}
        <div class="rx-diag-row">
          <span class="rx-diag-label">Diagnosis:</span>
          <span class="rx-diag-text">{{diagnosis}}</span>
        </div>
        {{/diagnosis}}
        ${showRx ? `<div class="rx-symbol">℞</div>` : ''}
      </div>`.trim();
        }

        case 'MEDICINES_TABLE': {
          const showDosage = sec.props?.showDosage ?? true;
          const showFrequency = sec.props?.showFrequency ?? true;
          const showDuration = sec.props?.showDuration ?? true;
          const showInstructions = sec.props?.showInstructions ?? true;
          const showBorder = sec.props?.showBorder ?? true;
          return `
      <!-- Prescribed medicines table -->
      <div data-section-id="${sec.id}" class="rx-medicines-table-wrapper"
           data-show-dosage="${showDosage}"
           data-show-frequency="${showFrequency}"
           data-show-duration="${showDuration}"
           data-show-instructions="${showInstructions}"
           data-show-border="${showBorder}">
        {{medicines_table}}
      </div>`.trim();
        }

        case 'LAB_TESTS_BLOCK': {
          const title = sec.props?.title || 'Lab Tests & Investigations:';
          return `
      <!-- Lab tests -->
      <div data-section-id="${sec.id}" class="rx-lab-tests-wrapper">
        {{#lab_tests}}
        <div class="rx-sec-title">${title}</div>
        <div class="rx-sec-content">
          {{lab_tests}}
        </div>
        {{/lab_tests}}
      </div>`.trim();
        }

        case 'ADVICE_NOTES_BLOCK': {
          const title = sec.props?.title || 'Advice & Instructions:';
          return `
      <!-- Additional notes / advice -->
      {{#additional_notes}}
      <div class="rx-sec-title">${title}</div>
      <div class="rx-sec-content">
        {{additional_notes}}
      </div>
      {{/additional_notes}}
      {{#follow_up_date}}
      <div style="margin-top: 3mm; font-size: 10px; font-weight: 700; color: ${primaryColor};">
        Next Review / Follow-up: <span style="color: #222; font-weight: 600;">{{follow_up_date}}</span>
      </div>
      {{/follow_up_date}}`.trim();
        }

        case 'SIGNATURE_BLOCK': {
          const align = sec.props?.alignment || 'right';
          const justifyContent = align === 'left' ? 'flex-start' : align === 'center' ? 'center' : 'flex-end';
          const sigHtml = sec.props?.customSignatureUrl
            ? `<img src="${sec.props.customSignatureUrl}" alt="Doctor Signature" class="rx-sig-img" style="max-width: ${sec.props?.signatureWidth || '43mm'}; max-height: ${sec.props?.signatureHeight || '13mm'}; object-fit: contain; display: block; margin: 0 auto 1.5mm;" />`
            : `{{doctor_signature}}`;

          return `
      <!-- E-sign -->
      <div class="rx-signature-area" style="justify-content: ${justifyContent};">
        <div class="rx-sig-block">
          <div class="rx-sig-inner">
            ${sigHtml}
            <div class="rx-sig-name">Dr. {{doctor_name}}</div>
            <div class="rx-sig-qual">{{doctor_qualification}}</div>
            <div class="rx-sig-spec">{{doctor_specialization}}</div>
          </div>
        </div>
      </div>`.trim();
        }

        case 'FOOTER_LETTERHEAD': {
          const customBannerHtml = sec.props?.customFooterImageUrl
            ? `<div class="rx-footer-custom-banner" style="width: 100%; text-align: center; margin: 2mm 0;"><img src="${sec.props.customFooterImageUrl}" alt="Footer Banner" style="max-width: 100%; height: auto; max-height: 25mm; object-fit: contain;" /></div>`
            : '';
          const customRibbonHtml = sec.props?.customRibbonUrl
            ? `<img src="${sec.props.customRibbonUrl}" alt="Ribbon" class="rx-ribbon" />`
            : '';
          return `
    <!-- FOOTER / LETTERHEAD -->
    <footer class="rx-footer">
      ${customRibbonHtml}
      ${customBannerHtml}
      <div class="rx-footer-content-wrap">
        <div class="rx-footer-line"></div>
        <div class="rx-contact">
          <div class="rx-contact-left">
            <div class="rx-contact-row">
              <span class="rx-icon-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
              </span>
              <span>{{hospital_phone}}</span>
            </div>
            <div class="rx-contact-row">
              <span class="rx-icon-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg>
              </span>
              <span>{{hospital_email}}</span>
            </div>
          </div>
          <div class="rx-contact-right">
            <div class="rx-contact-row-address">
              <span class="rx-icon-circle">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              </span>
              <span class="rx-address">{{hospital_address}}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="rx-bottom-band">
        <div class="rx-bottom-left">
          <div class="rx-bottom-title">TO KNOW ABOUT:</div>
          <a class="rx-bottom-link" href="{{hospital_website}}">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" x2="22" y1="12" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
            <span>{{hospital_website}}</span>
          </a>
        </div>
        <div class="rx-bottom-right">
          <div class="rx-bottom-title">{{hospital_name}}</div>
          <div style="font-size: 9.5px; opacity: 0.9;">{{branch_name}}</div>
        </div>
      </div>
    </footer>`.trim();
        }

        default:
          return '';
      }
    })
    .filter(Boolean);

  // Divide header, body content, footer cleanly
  const headerHtml = sectionsHtml.find((s) => s.includes('class="rx-header"')) || '';
  const footerHtml = sectionsHtml.find((s) => s.includes('class="rx-footer"')) || '';
  const contentHtml = sectionsHtml
    .filter((s) => !s.includes('class="rx-header"') && !s.includes('class="rx-footer"'))
    .join('\n\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{hospital_name}} - Prescription</title>

  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      width: 210mm;
      min-height: 297mm;
      background: #ffffff;
      font-family: ${fontFamily};
      color: ${textColor};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-size: ${fontSize};
    }

    .rx-page {
      position: relative;
      width: 210mm;
      min-height: 297mm;
      background: #fff;
      overflow: hidden;
      padding: 10mm 7.2mm 0;
      display: flex;
      flex-direction: column;
    }

    .rx-header {
      width: 100%;
    }

    .rx-header-row {
      width: 100%;
      min-height: 34mm;
      display: table;
      table-layout: fixed;
    }

    .rx-header-left,
    .rx-header-right {
      display: table-cell;
      vertical-align: middle;
    }

    .rx-header-left {
      width: 46%;
      padding-left: 3mm;
    }

    .rx-header-right {
      width: 54%;
      padding-left: 2mm;
      padding-right: 2mm;
      text-align: right;
    }

    .rx-logo-img {
      display: block;
      width: 77mm;
      max-height: 32mm;
      object-fit: contain;
      object-position: left center;
    }

    .rx-logo-placeholder {
      display: inline-flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
      min-width: 50mm;
      max-width: 80mm;
      min-height: 25mm;
      padding: 2.5mm 3.5mm;
      border: 1px dashed #cbd5e1;
      border-radius: 4px;
      background: #f8fafc;
      box-sizing: border-box;
    }

    .rx-logo-placeholder-name {
      font-size: 13px;
      font-weight: 700;
      color: ${primaryColor};
      line-height: 1.2;
    }

    .rx-logo-placeholder-sub {
      font-size: 9px;
      color: #64748b;
      margin-top: 1mm;
      font-weight: 500;
    }

    .rx-doctor-name {
      margin: 0 0 1.2mm;
      font-size: 15px;
      line-height: 1.2;
      font-weight: 700;
      color: ${primaryColor};
      white-space: normal;
      word-wrap: break-word;
    }

    .rx-doctor-qualification {
      margin: 0 0 1.2mm;
      font-size: 10.5px;
      line-height: 1.25;
      color: #222;
      font-weight: 600;
      white-space: normal;
      word-wrap: break-word;
    }

    .rx-doctor-specialization {
      margin: 0 0 1.5mm;
      font-size: 10px;
      line-height: 1.25;
      color: #475569;
      font-weight: 500;
      white-space: normal;
      word-wrap: break-word;
    }

    .rx-reg {
      margin: 0;
      font-size: 11px;
      line-height: 1.2;
      color: ${primaryColor};
      font-weight: 700;
    }

    .rx-reg-number {
      color: #333;
      font-weight: 500;
    }

    .rx-header-line {
      height: 0.5mm;
      background: ${headerBorder};
      width: 100%;
      margin-top: 1.5mm;
    }

    .rx-tagline {
      text-align: center;
      color: ${primaryColor};
      font-size: 10px;
      font-weight: 700;
      line-height: 1.25;
      margin: 4.5mm 0 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .rx-content {
      flex: 1;
      width: 100%;
      padding: 7mm 4mm 0;
    }

    .rx-patient-table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
      margin-bottom: 5mm;
    }

    .rx-patient-table td {
      padding: 1.6mm 0;
      vertical-align: top;
      line-height: 1.3;
      border: 0;
    }

    .rx-patient-table .rx-lbl {
      width: 18%;
      font-weight: 700;
      color: #242424;
      white-space: nowrap;
    }

    .rx-patient-table .rx-val {
      width: 32%;
      color: #222;
      font-weight: 500;
      padding-right: 4mm;
    }

    .rx-patient-table .rx-right {
      width: 18%;
      text-align: left;
      padding-left: 2mm;
    }

    .rx-patient-table .rx-right-val {
      width: 32%;
      padding-right: 0;
    }

    .rx-diag-row {
      width: 100%;
      display: table;
      margin: 2mm 0 4mm;
      line-height: 1.45;
    }

    .rx-diag-label,
    .rx-diag-text {
      display: table-cell;
      vertical-align: top;
    }

    .rx-diag-label {
      width: 18%;
      font-weight: 700;
      white-space: nowrap;
    }

    .rx-diag-text {
      width: 82%;
      padding-left: 2mm;
    }

    .rx-symbol {
      font-family: "Times New Roman", serif;
      font-size: 26px;
      line-height: 1;
      font-weight: 700;
      margin: 2mm 0 2.5mm;
      color: ${textColor};
    }

    .rx-medicine-table {
      width: 100%;
      border-collapse: collapse;
      margin: 0 0 5mm;
      font-size: 9.5px;
    }

    .rx-medicine-table th {
      border: 0.3mm solid #b8b8b8;
      background: #f8fafc;
      padding: 2mm 1.5mm;
      text-align: left;
      font-weight: 700;
      color: #222;
    }

    .rx-medicine-table td {
      border: 0.3mm solid ${tableBorder};
      padding: 2mm 1.5mm;
      vertical-align: top;
      line-height: 1.35;
    }

    .rx-medicine-table th:first-child,
    .rx-medicine-table td:first-child {
      width: 7%;
      text-align: center;
    }

    .rx-sec-title {
      font-size: 11px;
      font-weight: 700;
      color: #222;
      margin: 4.5mm 0 2mm;
    }

    .rx-sec-content {
      line-height: 1.5;
      margin-bottom: 3mm;
    }

    .rx-lab-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 4mm;
      font-size: 9.5px;
    }

    .rx-lab-table th,
    .rx-lab-table td {
      border: 0.3mm solid ${tableBorder};
      padding: 2mm 1.5mm;
      text-align: left;
      vertical-align: top;
    }

    .rx-lab-table th {
      background: #f8fafc;
      font-weight: 700;
    }

    .rx-signature-area {
      width: 100%;
      min-height: 24mm;
      margin-top: 5mm;
      display: flex;
      justify-content: flex-end;
      align-items: flex-end;
    }

    .rx-sig-block {
      width: 55mm;
      text-align: center;
      min-height: 22mm;
    }

    .rx-sig-inner {
      min-height: 22mm;
    }

    .rx-sig-img {
      max-width: 43mm;
      max-height: 13mm;
      object-fit: contain;
      display: block;
      margin: 0 auto 1.5mm;
    }

    .rx-custom-image-block {
      width: 100%;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .rx-custom-image-block img {
      vertical-align: middle;
    }

    .rx-ribbon {
      position: absolute;
      right: -8mm;
      bottom: 8mm;
      width: 65mm;
      height: 65mm;
      object-fit: contain;
      object-position: right bottom;
      pointer-events: none;
      z-index: 1;
    }

    .rx-sig-art {
      font-family: 'Brush Script MT', cursive, sans-serif;
      font-size: 20px;
      color: #1e3a8a;
      margin-bottom: 1mm;
    }

    .rx-sig-name {
      font-size: 10.5px;
      font-weight: 700;
      color: #222;
      margin-top: 1mm;
    }

    .rx-sig-qual,
    .rx-sig-spec {
      font-size: 8.8px;
      color: #444;
      line-height: 1.3;
    }

    .rx-footer {
      position: relative;
      width: 100%;
      margin-top: auto;
      padding-top: 0;
      z-index: 2;
    }

    .rx-footer-content-wrap {
      position: relative;
      width: 100%;
      z-index: 2;
    }

    .rx-footer-line {
      width: 100%;
      height: 0.45mm;
      background: ${headerBorder};
      margin-bottom: 2.5mm;
    }

    .rx-contact {
      width: 100%;
      min-height: 18mm;
      display: table;
      table-layout: fixed;
      margin-bottom: 3mm;
    }

    .rx-contact-left,
    .rx-contact-right {
      display: table-cell;
      vertical-align: middle;
    }

    .rx-contact-left {
      width: 48%;
      padding-right: 2mm;
    }

    .rx-contact-right {
      width: 52%;
      padding-left: 3mm;
    }

    .rx-contact-row {
      display: flex;
      align-items: center;
      gap: 2.2mm;
      margin-bottom: 1.8mm;
      font-size: 10.5px;
      font-weight: 700;
      color: #111;
    }

    .rx-contact-row:last-child {
      margin-bottom: 0;
    }

    .rx-contact-row-address {
      display: flex;
      align-items: flex-start;
      gap: 2.2mm;
      font-size: 10px;
      font-weight: 700;
      color: #111;
      line-height: 1.35;
    }

    .rx-icon-circle {
      width: 17px;
      height: 17px;
      border-radius: 50%;
      background: ${accentColor};
      color: #ffffff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      margin-top: 1px;
    }

    .rx-icon-circle svg {
      width: 10px;
      height: 10px;
    }

    .rx-bottom-band {
      position: relative;
      width: calc(100% + 14.4mm);
      margin-left: -7.2mm;
      margin-right: -7.2mm;
      background: ${accentColor};
      color: #ffffff;
      display: table;
      table-layout: fixed;
      padding: 3mm 7.2mm;
      z-index: 10;
    }

    .rx-bottom-left,
    .rx-bottom-right {
      display: table-cell;
      vertical-align: middle;
    }

    .rx-bottom-left {
      width: 50%;
      border-right: 0.35mm solid rgba(255, 255, 255, 0.7);
      padding-right: 6mm;
    }

    .rx-bottom-right {
      width: 50%;
      padding-left: 6mm;
      text-align: right;
    }

    .rx-bottom-title {
      font-size: 9.5px;
      font-weight: 800;
      letter-spacing: 0.03em;
      margin-bottom: 1mm;
      text-transform: uppercase;
      color: #ffffff;
    }

    .rx-bottom-link {
      display: flex;
      align-items: center;
      gap: 2mm;
      font-size: 9.5px;
      font-weight: 700;
      color: #ffffff;
      text-decoration: none;
    }

    .rx-bottom-link svg {
      flex-shrink: 0;
    }

    .rx-compatibility-placeholders {
      display: none !important;
    }

    @media print {
      html,
      body {
        width: 210mm;
        min-height: 297mm;
      }

      .rx-page {
        page-break-after: avoid;
        page-break-inside: avoid;
      }

      .rx-heading,
      .rx-paragraph,
      .rx-divider,
      .rx-spacer,
      .rx-placeholder-block,
      .rx-doctor-details-block,
      .rx-custom-image-block {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .rx-table-custom,
      .rx-medicine-table,
      .rx-lab-table,
      .rx-vitals-container {
        page-break-inside: auto;
        break-inside: auto;
      }

      .rx-table-custom thead,
      .rx-medicine-table thead,
      .rx-lab-table thead {
        display: table-header-group;
      }

      .rx-table-custom tr,
      .rx-medicine-table tr,
      .rx-lab-table tr {
        page-break-inside: avoid;
        break-inside: avoid;
        page-break-after: auto;
      }

      .rx-footer {
        break-inside: avoid;
      }
    }
  </style>
</head>

<body>
  <div class="rx-page">
    ${headerHtml}

    <main class="rx-content"${!headerHtml && !footerHtml ? ' style="padding: 12mm 6mm;"' : ''}>
      ${contentHtml || `<div class="rx-blank-empty-state" style="text-align: center; padding: 35mm 10mm; color: #94a3b8; font-size: 11px; border: 2px dashed #cbd5e1; border-radius: 8px; margin: 10mm 0; background: #f8fafc;">
        <div style="font-size: 15px; font-weight: 700; color: #475569; margin-bottom: 2mm;">Blank Prescription Canvas</div>
        <div>Insert headings, paragraphs, tables, images, dividers or clinical components from the left panel.</div>
      </div>`}
    </main>

    ${footerHtml}

    <!-- COMPATIBILITY PLACEHOLDERS -->
    <div class="rx-compatibility-placeholders">
      <span>{{hospital_name}}</span>
      <span>{{prescription_id}}</span>
      <span>{{appointment_id}}</span>
      <span>{{branch_name}}</span>
      <span>{{vitals_html}}</span>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Validates template HTML ensuring critical placeholders are not accidentally lost
 */
export function validateTemplatePlaceholders(html: string): {
  isValid: boolean;
  warnings: string[];
  missingMandatory: string[];
} {
  const warnings: string[] = [];
  const missingMandatory: string[] = [];

  const mandatoryTokens = [
    { token: '{{patient_name}}', label: 'Patient Name' },
    { token: '{{doctor_name}}', label: 'Doctor Name' },
    { token: '{{medicines_table}}', label: 'Medicines Table' },
  ];

  mandatoryTokens.forEach(({ token, label }) => {
    if (!html.includes(token)) {
      missingMandatory.push(`${label} (${token})`);
    }
  });

  const recommendedTokens = [
    { token: '{{prescription_date}}', label: 'Prescription Date' },
    { token: '{{doctor_signature}}', label: 'Doctor Signature' },
    { token: '{{hospital_name}}', label: 'Hospital Name' },
    { token: '{{hospital_address}}', label: 'Hospital Address' },
  ];

  recommendedTokens.forEach(({ token, label }) => {
    if (!html.includes(token)) {
      warnings.push(`Recommended placeholder ${token} (${label}) is missing.`);
    }
  });

  // Check matching conditional tags {{#tag}}...{{/tag}}
  const openTags = Array.from(html.matchAll(/\{\{#([a-zA-Z0-9_]+)\}\}/g)).map((m) => m[1]);
  const closeTags = Array.from(html.matchAll(/\{\{\/([a-zA-Z0-9_]+)\}\}/g)).map((m) => m[1]);

  openTags.forEach((tag) => {
    if (!closeTags.includes(tag)) {
      warnings.push(`Unclosed conditional block: {{#${tag}}} is missing {{/${tag}}}`);
    }
  });

  return {
    isValid: missingMandatory.length === 0,
    warnings,
    missingMandatory,
  };
}

export const compileTemplateLayout = compileLayoutToHtml;

