import {
  Activity,
  AlertCircle,
  Check,
  FlaskConical,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import api from '../utils/api';
import { getErrorMessage } from '../utils/errors';
import { Modal } from './ui/Modal';

export interface LabService {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
  updated_at: string;
}

interface LabServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  service: LabService | null;
  onSave: () => void;
}

export default function LabServiceModal({
  isOpen,
  onClose,
  service,
  onSave,
}: LabServiceModalProps) {
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (service) {
      setName(service.name || '');
      setStatus(service.status || 'ACTIVE');
    } else {
      setName('');
      setStatus('ACTIVE');
    }
    setError('');
  }, [service, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Service name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const url = service ? `lab-services/${service.id}` : `lab-services`;
      const method = service ? 'PUT' : 'POST';

      await api({
        method,
        url,
        data: {
          name: name.trim(),
          status,
        },
      });

      onSave();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to save diagnostic service.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={isOpen}
      onClose={loading ? () => undefined : onClose}
      variant="drawer"
      size="md"
      className="service-drawer-modal"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%)',
              color: '#7c3aed',
              border: '1px solid #c4b5fd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 6px rgba(124, 58, 237, 0.16)',
            }}
          >
            <Activity size={19} style={{ display: 'block', margin: 'auto' }} />
          </div>
          <div>
            <div
              style={{
                fontSize: 16.5,
                fontWeight: 700,
                color: 'var(--ui-text, #0f172a)',
                letterSpacing: '-0.01em',
              }}
            >
              {service ? 'Edit Diagnostic Service' : 'Create Diagnostic Service'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>
              {service
                ? `Editing master catalog test for ${service.name}`
                : 'Add a new laboratory test or clinical investigation to the master catalog'}
            </div>
          </div>
        </div>
      }
    >
      <form
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
        className="ui-modal-form"
        style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
      >
        <style>{`
          .service-drawer-modal {
            width: min(640px, 100vw) !important;
            max-width: 640px !important;
            background: #ffffff;
            box-shadow: -12px 0 36px rgba(15, 23, 42, 0.14) !important;
          }
          .service-drawer-modal .ui-modal-head {
            padding: 18px 24px;
            background: linear-gradient(180deg, #faf5ff 0%, #ffffff 100%);
            border-bottom: 1px solid #f1f5f9;
          }
          .service-drawer-modal .ui-modal-body {
            padding: 20px 24px;
            background: #f8fafc;
            display: flex;
            flex-direction: column;
            gap: 14px;
            overflow-y: auto;
          }
          .service-section-card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 18px 20px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
            display: flex;
            flex-direction: column;
            gap: 14px;
            transition: border-color 0.15s ease;
          }
          .service-section-card:hover {
            border-color: #cbd5e1;
          }
          .service-section-header {
            display: flex;
            align-items: center;
            gap: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid #f1f5f9;
          }
          .service-section-badge {
            width: 26px;
            height: 26px;
            border-radius: 7px;
            background: #f5f3ff;
            color: #7c3aed;
            border: 1px solid #ede9fe;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .service-section-badge svg {
            display: block;
            margin: auto;
          }
          .service-section-tag {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.06em;
            color: #475569;
            text-transform: uppercase;
          }
          .service-section-subtitle {
            font-size: 12px;
            color: #64748b;
            margin-left: auto;
          }
          .service-drawer-modal .ui-input {
            height: 38px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
            font-size: 13px;
            padding: 0 12px;
            transition: all 0.15s ease;
          }
          .service-drawer-modal .ui-input:focus {
            border-color: #7c3aed !important;
            box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12) !important;
            outline: none;
          }
          .service-status-btn {
            flex: 1;
            padding: 12px 14px;
            border-radius: 9px;
            cursor: pointer;
            text-align: left;
            display: flex;
            align-items: flex-start;
            gap: 10px;
            transition: all 0.15s ease;
            position: relative;
          }
          .service-status-btn.is-active {
            border: 1.5px solid #7c3aed !important;
            background: #f5f3ff !important;
            box-shadow: 0 2px 6px rgba(124, 58, 237, 0.12);
          }
          .service-status-btn:not(.is-active) {
            border: 1px solid #e2e8f0;
            background: #ffffff;
          }
          .service-status-btn:not(.is-active):hover {
            border-color: #cbd5e1;
            background: #fafafa;
          }
          .service-radio-circle {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 2px solid #cbd5e1;
            margin-top: 2px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: all 0.15s ease;
          }
          .service-status-btn.is-active .service-radio-circle {
            border-color: #7c3aed;
            background: #7c3aed;
          }
          .service-radio-inner {
            width: 6px;
            height: 6px;
            border-radius: 50%;
            background: #ffffff;
          }
          .service-drawer-modal .ui-modal-foot {
            padding: 14px 24px;
            background: #ffffff;
            border-top: 1px solid #f1f5f9;
            display: flex;
            align-items: center;
            justify-content: flex-end;
            gap: 10px;
          }
        `}</style>

        <div className="ui-modal-body">
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Diagnostic Service Details */}
          <div className="service-section-card">
            <div className="service-section-header">
              <div className="service-section-badge">
                <FlaskConical size={14} />
              </div>
              <span className="service-section-tag">Service Specification</span>
              <span className="service-section-subtitle hidden sm:inline">
                Diagnostic test title and clinical identifier
              </span>
            </div>

            <div className="space-y-3.5">
              <div>
                <label
                  htmlFor="service-name-input"
                  className="mb-1.5 block text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  Diagnostic Service / Test Name <span className="font-bold text-rose-500">*</span>
                </label>
                <input
                  id="service-name-input"
                  className="ui-input w-full"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Complete Blood Count (CBC), Lipid Profile, Thyroid Panel"
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  Official clinical name displayed on doctor prescription orders and patient referrals
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Catalog Availability & Status */}
          <div className="service-section-card">
            <div className="service-section-header">
              <div className="service-section-badge">
                <ShieldCheck size={14} />
              </div>
              <span className="service-section-tag">Catalog Availability & Status</span>
              <span className="service-section-subtitle hidden sm:inline">
                Referral prescription visibility
              </span>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-800">
                Service Catalog Status <span className="font-bold text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className={`service-status-btn ${status === 'ACTIVE' ? 'is-active' : ''}`}
                  onClick={() => setStatus('ACTIVE')}
                >
                  <div className="service-radio-circle">
                    {status === 'ACTIVE' && <div className="service-radio-inner" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Active in Catalog
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700">
                        Live
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Available for doctor prescriptions, linked lab attachments, and orders.
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  className={`service-status-btn ${status === 'INACTIVE' ? 'is-active' : ''}`}
                  onClick={() => setStatus('INACTIVE')}
                >
                  <div className="service-radio-circle">
                    {status === 'INACTIVE' && <div className="service-radio-inner" />}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Inactive / Suspended
                      <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                        Disabled
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Temporarily paused. Hidden from doctor test requisition dropdowns.
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Docked Drawer Footer */}
        <div className="ui-modal-foot">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-purple-600 bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:from-purple-700 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>{service ? 'Save Changes' : 'Create Diagnostic Service'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
