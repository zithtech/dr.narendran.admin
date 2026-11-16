import { App, Drawer } from 'antd';
import {
  Calendar,
  Download,
  FileCheck,
  FileText,
  Pencil,
  Printer,
  Stethoscope,
  User,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { StatusPill } from '../../../components/ui/CommonTable';
import { titleCase } from '../../../lib/format';
import api from '../../../utils/api';
import { getErrorMessage } from '../../../utils/errors';
import { type Prescription, prescriptionsApi } from '../api/prescriptionsApi';
import {
  STANDARD_PRESCRIPTION_TEMPLATE_HTML,
} from '../templates/templateData';
import type { LetterPadDataContext } from '../types/template';
import { resolvePrescriptionTemplate } from '../utils/resolvePrescriptionTemplate';

interface ViewPrescriptionModalProps {
  prescription: Prescription | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (prescription: Prescription) => void;
}

function computeAge(dobStr?: string): string {
  if (!dobStr) return '';
  try {
    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) return '';
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
      age--;
    }
    return age > 0 ? `${age} Years` : '1 Year';
  } catch {
    return '';
  }
}

function buildDataContext(rx: Prescription): LetterPadDataContext {
  const patientAge = computeAge(rx.patient_dob);

  return {
    hospital: {
      name: 'Annaamalai Cancer Center',
      address:
        'No. 18, Kottivakkam Kuppam Rd, Thiruvalluvar Nagar, Thiruvanmiyur, Chennai, Tamil Nadu - 600 041.',
      phone: '+91 84380 56883',
      email: 'narenonco@gmail.com',
      website: 'www.drnarendranoncologist.com',
    },
    branch: {
      name: 'Chennai Center',
      address: 'Thiruvanmiyur, Chennai',
      phone: '+91 84380 56883',
    },
    doctor: {
      name: rx.doctor?.name || 'Dr. S. Narendran',
      qualification: 'M.D (RT)',
      specialization:
        rx.doctor?.specialization || rx.doctor?.specialty || 'Consultant Oncologist.',
      medical_registration_number: '106226',
      phone: '+91 84380 56883',
      email: 'narenonco@gmail.com',
    },
    patient: {
      name: rx.patient_name || 'Patient',
      patient_id: rx.patient_id ? String(rx.patient_id).slice(0, 8).toUpperCase() : '',
      phone: rx.patient_phone || '',
      gender: rx.patient_gender || '',
      date_of_birth: rx.patient_dob || '',
      age: patientAge || '—',
    },
    prescription: {
      prescription_id: rx.id ? String(rx.id).slice(0, 8).toUpperCase() : '',
      prescription_date: rx.prescription_date,
      ...(rx.appointment_id
        ? { appointment_id: String(rx.appointment_id).slice(0, 8).toUpperCase() }
        : {}),
      diagnosis: rx.diagnosis || rx.additional_notes || '',
      additional_notes: rx.additional_notes || '',
      ...(rx.follow_up_days !== null && rx.follow_up_days !== undefined
        ? { follow_up_days: Number(rx.follow_up_days) }
        : {}),
      ...(rx.follow_up_date ? { follow_up_date: rx.follow_up_date } : {}),
      medicines: (rx.medicines || []).map((m) => ({
        name: m.medicine_name,
        ...(m.dosage ? { dosage: m.dosage } : {}),
        ...(m.strength ? { strength: m.strength } : {}),
        ...(m.frequency ? { frequency: m.frequency } : {}),
        ...(m.duration ? { duration: m.duration } : {}),
        ...(m.food_instruction
          ? { mealTiming: m.food_instruction, food_instruction: m.food_instruction }
          : {}),
        ...(m.instructions ? { instructions: m.instructions } : {}),
      })),
      lab_tests: (rx.lab_tests || []).map((l) => ({
        testName: l.test_name,
        ...(l.instructions ? { instructions: l.instructions } : {}),
      })),
    },
  };
}

export default function ViewPrescriptionModal({
  prescription,
  open,
  onClose,
  onEdit,
}: ViewPrescriptionModalProps) {
  const { message } = App.useApp();
  const [rxData, setRxData] = useState<Prescription | null>(prescription);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [iframeHeight, setIframeHeight] = useState<number>(1150);
  const [activeTemplateHtml, setActiveTemplateHtml] = useState<string>(
    STANDARD_PRESCRIPTION_TEMPLATE_HTML,
  );
  const [backendHtml, setBackendHtml] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  // Fetch full details if only brief item was provided
  useEffect(() => {
    setRxData(prescription);
    if (open && prescription?.id) {
      let active = true;
      prescriptionsApi
        .getById(prescription.id)
        .then((fullRx) => {
          if (active && fullRx) {
            setRxData(fullRx);
          }
        })
        .catch(() => {
          // Keep current fallback data
        });
      return () => {
        active = false;
      };
    }
  }, [open, prescription]);

  // Fetch active prescription template from server (if configured/customized)
  useEffect(() => {
    if (open) {
      let active = true;
      try {
        const promise = api?.get?.('prescription-templates/active');
        if (promise && typeof promise.then === 'function') {
          promise
            .then((res) => {
              if (active && res?.data?.html_content) {
                setActiveTemplateHtml(res.data.html_content);
              }
            })
            .catch(() => {
              // Fall back to built-in template
            });
        }
      } catch {
        // Fall back to built-in template
      }
      return () => {
        active = false;
      };
    }
  }, [open]);

  // Attempt to fetch exact HTML generated by backend for 1:1 parity with server Puppeteer
  useEffect(() => {
    setBackendHtml(null);
    if (open && prescription?.id) {
      let active = true;
      try {
        const promise = api?.get?.<string>(
          `/prescriptions/${prescription.id}/html`,
          { responseType: 'text' },
        );
        if (promise && typeof promise.then === 'function') {
          promise
            .then((res) => {
              if (
                active &&
                typeof res?.data === 'string' &&
                res.data.includes('<html')
              ) {
                setBackendHtml(res.data);
              }
            })
            .catch(() => {
              // Client template resolver will be used as primary fallback
            });
        }
      } catch {
        // Client template resolver will be used as primary fallback
      }
      return () => {
        active = false;
      };
    }
  }, [open, prescription?.id]);

  const activeRx = rxData || prescription;

  // Resolve template HTML
  const renderedHtml = useMemo(() => {
    if (backendHtml) return backendHtml;
    if (!activeRx) return '';
    const context = buildDataContext(activeRx);
    const resolved = resolvePrescriptionTemplate(
      activeTemplateHtml || STANDARD_PRESCRIPTION_TEMPLATE_HTML,
      context,
    );
    return resolved.renderedHtml;
  }, [backendHtml, activeRx, activeTemplateHtml]);

  const handleDownloadPdf = useCallback(async () => {
    if (!activeRx) return;
    setDownloadingPdf(true);
    const hideLoading = message.loading('Downloading prescription PDF...', 0);
    try {
      await prescriptionsApi.downloadPdf(activeRx.id);
    } catch (err: unknown) {
      message.error(getErrorMessage(err, 'Failed to download prescription PDF.'));
    } finally {
      hideLoading();
      setDownloadingPdf(false);
    }
  }, [activeRx, message]);

  const handlePrint = useCallback(() => {
    if (!activeRx) return;
    if (iframeRef.current?.contentWindow) {
      try {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
        return;
      } catch {
        // Fallback below
      }
    }
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(renderedHtml);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    }
  }, [activeRx, renderedHtml]);

  const handleIframeLoad = () => {
    try {
      if (iframeRef.current?.contentWindow?.document?.body) {
        const body = iframeRef.current.contentWindow.document.body;
        const html = iframeRef.current.contentWindow.document.documentElement;
        const docHeight = Math.max(
          body.scrollHeight,
          body.offsetHeight,
          html.clientHeight,
          html.scrollHeight,
          html.offsetHeight,
        );
        if (docHeight > 300) {
          setIframeHeight(docHeight + 30);
        }
      }
    } catch {
      // Fallback
    }
  };

  if (!activeRx) return null;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="min(1000px, 96vw)"
      destroyOnHidden
      styles={{
        header: {
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          background: '#ffffff',
        },
        body: {
          padding: '18px 24px 32px 24px',
          background: '#f1f5f9',
          overflowY: 'auto',
        },
        footer: {
          padding: '14px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
        },
      }}
      title={
        <div className="flex items-center justify-between pr-4 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0 shadow-2xs">
              <FileText size={20} />
            </div>
            <div>
              <div className="text-[16px] font-bold text-slate-900 leading-snug">
                Prescription Preview
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5 font-normal flex-wrap">
                <span className="font-mono font-bold text-blue-600">
                  #{activeRx.id.slice(0, 8).toUpperCase()}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} className="text-slate-400" />
                  {activeRx.prescription_date}
                </span>
                {activeRx.patient_name && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                      <User size={12} className="text-slate-400" />
                      {activeRx.patient_name}
                    </span>
                  </>
                )}
                {activeRx.doctor?.name && (
                  <>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1 text-slate-600">
                      <Stethoscope size={12} className="text-slate-400" />
                      {activeRx.doctor.name}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <StatusPill
            label={titleCase(activeRx.status)}
            tone={
              activeRx.status === 'active'
                ? 'green'
                : activeRx.status === 'completed'
                  ? 'blue'
                  : activeRx.status === 'cancelled'
                    ? 'red'
                    : 'gray'
            }
          />
        </div>
      }
      footer={
        <div className="flex items-center justify-between w-full">
          <div>
            {activeRx.status === 'active' && onEdit && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                onClick={() => {
                  onClose();
                  onEdit(activeRx);
                }}
              >
                <Pencil size={13} /> Edit Prescription
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
              onClick={onClose}
            >
              Close
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg transition-colors cursor-pointer"
              onClick={handlePrint}
            >
              <Printer size={13} /> Print
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 border border-blue-600 rounded-lg shadow-2xs transition-colors cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              onClick={() => {
                void handleDownloadPdf();
              }}
              disabled={downloadingPdf}
            >
              <Download size={13} /> {downloadingPdf ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col items-center justify-start w-full">
        {/* Paper Container Header Ribbon */}
        <div className="w-full max-w-[820px] mb-3 flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
              <FileCheck size={13} className="text-blue-600" />
              Official A4 Letterhead Preview
            </span>
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
              Exact replica of downloaded PDF
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
              title="Print letterhead"
            >
              <Printer size={12} />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={() => {
                void handleDownloadPdf();
              }}
              disabled={downloadingPdf}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
              title="Download PDF"
            >
              <Download size={12} />
              <span>{downloadingPdf ? 'Downloading...' : 'PDF'}</span>
            </button>
          </div>
        </div>

        {/* Realistic A4 Document Paper Canvas */}
        <div className="w-full flex justify-center items-start">
          <div className="w-full max-w-[820px] bg-white rounded-lg shadow-xl border border-slate-300/80 overflow-hidden transition-all duration-200">
            <iframe
              ref={iframeRef}
              title="Prescription PDF Preview"
              srcDoc={renderedHtml}
              className="w-full border-none block"
              style={{
                width: '100%',
                height: `${iframeHeight}px`,
                minHeight: '1150px',
              }}
              onLoad={handleIframeLoad}
            />
          </div>
        </div>
      </div>
    </Drawer>
  );
}

export { ViewPrescriptionModal as ViewPrescriptionDrawer };
