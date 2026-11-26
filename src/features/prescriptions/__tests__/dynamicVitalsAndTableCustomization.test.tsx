import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SectionPropertyInspector } from '../components/builder/SectionPropertyInspector';
import {
  DEFAULT_VITALS_FIELDS,
  type TemplateLayoutConfig,
  type TemplateSectionBlock,
} from '../types/template';
import { compileTemplateLayout } from '../utils/compileTemplateLayout';
import { resolvePrescriptionTemplate } from '../utils/resolvePrescriptionTemplate';

const mockTheme = {
  primaryColor: '#67358f',
  secondaryColor: '#69c9eb',
  accentColor: '#7a2886',
  textColor: '#0f172a',
  backgroundColor: '#ffffff',
  fontFamily: 'Arial, Helvetica, sans-serif',
  fontSize: '11px',
};

describe('HMS Web App – Dynamic Vitals & Universal Table Customization', () => {
  /* =========================================================================
   * 1. Physical Vitals & Metrics Configuration
   * ========================================================================= */
  describe('1. Physical Vitals & Metrics Configuration (VITALS_BLOCK)', () => {
    const vitalsSection: TemplateSectionBlock = {
      id: 'sec_vitals_test',
      type: 'VITALS_BLOCK',
      title: 'Physical Vitals & Metrics',
      enabled: true,
      order: 3,
      props: {
        title: 'Physical Vitals & Clinical Metrics',
        showTitle: true,
        columnsPerRow: 4,
        fields: [
          { id: 'bp', key: 'blood_pressure', label: 'Blood Pressure (BP)', unit: 'mmHg', enabled: true },
          { id: 'bs', key: 'blood_sugar', label: 'Blood Sugar', unit: 'mg/dL', enabled: true },
          { id: 'temp', key: 'body_temperature', label: 'Body Temperature', unit: '°F', enabled: true },
          { id: 'bg', key: 'blood_group', label: 'Blood Group', unit: '', enabled: true },
        ],
      },
    };

    const mockLayoutConfig: TemplateLayoutConfig = {
      theme: mockTheme,
      sections: [vitalsSection],
    };

    it('renders the Vitals Configuration section with column selectors and active fields', () => {
      const onChangeSectionProps = vi.fn();

      render(
        <SectionPropertyInspector
          layoutConfig={mockLayoutConfig}
          selectedSection={vitalsSection}
          onChangeTheme={vi.fn()}
          onChangeSectionProps={onChangeSectionProps}
        />
      );

      expect(screen.getByText('Display Section Header Title')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Physical Vitals & Clinical Metrics')).toBeInTheDocument();
      expect(screen.getByText(/Columns Per Row/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '2 Cols' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '3 Cols' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '4 Cols' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '6 Cols' })).toBeInTheDocument();

      expect(screen.getByDisplayValue('Blood Pressure (BP)')).toBeInTheDocument();
      expect(screen.getByDisplayValue('mmHg')).toBeInTheDocument();
    });

    it('changes columnsPerRow to 2, 3, or 6 columns', () => {
      const onChangeSectionProps = vi.fn();

      render(
        <SectionPropertyInspector
          layoutConfig={mockLayoutConfig}
          selectedSection={vitalsSection}
          onChangeTheme={vi.fn()}
          onChangeSectionProps={onChangeSectionProps}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: '3 Cols' }));
      expect(onChangeSectionProps).toHaveBeenCalledWith('sec_vitals_test', {
        columnsPerRow: 3,
      });

      fireEvent.click(screen.getByRole('button', { name: '6 Cols' }));
      expect(onChangeSectionProps).toHaveBeenCalledWith('sec_vitals_test', {
        columnsPerRow: 6,
      });
    });

    it('allows toggling, renaming, changing units, and reordering vital fields', () => {
      const onChangeSectionProps = vi.fn();

      render(
        <SectionPropertyInspector
          layoutConfig={mockLayoutConfig}
          selectedSection={vitalsSection}
          onChangeTheme={vi.fn()}
          onChangeSectionProps={onChangeSectionProps}
        />
      );

      // Rename BP label
      const bpInput = screen.getByDisplayValue('Blood Pressure (BP)');
      fireEvent.change(bpInput, { target: { value: 'Arterial BP' } });
      expect(onChangeSectionProps).toHaveBeenCalledWith('sec_vitals_test', {
        fields: expect.arrayContaining([
          expect.objectContaining({ id: 'bp', label: 'Arterial BP' }),
        ]),
      });

      // Change unit
      const mmhgInput = screen.getByDisplayValue('mmHg');
      fireEvent.change(mmhgInput, { target: { value: 'torr' } });
      expect(onChangeSectionProps).toHaveBeenCalledWith('sec_vitals_test', {
        fields: expect.arrayContaining([
          expect.objectContaining({ id: 'bp', unit: 'torr' }),
        ]),
      });

      // Reorder: click move down on first vital
      const moveDownButtons = screen.getAllByTitle('Move Down');
      fireEvent.click(moveDownButtons[0]!);
      expect(onChangeSectionProps).toHaveBeenCalledWith('sec_vitals_test', {
        fields: expect.arrayContaining([
          expect.objectContaining({ id: 'bs' }),
          expect.objectContaining({ id: 'bp' }),
        ]),
      });
    });

    it('allows adding and deleting custom vital fields', () => {
      const onChangeSectionProps = vi.fn();

      render(
        <SectionPropertyInspector
          layoutConfig={mockLayoutConfig}
          selectedSection={vitalsSection}
          onChangeTheme={vi.fn()}
          onChangeSectionProps={onChangeSectionProps}
        />
      );

      // Open Add Custom Vital Form
      fireEvent.click(screen.getByRole('button', { name: /Add Custom Vital Field/i }));
      expect(screen.getByPlaceholderText(/Oxygen Saturation/i)).toBeInTheDocument();

      // Enter label, unit, key
      fireEvent.change(screen.getByPlaceholderText(/Oxygen Saturation/i), {
        target: { value: 'Waist Circumference' },
      });
      fireEvent.change(screen.getByPlaceholderText(/% or cm/i), {
        target: { value: 'cm' },
      });

      // Submit
      fireEvent.click(screen.getByRole('button', { name: 'Add Vital Field' }));
      expect(onChangeSectionProps).toHaveBeenCalledWith('sec_vitals_test', {
        fields: expect.arrayContaining([
          expect.objectContaining({
            label: 'Waist Circumference',
            unit: 'cm',
            key: 'waist_circumference',
            isCustom: true,
          }),
        ]),
      });
    });

    it('allows resetting vitals to default configuration', () => {
      const onChangeSectionProps = vi.fn();

      render(
        <SectionPropertyInspector
          layoutConfig={mockLayoutConfig}
          selectedSection={vitalsSection}
          onChangeTheme={vi.fn()}
          onChangeSectionProps={onChangeSectionProps}
        />
      );

      fireEvent.click(screen.getByTitle('Reset to default vital fields'));
      expect(onChangeSectionProps).toHaveBeenCalledWith('sec_vitals_test', {
        fields: DEFAULT_VITALS_FIELDS,
        columnsPerRow: 4,
      });
    });

    it('compiles VITALS_BLOCK into HTML grid matching columnsPerRow and fields', () => {
      const customConfig: TemplateLayoutConfig = {
        theme: mockTheme,
        sections: [
          {
            id: 'vitals_3col',
            type: 'VITALS_BLOCK',
            title: 'Vitals',
            enabled: true,
            order: 1,
            props: {
              title: 'Clinical Indicators',
              showTitle: true,
              columnsPerRow: 3,
              fields: [
                { id: 'bp', key: 'blood_pressure', label: 'Blood Pressure', unit: 'mmHg', enabled: true },
                { id: 'bs', key: 'blood_sugar', label: 'Blood Sugar', unit: 'mg/dL', enabled: true },
                { id: 'spo2', key: 'spo2', label: 'Oxygen Saturation', unit: '%', enabled: true },
              ],
            },
          },
        ],
      };

      const html = compileTemplateLayout(customConfig);
      expect(html).toContain('Clinical Indicators');
      expect(html).toContain('width: 33.3%');
      expect(html).toContain('Blood Pressure');
      expect(html).toContain('{{blood_pressure}}');
      expect(html).toContain('mmHg');
      expect(html).toContain('Oxygen Saturation');
      expect(html).toContain('{{spo2}}');
    });

    it('resolves standard and custom vitals during template resolution', () => {
      const templateHtml = `
        <div class="rx-vitals-container">
          <div>BP: {{blood_pressure}}</div>
          <div>Sugar: {{blood_sugar}}</div>
          <div>SpO2: {{spo2}}</div>
          <div>Waist: {{waist_circ}} cm</div>
        </div>
      `;

      const { renderedHtml } = resolvePrescriptionTemplate(templateHtml, {
        patient: {
          blood_pressure: '120/80 mmHg',
          blood_sugar: '110 mg/dL',
          spo2: '99%',
          custom_vitals: {
            waist_circ: '84',
          },
        },
      });

      expect(renderedHtml).toContain('BP: 120/80 mmHg');
      expect(renderedHtml).toContain('Sugar: 110 mg/dL');
      expect(renderedHtml).toContain('SpO2: 99%');
      expect(renderedHtml).toContain('Waist: 84 cm');
    });
  });

  /* =========================================================================
   * 2. Universal Table Customization
   * ========================================================================= */
  describe('2. Universal Table Customization (TABLE)', () => {
    const tableSection: TemplateSectionBlock = {
      id: 'sec_table_test',
      type: 'TABLE',
      title: 'Custom Table',
      enabled: true,
      order: 4,
      props: {
        rows: 3,
        columns: 3,
        headers: ['#', 'Investigation', 'Instructions'],
        columnWidths: ['15%', '50%', '35%'],
        alignments: ['center', 'left', 'left'],
        data: [
          ['1', 'Complete Blood Count (CBC)', 'Fasting required'],
          ['2', 'Serum Creatinine', 'Overnight fasting'],
          ['3', 'Chest X-Ray', 'PA view'],
        ],
        bordered: true,
        borderColor: '#cbd5e1',
        headerBg: '#f8fafc',
        cellPadding: '2mm 1.5mm',
        fontSize: '10px',
        mode: 'static',
      },
    };

    const mockLayoutConfig: TemplateLayoutConfig = {
      theme: mockTheme,
      sections: [tableSection],
    };

    it('renders table configuration panel with mode toggle, dimension controls, and column settings', () => {
      const onChangeSectionProps = vi.fn();

      render(
        <SectionPropertyInspector
          layoutConfig={mockLayoutConfig}
          selectedSection={tableSection}
          onChangeTheme={vi.fn()}
          onChangeSectionProps={onChangeSectionProps}
        />
      );

      expect(screen.getByRole('button', { name: /Static Table/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Data-Driven/i })).toBeInTheDocument();
      expect(screen.getByText('Rows (3)')).toBeInTheDocument();
      expect(screen.getByText('Columns (3)')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Investigation')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Complete Blood Count (CBC)')).toBeInTheDocument();
    });

    it('supports switching to data-driven mode (medicines and lab tests)', () => {
      const onChangeSectionProps = vi.fn();

      render(
        <SectionPropertyInspector
          layoutConfig={mockLayoutConfig}
          selectedSection={tableSection}
          onChangeTheme={vi.fn()}
          onChangeSectionProps={onChangeSectionProps}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Data-Driven/i }));
      expect(onChangeSectionProps).toHaveBeenCalledWith('sec_table_test', {
        mode: 'dynamic',
        dynamicSource: 'medicines',
      });
    });

    it('compiles dynamic table mode to {{medicines_table}} or lab tests', () => {
      const dynamicConfig: TemplateLayoutConfig = {
        theme: mockTheme,
        sections: [
          {
            id: 'dyn_meds',
            type: 'TABLE',
            title: 'Medicines',
            enabled: true,
            order: 1,
            props: {
              mode: 'dynamic',
              dynamicSource: 'medicines',
            },
          },
        ],
      };

      const html = compileTemplateLayout(dynamicConfig);
      expect(html).toContain('{{medicines_table}}');
    });

    it('allows reordering columns left and right, swapping headers, widths, alignments, and cell values', () => {
      const onChangeSectionProps = vi.fn();

      render(
        <SectionPropertyInspector
          layoutConfig={mockLayoutConfig}
          selectedSection={tableSection}
          onChangeTheme={vi.fn()}
          onChangeSectionProps={onChangeSectionProps}
        />
      );

      // In column 2 ('Investigation'), click Move Left
      const moveLeftButtons = screen.getAllByTitle('Move Left');
      // Column 0 is disabled, column 1 (Investigation) is index 1
      fireEvent.click(moveLeftButtons[1]!);

      expect(onChangeSectionProps).toHaveBeenCalledWith(
        'sec_table_test',
        expect.objectContaining({
          headers: ['Investigation', '#', 'Instructions'],
          columnWidths: ['50%', '15%', '35%'],
          alignments: ['left', 'center', 'left'],
          data: [
            ['Complete Blood Count (CBC)', '1', 'Fasting required'],
            ['Serum Creatinine', '2', 'Overnight fasting'],
            ['Chest X-Ray', '3', 'PA view'],
          ],
        })
      );
    });

    it('allows adding and deleting columns', () => {
      const onChangeSectionProps = vi.fn();

      render(
        <SectionPropertyInspector
          layoutConfig={mockLayoutConfig}
          selectedSection={tableSection}
          onChangeTheme={vi.fn()}
          onChangeSectionProps={onChangeSectionProps}
        />
      );

      // Add column
      fireEvent.click(screen.getByRole('button', { name: /Add Column/i }));
      expect(onChangeSectionProps).toHaveBeenCalledWith(
        'sec_table_test',
        expect.objectContaining({
          columns: 4,
          headers: ['#', 'Investigation', 'Instructions', 'Column 4'],
        })
      );

      // Delete column
      const deleteColButtons = screen.getAllByTitle('Delete Column');
      fireEvent.click(deleteColButtons[0]!);
      expect(onChangeSectionProps).toHaveBeenCalledWith(
        'sec_table_test',
        expect.objectContaining({
          columns: 2,
          headers: ['Investigation', 'Instructions'],
        })
      );
    });

    it('allows duplicating and reordering rows', () => {
      const onChangeSectionProps = vi.fn();

      render(
        <SectionPropertyInspector
          layoutConfig={mockLayoutConfig}
          selectedSection={tableSection}
          onChangeTheme={vi.fn()}
          onChangeSectionProps={onChangeSectionProps}
        />
      );

      // Duplicate Row 1
      const copyRowButtons = screen.getAllByTitle('Duplicate this row');
      fireEvent.click(copyRowButtons[0]!);

      expect(onChangeSectionProps).toHaveBeenCalledWith(
        'sec_table_test',
        expect.objectContaining({
          rows: 4,
          data: [
            ['1', 'Complete Blood Count (CBC)', 'Fasting required'],
            ['1', 'Complete Blood Count (CBC)', 'Fasting required'], // cloned
            ['2', 'Serum Creatinine', 'Overnight fasting'],
            ['3', 'Chest X-Ray', 'PA view'],
          ],
        })
      );

      // Move Down Row 1
      const moveDownRowButtons = screen.getAllByTitle('Move Down');
      fireEvent.click(moveDownRowButtons[0]!);

      expect(onChangeSectionProps).toHaveBeenCalledWith(
        'sec_table_test',
        expect.objectContaining({
          data: [
            ['2', 'Serum Creatinine', 'Overnight fasting'],
            ['1', 'Complete Blood Count (CBC)', 'Fasting required'],
            ['3', 'Chest X-Ray', 'PA view'],
          ],
        })
      );
    });

    it('allows editing cell contents directly from inspector', () => {
      const onChangeSectionProps = vi.fn();

      render(
        <SectionPropertyInspector
          layoutConfig={mockLayoutConfig}
          selectedSection={tableSection}
          onChangeTheme={vi.fn()}
          onChangeSectionProps={onChangeSectionProps}
        />
      );

      const cellInput = screen.getByDisplayValue('Complete Blood Count (CBC)');
      fireEvent.change(cellInput, { target: { value: 'CBC + ESR' } });

      expect(onChangeSectionProps).toHaveBeenCalledWith(
        'sec_table_test',
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.arrayContaining(['CBC + ESR']),
          ]),
        })
      );
    });

    it('configures table styles including padding, border display, and font size', () => {
      const onChangeSectionProps = vi.fn();

      render(
        <SectionPropertyInspector
          layoutConfig={mockLayoutConfig}
          selectedSection={tableSection}
          onChangeTheme={vi.fn()}
          onChangeSectionProps={onChangeSectionProps}
        />
      );

      // Change padding to Spacious
      fireEvent.click(screen.getByRole('button', { name: 'Spacious' }));
      expect(onChangeSectionProps).toHaveBeenCalledWith('sec_table_test', {
        cellPadding: '3mm 2.5mm',
      });

      // Change font size to 12px
      fireEvent.click(screen.getByRole('button', { name: '12px' }));
      expect(onChangeSectionProps).toHaveBeenCalledWith('sec_table_test', {
        fontSize: '12px',
      });
    });

    it('compiles static TABLE with column widths, alignments, and print styles', () => {
      const html = compileTemplateLayout(mockLayoutConfig);

      expect(html).toContain('rx-table-custom');
      expect(html).toContain('width: 15%');
      expect(html).toContain('width: 50%');
      expect(html).toContain('text-align: center');
      expect(html).toContain('Complete Blood Count (CBC)');
      expect(html).toContain('.rx-table-custom thead');
      expect(html).toContain('display: table-header-group');
      expect(html).toContain('break-inside: avoid');
    });
  });
});
