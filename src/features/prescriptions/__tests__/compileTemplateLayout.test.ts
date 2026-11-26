import { describe, expect, it } from 'vitest';

import { SAMPLE_ADMIN_PREVIEW_DATA } from '../templates/templateData';
import type { TemplateLayoutConfig } from '../types/template';
import {
  compileLayoutToHtml,
  DEFAULT_LAYOUT_CONFIG,
  validateTemplatePlaceholders,
} from '../utils/compileTemplateLayout';
import { resolvePrescriptionTemplate } from '../utils/resolvePrescriptionTemplate';

describe('Prescription Template Visual Compiler & Linter System', () => {
  it('1. Compiles default layout config into valid A4 print HTML with standard dimensions', () => {
    const html = compileLayoutToHtml(DEFAULT_LAYOUT_CONFIG);

    expect(html).toContain('size: A4 portrait;');
    expect(html).toContain('width: 210mm;');
    expect(html).toContain('min-height: 297mm;');
    expect(html).toContain('class="rx-page"');
    expect(html).toContain('class="rx-header"');
    expect(html).toContain('class="rx-content"');
    expect(html).toContain('class="rx-footer"');

    // Contains all core placeholders
    expect(html).toContain('{{patient_name}}');
    expect(html).toContain('{{doctor_name}}');
    expect(html).toContain('{{medicines_table}}');
    expect(html).toContain('{{doctor_signature}}');
    expect(html).toContain('{{vitals_html}}');
  });

  it('2. Injects custom branding colors and font-family into the compiled CSS', () => {
    const customConfig: TemplateLayoutConfig = {
      ...DEFAULT_LAYOUT_CONFIG,
      theme: {
        ...DEFAULT_LAYOUT_CONFIG.theme,
        primaryColor: '#1e3a8a', // Deep Hospital Navy
        secondaryColor: '#38bdf8',
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '12px',
      },
    };

    const html = compileLayoutToHtml(customConfig);

    expect(html).toContain('color: #1e3a8a;');
    expect(html).toContain('font-family: Inter, system-ui, sans-serif;');
    expect(html).toContain('font-size: 12px;');
  });

  it('3. Excludes disabled sections from the compiled template', () => {
    const configWithoutVitals: TemplateLayoutConfig = {
      ...DEFAULT_LAYOUT_CONFIG,
      sections: DEFAULT_LAYOUT_CONFIG.sections.map((s) =>
        s.type === 'VITALS_BLOCK' ? { ...s, enabled: false } : s
      ),
    };

    const html = compileLayoutToHtml(configWithoutVitals);

    expect(html).not.toContain('class="rx-vitals-block"');
    // Still retains medicines and doctor info
    expect(html).toContain('{{medicines_table}}');
    expect(html).toContain('{{doctor_name}}');
  });

  it('4. Reorders sections according to their order property', () => {
    // Put diagnosis before patient details
    const reorderedConfig: TemplateLayoutConfig = {
      ...DEFAULT_LAYOUT_CONFIG,
      sections: DEFAULT_LAYOUT_CONFIG.sections.map((s) => {
        if (s.type === 'DIAGNOSIS_BLOCK') return { ...s, order: 2 };
        if (s.type === 'PATIENT_DETAILS') return { ...s, order: 4 };
        return s;
      }),
    };

    const html = compileLayoutToHtml(reorderedConfig);
    const diagIndex = html.indexOf('{{diagnosis}}');
    const patientIndex = html.indexOf('{{patient_name}}');

    expect(diagIndex).toBeGreaterThan(-1);
    expect(patientIndex).toBeGreaterThan(-1);
    expect(diagIndex).toBeLessThan(patientIndex);
  });

  it('5. Placeholder validator catches missing mandatory tokens', () => {
    const validHtml = compileLayoutToHtml(DEFAULT_LAYOUT_CONFIG);
    const validResult = validateTemplatePlaceholders(validHtml);
    expect(validResult.isValid).toBe(true);
    expect(validResult.missingMandatory).toHaveLength(0);

    // Corrupt HTML by removing medicines table
    const corruptedHtml = validHtml.replace('{{medicines_table}}', '<!-- missing -->');
    const invalidResult = validateTemplatePlaceholders(corruptedHtml);
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.missingMandatory.some((m) => m.includes('medicines_table'))).toBe(true);
  });

  it('6. Placeholder validator warns on unclosed conditional blocks', () => {
    const unclosedHtml = '<div>{{#vitals_section}} <span>Vitals</span> </div>';
    const result = validateTemplatePlaceholders(unclosedHtml);
    expect(result.warnings.some((w) => w.includes('Unclosed conditional block'))).toBe(true);
  });

  it('7. End-to-end resolution: compiled HTML seamlessly resolves with clinical context data', () => {
    const compiled = compileLayoutToHtml(DEFAULT_LAYOUT_CONFIG);
    const resolved = resolvePrescriptionTemplate(compiled, SAMPLE_ADMIN_PREVIEW_DATA);

    expect(resolved.renderedHtml).toContain(SAMPLE_ADMIN_PREVIEW_DATA.patient!.name);
    expect(resolved.renderedHtml).toContain(SAMPLE_ADMIN_PREVIEW_DATA.doctor!.name);
    expect(resolved.renderedHtml).toContain('rx-medicine-table');
    expect(resolved.renderedHtml).not.toContain('{{patient_name}}');
    expect(resolved.renderedHtml).not.toContain('{{doctor_name}}');
  });

  it('8. Compiles CUSTOM_IMAGE block into valid A4 print image markup with alignment and dimensions', () => {
    const configWithImage: TemplateLayoutConfig = {
      ...DEFAULT_LAYOUT_CONFIG,
      sections: [
        ...DEFAULT_LAYOUT_CONFIG.sections,
        {
          id: 'sec_custom_img_1',
          type: 'CUSTOM_IMAGE',
          title: 'Clinical Diagram / Clinic Stamp',
          enabled: true,
          order: 6,
          props: {
            imageUrl: 'https://s3.amazonaws.com/uploads/prescription_templates/hosp_1/sample_diagram.png',
            altText: 'Radiation Therapy Field Diagram',
            width: '80mm',
            height: '40mm',
            alignment: 'center',
            objectFit: 'contain',
            maintainAspectRatio: true,
            caption: 'Figure 1: Targeted Clinical Area',
          },
        },
      ],
    };

    const html = compileLayoutToHtml(configWithImage);

    expect(html).toContain('class="rx-custom-image-block"');
    expect(html).toContain('text-align: center;');
    expect(html).toContain('src="https://s3.amazonaws.com/uploads/prescription_templates/hosp_1/sample_diagram.png"');
    expect(html).toContain('alt="Radiation Therapy Field Diagram"');
    expect(html).toContain('width: 80mm;');
    expect(html).toContain('height: 40mm;');
    expect(html).toContain('object-fit: contain;');
    expect(html).toContain('Figure 1: Targeted Clinical Area');
  });

  it('9. Compiles CUSTOM_IMAGE block placeholder gracefully when no image is uploaded yet', () => {
    const configWithEmptyImage: TemplateLayoutConfig = {
      ...DEFAULT_LAYOUT_CONFIG,
      sections: [
        ...DEFAULT_LAYOUT_CONFIG.sections,
        {
          id: 'sec_custom_img_empty',
          type: 'CUSTOM_IMAGE',
          title: 'Empty Image Block',
          enabled: true,
          order: 5,
          props: {
            imageUrl: '',
            alignment: 'right',
          },
        },
      ],
    };

    const html = compileLayoutToHtml(configWithEmptyImage);

    expect(html).toContain('class="rx-custom-image-block"');
    expect(html).toContain('text-align: right;');
    expect(html).toContain('[ Image / Logo Block: No image uploaded ]');
  });

  it('10. Injects custom hospital logo in HEADER_LETTERHEAD with custom dimensions and fit', () => {
    const configWithCustomLogo: TemplateLayoutConfig = {
      ...DEFAULT_LAYOUT_CONFIG,
      sections: DEFAULT_LAYOUT_CONFIG.sections.map((s) =>
        s.type === 'HEADER_LETTERHEAD'
          ? {
              ...s,
              props: {
                ...s.props,
                customLogoUrl: 'https://s3.amazonaws.com/uploads/prescription_templates/hosp_1/metro_hospital_logo.png',
                logoWidth: '90mm',
                logoHeight: '35mm',
                logoAlign: 'left',
                logoFit: 'contain',
                logoAlt: 'Metro City Hospital Logo',
              },
            }
          : s
      ),
    };

    const html = compileLayoutToHtml(configWithCustomLogo);

    expect(html).toContain('class="rx-logo-img"');
    expect(html).toContain('src="https://s3.amazonaws.com/uploads/prescription_templates/hosp_1/metro_hospital_logo.png"');
    expect(html).toContain('alt="Metro City Hospital Logo"');
    expect(html).toContain('width: 90mm;');
    expect(html).toContain('max-height: 35mm;');
    expect(html).not.toContain('{{hospital_logo}}');
  });

  it('11. Injects custom doctor signature and footer banner images', () => {
    const configWithSigAndFooter: TemplateLayoutConfig = {
      ...DEFAULT_LAYOUT_CONFIG,
      sections: DEFAULT_LAYOUT_CONFIG.sections.map((s) => {
        if (s.type === 'SIGNATURE_BLOCK') {
          return {
            ...s,
            props: {
              ...s.props,
              customSignatureUrl: 'https://s3.amazonaws.com/uploads/prescription_templates/hosp_1/signature_stamp.png',
              signatureWidth: '50mm',
              alignment: 'left',
            },
          };
        }
        if (s.type === 'FOOTER_LETTERHEAD') {
          return {
            ...s,
            props: {
              ...s.props,
              customFooterImageUrl: 'https://s3.amazonaws.com/uploads/prescription_templates/hosp_1/nabh_banner.png',
            },
          };
        }
        return s;
      }),
    };

    const html = compileLayoutToHtml(configWithSigAndFooter);

    expect(html).toContain('src="https://s3.amazonaws.com/uploads/prescription_templates/hosp_1/signature_stamp.png"');
    expect(html).toContain('justify-content: flex-start;');
    expect(html).toContain('src="https://s3.amazonaws.com/uploads/prescription_templates/hosp_1/nabh_banner.png"');
    expect(html).toContain('class="rx-footer-custom-banner"');
  });
});
