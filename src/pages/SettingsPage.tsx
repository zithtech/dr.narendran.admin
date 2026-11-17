import { App, Spin } from 'antd';
import {
  CheckCircle2,
  CloudUpload,
  Image as ImageIcon,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import api from '../utils/api';
import { getMediaProxyUrl } from '../utils/mediaProxy';

export default function SettingsPage() {
  const { message } = App.useApp();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Name State
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');

  // Logo State
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [livePreviewError, setLivePreviewError] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Use local previewUrl when selecting a new file; otherwise route saved S3 URL through Media Proxy
  const activeDisplayLogo = selectedFile && previewUrl
    ? previewUrl
    : currentLogoUrl
    ? getMediaProxyUrl(currentLogoUrl)
    : '';

  useEffect(() => {
    setLivePreviewError(false);
  }, [activeDisplayLogo]);

  // Fetch current settings on mount
  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('settings');
      if (res.data) {
        setFirstName(res.data.firstName || '');
        setLastName(res.data.lastName || '');

        const logo = res.data.logoUrl || localStorage.getItem('adminLogoUrl') || '';
        setCurrentLogoUrl(logo);
        if (logo) {
          localStorage.setItem('adminLogoUrl', logo);
        }
        if (res.data.firstName) {
          localStorage.setItem('adminFirstName', res.data.firstName);
        }
        if (res.data.lastName) {
          localStorage.setItem('adminLastName', res.data.lastName);
        }
        if (res.data.fullName) {
          localStorage.setItem('adminFullName', res.data.fullName);
        }
        window.dispatchEvent(new Event('admin-settings-changed'));
      }
    } catch {
      // Fallback to localStorage values
      const storedFirst = localStorage.getItem('adminFirstName') || '';
      const storedLast = localStorage.getItem('adminLastName') || '';
      const storedLogo = localStorage.getItem('adminLogoUrl') || '';
      const storedUser = localStorage.getItem('adminUsername') || 'adminweb123@gmail.com';

      if (storedFirst || storedLast) {
        setFirstName(storedFirst);
        setLastName(storedLast);
      } else {
        const parts = storedUser.split(/[\s@._]+/);
        setFirstName(parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'System');
        setLastName(parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : 'Admin');
      }

      setCurrentLogoUrl(storedLogo);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSettings();
  }, []);

  // Handle Save (both names and new logo upload)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() && !lastName.trim()) {
      message.error('Please provide at least a First Name or Last Name.');
      return;
    }

    setSaving(true);
    try {
      const cleanFirst = firstName.trim();
      const cleanLast = lastName.trim();
      let updatedLogoUrl = currentLogoUrl;

      // 1. Upload new logo if selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append('logo', selectedFile);

        const res = await api.post('settings/logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (res.data?.logoUrl) {
          updatedLogoUrl = res.data.logoUrl;
          setCurrentLogoUrl(updatedLogoUrl);
          setSelectedFile(null);
          setPreviewUrl('');
          localStorage.setItem('adminLogoUrl', updatedLogoUrl);
          window.dispatchEvent(new Event('admin-logo-changed'));
        }
      }

      // 2. Update names
      await api.put('settings/profile', {
        firstName: cleanFirst,
        lastName: cleanLast,
        ...(updatedLogoUrl ? { logoUrl: updatedLogoUrl } : {}),
      });

      // Update localStorage & notify application layout
      localStorage.setItem('adminFirstName', cleanFirst);
      localStorage.setItem('adminLastName', cleanLast);
      const fullName = [cleanFirst, cleanLast].filter(Boolean).join(' ');
      localStorage.setItem('adminFullName', fullName);
      window.dispatchEvent(new Event('admin-settings-changed'));

      message.success('Settings saved successfully!');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to save settings.';
      message.error(msg);
    } finally {
      setSaving(false);
    }
  };

  // Handle Logo Selection
  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('Please upload a valid image file (PNG, JPG, JPEG, SVG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      message.error('Logo file size must not exceed 10 MB.');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  // Handle Remove/Revert Logo
  const handleRemoveLogo = async () => {
    setCurrentLogoUrl('');
    setPreviewUrl('');
    setSelectedFile(null);
    localStorage.removeItem('adminLogoUrl');
    window.dispatchEvent(new Event('admin-settings-changed'));
    window.dispatchEvent(new Event('admin-logo-changed'));

    try {
      await api.put('settings/profile', {
        firstName,
        lastName,
        logoUrl: '',
      });
    } catch {
      // local reset succeeds
    }
    message.info('Reverted to default system logo.');
  };

  if (loading) {
    return (
      <div className="ui-page flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Spin size="large" />
          <p className="text-sm text-slate-500 font-medium">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ui-page w-full space-y-4 pb-12">
      {/* Page Header (Consistent with Doctors page / DataView layout) */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 py-1">
        <div className="flex flex-col min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
            Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-normal leading-normal">
            Configure hospital identity and brand logo settings.
          </p>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            className="inline-flex items-center justify-center w-7.5 h-7.5 shrink-0 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            onClick={() => void fetchSettings()}
            aria-label="Refresh settings"
            title="Refresh"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Single Card Containing Everything */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-2xs">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Top: First Name and Last Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="firstName" className="block text-xs font-semibold text-slate-700 mb-1.5">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
                className="w-full h-9.5 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
              />
            </div>

            <div>
              <label htmlFor="lastName" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
                className="w-full h-9.5 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Below: Logo Upload on Left | Only Logo Preview on Right */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Left: Logo Upload */}
            <div className="flex flex-col space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Logo Upload
              </label>

              {/* Dropzone Container */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileChange(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`flex-1 min-h-[170px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
                  isDragOver
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-slate-200 hover:border-blue-400 bg-slate-50/40 hover:bg-white'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs mb-2">
                  <CloudUpload size={20} />
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  Click to choose logo or drag &amp; drop
                </span>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports PNG, JPG, JPEG, WebP, or SVG (Max 10 MB)
                </p>
              </div>

              {/* Selected File Details */}
              {selectedFile && (
                <div className="flex items-center justify-between p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl mt-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ImageIcon size={14} className="text-blue-600 shrink-0" />
                    <span className="text-xs font-medium text-slate-800 truncate">
                      {selectedFile.name}
                    </span>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setPreviewUrl('');
                    }}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-white transition-colors cursor-pointer"
                    title="Remove selected file"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Current Active Logo Info */}
              {currentLogoUrl && !selectedFile && (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl mt-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span className="text-xs font-medium text-emerald-800 truncate">
                      Active logo hosted on AWS S3
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRemoveLogo()}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer shrink-0"
                  >
                    <Trash2 size={11} />
                    <span>Revert</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right: Uploaded Logo Preview Only */}
            <div className="flex flex-col space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Logo Preview
              </label>

              <div className="flex-1 min-h-[170px] rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col items-center justify-center">
                {activeDisplayLogo && !livePreviewError ? (
                  <div className="w-full h-full max-h-40 flex items-center justify-center p-3 rounded-lg bg-white border border-slate-200/80 shadow-2xs">
                    <img
                      src={activeDisplayLogo}
                      alt="Uploaded Logo Preview"
                      className="max-h-32 max-w-full object-contain"
                      onError={() => setLivePreviewError(true)}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 gap-2 p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
                      <ImageIcon size={22} />
                    </div>
                    <span className="text-xs font-medium text-slate-500">
                      No logo uploaded yet
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Upload an image to preview it here
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Card Footer: Save Button */}
          <div className="border-t border-slate-100 pt-5 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 h-9.5 px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Spin size="small" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
