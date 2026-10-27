'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  Trash2,
  X,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Check,
  AlertCircle,
  LoaderCircle,
  SwitchCamera,
  ArrowLeft,
  Crop,
  Pencil
} from 'lucide-react';
import Portal from './Portal';
import API from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { initials } from '../lib/catalog';
import {
  profilePhotoUrl,
  captureFullVideoSnapshot,
  cropImageToSquare
} from '../lib/profilePhoto';

const VIEWPORT_SIZE = 280;

// Profile photo editor for both Sellers and Customers.
// Allows uploading a photo or taking one live, with interactive circular cropping (zoom, pan, rotate).
export default function ProfilePhotoEditor({ user, name, onChanged, onAuthError }) {
  const { t } = useLanguage();
  const p = t.profilePhoto || {};

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState('select'); // 'select' | 'camera' | 'crop'
  const [origin, setOrigin] = useState('select'); // 'upload' | 'camera'
  const [facingMode, setFacingMode] = useState('user'); // 'user' | 'environment'

  // Cropper states
  const [rawImage, setRawImage] = useState(null);
  const [naturalDimensions, setNaturalDimensions] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const nativeCameraInputRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const photo = profilePhotoUrl(user);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const closeModal = useCallback(() => {
    stopCameraStream();
    setModalOpen(false);
    setMode('select');
    setRawImage(null);
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    setError('');
    setCameraError(false);
    setCameraStarting(false);
  }, [stopCameraStream]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!modalOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalOpen, closeModal]);

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  const fail = useCallback(
    (err) => {
      if (
        [401, 403].includes(err.response?.status) &&
        !['NOT_CUSTOMER', 'UNAUTHORIZED_ROLE'].includes(err.response?.data?.code)
      ) {
        return onAuthError?.();
      }
      setError(err.response?.status === 413 ? p.errors?.big : p.errors?.generic);
    },
    [onAuthError, p]
  );

  // Clamp pan offsets so the image never exposes empty borders inside the crop square
  const clampOffset = useCallback(
    (ox, oy, currentZoom = zoom, currentRot = rotation) => {
      if (!naturalDimensions.width || !naturalDimensions.height) return { x: 0, y: 0 };
      const isRot = currentRot === 90 || currentRot === 270;
      const rotW = isRot ? naturalDimensions.height : naturalDimensions.width;
      const rotH = isRot ? naturalDimensions.width : naturalDimensions.height;
      const baseScale = Math.max(VIEWPORT_SIZE / rotW, VIEWPORT_SIZE / rotH);
      const scale = baseScale * currentZoom;
      const dispW = rotW * scale;
      const dispH = rotH * scale;
      const maxPanX = Math.max(0, (dispW - VIEWPORT_SIZE) / 2);
      const maxPanY = Math.max(0, (dispH - VIEWPORT_SIZE) / 2);

      return {
        x: Math.min(maxPanX, Math.max(-maxPanX, ox)),
        y: Math.min(maxPanY, Math.max(-maxPanY, oy))
      };
    },
    [zoom, rotation, naturalDimensions]
  );

  // Re-clamp whenever zoom, rotation, or image dimensions change
  useEffect(() => {
    if (!naturalDimensions.width) return;
    setPan((prev) => clampOffset(prev.x, prev.y, zoom, rotation));
  }, [zoom, rotation, naturalDimensions, clampOffset]);

  // Start the camera video stream
  const startCamera = useCallback(
    async (targetFacing = facingMode) => {
      stopCameraStream();
      setCameraStarting(true);
      setCameraError(false);
      setError('');

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraStarting(false);
        setCameraError(true);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: targetFacing,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {}
        }
      } catch (err) {
        console.warn('Camera access error:', err);
        setCameraError(true);
      } finally {
        setCameraStarting(false);
      }
    },
    [facingMode, stopCameraStream]
  );

  // Enter live camera mode
  const openCameraMode = () => {
    setError('');
    setOrigin('camera');
    setMode('camera');
    startCamera(facingMode);
  };

  // Switch between front and back cameras
  const toggleFacingMode = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Load an image source into the interactive Cropper
  const loadIntoCropper = (imageSrc, sourceOrigin = 'upload') => {
    setError('');
    const img = new window.Image();
    img.onload = () => {
      setNaturalDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      setRawImage(imageSrc);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setOrigin(sourceOrigin);
      setMode('crop');
    };
    img.onerror = () => {
      setError(p.errors?.type || 'Failed to process image');
    };
    img.src = imageSrc;
  };

  // Take full snapshot from video and move to crop mode
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    const fullSnapshot = captureFullVideoSnapshot(videoRef.current, {
      mirror: facingMode === 'user'
    });
    if (!fullSnapshot) return;
    stopCameraStream();
    loadIntoCropper(fullSnapshot, 'camera');
  };

  // Handle uploaded file or mobile native camera snapshot
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
      setError(p.errors?.type || 'Choose a JPG, PNG or WebP picture.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      loadIntoCropper(event.target.result, 'upload');
    };
    reader.onerror = () => {
      setError(p.errors?.generic || 'Failed to read file.');
    };
    reader.readAsDataURL(file);
  };

  // Mouse & Touch drag handlers for panning the image in the crop viewport
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: pan.x,
      panY: pan.y
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan(clampOffset(dragStartRef.current.panX + dx, dragStartRef.current.panY + dy));
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        panX: pan.x,
        panY: pan.y
      };
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;
    setPan(clampOffset(dragStartRef.current.panX + dx, dragStartRef.current.panY + dy));
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((z) => Math.min(3, Math.max(1, +(z + delta).toFixed(2))));
  };

  // Perform crop and submit to API
  const applyCropAndSubmit = async () => {
    if (!rawImage) return;
    setBusy(true);
    setError('');
    try {
      const croppedDataUrl = await cropImageToSquare(rawImage, {
        targetSize: 480,
        viewportSize: VIEWPORT_SIZE,
        zoom,
        offsetX: pan.x,
        offsetY: pan.y,
        rotation
      });

      const res = await API.put('/profile/photo', { image: croppedDataUrl });
      onChanged?.({ ...user, photoVersion: res.data.photoVersion });
      closeModal();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  // Remove existing photo
  const removePhoto = async () => {
    setBusy(true);
    setError('');
    try {
      await API.delete('/profile/photo');
      onChanged?.({ ...user, photoVersion: null });
      closeModal();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  };

  // Go back from crop mode
  const handleCropBack = () => {
    setRawImage(null);
    setError('');
    if (origin === 'camera') {
      setMode('camera');
      startCamera(facingMode);
    } else {
      setMode('select');
    }
  };

  // Compute CSS transform for the crop viewport
  const isRotated = rotation === 90 || rotation === 270;
  const rotW = isRotated ? naturalDimensions.height : naturalDimensions.width;
  const rotH = isRotated ? naturalDimensions.width : naturalDimensions.height;
  const baseScale = rotW && rotH ? Math.max(VIEWPORT_SIZE / rotW, VIEWPORT_SIZE / rotH) : 1;
  const displayScale = baseScale * zoom;

  return (
    <div className="shrink-0">
      {/* Avatar Container with Action Button */}
      <div className="relative h-20 w-20">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          title={photo ? p.change : p.add}
          className="group relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white text-2xl font-extrabold text-brand-700 shadow-lg ring-4 ring-white/25 transition-transform hover:scale-102 focus-visible:outline-2 focus-visible:outline-magenta"
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo} alt={name} className="h-full w-full object-cover transition-opacity group-hover:opacity-90" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-linear-to-br from-magenta/15 to-saffron/20 font-bold text-magenta">
              {initials(name) || '?'}
            </span>
          )}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/50 backdrop-blur-xs">
              <LoaderCircle className="h-6 w-6 animate-spin text-white" />
            </span>
          )}
        </button>

        {/* Single Pencil edit badge button */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          title={p.edit || (photo ? p.change : p.add)}
          disabled={busy}
          className={`absolute bottom-0 right-0 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full bg-linear-to-tr from-magenta to-saffron text-white shadow-md ring-2 ring-white transition-all hover:scale-110 active:scale-95 ${
            busy ? 'pointer-events-none opacity-60' : ''
          }`}
        >
          <Pencil className="h-3 w-3" />
          <span className="sr-only">{p.edit || 'Edit photo'}</span>
        </button>
      </div>

      {error && !modalOpen && (
        <p role="alert" className="mt-2 max-w-[11rem] text-xs font-medium text-red-200">
          {error}
        </p>
      )}

      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="sr-only hidden"
        aria-hidden="true"
      />
      <input
        ref={nativeCameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileSelect}
        className="sr-only hidden"
        aria-hidden="true"
      />

      {/* Profile Photo Modal Dialog */}
      {modalOpen && (
        <Portal>
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6"
            role="dialog"
            aria-modal="true"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-ink/65 backdrop-blur-sm transition-opacity"
              onClick={closeModal}
            />

            {/* Modal Card */}
            <div className="relative flex max-h-[94vh] w-full max-w-md flex-col overflow-hidden rounded-[28px] bg-white text-ink shadow-2xl ring-1 ring-ink/10 dark:bg-slate-900 dark:text-white dark:ring-white/10">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-ink/10 bg-linear-to-r from-cream/60 via-white to-cream/60 px-6 py-4 dark:border-white/10 dark:from-slate-800/60 dark:via-slate-900 dark:to-slate-800/60">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-linear-to-tr from-magenta to-saffron text-white shadow-sm">
                    {mode === 'crop' ? (
                      <Crop className="h-4.5 w-4.5" />
                    ) : mode === 'camera' ? (
                      <Camera className="h-4.5 w-4.5" />
                    ) : (
                      <Pencil className="h-4.5 w-4.5" />
                    )}
                  </span>
                  <h3 className="text-base font-bold sm:text-lg">
                    {mode === 'camera'
                      ? p.cameraOption || 'Take a Photo'
                      : mode === 'crop'
                      ? p.cropTitle || 'Crop & Adjust Photo'
                      : p.edit || p.modalTitle || 'Edit Profile Photo'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-ink/5 text-ink/70 transition-colors hover:bg-ink hover:text-white dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/20 dark:hover:text-white"
                  aria-label={p.cancel || 'Close'}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6">
                {/* MODE 1: SELECT (Choice between Upload or Camera) */}
                {mode === 'select' && (
                  <div className="flex flex-col items-center text-center">
                    {/* Current avatar preview */}
                    <div className="relative mb-5 h-28 w-28">
                      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-magenta/10 to-saffron/15 shadow-xl ring-4 ring-magenta/20">
                        {photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photo} alt={name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-3xl font-extrabold text-magenta">
                            {initials(name) || '?'}
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="mb-6 text-sm text-ink/65 dark:text-slate-300">
                      {photo ? p.change : p.add}
                    </p>

                    {/* Action Cards */}
                    <div className="grid w-full gap-3">
                      {/* Option A: Upload Photo */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="group flex w-full items-center gap-4 rounded-2xl border-2 border-ink/10 bg-sand/30 p-4 text-left transition-all hover:border-magenta hover:bg-magenta/5 dark:border-white/10 dark:bg-slate-800/50 dark:hover:border-magenta dark:hover:bg-magenta/10"
                      >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-tr from-brand-600 to-brand-800 text-white shadow-md transition-transform group-hover:scale-105">
                          <Upload className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-ink dark:text-white">
                            {p.uploadOption || 'Upload a Photo'}
                          </h4>
                          <p className="text-xs text-ink/60 dark:text-slate-400">
                            {p.uploadDesc || 'Choose an image file from your device (JPG, PNG, WebP)'}
                          </p>
                        </div>
                      </button>

                      {/* Option B: Take Photo on the spot */}
                      <button
                        type="button"
                        onClick={openCameraMode}
                        className="group flex w-full items-center gap-4 rounded-2xl border-2 border-magenta/25 bg-linear-to-r from-magenta/5 via-saffron/5 to-transparent p-4 text-left transition-all hover:border-magenta hover:bg-magenta/10 dark:border-magenta/30 dark:bg-magenta/10 dark:hover:border-magenta dark:hover:bg-magenta/15"
                      >
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-linear-to-tr from-magenta to-saffron text-white shadow-md transition-transform group-hover:scale-105">
                          <Camera className="h-5 w-5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-ink dark:text-white">
                              {p.cameraOption || 'Take a Photo'}
                            </h4>
                            <span className="rounded-full bg-magenta/15 px-2 py-0.5 text-[10px] font-bold text-magenta dark:bg-magenta/25 dark:text-magenta-light">
                              Live
                            </span>
                          </div>
                          <p className="text-xs text-ink/60 dark:text-slate-400">
                            {p.cameraDesc || 'Use your camera or webcam to take a photo right now'}
                          </p>
                        </div>
                      </button>

                      {/* Option C: Remove current photo */}
                      {photo && (
                        <button
                          type="button"
                          onClick={removePhoto}
                          disabled={busy}
                          className="group flex w-full items-center gap-4 rounded-2xl border-2 border-red-200/70 bg-red-50/50 p-4 text-left transition-all hover:border-red-400 hover:bg-red-50 dark:border-red-900/40 dark:bg-red-950/20 dark:hover:border-red-800 dark:hover:bg-red-950/30"
                        >
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-600 shadow-xs transition-transform group-hover:scale-105 dark:bg-red-900/40 dark:text-red-400">
                            <Trash2 className="h-5 w-5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-red-600 dark:text-red-400">
                              {p.removeOption || 'Remove Current Photo'}
                            </h4>
                            <p className="text-xs text-red-500/80 dark:text-red-400/70">
                              {p.removeDesc || 'Delete your photo and revert to initials'}
                            </p>
                          </div>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* MODE 2: CAMERA VIEW (Live Webcam Viewfinder) */}
                {mode === 'camera' && (
                  <div className="flex flex-col items-center">
                    {/* Viewfinder Frame */}
                    <div className="relative aspect-square w-full max-w-[340px] overflow-hidden rounded-2xl bg-black shadow-inner">
                      {cameraStarting && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/80 text-white">
                          <LoaderCircle className="h-8 w-8 animate-spin text-magenta" />
                          <p className="text-xs font-medium text-white/80">
                            {p.cameraStarting || 'Starting camera...'}
                          </p>
                        </div>
                      )}

                      {cameraError ? (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-900 p-6 text-center text-white">
                          <AlertCircle className="h-10 w-10 text-amber-400" />
                          <p className="text-xs text-slate-300">
                            {p.cameraDenied ||
                              'Camera access was denied or not supported. You can still take a picture via your device camera below.'}
                          </p>
                          <button
                            type="button"
                            onClick={() => nativeCameraInputRef.current?.click()}
                            className="inline-flex items-center gap-2 rounded-full bg-linear-to-tr from-magenta to-saffron px-4 py-2 text-xs font-bold text-white shadow-md transition-transform hover:scale-105"
                          >
                            <Camera className="h-4 w-4" />
                            {p.nativeCameraFallback || 'Take with device camera'}
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Live Video feed */}
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className={`h-full w-full object-cover ${
                              facingMode === 'user' ? 'scale-x-[-1]' : ''
                            }`}
                          />

                          {/* Oval / Round Avatar Guide Overlay */}
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="h-56 w-56 rounded-full border-2 border-dashed border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
                          </div>

                          {/* Flip camera button overlay */}
                          <button
                            type="button"
                            onClick={toggleFacingMode}
                            title={p.flipCamera || 'Flip Camera'}
                            className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-xs transition-transform hover:scale-110 active:scale-95"
                          >
                            <SwitchCamera className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>

                    {/* Camera Control Buttons */}
                    <div className="mt-6 flex w-full items-center justify-between px-4">
                      {/* Back button */}
                      <button
                        type="button"
                        onClick={() => {
                          stopCameraStream();
                          setMode('select');
                        }}
                        className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-ink/70 hover:bg-ink/5 dark:text-slate-300 dark:hover:bg-white/10"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        <span>{p.cancel || 'Back'}</span>
                      </button>

                      {/* Large Shutter Button */}
                      {!cameraError && (
                        <button
                          type="button"
                          onClick={takeSnapshot}
                          disabled={cameraStarting}
                          title={p.takePhoto || 'Take Photo'}
                          className="group relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-magenta/30 bg-white shadow-xl transition-transform hover:scale-105 active:scale-90 disabled:opacity-50"
                        >
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-tr from-magenta to-saffron text-white shadow-md transition-transform group-hover:scale-95">
                            <Camera className="h-6 w-6" />
                          </span>
                        </button>
                      )}

                      {/* Spacer for layout balance */}
                      <div className="w-16" />
                    </div>
                  </div>
                )}

                {/* MODE 3: CROP & ADJUST (Interactive Zoom, Pan, Rotate, Crop) */}
                {mode === 'crop' && (
                  <div className="flex flex-col items-center">
                    <p className="mb-3 text-center text-xs text-ink/65 dark:text-slate-400">
                      {p.cropDesc || 'Drag to position and use zoom to frame your photo perfectly'}
                    </p>

                    {/* Interactive Crop Viewport */}
                    <div
                      onMouseDown={handleMouseDown}
                      onMouseMove={handleMouseMove}
                      onMouseUp={handleMouseUp}
                      onMouseLeave={handleMouseUp}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      onWheel={handleWheel}
                      className={`relative h-[280px] w-[280px] overflow-hidden rounded-2xl bg-slate-950 shadow-2xl select-none ${
                        isDragging ? 'cursor-grabbing' : 'cursor-grab'
                      }`}
                      style={{ touchAction: 'none' }}
                    >
                      {/* Underlying Image with continuous CSS transforms */}
                      {rawImage && naturalDimensions.width > 0 && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={rawImage}
                          alt="Crop target"
                          draggable={false}
                          className="pointer-events-none absolute max-w-none origin-center select-none"
                          style={{
                            left: '50%',
                            top: '50%',
                            width: naturalDimensions.width,
                            height: naturalDimensions.height,
                            transform: `translate(-50%, -50%) translate3d(${pan.x}px, ${pan.y}px, 0) rotate(${rotation}deg) scale(${displayScale})`
                          }}
                        />
                      )}

                      {/* Circular Overlay Guide with dark vignette mask and grid lines */}
                      <div className="pointer-events-none absolute inset-0 select-none">
                        <svg className="h-full w-full" viewBox="0 0 280 280">
                          <defs>
                            <mask id="profile-crop-mask">
                              <rect width="280" height="280" fill="white" />
                              <circle cx="140" cy="140" r="130" fill="black" />
                            </mask>
                          </defs>
                          {/* Shaded area outside the circular avatar */}
                          <rect
                            width="280"
                            height="280"
                            fill="rgba(0, 0, 0, 0.52)"
                            mask="url(#profile-crop-mask)"
                          />
                          {/* Crisp dashed circle border */}
                          <circle
                            cx="140"
                            cy="140"
                            r="130"
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            strokeDasharray="6 4"
                            opacity="0.95"
                          />
                          {/* Rule-of-thirds grid guides */}
                          <line x1="97" y1="30" x2="97" y2="250" stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeDasharray="3 3" />
                          <line x1="183" y1="30" x2="183" y2="250" stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeDasharray="3 3" />
                          <line x1="30" y1="97" x2="250" y2="97" stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeDasharray="3 3" />
                          <line x1="30" y1="183" x2="250" y2="183" stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeDasharray="3 3" />
                        </svg>
                      </div>
                    </div>

                    {/* Cropping Controls: Zoom Slider */}
                    <div className="mt-4 flex w-full max-w-[280px] items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))}
                        className="rounded-full p-1.5 text-ink/60 hover:bg-ink/10 dark:text-slate-400 dark:hover:bg-white/10"
                        title="Zoom out"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </button>
                      <input
                        type="range"
                        min="1"
                        max="3"
                        step="0.01"
                        value={zoom}
                        onChange={(e) => setZoom(parseFloat(e.target.value))}
                        aria-label={p.zoom || 'Zoom'}
                        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-lg bg-ink/15 accent-magenta dark:bg-white/20"
                      />
                      <button
                        type="button"
                        onClick={() => setZoom((z) => Math.min(3, +(z + 0.2).toFixed(2)))}
                        className="rounded-full p-1.5 text-ink/60 hover:bg-ink/10 dark:text-slate-400 dark:hover:bg-white/10"
                        title="Zoom in"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Cropping Controls: Rotate & Reset */}
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRotation((r) => (r + 90) % 360)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-white/70 px-3 py-1.5 text-xs font-semibold text-ink shadow-xs transition hover:bg-ink/5 dark:border-white/15 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                        <span>{p.rotate || 'Rotate 90°'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setZoom(1);
                          setRotation(0);
                          setPan({ x: 0, y: 0 });
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-white/70 px-3 py-1.5 text-xs font-semibold text-ink shadow-xs transition hover:bg-ink/5 dark:border-white/15 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>{p.reset || 'Reset'}</span>
                      </button>
                    </div>

                    {/* Error display */}
                    {error && (
                      <p
                        role="alert"
                        className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-red-600 dark:text-red-400"
                      >
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        {error}
                      </p>
                    )}

                    {/* Action Buttons: Retake vs Crop & Submit */}
                    <div className="mt-5 flex w-full flex-col gap-2.5 sm:flex-row">
                      <button
                        type="button"
                        onClick={handleCropBack}
                        disabled={busy}
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-xs font-bold text-ink transition-all hover:bg-ink/5 disabled:opacity-50 dark:border-white/20 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>{p.retake || 'Choose Another / Retake'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={applyCropAndSubmit}
                        disabled={busy}
                        className="btn-shine inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-linear-to-tr from-magenta to-saffron px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:opacity-95 active:scale-98 disabled:opacity-50"
                      >
                        {busy ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        <span>{busy ? 'Saving...' : p.cropAndSave || 'Crop & Submit Photo'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
