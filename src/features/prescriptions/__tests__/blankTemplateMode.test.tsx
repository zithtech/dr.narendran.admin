import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PrescriptionTemplateBuilderModal } from '../components/builder/PrescriptionTemplateBuilderModal';
import { InsertElementsPalette } from '../components/builder/InsertElementsPalette';
import { SectionPaletteDrawer } from '../components/builder/SectionPaletteDrawer';
import { TemplateCreationSelectionModal } from '../components/TemplateCreationSelectionModal';
import {
  BLANK_LAYOUT_CONFIG,
  compileLayoutToHtml,
  DEFAULT_LAYOUT_CONFIG,
} from '../utils/compileTemplateLayout';

describe('HMS Web App – Prescription Template Builder: Blank Template Creation Mode', () => {
  it('1. TemplateCreationSelectionModal renders Option A (Edit Default Template) and Option B (Create Blank Template)', () => {
    const handleSelect = vi.fn();
    const handleClose = vi.fn();

    render(
      <TemplateCreationSelectionModal
        isOpen={true}
        onClose={handleClose}
        onSelectOption={handleSelect}
        hospitalName="Apollo Hospitals"
      />
    );

    // Header and options check
    expect(screen.getByText('Create Prescription Template')).toBeInTheDocument();
    expect(screen.getByText('Edit Default Template')).toBeInTheDocument();
    expect(screen.getByText('Create Blank Template')).toBeInTheDocument();

    // Click Option A (Default template)
    const defaultBtn = screen.getByText('Load Default Template');
    fireEvent.click(defaultBtn);
    expect(handleSelect).toHaveBeenCalledWith('default');

    // Click Option B (Blank template)
    const blankBtn = screen.getByText('Start with Blank Canvas');
    fireEvent.click(blankBtn);
    expect(handleSelect).toHaveBeenCalledWith('blank');
  });

  it('2. PrescriptionTemplateBuilderModal in "blank" mode initializes with an empty canvas and BLANK CANVAS MODE indicator', () => {
    render(
      <PrescriptionTemplateBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialMode="blank"
        template={null}
        hospitalName="City Cancer Center"
      />
    );

    // Check mode indicator
    expect(screen.getByText('BLANK CANVAS MODE')).toBeInTheDocument();
    expect(screen.getByDisplayValue('City Cancer Center Custom Template')).toBeInTheDocument();

    // Check tabs
    expect(screen.getByText('+ Elements')).toBeInTheDocument();
    expect(screen.getByText(/Layers \(0\)/)).toBeInTheDocument();
  });

  it('3. PrescriptionTemplateBuilderModal in "default" mode initializes with 9 standard sections and DEFAULT TEMPLATE MODE indicator', () => {
    render(
      <PrescriptionTemplateBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        initialMode="default"
        template={null}
        hospitalName="City Cancer Center"
      />
    );

    // Check mode indicator
    expect(screen.getByText('DEFAULT TEMPLATE MODE')).toBeInTheDocument();
    expect(screen.getByText(/Layers \(9\)/)).toBeInTheDocument();
  });

  it('4. InsertElementsPalette contains all required basic and clinical elements', () => {
    const handleInsert = vi.fn();
    render(<InsertElementsPalette onInsertElement={handleInsert} />);

    // Basic elements
    expect(screen.getByText('Heading (H1 - H3)')).toBeInTheDocument();
    expect(screen.getByText('Paragraph Text')).toBeInTheDocument();
    expect(screen.getByText('Custom Table')).toBeInTheDocument();
    expect(screen.getByText('Image / Logo')).toBeInTheDocument();
    expect(screen.getByText('Divider Line')).toBeInTheDocument();
    expect(screen.getByText('Vertical Spacer')).toBeInTheDocument();
    expect(screen.getByText('Dynamic Placeholder')).toBeInTheDocument();

    // Clinical elements
    expect(screen.getByText('Hospital Letterhead & Doctor')).toBeInTheDocument();
    expect(screen.getByText('Patient Demographics Grid')).toBeInTheDocument();
    expect(screen.getByText('Doctor Credentials Block')).toBeInTheDocument();
    expect(screen.getByText('Physical Vitals & Metrics')).toBeInTheDocument();
    expect(screen.getByText('Diagnosis & ℞ Symbol')).toBeInTheDocument();
    expect(screen.getByText('Prescribed Medications (Rx Table)')).toBeInTheDocument();
    expect(screen.getByText('Lab Tests & Diagnostic Investigations')).toBeInTheDocument();
    expect(screen.getByText('Advice, Instructions & Follow-up')).toBeInTheDocument();
    expect(screen.getByText('Doctor E-Signature Block')).toBeInTheDocument();
    expect(screen.getByText('Hospital Footer & Contact Info')).toBeInTheDocument();

    // Click to insert an element
    const headingEl = screen.getByText('Heading (H1 - H3)').closest('button');
    expect(headingEl).toBeInTheDocument();
    fireEvent.click(headingEl!);
    expect(handleInsert).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'HEADING', title: 'Heading (H1 - H3)' })
    );
  });

  it('5. SectionPaletteDrawer supports duplicating, reordering and deleting elements', () => {
    const handleSelect = vi.fn();
    const handleToggle = vi.fn();
    const handleMove = vi.fn();
    const handleDuplicate = vi.fn();
    const handleDelete = vi.fn();

    const sampleSections = [
      {
        id: 'sec_1',
        type: 'HEADING' as const,
        title: 'Custom Heading',
        enabled: true,
        order: 1,
        props: { text: 'Heading 1' },
      },
      {
        id: 'sec_2',
        type: 'PARAGRAPH' as const,
        title: 'Paragraph Block',
        enabled: true,
        order: 2,
        props: { content: 'Some text' },
      },
    ];

    render(
      <SectionPaletteDrawer
        sections={sampleSections}
        selectedSectionId="sec_1"
        onSelectSection={handleSelect}
        onToggleSection={handleToggle}
        onMoveSection={handleMove}
        onDuplicateSection={handleDuplicate}
        onDeleteSection={handleDelete}
      />
    );

    expect(screen.getByText('Custom Heading')).toBeInTheDocument();
    expect(screen.getByText('Paragraph Block')).toBeInTheDocument();

    // Duplicate button
    const dupButtons = screen.getAllByTitle('Duplicate element');
    expect(dupButtons.length).toBe(2);
    fireEvent.click(dupButtons[0]!);
    expect(handleDuplicate).toHaveBeenCalledWith('sec_1');

    // Delete button
    const deleteButtons = screen.getAllByTitle('Delete element');
    expect(deleteButtons.length).toBe(2);
    fireEvent.click(deleteButtons[1]!);
    expect(handleDelete).toHaveBeenCalledWith('sec_2');

    // Move button
    const moveDownButtons = screen.getAllByTitle('Move Down');
    fireEvent.click(moveDownButtons[0]!);
    expect(handleMove).toHaveBeenCalledWith('sec_1', 'down');
  });

  it('6. compileLayoutToHtml compiles empty BLANK_LAYOUT_CONFIG safely with empty canvas state', () => {
    const html = compileLayoutToHtml(BLANK_LAYOUT_CONFIG);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('rx-page');
    expect(html).toContain('Blank Prescription Canvas');
    expect(html).toContain('rx-compatibility-placeholders');
  });

  it('7. compileLayoutToHtml compiles all newly added basic and clinical element blocks into standard A4 CSS', () => {
    const customConfig = {
      theme: DEFAULT_LAYOUT_CONFIG.theme,
      sections: [
        {
          id: 'sec_head',
          type: 'HEADING' as const,
          title: 'Prescription Heading',
          enabled: true,
          order: 1,
          props: { text: 'CLINICAL SUMMARY', level: 'h1', alignment: 'center', fontSize: '18px' },
        },
        {
          id: 'sec_para',
          type: 'PARAGRAPH' as const,
          title: 'Notes',
          enabled: true,
          order: 2,
          props: { content: 'Take medication strictly after food.', alignment: 'left' },
        },
        {
          id: 'sec_tbl',
          type: 'TABLE' as const,
          title: 'Custom Investigation Table',
          enabled: true,
          order: 3,
          props: {
            rows: 2,
            columns: 2,
            headers: ['Test', 'Result'],
            data: [['Hemoglobin', '13.5 g/dL'], ['Platelets', '2.5 Lakhs']],
          },
        },
        {
          id: 'sec_div',
          type: 'DIVIDER' as const,
          title: 'Divider',
          enabled: true,
          order: 4,
          props: { style: 'dashed', thickness: '1mm', color: '#67358f', width: '80%' },
        },
        {
          id: 'sec_spc',
          type: 'SPACER' as const,
          title: 'Spacer',
          enabled: true,
          order: 5,
          props: { height: '10mm' },
        },
        {
          id: 'sec_token',
          type: 'PLACEHOLDER_BLOCK' as const,
          title: 'Patient ID',
          enabled: true,
          order: 6,
          props: { token: '{{patient_id}}', prefix: 'Patient Code: ' },
        },
        {
          id: 'sec_doc',
          type: 'DOCTOR_DETAILS' as const,
          title: 'Doctor Info',
          enabled: true,
          order: 7,
          props: { showDoctorName: true, showRegistration: true },
        },
      ],
    };

    const compiled = compileLayoutToHtml(customConfig);

    // Verify Heading
    expect(compiled).toContain('rx-heading-h1');
    expect(compiled).toContain('CLINICAL SUMMARY');

    // Verify Paragraph
    expect(compiled).toContain('rx-paragraph');
    expect(compiled).toContain('Take medication strictly after food.');

    // Verify Table
    expect(compiled).toContain('rx-table-custom');
    expect(compiled).toContain('Hemoglobin');
    expect(compiled).toContain('13.5 g/dL');

    // Verify Divider & Spacer
    expect(compiled).toContain('rx-divider');
    expect(compiled).toContain('rx-spacer');
    expect(compiled).toContain('10mm');

    // Verify Placeholder & Doctor Details
    expect(compiled).toContain('rx-placeholder-block');
    expect(compiled).toContain('{{patient_id}}');
    expect(compiled).toContain('rx-doctor-details-block');
    expect(compiled).toContain('{{doctor_registration_number}}');

    // Verify print page break safety
    expect(compiled).toContain('.rx-heading,');
    expect(compiled).toContain('.rx-table-custom,');
    expect(compiled).toContain('break-inside: avoid;');
  });

  it('8. User can insert an element, duplicate it, and save the blank template as draft', async () => {
    const handleSave = vi.fn().mockResolvedValue(undefined);

    render(
      <PrescriptionTemplateBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={handleSave}
        initialMode="blank"
        template={null}
        hospitalName="Apollo Hospitals"
      />
    );

    // Insert an element (e.g. Heading)
    const addHeadingBtn = screen.getByText('Heading (H1 - H3)').closest('button');
    expect(addHeadingBtn).toBeInTheDocument();
    fireEvent.click(addHeadingBtn!);

    // Should now have 1 layer
    expect(screen.getByText(/Layers \(1\)/)).toBeInTheDocument();

    // Save Draft
    const saveDraftBtn = screen.getByText('Save Draft');
    fireEvent.click(saveDraftBtn);

    expect(handleSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Apollo Hospitals Custom Template',
        status: 'DRAFT',
      })
    );
  });
});
