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

export interface HospitalPatientSettingsResponse {
  hospitals: Array<{ id: string; name: string }>;
  selected_hospital_id: string;
  hospital_name: string;
  prefix: string;
  numeric_length: number;
  next_sequence: number;
  patient_count: number;
  is_locked: boolean;
  preview_code: string;
  message: string | null;
}

export interface PatientSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  onSettingsSaved?: () => void;
}

export default function PatientSettingsDrawer({
  open,
  onClose,
  onSettingsSaved,
}: PatientSettingsDrawerProps) {
  const { message } = App.useApp();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<HospitalPatientSettingsResponse | null>(null);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string>('');
  const [prefixInput, setPrefixInput] = useState<string>('PAT');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchSettings = async (targetHospitalId?: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.get<HospitalPatientSettingsResponse>('patients/settings', {
        params: targetHospitalId ? { hospital_id: targetHospitalId } : undefined,
      });
      setSettings(res.data);
      setSelectedHospitalId(res.data.selected_hospital_id);
      setPrefixInput(res.data.prefix || 'PAT');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to load patient settings';
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
      const res = await api.put<HospitalPatientSettingsResponse>('patients/settings', {
        hospital_id: selectedHospitalId,
        prefix: prefixInput.trim(),
      });
      setSettings(res.data);
      setPrefixInput(res.data.prefix);
      void message.success('Patient Code prefix configuration saved successfully');
      onSettingsSaved?.();
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to save patient settings';
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
      label="Patients Module Configuration"
      title="Patient Settings"
      subtitle="Configure automatic Patient Code generation and hospital prefixes"
      icon={<Sliders size={18} className="text-blue-600" />}
      loading={loading && !settings}
      loadingText="Loading patient settings…"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <button
            type="button"
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            onClick={onClose}
            disabled={saving}
          >
            {isLocked ? 'Close' : 'Cancel'}
          </button>
          {!isLocked && (
            <button
              type="button"
              className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
              onClick={() => void handleSave()}
              disabled={!canSave}
            >
              {saving ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Check size={13} strokeWidth={2.4} />
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {errorMessage && (
          <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-xs text-rose-800">
            <AlertCircle size={16} className="shrink-0 text-rose-600 mt-0.5" />
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        {/* Hospital Selection (Supports Multi-Hospital / Multi-Branch) */}
        {settings && settings.hospitals && settings.hospitals.length > 1 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-2">
            <label
              htmlFor="settings-hospital-select"
              className="text-xs font-bold text-slate-800 flex items-center gap-1.5"
            >
              <Building2 size={14} className="text-blue-600" />
              <span>Select Hospital / Facility</span>
            </label>
            <select
              id="settings-hospital-select"
              value={selectedHospitalId}
              onChange={(e) => handleHospitalChange(e.target.value)}
              disabled={loading || saving}
              className="ui-input w-full text-xs font-medium cursor-pointer"
            >
              {settings.hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">
              Each hospital maintains an independent Patient Code prefix and sequence shared across all its branches.
            </p>
          </div>
        )}

        {/* Informational Message When Locked */}
        {isLocked && (
          <div
            data-testid="patient-settings-locked-alert"
            className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-900 shadow-2xs"
          >
            <AlertCircle size={18} className="shrink-0 text-amber-600 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold text-amber-950 flex items-center gap-1.5">
                <Lock size={12} className="text-amber-700" />
                <span>Configuration Permanently Locked</span>
              </div>
              <p className="leading-relaxed text-[11.5px] text-amber-900/90">
                Patient Code configuration cannot be changed because patient records have already been created. This restriction helps maintain patient identification consistency and prevents data loss.
              </p>
            </div>
          </div>
        )}

        {/* Patient Code Configuration Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileCode2 size={16} className="text-blue-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Patient Code Format Configuration
              </h3>
            </div>
            {isLocked ? (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                <Lock size={10} className="text-slate-500" />
                <span>Locked</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Unlock size={10} className="text-emerald-600" />
                <span>Configurable</span>
              </span>
            )}
          </div>

          {/* Configuration Form Controls */}
          <div className="space-y-3.5">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="patient-code-prefix-input"
                  className="text-xs font-semibold text-slate-800"
                >
                  Patient Code Prefix <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-slate-400 font-mono">
                  {prefixInput.length} / 3 chars
                </span>
              </div>
              <input
                id="patient-code-prefix-input"
                type="text"
                maxLength={3}
                value={prefixInput}
                onChange={handlePrefixChange}
                disabled={isLocked || loading || saving}
                placeholder="PAT"
                className={`ui-input w-full font-mono font-bold tracking-widest text-sm uppercase ${
                  isLocked ? 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200' : 'bg-white'
                }`}
              />
              <p className="text-[11px] text-slate-500 mt-1">
                {isLocked
                  ? 'Configured prefix cannot be altered after patient records are created.'
                  : 'Enter exactly 3 alphabetic characters (e.g. PAT, ABC, CTY).'}
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
                Sequence increments automatically on every successfully registered patient record.
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
                    {isLocked ? 'Next Sequence Code' : 'First Patient Preview'}
                  </div>
                  <div
                    data-testid="patient-code-preview"
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
              <span className="text-[10.5px] text-slate-400 block">Total Patients</span>
              <span className="font-semibold text-slate-800 block mt-0.5">
                {settings?.patient_count ?? 0} record{settings?.patient_count === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            All branches operating under this hospital share the common hospital-level Patient Code sequence, ensuring patient identification remains permanent and consistent across all branches.
          </p>
        </div>
      </div>
    </Drawer>
  );
}
