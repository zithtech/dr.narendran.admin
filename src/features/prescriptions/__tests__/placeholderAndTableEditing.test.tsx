import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PlaceholderPickerPanel } from '../components/builder/PlaceholderPickerPanel';
import { PrescriptionTemplateBuilderModal } from '../components/builder/PrescriptionTemplateBuilderModal';
import { SectionPropertyInspector } from '../components/builder/SectionPropertyInspector';
import type { TemplateLayoutConfig, TemplateSectionBlock } from '../types/template';
import { compileLayoutToHtml, DEFAULT_LAYOUT_CONFIG } from '../utils/compileTemplateLayout';
import {
  renderMedicinesTableHtml,
  resolvePrescriptionTemplate,
} from '../utils/resolvePrescriptionTemplate';

describe('HMS Web App – Prescription Template Builder: Placeholder Insertion & Custom Table Cell Editing', () => {
  describe('1. PlaceholderPickerPanel: Direct Insertion, Copying & Drag-and-Drop', () => {
    it('renders placeholder categories, tokens, "+ Insert" buttons, and enables draggable tokens', () => {
      const handleInsertToken = vi.fn();

      render(<PlaceholderPickerPanel onInsertToken={handleInsertToken} />);

      // Search & tabs
      expect(screen.getByPlaceholderText('Search variables...')).toBeInTheDocument();
      expect(screen.getByText('Patient')).toBeInTheDocument();
      expect(screen.getByText('Clinical')).toBeInTheDocument();

      // Find token card for {{patient_name}}
      const patientToken = screen.getByText('{{patient_name}}');
      expect(patientToken).toBeInTheDocument();

      // The card is draggable
      const card = patientToken.closest('[draggable="true"]');
      expect(card).toBeInTheDocument();

      // Drag start populates dataTransfer
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: '',
      };
      fireEvent.dragStart(card!, { dataTransfer });
      expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', '{{patient_name}}');
      expect(dataTransfer.setData).toHaveBeenCalledWith('application/x-token', '{{patient_name}}');

      // Click + Insert button
      const insertButtons = screen.getAllByRole('button', { name: /Insert/i });
      fireEvent.click(insertButtons[0]!);
      expect(handleInsertToken).toHaveBeenCalledWith('{{hospital_name}}');
    });

    it('filters placeholders based on search term', () => {
      render(<PlaceholderPickerPanel />);

      const searchInput = screen.getByPlaceholderText('Search variables...');
      fireEvent.change(searchInput, { target: { value: 'blood_pressure' } });

      expect(screen.getByText('{{blood_pressure}}')).toBeInTheDocument();
      expect(screen.queryByText('{{patient_address}}')).not.toBeInTheDocument();
    });
  });

  describe('2. Custom Table Cell Content Editing in SectionPropertyInspector', () => {
    const mockTableSection: TemplateSectionBlock = {
      id: 'sec_custom_table_1',
      type: 'TABLE',
      title: 'Custom Table',
      enabled: true,
      order: 1,
      props: {
        rows: 2,
        columns: 2,
        headers: ['Test Item', 'Result / Notes'],
        data: [
          ['Hemoglobin', '14.2 g/dL'],
          ['Platelet Count', '{{patient_name}} pending'],
        ],
        bordered: true,
      },
    };

    const mockLayoutConfig: TemplateLayoutConfig = {
      theme: DEFAULT_LAYOUT_CONFIG.theme,
      sections: [mockTableSection],
    };

    it('renders cell values in the table cell contents editor and allows direct cell value changes', () => {
      const handleChangeProps = vi.fn();
      const handleSelectCell = vi.fn();

      render(
        <SectionPropertyInspector
          layoutConfig={mockLayoutConfig}
          selectedSection={mockTableSection}
          onChangeTheme={vi.fn()}
          onChangeSectionProps={handleChangeProps}
          activeCellTarget={null}
          onSelectCell={handleSelectCell}
        />
      );

      // Verify row badges and cell values
      expect(screen.getByText('Row 1')).toBeInTheDocument();
      expect(screen.getByText('Row 2')).toBeInTheDocument();

      const cellInput = screen.getByDisplayValue('Hemoglobin');
      expect(cellInput).toBeInTheDocument();

      // Focus cell to track activeCellTarget
      fireEvent.focus(cellInput);
      expect(handleSelectCell).toHaveBeenCalledWith({
        sectionId: 'sec_custom_table_1',
        row: 0,
        col: 0,
      });

      // Type new value into cell
      fireEvent.change(cellInput, { target: { value: 'Blood Glucose' } });
      expect(handleChangeProps).toHaveBeenCalledWith('sec_custom_table_1', {
        data: [
          ['Blood Glucose', '14.2 g/dL'],
          ['Platelet Count', '{{patient_name}} pending'],
        ],
      });
    });

    it('preserves existing cell values when expanding or shrinking rows and columns', () => {
      const handleChangeProps = vi.fn();

      render(
        <SectionPropertyInspector
          layoutConfig={mockLayoutConfig}
          selectedSection={mockTableSection}
          onChangeTheme={vi.fn()}
          onChangeSectionProps={handleChangeProps}
        />
      );

      // Click + Row Below on Row 1
      const addRowButtons = screen.getAllByRole('button', { name: /\+ Row/i });
      fireEvent.click(addRowButtons[0]!);

      // Should insert a new empty row after Row 1 while preserving existing rows
      expect(handleChangeProps).toHaveBeenCalledWith('sec_custom_table_1', {
        rows: 3,
        data: [
          ['Hemoglobin', '14.2 g/dL'],
          ['', ''],
          ['Platelet Count', '{{patient_name}} pending'],
        ],
      });
    });

    it('allows dropping a placeholder token directly into a table cell', () => {
      const handleChangeProps = vi.fn();

      render(
        <SectionPropertyInspector
          layoutConfig={mockLayoutConfig}
          selectedSection={mockTableSection}
          onChangeTheme={vi.fn()}
          onChangeSectionProps={handleChangeProps}
        />
      );

      const cellInput = screen.getByDisplayValue('Hemoglobin');
      const dropEvent = {
        preventDefault: vi.fn(),
        dataTransfer: {
          getData: vi.fn((key) => (key === 'text/plain' ? '{{patient_id}}' : '')),
        },
      };

      fireEvent.drop(cellInput, dropEvent);

      expect(handleChangeProps).toHaveBeenCalledWith('sec_custom_table_1', {
        data: [
          ['Hemoglobin {{patient_id}}', '14.2 g/dL'],
          ['Platelet Count', '{{patient_name}} pending'],
        ],
      });
    });
  });

  describe('3. Dynamic Placeholder Insertion into Canvas & Elements', () => {
    it('inserts a placeholder into an active table cell when token is selected', () => {
      const handleSave = vi.fn();
      const initialTable: TemplateSectionBlock = {
        id: 'sec_table_test',
        type: 'TABLE',
        title: 'Custom Table',
        enabled: true,
        order: 1,
        props: {
          rows: 2,
          columns: 2,
          headers: ['Field', 'Value'],
          data: [
            ['Patient:', ''],
            ['Diagnosis:', ''],
          ],
        },
      };

      const customTemplate = {
        id: 'tpl_123',
        name: 'Custom Template with Table',
        description: 'Test',
        html_content: '<div>test</div>',
        layout_config: {
          theme: DEFAULT_LAYOUT_CONFIG.theme,
          sections: [initialTable],
        },
        status: 'DRAFT' as const,
        is_default: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      render(
        <PrescriptionTemplateBuilderModal
          isOpen={true}
          onClose={vi.fn()}
          onSave={handleSave}
          template={customTemplate}
          hospitalName="Apollo Cancer Center"
        />
      );

      // Switch to Placeholders tab
      const tokensTab = screen.getByRole('button', { name: /^Placeholders$/i });
      fireEvent.click(tokensTab);

      // Insert {{patient_name}}
      const patientToken = screen.getByText('{{patient_name}}');
      const card = patientToken.closest('.group');
      const insertBtn = card?.querySelector('button');
      if (insertBtn) {
        fireEvent.click(insertBtn);
      } else {
        fireEvent.click(patientToken);
      }

      // Check that the cell value in the Table inspector was updated with {{patient_name}}
      expect(screen.getByDisplayValue('Patient: {{patient_name}}')).toBeInTheDocument();
      expect(screen.getByText('Inserted')).toBeInTheDocument();
    });

    it('inserts a new PLACEHOLDER_BLOCK when no editable element is selected', () => {
      const handleSave = vi.fn();

      render(
        <PrescriptionTemplateBuilderModal
          isOpen={true}
          onClose={vi.fn()}
          onSave={handleSave}
          initialMode="blank"
          template={null}
          hospitalName="Apollo Cancer Center"
        />
      );

      // In blank mode with 0 sections, click Placeholders tab
      const tokensTab = screen.getByRole('button', { name: /^Placeholders$/i });
      fireEvent.click(tokensTab);

      // Click Insert on {{doctor_name}}
      const doctorToken = screen.getByText('{{doctor_name}}');
      const card = doctorToken.closest('.group');
      const insertBtn = card?.querySelector('button');
      if (insertBtn) {
        fireEvent.click(insertBtn);
      } else {
        fireEvent.click(doctorToken);
      }

      // Should insert new dynamic placeholder block
      expect(screen.getByText(/Inserted {{doctor_name}} as new placeholder block/i)).toBeInTheDocument();
    });
  });

  describe('4. HTML Compilation & Resolution with Sample Patient Data vs Raw Placeholders', () => {
    it('compiles TABLE with data attributes and cell values', () => {
      const config: TemplateLayoutConfig = {
        theme: DEFAULT_LAYOUT_CONFIG.theme,
        sections: [
          {
            id: 'sec_test_tbl',
            type: 'TABLE',
            title: 'Custom Table',
            enabled: true,
            order: 1,
            props: {
              rows: 2,
              columns: 2,
              headers: ['Parameter', 'Result'],
              data: [
                ['Blood Pressure', '120/80'],
                ['Patient Name', '{{patient_name}}'],
              ],
              bordered: true,
            },
          },
        ],
      };

      const html = compileLayoutToHtml(config);

      // Check structure
      expect(html).toContain('class="rx-table-custom"');
      expect(html).toContain('data-section-id="sec_test_tbl"');
      expect(html).toContain('data-cell-row="0" data-cell-col="0"');
      expect(html).toContain('Blood Pressure');
      expect(html).toContain('{{patient_name}}');
    });

    it('resolves table cell placeholders in Sample Patient Data preview mode while keeping raw tokens in raw mode', () => {
      const config: TemplateLayoutConfig = {
        theme: DEFAULT_LAYOUT_CONFIG.theme,
        sections: [
          {
            id: 'sec_test_tbl',
            type: 'TABLE',
            title: 'Custom Table',
            enabled: true,
            order: 1,
            props: {
              rows: 1,
              columns: 2,
              headers: ['Key', 'Value'],
              data: [['Patient Name', '{{patient_name}}']],
            },
          },
        ],
      };

      const rawHtml = compileLayoutToHtml(config);
      expect(rawHtml).toContain('{{patient_name}}');

      // Resolve with sample data
      const sampleResult = resolvePrescriptionTemplate(rawHtml, {
        patient: {
          name: 'Jane Doe',
          patient_id: 'PAT-999',
        },
      });

      // The placeholder inside the table cell must be replaced with the patient's name
      expect(sampleResult.renderedHtml).toContain('Jane Doe');
      expect(sampleResult.renderedHtml).not.toContain('{{patient_name}}');
    });

    it('renders medicines table with customizable columns', () => {
      const sampleMeds = [
        {
          name: 'Paracetamol 500mg',
          dosage: '1 Tablet',
          frequency: 'TDS',
          duration: '5 days',
          instructions: 'After meals',
        },
      ];

      // Default (all columns)
      const allColsHtml = renderMedicinesTableHtml(sampleMeds);
      expect(allColsHtml).toContain('Medicine');
      expect(allColsHtml).toContain('Dosage');
      expect(allColsHtml).toContain('Frequency');
      expect(allColsHtml).toContain('Duration');
      expect(allColsHtml).toContain('Instructions');
      expect(allColsHtml).toContain('Paracetamol 500mg');

      // Without dosage and duration
      const compactHtml = renderMedicinesTableHtml(sampleMeds, {
        showDosage: false,
        showDuration: false,
      });
      expect(compactHtml).toContain('Medicine');
      expect(compactHtml).not.toContain('<th>Dosage</th>');
      expect(compactHtml).not.toContain('<th>Duration</th>');
      expect(compactHtml).toContain('<th>Frequency</th>');
    });
  });
});
