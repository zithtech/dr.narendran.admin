import { Button, message, Spin } from 'antd';
import { Download, FileText, Printer, Sparkles, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import type { Patient } from '../../../components/PatientModal';
import api from '../../../utils/api';
import { medicalHistoryApi } from '../services/medicalHistoryApi';
import type { PatientMedicalHistoryRecord } from '../types/medicalHistory.types';
import { generatePatientSummaryHtml } from '../utils/patientSummaryPdfGenerator';
import { prescriptionsApi, type Prescription } from '../../prescriptions/api/prescriptionsApi';

interface PatientSummaryPdfModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient;
  medicalRecord?: PatientMedicalHistoryRecord | null | undefined;
  prescriptions?: Prescription[] | undefined;
}

export const PatientSummaryPdfModal: React.FC<PatientSummaryPdfModalProps> = ({
  isOpen,
  onClose,
  patient,
  medicalRecord: initialRecord,
  prescriptions: initialPrescriptions,
}) => {
  const [record, setRecord] = useState<PatientMedicalHistoryRecord | null>(initialRecord || null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(initialPrescriptions || []);
  const [loading, setLoading] = useState<boolean>(false);
  const [downloadingPdf, setDownloadingPdf] = useState<boolean>(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (initialRecord) {
      setRecord(initialRecord);
    }
    if (initialPrescriptions) {
      setPrescriptions(initialPrescriptions);
    }

    let isCancelled = false;

    const fetchData = async () => {
      setLoading(true);
      try {
        const promises: Promise<any>[] = [];

        // Fetch medical record if not provided
        if (!initialRecord) {
          promises.push(
            medicalHistoryApi.getHistories(patient.id).catch((err) => {
              console.error('Failed to fetch patient history for PDF:', err);
              return [];
            })
          );
        } else {
          promises.push(Promise.resolve(null));
        }

        // Fetch prescriptions if not provided
        if (!initialPrescriptions || initialPrescriptions.length === 0) {
          promises.push(
            prescriptionsApi.getByPatient(patient.id).catch(async (err) => {
              console.warn('getByPatient failed, trying getAll fallback:', err);
              try {
                return await prescriptionsApi.getAll({ patient_id: patient.id });
              } catch {
                return [];
              }
            })
          );
        } else {
          promises.push(Promise.resolve(null));
        }

        const [historyData, rxData] = await Promise.all(promises);

        if (!isCancelled) {
          if (historyData && Array.isArray(historyData) && historyData.length > 0 && historyData[0]) {
            setRecord(historyData[0]);
          }

          if (rxData && Array.isArray(rxData)) {
            if (rxData.length === 0) {
              // Try fallback to getAll if getByPatient was empty
              try {
                const fallbackRx = await prescriptionsApi.getAll({ patient_id: patient.id });
                if (!isCancelled && Array.isArray(fallbackRx) && fallbackRx.length > 0) {
                  setPrescriptions(fallbackRx);
                }
              } catch (e) {
                console.error('Fallback getAll failed:', e);
              }
            } else {
              setPrescriptions(rxData);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load data for patient summary PDF:', err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, patient.id, initialRecord, initialPrescriptions]);

  const htmlContent = useMemo(() => {
    if (!isOpen) return '';
    return generatePatientSummaryHtml({
      patient,
      medicalRecord: record,
      prescriptions,
    });
  }, [isOpen, patient, record, prescriptions]);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
      return;
    }

    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Please allow popups to print / save the patient record as PDF.');
      return;
    }
    printWin.document.write(htmlContent);
    printWin.document.close();
    printWin.onload = () => {
      printWin.focus();
      printWin.print();
    };
  };

  const handleDownloadPdf = async () => {
    const filename = `Clinical_Dossier_${patient.patient_id || patient.id.slice(0, 8).toUpperCase()}_${patient.name.replace(/\s+/g, '_')}.pdf`;

    setDownloadingPdf(true);
    const hideLoading = message.loading('Generating & downloading PDF dossier...', 0);
    try {
      const res = await api.post(
        '/prescriptions/render-pdf',
        {
          html: htmlContent,
          filename,
        },
        { responseType: 'blob' },
      );

      const blob =
        res.data instanceof Blob
          ? res.data
          : new Blob([res.data], { type: 'application/pdf' });
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 1000);
      message.success('Clinical Dossier PDF downloaded successfully.');
    } catch (err: any) {
      console.error('Failed to download clinical PDF:', err);
      const errorMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to download clinical dossier PDF. Please try again.';
      message.error(errorMsg);
    } finally {
      hideLoading();
      setDownloadingPdf(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/75 backdrop-blur-sm"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1050,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        style={{
          width: '96vw',
          maxWidth: '1060px',
          height: '94vh',
          backgroundColor: '#ffffff',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
        }}
      >
        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
                color: '#67358f',
                border: '1px solid #c4b5fd',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 15.5, fontWeight: 700, color: '#0f172a' }}>
                  Patient Clinical Record Dossier
                </h3>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    background: '#f5f3ff',
                    color: '#67358f',
                    border: '1px solid #ddd6fe',
                  }}
                >
                  <Sparkles size={11} />
                  <span>Prescription Letterhead Layout</span>
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {patient.name} · UHID: {patient.patient_id || patient.id.slice(0, 8).toUpperCase()} · Full Medical History, Vitals &amp; Management Plan
              </div>
            </div>
          </div>

          {/* Action Buttons: Keep ONLY Print and Download PDF */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button
              icon={<Printer size={14} />}
              onClick={handlePrint}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontWeight: 600,
                fontSize: 12.5,
                borderColor: '#cbd5e1',
                color: '#334155',
              }}
            >
              Print
            </Button>

            <Button
              type="primary"
              icon={<Download size={14} />}
              onClick={handleDownloadPdf}
              loading={downloadingPdf}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                backgroundColor: '#67358f',
                borderColor: '#67358f',
                fontWeight: 600,
                fontSize: 12.5,
                boxShadow: '0 2px 8px rgba(103, 53, 143, 0.25)',
              }}
            >
              {downloadingPdf ? 'Downloading PDF...' : 'Download PDF'}
            </Button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: 8,
                color: '#64748b',
                display: 'grid',
                placeItems: 'center',
                marginLeft: 4,
              }}
              title="Close Preview"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Iframe Body Canvas with generous margins on sides */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#e2e8f0',
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
          }}
        >
          {loading ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                gap: 12,
                color: '#475569',
              }}
            >
              <Spin size="large" />
              <span style={{ fontSize: 13, fontWeight: 500 }}>
                Compiling clinical record &amp; prescription letterhead...
              </span>
            </div>
          ) : (
            <div
              style={{
                width: '100%',
                maxWidth: '900px',
                backgroundColor: '#ffffff',
                boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                overflow: 'hidden',
                margin: '0 auto',
              }}
            >
              <iframe
                ref={iframeRef}
                title="Patient Dossier PDF Preview"
                srcDoc={htmlContent}
                style={{
                  width: '100%',
                  minHeight: '1050px',
                  height: '80vh',
                  border: 'none',
                  display: 'block',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PatientSummaryPdfModal;
