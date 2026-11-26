import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SectionPaletteDrawer } from '../components/builder/SectionPaletteDrawer';
import {
  SectionPropertyInspector,
  TemplateImageControl,
} from '../components/builder/SectionPropertyInspector';
import { prescriptionTemplatesApi } from '../services/prescriptionTemplatesApi';
import type { TemplateSectionBlock } from '../types/template';
import { DEFAULT_LAYOUT_CONFIG } from '../utils/compileTemplateLayout';

describe('Prescription Template Builder - Image & Logo Insertion Feature', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. SectionPaletteDrawer renders "Insert Image / Logo Block" action button and triggers callback', () => {
    const handleAddImage = vi.fn();
    const handleToggle = vi.fn();
    const handleMove = vi.fn();
    const handleSelect = vi.fn();

    render(
      <SectionPaletteDrawer
        sections={DEFAULT_LAYOUT_CONFIG.sections}
        selectedSectionId="sec_header"
        onSelectSection={handleSelect}
        onToggleSection={handleToggle}
        onMoveSection={handleMove}
        onAddImageSection={handleAddImage}
      />
    );

    const insertBtn = screen.getByRole('button', { name: /Insert Image \/ Logo Block/i });
    expect(insertBtn).toBeInTheDocument();

    fireEvent.click(insertBtn);
    expect(handleAddImage).toHaveBeenCalledTimes(1);
  });

  it('2. SectionPaletteDrawer displays custom image section and allows deleting it', () => {
    const customImageBlock: TemplateSectionBlock = {
      id: 'sec_img_custom',
      type: 'CUSTOM_IMAGE',
      title: 'Hospital Seal Block',
      enabled: true,
      order: 10,
      props: { imageUrl: 'https://example.com/seal.png' },
    };

    const handleDelete = vi.fn();
    render(
      <SectionPaletteDrawer
        sections={[...DEFAULT_LAYOUT_CONFIG.sections, customImageBlock]}
        selectedSectionId="sec_img_custom"
        onSelectSection={vi.fn()}
        onToggleSection={vi.fn()}
        onMoveSection={vi.fn()}
        onDeleteSection={handleDelete}
      />
    );

    expect(screen.getByText('Hospital Seal Block')).toBeInTheDocument();
    const deleteBtn = screen.getByTitle('Delete image block');
    expect(deleteBtn).toBeInTheDocument();

    fireEvent.click(deleteBtn);
    expect(handleDelete).toHaveBeenCalledWith('sec_img_custom');
  });

  it('3. TemplateImageControl renders preview, upload button, dimensions, and alignment', () => {
    const handleChange = vi.fn();
    const handleRemove = vi.fn();

    render(
      <TemplateImageControl
        label="Test Image Element"
        imageUrl="https://example.com/sample_logo.png"
        altText="Hospital Logo"
        width="60mm"
        height="auto"
        alignment="center"
        objectFit="contain"
        maintainAspectRatio={true}
        onChange={handleChange}
        onRemove={handleRemove}
      />
    );

    expect(screen.getByText('Test Image Element')).toBeInTheDocument();
    const img = screen.getByAltText('Hospital Logo');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/sample_logo.png');

    // Check alignment buttons
    const leftBtn = screen.getByRole('button', { name: /Left/i });
    fireEvent.click(leftBtn);
    expect(handleChange).toHaveBeenCalledWith({ alignment: 'left' });

    // Check preset width button
    const preset30mm = screen.getByRole('button', { name: '30mm' });
    fireEvent.click(preset30mm);
    expect(handleChange).toHaveBeenCalledWith({ width: '30mm', height: 'auto' });
  });

  it('4. TemplateImageControl client-side file upload and validation', async () => {
    const handleChange = vi.fn();
    const uploadSpy = vi
      .spyOn(prescriptionTemplatesApi, 'uploadImage')
      .mockResolvedValue('https://s3.amazonaws.com/uploads/prescription_templates/new_logo.png');

    render(
      <TemplateImageControl
        label="Custom Logo"
        imageUrl=""
        onChange={handleChange}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const sampleFile = new File(['dummy png data'], 'test_logo.png', { type: 'image/png' });
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [sampleFile] } });
    });

    expect(uploadSpy).toHaveBeenCalledWith(sampleFile, undefined);
  });

  it('5. SectionPropertyInspector renders Header Logo controls when HEADER_LETTERHEAD is selected', () => {
    const headerSection = DEFAULT_LAYOUT_CONFIG.sections.find((s) => s.type === 'HEADER_LETTERHEAD')!;
    const handlePropsChange = vi.fn();

    render(
      <SectionPropertyInspector
        layoutConfig={DEFAULT_LAYOUT_CONFIG}
        selectedSection={headerSection}
        onChangeTheme={vi.fn()}
        onChangeSectionProps={handlePropsChange}
      />
    );

    expect(screen.getByText('Hospital Header Logo')).toBeInTheDocument();
    expect(screen.getByText('Replaces default {{hospital_logo}} in letterhead')).toBeInTheDocument();
  });

  it('6. SectionPropertyInspector renders Doctor Signature controls when SIGNATURE_BLOCK is selected', () => {
    const sigSection = DEFAULT_LAYOUT_CONFIG.sections.find((s) => s.type === 'SIGNATURE_BLOCK')!;

    render(
      <SectionPropertyInspector
        layoutConfig={DEFAULT_LAYOUT_CONFIG}
        selectedSection={sigSection}
        onChangeTheme={vi.fn()}
        onChangeSectionProps={vi.fn()}
      />
    );

    expect(screen.getByText('Doctor Signature / Stamp')).toBeInTheDocument();
  });
});
