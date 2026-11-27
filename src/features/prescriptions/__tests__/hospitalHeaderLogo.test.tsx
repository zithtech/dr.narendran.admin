import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  SectionPropertyInspector,
  TemplateImageControl,
} from '../components/builder/SectionPropertyInspector';
import { DEFAULT_ANNAAMALAI_LOGO_BASE64 } from '../templates/defaultLogo';
import { SAMPLE_ADMIN_PREVIEW_DATA } from '../templates/templateData';
import {
  compileLayoutToHtml,
  DEFAULT_LAYOUT_CONFIG,
} from '../utils/compileTemplateLayout';
import { resolvePrescriptionTemplate } from '../utils/resolvePrescriptionTemplate';
import { resolveImageUrl } from '../../../utils/doctorAvatar';

describe('HMS Web App – Prescription Template Builder – Hospital Header Logo Display & Fallback', () => {
  it('1. resolveImageUrl handles bare storage keys and unsigned S3 URLs correctly', () => {
    // Bare storage key without leading slash
    const bareKey = 'uploads/prescription_templates/hosp_123/1700000000_logo.png';
    const resolvedBare = resolveImageUrl(bareKey);
    expect(resolvedBare).toContain(`/api/proxy/image?key=${encodeURIComponent(bareKey)}`);

    // Bare branding key
    const brandingKey = 'branding/logo.png';
    const resolvedBranding = resolveImageUrl(brandingKey);
    expect(resolvedBranding).toContain(`/api/proxy/image?key=${encodeURIComponent(brandingKey)}`);

    // Unsigned AWS S3 URL
    const s3Url = 'https://my-bucket.s3.ap-south-1.amazonaws.com/uploads/logo.png';
    const resolvedS3 = resolveImageUrl(s3Url);
    expect(resolvedS3).toContain(`/api/proxy/image?url=${encodeURIComponent(s3Url)}`);

    // Data URI and blob URL should be preserved as-is
    expect(resolveImageUrl(DEFAULT_ANNAAMALAI_LOGO_BASE64)).toBe(DEFAULT_ANNAAMALAI_LOGO_BASE64);
    expect(resolveImageUrl('blob:http://localhost:5173/uuid-123')).toBe('blob:http://localhost:5173/uuid-123');

    // Null or undefined
    expect(resolveImageUrl(null)).toBeNull();
    expect(resolveImageUrl('')).toBeNull();
    expect(resolveImageUrl('undefined')).toBeNull();
  });

  it('2. resolvePrescriptionTemplate uses DEFAULT_ANNAAMALAI_LOGO_BASE64 for Annaamalai Cancer Center when no custom logo is specified', () => {
    const rawTemplate = `<div class="header">{{hospital_logo}}</div>`;
    const dataWithoutLogo = {
      ...SAMPLE_ADMIN_PREVIEW_DATA,
      hospital: {
        ...SAMPLE_ADMIN_PREVIEW_DATA.hospital,
        name: 'Annaamalai Cancer Center',
        logo_url: undefined,
      },
    };

    const result = resolvePrescriptionTemplate(rawTemplate, dataWithoutLogo);
    expect(result.renderedHtml).toContain('class="rx-logo-img"');
    expect(result.renderedHtml).toContain(DEFAULT_ANNAAMALAI_LOGO_BASE64);
    expect(result.renderedHtml).not.toContain('{{hospital_logo}}');
  });

  it('3. resolvePrescriptionTemplate displays a styled placeholder badge instead of broken image when another hospital has no logo', () => {
    const rawTemplate = `<div class="header">{{hospital_logo}}</div>`;
    const dataWithoutLogo = {
      ...SAMPLE_ADMIN_PREVIEW_DATA,
      hospital: {
        name: 'Apex General Hospital',
        address: '45 Lake View Road, Bangalore',
        phone: '+91 9988776655',
        email: 'info@apexhospital.org',
        website: 'www.apexhospital.org',
        logo_url: undefined,
      },
    };

    const result = resolvePrescriptionTemplate(rawTemplate, dataWithoutLogo);
    expect(result.renderedHtml).toContain('class="rx-logo-placeholder"');
    expect(result.renderedHtml).toContain('Apex General Hospital');
    expect(result.renderedHtml).toContain('Hospital Letterhead');
    expect(result.renderedHtml).not.toContain('<img class="rx-logo-img" src=""');
    expect(result.renderedHtml).not.toContain('{{hospital_logo}}');
  });

  it('4. resolvePrescriptionTemplate proxies bare upload keys and unsigned S3 URLs in hospital logo and img tags', () => {
    const rawTemplate = `<div class="header">{{hospital_logo}}</div>`;
    const dataWithS3Logo = {
      ...SAMPLE_ADMIN_PREVIEW_DATA,
      hospital: {
        name: 'Apollo Hospital',
        logo_url: 'uploads/prescription_templates/hosp_99/apollo_logo.png',
      },
    };

    const result = resolvePrescriptionTemplate(rawTemplate, dataWithS3Logo);
    expect(result.renderedHtml).toContain('class="rx-logo-img"');
    expect(result.renderedHtml).toContain('/api/proxy/image?key=uploads%2Fprescription_templates%2Fhosp_99%2Fapollo_logo.png');
  });

  it('5. TemplateImageControl renders clean styled placeholder when no image is uploaded (never a broken img)', () => {
    render(
      <TemplateImageControl
        label="Hospital Header Logo"
        imageUrl=""
        altText="Hospital Logo"
        onChange={vi.fn()}
      />
    );

    // Should NOT have an <img> tag when empty
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('No Image')).toBeInTheDocument();
    expect(screen.getByText('Upload Image')).toBeInTheDocument();
  });

  it('6. TemplateImageControl gracefully catches image error and displays Load Error indicator instead of broken browser icon', () => {
    render(
      <TemplateImageControl
        label="Hospital Header Logo"
        imageUrl="https://invalid-domain.xyz/broken-logo.png"
        altText="Hospital Logo"
        onChange={vi.fn()}
      />
    );

    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();

    // Trigger image load failure
    fireEvent.error(img);

    // img element should be replaced by fallback placeholder
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByText('Load Error')).toBeInTheDocument();
    expect(screen.getByText(/Failed to load image preview/i)).toBeInTheDocument();
  });

  it('7. SectionPropertyInspector correctly updates and displays Hospital Header Logo', () => {
    const onChangeSectionProps = vi.fn();
    const headerSection = DEFAULT_LAYOUT_CONFIG.sections.find((s) => s.type === 'HEADER_LETTERHEAD')!;

    render(
      <SectionPropertyInspector
        layoutConfig={DEFAULT_LAYOUT_CONFIG}
        selectedSection={headerSection}
        onChangeTheme={vi.fn()}
        onChangeSectionProps={onChangeSectionProps}
      />
    );

    expect(screen.getByText('Hospital Header Logo')).toBeInTheDocument();
    expect(screen.getByText('Replaces default {{hospital_logo}} in letterhead')).toBeInTheDocument();
    expect(screen.getByText('Upload Image')).toBeInTheDocument();
  });

  it('8. compileLayoutToHtml includes .rx-logo-placeholder styles in generated CSS', () => {
    const html = compileLayoutToHtml(DEFAULT_LAYOUT_CONFIG);
    expect(html).toContain('.rx-logo-placeholder {');
    expect(html).toContain('.rx-logo-placeholder-name {');
    expect(html).toContain('.rx-logo-placeholder-sub {');
    expect(html).toContain('.rx-logo-img {');
  });
});
