import { Drawer, Tag } from 'antd';
import {
  Calendar,
  Package,
  Pencil,
  Pill,
  Stethoscope,
} from 'lucide-react';
import { useEffect, useRef } from 'react';

import type { MedicinePackage } from '../types/pharmacy';

interface ViewPackageModalProps {
  pkg: MedicinePackage | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (pkg: MedicinePackage) => void;
}

export default function ViewPackageModal({
  pkg,
  open,
  onClose,
  onEdit,
}: ViewPackageModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [open, pkg]);

  if (!pkg) return null;

  const medicines = pkg.medicines || [];

  // Calculate pricing summaries
  const totalMrp = medicines.reduce((acc, m) => acc + (Number(m.mrp) || 0), 0);
  const totalFinalPrice = medicines.reduce((acc, m) => acc + (Number(m.final_price) || Number(m.mrp) || 0), 0);

  const formattedCreatedDate = pkg.created_at
    ? new Date(pkg.created_at).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width="min(1080px, 94vw)"
      destroyOnClose
      styles={{
        header: {
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          background: '#ffffff',
        },
        body: {
          padding: '20px 24px 36px 24px',
          background: '#f8fafc',
          overflowY: 'auto',
        },
        footer: {
          padding: '14px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#ffffff',
        },
      }}
      title={
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: '#f5f3ff',
                border: '1px solid #ddd6fe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#7c3aed',
              }}
            >
              <Package size={20} />
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#0f172a', lineHeight: 1.3 }}>
                {pkg.name}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                <span>ID: #{pkg.id.slice(0, 8).toUpperCase()}</span>
                <span>•</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={12} /> {formattedCreatedDate}
                </span>
                {pkg.doctor_name && (
                  <>
                    <span>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#7c3aed' }}>
                      <Stethoscope size={12} /> Dr. {pkg.doctor_name.replace(/^Dr\.\s*/i, '')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <Tag color="purple" style={{ fontWeight: 600, fontSize: 12, padding: '2px 10px', borderRadius: 6 }}>
            {medicines.length} {medicines.length === 1 ? 'Medicine' : 'Medicines'}
          </Tag>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {medicines.length} item(s) grouped under this package
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {onEdit && (
              <button
                type="button"
                className="ui-btn"
                onClick={() => {
                  onClose();
                  onEdit(pkg);
                }}
                style={{
                  fontSize: 12.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#7c3aed',
                  borderColor: '#ddd6fe',
                  background: '#f5f3ff',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Pencil size={13} /> Edit Package
              </button>
            )}
            <button
              type="button"
              className="ui-btn"
              onClick={onClose}
              style={{ fontSize: 12.5, cursor: 'pointer' }}
            >
              Close
            </button>
          </div>
        </div>
      }
    >
      <div
        ref={scrollRef}
        className="package-modal-scroll"
        style={{
          maxHeight: 'calc(85vh - 70px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '20px 24px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
        }}
      >
        <style>{`
          .package-modal-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .package-modal-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .package-modal-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
          }
          .package-modal-scroll::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>
        {/* Description Callout */}
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: 0.5, marginBottom: 4 }}>
            Package Description
          </div>
          <div style={{ fontSize: 13.5, color: pkg.description ? '#1e293b' : '#94a3b8', lineHeight: 1.5 }}>
            {pkg.description || 'No description provided for this package.'}
          </div>
        </div>

        {/* Quick Highlights Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <div style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #e0e7ff', background: '#eef2ff' }}>
            <div style={{ fontSize: 11, fontWeight: 650, color: '#4338ca', textTransform: 'uppercase' }}>
              Total Medicines
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#312e81', marginTop: 2 }}>
              {medicines.length}
            </div>
          </div>

          <div style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #dcfce7', background: '#f0fdf4' }}>
            <div style={{ fontSize: 11, fontWeight: 650, color: '#15803d', textTransform: 'uppercase' }}>
              Package Final Value
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#14532d', marginTop: 2 }}>
              {totalFinalPrice > 0 ? `₹${totalFinalPrice.toFixed(2)}` : '—'}
            </div>
          </div>

          <div style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #f1f5f9', background: '#ffffff' }}>
            <div style={{ fontSize: 11, fontWeight: 650, color: '#64748b', textTransform: 'uppercase' }}>
              Total MRP
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginTop: 2 }}>
              {totalMrp > 0 ? `₹${totalMrp.toFixed(2)}` : '—'}
            </div>
          </div>
        </div>

        {/* Included Medicines Table */}
        <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
          <div
            style={{
              padding: '10px 16px',
              background: '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Pill size={16} style={{ color: '#7c3aed' }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                Included Medicines ({medicines.length})
              </span>
            </div>
            <span style={{ fontSize: 11.5, color: '#64748b' }}>
              Linked directly from the Pharmacy module
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#fafafa', borderBottom: '1px solid #f1f5f9', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '9px 12px', width: 35 }}>#</th>
                  <th style={{ padding: '9px 12px' }}>Medicine Name</th>
                  <th style={{ padding: '9px 12px' }}>Brand / Manufacturer</th>
                  <th style={{ padding: '9px 12px' }}>Category</th>
                  <th style={{ padding: '9px 12px' }}>Form & Strength</th>
                  <th style={{ padding: '9px 12px' }}>Price (₹)</th>
                  <th style={{ padding: '9px 12px' }}>Rx / OTC</th>
                  <th style={{ padding: '9px 12px', textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((m, idx) => {
                  const strengthDisplay = [m.strength, m.strength_unit].filter(Boolean).join(' ');
                  const categoryDisplay = [m.therapeutic_category, m.sub_category].filter(Boolean).join(' · ');
                  return (
                    <tr
                      key={m.id || idx}
                      style={{
                        borderBottom: '1px solid #f8fafc',
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                      }}
                    >
                      <td style={{ padding: '10px 12px', color: '#94a3b8', verticalAlign: 'middle' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 650, color: '#0f172a' }}>{m.medicine_name}</div>
                        {m.generic_name && (
                          <div style={{ fontSize: 11, color: '#64748b' }}>
                            Generic: {m.generic_name}
                          </div>
                        )}
                        {m.medicine_code && (
                          <div style={{ fontSize: 10.5, color: '#94a3b8', fontFamily: 'monospace' }}>
                            Code: {m.medicine_code}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', verticalAlign: 'middle', color: '#334155' }}>
                        {m.manufacturer || <span style={{ color: '#cbd5e1' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 12px', verticalAlign: 'middle', color: '#475569' }}>
                        {categoryDisplay || <span style={{ color: '#cbd5e1' }}>General</span>}
                      </td>
                      <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>
                          {m.dosage_form || 'Tablet'}
                        </div>
                        {strengthDisplay && (
                          <div style={{ fontSize: 11, color: '#6d28d9', fontWeight: 500 }}>
                            {strengthDisplay}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                        {m.final_price != null ? (
                          <div>
                            <span style={{ fontWeight: 650, color: '#0f172a' }}>₹{Number(m.final_price).toFixed(2)}</span>
                            {m.mrp != null && Number(m.mrp) > Number(m.final_price) && (
                              <span style={{ fontSize: 11, color: '#94a3b8', textDecoration: 'line-through', marginLeft: 4 }}>
                                ₹{Number(m.mrp).toFixed(2)}
                              </span>
                            )}
                          </div>
                        ) : m.mrp != null ? (
                          <span style={{ fontWeight: 600, color: '#0f172a' }}>₹{Number(m.mrp).toFixed(2)}</span>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', verticalAlign: 'middle' }}>
                        {m.prescription_required ? (
                          <Tag color="orange" style={{ fontSize: 11, margin: 0 }}>
                            Rx Required
                          </Tag>
                        ) : (
                          <Tag color="green" style={{ fontSize: 11, margin: 0 }}>
                            OTC
                          </Tag>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                        <Tag
                          color={m.status === 'Active' ? 'cyan' : 'default'}
                          style={{ fontSize: 11, margin: 0 }}
                        >
                          {m.status || 'Active'}
                        </Tag>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Drawer>
  );
}

export const ViewPackageDrawer = ViewPackageModal;
