import { App, Spin } from 'antd';
import {
  Camera,
  Check,
  CheckCircle2,
  CloudUpload,
  Crop,
  Image as ImageIcon,
  RefreshCw,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

import defaultBrandLogo from '../assets/brand-logo.png';
import { ImageCropModal } from '../components/ui/ImageCropModal';
import api from '../utils/api';
import { getMediaProxyUrl } from '../utils/mediaProxy';

export default function SettingsPage() {
  const { message } = App.useApp();

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Name State
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');

  // Logo Versions State
  const [originalLogoUrl, setOriginalLogoUrl] = useState<string>('');
  const [croppedLogoUrl, setCroppedLogoUrl] = useState<string>('');
  const [activeVersion, setActiveVersion] = useState<'original' | 'cropped'>('original');

  // Pending files to upload
  const [selectedOriginalFile, setSelectedOriginalFile] = useState<File | null>(null);
  const [pendingCroppedFile, setPendingCroppedFile] = useState<File | null>(null);

  // Crop Modal state
  const [isCropModalOpen, setIsCropModalOpen] = useState<boolean>(false);
  const [imageToCrop, setImageToCrop] = useState<string>('');

  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [livePreviewError, setLivePreviewError] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active logo to display
  const activeLogo =
    activeVersion === 'cropped' && croppedLogoUrl
      ? croppedLogoUrl
      : originalLogoUrl || '';

  const activeDisplayLogo = activeLogo
    ? activeLogo.startsWith('data:') || activeLogo.startsWith('blob:')
      ? activeLogo
      : getMediaProxyUrl(activeLogo)
    : defaultBrandLogo;

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

        const backendLogo = res.data.logoUrl || '';
        let storedActive = localStorage.getItem('adminLogoUrl') || backendLogo;
        let storedOriginal = localStorage.getItem('adminOriginalLogoUrl') || backendLogo;
        let storedCropped = localStorage.getItem('adminCroppedLogoUrl') || '';

        // Discard expired session blob: URLs or default logo references from previous tests
        if (storedOriginal.startsWith('blob:') || storedOriginal.includes('brand-logo.png')) {
          storedOriginal = backendLogo;
        }
        if (storedCropped.startsWith('blob:') || storedCropped.includes('brand-logo.png')) {
          storedCropped = '';
        }
        if (storedActive.startsWith('blob:') || storedActive.includes('brand-logo.png')) {
          storedActive = storedCropped || storedOriginal;
        }

        const storedVersion = (localStorage.getItem('adminLogoActiveVersion') as 'original' | 'cropped') ||
          (storedCropped && storedActive === storedCropped ? 'cropped' : 'original');

        setOriginalLogoUrl(storedOriginal);
        setCroppedLogoUrl(storedCropped);
        setActiveVersion(storedVersion);

        if (storedActive) {
          localStorage.setItem('adminLogoUrl', storedActive);
        } else {
          localStorage.removeItem('adminLogoUrl');
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
      let storedActive = localStorage.getItem('adminLogoUrl') || '';
      let storedOriginal = localStorage.getItem('adminOriginalLogoUrl') || storedActive;
      let storedCropped = localStorage.getItem('adminCroppedLogoUrl') || '';

      // Discard expired session blob: URLs or default logo references
      if (storedOriginal.startsWith('blob:') || storedOriginal.includes('brand-logo.png')) {
        storedOriginal = '';
      }
      if (storedCropped.startsWith('blob:') || storedCropped.includes('brand-logo.png')) {
        storedCropped = '';
      }
      if (storedActive.startsWith('blob:') || storedActive.includes('brand-logo.png')) {
        storedActive = storedCropped || storedOriginal;
      }

      const storedVersion = (localStorage.getItem('adminLogoActiveVersion') as 'original' | 'cropped') ||
        (storedCropped && storedActive === storedCropped ? 'cropped' : 'original');
      const storedUser = localStorage.getItem('adminUsername') || 'adminweb123@gmail.com';

      if (storedFirst || storedLast) {
        setFirstName(storedFirst);
        setLastName(storedLast);
      } else {
        const parts = storedUser.split(/[\s@._]+/);
        setFirstName(parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'System');
        setLastName(parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : 'Admin');
      }

      setOriginalLogoUrl(storedOriginal);
      setCroppedLogoUrl(storedCropped);
      setActiveVersion(storedVersion);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSettings();
  }, []);

  // Handle Logo File Selection
  const handleFileChange = (file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('Please upload a valid image file (PNG, JPG, JPEG, SVG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      message.error('Logo file size must not exceed 10 MB.');
      return;
    }

    setSelectedOriginalFile(file);

    // Read as persistent base64 Data URL so it never expires across reloads
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = (e.target?.result as string) || '';
      if (!dataUrl) return;

      setOriginalLogoUrl(dataUrl);
      setActiveVersion('original');

      localStorage.setItem('adminOriginalLogoUrl', dataUrl);
      localStorage.setItem('adminLogoUrl', dataUrl);
      localStorage.setItem('adminLogoActiveVersion', 'original');
      window.dispatchEvent(new Event('admin-logo-changed'));
      window.dispatchEvent(new Event('admin-settings-changed'));
    };
    reader.readAsDataURL(file);

    message.success('New logo selected as original. You can also crop & zoom it.');
  };

  // Open Crop Modal
  const handleOpenCropModal = (imageSource?: string) => {
    const target = imageSource || originalLogoUrl || activeDisplayLogo || defaultBrandLogo;
    setImageToCrop(target);
    setIsCropModalOpen(true);
  };

  // Apply Crop Callback from ImageCropModal
  const handleApplyCrop = (croppedDataUrl: string, croppedFile: File) => {
    setCroppedLogoUrl(croppedDataUrl);
    setPendingCroppedFile(croppedFile);
    setActiveVersion('cropped');

    // Automatically set cropped version as active in localStorage and dispatch
    localStorage.setItem('adminCroppedLogoUrl', croppedDataUrl);
    localStorage.setItem('adminLogoUrl', croppedDataUrl);
    localStorage.setItem('adminLogoActiveVersion', 'cropped');
    window.dispatchEvent(new Event('admin-logo-changed'));
    window.dispatchEvent(new Event('admin-settings-changed'));

    message.success('Cropped logo version saved and set as active!');
  };

  // Set Active Logo Version (Original vs Cropped)
  const handleSetActiveVersion = async (version: 'original' | 'cropped') => {
    setActiveVersion(version);
    const targetUrl = version === 'cropped' ? croppedLogoUrl : originalLogoUrl;

    if (!targetUrl) return;

    localStorage.setItem('adminLogoUrl', targetUrl);
    localStorage.setItem('adminLogoActiveVersion', version);
    window.dispatchEvent(new Event('admin-logo-changed'));
    window.dispatchEvent(new Event('admin-settings-changed'));

    // If targetUrl is an existing S3 URL, sync with backend immediately
    if (targetUrl.startsWith('http') && !targetUrl.startsWith('blob:')) {
      try {
        await api.put('settings/profile', {
          firstName,
          lastName,
          logoUrl: targetUrl,
        });
      } catch {
        // silent local sync
      }
    }

    message.success(
      version === 'cropped'
        ? 'Cropped version is now active in the sidebar layout!'
        : 'Original logo is now active in the sidebar layout!',
    );
  };

  // Delete/Discard Cropped Version
  const handleRemoveCroppedVersion = () => {
    setCroppedLogoUrl('');
    setPendingCroppedFile(null);
    setActiveVersion('original');

    localStorage.removeItem('adminCroppedLogoUrl');
    localStorage.setItem('adminLogoActiveVersion', 'original');
    localStorage.setItem('adminLogoUrl', originalLogoUrl);
    window.dispatchEvent(new Event('admin-logo-changed'));
    window.dispatchEvent(new Event('admin-settings-changed'));

    message.info('Cropped version removed. Reverted to original logo.');
  };

  // Handle Remove/Revert to Default
  const handleRemoveAllLogos = async () => {
    setOriginalLogoUrl('');
    setCroppedLogoUrl('');
    setSelectedOriginalFile(null);
    setPendingCroppedFile(null);
    setActiveVersion('original');

    localStorage.removeItem('adminLogoUrl');
    localStorage.removeItem('adminOriginalLogoUrl');
    localStorage.removeItem('adminCroppedLogoUrl');
    localStorage.removeItem('adminLogoActiveVersion');
    window.dispatchEvent(new Event('admin-settings-changed'));
    window.dispatchEvent(new Event('admin-logo-changed'));

    try {
      await api.delete('settings/logo');
    } catch {
      try {
        await api.put('settings/profile', {
          firstName,
          lastName,
          logoUrl: '',
        });
      } catch (_err) {}
    }
    message.info('Reverted to default system logo.');
  };

  // Handle Save
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
      let finalActiveLogoUrl = activeLogo;

      // 1. Upload active file to S3 if pending
      if (activeVersion === 'cropped' && pendingCroppedFile) {
        const formData = new FormData();
        formData.append('logo', pendingCroppedFile);

        const res = await api.post('settings/logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (res.data?.logoUrl) {
          finalActiveLogoUrl = res.data.logoUrl;
          setCroppedLogoUrl(finalActiveLogoUrl);
          setPendingCroppedFile(null);
          localStorage.setItem('adminCroppedLogoUrl', finalActiveLogoUrl);
          localStorage.setItem('adminLogoUrl', finalActiveLogoUrl);
          window.dispatchEvent(new Event('admin-logo-changed'));
        }
      } else if (activeVersion === 'original' && selectedOriginalFile) {
        const formData = new FormData();
        formData.append('logo', selectedOriginalFile);

        const res = await api.post('settings/logo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (res.data?.logoUrl) {
          finalActiveLogoUrl = res.data.logoUrl;
          setOriginalLogoUrl(finalActiveLogoUrl);
          setSelectedOriginalFile(null);
          localStorage.setItem('adminOriginalLogoUrl', finalActiveLogoUrl);
          localStorage.setItem('adminLogoUrl', finalActiveLogoUrl);
          window.dispatchEvent(new Event('admin-logo-changed'));
        }
      }

      // 2. Update profile with names and active logo
      await api.put('settings/profile', {
        firstName: cleanFirst,
        lastName: cleanLast,
        ...(finalActiveLogoUrl ? { logoUrl: finalActiveLogoUrl } : {}),
      });

      // Update localStorage & notify layout
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
      {/* Page Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 py-1">
        <div className="flex flex-col min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
            Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-normal leading-normal">
            Configure hospital identity, brand logo, and crop/zoom adjustments.
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

          {/* Middle: Logo Upload on Left | Active Logo Preview on Right */}
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
                className={`flex-1 min-h-[160px] flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer ${
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
              {selectedOriginalFile && (
                <div className="flex items-center justify-between p-2.5 bg-blue-50/70 border border-blue-200/80 rounded-xl mt-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <ImageIcon size={14} className="text-blue-600 shrink-0" />
                    <span className="text-xs font-medium text-slate-800 truncate">
                      {selectedOriginalFile.name}
                    </span>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      ({(selectedOriginalFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOriginalFile(null);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-white transition-colors cursor-pointer"
                    title="Remove selected file"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Status Info */}
              {originalLogoUrl && !selectedOriginalFile && (
                <div className="flex items-center justify-between p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-xl mt-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                    <span className="text-xs font-medium text-emerald-800 truncate">
                      Active logo configured
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRemoveAllLogos()}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer shrink-0"
                  >
                    <Trash2 size={11} />
                    <span>Revert</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right: Active Logo Preview (Hospital Emblem & Flat Display) */}
            <div className="flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Logo Preview
                </label>
                {activeLogo ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Check size={11} strokeWidth={2.5} />
                    <span>Custom Logo Active</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    <Check size={11} strokeWidth={2.5} />
                    <span>Default Brand Logo</span>
                  </span>
                )}
              </div>

              <div className="flex-1 min-h-[160px] rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col items-center justify-center">
                {activeDisplayLogo && !livePreviewError ? (
                  <div className="w-full flex flex-col sm:flex-row items-center justify-center gap-4 p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    {/* Hospital Emblem Avatar */}
                    <div
                      className={`relative group shrink-0 ${activeLogo ? 'cursor-pointer' : ''}`}
                      onClick={() => activeLogo && handleOpenCropModal(activeDisplayLogo)}
                      title={activeLogo ? 'Click to crop and adjust emblem' : 'Default Brand Logo (Eclat Medi)'}
                    >
                      <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-200 bg-white p-1 flex items-center justify-center transition-transform group-hover:scale-105 shadow-2xs">
                        <img
                          src={activeDisplayLogo}
                          alt="Hospital Logo Preview"
                          className="w-full h-full object-contain"
                          onError={() => setLivePreviewError(true)}
                        />
                      </div>
                      {activeLogo && (
                        <>
                          <div className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-semibold pointer-events-none">
                            <Camera size={16} className="text-white mb-0.5" />
                            <span>Edit Logo</span>
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md border-2 border-white">
                            <Camera size={11} />
                          </div>
                        </>
                      )}
                    </div>

                    {/* Hospital Emblem Details */}
                    <div className="flex flex-col items-center sm:items-start text-center sm:text-left space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">
                          {activeLogo ? 'Custom Hospital Logo' : 'Default Brand Logo'}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            activeLogo
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}
                        >
                          {activeLogo ? 'Custom Active' : 'Default Active'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 max-w-[220px]">
                        {activeLogo
                          ? 'Custom uploaded logo active across navigation, sidebar, and headers.'
                          : 'Official ECLAT MEDI default logo active. Upload a custom logo above to replace it.'}
                      </p>
                      {activeLogo && (
                        <button
                          type="button"
                          onClick={() => handleOpenCropModal(activeDisplayLogo)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer pt-0.5"
                        >
                          <Crop size={12} />
                          <span>Crop &amp; Adjust Logo</span>
                        </button>
                      )}
                    </div>
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

          {/* Section: Logo Versions (Original vs Cropped & Zoomed) */}
          {(originalLogoUrl || croppedLogoUrl) && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Logo Versions &amp; Crop Options
                  </h3>
                  <p className="text-[11.5px] text-slate-500">
                    Manage original logo and cropped versions. Select which version appears in your application sidebar.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenCropModal()}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100/80 text-blue-700 text-xs font-semibold transition-colors shadow-2xs cursor-pointer self-start sm:self-auto shrink-0"
                >
                  <Crop size={13} />
                  <span>Crop &amp; Edit Logo</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Original Logo Version Card */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    activeVersion === 'original'
                      ? 'border-emerald-300 bg-emerald-50/30 shadow-2xs ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-slate-800">Original Logo</span>
                    {activeVersion === 'original' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <Check size={11} strokeWidth={2.5} />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-500">
                        Inactive
                      </span>
                    )}
                  </div>

                  <div className="h-28 rounded-lg bg-slate-50 border border-slate-200/70 p-2 flex items-center justify-center overflow-hidden mb-3">
                    {originalLogoUrl ? (
                      <img
                        src={
                          originalLogoUrl.startsWith('data:') || originalLogoUrl.startsWith('blob:')
                            ? originalLogoUrl
                            : getMediaProxyUrl(originalLogoUrl)
                        }
                        alt="Original Logo Version"
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[11px] text-slate-400">No original logo</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {activeVersion !== 'original' ? (
                      <button
                        type="button"
                        onClick={() => void handleSetActiveVersion('original')}
                        className="inline-flex items-center gap-1 h-7.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                      >
                        <Check size={12} />
                        <span>Set as Active</span>
                      </button>
                    ) : (
                      <span className="text-[11px] font-semibold text-emerald-700">
                        Currently displayed
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenCropModal(originalLogoUrl)}
                      className="inline-flex items-center gap-1 h-7.5 px-2.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100/70 text-xs font-semibold text-blue-700 transition-colors cursor-pointer shadow-2xs ml-auto"
                      title="Open crop and adjust tool"
                    >
                      <Crop size={12} />
                      <span>Crop / Edit</span>
                    </button>
                  </div>
                </div>

                {/* 2. Cropped Emblem Version Card */}
                {croppedLogoUrl ? (
                  <div
                    className={`p-4 rounded-xl border transition-all ${
                      activeVersion === 'cropped'
                        ? 'border-blue-500 bg-blue-50/20 shadow-2xs ring-2 ring-blue-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-800">Cropped Emblem</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Custom Version
                        </span>
                      </div>
                      {activeVersion === 'cropped' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <Check size={11} strokeWidth={2.5} />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-slate-100 text-slate-500">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="h-28 rounded-lg bg-slate-50 border border-slate-200/70 p-2 flex items-center justify-center overflow-hidden mb-3">
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-blue-400 shadow-sm bg-white flex items-center justify-center">
                        <img
                          src={
                            croppedLogoUrl.startsWith('data:') || croppedLogoUrl.startsWith('blob:')
                              ? croppedLogoUrl
                              : getMediaProxyUrl(croppedLogoUrl)
                          }
                          alt="Cropped Hospital Emblem"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      {activeVersion !== 'cropped' ? (
                        <button
                          type="button"
                          onClick={() => void handleSetActiveVersion('cropped')}
                          className="inline-flex items-center gap-1 h-7.5 px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-colors cursor-pointer"
                        >
                          <Check size={12} />
                          <span>Set as Active</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-700">
                          Currently displayed
                        </span>
                      )}

                      <div className="flex items-center gap-1.5 ml-auto">
                        <button
                          type="button"
                          onClick={() => handleOpenCropModal(originalLogoUrl)}
                          className="inline-flex items-center gap-1 h-7.5 px-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 transition-colors cursor-pointer shadow-2xs"
                          title="Tweak crop"
                        >
                          <Crop size={11} />
                          <span>Adjust</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleRemoveCroppedVersion}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete cropped version"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => handleOpenCropModal(originalLogoUrl)}
                    className="p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/40 hover:bg-blue-50/10 flex flex-col items-center justify-center text-center transition-all cursor-pointer min-h-[170px]"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2 shadow-2xs">
                      <Crop size={18} />
                    </div>
                    <span className="text-xs font-bold text-slate-700">No Cropped Version Yet</span>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-[220px]">
                      Click here to zoom in, pan, and adjust your hospital logo.
                    </p>
                    <span className="inline-flex items-center gap-1 mt-3 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold shadow-2xs transition-colors">
                      <Crop size={12} />
                      <span>Crop / Edit Logo</span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

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

      {/* Interactive Crop & Zoom Modal */}
      <ImageCropModal
        isOpen={isCropModalOpen}
        imageSrc={imageToCrop}
        onClose={() => setIsCropModalOpen(false)}
        onApplyCrop={handleApplyCrop}
      />
    </div>
  );
}
