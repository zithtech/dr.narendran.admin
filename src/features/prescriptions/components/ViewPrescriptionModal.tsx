import { App, Modal, Tag } from 'antd';
import {
  Building2,
  Calendar,
  Download,
  FileText,
  FlaskConical,
  MapPin,
  Pencil,
  Phone,
  Pill,
  Printer,
  Stethoscope,
  User,
} from 'lucide-react';
import { useEffect, useState } from 'react';

import { getErrorMessage } from '../../../utils/errors';
import { type Prescription, prescriptionsApi } from '../api/prescriptionsApi';

interface ViewPrescriptionModalProps {
  prescription: Prescription | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (prescription: Prescription) => void;
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

  useEffect(() => {
    setRxData(prescription);
    if (open && prescription?.id) {
      let active = true;
      prescriptionsApi.getById(prescription.id)
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

  const activeRx = rxData || prescription;
  if (!activeRx) return null;

  const handleDownloadPdf = async () => {
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
  };

  const handlePrint = () => {
    const url = prescriptionsApi.getHtmlPreviewUrl(activeRx.id);
    const win = window.open(url, '_blank');
    if (win) {
      win.focus();
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={850}
      style={{ top: 20 }}
      styles={{
        body: {
          maxHeight: 'calc(85vh - 70px)',
          overflowY: 'auto',
          padding: '20px 24px',
        },
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: 8,
                background: '#f0fdf4',
                border: '1px solid #dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a',
              }}
            >
              <FileText size={18} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
                Prescription Details
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                ID: #{activeRx.id.slice(0, 8).toUpperCase()} · Date: {activeRx.prescription_date}
                {activeRx.appointment_id && (
                  <span style={{ marginLeft: 6 }}>
                    · Appt: #{activeRx.appointment_id.slice(0, 8).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <Tag color={activeRx.status === 'active' ? 'green' : 'default'} style={{ textTransform: 'capitalize' }}>
            {activeRx.status}
          </Tag>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {activeRx.status === 'active' && onEdit && (
              <button
                type="button"
                className="ui-btn"
                onClick={() => {
                  onClose();
                  onEdit(activeRx);
                }}
                style={{
                  fontSize: 12.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#7c3aed',
                  borderColor: '#ddd6fe',
                  background: '#f5f3ff',
                }}
              >
                <Pencil size={13} /> Edit Prescription
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="ui-btn"
              onClick={handlePrint}
              style={{ fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Printer size={13} /> Print
            </button>
            <button
              type="button"
              className="ui-btn ui-btn-primary"
              onClick={() => {
                void handleDownloadPdf();
              }}
              disabled={downloadingPdf}
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                background: '#7c3aed',
                borderColor: '#7c3aed',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                opacity: downloadingPdf ? 0.7 : 1,
                cursor: downloadingPdf ? 'not-allowed' : 'pointer',
              }}
            >
              <Download size={13} /> {downloadingPdf ? 'Downloading...' : 'Download PDF'}
            </button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Doctor & Patient Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {/* Doctor Header */}
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#7c3aed', marginBottom: 4 }}>
              <Stethoscope size={15} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Prescribed By
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              {activeRx.doctor?.name || 'Dr. Narendran'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {activeRx.doctor?.specialization || activeRx.doctor?.specialty || 'General Medicine'}
            </div>
          </div>

          {/* Patient Header */}
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              background: '#f8fafc',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0284c7' }}>
                <User size={15} />
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Patient
                </span>
              </div>
              {activeRx.patient_id && (
                <Tag color="blue" style={{ margin: 0, fontSize: 10, lineHeight: '18px' }}>
                  ID: #{String(activeRx.patient_id).slice(0, 8).toUpperCase()}
                </Tag>
              )}
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              {activeRx.patient_name || 'Patient'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              {activeRx.patient_gender && (
                <span style={{ textTransform: 'capitalize', background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                  {activeRx.patient_gender}
                </span>
              )}
              {activeRx.patient_phone && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Phone size={11} style={{ color: '#0284c7' }} />
                  {activeRx.patient_phone}
                </span>
              )}
              {activeRx.patient_dob && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={11} style={{ color: '#64748b' }} />
                  DOB: {activeRx.patient_dob}
                </span>
              )}
              {!activeRx.patient_phone && !activeRx.patient_gender && !activeRx.patient_dob && (
                <span>No contact details recorded</span>
              )}
            </div>
          </div>
        </div>

        {/* Diagnosis & Clinical Notes */}
        <div style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
            Diagnosis & Clinical Impression
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
            {activeRx.diagnosis || activeRx.additional_notes || 'General Consultation'}
          </div>
          {activeRx.additional_notes && activeRx.additional_notes !== activeRx.diagnosis && (
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
              {activeRx.additional_notes}
            </div>
          )}
        </div>

        {/* Medicines Table */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <div
            style={{
              padding: '10px 14px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Pill size={15} style={{ color: '#7c3aed' }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
              Prescribed Medicines ({activeRx.medicines?.length || 0})
            </span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: '#fafafa', borderBottom: '1px solid #f1f5f9', color: '#64748b', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px', width: 30 }}>#</th>
                <th style={{ padding: '8px 12px' }}>Medicine & Strength</th>
                <th style={{ padding: '8px 12px' }}>Dosage</th>
                <th style={{ padding: '8px 12px' }}>Frequency</th>
                <th style={{ padding: '8px 12px' }}>Duration</th>
                <th style={{ padding: '8px 12px' }}>Timing</th>
                <th style={{ padding: '8px 12px' }}>Qty</th>
              </tr>
            </thead>
            <tbody>
              {activeRx.medicines?.map((m, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '10px 12px', color: '#94a3b8', verticalAlign: 'top' }}>{idx + 1}</td>
                  <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 650, color: '#0f172a' }}>{m.medicine_name}</div>
                    {m.generic_name && (
                      <div style={{ fontSize: 11, color: '#475569' }}>
                        Generic: {m.generic_name}
                      </div>
                    )}
                    {(m.strength || m.dosage_form) && (
                      <div style={{ fontSize: 11, color: '#64748b' }}>
                        {[m.dosage_form, m.strength].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    {m.instructions && (
                      <div style={{ fontSize: 11, color: '#7c3aed', fontStyle: 'italic', marginTop: 2 }}>
                        Note: {m.instructions}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>{m.dosage || '1 Tablet'}</td>
                  <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                    <span
                      style={{
                        padding: '2px 7px',
                        borderRadius: 4,
                        background: '#f5f3ff',
                        color: '#6d28d9',
                        fontWeight: 600,
                        fontSize: 11.5,
                      }}
                    >
                      {m.frequency || '1-0-1'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>{m.duration || '5 Days'}</td>
                  <td style={{ padding: '10px 12px', verticalAlign: 'top', color: '#475569' }}>
                    {m.food_instruction || 'After Food'}
                  </td>
                  <td style={{ padding: '10px 12px', verticalAlign: 'top', fontWeight: 600 }}>
                    {m.prescribed_quantity || 1}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recommended Lab Tests (if any) */}
        {activeRx.lab_tests && activeRx.lab_tests.length > 0 && (
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            <div
              style={{
                padding: '10px 14px',
                background: '#f0f9ff',
                borderBottom: '1px solid #e0f2fe',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <FlaskConical size={15} style={{ color: '#0284c7' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>
                Recommended Diagnostic Investigations ({activeRx.lab_tests.length})
              </span>
            </div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {activeRx.lab_tests.map((lt, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    fontSize: 12.5,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                    <div>
                      <span style={{ fontWeight: 650, color: '#0f172a' }}>{lt.test_name}</span>
                      {lt.instructions && (
                        <span style={{ fontSize: 11.5, color: '#64748b', marginLeft: 8 }}>
                          · Prep: <em>{lt.instructions}</em>
                        </span>
                      )}
                    </div>
                    {lt.lab_name && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: 11,
                          color: '#0284c7',
                          background: '#e0f2fe',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontWeight: 600,
                        }}
                      >
                        <Building2 size={12} />
                        Linked Lab: {lt.lab_name}
                      </span>
                    )}
                  </div>

                  {(lt.lab_phone || lt.lab_address || lt.lab_city) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#64748b' }}>
                      {(lt.lab_address || lt.lab_city) && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <MapPin size={11} style={{ color: '#94a3b8' }} />
                          {[lt.lab_address, lt.lab_city].filter(Boolean).join(', ')}
                        </span>
                      )}
                      {lt.lab_phone && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                          <Phone size={11} style={{ color: '#94a3b8' }} />
                          {lt.lab_phone}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up info */}
        {activeRx.follow_up_date && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              background: '#fefce8',
              border: '1px solid #fef08a',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 12.5,
              color: '#854d0e',
            }}
          >
            <Calendar size={15} />
            <span>
              Follow-up Scheduled On:{' '}
              <strong>{activeRx.follow_up_date}</strong>
              {activeRx.follow_up_days ? ` (${activeRx.follow_up_days} days)` : ''}
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}
