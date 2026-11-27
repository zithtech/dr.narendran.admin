import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PrescriptionTemplateBuilderModal } from '../components/builder/PrescriptionTemplateBuilderModal';
import { SectionPropertyInspector, TemplateImageControl } from '../components/builder/SectionPropertyInspector';
import { DEFAULT_LAYOUT_CONFIG } from '../utils/compileTemplateLayout';

describe('Right Inspector Layout & Three-Panel Overflow Fix', () => {
  it('1. SectionPropertyInspector has pinned header and independent scrollable container', () => {
    const { container } = render(
      <SectionPropertyInspector
        layoutConfig={DEFAULT_LAYOUT_CONFIG}
        selectedSection={null}
        onChangeTheme={vi.fn()}
        onChangeSectionProps={vi.fn()}
      />
    );

    const rootInspector = container.firstElementChild as HTMLElement;
    expect(rootInspector).toHaveClass('flex', 'flex-col', 'h-full', 'w-full', 'min-w-0', 'overflow-hidden');

    // Header should be shrink-0 (pinned / non-scrolling)
    const header = screen.getByText('Layout & Style Inspector').closest('div');
    expect(header?.parentElement).toHaveClass('shrink-0');

    // Scrollable area should have independent vertical scrolling and prevent horizontal overflow
    const scrollContainer = container.querySelector('.overflow-y-auto');
    expect(scrollContainer).toBeInTheDocument();
    expect(scrollContainer).toHaveClass('overflow-x-hidden', 'min-h-0', 'flex-1');
  });

  it('2. Theme color presets have min-w-0 and truncate to prevent horizontal grid blowout', () => {
    const { container } = render(
      <SectionPropertyInspector
        layoutConfig={DEFAULT_LAYOUT_CONFIG}
        selectedSection={null}
        onChangeTheme={vi.fn()}
        onChangeSectionProps={vi.fn()}
      />
    );

    const presetButtons = container.querySelectorAll('.grid-cols-2 button');
    expect(presetButtons.length).toBeGreaterThan(0);
    presetButtons.forEach((btn) => {
      expect(btn).toHaveClass('min-w-0');
      const textSpan = btn.querySelector('span:last-child');
      expect(textSpan).toHaveClass('truncate');
    });
  });

  it('3. TemplateImageControl contains min-w-0 and flex-wrap on preset buttons to fit within inspector', () => {
    const { container } = render(
      <TemplateImageControl
        label="Test Inspector Image"
        imageUrl="https://example.com/logo.png"
        showDimensions={true}
        showAlignment={true}
        onChange={vi.fn()}
      />
    );

    const card = container.firstElementChild as HTMLElement;
    expect(card).toHaveClass('w-full', 'min-w-0', 'overflow-hidden');

    // Preset pills container should have flex-wrap and shrink-0
    const presetWrappers = container.querySelectorAll('.flex-wrap');
    expect(presetWrappers.length).toBeGreaterThan(0);

    // Dimension inputs should have box-border and min-w-0
    const inputs = container.querySelectorAll('input[type="text"]');
    inputs.forEach((input) => {
      expect(input).toHaveClass('box-border', 'min-w-0');
    });
  });

  it('4. PrescriptionTemplateBuilderModal renders 3 panels with constrained dimensions and min-w-0', () => {
    render(
      <PrescriptionTemplateBuilderModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
        template={{
          id: 'tpl_123',
          name: 'Test Template',
          description: 'A test prescription template',
          hospital_id: 'hosp_1',
          branch_id: null,
          is_default: false,
          status: 'DRAFT',
          version: 1,
          layout_config: DEFAULT_LAYOUT_CONFIG,
          html_content: '<html><body>Prescription</body></html>',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }}
        hospitalName="Apollo Hospitals"
      />
    );

    // Modal dialog wrapper check
    const modalContent = document.querySelector('.rx-template-builder-modal');
    expect(modalContent).toBeInTheDocument();

    // Verify Three-Panel Structure: Left, Center, Right
    const leftAside = document.querySelector('aside.w-72, aside.lg\\:w-80');
    expect(leftAside).toBeInTheDocument();
    expect(leftAside).toHaveClass('shrink-0', 'min-w-0', 'min-h-0');

    const centerMain = document.querySelector('main');
    expect(centerMain).toBeInTheDocument();
    expect(centerMain).toHaveClass('flex-1', 'min-w-0', 'min-h-0', 'overflow-hidden');

    const rightAside = document.querySelector('aside.w-80, aside.xl\\:w-92');
    expect(rightAside).toBeInTheDocument();
    expect(rightAside).toHaveClass('shrink-0', 'min-w-0', 'min-h-0');
  });
});
