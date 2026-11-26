import { Modal, message } from 'antd';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Code2,
  Palette,
  Save,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { DEFAULT_ANNAAMALAI_LOGO_BASE64 } from '../../templates/defaultLogo';
import type {
  PrescriptionTemplate,
  TemplateLayoutConfig,
  TemplateSectionBlock,
  TemplateThemeConfig,
} from '../../types/template';
import {
  BLANK_LAYOUT_CONFIG,
  compileLayoutToHtml,
  DEFAULT_LAYOUT_CONFIG,
  validateTemplatePlaceholders,
} from '../../utils/compileTemplateLayout';
import { CanvasA4Preview } from './CanvasA4Preview';
import { InsertElementsPalette, type InsertableElementDefinition } from './InsertElementsPalette';
import { PlaceholderPickerPanel } from './PlaceholderPickerPanel';
import { SectionPaletteDrawer } from './SectionPaletteDrawer';
import { SectionPropertyInspector } from './SectionPropertyInspector';

interface PrescriptionTemplateBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  template?: PrescriptionTemplate | null;
  hospitalId?: string | null;
  hospitalName?: string;
  initialMode?: 'default' | 'blank';
  onSave: (payload: {
    id?: string;
    name: string;
    description: string;
    html_content: string;
    layout_config?: TemplateLayoutConfig;
    status: 'ACTIVE' | 'DRAFT';
    hospital_id?: string | null;
  }) => Promise<void>;
  saving?: boolean;
}

function extractHeaderLogoFromHtml(html?: string): string | null {
  if (!html) return null;
  // Match <img ... class="rx-logo..." src="..."
  const match1 = html.match(/<img[^>]*class=["'][^"']*\brx-logo\b[^"']*["'][^>]*src=["']([^"']+)["']/i);
  if (match1 && match1[1]) return match1[1];
  // Match <img ... src="..." ... class="rx-logo..."
  const match2 = html.match(/<img[^>]*src=["']([^"']+)["'][^>]*class=["'][^"']*\brx-logo\b[^"']*["']/i);
  if (match2 && match2[1]) return match2[1];
  // Match header logo inside rx-header-left
  const headerLeftMatch = html.match(/class=["'][^"']*rx-header-left[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
  if (headerLeftMatch && headerLeftMatch[1]) {
    const imgMatch = headerLeftMatch[1].match(/<img[^>]*src=["']([^"']+)["']/i);
    if (imgMatch && imgMatch[1]) return imgMatch[1];
  }
  return null;
}

export const PrescriptionTemplateBuilderModal: React.FC<PrescriptionTemplateBuilderModalProps> = ({
  isOpen,
  onClose,
  template,
  hospitalId,
  hospitalName = 'Annaamalai Cancer Center',
  initialMode = 'default',
  onSave,
  saving = false,
}) => {
  // Mode: Visual Studio vs Advanced HTML Code
  const [activeTab, setActiveTab] = useState<'visual' | 'code'>('visual');
  const [leftSidebarTab, setLeftSidebarTab] = useState<'elements' | 'sections' | 'tokens'>(
    initialMode === 'blank' && !template ? 'elements' : 'sections'
  );

  // Form State
  const [templateName, setTemplateName] = useState<string>('Standard Hospital Prescription');
  const [templateDescription, setTemplateDescription] = useState<string>('Custom hospital A4 prescription layout.');
  const [layoutConfig, setLayoutConfig] = useState<TemplateLayoutConfig>(DEFAULT_LAYOUT_CONFIG);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>('sec_header');
  const [activeCellTarget, setActiveCellTarget] = useState<{ sectionId: string; row: number; col: number } | null>(null);
  const [rawHtml, setRawHtml] = useState<string>('');

  // Initial load or prop change
  useEffect(() => {
    if (template) {
      setTemplateName(template.name || 'Standard Hospital Prescription');
      setTemplateDescription(template.description || 'Custom hospital A4 prescription layout.');
      const baseConfig: TemplateLayoutConfig =
        template.layout_config && template.layout_config.sections
          ? JSON.parse(JSON.stringify(template.layout_config))
          : JSON.parse(JSON.stringify(DEFAULT_LAYOUT_CONFIG));

      // Ensure header logo is preserved from html_content or default Annaamalai asset if not explicitly in layout_config
      const headerSec = baseConfig.sections.find((s) => s.type === 'HEADER_LETTERHEAD');
      if (headerSec && !headerSec.props?.customLogoUrl) {
        const extracted = extractHeaderLogoFromHtml(template.html_content);
        if (extracted) {
          headerSec.props = { ...headerSec.props, customLogoUrl: extracted };
        } else if (!hospitalName || hospitalName.toLowerCase().includes('annaamalai')) {
          headerSec.props = { ...headerSec.props, customLogoUrl: DEFAULT_ANNAAMALAI_LOGO_BASE64 };
        }
      }

      setLayoutConfig(baseConfig);
      setRawHtml(template.html_content || compileLayoutToHtml(baseConfig));
      setSelectedSectionId(baseConfig.sections[0]?.id || null);
      setLeftSidebarTab('sections');
    } else if (initialMode === 'blank') {
      // Option B: Create New Template from Scratch (completely blank A4 canvas)
      setTemplateName(`${hospitalName} Custom Template`);
      setTemplateDescription(`Blank prescription canvas for ${hospitalName}`);
      const blankConfig: TemplateLayoutConfig = JSON.parse(JSON.stringify(BLANK_LAYOUT_CONFIG));
      setLayoutConfig(blankConfig);
      setRawHtml(compileLayoutToHtml(blankConfig));
      setSelectedSectionId(null);
      setLeftSidebarTab('elements');
    } else {
      // Option A: Edit Default Template
      setTemplateName(`${hospitalName} Prescription`);
      setTemplateDescription(`A4 prescription layout for ${hospitalName}`);
      const baseConfig: TemplateLayoutConfig = JSON.parse(JSON.stringify(DEFAULT_LAYOUT_CONFIG));
      if (!hospitalName || hospitalName.toLowerCase().includes('annaamalai')) {
        const headerSec = baseConfig.sections.find((s) => s.type === 'HEADER_LETTERHEAD');
        if (headerSec && !headerSec.props?.customLogoUrl) {
          headerSec.props = { ...headerSec.props, customLogoUrl: DEFAULT_ANNAAMALAI_LOGO_BASE64 };
        }
      }
      setLayoutConfig(baseConfig);
      setRawHtml(compileLayoutToHtml(baseConfig));
      setSelectedSectionId(baseConfig.sections[0]?.id || 'sec_header');
      setLeftSidebarTab('sections');
    }
  }, [template, hospitalName, isOpen, initialMode]);

  // When visual layout changes, compile to raw HTML
  const handleUpdateLayout = (newConfig: TemplateLayoutConfig) => {
    setLayoutConfig(newConfig);
    const compiled = compileLayoutToHtml(newConfig);
    setRawHtml(compiled);
  };

  // Section operations
  const handleToggleSection = (sectionId: string) => {
    const updatedSections = layoutConfig.sections.map((s) =>
      s.id === sectionId ? { ...s, enabled: !s.enabled } : s
    );
    handleUpdateLayout({ ...layoutConfig, sections: updatedSections });
  };

  const handleMoveSection = (sectionId: string, direction: 'up' | 'down') => {
    const sorted = [...layoutConfig.sections].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((s) => s.id === sectionId);
    if (index === -1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const current = sorted[index];
    const target = sorted[targetIndex];
    if (!current || !target) return;

    // Swap order
    const currentOrder = current.order;
    current.order = target.order;
    target.order = currentOrder;

    handleUpdateLayout({ ...layoutConfig, sections: sorted });
  };

  const handleSectionPropsChange = (sectionId: string, props: Record<string, any>) => {
    const updatedSections = layoutConfig.sections.map((s) =>
      s.id === sectionId ? { ...s, props: { ...s.props, ...props } } : s
    );
    handleUpdateLayout({ ...layoutConfig, sections: updatedSections });
  };

  const handleThemeChange = (partialTheme: Partial<TemplateThemeConfig>) => {
    const updatedTheme = { ...layoutConfig.theme, ...partialTheme };
    handleUpdateLayout({ ...layoutConfig, theme: updatedTheme });
  };

  const handleAddImageSection = () => {
    const newBlock: TemplateSectionBlock = {
      id: `sec_image_${Date.now()}`,
      type: 'CUSTOM_IMAGE',
      title: 'Custom Image Block',
      enabled: true,
      order: layoutConfig.sections.length + 1,
      props: {
        imageUrl: '',
        altText: 'Prescription Image',
        width: '60mm',
        height: 'auto',
        alignment: 'center',
        objectFit: 'contain',
        maintainAspectRatio: true,
      },
    };
    const newSections = [...layoutConfig.sections, newBlock];
    handleUpdateLayout({ ...layoutConfig, sections: newSections });
    setSelectedSectionId(newBlock.id);
  };

  const handleInsertElement = (def: InsertableElementDefinition) => {
    const newId = `sec_${def.type.toLowerCase()}_${Date.now()}`;
    const newBlock: TemplateSectionBlock = {
      id: newId,
      type: def.type,
      title: def.title,
      enabled: true,
      order: layoutConfig.sections.length + 1,
      props: JSON.parse(JSON.stringify(def.defaultProps || {})),
    };

    if (def.type === 'HEADER_LETTERHEAD') {
      if (!newBlock.props.customLogoUrl && (!hospitalName || hospitalName.toLowerCase().includes('annaamalai'))) {
        newBlock.props.customLogoUrl = DEFAULT_ANNAAMALAI_LOGO_BASE64;
      }
    }

    const newSections = [...layoutConfig.sections, newBlock];
    handleUpdateLayout({ ...layoutConfig, sections: newSections });
    setSelectedSectionId(newBlock.id);
  };

  const handleDuplicateSection = (sectionId: string) => {
    const sorted = [...layoutConfig.sections].sort((a, b) => a.order - b.order);
    const index = sorted.findIndex((s) => s.id === sectionId);
    if (index === -1) return;

    const source = sorted[index];
    if (!source) return;
    const newId = `sec_${source.type.toLowerCase()}_copy_${Date.now()}`;
    const duplicatedBlock: TemplateSectionBlock = {
      id: newId,
      type: source.type,
      title: `${source.title} (Copy)`,
      enabled: source.enabled,
      order: source.order + 1,
      props: JSON.parse(JSON.stringify(source.props || {})),
    };

    sorted.splice(index + 1, 0, duplicatedBlock);
    const reordered = sorted.map((s, idx) => ({ ...s, order: idx + 1 }));
    handleUpdateLayout({ ...layoutConfig, sections: reordered });
    setSelectedSectionId(newId);
  };

  const handleDeleteSection = (sectionId: string) => {
    const newSections = layoutConfig.sections
      .filter((s) => s.id !== sectionId)
      .map((s, idx) => ({ ...s, order: idx + 1 }));
    handleUpdateLayout({ ...layoutConfig, sections: newSections });
    if (selectedSectionId === sectionId) {
      setSelectedSectionId(newSections[0]?.id || null);
    }
  };

  const handleUpdateTableCell = (sectionId: string, row: number, col: number, value: string) => {
    const section = layoutConfig.sections.find((s) => s.id === sectionId);
    if (!section) return;
    const rows = Number(section.props?.rows) || 3;
    const cols = Number(section.props?.columns) || 3;
    const currentData = Array.isArray(section.props?.data) ? [...section.props.data] : [];
    while (currentData.length < rows) {
      currentData.push(Array.from({ length: cols }, () => ''));
    }
    const updatedRow = [...(currentData[row] || Array.from({ length: cols }, () => ''))];
    while (updatedRow.length < cols) updatedRow.push('');
    updatedRow[col] = value;
    currentData[row] = updatedRow;
    handleSectionPropsChange(sectionId, { data: currentData });
  };

  const handleUpdateSectionField = (sectionId: string, field: string, value: string) => {
    handleSectionPropsChange(sectionId, { [field]: value });
  };

  const handleInsertToken = (token: string) => {
    const currentSec = layoutConfig.sections.find((s) => s.id === selectedSectionId);

    if (currentSec?.type === 'TABLE') {
      const row =
        activeCellTarget?.sectionId === currentSec.id ? (activeCellTarget.row ?? 0) : 0;
      const col =
        activeCellTarget?.sectionId === currentSec.id ? (activeCellTarget.col ?? 0) : 0;
      const rows = Number(currentSec.props?.rows) || 3;
      const cols = Number(currentSec.props?.columns) || 3;
      const currentData = Array.isArray(currentSec.props?.data) ? [...currentSec.props.data] : [];
      while (currentData.length < rows) {
        currentData.push(Array.from({ length: cols }, () => ''));
      }
      const updatedRow = [...(currentData[row] || Array.from({ length: cols }, () => ''))];
      while (updatedRow.length < cols) updatedRow.push('');
      const currentVal = updatedRow[col] || '';
      updatedRow[col] = currentVal ? `${currentVal} ${token}` : token;
      currentData[row] = updatedRow;
      handleSectionPropsChange(currentSec.id, { data: currentData });
      setActiveCellTarget({ sectionId: currentSec.id, row, col });
      message.success(`Inserted ${token} into Table [Row ${row + 1}, Col ${col + 1}]`);
    } else if (currentSec?.type === 'HEADING') {
      const currentVal = currentSec.props?.text || '';
      const newVal = currentVal ? `${currentVal} ${token}` : token;
      handleSectionPropsChange(currentSec.id, { text: newVal });
      message.success(`Inserted ${token} into Heading`);
    } else if (currentSec?.type === 'PARAGRAPH') {
      const currentVal = currentSec.props?.content || '';
      const newVal = currentVal ? `${currentVal} ${token}` : token;
      handleSectionPropsChange(currentSec.id, { content: newVal });
      message.success(`Inserted ${token} into Paragraph`);
    } else if (currentSec?.type === 'PLACEHOLDER_BLOCK') {
      handleSectionPropsChange(currentSec.id, { token, label: token.replace(/[{}]/g, '') });
      message.success(`Updated Dynamic Placeholder to ${token}`);
    } else {
      // If no editable element is selected, insert as new dynamic text element
      const newSecId = `sec_dyn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const newSec: TemplateSectionBlock = {
        id: newSecId,
        type: 'PLACEHOLDER_BLOCK',
        title: `Variable: ${token}`,
        enabled: true,
        order: layoutConfig.sections.length + 1,
        props: {
          token,
          prefix: '',
          boldValue: true,
          fontSize: '11px',
          alignment: 'left',
        },
      };
      const newSections = [...layoutConfig.sections, newSec];
      handleUpdateLayout({ ...layoutConfig, sections: newSections });
      setSelectedSectionId(newSecId);
      message.success(`Inserted ${token} as new placeholder block on canvas`);
    }
  };

  const handleDropToken = (
    token: string,
    target: { sectionId: string; field?: string; row?: number; col?: number }
  ) => {
    if (target.sectionId && target.row !== undefined && target.col !== undefined) {
      setSelectedSectionId(target.sectionId);
      setActiveCellTarget({ sectionId: target.sectionId, row: target.row, col: target.col });
      const section = layoutConfig.sections.find((s) => s.id === target.sectionId);
      if (section) {
        const rows = Number(section.props?.rows) || 3;
        const cols = Number(section.props?.columns) || 3;
        const currentData = Array.isArray(section.props?.data) ? [...section.props.data] : [];
        while (currentData.length < rows) currentData.push(Array.from({ length: cols }, () => ''));
        const updatedRow = [...(currentData[target.row] || Array.from({ length: cols }, () => ''))];
        while (updatedRow.length < cols) updatedRow.push('');
        const cur = updatedRow[target.col] || '';
        updatedRow[target.col] = cur ? `${cur} ${token}` : token;
        currentData[target.row] = updatedRow;
        handleSectionPropsChange(target.sectionId, { data: currentData });
        message.success(`Dropped ${token} into Table [Row ${target.row + 1}, Col ${target.col + 1}]`);
      }
    } else if (target.sectionId && target.field) {
      setSelectedSectionId(target.sectionId);
      const section = layoutConfig.sections.find((s) => s.id === target.sectionId);
      if (section) {
        const cur = section.props?.[target.field] || '';
        handleSectionPropsChange(target.sectionId, {
          [target.field]: cur ? `${cur} ${token}` : token,
        });
        message.success(`Dropped ${token} into ${target.field}`);
      }
    } else {
      handleInsertToken(token);
    }
  };

  // Linter check on raw HTML
  const linterResult = validateTemplatePlaceholders(rawHtml);

  // Save handler
  const handlePerformSave = async (status: 'ACTIVE' | 'DRAFT') => {
    await onSave({
      ...(template?.id ? { id: template.id } : {}),
      name: templateName,
      description: templateDescription,
      html_content: rawHtml,
      layout_config: layoutConfig,
      status,
      hospital_id: hospitalId || template?.hospital_id || null,
    });
  };

  const selectedSection = layoutConfig.sections.find((s) => s.id === selectedSectionId) || null;

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      closable={false}
      width="100vw"
      style={{ top: 0, margin: 0, padding: 0, maxWidth: '100vw' }}
      className="rx-template-builder-modal !p-0 !m-0 !max-w-full !w-full"
      styles={{
        wrapper: { overflow: 'hidden', padding: 0 },
        container: {
          padding: 0,
          margin: 0,
          borderRadius: 0,
          height: '100vh',
          width: '100vw',
          maxWidth: '100vw',
          maxHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxSizing: 'border-box',
        },
        body: {
          padding: 0,
          margin: 0,
          height: '100vh',
          width: '100%',
          maxWidth: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          flex: 1,
          boxSizing: 'border-box',
        },
      }}
      destroyOnHidden
    >
      <div className="flex flex-col h-full w-full bg-slate-900 text-slate-100 overflow-hidden font-sans select-none">
        {/* Top Studio Control Bar */}
        <header className="h-14 px-4 bg-slate-900 border-b border-slate-700/80 flex items-center justify-between gap-3 shrink-0 z-30">
          {/* Left info & Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Builder"
            >
              <ArrowLeft size={18} />
            </button>

            <div className="w-px h-6 bg-slate-700 hidden sm:block" />

            <div className="min-w-0">
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template Title"
                className="text-sm font-bold text-white bg-transparent border-b border-transparent hover:border-slate-600 focus:border-blue-500 focus:outline-none px-1 py-0.5 rounded truncate"
              />
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                <span>{hospitalName}</span>
                {template?.version && (
                  <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono font-semibold">
                    v{template.version}
                  </span>
                )}
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold tracking-wide uppercase ${
                    initialMode === 'blank' && (!template || template.status === 'DRAFT')
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {initialMode === 'blank' ? 'BLANK CANVAS MODE' : 'DEFAULT TEMPLATE MODE'}
                </span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold tracking-wide uppercase ${
                    template?.status === 'ACTIVE'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {template?.status || 'NEW DRAFT'}
                </span>
              </div>
            </div>
          </div>

          {/* Center Mode Switch */}
          <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'visual'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palette size={14} />
              <span>Visual Studio</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'code'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 size={14} />
              <span>Advanced HTML</span>
            </button>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void handlePerformSave('DRAFT')}
              disabled={saving}
              className="h-8 px-3.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Save size={14} />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              onClick={() => void handlePerformSave('ACTIVE')}
              disabled={saving || !linterResult.isValid}
              className="h-8 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              title={
                !linterResult.isValid
                  ? 'Missing mandatory clinical tokens'
                  : 'Activate for consulting doctors'
              }
            >
              <CheckCircle2 size={14} />
              <span>Activate Template</span>
            </button>
          </div>
        </header>

        {/* Linter warnings banner if missing mandatory tokens */}
        {!linterResult.isValid && (
          <div className="bg-amber-950/90 border-b border-amber-800/80 px-4 py-1.5 flex items-center gap-2 text-amber-200 text-xs">
            <AlertTriangle size={14} className="text-amber-400 shrink-0" />
            <span>
              <strong>Warning:</strong> Missing required placeholders:{' '}
              {linterResult.missingMandatory.join(', ')}. Please restore them before activating.
            </span>
          </div>
        )}

        {/* Studio Body: Three-Panel Layout */}
        <div className="flex-1 flex min-h-0 min-w-0 w-full overflow-hidden relative">
          {activeTab === 'visual' ? (
            <>
              {/* Left Pane: Sections & Tokens Palette (288px - 320px) */}
              <aside className="w-72 lg:w-80 shrink-0 flex flex-col h-full min-h-0 min-w-0 bg-white text-slate-800 border-r border-slate-200 overflow-hidden z-10 box-border">
                {/* Tab Switcher */}
                <div className="flex items-center border-b border-slate-200 bg-slate-50 shrink-0">
                  <button
                    type="button"
                    onClick={() => setLeftSidebarTab('elements')}
                    className={`flex-1 py-2 text-[11px] font-bold text-center border-b-2 cursor-pointer transition-colors ${
                      leftSidebarTab === 'elements'
                        ? 'border-blue-600 text-blue-600 bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    + Elements
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeftSidebarTab('sections')}
                    className={`flex-1 py-2 text-[11px] font-bold text-center border-b-2 cursor-pointer transition-colors ${
                      leftSidebarTab === 'sections'
                        ? 'border-blue-600 text-blue-600 bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Layers ({layoutConfig.sections.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setLeftSidebarTab('tokens')}
                    className={`flex-1 py-2 text-[11px] font-bold text-center border-b-2 cursor-pointer transition-colors ${
                      leftSidebarTab === 'tokens'
                        ? 'border-blue-600 text-blue-600 bg-white'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Placeholders
                  </button>
                </div>

                <div className="flex-1 min-h-0 overflow-hidden">
                  {leftSidebarTab === 'elements' ? (
                    <InsertElementsPalette onInsertElement={handleInsertElement} />
                  ) : leftSidebarTab === 'sections' ? (
                    <SectionPaletteDrawer
                      sections={layoutConfig.sections}
                      selectedSectionId={selectedSectionId}
                      onSelectSection={(id) => setSelectedSectionId(id)}
                      onToggleSection={handleToggleSection}
                      onMoveSection={handleMoveSection}
                      onAddImageSection={handleAddImageSection}
                      onDeleteSection={handleDeleteSection}
                      onDuplicateSection={handleDuplicateSection}
                      onOpenInsertTab={() => setLeftSidebarTab('elements')}
                    />
                  ) : (
                    <PlaceholderPickerPanel onInsertToken={handleInsertToken} />
                  )}
                </div>
              </aside>

              {/* Center Canvas: Live A4 Virtual Sheet */}
              <main className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden bg-slate-950/90 relative z-0 box-border">
                <CanvasA4Preview
                  htmlContent={rawHtml}
                  templateName={templateName}
                  selectedSectionId={selectedSectionId}
                  activeCellTarget={activeCellTarget}
                  onSelectSection={(secId, cell) => {
                    setSelectedSectionId(secId);
                    if (cell) {
                      setActiveCellTarget({ sectionId: secId, row: cell.row, col: cell.col });
                    }
                  }}
                  onUpdateTableCell={handleUpdateTableCell}
                  onUpdateSectionField={handleUpdateSectionField}
                  onDropToken={handleDropToken}
                />
              </main>

              {/* Right Pane: Property & Styling Inspector (320px - 368px) */}
              <aside className="w-80 sm:w-84 lg:w-88 xl:w-92 shrink-0 flex flex-col h-full min-h-0 min-w-0 bg-white text-slate-800 border-l border-slate-200 overflow-hidden z-10 box-border">
                <SectionPropertyInspector
                  layoutConfig={layoutConfig}
                  selectedSection={selectedSection}
                  hospitalId={hospitalId}
                  onChangeTheme={handleThemeChange}
                  onChangeSectionProps={handleSectionPropsChange}
                  onDeleteSection={handleDeleteSection}
                  onDuplicateSection={handleDuplicateSection}
                  activeCellTarget={activeCellTarget}
                  onSelectCell={setActiveCellTarget}
                  onInsertToken={handleInsertToken}
                />
              </aside>
            </>
          ) : (
            /* Advanced Code Mode */
            <div className="flex-1 flex h-full">
              {/* Left Code Editor */}
              <div className="w-1/2 h-full flex flex-col border-r border-slate-800 bg-slate-950">
                <div className="h-10 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Code2 size={14} className="text-blue-400" />
                    <span className="font-bold text-slate-200">HTML &amp; CSS Source</span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {rawHtml.length} bytes
                  </span>
                </div>
                <textarea
                  value={rawHtml}
                  onChange={(e) => setRawHtml(e.target.value)}
                  className="flex-1 p-4 font-mono text-xs text-emerald-400 bg-slate-950 focus:outline-none resize-none leading-relaxed selection:bg-blue-800"
                  spellCheck={false}
                />
              </div>

              {/* Right Live Canvas */}
              <div className="w-1/2 h-full overflow-hidden">
                <CanvasA4Preview htmlContent={rawHtml} templateName={templateName} />
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
