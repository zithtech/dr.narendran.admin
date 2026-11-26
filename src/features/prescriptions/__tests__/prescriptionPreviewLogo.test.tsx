import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { resolveImageUrl } from '../../../utils/doctorAvatar';
import ViewPrescriptionModal from '../components/ViewPrescriptionModal';
import { DEFAULT_ANNAAMALAI_LOGO_BASE64 } from '../templates/defaultLogo';
import { SAMPLE_ADMIN_PREVIEW_DATA } from '../templates/templateData';
import {
  compileLayoutToHtml,
  DEFAULT_LAYOUT_CONFIG,
} from '../utils/compileTemplateLayout';
import {
  resolvePrescriptionTemplate,
  sanitizePrescriptionHtml,
} from '../utils/resolvePrescriptionTemplate';

// Mock antd App.useApp
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    App: {
      useApp: () => ({
        message: {
          loading: vi.fn(() => vi.fn()),
          error: vi.fn(),
          success: vi.fn(),
        },
      }),
    },
  };
});

// Mock api
vi.mock('../../../utils/api', () => ({
  default: {
    get: vi.fn((url: string) => {
      if (url === 'settings') {
        return Promise.resolve({
          data: {
            logoUrl: 'uploads/branding/hospital_logo.png',
            fullName: 'Annaamalai Cancer Center',
            firstName: 'Annaamalai',
            lastName: 'Cancer Center',
          },
        });
      }
      return Promise.resolve({ data: {} });
    }),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

describe('HMS Web App – Prescription Preview – Hospital Logo Display & Graceful Fallback', () => {
  const sampleRx: any = {
    id: 'rx-test-123',
    prescription_number: 'RX-2026-001',
    prescription_date: '2026-11-26',
    status: 'active',
    patient_id: 'pat-1',
    patient_code: 'PAT000010',
    patient_name: 'Toxices',
    patient_gender: 'male',
    patient_dob: '1998-05-15',
    doctor: {
      id: 'doc-1',
      name: 'Dr. TEST1',
      specialization: 'Medical Oncology',
      qualification: 'MBBS',
    },
    medicines_count: 1,
    medicines: [
      {
        id: 'med-1',
        medicine_name: 'Atorvastatin',
        dosage: '10 mg - 1 Tablet',
        frequency: 'Twice daily',
        duration: '5 days',
        food_instruction: 'After food - Take in the evening with water',
      },
    ],
    created_at: '2026-11-26T10:00:00Z',
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('1. resolveImageUrl properly handles local backend uploads, branding keys, and cloud storage URLs', () => {
    // 1. Bare uploads key
    const bareUpload = resolveImageUrl('uploads/hospital_logos/logo.png');
    expect(bareUpload).toContain('/api/proxy/image?key=uploads%2Fhospital_logos%2Flogo.png');

    // 2. Bare branding key
    const bareBranding = resolveImageUrl('branding/header_logo.png');
    expect(bareBranding).toContain('/api/proxy/image?key=branding%2Fheader_logo.png');

    // 3. Absolute localhost backend URL normalization
    const localhostUrl = resolveImageUrl('http://localhost:5000/uploads/logo.png');
    expect(localhostUrl).toMatch(/(\/|https?:\/\/localhost:\d+\/)uploads\/logo\.png/);

    // 4. Relative /uploads and /branding
    const relativeUpload = resolveImageUrl('/uploads/logo.png');
    expect(relativeUpload).toMatch(/(\/|https?:\/\/localhost:\d+\/)uploads\/logo\.png/);
    const relativeBranding = resolveImageUrl('/branding/logo.png');
    expect(relativeBranding).toMatch(/(\/|https?:\/\/localhost:\d+\/)branding\/logo\.png/);

    // 5. Unsigned AWS S3 URL
    const s3Url = 'https://hospital-assets.s3.amazonaws.com/logo.png';
    const proxiedS3 = resolveImageUrl(s3Url);
    expect(proxiedS3).toContain('/api/proxy/image?url=');

    // 6. Data URI (Base64) returns untouched
    expect(resolveImageUrl(DEFAULT_ANNAAMALAI_LOGO_BASE64)).toBe(DEFAULT_ANNAAMALAI_LOGO_BASE64);
  });

  it('2. sanitizePrescriptionHtml replaces unresolved {{hospital_logo}} tokens and ensures aspect ratio styling', () => {
    const rawTemplate = `<header class="rx-header"><div class="rx-header-left">{{hospital_logo}}</div></header>`;
    const sanitized = sanitizePrescriptionHtml(rawTemplate, DEFAULT_ANNAAMALAI_LOGO_BASE64, 'Annaamalai Cancer Center');

    expect(sanitized).not.toContain('{{hospital_logo}}');
    expect(sanitized).toContain('<img class="rx-logo-img"');
    expect(sanitized).toContain('alt="Annaamalai Cancer Center Logo"');
    expect(sanitized).toContain('object-fit: contain');
    expect(sanitized).toContain('max-width: 77mm');
    expect(sanitized).toContain('max-height: 32mm');
    expect(sanitized).toContain('onerror=');
  });

  it('3. sanitizePrescriptionHtml catches broken/empty logo img and injects onerror fallback and aspect ratio', () => {
    const rawWithBrokenImg = `
      <div class="rx-header-left">
        <img class="rx-logo" src="" alt="Hospital Logo" />
      </div>
    `;
    const sanitized = sanitizePrescriptionHtml(rawWithBrokenImg, DEFAULT_ANNAAMALAI_LOGO_BASE64);

    expect(sanitized).toContain(`src="${DEFAULT_ANNAAMALAI_LOGO_BASE64}"`);
    expect(sanitized).toContain('onerror="this.removeAttribute(\'onerror\');');
    expect(sanitized).toContain('object-fit: contain');
    expect(sanitized).toContain('max-height: 32mm');
  });

  it('4. sanitizePrescriptionHtml handles unproxied relative paths and unsigned S3 URLs in backend HTML', () => {
    const rawBackendHtml = `
      <header class="rx-header">
        <div class="rx-header-left">
          <img class="rx-logo" src="uploads/prescription_templates/hosp_1/logo.png" alt="Hospital Logo" />
        </div>
      </header>
    `;
    const sanitized = sanitizePrescriptionHtml(rawBackendHtml, DEFAULT_ANNAAMALAI_LOGO_BASE64);

    expect(sanitized).toContain('/api/proxy/image?key=uploads%2Fprescription_templates%2Fhosp_1%2Flogo.png');
    expect(sanitized).toContain('onerror=');
    expect(sanitized).toContain('object-fit: contain');
  });

  it('5. compileLayoutToHtml resolves customLogoUrl with resolveImageUrl and embeds onerror fallback', () => {
    const configWithS3 = {
      ...DEFAULT_LAYOUT_CONFIG,
      sections: DEFAULT_LAYOUT_CONFIG.sections.map((sec) =>
        sec.type === 'HEADER_LETTERHEAD'
          ? {
              ...sec,
              props: {
                ...sec.props,
                customLogoUrl: 'uploads/branding/custom_logo.png',
                logoAlt: 'Custom Hospital Logo',
              },
            }
          : sec
      ),
    };

    const compiledHtml = compileLayoutToHtml(configWithS3);
    expect(compiledHtml).toContain('src="uploads/branding/custom_logo.png"');
    expect(compiledHtml).toContain('onerror="this.removeAttribute(\'onerror\');');
    expect(compiledHtml).toContain('object-fit: contain');
    expect(compiledHtml).toContain('alt="Custom Hospital Logo"');
  });

  it('6. resolvePrescriptionTemplate embeds onerror handler and aspect-ratio style for hospital logo', () => {
    const template = `<header>{{hospital_logo}}</header>`;
    const dataWithLogo = {
      ...SAMPLE_ADMIN_PREVIEW_DATA,
      hospital: {
        ...SAMPLE_ADMIN_PREVIEW_DATA.hospital,
        name: 'Apollo Hospitals',
        logo_url: 'uploads/apollo/logo.png',
      },
    };

    const result = resolvePrescriptionTemplate(template, dataWithLogo);
    expect(result.renderedHtml).toContain('class="rx-logo-img"');
    expect(result.renderedHtml).toContain('/api/proxy/image?key=uploads%2Fapollo%2Flogo.png');
    expect(result.renderedHtml).toContain('onerror=');
    expect(result.renderedHtml).toContain('object-fit: contain');
    expect(result.renderedHtml).toContain('max-height: 32mm');
  });

  it('7. ViewPrescriptionModal renders iframe with resolved hospital logo from prescription or localStorage', () => {
    localStorage.setItem('adminLogoUrl', DEFAULT_ANNAAMALAI_LOGO_BASE64);

    render(
      <ViewPrescriptionModal
        prescription={sampleRx}
        open={true}
        onClose={vi.fn()}
      />
    );

    const iframe = screen.getByTitle('Prescription PDF Preview') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();

    const srcDoc = iframe.getAttribute('srcDoc') || '';
    expect(srcDoc).toMatch(/class=["']rx-logo(-img)?["']/);
    expect(srcDoc).toContain(DEFAULT_ANNAAMALAI_LOGO_BASE64);
    expect(srcDoc).not.toContain('{{hospital_logo}}');
    expect(srcDoc).toContain('object-fit: contain');
    expect(srcDoc).toContain('onerror=');
  });

  it('8. ViewPrescriptionModal gracefully recovers from broken logo in prescription and preserves default branding', () => {
    const rxWithBrokenLogo = {
      ...sampleRx,
      hospital_logo: 'https://broken-invalid-domain.xyz/does_not_exist.png',
      hospital_name: 'Annaamalai Cancer Center',
    };

    render(
      <ViewPrescriptionModal
        prescription={rxWithBrokenLogo}
        open={true}
        onClose={vi.fn()}
      />
    );

    const iframe = screen.getByTitle('Prescription PDF Preview') as HTMLIFrameElement;
    expect(iframe).toBeInTheDocument();

    const srcDoc = iframe.getAttribute('srcDoc') || '';
    expect(srcDoc).toContain('onerror="this.removeAttribute(\'onerror\'); this.src=');
    expect(srcDoc).toContain(DEFAULT_ANNAAMALAI_LOGO_BASE64);
  });
});
