import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Camera,
  Copy,
  Image as ImageIcon,
  Link as LinkIcon,
  Loader2,
  Lock,
  Maximize2,
  Palette,
  Plus,
  RotateCcw,
  Settings2,
  Sliders,
  Sparkles,
  Table as TableIcon,
  Trash2,
  Type,
  Unlock,
  Upload,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { resolveImageUrl } from '../../../../utils/doctorAvatar';
import { prescriptionTemplatesApi } from '../../services/prescriptionTemplatesApi';
import {
  DEFAULT_VITALS_FIELDS,
  type ImageBlockProps,
  type TemplateLayoutConfig,
  type TemplateSectionBlock,
  type TemplateThemeConfig,
  type VitalFieldConfig,
} from '../../types/template';

export interface SectionPropertyInspectorProps {
  layoutConfig: TemplateLayoutConfig;
  selectedSection: TemplateSectionBlock | null;
  hospitalId?: string | null | undefined;
  onChangeTheme: (theme: Partial<TemplateThemeConfig>) => void;
  onChangeSectionProps: (sectionId: string, props: Record<string, any>) => void;
  onDeleteSection?: ((sectionId: string) => void) | undefined;
  onDuplicateSection?: ((sectionId: string) => void) | undefined;
  activeCellTarget?: { sectionId: string; row: number; col: number } | null;
  onSelectCell?: (cell: { sectionId: string; row: number; col: number } | null) => void;
  onInsertToken?: (token: string) => void;
}

interface TemplateImageControlProps {
  label: string;
  sublabel?: string | undefined;
  imageUrl?: string | undefined;
  altText?: string | undefined;
  width?: string | undefined;
  height?: string | undefined;
  alignment?: 'left' | 'center' | 'right' | undefined;
  objectFit?: 'contain' | 'cover' | undefined;
  maintainAspectRatio?: boolean | undefined;
  caption?: string | undefined;
  showDimensions?: boolean | undefined;
  showAlignment?: boolean | undefined;
  showCaption?: boolean | undefined;
  showAlt?: boolean | undefined;
  hospitalId?: string | null | undefined;
  onChange: (props: Partial<ImageBlockProps> & Record<string, any>) => void;
  onRemove?: (() => void) | undefined;
}

export const TemplateImageControl: React.FC<TemplateImageControlProps> = ({
  label,
  sublabel,
  imageUrl = '',
  altText = 'Prescription Image',
  width = '60mm',
  height = 'auto',
  alignment = 'center',
  objectFit = 'contain',
  maintainAspectRatio = true,
  caption = '',
  showDimensions = true,
  showAlignment = true,
  showCaption = true,
  showAlt = true,
  hospitalId,
  onChange,
  onRemove,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [imageLoadError, setImageLoadError] = useState<boolean>(false);

  const displayImage = previewBlobUrl || imageUrl;

  // Resolve storage keys and unsigned S3 URLs through image proxy
  const resolvedSrc = useMemo(() => {
    if (!displayImage) return '';
    if (displayImage.startsWith('blob:') || displayImage.startsWith('data:')) {
      return displayImage;
    }
    return resolveImageUrl(displayImage) || displayImage;
  }, [displayImage]);

  // Reset load error whenever display source changes
  useEffect(() => {
    setImageLoadError(false);
  }, [displayImage]);

  const handleUploadFile = async (file: File) => {
    // 1. Validate file format
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!validMimes.includes(file.type.toLowerCase()) && !file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, or WEBP).');
      return;
    }

    // 2. Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size exceeds 10MB limit. Please choose a smaller image.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    // Create instant local preview blob
    const localUrl = URL.createObjectURL(file);
    setPreviewBlobUrl(localUrl);

    try {
      const uploadedUrl = await prescriptionTemplatesApi.uploadImage(file, hospitalId);
      if (!uploadedUrl) {
        throw new Error('No URL returned from server.');
      }
      onChange({ imageUrl: uploadedUrl });
      setPreviewBlobUrl(null);
    } catch (err: any) {
      console.error('Image upload failed:', err);
      setUploadError(err?.message || 'Failed to upload image. Please try again.');
      setPreviewBlobUrl(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleUploadFile(file);
    }
  };

  const handleClearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewBlobUrl(null);
    setUploadError(null);
    setImageLoadError(false);
    onChange({ imageUrl: '' });
    if (onRemove) {
      onRemove();
    }
  };

  return (
    <div className="space-y-3 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200 box-border w-full min-w-0 overflow-hidden">
      {/* Label & URL toggle */}
      <div className="flex items-center justify-between gap-1 min-w-0">
        <div className="min-w-0 flex-1">
          <span className="text-xs font-bold text-slate-800 block truncate">{label}</span>
          {sublabel && <span className="text-[10px] text-slate-400 block truncate">{sublabel}</span>}
        </div>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer shrink-0"
        >
          <LinkIcon size={11} />
          <span>{showUrlInput ? 'Hide URL' : 'Paste URL'}</span>
        </button>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={isUploading}
      />

      {/* Main Upload Box & Preview */}
      <div className="flex items-center gap-2.5 min-w-0 w-full">
        {/* Preview Frame with transparency pattern */}
        <div
          className="relative w-16 h-16 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs"
          style={{
            background:
              'repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 50% / 10px 10px',
          }}
        >
          {resolvedSrc && !imageLoadError ? (
            <img
              src={resolvedSrc}
              alt={altText}
              onError={() => setImageLoadError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: objectFit || 'contain',
              }}
            />
          ) : (
            <div className="text-center p-1 text-slate-400 flex flex-col items-center justify-center h-full">
              <ImageIcon size={22} className="mx-auto text-slate-400" />
              {imageLoadError ? (
                <span className="text-[8px] font-medium text-rose-500 mt-0.5 leading-tight">
                  Load Error
                </span>
              ) : (
                <span className="text-[8px] font-medium text-slate-400 mt-0.5 leading-tight">
                  No Image
                </span>
              )}
            </div>
          )}

          {isUploading && (
            <div className="absolute inset-0 bg-slate-900/60 flex items-center justify-center text-white">
              <Loader2 size={16} className="animate-spin" />
            </div>
          )}
        </div>

        {/* Upload Buttons */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="py-1 px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50 min-w-0"
            >
              {isUploading ? (
                <>
                  <Loader2 size={12} className="animate-spin text-blue-600 shrink-0" />
                  <span className="truncate">Uploading...</span>
                </>
              ) : displayImage ? (
                <>
                  <Camera size={12} className="text-slate-500 shrink-0" />
                  <span className="truncate">Replace Image</span>
                </>
              ) : (
                <>
                  <Upload size={12} className="text-blue-600 shrink-0" />
                  <span className="truncate">Upload Image</span>
                </>
              )}
            </button>

            {displayImage && !isUploading && (
              <button
                type="button"
                onClick={handleClearImage}
                className="p-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs cursor-pointer transition-colors shrink-0"
                title="Remove image"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>

          <p className="text-[10px] text-slate-400 mb-0 leading-tight">
            PNG (transparent), JPG, WEBP up to 10MB.
          </p>
        </div>
      </div>

      {/* Direct URL input if toggled */}
      {showUrlInput && (
        <div className="w-full min-w-0">
          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
            Direct Image URL / S3 Link
          </label>
          <input
            type="text"
            value={imageUrl}
            onChange={(e) => {
              setPreviewBlobUrl(null);
              onChange({ imageUrl: e.target.value });
            }}
            placeholder="https://.../logo.png"
            className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none box-border min-w-0"
          />
        </div>
      )}

      {/* Error feedback */}
      {uploadError && (
        <div className="text-[11px] text-rose-600 font-medium bg-rose-50 border border-rose-200 rounded-lg p-1.5 box-border min-w-0">
          {uploadError}
        </div>
      )}
      {imageLoadError && !isUploading && (
        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-1.5 leading-tight box-border min-w-0">
          Failed to load image preview. Please check image URL or upload a new image.
        </div>
      )}

      {/* Dimensions Controls */}
      {showDimensions && (
        <div className="space-y-2 pt-2 border-t border-slate-200 w-full min-w-0">
          <div className="flex items-center justify-between min-w-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase truncate">
              Dimensions &amp; Scaling
            </span>
            <button
              type="button"
              onClick={() => onChange({ maintainAspectRatio: !maintainAspectRatio })}
              className={`text-[10px] font-semibold flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded shrink-0 ${
                maintainAspectRatio
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
              title="Lock aspect ratio"
            >
              {maintainAspectRatio ? <Lock size={10} /> : <Unlock size={10} />}
              <span>{maintainAspectRatio ? 'Aspect Locked' : 'Freeform'}</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 min-w-0 w-full">
            <div className="min-w-0">
              <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">Width</label>
              <input
                type="text"
                value={width}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({
                    width: val,
                    ...(maintainAspectRatio ? { height: 'auto' } : {}),
                  });
                }}
                placeholder="60mm"
                className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none font-mono box-border min-w-0"
              />
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {['30mm', '60mm', '77mm', '100%'].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() =>
                      onChange({
                        width: w,
                        ...(maintainAspectRatio ? { height: 'auto' } : {}),
                      })
                    }
                    className="text-[9px] px-1 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono cursor-pointer shrink-0"
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-w-0">
              <label className="text-[10px] text-slate-500 block mb-0.5 font-medium">Height</label>
              <input
                type="text"
                value={height}
                onChange={(e) => onChange({ height: e.target.value })}
                placeholder="auto"
                className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none font-mono box-border min-w-0"
              />
              <div className="flex items-center gap-1 mt-1 flex-wrap">
                {['auto', '20mm', '32mm', '50mm'].map((h) => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => onChange({ height: h })}
                    className="text-[9px] px-1 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 font-mono cursor-pointer shrink-0"
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Alignment Controls */}
      {showAlignment && (
        <div className="space-y-1.5 pt-2 border-t border-slate-200 w-full min-w-0">
          <label className="text-[10px] font-bold text-slate-500 uppercase block">
            Horizontal Alignment
          </label>
          <div className="grid grid-cols-3 gap-1 min-w-0 w-full">
            <button
              type="button"
              onClick={() => onChange({ alignment: 'left' })}
              className={`py-1 px-1 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1 cursor-pointer transition-colors min-w-0 ${
                alignment === 'left'
                  ? 'bg-blue-50 text-blue-700 border-blue-400'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <AlignLeft size={12} className="shrink-0" />
              <span className="truncate">Left</span>
            </button>
            <button
              type="button"
              onClick={() => onChange({ alignment: 'center' })}
              className={`py-1 px-1 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1 cursor-pointer transition-colors min-w-0 ${
                alignment === 'center'
                  ? 'bg-blue-50 text-blue-700 border-blue-400'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <AlignCenter size={12} className="shrink-0" />
              <span className="truncate">Center</span>
            </button>
            <button
              type="button"
              onClick={() => onChange({ alignment: 'right' })}
              className={`py-1 px-1 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1 cursor-pointer transition-colors min-w-0 ${
                alignment === 'right'
                  ? 'bg-blue-50 text-blue-700 border-blue-400'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <AlignRight size={12} className="shrink-0" />
              <span className="truncate">Right</span>
            </button>
          </div>
        </div>
      )}

      {/* Object Fit Control */}
      {showDimensions && (
        <div className="space-y-1.5 pt-2 border-t border-slate-200 w-full min-w-0">
          <label className="text-[10px] font-bold text-slate-500 uppercase block">
            Object Fit / Aspect Style
          </label>
          <div className="grid grid-cols-2 gap-1.5 min-w-0 w-full">
            <button
              type="button"
              onClick={() => onChange({ objectFit: 'contain' })}
              className={`py-1.5 px-1.5 text-[11px] font-semibold rounded-lg border flex items-center justify-center gap-1 cursor-pointer transition-colors min-w-0 ${
                objectFit === 'contain'
                  ? 'bg-blue-50 text-blue-700 border-blue-400'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <Maximize2 size={11} className="shrink-0" />
              <span className="truncate">Contain (Scale)</span>
            </button>
            <button
              type="button"
              onClick={() => onChange({ objectFit: 'cover' })}
              className={`py-1.5 px-1.5 text-[11px] font-semibold rounded-lg border flex items-center justify-center gap-1 cursor-pointer transition-colors min-w-0 ${
                objectFit === 'cover'
                  ? 'bg-blue-50 text-blue-700 border-blue-400'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <Maximize2 size={11} className="shrink-0" />
              <span className="truncate">Cover (Fill)</span>
            </button>
          </div>
        </div>
      )}

      {/* Alt Text & Caption */}
      {(showAlt || showCaption) && (
        <div className="space-y-2 pt-2 border-t border-slate-200 w-full min-w-0">
          {showAlt && (
            <div className="w-full min-w-0">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                Alt Text (Accessibility)
              </label>
              <input
                type="text"
                value={altText}
                onChange={(e) => onChange({ altText: e.target.value })}
                placeholder="Prescription Image"
                className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none box-border min-w-0"
              />
            </div>
          )}

          {showCaption && (
            <div className="w-full min-w-0">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                Caption Text (Optional)
              </label>
              <input
                type="text"
                value={caption}
                onChange={(e) => onChange({ caption: e.target.value })}
                placeholder="e.g. Cancer Awareness / Accredited Center"
                className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none box-border min-w-0"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const COLOR_PRESETS = [
  { name: 'Annaamalai Purple', primary: '#67358f', secondary: '#69c9eb', accent: '#7a2886' },
  { name: 'Hospital Navy', primary: '#1e3a8a', secondary: '#38bdf8', accent: '#172554' },
  { name: 'Clinical Teal', primary: '#0f766e', secondary: '#2dd4bf', accent: '#115e59' },
  { name: 'Care Emerald', primary: '#047857', secondary: '#34d399', accent: '#064e3b' },
  { name: 'Medical Crimson', primary: '#be123c', secondary: '#fb7185', accent: '#881337' },
  { name: 'Modern Slate', primary: '#334155', secondary: '#94a3b8', accent: '#0f172a' },
];

const FONT_OPTIONS = [
  { label: 'Arial (Recommended for Print)', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Inter (Modern Sans)', value: 'Inter, system-ui, sans-serif' },
  { label: 'Roboto (Clean)', value: 'Roboto, Arial, sans-serif' },
  { label: 'Times New Roman (Serif)', value: '"Times New Roman", Times, serif' },
  { label: 'Segoe UI (Classic)', value: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' },
];

export const SectionPropertyInspector: React.FC<SectionPropertyInspectorProps> = ({
  layoutConfig,
  selectedSection,
  hospitalId,
  onChangeTheme,
  onChangeSectionProps,
  onDeleteSection,
  onDuplicateSection,
  activeCellTarget,
  onSelectCell,
  onInsertToken,
}) => {
  const theme = layoutConfig?.theme || {
    primaryColor: '#67358f',
    secondaryColor: '#69c9eb',
    accentColor: '#7a2886',
    headerBorderColor: '#69c9eb',
    fontFamily: 'Arial, Helvetica, sans-serif',
    fontSize: '11px',
    showTagline: true,
    customTagline: 'QUALITY OF LIFE – LIFE AFTER CANCER – HELP YOU TO LIVE BETTER BEYOND CANCER',
  };

  const [showAddCustomVital, setShowAddCustomVital] = useState(false);
  const [newVitalLabel, setNewVitalLabel] = useState('');
  const [newVitalUnit, setNewVitalUnit] = useState('');
  const [newVitalKey, setNewVitalKey] = useState('');

  return (
    <div className="flex flex-col h-full w-full min-w-0 bg-white overflow-hidden box-border">
      {/* Header */}
      <div className="p-3 border-b border-slate-200 bg-slate-50/80 shrink-0 select-none">
        <div className="flex items-center gap-1.5">
          <Settings2 size={14} className="text-blue-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800 truncate">Layout &amp; Style Inspector</span>
        </div>
        <p className="text-[10px] text-slate-500 mt-1 mb-0 leading-tight">
          Configure branding colors, typography and block properties.
        </p>
      </div>

      {/* Independent Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 p-3.5 space-y-4 box-border">
        {/* Section 1: Brand & Theme Styling */}
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-slate-800">
            <Palette size={13} className="text-purple-600" />
            <span>Theme Colors</span>
          </div>

          {/* Color Presets */}
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {COLOR_PRESETS.map((preset) => {
              const isSelected = theme.primaryColor.toLowerCase() === preset.primary.toLowerCase();
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() =>
                    onChangeTheme({
                      primaryColor: preset.primary,
                      secondaryColor: preset.secondary,
                      accentColor: preset.accent,
                      headerBorderColor: preset.secondary,
                    })
                  }
                  className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer transition-all min-w-0 ${
                    isSelected ? 'border-blue-600 bg-blue-50/50 shadow-2xs' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0 border border-black/10"
                    style={{ backgroundColor: preset.primary }}
                  />
                  <span className="text-[10px] font-semibold text-slate-700 truncate">{preset.name}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Color Pickers */}
          <div className="space-y-2 w-full min-w-0">
            <div className="w-full min-w-0">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Primary Brand Color
              </label>
              <div className="flex items-center gap-2 w-full min-w-0">
                <input
                  type="color"
                  value={theme.primaryColor}
                  onChange={(e) => onChangeTheme({ primaryColor: e.target.value })}
                  className="w-8 h-8 rounded border border-slate-200 p-0.5 cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={theme.primaryColor}
                  onChange={(e) => onChangeTheme({ primaryColor: e.target.value })}
                  className="flex-1 min-w-0 px-2.5 py-1 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg box-border"
                />
              </div>
            </div>

            <div className="w-full min-w-0">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Header &amp; Divider Line Color
              </label>
              <div className="flex items-center gap-2 w-full min-w-0">
                <input
                  type="color"
                  value={theme.secondaryColor}
                  onChange={(e) =>
                    onChangeTheme({
                      secondaryColor: e.target.value,
                      headerBorderColor: e.target.value,
                    })
                  }
                  className="w-8 h-8 rounded border border-slate-200 p-0.5 cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={theme.secondaryColor}
                  onChange={(e) =>
                    onChangeTheme({
                      secondaryColor: e.target.value,
                      headerBorderColor: e.target.value,
                    })
                  }
                  className="flex-1 min-w-0 px-2.5 py-1 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg box-border"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Typography */}
        <div className="pt-3 border-t border-slate-200">
          <div className="flex items-center gap-1.5 mb-2 text-xs font-bold text-slate-800">
            <Type size={13} className="text-blue-600" />
            <span>Typography</span>
          </div>

          <div className="space-y-2 w-full min-w-0">
            <div className="w-full min-w-0">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Font Family
              </label>
              <select
                value={theme.fontFamily}
                onChange={(e) => onChangeTheme({ fontFamily: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none box-border min-w-0"
              >
                {FONT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-full min-w-0">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Base Font Size
              </label>
              <select
                value={theme.fontSize}
                onChange={(e) => onChangeTheme({ fontSize: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none box-border min-w-0"
              >
                <option value="10px">10px - Compact</option>
                <option value="11px">11px - Standard Print</option>
                <option value="11.5px">11.5px - Medium</option>
                <option value="12px">12px - Large</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Contextual Properties for Selected Block */}
        {selectedSection && (
          <div className="pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2 gap-1 flex-wrap">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 min-w-0">
                <Sliders size={13} className="text-emerald-600 shrink-0" />
                <span className="truncate">Section: {selectedSection.title}</span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {onDuplicateSection && (
                  <button
                    type="button"
                    onClick={() => onDuplicateSection(selectedSection.id)}
                    className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer px-1.5 py-0.5 rounded hover:bg-blue-50 transition-colors"
                    title="Duplicate Element"
                  >
                    <Copy size={11} />
                    <span>Duplicate</span>
                  </button>
                )}
                {onDeleteSection && (
                  <button
                    type="button"
                    onClick={() => onDeleteSection(selectedSection.id)}
                    className="text-[10px] font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-0.5 cursor-pointer px-1.5 py-0.5 rounded hover:bg-rose-50 transition-colors"
                    title="Delete Element"
                  >
                    <Trash2 size={11} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>

            {/* CUSTOM_IMAGE Block Configuration */}
            {selectedSection.type === 'CUSTOM_IMAGE' && (
              <TemplateImageControl
                label="Custom Image / Banner"
                sublabel="Insert clinical diagrams, branding, or clinic stamps"
                imageUrl={selectedSection.props?.imageUrl || ''}
                altText={selectedSection.props?.altText || 'Prescription Image'}
                width={selectedSection.props?.width || '60mm'}
                height={selectedSection.props?.height || 'auto'}
                alignment={selectedSection.props?.alignment || 'center'}
                objectFit={selectedSection.props?.objectFit || 'contain'}
                maintainAspectRatio={selectedSection.props?.maintainAspectRatio ?? true}
                caption={selectedSection.props?.caption || ''}
                showDimensions={true}
                showAlignment={true}
                showCaption={true}
                showAlt={true}
                hospitalId={hospitalId}
                onChange={(updatedProps) =>
                  onChangeSectionProps(selectedSection.id, updatedProps)
                }
                onRemove={() =>
                  onChangeSectionProps(selectedSection.id, { imageUrl: '' })
                }
              />
            )}

            {/* HEADING Configuration */}
            {selectedSection.type === 'HEADING' && (
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">
                      Heading Text
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const current = selectedSection.props?.text ?? '';
                        onChangeSectionProps(selectedSection.id, {
                          text: current ? `${current} {{patient_name}}` : '{{patient_name}}',
                        });
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                      title="Insert dynamic placeholder into heading"
                    >
                      + Add Token
                    </button>
                  </div>
                  <input
                    type="text"
                    value={selectedSection.props?.text ?? 'PRESCRIPTION SUMMARY'}
                    onChange={(e) =>
                      onChangeSectionProps(selectedSection.id, { text: e.target.value })
                    }
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'copy';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const token = e.dataTransfer.getData('application/x-token') || e.dataTransfer.getData('text/plain');
                      if (token) {
                        const current = selectedSection.props?.text ?? '';
                        onChangeSectionProps(selectedSection.id, {
                          text: current ? `${current} ${token}` : token,
                        });
                      }
                    }}
                    placeholder="Enter heading or drop {{tokens}}..."
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none box-border min-w-0"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Heading Level
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {(['h1', 'h2', 'h3', 'custom'] as const).map((lvl) => {
                      const currentLevel = selectedSection.props?.level || 'h2';
                      const isSel = currentLevel === lvl;
                      return (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => {
                            const defaultSizes: Record<string, string> = {
                              h1: '18px',
                              h2: '14px',
                              h3: '12px',
                              custom: selectedSection.props?.fontSize || '13px',
                            };
                            onChangeSectionProps(selectedSection.id, {
                              level: lvl,
                              fontSize: defaultSizes[lvl],
                            });
                          }}
                          className={`py-1 text-xs font-bold uppercase rounded-lg border text-center cursor-pointer transition-colors ${
                            isSel
                              ? 'bg-blue-50 text-blue-700 border-blue-400'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {lvl}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Font Size
                    </label>
                    <select
                      value={selectedSection.props?.fontSize || '14px'}
                      onChange={(e) =>
                        onChangeSectionProps(selectedSection.id, { fontSize: e.target.value })
                      }
                      className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none box-border"
                    >
                      <option value="11px">11px - Small</option>
                      <option value="12px">12px - Regular</option>
                      <option value="13px">13px - Medium</option>
                      <option value="14px">14px - Large (H2)</option>
                      <option value="16px">16px - Extra Large</option>
                      <option value="18px">18px - Huge (H1)</option>
                      <option value="22px">22px - Display</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Weight
                    </label>
                    <select
                      value={selectedSection.props?.fontWeight || 'bold'}
                      onChange={(e) =>
                        onChangeSectionProps(selectedSection.id, { fontWeight: e.target.value })
                      }
                      className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none box-border"
                    >
                      <option value="normal">Normal (400)</option>
                      <option value="semibold">Semi-Bold (600)</option>
                      <option value="bold">Bold (700)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Text Alignment
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['left', 'center', 'right'] as const).map((aln) => {
                      const isSel = (selectedSection.props?.alignment || 'left') === aln;
                      return (
                        <button
                          key={aln}
                          type="button"
                          onClick={() => onChangeSectionProps(selectedSection.id, { alignment: aln })}
                          className={`py-1 text-xs font-semibold capitalize rounded-lg border flex items-center justify-center gap-1 cursor-pointer ${
                            isSel
                              ? 'bg-blue-50 text-blue-700 border-blue-400'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          {aln === 'left' ? <AlignLeft size={12} /> : aln === 'center' ? <AlignCenter size={12} /> : <AlignRight size={12} />}
                          <span>{aln}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Heading Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedSection.props?.color || theme.primaryColor}
                      onChange={(e) => onChangeSectionProps(selectedSection.id, { color: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-200 p-0.5 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={selectedSection.props?.color || theme.primaryColor}
                      onChange={(e) => onChangeSectionProps(selectedSection.id, { color: e.target.value })}
                      className="flex-1 min-w-0 px-2.5 py-1 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg box-border"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* PARAGRAPH Configuration */}
            {selectedSection.type === 'PARAGRAPH' && (
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">
                      Paragraph Content
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const current = selectedSection.props?.content ?? '';
                        onChangeSectionProps(selectedSection.id, {
                          content: current ? `${current} {{patient_name}}` : '{{patient_name}}',
                        });
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                      title="Insert dynamic placeholder into paragraph"
                    >
                      + Add Token
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={selectedSection.props?.content ?? ''}
                    onChange={(e) =>
                      onChangeSectionProps(selectedSection.id, { content: e.target.value })
                    }
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'copy';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const token = e.dataTransfer.getData('application/x-token') || e.dataTransfer.getData('text/plain');
                      if (token) {
                        const current = selectedSection.props?.content ?? '';
                        onChangeSectionProps(selectedSection.id, {
                          content: current ? `${current} ${token}` : token,
                        });
                      }
                    }}
                    placeholder="Enter text or drop {{placeholders}}..."
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg resize-y box-border min-w-0 leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Font Size
                    </label>
                    <select
                      value={selectedSection.props?.fontSize || '11px'}
                      onChange={(e) =>
                        onChangeSectionProps(selectedSection.id, { fontSize: e.target.value })
                      }
                      className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none box-border"
                    >
                      <option value="9.5px">9.5px - Compact</option>
                      <option value="10.5px">10.5px - Fine Print</option>
                      <option value="11px">11px - Standard</option>
                      <option value="12px">12px - Medium</option>
                      <option value="13px">13px - Large</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Font Weight
                    </label>
                    <select
                      value={selectedSection.props?.fontWeight || 'normal'}
                      onChange={(e) =>
                        onChangeSectionProps(selectedSection.id, { fontWeight: e.target.value })
                      }
                      className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none box-border"
                    >
                      <option value="normal">Normal</option>
                      <option value="medium">Medium</option>
                      <option value="semibold">Semi-Bold</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Alignment
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {(['left', 'center', 'right', 'justify'] as const).map((aln) => {
                      const isSel = (selectedSection.props?.alignment || 'left') === aln;
                      return (
                        <button
                          key={aln}
                          type="button"
                          onClick={() => onChangeSectionProps(selectedSection.id, { alignment: aln })}
                          className={`py-1 text-xs font-semibold capitalize rounded-lg border flex items-center justify-center gap-1 cursor-pointer ${
                            isSel
                              ? 'bg-blue-50 text-blue-700 border-blue-400'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          <span>{aln}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Text Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedSection.props?.color || '#202020'}
                      onChange={(e) => onChangeSectionProps(selectedSection.id, { color: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-200 p-0.5 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={selectedSection.props?.color || '#202020'}
                      onChange={(e) => onChangeSectionProps(selectedSection.id, { color: e.target.value })}
                      className="flex-1 min-w-0 px-2.5 py-1 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg box-border"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TABLE Configuration */}
            {selectedSection.type === 'TABLE' && (
              <div className="space-y-3.5 text-xs">
                {/* Table Mode: Static vs Dynamic */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Table Mode
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        onChangeSectionProps(selectedSection.id, { mode: 'static' })
                      }
                      className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                        (selectedSection.props?.mode || 'static') === 'static'
                          ? 'bg-blue-50 text-blue-700 border-blue-400'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <TableIcon size={12} />
                      <span>Static Table</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeSectionProps(selectedSection.id, {
                          mode: 'dynamic',
                          dynamicSource: selectedSection.props?.dynamicSource || 'medicines',
                        })
                      }
                      className={`py-1.5 px-2 text-[11px] font-semibold rounded-lg border flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                        selectedSection.props?.mode === 'dynamic'
                          ? 'bg-blue-50 text-blue-700 border-blue-400'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <Sparkles size={12} />
                      <span>Data-Driven</span>
                    </button>
                  </div>
                </div>

                {/* If Dynamic Mode: Select Data Source */}
                {selectedSection.props?.mode === 'dynamic' && (
                  <div className="p-2.5 bg-blue-50/50 rounded-lg border border-blue-200 space-y-2">
                    <label className="text-[10px] font-bold text-blue-800 uppercase block">
                      Dynamic Data Source
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          onChangeSectionProps(selectedSection.id, { dynamicSource: 'medicines' })
                        }
                        className={`py-1 px-2 text-[11px] font-semibold rounded border cursor-pointer ${
                          (selectedSection.props?.dynamicSource || 'medicines') === 'medicines'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Prescribed Medicines
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          onChangeSectionProps(selectedSection.id, { dynamicSource: 'lab_tests' })
                        }
                        className={`py-1 px-2 text-[11px] font-semibold rounded border cursor-pointer ${
                          selectedSection.props?.dynamicSource === 'lab_tests'
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Lab Investigations
                      </button>
                    </div>
                    <p className="text-[10px] text-blue-700 mb-0 leading-tight">
                      Dynamically maps rows and columns to patient consultation clinical data.
                    </p>
                  </div>
                )}

                {/* Grid Dimensions */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Rows ({selectedSection.props?.rows || 3})
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Decrease rows"
                        onClick={() => {
                          const currentRows = Math.max(1, (selectedSection.props?.rows || 3) - 1);
                          const currentData = (selectedSection.props?.data || []).slice(0, currentRows);
                          onChangeSectionProps(selectedSection.id, {
                            rows: currentRows,
                            data: currentData,
                          });
                        }}
                        className="p-1 px-2 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center font-mono font-bold text-slate-800">
                        {selectedSection.props?.rows || 3}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase rows"
                        onClick={() => {
                          const currentRows = (selectedSection.props?.rows || 3) + 1;
                          const cols = selectedSection.props?.columns || 3;
                          const currentData = [...(selectedSection.props?.data || [])];
                          while (currentData.length < currentRows - 1) {
                            currentData.push(Array.from({ length: cols }, () => ''));
                          }
                          currentData.push(Array.from({ length: cols }, () => ''));
                          onChangeSectionProps(selectedSection.id, {
                            rows: currentRows,
                            data: currentData,
                          });
                        }}
                        className="p-1 px-2 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Columns ({selectedSection.props?.columns || 3})
                    </label>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label="Decrease columns"
                        onClick={() => {
                          const currentCols = Math.max(1, (selectedSection.props?.columns || 3) - 1);
                          const headers = (selectedSection.props?.headers || []).slice(0, currentCols);
                          const widths = (selectedSection.props?.columnWidths || []).slice(0, currentCols);
                          const aligns = (selectedSection.props?.alignments || []).slice(0, currentCols);
                          const currentData = (selectedSection.props?.data || []).map((row: string[]) =>
                            row.slice(0, currentCols)
                          );
                          onChangeSectionProps(selectedSection.id, {
                            columns: currentCols,
                            headers,
                            columnWidths: widths,
                            alignments: aligns,
                            data: currentData,
                          });
                        }}
                        className="p-1 px-2 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="flex-1 text-center font-mono font-bold text-slate-800">
                        {selectedSection.props?.columns || 3}
                      </span>
                      <button
                        type="button"
                        aria-label="Increase columns"
                        onClick={() => {
                          const currentCols = Math.min(8, (selectedSection.props?.columns || 3) + 1);
                          const headers = [...(selectedSection.props?.headers || [])];
                          while (headers.length < currentCols) {
                            headers.push(`Column ${headers.length + 1}`);
                          }
                          const widths = [...(selectedSection.props?.columnWidths || [])];
                          const aligns = [...(selectedSection.props?.alignments || [])];
                          const currentData = (selectedSection.props?.data || []).map((row: string[]) => {
                            const newRow = [...row];
                            while (newRow.length < currentCols) newRow.push('');
                            return newRow;
                          });
                          onChangeSectionProps(selectedSection.id, {
                            columns: currentCols,
                            headers,
                            columnWidths: widths,
                            alignments: aligns,
                            data: currentData,
                          });
                        }}
                        className="p-1 px-2 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Column Headers, Widths, Alignment & Reordering */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">
                      Column Settings &amp; Reordering
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const currentCols = (selectedSection.props?.columns || 3) + 1;
                        const headers = [...(selectedSection.props?.headers || [])];
                        headers.push(`Column ${headers.length + 1}`);
                        const widths = [...(selectedSection.props?.columnWidths || [])];
                        const aligns = [...(selectedSection.props?.alignments || [])];
                        const currentData = (selectedSection.props?.data || []).map((row: string[]) => {
                          const newRow = [...row];
                          newRow.push('');
                          return newRow;
                        });
                        onChangeSectionProps(selectedSection.id, {
                          columns: currentCols,
                          headers,
                          columnWidths: widths,
                          alignments: aligns,
                          data: currentData,
                        });
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus size={11} /> Add Column
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-0.5">
                    {Array.from({ length: selectedSection.props?.columns || 3 }).map((_, cIdx) => {
                      const cols = selectedSection.props?.columns || 3;
                      const currentHeaders = selectedSection.props?.headers || ['#', 'Item', 'Instructions'];
                      const val = currentHeaders[cIdx] || `Column ${cIdx + 1}`;
                      const widths = selectedSection.props?.columnWidths || [];
                      const colWidth = widths[cIdx] || 'auto';
                      const aligns = selectedSection.props?.alignments || [];
                      const align = aligns[cIdx] || 'left';

                      const handleMoveColumn = (dir: -1 | 1) => {
                        const targetIdx = cIdx + dir;
                        if (targetIdx < 0 || targetIdx >= cols) return;

                        const newHeaders = [...currentHeaders];
                        while (newHeaders.length < cols) newHeaders.push(`Column ${newHeaders.length + 1}`);
                        const tempH = newHeaders[cIdx] ?? '';
                        newHeaders[cIdx] = newHeaders[targetIdx] ?? '';
                        newHeaders[targetIdx] = tempH;

                        const newWidths = [...widths];
                        while (newWidths.length < cols) newWidths.push('');
                        const tempW = newWidths[cIdx] ?? '';
                        newWidths[cIdx] = newWidths[targetIdx] ?? '';
                        newWidths[targetIdx] = tempW;

                        const newAligns = [...aligns];
                        while (newAligns.length < cols) newAligns.push('left');
                        const tempA = newAligns[cIdx] ?? 'left';
                        newAligns[cIdx] = newAligns[targetIdx] ?? 'left';
                        newAligns[targetIdx] = tempA;

                        const currentData: string[][] = selectedSection.props?.data || [];
                        const newData = currentData.map((row) => {
                          const newRow = [...row];
                          while (newRow.length < cols) newRow.push('');
                          const tempCell = newRow[cIdx] ?? '';
                          newRow[cIdx] = newRow[targetIdx] ?? '';
                          newRow[targetIdx] = tempCell;
                          return newRow;
                        });

                        onChangeSectionProps(selectedSection.id, {
                          headers: newHeaders,
                          columnWidths: newWidths,
                          alignments: newAligns,
                          data: newData,
                        });
                      };

                      const handleDeleteColumn = () => {
                        if (cols <= 1) return;
                        const newHeaders = [...currentHeaders];
                        newHeaders.splice(cIdx, 1);
                        const newWidths = [...widths];
                        newWidths.splice(cIdx, 1);
                        const newAligns = [...aligns];
                        newAligns.splice(cIdx, 1);
                        const currentData: string[][] = selectedSection.props?.data || [];
                        const newData = currentData.map((row) => {
                          const newRow = [...row];
                          newRow.splice(cIdx, 1);
                          return newRow;
                        });
                        onChangeSectionProps(selectedSection.id, {
                          columns: cols - 1,
                          headers: newHeaders,
                          columnWidths: newWidths,
                          alignments: newAligns,
                          data: newData,
                        });
                      };

                      return (
                        <div key={cIdx} className="p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5">
                          <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1 font-bold text-slate-700">
                              <span className="text-slate-400 font-mono">{cIdx + 1}.</span>
                              <span>Column {cIdx + 1}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={cIdx === 0}
                                onClick={() => handleMoveColumn(-1)}
                                className="p-1 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none rounded border border-slate-200 text-slate-600 cursor-pointer"
                                title="Move Left"
                              >
                                <ArrowLeft size={11} />
                              </button>
                              <button
                                type="button"
                                disabled={cIdx === cols - 1}
                                onClick={() => handleMoveColumn(1)}
                                className="p-1 bg-white hover:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none rounded border border-slate-200 text-slate-600 cursor-pointer"
                                title="Move Right"
                              >
                                <ArrowRight size={11} />
                              </button>
                              {cols > 1 && (
                                <button
                                  type="button"
                                  onClick={handleDeleteColumn}
                                  className="p-1 bg-white hover:bg-rose-50 rounded border border-slate-200 text-rose-600 cursor-pointer"
                                  title="Delete Column"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="space-y-1">
                            <input
                              type="text"
                              value={val}
                              placeholder="Header Title"
                              onChange={(e) => {
                                const updatedHeaders = [...currentHeaders];
                                updatedHeaders[cIdx] = e.target.value;
                                onChangeSectionProps(selectedSection.id, { headers: updatedHeaders });
                              }}
                              className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-none"
                            />
                            <div className="flex items-center gap-1.5">
                              {/* Width Selector */}
                              <select
                                value={colWidth}
                                onChange={(e) => {
                                  const updatedWidths = [...widths];
                                  while (updatedWidths.length < cols) updatedWidths.push('');
                                  updatedWidths[cIdx] = e.target.value === 'auto' ? '' : e.target.value;
                                  onChangeSectionProps(selectedSection.id, { columnWidths: updatedWidths });
                                }}
                                className="flex-1 px-1.5 py-0.5 text-[11px] bg-white border border-slate-200 rounded text-slate-700"
                              >
                                <option value="auto">Auto Width</option>
                                <option value="10%">10% (Narrow / #)</option>
                                <option value="15%">15%</option>
                                <option value="20%">20%</option>
                                <option value="25%">25%</option>
                                <option value="35%">35% (Medium)</option>
                                <option value="50%">50% (Wide)</option>
                              </select>

                              {/* Alignment Buttons */}
                              <div className="flex items-center rounded border border-slate-200 bg-white overflow-hidden shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedAligns = [...aligns];
                                    while (updatedAligns.length < cols) updatedAligns.push('left');
                                    updatedAligns[cIdx] = 'left';
                                    onChangeSectionProps(selectedSection.id, { alignments: updatedAligns });
                                  }}
                                  className={`p-1 ${align === 'left' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}
                                  title="Left Align"
                                >
                                  <AlignLeft size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedAligns = [...aligns];
                                    while (updatedAligns.length < cols) updatedAligns.push('left');
                                    updatedAligns[cIdx] = 'center';
                                    onChangeSectionProps(selectedSection.id, { alignments: updatedAligns });
                                  }}
                                  className={`p-1 ${align === 'center' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}
                                  title="Center Align"
                                >
                                  <AlignCenter size={11} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updatedAligns = [...aligns];
                                    while (updatedAligns.length < cols) updatedAligns.push('left');
                                    updatedAligns[cIdx] = 'right';
                                    onChangeSectionProps(selectedSection.id, { alignments: updatedAligns });
                                  }}
                                  className={`p-1 ${align === 'right' ? 'bg-blue-100 text-blue-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}
                                  title="Right Align"
                                >
                                  <AlignRight size={11} />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Table Cell Contents Editor */}
                <div className="pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">
                      Table Cell Contents
                    </label>
                    <span className="text-[10px] text-blue-600 font-medium">
                      Supports Text &amp; Placeholders
                    </span>
                  </div>

                  {/* Active Cell Banner */}
                  {activeCellTarget && activeCellTarget.sectionId === selectedSection.id && (
                    <div className="mb-2 px-2 py-1 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-700 flex items-center justify-between">
                      <span>
                        Editing: <b>Row {activeCellTarget.row + 1}, Col {activeCellTarget.col + 1}</b> ({selectedSection.props?.headers?.[activeCellTarget.col] || `Col ${activeCellTarget.col + 1}`})
                      </span>
                      <button
                        type="button"
                        onClick={() => onSelectCell?.(null)}
                        className="text-blue-500 hover:text-blue-800 text-[10px] cursor-pointer"
                      >
                        Done
                      </button>
                    </div>
                  )}

                  {/* Cell grid by row */}
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
                    {Array.from({ length: selectedSection.props?.rows || 3 }).map((_, r) => {
                      const currentRows = selectedSection.props?.rows || 3;
                      const cols = selectedSection.props?.columns || 3;
                      const currentHeaders = selectedSection.props?.headers || ['#', 'Item', 'Instructions'];
                      const currentData: string[][] = selectedSection.props?.data || [];
                      const rowData = currentData[r] || [];

                      const handleMoveRow = (dir: -1 | 1) => {
                        const targetR = r + dir;
                        if (targetR < 0 || targetR >= currentRows) return;
                        const updatedData = [...currentData];
                        while (updatedData.length < currentRows) {
                          updatedData.push(Array.from({ length: cols }, () => ''));
                        }
                        const temp = updatedData[r];
                        const target = updatedData[targetR];
                        if (temp && target) {
                          updatedData[r] = target;
                          updatedData[targetR] = temp;
                          onChangeSectionProps(selectedSection.id, { data: updatedData });
                        }
                      };

                      const handleDuplicateRow = () => {
                        const updatedData = [...currentData];
                        while (updatedData.length < currentRows) {
                          updatedData.push(Array.from({ length: cols }, () => ''));
                        }
                        const clonedRow = [...(updatedData[r] || Array.from({ length: cols }, () => ''))];
                        updatedData.splice(r + 1, 0, clonedRow);
                        onChangeSectionProps(selectedSection.id, {
                          rows: currentRows + 1,
                          data: updatedData,
                        });
                      };

                      return (
                        <div
                          key={r}
                          className="p-2 bg-slate-50 border border-slate-200 rounded-lg space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-700">Row {r + 1}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={r === 0}
                                onClick={() => handleMoveRow(-1)}
                                className="p-0.5 px-1 text-[10px] bg-white hover:bg-slate-100 disabled:opacity-30 rounded border border-slate-200 text-slate-600 cursor-pointer"
                                title="Move Up"
                              >
                                <ArrowUp size={10} />
                              </button>
                              <button
                                type="button"
                                disabled={r === currentRows - 1}
                                onClick={() => handleMoveRow(1)}
                                className="p-0.5 px-1 text-[10px] bg-white hover:bg-slate-100 disabled:opacity-30 rounded border border-slate-200 text-slate-600 cursor-pointer"
                                title="Move Down"
                              >
                                <ArrowDown size={10} />
                              </button>
                              <button
                                type="button"
                                onClick={handleDuplicateRow}
                                className="px-1.5 py-0.5 text-[10px] font-medium bg-white hover:bg-indigo-50 text-indigo-600 rounded border border-slate-200 cursor-pointer flex items-center gap-0.5"
                                title="Duplicate this row"
                              >
                                <Copy size={9} />
                                <span>Copy</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  // Add row below this row
                                  const updatedData = [...currentData];
                                  while (updatedData.length < currentRows) {
                                    updatedData.push(Array.from({ length: cols }, () => ''));
                                  }
                                  updatedData.splice(r + 1, 0, Array.from({ length: cols }, () => ''));
                                  onChangeSectionProps(selectedSection.id, {
                                    rows: currentRows + 1,
                                    data: updatedData,
                                  });
                                }}
                                className="px-1.5 py-0.5 text-[10px] font-medium bg-white hover:bg-blue-50 text-blue-600 rounded border border-slate-200 cursor-pointer"
                                title="Add row below"
                              >
                                + Row
                              </button>
                              {currentRows > 1 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    // Delete this row
                                    const updatedData = [...currentData];
                                    while (updatedData.length < currentRows) {
                                      updatedData.push(Array.from({ length: cols }, () => ''));
                                    }
                                    updatedData.splice(r, 1);
                                    onChangeSectionProps(selectedSection.id, {
                                      rows: currentRows - 1,
                                      data: updatedData,
                                    });
                                    if (activeCellTarget?.row === r) {
                                      onSelectCell?.(null);
                                    }
                                  }}
                                  className="px-1.5 py-0.5 text-[10px] font-medium bg-white hover:bg-rose-50 text-rose-600 rounded border border-slate-200 cursor-pointer"
                                  title="Delete this row"
                                >
                                  ✕
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  // Clear this row
                                  const updatedData = [...currentData];
                                  while (updatedData.length < currentRows) {
                                    updatedData.push(Array.from({ length: cols }, () => ''));
                                  }
                                  updatedData[r] = Array.from({ length: cols }, () => '');
                                  onChangeSectionProps(selectedSection.id, {
                                    data: updatedData,
                                  });
                                }}
                                className="px-1.5 py-0.5 text-[10px] font-medium bg-white hover:bg-slate-100 text-slate-500 rounded border border-slate-200 cursor-pointer"
                                title="Clear row cells"
                              >
                                Clear
                              </button>
                            </div>
                          </div>

                          {/* Inputs for each column */}
                          <div className="space-y-1">
                            {Array.from({ length: cols }).map((_, c) => {
                              const colHeader = currentHeaders[c] || `Col ${c + 1}`;
                              const cellValue = rowData[c] ?? '';
                              const isActive =
                                activeCellTarget?.sectionId === selectedSection.id &&
                                activeCellTarget.row === r &&
                                activeCellTarget.col === c;

                              return (
                                <div key={c} className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-slate-400 font-medium w-16 truncate text-right shrink-0" title={colHeader}>
                                    {colHeader}:
                                  </span>
                                  <div className="relative flex-1 min-w-0">
                                    <input
                                      type="text"
                                      value={cellValue}
                                      onFocus={() => {
                                        onSelectCell?.({ sectionId: selectedSection.id, row: r, col: c });
                                      }}
                                      onChange={(e) => {
                                        const updatedData = [...currentData];
                                        while (updatedData.length < currentRows) {
                                          updatedData.push(Array.from({ length: cols }, () => ''));
                                        }
                                        const updatedRow = [...(updatedData[r] || Array.from({ length: cols }, () => ''))];
                                        while (updatedRow.length < cols) updatedRow.push('');
                                        updatedRow[c] = e.target.value;
                                        updatedData[r] = updatedRow;
                                        onChangeSectionProps(selectedSection.id, { data: updatedData });
                                      }}
                                      onDragOver={(e) => {
                                        e.preventDefault();
                                        e.dataTransfer.dropEffect = 'copy';
                                      }}
                                      onDrop={(e) => {
                                        e.preventDefault();
                                        const token = e.dataTransfer.getData('application/x-token') || e.dataTransfer.getData('text/plain');
                                        if (token) {
                                          const updatedData = [...currentData];
                                          while (updatedData.length < currentRows) {
                                            updatedData.push(Array.from({ length: cols }, () => ''));
                                          }
                                          const updatedRow = [...(updatedData[r] || Array.from({ length: cols }, () => ''))];
                                          while (updatedRow.length < cols) updatedRow.push('');
                                          const cur = updatedRow[c] || '';
                                          updatedRow[c] = cur ? `${cur} ${token}` : token;
                                          updatedData[r] = updatedRow;
                                          onChangeSectionProps(selectedSection.id, { data: updatedData });
                                          onSelectCell?.({ sectionId: selectedSection.id, row: r, col: c });
                                        }
                                      }}
                                      placeholder={`Row ${r + 1}, ${colHeader}`}
                                      className={`w-full pl-2 pr-7 py-1 text-xs rounded border transition-colors ${
                                        isActive
                                          ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/30'
                                          : 'border-slate-200 bg-white hover:border-slate-300'
                                      } ${cellValue.includes('{{') ? 'font-mono text-blue-700 font-semibold' : 'text-slate-800'}`}
                                    />
                                    {/* Quick token insert button */}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onSelectCell?.({ sectionId: selectedSection.id, row: r, col: c });
                                        if (onInsertToken) {
                                          onInsertToken('{{patient_name}}');
                                        }
                                      }}
                                      className="absolute right-1 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-blue-600 px-1 py-0.5 rounded hover:bg-slate-100 font-mono cursor-pointer"
                                      title="Insert {{patient_name}} into this cell"
                                    >
                                      &#123;&#43;&#125;
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Quick table actions */}
                  <div className="flex items-center gap-1.5 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const currentRows = (selectedSection.props?.rows || 3) + 1;
                        const cols = selectedSection.props?.columns || 3;
                        const currentData = [...(selectedSection.props?.data || [])];
                        currentData.push(Array.from({ length: cols }, () => ''));
                        onChangeSectionProps(selectedSection.id, {
                          rows: currentRows,
                          data: currentData,
                        });
                      }}
                      className="flex-1 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 cursor-pointer text-center"
                    >
                      + Add Row
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const cols = selectedSection.props?.columns || 3;
                        const rows = selectedSection.props?.rows || 3;
                        const emptyData = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ''));
                        onChangeSectionProps(selectedSection.id, { data: emptyData });
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {/* Table Styling & Appearance */}
                <div className="pt-3 border-t border-slate-200 space-y-2.5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">
                    Table Styling &amp; Appearance
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSection.props?.bordered ?? true}
                      onChange={(e) =>
                        onChangeSectionProps(selectedSection.id, { bordered: e.target.checked })
                      }
                      className="rounded text-blue-600"
                    />
                    <span className="font-medium text-slate-700">Display Grid Cell Borders</span>
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                        Header Background
                      </label>
                      <input
                        type="color"
                        value={selectedSection.props?.headerBg || '#f8fafc'}
                        onChange={(e) =>
                          onChangeSectionProps(selectedSection.id, { headerBg: e.target.value })
                        }
                        className="w-full h-7 rounded border border-slate-200 cursor-pointer p-0.5 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 block mb-0.5">
                        Border Color
                      </label>
                      <input
                        type="color"
                        value={selectedSection.props?.borderColor || '#cbd5e1'}
                        onChange={(e) =>
                          onChangeSectionProps(selectedSection.id, { borderColor: e.target.value })
                        }
                        className="w-full h-7 rounded border border-slate-200 cursor-pointer p-0.5 bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                      Cell Padding
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { label: 'Compact', val: '1.5mm 1mm' },
                        { label: 'Standard', val: '2mm 1.5mm' },
                        { label: 'Spacious', val: '3mm 2.5mm' },
                      ].map((pad) => (
                        <button
                          key={pad.label}
                          type="button"
                          onClick={() =>
                            onChangeSectionProps(selectedSection.id, { cellPadding: pad.val })
                          }
                          className={`py-1 text-[10px] font-semibold rounded border cursor-pointer ${
                            (selectedSection.props?.cellPadding || '2mm 1.5mm') === pad.val
                              ? 'bg-blue-50 text-blue-700 border-blue-400 font-bold'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {pad.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">
                      Table Font Size
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {['9px', '10px', '11px', '12px'].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() =>
                            onChangeSectionProps(selectedSection.id, { fontSize: sz })
                          }
                          className={`py-1 text-[10px] font-semibold rounded border cursor-pointer ${
                            (selectedSection.props?.fontSize || '10px') === sz
                              ? 'bg-blue-50 text-blue-700 border-blue-400 font-bold'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* VITALS_BLOCK Configuration */}
            {selectedSection.type === 'VITALS_BLOCK' && (
              <div className="space-y-3.5 text-xs">
                {/* Title display & text */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedSection.props?.showTitle ?? true}
                      onChange={(e) =>
                        onChangeSectionProps(selectedSection.id, { showTitle: e.target.checked })
                      }
                      className="rounded text-blue-600"
                    />
                    <span className="font-bold text-slate-700">Display Section Header Title</span>
                  </label>

                  {(selectedSection.props?.showTitle ?? true) && (
                    <input
                      type="text"
                      value={selectedSection.props?.title ?? 'Physical Vitals & Metrics'}
                      placeholder="Section Title"
                      onChange={(e) =>
                        onChangeSectionProps(selectedSection.id, { title: e.target.value })
                      }
                      className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
                    />
                  )}
                </div>

                {/* Columns Per Row Selector */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Columns Per Row ({selectedSection.props?.columnsPerRow || 4} Cols)
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {[2, 3, 4, 6].map((colNum) => (
                      <button
                        key={colNum}
                        type="button"
                        onClick={() =>
                          onChangeSectionProps(selectedSection.id, { columnsPerRow: colNum })
                        }
                        className={`py-1.5 text-xs font-semibold rounded-lg border cursor-pointer transition-colors ${
                          (selectedSection.props?.columnsPerRow || 4) === colNum
                            ? 'bg-blue-50 text-blue-700 border-blue-400 shadow-2xs font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {colNum} Cols
                      </button>
                    ))}
                  </div>
                </div>

                {/* Active Vital Fields list */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">
                      Active Vital Fields
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        onChangeSectionProps(selectedSection.id, {
                          fields: DEFAULT_VITALS_FIELDS,
                          columnsPerRow: 4,
                        })
                      }
                      className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-0.5 cursor-pointer"
                      title="Reset to default vital fields"
                    >
                      <RotateCcw size={10} /> Reset
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
                    {(() => {
                      const fields: VitalFieldConfig[] =
                        Array.isArray(selectedSection.props?.fields) && selectedSection.props.fields.length > 0
                          ? selectedSection.props.fields
                          : DEFAULT_VITALS_FIELDS;

                      return fields.map((field, idx) => {
                        const isEnabled = field.enabled !== false;

                        const handleToggle = () => {
                          const updated = fields.map((f, i) =>
                            i === idx ? { ...f, enabled: !isEnabled } : f
                          );
                          onChangeSectionProps(selectedSection.id, { fields: updated });
                        };

                        const handleLabelChange = (newLabel: string) => {
                          const updated = fields.map((f, i) =>
                            i === idx ? { ...f, label: newLabel } : f
                          );
                          onChangeSectionProps(selectedSection.id, { fields: updated });
                        };

                        const handleUnitChange = (newUnit: string) => {
                          const updated = fields.map((f, i) =>
                            i === idx ? { ...f, unit: newUnit } : f
                          );
                          onChangeSectionProps(selectedSection.id, { fields: updated });
                        };

                        const handleMove = (dir: -1 | 1) => {
                          const targetIdx = idx + dir;
                          if (targetIdx < 0 || targetIdx >= fields.length) return;
                          const updated = [...fields];
                          const temp = updated[idx];
                          const target = updated[targetIdx];
                          if (temp && target) {
                            updated[idx] = target;
                            updated[targetIdx] = temp;
                            onChangeSectionProps(selectedSection.id, { fields: updated });
                          }
                        };

                        const handleDelete = () => {
                          const updated = fields.filter((_, i) => i !== idx);
                          onChangeSectionProps(selectedSection.id, { fields: updated });
                        };

                        return (
                          <div
                            key={field.id || field.key || idx}
                            className={`p-1.5 rounded-lg border transition-colors ${
                              isEnabled
                                ? 'bg-slate-50/80 border-slate-200'
                                : 'bg-slate-100/50 border-slate-200/60 opacity-60'
                            }`}
                          >
                            <div className="flex items-center gap-1.5">
                              <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={handleToggle}
                                className="rounded text-blue-600 shrink-0"
                              />
                              <input
                                type="text"
                                value={field.label}
                                onChange={(e) => handleLabelChange(e.target.value)}
                                placeholder="Field Label"
                                className="flex-1 min-w-0 px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded font-medium text-slate-800"
                              />
                              <input
                                type="text"
                                value={field.unit}
                                onChange={(e) => handleUnitChange(e.target.value)}
                                placeholder="Unit"
                                className="w-16 px-1.5 py-0.5 text-xs bg-white border border-slate-200 rounded text-slate-600 text-center shrink-0"
                                title="Measurement unit (e.g. mmHg, mg/dL)"
                              />
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  disabled={idx === 0}
                                  onClick={() => handleMove(-1)}
                                  className="p-1 bg-white hover:bg-slate-100 disabled:opacity-30 rounded border border-slate-200 text-slate-600 cursor-pointer"
                                  title="Move Up"
                                >
                                  <ArrowUp size={10} />
                                </button>
                                <button
                                  type="button"
                                  disabled={idx === fields.length - 1}
                                  onClick={() => handleMove(1)}
                                  className="p-1 bg-white hover:bg-slate-100 disabled:opacity-30 rounded border border-slate-200 text-slate-600 cursor-pointer"
                                  title="Move Down"
                                >
                                  <ArrowDown size={10} />
                                </button>
                                {field.isCustom && (
                                  <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="p-1 bg-white hover:bg-rose-50 rounded border border-slate-200 text-rose-600 cursor-pointer"
                                    title="Delete Custom Vital"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="mt-1 flex items-center justify-between pl-5 pr-1">
                              <span className="font-mono text-[9.5px] text-slate-400">
                                &#123;&#123;{field.key}&#125;&#125;
                              </span>
                              {field.isCustom && (
                                <span className="text-[9px] font-semibold text-purple-600 bg-purple-50 px-1 rounded">
                                  Custom Field
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Add Custom Vital Field */}
                <div className="pt-2 border-t border-slate-200">
                  {!showAddCustomVital ? (
                    <button
                      type="button"
                      onClick={() => setShowAddCustomVital(true)}
                      className="w-full py-1.5 text-xs font-semibold rounded-lg border border-dashed border-blue-300 bg-blue-50/50 hover:bg-blue-50 text-blue-700 flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus size={12} />
                      <span>Add Custom Vital Field</span>
                    </button>
                  ) : (
                    <div className="p-2.5 bg-slate-50 border border-blue-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700">Add Custom Vital</span>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddCustomVital(false);
                            setNewVitalLabel('');
                            setNewVitalUnit('');
                            setNewVitalKey('');
                          }}
                          className="text-[11px] text-slate-400 hover:text-slate-600"
                        >
                          ✕
                        </button>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                          Field Label
                        </label>
                        <input
                          type="text"
                          value={newVitalLabel}
                          onChange={(e) => {
                            setNewVitalLabel(e.target.value);
                            if (!newVitalKey || newVitalKey === newVitalLabel.toLowerCase().replace(/[^a-z0-9]+/g, '_')) {
                              setNewVitalKey(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_'));
                            }
                          }}
                          placeholder="e.g. Oxygen Saturation (SpO2)"
                          className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-none"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                            Unit
                          </label>
                          <input
                            type="text"
                            value={newVitalUnit}
                            onChange={(e) => setNewVitalUnit(e.target.value)}
                            placeholder="e.g. % or cm"
                            className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">
                            Data Key
                          </label>
                          <input
                            type="text"
                            value={newVitalKey}
                            onChange={(e) => setNewVitalKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, ''))}
                            placeholder="e.g. spo2"
                            className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded font-mono text-[11px] focus:outline-none"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!newVitalLabel.trim() || !newVitalKey.trim()}
                        onClick={() => {
                          const fields: VitalFieldConfig[] =
                            Array.isArray(selectedSection.props?.fields) && selectedSection.props.fields.length > 0
                              ? [...selectedSection.props.fields]
                              : [...DEFAULT_VITALS_FIELDS];

                          const newField: VitalFieldConfig = {
                            id: `custom_${Date.now()}`,
                            key: newVitalKey.trim().toLowerCase(),
                            label: newVitalLabel.trim(),
                            unit: newVitalUnit.trim(),
                            enabled: true,
                            isCustom: true,
                          };

                          onChangeSectionProps(selectedSection.id, { fields: [...fields, newField] });
                          setNewVitalLabel('');
                          setNewVitalUnit('');
                          setNewVitalKey('');
                          setShowAddCustomVital(false);
                        }}
                        className="w-full py-1 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded cursor-pointer"
                      >
                        Add Vital Field
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* PATIENT_DETAILS Configuration */}
            {selectedSection.type === 'PATIENT_DETAILS' && (
              <div className="space-y-2 text-xs">
                <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Demographics Field Visibility
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSection.props?.showDate ?? true}
                    onChange={(e) =>
                      onChangeSectionProps(selectedSection.id, { showDate: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span className="font-medium text-slate-700">Display Prescription Date</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSection.props?.showAppointmentId ?? true}
                    onChange={(e) =>
                      onChangeSectionProps(selectedSection.id, { showAppointmentId: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span className="font-medium text-slate-700">Display Appointment ID</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSection.props?.showAgeGender ?? true}
                    onChange={(e) =>
                      onChangeSectionProps(selectedSection.id, { showAgeGender: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span className="font-medium text-slate-700">Display Age / Gender</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSection.props?.showBranch ?? true}
                    onChange={(e) =>
                      onChangeSectionProps(selectedSection.id, { showBranch: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span className="font-medium text-slate-700">Display Hospital Branch Name</span>
                </label>
              </div>
            )}

            {/* LAB_TESTS_BLOCK Configuration */}
            {selectedSection.type === 'LAB_TESTS_BLOCK' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Section Title
                  </label>
                  <input
                    type="text"
                    value={selectedSection.props?.title ?? 'Lab Tests & Investigations:'}
                    placeholder="Lab Tests & Investigations:"
                    onChange={(e) =>
                      onChangeSectionProps(selectedSection.id, { title: e.target.value })
                    }
                    className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:bg-white"
                  />
                </div>
                <p className="text-[10px] text-slate-500 leading-tight">
                  Renders investigative tests, diagnostic laboratory name, address, and test instructions dynamically from the patient consultation record.
                </p>
              </div>
            )}

            {/* DIVIDER Configuration */}
            {selectedSection.type === 'DIVIDER' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Line Style
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {(['solid', 'dashed', 'dotted', 'double'] as const).map((st) => {
                      const isSel = (selectedSection.props?.style || 'solid') === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => onChangeSectionProps(selectedSection.id, { style: st })}
                          className={`py-1 text-xs font-semibold capitalize rounded-lg border text-center cursor-pointer ${
                            isSel
                              ? 'bg-blue-50 text-blue-700 border-blue-400'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Thickness
                    </label>
                    <select
                      value={selectedSection.props?.thickness || '0.45mm'}
                      onChange={(e) =>
                        onChangeSectionProps(selectedSection.id, { thickness: e.target.value })
                      }
                      className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none box-border"
                    >
                      <option value="0.3mm">0.3mm - Hairline</option>
                      <option value="0.45mm">0.45mm - Standard</option>
                      <option value="0.75mm">0.75mm - Medium</option>
                      <option value="1.5mm">1.5mm - Bold</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Width
                    </label>
                    <select
                      value={selectedSection.props?.width || '100%'}
                      onChange={(e) =>
                        onChangeSectionProps(selectedSection.id, { width: e.target.value })
                      }
                      className="w-full px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none box-border"
                    >
                      <option value="100%">100% - Full Width</option>
                      <option value="80%">80% - Wide</option>
                      <option value="60%">60% - Center</option>
                      <option value="40%">40% - Accent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Divider Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedSection.props?.color || theme.secondaryColor}
                      onChange={(e) => onChangeSectionProps(selectedSection.id, { color: e.target.value })}
                      className="w-8 h-8 rounded border border-slate-200 p-0.5 cursor-pointer shrink-0"
                    />
                    <input
                      type="text"
                      value={selectedSection.props?.color || theme.secondaryColor}
                      onChange={(e) => onChangeSectionProps(selectedSection.id, { color: e.target.value })}
                      className="flex-1 min-w-0 px-2.5 py-1 text-xs font-mono uppercase bg-slate-50 border border-slate-200 rounded-lg box-border"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SPACER Configuration */}
            {selectedSection.type === 'SPACER' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Vertical Gap Height
                  </label>
                  <div className="grid grid-cols-4 gap-1 mb-2">
                    {['3mm', '5mm', '10mm', '15mm'].map((h) => {
                      const isSel = (selectedSection.props?.height || '5mm') === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => onChangeSectionProps(selectedSection.id, { height: h })}
                          className={`py-1 text-xs font-mono rounded-lg border text-center cursor-pointer ${
                            isSel
                              ? 'bg-blue-50 text-blue-700 border-blue-400 font-bold'
                              : 'bg-white border-slate-200 text-slate-600'
                          }`}
                        >
                          {h}
                        </button>
                      );
                    })}
                  </div>
                  <input
                    type="text"
                    value={selectedSection.props?.height || '5mm'}
                    onChange={(e) =>
                      onChangeSectionProps(selectedSection.id, { height: e.target.value })
                    }
                    placeholder="e.g. 8mm"
                    className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-mono box-border"
                  />
                </div>
              </div>
            )}

            {/* PLACEHOLDER_BLOCK Configuration */}
            {selectedSection.type === 'PLACEHOLDER_BLOCK' && (
              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Prefix Label
                  </label>
                  <input
                    type="text"
                    value={selectedSection.props?.prefix ?? 'Patient Name: '}
                    onChange={(e) =>
                      onChangeSectionProps(selectedSection.id, { prefix: e.target.value })
                    }
                    placeholder="Label prefix..."
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none box-border"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Dynamic Variable
                  </label>
                  <select
                    value={selectedSection.props?.token || '{{patient_name}}'}
                    onChange={(e) =>
                      onChangeSectionProps(selectedSection.id, { token: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none font-mono box-border"
                  >
                    <optgroup label="Patient">
                      <option value="{{patient_name}}">{"{{patient_name}}"}</option>
                      <option value="{{patient_id}}">{"{{patient_id}}"}</option>
                      <option value="{{patient_age}}">{"{{patient_age}}"}</option>
                      <option value="{{patient_gender}}">{"{{patient_gender}}"}</option>
                      <option value="{{patient_phone}}">{"{{patient_phone}}"}</option>
                      <option value="{{patient_address}}">{"{{patient_address}}"}</option>
                    </optgroup>
                    <optgroup label="Doctor">
                      <option value="{{doctor_name}}">{"{{doctor_name}}"}</option>
                      <option value="{{doctor_qualification}}">{"{{doctor_qualification}}"}</option>
                      <option value="{{doctor_specialization}}">{"{{doctor_specialization}}"}</option>
                      <option value="{{doctor_registration_number}}">{"{{doctor_registration_number}}"}</option>
                      <option value="{{doctor_phone}}">{"{{doctor_phone}}"}</option>
                    </optgroup>
                    <optgroup label="Hospital & Branch">
                      <option value="{{hospital_name}}">{"{{hospital_name}}"}</option>
                      <option value="{{hospital_phone}}">{"{{hospital_phone}}"}</option>
                      <option value="{{hospital_email}}">{"{{hospital_email}}"}</option>
                      <option value="{{hospital_address}}">{"{{hospital_address}}"}</option>
                      <option value="{{branch_name}}">{"{{branch_name}}"}</option>
                    </optgroup>
                    <optgroup label="Prescription / Consultation">
                      <option value="{{prescription_date}}">{"{{prescription_date}}"}</option>
                      <option value="{{prescription_id}}">{"{{prescription_id}}"}</option>
                      <option value="{{appointment_id}}">{"{{appointment_id}}"}</option>
                      <option value="{{diagnosis}}">{"{{diagnosis}}"}</option>
                      <option value="{{follow_up_date}}">{"{{follow_up_date}}"}</option>
                    </optgroup>
                  </select>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSection.props?.boldValue ?? true}
                    onChange={(e) =>
                      onChangeSectionProps(selectedSection.id, { boldValue: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span className="font-medium text-slate-700">Display Value in Bold</span>
                </label>
              </div>
            )}

            {/* DOCTOR_DETAILS Configuration */}
            {selectedSection.type === 'DOCTOR_DETAILS' && (
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSection.props?.showDoctorName ?? true}
                    onChange={(e) =>
                      onChangeSectionProps(selectedSection.id, { showDoctorName: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span className="font-medium text-slate-700">Display Doctor Name</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSection.props?.showQualifications ?? true}
                    onChange={(e) =>
                      onChangeSectionProps(selectedSection.id, { showQualifications: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span className="font-medium text-slate-700">Display Qualifications</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSection.props?.showSpecialization ?? true}
                    onChange={(e) =>
                      onChangeSectionProps(selectedSection.id, { showSpecialization: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span className="font-medium text-slate-700">Display Specialization</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSection.props?.showRegistration ?? true}
                    onChange={(e) =>
                      onChangeSectionProps(selectedSection.id, { showRegistration: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span className="font-medium text-slate-700">Display Medical Reg. Number</span>
                </label>
              </div>
            )}

            {/* HEADER_LETTERHEAD Configuration */}
            {selectedSection.type === 'HEADER_LETTERHEAD' && (
              <div className="space-y-3 text-xs">
                {/* Hospital Logo Upload Control */}
                <TemplateImageControl
                  label="Hospital Header Logo"
                  sublabel="Replaces default {{hospital_logo}} in letterhead"
                  imageUrl={selectedSection.props?.customLogoUrl || ''}
                  altText={selectedSection.props?.logoAlt || 'Hospital Logo'}
                  width={selectedSection.props?.logoWidth || '77mm'}
                  height={selectedSection.props?.logoHeight || '32mm'}
                  alignment={selectedSection.props?.logoAlign || 'left'}
                  objectFit={selectedSection.props?.logoFit || 'contain'}
                  maintainAspectRatio={selectedSection.props?.maintainAspectRatio ?? true}
                  showDimensions={true}
                  showAlignment={false}
                  showCaption={false}
                  showAlt={true}
                  hospitalId={hospitalId}
                  onChange={(updatedProps) => {
                    const mapped: Record<string, any> = {};
                    if (updatedProps.imageUrl !== undefined) mapped.customLogoUrl = updatedProps.imageUrl;
                    if (updatedProps.width !== undefined) mapped.logoWidth = updatedProps.width;
                    if (updatedProps.height !== undefined) mapped.logoHeight = updatedProps.height;
                    if (updatedProps.objectFit !== undefined) mapped.logoFit = updatedProps.objectFit;
                    if (updatedProps.altText !== undefined) mapped.logoAlt = updatedProps.altText;
                    if (updatedProps.maintainAspectRatio !== undefined)
                      mapped.maintainAspectRatio = updatedProps.maintainAspectRatio;
                    onChangeSectionProps(selectedSection.id, mapped);
                  }}
                  onRemove={() =>
                    onChangeSectionProps(selectedSection.id, { customLogoUrl: '' })
                  }
                />

                <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-slate-200">
                  <input
                    type="checkbox"
                    checked={selectedSection.props?.showTagline ?? theme.showTagline ?? true}
                    onChange={(e) => {
                      onChangeSectionProps(selectedSection.id, { showTagline: e.target.checked });
                      onChangeTheme({ showTagline: e.target.checked });
                    }}
                    className="rounded text-blue-600"
                  />
                  <span className="font-medium text-slate-700">Display Header Tagline Ribbon</span>
                </label>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Tagline Text
                  </label>
                  <textarea
                    rows={2}
                    value={
                      selectedSection.props?.taglineText ||
                      theme.customTagline ||
                      'QUALITY OF LIFE – LIFE AFTER CANCER – HELP YOU TO LIVE BETTER BEYOND CANCER'
                    }
                    onChange={(e) => {
                      onChangeSectionProps(selectedSection.id, { taglineText: e.target.value });
                      onChangeTheme({ customTagline: e.target.value });
                    }}
                    className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg resize-none box-border min-w-0"
                  />
                </div>
              </div>
            )}

            {/* DIAGNOSIS_BLOCK Configuration */}
            {selectedSection.type === 'DIAGNOSIS_BLOCK' && (
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSection.props?.showRxSymbol ?? true}
                    onChange={(e) =>
                      onChangeSectionProps(selectedSection.id, { showRxSymbol: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span className="font-medium text-slate-700">Display Latin ℞ Symbol</span>
                </label>
              </div>
            )}

            {/* MEDICINES_TABLE Configuration */}
            {selectedSection.type === 'MEDICINES_TABLE' && (
              <div className="space-y-2 text-xs">
                <div className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Table Columns Visibility
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSection.props?.showDosage ?? true}
                    onChange={(e) =>
                      onChangeSectionProps(selectedSection.id, { showDosage: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span className="font-medium text-slate-700">Show Dosage / Strength Column</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSection.props?.showFrequency ?? true}
                    onChange={(e) =>
                      onChangeSectionProps(selectedSection.id, { showFrequency: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span className="font-medium text-slate-700">Show Frequency Column</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSection.props?.showDuration ?? true}
                    onChange={(e) =>
                      onChangeSectionProps(selectedSection.id, { showDuration: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span className="font-medium text-slate-700">Show Duration Column</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSection.props?.showInstructions ?? true}
                    onChange={(e) =>
                      onChangeSectionProps(selectedSection.id, { showInstructions: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span className="font-medium text-slate-700">Show Instructions / Meal Timing Column</span>
                </label>
              </div>
            )}

            {/* SIGNATURE_BLOCK Configuration */}
            {selectedSection.type === 'SIGNATURE_BLOCK' && (
              <div className="space-y-3 text-xs">
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Signature Alignment
                </label>
                <div className="grid grid-cols-2 gap-1.5 min-w-0 w-full">
                  <button
                    type="button"
                    onClick={() => onChangeSectionProps(selectedSection.id, { alignment: 'left' })}
                    className={`py-1.5 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1 cursor-pointer min-w-0 ${
                      selectedSection.props?.alignment === 'left'
                        ? 'bg-blue-50 text-blue-700 border-blue-400'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <AlignLeft size={13} className="shrink-0" />
                    <span className="truncate">Left</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeSectionProps(selectedSection.id, { alignment: 'right' })}
                    className={`py-1.5 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1 cursor-pointer min-w-0 ${
                      (selectedSection.props?.alignment ?? 'right') === 'right'
                        ? 'bg-blue-50 text-blue-700 border-blue-400'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <AlignRight size={13} className="shrink-0" />
                    <span className="truncate">Right</span>
                  </button>
                </div>

                {/* Custom Signature Image */}
                <TemplateImageControl
                  label="Doctor Signature / Stamp"
                  sublabel="Template default or custom clinic stamp"
                  imageUrl={selectedSection.props?.customSignatureUrl || ''}
                  width={selectedSection.props?.signatureWidth || '43mm'}
                  height={selectedSection.props?.signatureHeight || '13mm'}
                  showDimensions={true}
                  showAlignment={false}
                  showCaption={false}
                  showAlt={false}
                  hospitalId={hospitalId}
                  onChange={(updatedProps) => {
                    const mapped: Record<string, any> = {};
                    if (updatedProps.imageUrl !== undefined) mapped.customSignatureUrl = updatedProps.imageUrl;
                    if (updatedProps.width !== undefined) mapped.signatureWidth = updatedProps.width;
                    if (updatedProps.height !== undefined) mapped.signatureHeight = updatedProps.height;
                    onChangeSectionProps(selectedSection.id, mapped);
                  }}
                  onRemove={() =>
                    onChangeSectionProps(selectedSection.id, { customSignatureUrl: '' })
                  }
                />
              </div>
            )}

            {/* FOOTER_LETTERHEAD Configuration */}
            {selectedSection.type === 'FOOTER_LETTERHEAD' && (
              <div className="space-y-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSection.props?.showHospitalPhone ?? true}
                    onChange={(e) =>
                      onChangeSectionProps(selectedSection.id, { showHospitalPhone: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span className="font-medium text-slate-700">Display Hospital Phone &amp; Emergency</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSection.props?.showHospitalEmail ?? true}
                    onChange={(e) =>
                      onChangeSectionProps(selectedSection.id, { showHospitalEmail: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span className="font-medium text-slate-700">Display Hospital Official Email</span>
                </label>

                {/* Custom Footer Banner / Ribbon */}
                <TemplateImageControl
                  label="Custom Footer Banner / Ribbon"
                  sublabel="Insert hospital ribbon, NABL badge, or footer graphic"
                  imageUrl={selectedSection.props?.customFooterImageUrl || ''}
                  showDimensions={false}
                  showAlignment={false}
                  showCaption={false}
                  showAlt={false}
                  hospitalId={hospitalId}
                  onChange={(updatedProps) => {
                    if (updatedProps.imageUrl !== undefined) {
                      onChangeSectionProps(selectedSection.id, {
                        customFooterImageUrl: updatedProps.imageUrl,
                      });
                    }
                  }}
                  onRemove={() =>
                    onChangeSectionProps(selectedSection.id, { customFooterImageUrl: '' })
                  }
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
