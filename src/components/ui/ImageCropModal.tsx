import { RotateCw, X, ZoomIn, ZoomOut } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import defaultBrandLogo from '../../assets/brand-logo.png';
import { getMediaProxyUrl } from '../../utils/mediaProxy';

export type CropShape = 'circle' | 'square';

interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onApplyCrop: (croppedDataUrl: string, croppedFile: File, shape?: CropShape) => void;
  initialShape?: CropShape;
}

const STAGE_HEIGHT = 330; // Height of the dark crop stage (px)
const CROP_DIAMETER = 270; // Diameter of the circular aperture (px)
const OUTPUT_SIZE = 512; // High-resolution canvas output (px)

export function ImageCropModal({
  isOpen,
  imageSrc,
  onClose,
  onApplyCrop,
}: ImageCropModalProps) {
  const [zoom, setZoom] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const imgRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Active display image source with safe fallback
  const [displaySrc, setDisplaySrc] = useState<string>(() => {
    if (!imageSrc || !imageSrc.trim()) return defaultBrandLogo;
    return getMediaProxyUrl(imageSrc) || defaultBrandLogo;
  });

  // Sync displaySrc whenever imageSrc prop changes
  useEffect(() => {
    if (imageSrc && imageSrc.trim()) {
      const proxied = getMediaProxyUrl(imageSrc);
      setDisplaySrc(proxied || defaultBrandLogo);
    } else {
      setDisplaySrc(defaultBrandLogo);
    }
  }, [imageSrc]);

  // Reset controls whenever modal opens or image changes
  useEffect(() => {
    if (isOpen) {
      setZoom(1.0);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setIsDragging(false);

      // Immediately detect if image is already cached in browser
      if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
        setNaturalSize({
          width: imgRef.current.naturalWidth,
          height: imgRef.current.naturalHeight,
        });
      }
    }
  }, [isOpen, displaySrc]);

  // Compute base dimensions when image natural dimensions are known
  const { baseWidth, baseHeight } = useMemo(() => {
    if (!naturalSize.width || !naturalSize.height) {
      return { baseWidth: CROP_DIAMETER, baseHeight: CROP_DIAMETER };
    }
    const fill = Math.max(
      CROP_DIAMETER / naturalSize.width,
      CROP_DIAMETER / naturalSize.height,
    );
    return {
      baseWidth: naturalSize.width * fill,
      baseHeight: naturalSize.height * fill,
    };
  }, [naturalSize]);

  if (!isOpen) return null;

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const target = e.currentTarget;
    if (target.naturalWidth > 0 && target.naturalHeight > 0) {
      setNaturalSize({
        width: target.naturalWidth,
        height: target.naturalHeight,
      });
    }
  };

  // Mouse pan handling
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch pan handling
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && e.touches[0]) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - position.x,
        y: e.touches[0].clientY - position.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1 || !e.touches[0]) return;
    setPosition({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.002;
    setZoom((prev) => Math.min(3.0, Math.max(0.5, +(prev + delta).toFixed(2))));
  };

  // Apply crop to high-resolution canvas
  const handleApply = () => {
    if (!imgRef.current) return;

    const img = imgRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.save();

    // Clip to circular aperture for hospital emblem
    ctx.beginPath();
    ctx.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Mapping factor from crop viewport diameter to high-res canvas output
    const canvasScale = OUTPUT_SIZE / CROP_DIAMETER;

    // Apply translation to canvas center + scaled pan
    ctx.translate(
      OUTPUT_SIZE / 2 + position.x * canvasScale,
      OUTPUT_SIZE / 2 + position.y * canvasScale,
    );

    // Apply rotation
    ctx.rotate((rotation * Math.PI) / 180);

    // Draw image centered
    const drawW = baseWidth * zoom * canvasScale;
    const drawH = baseHeight * zoom * canvasScale;

    ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    const dataUrl = canvas.toDataURL('image/png');

    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'cropped-logo.png', { type: 'image/png' });
      onApplyCrop(dataUrl, file, 'circle');
      onClose();
    }, 'image/png');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[500px] bg-white rounded-2xl shadow-2xl p-6 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header: Edit Logo + Close Button */}
        <div className="flex items-center justify-between pb-4">
          <h2 className="text-base font-semibold text-slate-800">Edit Logo</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Dark Stage with Guaranteed Fail-Safe Circular Cutout */}
        <div
          ref={stageRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className={`relative overflow-hidden rounded-xl bg-[#1e1e1e] flex items-center justify-center select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          style={{ width: '100%', height: STAGE_HEIGHT }}
        >
          {/* Draggable, Scalable & Rotatable Image */}
          <div
            className="absolute pointer-events-none transition-none"
            style={{
              width: baseWidth * zoom,
              height: baseHeight * zoom,
              left: `calc(50% + ${position.x}px)`,
              top: `calc(50% + ${position.y}px)`,
              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
            }}
          >
            <img
              ref={imgRef}
              src={displaySrc}
              alt="Crop target"
              crossOrigin={
                displaySrc.startsWith('http://') || displaySrc.startsWith('https://')
                  ? 'anonymous'
                  : undefined
              }
              onLoad={handleImageLoad}
              onError={() => {
                if (displaySrc !== defaultBrandLogo) {
                  setDisplaySrc(defaultBrandLogo);
                }
              }}
              draggable={false}
              className="w-full h-full object-contain pointer-events-none"
            />
          </div>

          {/* Fail-Safe Circular Aperture with 9999px Dark Scrim Outside */}
          <div
            className="absolute rounded-full pointer-events-none z-10"
            style={{
              width: CROP_DIAMETER,
              height: CROP_DIAMETER,
              border: '2px solid rgba(255, 255, 255, 0.75)',
              boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.65)',
            }}
          />
        </div>

        {/* Sliders Section */}
        <div className="mt-5 space-y-3.5">
          {/* 1. Zoom Slider */}
          <div className="flex items-center gap-3">
            <ZoomOut size={16} className="text-slate-400 shrink-0" />
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#60a5fa] hover:accent-blue-600 transition-all"
            />
            <ZoomIn size={16} className="text-slate-400 shrink-0" />
            <span className="text-xs font-normal text-slate-500 min-w-[34px] text-right">
              {zoom.toFixed(1)}x
            </span>
          </div>

          {/* 2. Rotation Slider */}
          <div className="flex items-center gap-3">
            <RotateCw size={16} className="text-slate-400 shrink-0" />
            <input
              type="range"
              min="0"
              max="360"
              step="1"
              value={rotation}
              onChange={(e) => setRotation(parseInt(e.target.value, 10))}
              className="flex-1 h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#60a5fa] hover:accent-blue-600 transition-all"
            />
            <div className="w-4 shrink-0" />
            <span className="text-xs font-normal text-slate-500 min-w-[34px] text-right">
              {rotation}°
            </span>
          </div>
        </div>

        {/* Modal Footer: Cancel and Save Crop */}
        <div className="flex items-center justify-end gap-3 pt-5 mt-1">
          <button
            type="button"
            onClick={onClose}
            className="h-9 px-4 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="h-9 px-5 rounded-lg bg-[#3b82f6] hover:bg-blue-600 text-white text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            Save Crop
          </button>
        </div>
      </div>
    </div>
  );
}
