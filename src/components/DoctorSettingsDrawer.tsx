import {
  AlertCircle,
  Building2,
  Check,
  FileCode2,
  Hash,
  Info,
  Lock,
  RefreshCw,
  Sliders,
  Sparkles,
  Unlock,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { App } from 'antd';

import { Drawer } from './ui/Drawer';
import api from '../utils/api';

export interface HospitalDoctorSettingsResponse {
  hospitals: Array<{ id: string; name: string }>;
  selected_hospital_id: string;
  hospital_name: string;
  prefix: string;
  numeric_length: number;
  next_sequence: number;
  doctor_count: number;
  is_locked: boolean;
  preview_code: string;
  message: string | null;
}

export interface DoctorSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  onSettingsSaved?: () => void;
}

export default function DoctorSettingsDrawer({
  open,
  onClose,
  onSettingsSaved,
}: DoctorSettingsDrawerProps) {
  const { message } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<HospitalDoctorSettingsResponse | null>(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('');
  const [prefixInput, setPrefixInput] = useState<string>('DOC');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSettings = async (targetHospitalId?: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.get<HospitalDoctorSettingsResponse>('doctors/settings', {
        params: targetHospitalId ? { hospital_id: targetHospitalId } : undefined,
      });
      setSettings(res.data);
      setSelectedHospitalId(res.data.selected_hospital_id);
      setPrefixInput(res.data.prefix || 'DOC');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to load doctor settings';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void fetchSettings(selectedHospitalId || undefined);
    } else {
      setErrorMessage(null);
    }
  }, [open]);

  const handleHospitalChange = (newHospId: string) => {
    setSelectedHospitalId(newHospId);
    void fetchSettings(newHospId);
  };

  const handlePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (settings?.is_locked) return;
    const raw = e.target.value;
    const clean = raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
    setPrefixInput(clean);
  };

  const isLocked = Boolean(settings?.is_locked);
  const isPrefixValid = prefixInput.trim().length === 3 && /^[A-Z]{3}$/.test(prefixInput.trim());
  const hasChanged = settings ? prefixInput.trim() !== settings.prefix : false;
  const canSave = !isLocked && isPrefixValid && hasChanged && !saving && !loading;

  // Live preview calculation:
  // If locked, preview shows current prefix + next available sequence number
  // If not locked, preview shows prefixInput (padded to 3 chars) + 000001
  const livePreview = useMemo(() => {
    if (isLocked && settings) {
      return settings.preview_code || `${settings.prefix}${String(settings.next_sequence || 1).padStart(6, '0')}`;
    }
    const clean = prefixInput.trim();
    const effectivePrefix = clean.length === 3 ? clean : (clean + '•••').slice(0, 3);
    return `${effectivePrefix}000001`;
  }, [isLocked, settings, prefixInput]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canSave || !selectedHospitalId) return;

    setSaving(true);
    setErrorMessage(null);
    try {
      const res = await api.put<HospitalDoctorSettingsResponse>('doctors/settings', {
        hospital_id: selectedHospitalId,
        prefix: prefixInput.trim(),
      });
      setSettings(res.data);
      setPrefixInput(res.data.prefix);
      void message.success('Doctor Code prefix configuration saved successfully');
      onSettingsSaved?.();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to save doctor settings';
      setErrorMessage(msg);
      void message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      open={open}
      onClose={saving ? () => undefined : onClose}
      size="md"
      label="Doctors Module Configuration"
      title="Doctor Settings"
      subtitle="Configure automatic Doctor Code generation and hospital prefixes"
      icon={<Sliders size={18} className="text-blue-600" />}
      loading={loading && !settings}
      loadingText="Loading doctor settings…"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <button
            type="button"
            className="ui-btn ui-btn-secondary"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="ui-btn ui-btn-primary flex items-center gap-1.5"
            onClick={() => void handleSave()}
            disabled={!canSave}
            title={
              isLocked
                ? 'Doctor records already exist; prefix editing is locked'
                : !isPrefixValid
                  ? 'Prefix must be exactly 3 alphabetic letters'
                  : !hasChanged
                    ? 'No changes to save'
                    : 'Save prefix changes'
            }
          >
            {saving ? (
              <>
                <RefreshCw size={13} className="animate-spin" />
                <span>Saving…</span>
              </>
            ) : (
              <>
                <Check size={14} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-5 p-1 text-slate-800">
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
            <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 font-medium">{errorMessage}</div>
          </div>
        )}

        {/* Hospital Selector for Multi-hospital deployments */}
        {settings && settings.hospitals && settings.hospitals.length > 1 && (
          <div className="bg-slate-50/80 rounded-xl border border-slate-200/80 p-3.5 space-y-2">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Building2 size={13} className="text-slate-500" />
              <span>Select Hospital Facility</span>
            </label>
            <select
              value={selectedHospitalId}
              onChange={(e) => handleHospitalChange(e.target.value)}
              disabled={loading || saving}
              className="ui-input w-full bg-white text-xs font-medium"
            >
              {settings.hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">
              Each hospital facility maintains its own independent Doctor Code sequence and prefix.
            </p>
          </div>
        )}

        {/* Main Configuration Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <FileCode2 size={15} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900">Doctor Code Format Configuration</h4>
                <p className="text-[11px] text-slate-500">Format: 3 Letters + 6 Digits (e.g. DOC000001)</p>
              </div>
            </div>

            {/* Lock Status Pill */}
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                isLocked
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {isLocked ? (
                <>
                  <Lock size={11} className="text-amber-600" />
                  <span>Locked ({settings?.doctor_count ?? 0} doctors)</span>
                </>
              ) : (
                <>
                  <Unlock size={11} className="text-emerald-600" />
                  <span>Editable (0 doctors)</span>
                </>
              )}
            </span>
          </div>

          {/* Scenario 2 Lock Alert */}
          {isLocked && (
            <div
              data-testid="doctor-settings-locked-message"
              className="p-3 rounded-lg bg-amber-50/80 border border-amber-200/90 text-xs text-amber-900 flex items-start gap-2.5 leading-relaxed"
            >
              <Lock size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block mb-0.5 text-amber-950">
                  Prefix Editing Locked
                </strong>
                {settings?.message ||
                  'Doctor records already exist. The Doctor Code prefix cannot be changed because it may affect existing doctor identification and references.'}
              </div>
            </div>
          )}

          {/* Prefix Input */}
          <div className="space-y-3">
            <div>
              <label
                htmlFor="doctor-prefix-input"
                className="text-xs font-semibold text-slate-800 flex items-center justify-between mb-1.5"
              >
                <span>3-Letter Doctor Code Prefix</span>
                <span className="text-[11px] font-mono text-slate-400">
                  {prefixInput.length}/3 characters
                </span>
              </label>
              <input
                id="doctor-prefix-input"
                data-testid="doctor-prefix-input"
                type="text"
                maxLength={3}
                value={prefixInput}
                onChange={handlePrefixChange}
                disabled={isLocked || loading || saving}
                placeholder="DOC"
                className={`ui-input w-full font-mono font-bold tracking-widest text-sm uppercase ${
                  isLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-white'
                }`}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {isLocked
                  ? 'Configured prefix cannot be altered after doctor records are created.'
                  : 'Enter exactly 3 alphabetic characters (e.g. DOC, PHY, MED).'}
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-800 block mb-1.5">
                Numeric Sequence Format
              </label>
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 text-xs text-slate-700 font-medium">
                <span className="flex items-center gap-1.5">
                  <Hash size={13} className="text-slate-400" />
                  <span>Fixed Sequence Length</span>
                </span>
                <span className="font-mono font-semibold text-slate-800 bg-white border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                  6 Numeric Digits (000001 - 999999)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Sequence increments automatically on every successfully registered doctor record.
              </p>
            </div>

            {/* Live Preview Container */}
            <div className="pt-2">
              <label className="text-xs font-semibold text-slate-800 block mb-1.5">
                Generated Code Preview
              </label>
              <div className="p-3.5 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50/90 via-sky-50/60 to-blue-50/40 flex items-center justify-between gap-3 shadow-2xs">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-blue-600 mb-0.5">
                    {isLocked ? 'Next Sequence Code' : 'First Doctor Preview'}
                  </div>
                  <div
                    data-testid="doctor-code-preview"
                    className="text-xl sm:text-2xl font-mono font-bold tracking-wider text-blue-700"
                  >
                    {livePreview}
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-white border border-blue-200/80 px-2 py-1 rounded-lg shadow-2xs">
                    <Sparkles size={11} className="text-blue-500" />
                    <span>Live Preview</span>
                  </span>
                </div>
              </div>
              <p className="text-[10.5px] text-slate-400 mt-1.5 flex items-center gap-1">
                <Info size={11} className="shrink-0 text-slate-400" />
                <span>
                  The preview is computed dynamically and does not reserve or consume a sequence number.
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Hospital Scope & Multi-Branch Operational Summary */}
        <div className="bg-slate-50/70 rounded-xl border border-slate-200/80 p-4 space-y-3">
          <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <Building2 size={13} className="text-slate-500" />
            <span>Hospital & Branch Scope</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/70 shadow-2xs">
              <span className="text-[10.5px] text-slate-400 block">Hospital</span>
              <span className="font-semibold text-slate-800 truncate block mt-0.5">
                {settings?.hospital_name || 'Hospital Profile'}
              </span>
            </div>
            <div className="p-2.5 rounded-lg bg-white border border-slate-200/70 shadow-2xs">
              <span className="text-[10.5px] text-slate-400 block">Total Doctors</span>
              <span className="font-semibold text-slate-800 block mt-0.5">
                {settings?.doctor_count ?? 0} record{settings?.doctor_count === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            All branches operating under this hospital share the common hospital-level Doctor Code sequence, ensuring doctor identification remains permanent and consistent across all branches.
          </p>
        </div>
      </div>
    </Drawer>
  );
}
