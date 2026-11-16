import {
  AlertCircle,
  Camera,
  Link as LinkIcon,
  Loader2,
  Trash2,
  Upload,
} from 'lucide-react';
import React, { useRef, useState } from 'react';
import api from '../../utils/api';
import { Avatar } from './primitives';

export interface ImageUploadFieldProps {
  id?: string | undefined;
  label?: string | undefined;
  value: string;
  onChange: (url: string) => void;
  name?: string | undefined;
  folder?: string | undefined;
  defaultFallbackSrc?: string | null | undefined;
  disabled?: boolean | undefined;
  error?: string | null | undefined;
  helperText?: string | undefined;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  id = 'image-upload',
  label = 'Profile Photo',
  value,
  onChange,
  name = 'User',
  folder = 'avatars',
  defaultFallbackSrc,
  disabled = false,
  error,
  helperText = 'Supports JPG, PNG, WEBP, GIF up to 10MB',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);

  const displayImage = previewBlobUrl || value;

  const handleUploadFile = async (file: File) => {
    // 1. Client-side validations
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPG, PNG, WEBP, or GIF).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image size exceeds 10MB limit. Please choose a smaller image.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    // Create immediate local preview
    const localUrl = URL.createObjectURL(file);
    setPreviewBlobUrl(localUrl);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      let uploadedUrl = '';
      try {
        const res = await api.post('/upload/image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedUrl = res.data?.data?.url || res.data?.url || '';
      } catch (firstErr) {
        // Fallback to module-specific upload endpoint if /upload/image fails
        const fallbackPath =
          folder === 'doctor-profiles' || folder === 'doctors'
            ? '/doctors/upload-image'
            : '/patients/upload-image';
        const fallbackRes = await api.post(fallbackPath, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedUrl = fallbackRes.data?.data?.url || fallbackRes.data?.url || '';
      }

      if (!uploadedUrl) {
        throw new Error('No URL returned from server.');
      }

      onChange(uploadedUrl);
      setPreviewBlobUrl(null);
    } catch (err: any) {
      console.error('Image upload failed:', err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        'Failed to upload image. Please try again.';
      setUploadError(msg);
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
      handleUploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setPreviewBlobUrl(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label
          htmlFor={id}
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{label}</span>
          <button
            type="button"
            onClick={() => setShowUrlInput(!showUrlInput)}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: 0,
            }}
          >
            <LinkIcon size={11} />
            <span>{showUrlInput ? 'Hide URL input' : 'Or paste URL'}</span>
          </button>
        </label>
      )}

      {/* Main Upload Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !isUploading) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        style={{
          border: isDragging
            ? '2px dashed #2563eb'
            : uploadError || error
            ? '1px dashed #ef4444'
            : '1px dashed #cbd5e1',
          background: isDragging
            ? '#eff6ff'
            : isUploading
            ? '#f8fafc'
            : '#ffffff',
          borderRadius: 12,
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          transition: 'all 0.15s ease',
        }}
      >
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          id={id}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          disabled={disabled || isUploading}
        />

        {/* Avatar / Photo Preview Container */}
        <div
          style={{
            position: 'relative',
            width: 60,
            height: 60,
            flexShrink: 0,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2px solid #e2e8f0',
            background: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          {displayImage ? (
            <img
              src={
                displayImage.startsWith('blob:') || displayImage.startsWith('data:')
                  ? displayImage
                  : displayImage.includes('amazonaws.com') && !displayImage.includes('X-Amz-Signature')
                  ? `/api/proxy/image?url=${encodeURIComponent(displayImage)}`
                  : displayImage
              }
              alt={name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
              onError={(e) => {
                // If loaded URL fails, fallback to defaultFallbackSrc or Avatar
                if (defaultFallbackSrc && e.currentTarget.src !== defaultFallbackSrc) {
                  e.currentTarget.src = defaultFallbackSrc;
                }
              }}
            />
          ) : defaultFallbackSrc ? (
            <img
              src={defaultFallbackSrc}
              alt={name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <Avatar name={name || 'User'} size={60} />
          )}

          {/* Uploading Overlay */}
          {isUploading && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
              }}
            >
              <Loader2 size={20} className="animate-spin" />
            </div>
          )}
        </div>

        {/* Action Controls & Guidelines */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              disabled={disabled || isUploading}
              onClick={() => fileInputRef.current?.click()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 8,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#0f172a',
                cursor: disabled || isUploading ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                opacity: disabled || isUploading ? 0.65 : 1,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!disabled && !isUploading) e.currentTarget.style.background = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                if (!disabled && !isUploading) e.currentTarget.style.background = '#ffffff';
              }}
            >
              {isUploading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : displayImage ? (
                <>
                  <Camera size={13} />
                  <span>Change Photo</span>
                </>
              ) : (
                <>
                  <Upload size={13} />
                  <span>Upload Photo</span>
                </>
              )}
            </button>

            {displayImage && !isUploading && (
              <button
                type="button"
                disabled={disabled}
                onClick={handleRemove}
                title="Remove photo"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 500,
                  borderRadius: 8,
                  border: '1px solid #fee2e2',
                  background: '#fef2f2',
                  color: '#dc2626',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!disabled) e.currentTarget.style.background = '#fee2e2';
                }}
                onMouseLeave={(e) => {
                  if (!disabled) e.currentTarget.style.background = '#fef2f2';
                }}
              >
                <Trash2 size={13} />
                <span>Remove</span>
              </button>
            )}
          </div>

          <p
            style={{
              fontSize: 11,
              color: '#64748b',
              margin: '6px 0 0 0',
              lineHeight: 1.3,
            }}
          >
            {helperText}
          </p>
        </div>
      </div>

      {/* Optional Direct URL Input Drawer/Toggle */}
      {showUrlInput && (
        <div style={{ marginTop: 2 }}>
          <input
            type="text"
            className="ui-input"
            value={value}
            disabled={disabled || isUploading}
            onChange={(e) => {
              onChange(e.target.value);
              setPreviewBlobUrl(null);
            }}
            placeholder="https://... (Direct image URL)"
            style={{
              fontSize: 12,
              padding: '6px 10px',
              borderRadius: 8,
              width: '100%',
            }}
          />
        </div>
      )}

      {/* Error Feedback */}
      {(uploadError || error) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 2,
            color: '#dc2626',
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          <AlertCircle size={12} style={{ flexShrink: 0 }} />
          <span>{uploadError || error}</span>
        </div>
      )}
    </div>
  );
};

export default ImageUploadField;
