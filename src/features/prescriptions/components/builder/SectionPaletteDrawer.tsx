import {
  Activity,
  AlignLeft,
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  FileCode,
  FileSignature,
  FileSpreadsheet,
  FileText,
  Heading,
  HeartPulse,
  Hospital,
  Image as ImageIcon,
  Layers,
  Minus,
  MoveVertical,
  Pill,
  Plus,
  Stethoscope,
  Table as TableIcon,
  Trash2,
  User,
} from 'lucide-react';
import React from 'react';

import type { TemplateSectionBlock, TemplateSectionType } from '../../types/template';

interface SectionPaletteDrawerProps {
  sections: TemplateSectionBlock[];
  selectedSectionId: string | null;
  onSelectSection: (id: string) => void;
  onToggleSection: (id: string) => void;
  onMoveSection: (id: string, direction: 'up' | 'down') => void;
  onAddImageSection?: (() => void) | undefined;
  onDeleteSection?: ((id: string) => void) | undefined;
  onDuplicateSection?: ((id: string) => void) | undefined;
  onOpenInsertTab?: (() => void) | undefined;
}

function getSectionIcon(type: TemplateSectionType): React.ReactNode {
  switch (type) {
    case 'HEADING':
      return <Heading size={11} />;
    case 'PARAGRAPH':
      return <AlignLeft size={11} />;
    case 'TABLE':
      return <TableIcon size={11} />;
    case 'CUSTOM_IMAGE':
      return <ImageIcon size={11} />;
    case 'DIVIDER':
      return <Minus size={11} />;
    case 'SPACER':
      return <MoveVertical size={11} />;
    case 'PLACEHOLDER_BLOCK':
      return <FileCode size={11} />;
    case 'HEADER_LETTERHEAD':
      return <Hospital size={11} />;
    case 'PATIENT_DETAILS':
      return <User size={11} />;
    case 'DOCTOR_DETAILS':
      return <Stethoscope size={11} />;
    case 'VITALS_BLOCK':
      return <HeartPulse size={11} />;
    case 'DIAGNOSIS_BLOCK':
      return <Activity size={11} />;
    case 'MEDICINES_TABLE':
      return <Pill size={11} />;
    case 'LAB_TESTS_BLOCK':
      return <FileSpreadsheet size={11} />;
    case 'ADVICE_NOTES_BLOCK':
      return <FileText size={11} />;
    case 'SIGNATURE_BLOCK':
      return <FileSignature size={11} />;
    case 'FOOTER_LETTERHEAD':
      return <Hospital size={11} />;
    default:
      return <Layers size={11} />;
  }
}

export const SectionPaletteDrawer: React.FC<SectionPaletteDrawerProps> = ({
  sections,
  selectedSectionId,
  onSelectSection,
  onToggleSection,
  onMoveSection,
  onAddImageSection,
  onDeleteSection,
  onDuplicateSection,
  onOpenInsertTab,
}) => {
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-white overflow-hidden box-border">
      {/* Palette Header */}
      <div className="p-3 border-b border-slate-200 bg-slate-50/60 shrink-0">
        <div className="flex items-center gap-1.5">
          <Layers size={14} className="text-blue-600" />
          <span className="text-xs font-bold text-slate-800">Canvas Elements</span>
          <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
            {sortedSections.filter((s) => s.enabled).length} Active
          </span>
        </div>
        <p className="text-[10px] text-slate-400 mt-1 mb-0">
          Reorder, duplicate or configure elements on the A4 canvas.
        </p>
      </div>

      {/* Add Custom Image / Logo Element button */}
      {onAddImageSection && (
        <div className="p-2 border-b border-slate-100 bg-white shrink-0">
          <button
            type="button"
            onClick={onAddImageSection}
            className="w-full py-1.5 px-3 rounded-lg border border-dashed border-blue-400 bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
          >
            <Plus size={13} />
            <ImageIcon size={13} />
            <span>Insert Image / Logo Block</span>
          </button>
        </div>
      )}

      {/* Insert Element Action Header */}
      {onOpenInsertTab && !onAddImageSection && (
        <div className="p-2 border-b border-slate-100 bg-white shrink-0">
          <button
            type="button"
            onClick={onOpenInsertTab}
            className="w-full py-1.5 px-3 rounded-lg border border-dashed border-blue-400 bg-blue-50/70 hover:bg-blue-100/70 text-blue-700 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
          >
            <Plus size={13} />
            <span>+ Insert Element / Block</span>
          </button>
        </div>
      )}

      {/* Sections List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {sortedSections.length === 0 ? (
          <div className="py-10 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <Layers size={18} />
            </div>
            <h5 className="text-xs font-bold text-slate-700 m-0">Canvas is Empty</h5>
            <p className="text-[10px] text-slate-400 mt-1 mb-3">
              No elements added to this blank template yet.
            </p>
            {onOpenInsertTab && (
              <button
                type="button"
                onClick={onOpenInsertTab}
                className="py-1.5 px-3 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg inline-flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
              >
                <Plus size={13} />
                <span>Browse Insert Elements</span>
              </button>
            )}
          </div>
        ) : (
          sortedSections.map((sec, index) => {
            const isSelected = selectedSectionId === sec.id;
            const isFirst = index === 0;
            const isLast = index === sortedSections.length - 1;

            return (
              <div
                key={sec.id}
                onClick={() => onSelectSection(sec.id)}
                className={`p-2 rounded-lg border transition-all cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? 'bg-blue-50/70 border-blue-400 shadow-xs ring-1 ring-blue-300'
                    : sec.enabled
                    ? 'bg-white border-slate-200 hover:border-slate-300'
                    : 'bg-slate-50/80 border-slate-200 opacity-60'
                }`}
              >
                {/* Element icon pill */}
                <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                  {getSectionIcon(sec.type)}
                </span>

                {/* Title & subtitle */}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 truncate flex items-center gap-1">
                    <span>{sec.title}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono truncate">{sec.type}</div>
                </div>

                {/* Element Actions: Up, Down, Duplicate, Toggle, Delete */}
                <div className="flex items-center gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => onMoveSection(sec.id, 'up')}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                    title="Move Up"
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => onMoveSection(sec.id, 'down')}
                    className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer disabled:cursor-not-allowed"
                    title="Move Down"
                  >
                    <ArrowDown size={12} />
                  </button>

                  {/* Duplicate Button */}
                  {onDuplicateSection && (
                    <button
                      type="button"
                      onClick={() => onDuplicateSection(sec.id)}
                      className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                      title="Duplicate element"
                    >
                      <Copy size={12} />
                    </button>
                  )}

                  {/* Enable / Disable toggle */}
                  <button
                    type="button"
                    onClick={() => onToggleSection(sec.id)}
                    className={`p-1 rounded transition-colors cursor-pointer ${
                      sec.enabled ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
                    }`}
                    title={sec.enabled ? 'Disable section' : 'Enable section'}
                  >
                    {sec.enabled ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>

                  {/* Delete button */}
                  {onDeleteSection && (
                    <button
                      type="button"
                      onClick={() => onDeleteSection(sec.id)}
                      className="p-1 rounded text-rose-500 hover:bg-rose-50 cursor-pointer transition-colors"
                      title={sec.type === 'CUSTOM_IMAGE' ? 'Delete image block' : 'Delete element'}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-2 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-400 text-center shrink-0">
        Elements compile cleanly into standard A4 print blocks.
      </div>
    </div>
  );
};
