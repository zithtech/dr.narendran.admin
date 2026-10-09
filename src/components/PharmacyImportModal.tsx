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
  ImportPreviewResult,
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

const MAX_FILE_SIZE_MB = 5;

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

    // Only import records marked as NEW (and valid)
    const newRowsToImport = previewResult.previewRows
      .filter((r) => r.classification === 'NEW' && r.isValid && r.data)
      .map((r) => r.data ?? null)
      .filter((r) => r !== null);

    if (newRowsToImport.length === 0) {
      setImportError('There are no new medicine records to import.');
      return;
    }

    setStep('IMPORTING');
    setImportError(null);

    try {
      const response = await api.post<BulkImportResponse>('medicines/bulk-import', {
        strategy: 'SKIP_EXISTING',
        medicines: newRowsToImport,
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
          maxWidth: step === 'PREVIEW' || step === 'RESULT' ? '980px' : '820px',
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
                Bulk Import Medicines from Excel
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Duplicate-safe bulk upload into the master medicines repository.
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
        <div className="ui-modal-body px-8 py-6 flex flex-col gap-7 overflow-y-auto flex-1 text-slate-700">
          {/* STEP 1: UPLOAD */}
          {step === 'UPLOAD' && (
            <div className="flex flex-col gap-7">
              {/* Template Download Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4.5 rounded-xl bg-teal-50/70 border border-teal-200/80">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className="p-2.5 rounded-xl bg-teal-100/90 text-teal-800 shrink-0">
                    <Download size={18} />
                  </div>
                  <div>
                    <h4 className="text-[13px] font-bold text-slate-900">
                      Standard Medicine Excel Template
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      Download the official template pre-configured with required columns and sample rows.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="px-3.5 py-2 text-xs font-semibold text-teal-700 bg-white hover:bg-teal-50 border border-teal-300 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                >
                  <Download size={13} />
                  Download Template
                </button>
              </div>

              {/* Upload Dropzone or Selected File Box */}
              {!file ? (
                <div
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      fileInputRef.current?.click();
                    }
                  }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border border-dashed rounded-xl py-10 px-6 flex flex-col items-center gap-3 cursor-pointer transition-all ${
                    isDragging
                      ? 'border-teal-500 bg-teal-50/50'
                      : 'border-slate-300 bg-slate-50/50 hover:bg-slate-50/80 hover:border-teal-500'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileChosen(e.target.files[0]);
                      }
                    }}
                  />

                  <div className="w-10 h-10 bg-teal-50 text-teal-700 rounded-full flex items-center justify-center border border-teal-200/60">
                    <UploadCloud size={20} />
                  </div>

                  <p className="text-[13px] font-medium text-slate-800">
                    Drop your Excel file here <span className="font-normal text-slate-500">or click to browse</span>
                  </p>
                  <p className="text-xs text-slate-500">
                    .xlsx / .xls &bull; Max {MAX_FILE_SIZE_MB} MB
                  </p>

                  <div className="mt-2 px-4 py-2 rounded-full border border-slate-200 bg-white text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50">
                    Choose Excel File
                  </div>
                </div>
              ) : (
                <div className="p-4.5 rounded-xl border border-teal-200 bg-teal-50/40 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="p-2.5 rounded-xl bg-teal-100 text-teal-800 shrink-0">
                      <FileSpreadsheet size={22} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-bold text-slate-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatFileSize(file.size)} &bull; Excel Spreadsheet
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setParsingError(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {/* Parsing/Validation Error Message */}
              {parsingError && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
                  <XCircle size={17} className="shrink-0 mt-0.5 text-rose-600" />
                  <div>
                    <strong className="block font-semibold text-rose-950">Validation Error</strong>
                    <span className="mt-0.5 block">{parsingError}</span>
                  </div>
                </div>
              )}

              {/* Categorized Expected Columns Guide */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-[13px] font-semibold text-slate-800 flex items-center gap-2">
                    <Info size={15} className="text-teal-600" /> Expected Excel Columns
                  </h4>
                  <span className="text-xs text-slate-500">15 supported columns</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1.4fr_1.4fr] gap-5">
                  {/* Required Column */}
                  <div className="bg-white rounded-lg border border-slate-200/90 p-4 min-w-0 shadow-2xs flex flex-col">
                    <p className="text-[10px] font-bold text-rose-700 tracking-wider mb-3 uppercase">
                      REQUIRED
                    </p>
                    <div className="space-y-2.5 text-[12.5px] leading-6">
                      <div className="flex items-center gap-1.5 whitespace-nowrap">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="font-semibold text-slate-900">Medicine Name</span>
                        <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 ml-auto">REQ</span>
                      </div>
                    </div>
                  </div>

                  {/* Medicine Details */}
                  <div className="bg-white rounded-lg border border-slate-200/90 p-4 min-w-0 shadow-2xs flex flex-col">
                    <p className="text-[10px] font-bold text-slate-600 tracking-wider mb-3 uppercase">
                      MEDICINE DETAILS
                    </p>
                    <div className="space-y-2.5 text-[12.5px] text-slate-600 leading-6 whitespace-nowrap">
                      <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />Generic Name</div>
                      <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />Strength & Unit</div>
                      <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />Dosage Form</div>
                      <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />Therapeutic Category</div>
                      <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />Sub Category</div>
                      <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />Manufacturer</div>
                    </div>
                  </div>

                  {/* Commercial & Prescription */}
                  <div className="bg-white rounded-lg border border-slate-200/90 p-4 min-w-0 shadow-2xs flex flex-col">
                    <p className="text-[10px] font-bold text-slate-600 tracking-wider mb-3 uppercase">
                      COMMERCIAL / PRESCRIPTION
                    </p>
                    <div className="space-y-2.5 text-[12.5px] text-slate-600 leading-6 whitespace-nowrap">
                      <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />Prescription Required</div>
                      <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />Status (Active/Inactive)</div>
                      <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />Medicine Code / SKU</div>
                      <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />Barcode / EAN</div>
                      <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />MRP & Final Price</div>
                      <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />Discount Type & Value</div>
                      <div className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />Default Frequency & Duration</div>
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
                  <span className="text-[11px] font-semibold text-emerald-800 block">New Medicines</span>
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

              {/* Notice Banner */}
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between shadow-2xs">
                <div className="flex items-center gap-2">
                  <Info size={16} className="text-blue-600 shrink-0" />
                  <span className="leading-relaxed">
                    <strong className="font-semibold text-blue-950">Duplicate-Safe Policy:</strong> Only <strong className="font-bold text-blue-950">{previewResult.newRows} NEW</strong> medicine records will be inserted. Existing database records and duplicate Excel rows will be safely skipped.
                  </span>
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
                    New ({previewResult.newRows})
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
                    Already Exists ({previewResult.alreadyExistingRows})
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
                    Duplicate in Excel ({previewResult.duplicateInExcelRows})
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewFilter('INVALID')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                      previewFilter === 'INVALID'
                        ? 'bg-white shadow-2xs text-rose-700 font-bold'
                        : 'text-slate-600 hover:text-rose-700'
                    }`}
                  >
                    Invalid ({previewResult.invalidRows})
                  </button>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                  <FileSpreadsheet size={14} className="text-slate-400" />
                  <span>File:</span>
                  <span className="font-semibold text-slate-800 truncate max-w-[180px]">{file?.name}</span>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-60 overflow-y-auto bg-white shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 sticky top-0 font-semibold z-10">
                    <tr>
                      <th className="p-2.5 w-12 text-center text-slate-600 uppercase tracking-wider text-[11px] font-bold">Row</th>
                      <th className="p-2.5 text-slate-700 uppercase tracking-wider text-[11px] font-bold">Medicine Name</th>
                      <th className="p-2.5 text-slate-700 uppercase tracking-wider text-[11px] font-bold">Generic Name</th>
                      <th className="p-2.5 text-slate-700 uppercase tracking-wider text-[11px] font-bold">Strength / Form</th>
                      <th className="p-2.5 text-slate-700 uppercase tracking-wider text-[11px] font-bold">Price</th>
                      <th className="p-2.5 text-slate-700 uppercase tracking-wider text-[11px] font-bold">Status & Validation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredPreviewRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                          No rows match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredPreviewRows.map((r) => (
                        <tr
                          key={r.rowNumber}
                          className={
                            r.classification === 'INVALID'
                              ? 'bg-rose-50/40 hover:bg-rose-50/70'
                              : r.classification === 'ALREADY_EXISTS'
                                ? 'bg-amber-50/40 hover:bg-amber-50/70'
                                : r.classification === 'DUPLICATE_IN_EXCEL'
                                  ? 'bg-purple-50/40 hover:bg-purple-50/70'
                                  : 'hover:bg-slate-50'
                          }
                        >
                          <td className="p-2.5 text-center font-mono text-slate-500 font-bold text-xs">
                            {r.rowNumber}
                          </td>
                          <td className="p-2.5 font-bold text-slate-900 text-xs">
                            {r.medicineName ? (
                              r.medicineName
                            ) : (
                              <span className="text-rose-600 italic font-normal">Missing Name</span>
                            )}
                          </td>
                          <td className="p-2.5 font-medium text-slate-700 text-xs">
                            {r.genericName ?? <span className="text-slate-400">—</span>}
                          </td>
                          <td className="p-2.5 text-slate-600 text-xs">
                            {r.strength ? <span className="font-medium text-slate-700">{r.strength}</span> : ''}
                            {r.strength && r.dosageForm ? ' · ' : ''}
                            {r.dosageForm ? <span className="text-slate-600">{r.dosageForm}</span> : ''}
                            {!r.strength && !r.dosageForm && <span className="text-slate-400">—</span>}
                          </td>
                          <td className="p-2.5 font-bold text-slate-800 text-xs">
                            {r.data?.finalPrice !== null && r.data?.finalPrice !== undefined
                              ? `₹${Number(r.data.finalPrice).toFixed(2)}`
                              : r.data?.mrp !== null && r.data?.mrp !== undefined
                                ? `₹${Number(r.data.mrp).toFixed(2)}`
                                : <span className="text-slate-400 font-normal">—</span>}
                          </td>
                          <td className="p-2.5">
                            {r.classification === 'NEW' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 size={11} className="text-emerald-600" /> NEW
                              </span>
                            )}
                            {r.classification === 'ALREADY_EXISTS' && (
                              <div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                  ALREADY EXISTS
                                </span>
                                <div className="text-[10px] font-medium text-amber-800 mt-0.5">
                                  {r.duplicateReason ?? 'Existing database record'}
                                </div>
                              </div>
                            )}
                            {r.classification === 'DUPLICATE_IN_EXCEL' && (
                              <div>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                                  DUPLICATE IN EXCEL
                                </span>
                                <div className="text-[10px] font-medium text-purple-800 mt-0.5">
                                  Duplicate row in file
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
                Importing New Medicines...
              </h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Executing safe bulk database operations with transactional integrity. Duplicate records are skipped.
              </p>
            </div>
          )}

          {/* STEP 4: IMPORT RESULT */}
          {step === 'RESULT' && importResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                <CheckCircle2 size={22} className="text-emerald-600 shrink-0" />
                <div>
                  <h4 className="text-xs font-bold">Import Completed</h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    {importResult.insertedCount} new medicines were imported successfully. No duplicate records were inserted.
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
                  <span className="text-[11px] font-semibold text-emerald-800 block">Successfully Imported</span>
                  <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
                    {importResult.insertedCount}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-amber-300 bg-amber-50/70 shadow-2xs">
                  <span className="text-[11px] font-semibold text-amber-800 block">Already Existing</span>
                  <div className="text-xl font-extrabold text-amber-700 mt-0.5">
                    {importResult.alreadyExistingCount}
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-purple-300 bg-purple-50/70 shadow-2xs">
                  <span className="text-[11px] font-semibold text-purple-800 block">Duplicate Excel Rows</span>
                  <div className="text-xl font-extrabold text-purple-700 mt-0.5">
                    {importResult.duplicateInExcelCount}
                  </div>
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
                      className="text-xs font-semibold text-rose-700 hover:text-rose-800 flex items-center gap-1"
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
                  disabled={!previewResult || previewResult.newRows === 0}
                  className="ui-btn ui-btn-primary flex items-center gap-1.5 font-semibold"
                >
                  <CheckCircle2 size={15} /> Confirm & Import ({previewResult?.newRows ?? 0} New Medicines)
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
