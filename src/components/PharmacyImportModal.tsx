import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Info,
  Loader2,
  RefreshCw,
  UploadCloud,
  X,
  XCircle,
} from 'lucide-react';
import React, { useRef, useState } from 'react';

import type {
  BulkImportResponse,
  DiscountType,
  ImportPreviewResult,
  ImportStrategy,
} from '../types/pharmacy';
import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import {
  downloadErrorReport,
  downloadSampleTemplate,
  normalizeExcelRow,
  parseExcelFile,
} from '../utils/excelTemplate';

interface PharmacyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'UPLOAD' | 'PREVIEW' | 'IMPORTING' | 'RESULT';
type PreviewFilter = 'ALL' | 'NEW' | 'ALREADY_EXISTS' | 'DUPLICATE_IN_EXCEL' | 'INVALID';

const MAX_FILE_SIZE_MB = 10;

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

export default function PharmacyImportModal({
  isOpen,
  onClose,
  onSuccess,
}: PharmacyImportModalProps) {
  const [step, setStep] = useState<Step>('UPLOAD');
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [previewFilter, setPreviewFilter] = useState<PreviewFilter>('ALL');
  const [strategy, setStrategy] = useState<ImportStrategy>('SKIP_EXISTING');

  const [importResult, setImportResult] = useState<BulkImportResponse | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setStep('UPLOAD');
    setFile(null);
    setParsingError(null);
    setIsParsing(false);
    setPreviewResult(null);
    setPreviewFilter('ALL');
    setStrategy('SKIP_EXISTING');
    setImportResult(null);
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFileChosen = (selectedFile: File) => {
    setParsingError(null);

    const extension = selectedFile.name.split('.').pop()?.toLowerCase();
    if (extension !== 'xlsx' && extension !== 'xls') {
      setParsingError('Unsupported file format. Please upload an Excel (.xlsx or .xls) file.');
      setFile(null);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setParsingError(`The uploaded file exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB}MB.`);
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleProcessFile = async (selectedFile: File) => {
    setParsingError(null);
    setIsParsing(true);

    try {
      const rawRows = await parseExcelFile(selectedFile);

      if (rawRows.length === 0) {
        throw new Error('No data rows found in the uploaded Excel worksheet.');
      }

      const normalizedRows = rawRows.map((row, idx) => normalizeExcelRow(row, idx + 1));

      const response = await api.post<ImportPreviewResult>('medicines/bulk-validate', {
        medicines: normalizedRows,
      });

      setPreviewResult(response.data);
      setStep('PREVIEW');
    } catch (err: unknown) {
      setParsingError(getErrorMessage(err, 'Failed to read and validate the Excel file.'));
    } finally {
      setIsParsing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      handleFileChosen(e.dataTransfer.files[0]);
    }
  };

  const handleConfirmImport = async () => {
    if (!previewResult) return;

    const eligibleRows = previewResult.previewRows
      .filter((r) => {
        if (!r.isValid || !r.data) return false;
        if (strategy === 'UPDATE_EXISTING') {
          return r.classification === 'NEW' || r.classification === 'ALREADY_EXISTS';
        }
        return r.classification === 'NEW';
      })
      .map((r) => {
        if (!r.data) return null;
        let dt: DiscountType | null = null;
        if (r.data.discountType) {
          const s = String(r.data.discountType).trim().toLowerCase();
          if (s.includes('percent') || s === '%') {
            dt = 'Percentage';
          } else if (s.includes('fixed') || s.includes('flat') || s.includes('amount') || s === '₹') {
            dt = 'Fixed Amount';
          }
        }
        return {
          ...r.data,
          discountType: dt,
        };
      })
      .filter((r) => r !== null);

    if (eligibleRows.length === 0) {
      setImportError(
        strategy === 'SKIP_EXISTING'
          ? 'There are no new medicine variant records to import. If you want to update existing records, select "Update Existing Variants".'
          : 'There are no valid records to import.'
      );
      return;
    }

    setStep('IMPORTING');
    setImportError(null);

    try {
      const response = await api.post<BulkImportResponse>('medicines/bulk-import', {
        strategy,
        medicines: eligibleRows,
      });

      setImportResult(response.data);
      setStep('RESULT');
      onSuccess();
    } catch (err: unknown) {
      setImportError(getErrorMessage(err, 'A database error occurred during import.'));
      setStep('PREVIEW');
    }
  };

  const filteredPreviewRows = previewResult
    ? previewResult.previewRows.filter((r) => {
        if (previewFilter === 'NEW') return r.classification === 'NEW';
        if (previewFilter === 'ALREADY_EXISTS') return r.classification === 'ALREADY_EXISTS';
        if (previewFilter === 'DUPLICATE_IN_EXCEL') return r.classification === 'DUPLICATE_IN_EXCEL';
        if (previewFilter === 'INVALID') return r.classification === 'INVALID';
        return true;
      })
    : [];

  const eligibleCount = previewResult
    ? previewResult.previewRows.filter((r) => {
        if (!r.isValid) return false;
        if (strategy === 'UPDATE_EXISTING') {
          return r.classification === 'NEW' || r.classification === 'ALREADY_EXISTS';
        }
        return r.classification === 'NEW';
      }).length
    : 0;

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      className="ui-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && step !== 'IMPORTING') onClose();
      }}
    >
      <div
        className="ui-modal is-xl bg-white shadow-2xl border border-slate-200/80 rounded-2xl overflow-hidden flex flex-col transition-all"
        style={{
          width: '100%',
          maxWidth: step === 'PREVIEW' || step === 'RESULT' ? '1060px' : '860px',
          maxHeight: '88vh',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
      >
        {/* Modal Header */}
        <div className="ui-modal-head border-b border-slate-100 bg-white px-8 pt-7 pb-5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700 border border-teal-200/80 shrink-0">
              <FileSpreadsheet size={21} />
            </div>
            <div>
              <h2 id="import-modal-title" className="text-[17px] font-semibold text-slate-900 leading-tight">
                Bulk Import Medicines & Strength Variants
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Upload a single Excel file with multiple strength variants per medicine into the master catalog.
              </p>
            </div>
          </div>
          {step !== 'IMPORTING' && (
            <button
              type="button"
              className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-colors cursor-pointer"
              onClick={onClose}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Modal Content */}
        <div className="ui-modal-body px-8 py-6 flex flex-col gap-6 overflow-y-auto flex-1 text-slate-700">
          {/* STEP 1: UPLOAD */}
          {step === 'UPLOAD' && (
            <div className="flex flex-col gap-6">
              {/* Template Download Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4.5 rounded-xl bg-teal-50/70 border border-teal-200/80">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-teal-100/90 text-teal-800 shrink-0">
                    <Download size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-teal-950">
                      Multi-Variant Excel Template (.xlsx)
                    </h3>
                    <p className="text-xs text-teal-800/90 mt-0.5">
                      Each row represents one strength variant. Multiple rows with the same medicine code map to one medicine master record.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold shadow-xs transition-colors shrink-0"
                >
                  <Download size={14} /> Download Template
                </button>
              </div>

              {/* Drag and Drop Box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-9 flex flex-col items-center justify-center text-center transition-all cursor-pointer ${
                  isDragging
                    ? 'border-teal-500 bg-teal-50/50 scale-[0.99]'
                    : file
                      ? 'border-teal-300 bg-teal-50/20'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/40 hover:bg-slate-50/80'
                }`}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                }}
                tabIndex={0}
                role="button"
                aria-label="Upload Excel File"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".xlsx, .xls"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileChosen(e.target.files[0]);
                  }}
                />

                <div className="flex h-13 w-13 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 border border-teal-200/80 mb-3.5 shadow-xs">
                  <UploadCloud size={26} />
                </div>

                {!file ? (
                  <>
                    <p className="text-sm font-semibold text-slate-800">
                      Click to upload or drag and drop your Excel file
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      .xlsx / .xls &bull; Worksheet: <span className="font-mono text-teal-700 font-semibold">Medicines_Inventory</span> &bull; Max {MAX_FILE_SIZE_MB} MB
                    </p>
                  </>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-teal-900">{file.name}</p>
                    <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
                    <p className="text-[11px] font-semibold text-teal-700 mt-2">
                      Click or drag to choose a different file
                    </p>
                  </div>
                )}
              </div>

              {parsingError && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
                  <XCircle size={16} className="mt-0.5 text-rose-600 shrink-0" />
                  <span>{parsingError}</span>
                </div>
              )}

              {/* Supported Columns Breakdown */}
              <div className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-4.5 text-xs text-slate-600">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-xs mb-3">
                  <Info size={15} className="text-teal-700" />
                  <span>Supported Column Structure</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
                    <p className="text-[10px] font-bold text-teal-800 tracking-wider mb-2 uppercase">
                      Medicine Master Fields
                    </p>
                    <div className="space-y-1.5 text-[12px] text-slate-600">
                      <div><strong className="text-slate-800 font-semibold">medicine_name</strong> (Required) &bull; medicine_code</div>
                      <div>generic_name &bull; manufacturer</div>
                      <div>therapeutic_category &bull; therapeutic_sub_category</div>
                      <div>prescription_required &bull; description</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs">
                    <p className="text-[10px] font-bold text-teal-800 tracking-wider mb-2 uppercase">
                      Strength Variant & Inventory Fields
                    </p>
                    <div className="space-y-1.5 text-[12px] text-slate-600">
                      <div><strong className="text-slate-800 font-semibold">strength</strong> &bull; <strong className="text-slate-800 font-semibold">strength_unit</strong> &bull; <strong className="text-slate-800 font-semibold">dosage_form</strong></div>
                      <div>tablets_per_strip &bull; opening_stock (new variants only)</div>
                      <div>mrp &bull; discount_type &bull; discount_value &bull; purchase_price</div>
                      <div>reorder_level &bull; variant_code &bull; barcode &bull; status &bull; notes</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW & VALIDATION */}
          {step === 'PREVIEW' && previewResult && (
            <div className="space-y-4">
              {importError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
                  <XCircle size={16} className="mt-0.5 text-rose-600 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 shadow-2xs">
                  <span className="text-[11px] font-medium text-slate-600 block">Total Rows</span>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    {previewResult.totalRows}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50/70 shadow-2xs">
                  <span className="text-[11px] font-semibold text-emerald-800 block">New Variants</span>
                  <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
                    {previewResult.newRows}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/70 shadow-2xs">
                  <span className="text-[11px] font-semibold text-amber-800 block">Already Existing</span>
                  <div className="text-xl font-extrabold text-amber-700 mt-0.5">
                    {previewResult.alreadyExistingRows}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-purple-300 bg-purple-50/70 shadow-2xs">
                  <span className="text-[11px] font-semibold text-purple-800 block">Duplicate in Excel</span>
                  <div className="text-xl font-extrabold text-purple-700 mt-0.5">
                    {previewResult.duplicateInExcelRows}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-rose-300 bg-rose-50/70 shadow-2xs">
                  <span className="text-[11px] font-semibold text-rose-800 block">Invalid Rows</span>
                  <div className="text-xl font-extrabold text-rose-700 mt-0.5">
                    {previewResult.invalidRows}
                  </div>
                </div>
              </div>

              {/* Strategy Selector & Duplicate-Safe Banner */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <Info size={16} className="text-teal-700 shrink-0" />
                  <span className="text-slate-700">
                    <strong className="text-slate-900">Import Strategy:</strong> Choose how to handle rows where the strength variant already exists.
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setStrategy('SKIP_EXISTING')}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                      strategy === 'SKIP_EXISTING'
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Skip Existing (Safe)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStrategy('UPDATE_EXISTING')}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                      strategy === 'UPDATE_EXISTING'
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    Update Existing Prices
                  </button>
                </div>
              </div>

              {/* Filter Tabs for Preview Table */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-0.5">
                <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      previewFilter === 'ALL'
                        ? 'bg-white shadow-2xs text-slate-900 font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    All ({previewResult.totalRows})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('NEW')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      previewFilter === 'NEW'
                        ? 'bg-white shadow-2xs text-emerald-700 font-bold'
                        : 'text-slate-600 hover:text-emerald-700'
                    }`}
                  >
                    New Variants ({previewResult.newRows})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('ALREADY_EXISTS')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      previewFilter === 'ALREADY_EXISTS'
                        ? 'bg-white shadow-2xs text-amber-800 font-bold'
                        : 'text-slate-600 hover:text-amber-800'
                    }`}
                  >
                    Already Existing ({previewResult.alreadyExistingRows})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('DUPLICATE_IN_EXCEL')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      previewFilter === 'DUPLICATE_IN_EXCEL'
                        ? 'bg-white shadow-2xs text-purple-800 font-bold'
                        : 'text-slate-600 hover:text-purple-800'
                    }`}
                  >
                    Duplicates ({previewResult.duplicateInExcelRows})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('INVALID')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      previewFilter === 'INVALID'
                        ? 'bg-white shadow-2xs text-rose-800 font-bold'
                        : 'text-slate-600 hover:text-rose-800'
                    }`}
                  >
                    Invalid ({previewResult.invalidRows})
                  </button>
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Showing {filteredPreviewRows.length} of {previewResult.totalRows} rows
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-[340px] overflow-y-auto bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-700 font-bold sticky top-0 border-b border-slate-200 shadow-2xs">
                    <tr>
                      <th className="p-2.5 w-10 text-center uppercase tracking-wider text-[10px]">Row</th>
                      <th className="p-2.5 uppercase tracking-wider text-[10px]">Medicine Master</th>
                      <th className="p-2.5 uppercase tracking-wider text-[10px]">Strength Variant</th>
                      <th className="p-2.5 uppercase tracking-wider text-[10px]">Stock</th>
                      <th className="p-2.5 uppercase tracking-wider text-[10px]">Pricing</th>
                      <th className="p-2.5 uppercase tracking-wider text-[10px]">Classification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPreviewRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                          No rows match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredPreviewRows.map((r) => (
                        <tr key={r.rowNumber} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-2.5 text-center font-mono font-bold text-slate-400">
                            {r.rowNumber}
                          </td>
                          <td className="p-2.5">
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {r.medicineName}
                              {r.medicineCode && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
                                  {r.medicineCode}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {r.genericName ?? '—'}
                            </div>
                          </td>
                          <td className="p-2.5">
                            <div className="font-semibold text-slate-800">
                              {r.strength ?? 'Standard'} ({r.dosageForm ?? 'Tablet'})
                            </div>
                            {r.tabletsPerStrip && (
                              <div className="text-[10px] text-slate-500 font-mono">
                                {r.tabletsPerStrip} tablets/strip
                              </div>
                            )}
                          </td>
                          <td className="p-2.5">
                            <span className="font-mono font-semibold text-slate-700">
                              {r.openingStock ?? 0} units
                            </span>
                          </td>
                          <td className="p-2.5">
                            <div className="font-mono text-slate-900 font-bold">
                              ₹{r.finalPrice !== null && r.finalPrice !== undefined ? Number(r.finalPrice).toFixed(2) : '—'}
                            </div>
                            {r.mrp !== null && r.mrp !== undefined && (
                              <div className="text-[10px] text-slate-400 line-through">
                                MRP: ₹{Number(r.mrp).toFixed(2)}
                              </div>
                            )}
                          </td>
                          <td className="p-2.5">
                            {r.classification === 'NEW' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 size={11} className="text-emerald-600" /> NEW VARIANT
                              </span>
                            )}
                            {r.classification === 'ALREADY_EXISTS' && (
                              <div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  ALREADY EXISTS
                                </span>
                                <div className="text-[10px] font-medium text-amber-800 mt-0.5">
                                  {r.duplicateReason ?? 'Existing database variant'}
                                </div>
                              </div>
                            )}
                            {r.classification === 'DUPLICATE_IN_EXCEL' && (
                              <div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                                  DUPLICATE IN FILE
                                </span>
                                <div className="text-[10px] font-medium text-purple-800 mt-0.5">
                                  Duplicate variant row
                                </div>
                              </div>
                            )}
                            {r.classification === 'INVALID' && (
                              <div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                                  INVALID
                                </span>
                                <div className="text-[10px] font-medium text-rose-800 mt-0.5">
                                  {r.issues.join(', ')}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 3: IMPORTING STATE */}
          {step === 'IMPORTING' && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 border border-teal-200">
                <Loader2 size={30} className="animate-spin" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Importing Medicines & Variants...
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Executing safe bulk database operations with transactional integrity. Existing stock balances are strictly preserved.
              </p>
            </div>
          )}

          {/* STEP 4: IMPORT RESULT */}
          {step === 'RESULT' && importResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold">Import Completed Successfully</h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    {importResult.createdVariantsCount ?? importResult.insertedCount} strength variants created, {importResult.updatedVariantsCount ?? 0} updated. Existing stock preserved.
                  </p>
                </div>
              </div>

              {/* KPI Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 shadow-2xs">
                  <span className="text-[11px] font-medium text-slate-600 block">Total Rows</span>
                  <div className="text-xl font-bold text-slate-900 mt-0.5">
                    {importResult.totalRows}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-emerald-300 bg-emerald-50/70 shadow-2xs">
                  <span className="text-[11px] font-semibold text-emerald-800 block">Created Variants</span>
                  <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
                    {importResult.createdVariantsCount ?? importResult.insertedCount}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-sky-300 bg-sky-50/70 shadow-2xs">
                  <span className="text-[11px] font-semibold text-sky-800 block">Updated Variants</span>
                  <div className="text-xl font-extrabold text-sky-700 mt-0.5">
                    {importResult.updatedVariantsCount ?? 0}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-teal-300 bg-teal-50/70 shadow-2xs">
                  <span className="text-[11px] font-semibold text-teal-800 block">Stock Initialized</span>
                  <div className="text-xl font-extrabold text-teal-700 mt-0.5">
                    {importResult.stockInitializedCount ?? 0}
                  </div>
                </div>
              </div>

              {/* Secondary Metrics */}
              <div className="grid grid-cols-3 gap-2.5 text-xs text-slate-600">
                <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                  Medicines Master Created: <strong className="text-slate-900">{importResult.createdMedicinesCount ?? 0}</strong>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                  Skipped Existing Variants: <strong className="text-slate-900">{importResult.alreadyExistingCount}</strong>
                </div>
                <div className="p-2.5 rounded-lg border border-slate-200 bg-white">
                  Duplicate Rows in File: <strong className="text-slate-900">{importResult.duplicateInExcelCount}</strong>
                </div>
              </div>

              {/* Errors & Skipped Rows Report */}
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                      <AlertTriangle size={14} /> Failed Rows ({importResult.errors.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() => downloadErrorReport(importResult.errors)}
                      className="text-xs font-semibold text-rose-700 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                    >
                      <Download size={13} /> Download Error Report (.xlsx)
                    </button>
                  </div>

                  <div className="border border-rose-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto bg-white shadow-2xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-rose-100/70 text-rose-900 font-semibold sticky top-0 border-b border-rose-200">
                        <tr>
                          <th className="p-2 w-12 text-center text-[11px] font-bold uppercase">Row</th>
                          <th className="p-2 text-[11px] font-bold uppercase">Medicine Name</th>
                          <th className="p-2 text-[11px] font-bold uppercase">Error Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rose-100 bg-rose-50/30">
                        {importResult.errors.map((e, idx) => (
                          <tr key={idx}>
                            <td className="p-2 text-center font-mono font-bold text-rose-700 text-xs">
                              {e.row}
                            </td>
                            <td className="p-2 font-semibold text-slate-900 text-xs">
                              {e.medicineName ? e.medicineName : '—'}
                            </td>
                            <td className="p-2 text-rose-800 text-xs">{e.error}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="ui-modal-foot border-t border-slate-200/80 bg-slate-50 px-8 py-4 rounded-b-2xl flex items-center justify-between shrink-0">
          {step === 'UPLOAD' && (
            <>
              <div className="text-xs text-slate-500 font-medium">
                {!file ? 'Select an Excel file to continue' : 'File selected and ready to validate'}
              </div>

              <div className="flex items-center gap-2">
                <button type="button" onClick={onClose} className="ui-btn">
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!file || isParsing}
                  onClick={() => {
                    if (file) void handleProcessFile(file);
                  }}
                  className="ui-btn ui-btn-primary flex items-center gap-1.5 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isParsing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Validating...
                    </>
                  ) : (
                    'Continue'
                  )}
                </button>
              </div>
            </>
          )}

          {step === 'PREVIEW' && (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="ui-btn flex items-center gap-1.5 text-slate-700 hover:text-slate-900 font-medium"
              >
                <ArrowLeft size={14} /> Back / Change File
              </button>

              <div className="flex items-center gap-2">
                <button type="button" onClick={onClose} className="ui-btn text-slate-700">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleConfirmImport();
                  }}
                  disabled={!previewResult || eligibleCount === 0}
                  className="ui-btn ui-btn-primary flex items-center gap-1.5 font-semibold"
                >
                  <CheckCircle2 size={15} /> Confirm & Import ({eligibleCount} Variants)
                </button>
              </div>
            </>
          )}

          {step === 'IMPORTING' && (
            <div className="w-full text-center text-xs text-slate-500 font-medium italic">
              Processing bulk dataset...
            </div>
          )}

          {step === 'RESULT' && (
            <>
              <button
                type="button"
                onClick={handleReset}
                className="ui-btn flex items-center gap-1.5 text-slate-700 hover:text-slate-900 font-medium"
              >
                <RefreshCw size={14} /> Import Another File
              </button>

              <button
                type="button"
                onClick={onClose}
                className="ui-btn ui-btn-primary flex items-center gap-1.5 font-semibold"
              >
                <CheckCircle2 size={15} /> Done & View Medicines
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
