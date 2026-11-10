import { Modal, Tag } from 'antd';
import {
  Calendar,
  Download,
  FileText,
  FlaskConical,
  Pencil,
  Pill,
  Printer,
  Stethoscope,
  User,
} from 'lucide-react';

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
  if (!prescription) return null;

  const handleDownloadPdf = () => {
    const url = prescriptionsApi.getPdfDownloadUrl(prescription.id);
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    const url = prescriptionsApi.getHtmlPreviewUrl(prescription.id);
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
                ID: #{prescription.id.slice(0, 8).toUpperCase()} · Date: {prescription.prescription_date}
              </div>
            </div>
          </div>
          <Tag color={prescription.status === 'active' ? 'green' : 'default'} style={{ textTransform: 'capitalize' }}>
            {prescription.status}
          </Tag>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {prescription.status === 'active' && onEdit && (
              <button
                type="button"
                className="ui-btn"
                onClick={() => {
                  onClose();
                  onEdit(prescription);
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
              onClick={handleDownloadPdf}
              style={{
                fontSize: 12.5,
                fontWeight: 600,
                background: '#7c3aed',
                borderColor: '#7c3aed',
                color: '#ffffff',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Download size={13} /> Download PDF
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
              {prescription.doctor?.name || 'Dr. Narendran'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {prescription.doctor?.specialization || prescription.doctor?.specialty || 'General Medicine'}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#0284c7', marginBottom: 4 }}>
              <User size={15} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Patient
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              {prescription.patient_name || 'Patient'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b' }}>
              {[prescription.patient_gender, prescription.patient_phone].filter(Boolean).join(' · ')}
            </div>
          </div>
        </div>

        {/* Diagnosis & Clinical Notes */}
        <div style={{ padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', background: '#ffffff' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
            Diagnosis & Clinical Impression
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
            {prescription.diagnosis || prescription.additional_notes || 'General Consultation'}
          </div>
          {prescription.additional_notes && prescription.additional_notes !== prescription.diagnosis && (
            <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
              {prescription.additional_notes}
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
              Prescribed Medicines ({prescription.medicines?.length || 0})
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
              {prescription.medicines?.map((m, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #f8fafc' }}>
                  <td style={{ padding: '10px 12px', color: '#94a3b8', verticalAlign: 'top' }}>{idx + 1}</td>
                  <td style={{ padding: '10px 12px', verticalAlign: 'top' }}>
                    <div style={{ fontWeight: 650, color: '#0f172a' }}>{m.medicine_name}</div>
                    {m.strength && <div style={{ fontSize: 11, color: '#64748b' }}>Strength: {m.strength}</div>}
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
        {prescription.lab_tests && prescription.lab_tests.length > 0 && (
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
                Recommended Diagnostic Investigations ({prescription.lab_tests.length})
              </span>
            </div>
            <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {prescription.lab_tests.map((lt, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: 6,
                    background: '#f8fafc',
                    fontSize: 12.5,
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{lt.test_name}</span>
                    {lt.instructions && (
                      <span style={{ fontSize: 11, color: '#64748b', marginLeft: 8 }}>
                        ({lt.instructions})
                      </span>
                    )}
                  </div>
                  {lt.lab_name && (
                    <span style={{ fontSize: 11, color: '#0284c7', background: '#e0f2fe', padding: '2px 6px', borderRadius: 4 }}>
                      Lab: {lt.lab_name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Follow-up info */}
        {prescription.follow_up_date && (
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
              <strong>{prescription.follow_up_date}</strong>
              {prescription.follow_up_days ? ` (${prescription.follow_up_days} days)` : ''}
            </span>
          </div>
        )}
      </div>
    </Modal>
  );
}
