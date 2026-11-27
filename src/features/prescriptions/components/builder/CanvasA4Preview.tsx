import {
  Download,
  FileText,
  Loader2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { prescriptionTemplatesApi } from '../../services/prescriptionTemplatesApi';
import { SAMPLE_ADMIN_PREVIEW_DATA } from '../../templates/templateData';
import type { LetterPadDataContext } from '../../types/template';
import { resolvePrescriptionTemplate } from '../../utils/resolvePrescriptionTemplate';

export interface CanvasA4PreviewProps {
  htmlContent: string;
  templateName?: string;
  customData?: LetterPadDataContext;
  selectedSectionId?: string | null;
  activeCellTarget?: { sectionId: string; row: number; col: number } | null;
  onSelectSection?: (sectionId: string, cell?: { row: number; col: number }) => void;
  onUpdateTableCell?: (sectionId: string, row: number, col: number, value: string) => void;
  onUpdateSectionField?: (sectionId: string, field: string, value: string) => void;
  onDropToken?: (token: string, target: { sectionId: string; field?: string; row?: number; col?: number }) => void;
}

export const CanvasA4Preview: React.FC<CanvasA4PreviewProps> = ({
  htmlContent,
  templateName = 'Prescription Preview',
  customData = SAMPLE_ADMIN_PREVIEW_DATA,
  selectedSectionId,
  activeCellTarget,
  onSelectSection,
  onUpdateTableCell,
  onUpdateSectionField,
  onDropToken,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(0.75);
  const [useSampleData, setUseSampleData] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Compile final HTML for display in iframe
  const compiledHtml = useMemo(() => {
    if (!htmlContent) return '';
    if (useSampleData) {
      const result = resolvePrescriptionTemplate(htmlContent, customData);
      return result.renderedHtml;
    }
    return htmlContent;
  }, [htmlContent, useSampleData, customData]);

  // Wire up interactive selection, live inline editing and drag-and-drop in iframe
  const setupIframeInteractivity = () => {
    const iframe = iframeRef.current;
    if (!iframe || !iframe.contentDocument) return;
    const doc = iframe.contentDocument;

    // Inject builder selection & outline CSS
    let styleTag = doc.getElementById('rx-builder-interactive-styles') as HTMLStyleElement | null;
    if (!styleTag) {
      styleTag = doc.createElement('style');
      styleTag.id = 'rx-builder-interactive-styles';
      doc.head.appendChild(styleTag);
    }

    styleTag.textContent = `
      [data-section-id] {
        cursor: pointer;
        transition: outline 0.12s ease-in-out;
      }
      [data-section-id]:hover {
        outline: 1.5px dashed #3b82f6 !important;
        outline-offset: 1px;
      }
      ${
        selectedSectionId
          ? `[data-section-id="${selectedSectionId}"] {
              outline: 2px solid #2563eb !important;
              outline-offset: 2px;
            }`
          : ''
      }
      .rx-table-cell {
        cursor: text;
        transition: background-color 0.12s ease-in-out, outline 0.12s ease-in-out;
      }
      .rx-table-cell:hover {
        outline: 1.5px dashed #60a5fa !important;
        background-color: rgba(59, 130, 246, 0.08) !important;
      }
      ${
        activeCellTarget && selectedSectionId === activeCellTarget.sectionId
          ? `[data-section-id="${activeCellTarget.sectionId}"][data-cell-row="${activeCellTarget.row}"][data-cell-col="${activeCellTarget.col}"] {
              outline: 2px solid #2563eb !important;
              background-color: rgba(37, 99, 235, 0.14) !important;
            }`
          : ''
      }
    `;

    // Click handler: select section and table cell
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const cellEl = target.closest('[data-cell-row]') as HTMLElement;
      if (cellEl) {
        const secId = cellEl.getAttribute('data-section-id') || '';
        const row = parseInt(cellEl.getAttribute('data-cell-row') || '0', 10);
        const col = parseInt(cellEl.getAttribute('data-cell-col') || '0', 10);
        onSelectSection?.(secId, { row, col });
        return;
      }

      const secEl = target.closest('[data-section-id]') as HTMLElement;
      if (secEl) {
        const secId = secEl.getAttribute('data-section-id') || '';
        onSelectSection?.(secId);
      }
    };

    // Drag and Drop handler: insert dynamic placeholder tokens into canvas elements or cells
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      const token =
        e.dataTransfer?.getData('application/x-token') || e.dataTransfer?.getData('text/plain');
      if (!token) return;

      const target = e.target as HTMLElement;
      const cellEl = target?.closest('[data-cell-row]') as HTMLElement;
      if (cellEl) {
        const secId = cellEl.getAttribute('data-section-id') || '';
        const row = parseInt(cellEl.getAttribute('data-cell-row') || '0', 10);
        const col = parseInt(cellEl.getAttribute('data-cell-col') || '0', 10);
        onDropToken?.(token, { sectionId: secId, row, col });
        return;
      }

      const fieldEl = target?.closest('[data-field]') as HTMLElement;
      if (fieldEl) {
        const secId = fieldEl.getAttribute('data-section-id') || '';
        const field = fieldEl.getAttribute('data-field') || '';
        onDropToken?.(token, { sectionId: secId, field });
        return;
      }

      const secEl = target?.closest('[data-section-id]') as HTMLElement;
      const secId = secEl?.getAttribute('data-section-id') || '';
      onDropToken?.(token, { sectionId: secId });
    };

    // Attach listeners
    doc.removeEventListener('click', handleClick);
    doc.addEventListener('click', handleClick);

    doc.removeEventListener('dragover', handleDragOver);
    doc.addEventListener('dragover', handleDragOver);

    doc.removeEventListener('drop', handleDrop);
    doc.addEventListener('drop', handleDrop);

    // If in Raw Placeholders mode, make table cells directly editable on canvas
    if (!useSampleData) {
      const cells = doc.querySelectorAll<HTMLElement>('.rx-table-cell');
      cells.forEach((cell) => {
        cell.contentEditable = 'true';
        cell.spellcheck = false;

        cell.onblur = () => {
          const secId = cell.getAttribute('data-section-id') || '';
          const row = parseInt(cell.getAttribute('data-cell-row') || '0', 10);
          const col = parseInt(cell.getAttribute('data-cell-col') || '0', 10);
          const text = cell.innerText.trim();
          onUpdateTableCell?.(secId, row, col, text);
        };
      });

      const heading = doc.querySelector<HTMLElement>('.rx-heading');
      if (heading) {
        heading.contentEditable = 'true';
        heading.spellcheck = false;
        heading.onblur = () => {
          const secId = heading.getAttribute('data-section-id') || '';
          onUpdateSectionField?.(secId, 'text', heading.innerText.trim());
        };
      }

      const paragraph = doc.querySelector<HTMLElement>('.rx-paragraph');
      if (paragraph) {
        paragraph.contentEditable = 'true';
        paragraph.spellcheck = false;
        paragraph.onblur = () => {
          const secId = paragraph.getAttribute('data-section-id') || '';
          onUpdateSectionField?.(secId, 'content', paragraph.innerText.trim());
        };
      }
    }
  };

  useEffect(() => {
    // Re-apply interactivity whenever DOM changes
    const timer = setTimeout(() => {
      setupIframeInteractivity();
    }, 60);
    return () => clearTimeout(timer);
  }, [compiledHtml, selectedSectionId, activeCellTarget, useSampleData]);

  // Handle PDF Preview generation via backend Puppeteer
  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      setPdfError(null);
      const blob = await prescriptionTemplatesApi.generatePreviewPdf({
        html: compiledHtml,
      });

      if (blob instanceof Blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${templateName.toLowerCase().replace(/\s+/g, '_')}_a4_preview.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      console.error('Failed to generate PDF:', err);
      setPdfError(err?.message || 'Failed to generate PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-slate-900/90 text-slate-100 select-none overflow-hidden box-border">
      {/* Top Preview Controls Bar */}
      <div className="h-11 px-4 border-b border-slate-700/80 bg-slate-900 flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-blue-400" />
          <span className="text-xs font-bold text-white">A4 Canvas Virtual Sheet</span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-mono">
            210 × 297 mm
          </span>
        </div>

        {/* Center Mode Switch */}
        <div className="flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700">
          <button
            type="button"
            onClick={() => setUseSampleData(true)}
            className={`px-2.5 py-1 text-[11px] rounded-md font-semibold transition-colors cursor-pointer ${
              useSampleData
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sample Patient Data
          </button>
          <button
            type="button"
            onClick={() => setUseSampleData(false)}
            className={`px-2.5 py-1 text-[11px] rounded-md font-semibold transition-colors cursor-pointer ${
              !useSampleData
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Raw Placeholders
          </button>
        </div>

        {/* Right Zoom & PDF actions */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 px-1">
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.max(0.4, Number((prev - 0.1).toFixed(2))))}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[11px] font-mono text-slate-300 px-1.5 min-w-[42px] text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.min(1.4, Number((prev + 0.1).toFixed(2))))}
              className="p-1 text-slate-400 hover:text-white cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setZoomLevel(0.75)}
            className="px-2 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 cursor-pointer hidden md:inline-block"
            title="Reset Zoom to 75%"
          >
            Fit
          </button>

          <button
            type="button"
            onClick={() => void handleDownloadPdf()}
            disabled={isGeneratingPdf}
            className="h-7.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Verify real Puppeteer PDF output"
          >
            {isGeneratingPdf ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Download size={13} />
            )}
            <span className="hidden sm:inline">Test PDF</span>
          </button>
        </div>
      </div>

      {pdfError && (
        <div className="px-4 py-1.5 bg-rose-950/80 border-b border-rose-800 text-rose-300 text-xs">
          PDF Error: {pdfError}
        </div>
      )}

      {/* Sheet Viewport */}
      <div className="flex-1 overflow-auto p-6 flex justify-center items-start bg-slate-950/80">
        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease-out',
            width: '210mm',
            minHeight: '297mm',
            backgroundColor: '#ffffff',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          }}
          className="rounded-xs overflow-hidden shrink-0 border border-slate-300"
        >
          <iframe
            ref={iframeRef}
            onLoad={setupIframeInteractivity}
            title="Prescription Sheet Preview"
            srcDoc={compiledHtml}
            className="w-[210mm] min-h-[297mm] border-none block bg-white"
            style={{ width: '210mm', minHeight: '297mm' }}
            sandbox="allow-same-origin"
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="h-7 px-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-[10px] text-slate-400">
        <span>Render Engine: Headless Print A4 standard</span>
        <span className="font-mono">CSS: @page &#123; size: A4 portrait; margin: 0; &#125;</span>
      </div>
    </div>
  );
};
