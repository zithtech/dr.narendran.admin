import { App, Spin } from 'antd';
import {
  Building2,
  CheckCircle2,
  CloudUpload,
  HeartPulse,
  Image as ImageIcon,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import api from '../utils/api';
import { getMediaProxyUrl } from '../utils/mediaProxy';

export default function SettingsPage() {
  const { message } = App.useApp();

  const [loading, setLoading] = useState<boolean>(true);
  const [savingProfile, setSavingProfile] = useState<boolean>(false);
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);

  // Profile State
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<string>('');

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
        setEmail(res.data.email || localStorage.getItem('adminUsername') || '');
        setRole(res.data.role || localStorage.getItem('adminRole') || 'SUPER_ADMIN');

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
      const storedRole = localStorage.getItem('adminRole') || 'SUPER_ADMIN';

      if (storedFirst || storedLast) {
        setFirstName(storedFirst);
        setLastName(storedLast);
      } else {
        const parts = storedUser.split(/[\s@._]+/);
        setFirstName(parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'System');
        setLastName(parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : 'Admin');
      }

      setEmail(storedUser);
      setRole(storedRole);
      setCurrentLogoUrl(storedLogo);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSettings();
  }, []);

  // Handle Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() && !lastName.trim()) {
      message.error('Please provide at least a First Name or Last Name.');
      return;
    }

    setSavingProfile(true);
    try {
      const cleanFirst = firstName.trim();
      const cleanLast = lastName.trim();

      await api.put('settings/profile', {
        firstName: cleanFirst,
        lastName: cleanLast,
      });

      // Update local storage and notify app
      localStorage.setItem('adminFirstName', cleanFirst);
      localStorage.setItem('adminLastName', cleanLast);
      const fullName = [cleanFirst, cleanLast].filter(Boolean).join(' ');
      localStorage.setItem('adminFullName', fullName);
      window.dispatchEvent(new Event('admin-settings-changed'));

      message.success('Administrator profile updated successfully!');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to update profile.';
      message.error(msg);
    } finally {
      setSavingProfile(false);
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

  // Handle Logo Upload to S3
  const handleUploadLogo = async () => {
    if (!selectedFile) {
      message.error('Please select an image file to upload.');
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', selectedFile);

      const res = await api.post('settings/logo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedUrl = res.data?.logoUrl;
      if (uploadedUrl) {
        setCurrentLogoUrl(uploadedUrl);
        setPreviewUrl('');
        setSelectedFile(null);
        localStorage.setItem('adminLogoUrl', uploadedUrl);
        window.dispatchEvent(new Event('admin-settings-changed'));
        window.dispatchEvent(new Event('admin-logo-changed'));
        message.success('Hospital logo uploaded and stored in S3 bucket successfully!');
      } else {
        throw new Error('S3 upload did not return a valid file URL.');
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.error || err?.message || 'Failed to upload logo to S3 bucket.';
      message.error(msg);
    } finally {
      setUploadingLogo(false);
    }
  };

  // Handle Reset/Remove Logo
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
          <p className="text-sm text-slate-500 font-medium">Loading settings & branding...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ui-page max-w-5xl mx-auto space-y-5 pb-12">
      {/* 1. Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200/60 text-blue-600 flex items-center justify-center shrink-0 shadow-2xs">
            <Settings size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">
              Settings & Branding
            </h1>
            <p className="text-xs text-slate-500">
              Manage your administrator identity, first and last name, and hospital branding assets
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void fetchSettings()}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={13} />
          <span>Refresh</span>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Profile Settings & Logo Upload (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Card 1: Administrator Profile (First Name & Last Name) */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <User size={16} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Administrator Profile</h2>
                <p className="text-xs text-slate-400">
                  Update your display name for system identification and audit logs
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* First Name Field */}
                <div>
                  <label
                    htmlFor="firstName"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Enter first name"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                  />
                </div>

                {/* Last Name Field */}
                <div>
                  <label
                    htmlFor="lastName"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Enter last name"
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all shadow-2xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Read-only Username/Email */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Account Email / Username
                  </label>
                  <input
                    type="text"
                    disabled
                    value={email}
                    className="w-full h-9 px-3 rounded-lg border border-slate-200 bg-slate-50/80 text-xs text-slate-500 cursor-not-allowed"
                  />
                </div>

                {/* Role Badge */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Assigned Role
                  </label>
                  <div className="h-9 px-3 rounded-lg border border-slate-200 bg-slate-50/80 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">{role}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                      <ShieldCheck size={11} />
                      Active
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {savingProfile ? (
                    <>
                      <Spin size="small" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    <>
                      <Save size={14} />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* Card 2: Hospital & Brand Logo Upload (Stored in S3) */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <ImageIcon size={16} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Hospital Brand Logo</h2>
                  <p className="text-xs text-slate-400">
                    Upload your official hospital logo to store in AWS S3 and display in the sidebar
                  </p>
                </div>
              </div>

              <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-50 text-sky-700 border border-sky-200/60">
                <CloudUpload size={12} />
                Amazon S3 Bucket
              </span>
            </div>

            <div className="mt-4 space-y-4">
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
                className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
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

                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-2xs">
                    <CloudUpload size={24} />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700">
                      Click to choose logo or drag & drop here
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Supports PNG, JPG, JPEG, WebP, or SVG (Maximum 10 MB)
                    </p>
                  </div>
                </div>
              </div>

              {/* Selected File Details / Actions */}
              {selectedFile && (
                <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-white border border-blue-200 flex items-center justify-center shrink-0">
                      <ImageIcon size={15} className="text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB • Ready for S3 upload
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                        setPreviewUrl('');
                      }}
                      className="px-2.5 py-1 rounded-md text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-white/80 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={uploadingLogo}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleUploadLogo();
                      }}
                      className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {uploadingLogo ? (
                        <>
                          <Spin size="small" />
                          <span>Uploading to S3...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={13} />
                          <span>Upload to S3 Bucket</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Current S3 Storage Status info */}
              {currentLogoUrl && !selectedFile && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-white border border-emerald-200 shadow-2xs overflow-hidden p-0.5 shrink-0 flex items-center justify-center">
                      <img
                        src={getMediaProxyUrl(currentLogoUrl)}
                        alt="Current Hospital Logo"
                        className="w-full h-full object-contain rounded-md"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                        <span className="text-xs font-bold text-emerald-900">
                          Active logo is securely hosted on AWS S3
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-700/80 truncate mt-0.5">
                        Fetched securely via Media Proxy &amp; displayed in navigation
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRemoveLogo()}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer self-start sm:self-auto shrink-0"
                  >
                    <Trash2 size={12} />
                    <span>Revert to Default Logo</span>
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Live Sidebar Preview (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          <section className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs sticky top-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Building2 size={16} className="text-slate-600" />
              <h2 className="text-sm font-bold text-slate-900">Sidebar Live Preview</h2>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Preview how your hospital branding appears inside the main left navigation bar:
            </p>

            {/* Sidebar Mockup Box */}
            <div className="mt-4 p-4 rounded-xl bg-[#0f172a] text-white shadow-md border border-slate-800">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Main Sidebar Brand Header
              </div>

              {/* Exact Brand Area Replication */}
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60">
                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden p-0.5 shadow-2xs">
                  {activeDisplayLogo && !livePreviewError ? (
                    <img
                      src={activeDisplayLogo}
                      alt="Brand Preview"
                      className="w-full h-full object-contain rounded-md"
                      onError={() => setLivePreviewError(true)}
                    />
                  ) : (
                    <div className="w-full h-full rounded-md bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center">
                      <HeartPulse size={16} strokeWidth={2.4} />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate" title={firstName}>
                    {firstName || 'HMS Admin'}
                  </div>
                  <div className="text-[11px] text-slate-300 truncate" title={lastName}>
                    {lastName || 'Hospital'}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Logo Status:</span>
                  <span className="font-semibold text-slate-200">
                    {activeDisplayLogo ? 'Custom Brand' : 'Default Pulse'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Storage:</span>
                  <span className="font-semibold text-slate-200">
                    {currentLogoUrl ? 'AWS S3 Cloud' : 'Built-in SVG'}
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

