'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Camera,
  CheckCircle2,
  CircleAlert,
  Sparkles,
  Trash2,
  RotateCcw,
  LoaderCircle,
  IdCard,
  X,
  Check,
  SwitchCamera,
  Upload,
  RefreshCw,
  ShieldAlert,
  Users,
  ArrowRight,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';

/**
 * Resizes and compresses an image in browser using canvas
 * to ensure fast uploads and optimal OCR performance.
 */
export function shrinkImage(fileOrDataUrl, maxDimension = 1400) {
  return new Promise((resolve, reject) => {
    if (!fileOrDataUrl) return reject(new Error('No image provided'));

    const processImg = (img) => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };

    if (typeof fileOrDataUrl === 'string') {
      const img = new Image();
      img.onload = () => processImg(img);
      img.onerror = () => reject(new Error('Failed to load image.'));
      img.src = fileOrDataUrl;
    } else {
      if (!fileOrDataUrl.type || !fileOrDataUrl.type.startsWith('image/')) {
        return reject(new Error('Please select an image file (PNG, JPG, or WEBP).'));
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => processImg(img);
        img.onerror = () => reject(new Error('Failed to load image file.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(fileOrDataUrl);
    }
  });
}

/**
 * Clean stylized graphic representing Front of NIC Card
 */
function IdCardFrontGraphic() {
  return (
    <div className="relative w-20 h-12 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-1.5 flex gap-1.5 shadow-sm">
      <div className="w-5 h-full rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
        <div className="w-3 h-3 rounded-full bg-slate-400/80 dark:bg-slate-500" />
      </div>
      <div className="flex-1 flex flex-col justify-center gap-1.5">
        <div className="h-1.5 w-3/4 bg-brand-500/80 rounded-full" />
        <div className="h-1 w-full bg-slate-200 dark:bg-slate-700 rounded-full" />
        <div className="h-1 w-1/2 bg-slate-200 dark:bg-slate-700 rounded-full" />
      </div>
      <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border border-brand-400 bg-brand-100 dark:bg-brand-950" />
    </div>
  );
}

/**
 * Clean stylized graphic representing Back of NIC Card
 */
function IdCardBackGraphic() {
  return (
    <div className="relative w-20 h-12 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-1.5 flex flex-col justify-between shadow-sm">
      <div className="h-2.5 w-full bg-slate-800 dark:bg-slate-600 rounded-xs" />
      <div className="flex flex-col gap-1">
        <div className="h-1 w-5/6 bg-slate-200 dark:bg-slate-700 rounded-full" />
        <div className="h-1 w-2/3 bg-slate-200 dark:bg-slate-700 rounded-full" />
      </div>
      <div className="flex justify-between items-center">
        <div className="h-1 w-1/3 bg-slate-300 dark:bg-slate-600 rounded-full" />
        <div className="h-2 w-5 bg-slate-400 dark:bg-slate-500 rounded-xs" />
      </div>
    </div>
  );
}

/**
 * Guided Continuous 2-Step Camera Viewfinder Modal
 */
function CameraModal({
  isOpen,
  initialStep = 'front', // 'front' | 'back'
  singleStepOnly = false,
  onCaptureFront,
  onCaptureBack,
  onClose,
  r
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const nativeCameraInputRef = useRef(null);

  const [step, setStep] = useState(initialStep);
  const [facingMode, setFacingMode] = useState('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [flash, setFlash] = useState(false);
  const [starting, setStarting] = useState(true);

  // Sync step if opened with a specific initialStep
  useEffect(() => {
    if (isOpen) {
      setStep(initialStep);
      setSnapshot(null);
    }
  }, [isOpen, initialStep]);

  const stopTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopTracks();
    setCameraError(null);
    setSnapshot(null);
    setStarting(true);

    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputs = devices.filter((d) => d.kind === 'videoinput');
        setHasMultipleCameras(videoInputs.length > 1);
      }

      let newStream;
      try {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: false
        });
      } catch {
        newStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      streamRef.current = newStream;
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError(
        r?.cameraUnavailable ||
          'Camera is not accessible. Please check camera permissions in your browser or upload a file instead.'
      );
    } finally {
      setStarting(false);
    }
  }, [facingMode, r, stopTracks]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopTracks();
      setSnapshot(null);
      setCameraError(null);
    }
    return () => {
      stopTracks();
    };
  }, [isOpen, startCamera, stopTracks]);

  const handleCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
    setSnapshot(dataUrl);
    stopTracks();
  };

  const handleRetake = () => {
    setSnapshot(null);
    startCamera();
  };

  const handleConfirmCurrent = () => {
    if (!snapshot) return;

    if (step === 'front') {
      onCaptureFront(snapshot);
      if (singleStepOnly) {
        handleClose();
      } else {
        // Continuous flow: move seamlessly to step 2 (back)
        setStep('back');
        setSnapshot(null);
        startCamera();
      }
    } else if (step === 'back') {
      onCaptureBack(snapshot);
      handleClose();
    }
  };

  const handleClose = () => {
    stopTracks();
    onClose();
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleNativeCameraCapture = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const dataUrl = await shrinkImage(file, 1400);
      if (step === 'front') {
        onCaptureFront(dataUrl);
        if (singleStepOnly) {
          handleClose();
        } else {
          setStep('back');
          setSnapshot(null);
          startCamera();
        }
      } else {
        onCaptureBack(dataUrl);
        handleClose();
      }
    }
  };

  if (!isOpen) return null;

  const isFront = step === 'front';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in"
    >
      <div className="relative flex flex-col w-full max-w-2xl overflow-hidden rounded-3xl bg-slate-900 text-white shadow-2xl border border-slate-800">
        {/* Flash Effect on capture */}
        {flash && (
          <div className="pointer-events-none absolute inset-0 z-50 bg-white transition-opacity duration-200 opacity-90" />
        )}

        {/* Modal Header with Stepper Progress */}
        <div className="flex flex-col gap-2 border-b border-slate-800/80 px-5 py-3.5 bg-slate-900/95 z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-xs font-bold text-white shadow-xs">
                <Camera className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold tracking-tight text-white">
                  {isFront
                    ? r?.step1Title || 'Step 1: NIC Front Side'
                    : r?.step2Title || 'Step 2: NIC Back Side'}
                </h3>
              </div>
            </div>

            {/* Stepper Progress Pill */}
            {!singleStepOnly && (
              <div className="flex items-center gap-1.5 rounded-full bg-slate-800/90 px-3 py-1 text-[11px] font-semibold border border-slate-700/60">
                <span className={isFront ? 'text-brand-400 font-bold' : 'text-emerald-400'}>
                  {isFront ? '● 1 Front' : '✓ 1 Front'}
                </span>
                <span className="text-slate-500">→</span>
                <span className={!isFront ? 'text-brand-400 font-bold' : 'text-slate-400'}>
                  {!isFront ? '● 2 Back' : '○ 2 Back'}
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleClose}
              className="rounded-full p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close Camera"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Viewfinder Body */}
        <div className="relative aspect-[16/11] sm:aspect-[16/10] w-full overflow-hidden bg-black flex items-center justify-center">
          {cameraError ? (
            <div className="flex flex-col items-center justify-center p-6 text-center max-w-md gap-3">
              <CircleAlert className="h-10 w-10 text-amber-400" />
              <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-brand-500 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                  <span>Open Phone Camera</span>
                </button>
                <button
                  type="button"
                  onClick={startCamera}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Retry</span>
                </button>
              </div>
              <input
                ref={nativeCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleNativeCameraCapture}
                className="hidden"
              />
            </div>
          ) : snapshot ? (
            <div className="relative h-full w-full flex items-center justify-center p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={snapshot}
                alt={isFront ? 'Captured Front' : 'Captured Back'}
                className="max-h-[60vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-slate-800"
              />
              <div className="absolute top-6 left-6 inline-flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1 text-xs font-semibold text-emerald-400 backdrop-blur-md border border-emerald-500/30">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {isFront ? 'Front Side Ready' : 'Back Side Ready'}
              </div>
            </div>
          ) : (
            <div className="relative h-full w-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover max-h-[60vh]"
              />

              {starting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 text-white backdrop-blur-sm z-30">
                  <LoaderCircle className="h-7 w-7 animate-spin text-brand-400" />
                  <p className="text-xs font-medium text-slate-300">Starting camera...</p>
                </div>
              )}

              {/* ID Card Target Alignment Frame */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 sm:p-10">
                <div className="relative aspect-[16/10] w-full max-w-[440px] rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                  {/* Glowing Corner Accents */}
                  <span className="absolute -top-1 -left-1 h-5 w-5 border-t-4 border-l-4 border-brand-400 rounded-tl-lg" />
                  <span className="absolute -top-1 -right-1 h-5 w-5 border-t-4 border-r-4 border-brand-400 rounded-tr-lg" />
                  <span className="absolute -bottom-1 -left-1 h-5 w-5 border-b-4 border-l-4 border-brand-400 rounded-bl-lg" />
                  <span className="absolute -bottom-1 -right-1 h-5 w-5 border-b-4 border-r-4 border-brand-400 rounded-br-lg" />

                  {/* Alignment guide label */}
                  <div className="absolute inset-x-0 bottom-3 flex justify-center px-4">
                    <span className="rounded-full bg-black/75 px-3 py-1 text-[11px] font-semibold text-white/95 backdrop-blur-sm border border-white/15 text-center">
                      {isFront
                        ? r?.cameraInstruction || 'Align Front Side inside frame'
                        : r?.flipCardGuidance || 'Flip NIC: Align Back Side inside frame'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Toolbar */}
        <div className="flex items-center justify-between border-t border-slate-800/80 px-6 py-4 bg-slate-900/95 z-20">
          {snapshot ? (
            <div className="flex items-center justify-between w-full gap-4">
              <button
                type="button"
                onClick={handleRetake}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-200 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <RotateCcw className="h-4 w-4" />
                <span>{r?.retakeBtn || 'Retake'}</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmCurrent}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-950"
              >
                <Check className="h-4 w-4" />
                <span>
                  {isFront && !singleStepOnly
                    ? r?.continueToBack || 'Confirm & Take Back Side →'
                    : r?.finishAndSave || 'Finish & Confirm ✓'}
                </span>
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <div className="w-20">
                {hasMultipleCameras && !cameraError && (
                  <button
                    type="button"
                    onClick={toggleCamera}
                    className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                    title={r?.flipCamera || 'Flip Camera'}
                  >
                    <SwitchCamera className="h-4 w-4" />
                  </button>
                )}
              </div>

              {!cameraError && (
                <div className="flex flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCapture}
                    disabled={starting}
                    className="group relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-white/80 bg-white/20 p-1 shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-transform"
                    title={r?.captureBtn || 'Capture Photo'}
                  >
                    <span className="h-full w-full rounded-full bg-white transition-transform group-hover:scale-95 group-active:scale-90" />
                  </button>
                  <span className="text-[11px] font-semibold text-slate-400">
                    {r?.captureBtn || 'Capture'}
                  </span>
                </div>
              )}

              <div className="w-20 flex justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Modern Unified Single-Form NIC Photo Upload with Guided 2-Step Flow
 */
export default function NicPhotoUpload({
  frontImage,
  backImage,
  onFrontChange,
  onBackChange,
  onFrontRemove,
  onBackRemove,
  onResetAll,
  scanning,
  scanFeedback,
  errors = {},
  r
}) {
  // activeStep: 'front' | 'back' | 'review'
  const [activeStep, setActiveStep] = useState(() => {
    if (frontImage && backImage) return 'review';
    if (frontImage) return 'back';
    return 'front';
  });

  const [cameraModalConfig, setCameraModalConfig] = useState({
    isOpen: false,
    initialStep: 'front',
    singleStepOnly: false
  });

  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Automatically advance to 'back' when front is uploaded (if back is missing)
  useEffect(() => {
    if (frontImage && !backImage && activeStep === 'front') {
      setActiveStep('back');
    } else if (frontImage && backImage && activeStep !== 'review') {
      setActiveStep('review');
    }
  }, [frontImage, backImage, activeStep]);

  const handleOpenContinuousCamera = (step = 'front', single = false) => {
    setCameraModalConfig({
      isOpen: true,
      initialStep: step,
      singleStepOnly: single
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (activeStep === 'front') {
        await onFrontChange(file);
      } else {
        await onBackChange(file);
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      if (activeStep === 'front') {
        await onFrontChange(file);
      } else {
        await onBackChange(file);
      }
    }
  };

  const isMaleRejected = scanFeedback?.type === 'male_rejected';
  const bothCompleted = Boolean(frontImage && backImage);

  return (
    <>
      <div
        id="nicPhotosSection"
        className={`sm:col-span-2 rounded-2xl sm:rounded-3xl border p-3 sm:p-6 shadow-sm space-y-4 transition-all ${
          isMaleRejected
            ? 'border-rose-400 bg-rose-50/20 dark:border-rose-800/70 dark:bg-rose-950/20 ring-1 ring-rose-400/40'
            : errors.nicFront || errors.nicBack
            ? 'border-red-300 bg-red-50/30 dark:border-red-900/60 dark:bg-red-950/20 ring-1 ring-red-400/50'
            : 'border-slate-200/90 bg-slate-50/40 dark:border-slate-800/90 dark:bg-slate-900/40'
        }`}
      >
        {/* Hidden File Picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/70 dark:border-slate-800/70 pb-4">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div
              className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-2xl text-white shadow-sm transition-colors ${
                isMaleRejected
                  ? 'bg-rose-600'
                  : errors.nicFront || errors.nicBack
                  ? 'bg-red-600'
                  : bothCompleted
                  ? 'bg-emerald-600'
                  : 'bg-slate-900 dark:bg-white dark:text-slate-900'
              }`}
            >
              <IdCard className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {r?.nicPhotos || 'National Identity Card (NIC)'}
                </h3>
                <span className="text-red-500 font-bold">*</span>
                <span className="inline-flex items-center rounded-full bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  {r?.nicPhotosEssential || 'Essential'}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">
                {r?.nicPhotosEssentialNotice || 'Photos of both sides are strictly essential for verification'}
              </p>
            </div>
          </div>

          {/* Top Status Badge */}
          <div className="flex items-center">
            {isMaleRejected ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 ring-1 ring-rose-300 dark:ring-rose-800 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-bold shadow-xs">
                <ShieldAlert className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                {r?.maleNicDetectedBadge || 'Male NIC Detected · Women Only'}
              </span>
            ) : bothCompleted ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 ring-1 ring-emerald-200/80 dark:ring-emerald-800/60 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-semibold">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                2 of 2 Photos Verified
              </span>
            ) : frontImage ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 ring-1 ring-amber-300 dark:ring-amber-800/60 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-semibold">
                <LoaderCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 animate-spin" />
                Step 2: Back Side Essential
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 ring-1 ring-red-200/80 dark:ring-red-800/60 px-2.5 py-0.5 sm:px-3 sm:py-1 text-[11px] sm:text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5 text-red-500" />
                Step 1: Front Side Essential
              </span>
            )}
          </div>
        </div>

        {/* Interactive Guided Stepper Tabs */}
        <div className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-2xl bg-slate-200/60 dark:bg-slate-800/70 overflow-x-auto no-scrollbar">
          {/* Step 1: Front */}
          <button
            type="button"
            onClick={() => setActiveStep('front')}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
              activeStep === 'front'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                : frontImage
                ? 'text-emerald-700 dark:text-emerald-400 hover:bg-white/40 dark:hover:bg-slate-900/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${
                frontImage
                  ? 'bg-emerald-600 text-white'
                  : activeStep === 'front'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {frontImage ? <Check className="h-3 w-3 stroke-[3]" /> : '1'}
            </span>
            <span className="truncate">{r?.step1Front || 'Step 1: Front Side'}</span>
          </button>

          <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />

          {/* Step 2: Back */}
          <button
            type="button"
            onClick={() => setActiveStep('back')}
            className={`flex-1 min-w-0 flex items-center justify-center gap-1.5 sm:gap-2 py-2 px-2 sm:px-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
              activeStep === 'back'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs ring-1 ring-black/5 dark:ring-white/10'
                : backImage
                ? 'text-emerald-700 dark:text-emerald-400 hover:bg-white/40 dark:hover:bg-slate-900/40'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${
                backImage
                  ? 'bg-emerald-600 text-white'
                  : activeStep === 'back'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
              }`}
            >
              {backImage ? <Check className="h-3 w-3 stroke-[3]" /> : '2'}
            </span>
            <span className="truncate">{r?.step2Back || 'Step 2: Back Side'}</span>
          </button>

          {/* Step 3: Review (Only visible when both or active) */}
          {bothCompleted && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <button
                type="button"
                onClick={() => setActiveStep('review')}
                className={`flex shrink-0 items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-[11px] sm:text-xs font-bold transition-all ${
                  activeStep === 'review'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-white/40 dark:hover:bg-slate-900/40'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>{r?.bothSidesCompleted || 'Verified'}</span>
              </button>
            </>
          )}
        </div>

        {/* Live Scanning Status */}
        {scanning && (
          <div className="flex items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50/90 px-4 py-3 text-xs font-semibold text-blue-900 dark:border-blue-800/70 dark:bg-blue-950/50 dark:text-blue-200 animate-pulse">
            <LoaderCircle className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
            <span>{r?.scanningNic || 'Scanning both NIC photos... extracting NIC number and date of birth...'}</span>
          </div>
        )}

        {/* Male Person NIC Rejection Standard Alert Banner */}
        {scanFeedback && !scanning && isMaleRejected && (
          <div
            role="alert"
            className="relative overflow-hidden rounded-2xl border-2 border-rose-300 bg-gradient-to-br from-rose-50 via-white to-rose-50/80 p-4 sm:p-5 shadow-sm dark:border-rose-900/80 dark:from-rose-950/70 dark:via-slate-900 dark:to-rose-950/50 space-y-3"
          >
            <div className="flex items-start gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-md shadow-rose-600/25">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-rose-950 dark:text-rose-100">
                    {scanFeedback.title || r?.womenOnlyTitle || 'Only Female Entrepreneurs Can Register as Sellers'}
                  </h4>
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                    {r?.maleNicDetectedBadge || 'Male NIC Detected'}
                  </span>
                </div>

                <p className="text-xs font-semibold text-rose-900 dark:text-rose-200">
                  {scanFeedback.text || r?.nicWomenOnly}
                </p>

                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  {r?.nicWomenOnlyNotice || 'Lanka Women E-Market is exclusively dedicated to empowering Sri Lankan female entrepreneurs. Male individuals cannot register as sellers, but you are warmly welcome to register as a Customer to browse and purchase handmade products from our women sellers!'}
                </p>

                {/* Standard Action Buttons */}
                <div className="pt-2 flex flex-wrap items-center gap-2.5">
                  <Link
                    href="/register?as=customer"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-2 text-xs font-bold shadow-sm transition-all hover:scale-102"
                  >
                    <Users className="h-3.5 w-3.5" />
                    <span>{r?.registerAsCustomerBtn || 'Register as Customer'}</span>
                    <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
                  </Link>

                  <button
                    type="button"
                    onClick={onResetAll || (() => { onFrontRemove(); onBackRemove(); })}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 px-3.5 py-2 text-xs font-semibold shadow-xs transition-colors"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                    <span>{r?.uploadDifferentNicBtn || 'Upload Different NIC'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Regular OCR Result Banner (Success / Info / Warning) */}
        {scanFeedback && !scanning && !isMaleRejected && (
          <div
            className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs font-medium shadow-xs transition-all ${
              scanFeedback.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-800/70 dark:bg-emerald-950/50 dark:text-emerald-200'
                : scanFeedback.type === 'info'
                ? 'border-blue-200 bg-blue-50/90 text-blue-900 dark:border-blue-800/70 dark:bg-blue-950/50 dark:text-blue-200'
                : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800/70 dark:bg-amber-950/50 dark:text-amber-200'
            }`}
          >
            {scanFeedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
            ) : scanFeedback.type === 'info' ? (
              <IdCard className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            ) : (
              <CircleAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
            )}
            <span>{scanFeedback.text}</span>
          </div>
        )}

        {/* ----------------- WORKSPACE AREA ----------------- */}

        {/* CASE A: REVIEW STATE (Both photos captured) */}
        {activeStep === 'review' && bothCompleted ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Front Side Card */}
              <div className="relative group overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900/5 aspect-[16/10] shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={frontImage}
                  alt="NIC Front Side"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-102"
                />
                <div className="absolute top-3 left-3 z-10">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md shadow-sm">
                    <CheckCircle2 className="h-3 w-3" />
                    {r?.step1Front || 'Front Side'}
                  </span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs z-10">
                  <button
                    type="button"
                    onClick={() => handleOpenContinuousCamera('front', true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white text-slate-900 px-3 py-1.5 text-xs font-bold hover:bg-slate-100 shadow-sm transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>{r?.retakeFrontSide || 'Retake Front'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStep('front');
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 text-white px-3 py-1.5 text-xs font-bold hover:bg-slate-700 shadow-sm transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload New</span>
                  </button>
                </div>
              </div>

              {/* Back Side Card */}
              <div className="relative group overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-900/5 aspect-[16/10] shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={backImage}
                  alt="NIC Back Side"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-102"
                />
                <div className="absolute top-3 left-3 z-10">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-2.5 py-0.5 text-[11px] font-semibold backdrop-blur-md shadow-sm">
                    <CheckCircle2 className="h-3 w-3" />
                    {r?.step2Back || 'Back Side'}
                  </span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs z-10">
                  <button
                    type="button"
                    onClick={() => handleOpenContinuousCamera('back', true)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white text-slate-900 px-3 py-1.5 text-xs font-bold hover:bg-slate-100 shadow-sm transition-colors"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    <span>{r?.retakeBackSide || 'Retake Back'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveStep('back');
                      fileInputRef.current?.click();
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 text-white px-3 py-1.5 text-xs font-bold hover:bg-slate-700 shadow-sm transition-colors"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>Upload New</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Actions for Review State */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Hover over photos to retake or replace either side.
              </span>
              <button
                type="button"
                onClick={onResetAll || (() => { onFrontRemove(); onBackRemove(); setActiveStep('front'); })}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{r?.uploadDifferentNicBtn || 'Restart / Upload Different NIC'}</span>
              </button>
            </div>
          </div>
        ) : (
          /* CASE B: GUIDED STEPPER UPLOAD WORKSPACE (Single unified focus card) */
          <div className="space-y-3">
            {/* Step Guidance Notice */}
            {activeStep === 'back' && frontImage && (
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 px-3.5 py-2 text-xs text-emerald-800 dark:text-emerald-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="font-semibold">
                    {r?.frontDoneNextBack || 'Front side saved! Now capture the reverse side to complete.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveStep('front')}
                  className="underline text-[11px] font-bold hover:text-emerald-950 transition-colors"
                >
                  View Front
                </button>
              </div>
            )}

            {/* Single Interactive KYC Upload Card */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-between rounded-3xl border-2 border-dashed p-6 sm:p-8 text-center transition-all min-h-[260px] ${
                dragOver
                  ? 'border-brand-500 bg-brand-50/50 dark:border-brand-400 dark:bg-brand-950/30'
                  : (activeStep === 'front' && errors.nicFront) || (activeStep === 'back' && errors.nicBack)
                  ? 'border-red-400 bg-red-50/50 dark:border-red-700/80 dark:bg-red-950/30 ring-2 ring-red-400/20'
                  : 'border-slate-300/90 bg-white hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-slate-700 shadow-xs'
              }`}
            >
              {/* Center Graphic & Instructions */}
              <div className="flex flex-col items-center justify-center my-auto gap-3">
                {activeStep === 'front' ? <IdCardFrontGraphic /> : <IdCardBackGraphic />}

                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 dark:bg-brand-950/80 text-brand-700 dark:text-brand-300 border border-brand-200/80 dark:border-brand-800/60 px-3 py-0.5 text-[11px] font-bold">
                    {activeStep === 'front' ? 'Step 1 of 2' : 'Step 2 of 2'}
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {activeStep === 'front'
                      ? r?.step1Title || 'NIC Front Side Photo'
                      : r?.step2Title || 'NIC Back Side Photo'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                    {activeStep === 'front'
                      ? r?.step1Desc || 'Clear photo showing your photo portrait and NIC number'
                      : r?.step2Desc || 'Clear photo showing the reverse side of your NIC'}
                  </p>
                </div>
              </div>

              {/* Dual Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md pt-3">
                <button
                  type="button"
                  onClick={() => handleOpenContinuousCamera(activeStep, false)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 py-3 px-4 text-xs font-bold shadow-sm transition-all hover:scale-101"
                >
                  <Camera className="h-4 w-4 text-brand-400 dark:text-brand-600" />
                  <span>{r?.takePhoto || 'Take Photo with Camera'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-750 py-3 px-4 text-xs font-bold shadow-xs transition-colors"
                >
                  <Upload className="h-4 w-4" />
                  <span>{r?.uploadFile || 'Upload File'}</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400 dark:text-slate-500 pt-2">
                {r?.orDragDrop || 'Supports camera capture and PNG, JPG, WEBP upload'}
              </p>
            </div>

            {/* Error Message for current step */}
            {((activeStep === 'front' && errors.nicFront) || (activeStep === 'back' && errors.nicBack)) && (
              <div className="flex items-center gap-2 text-xs font-semibold text-red-600 dark:text-red-400 bg-red-50/90 dark:bg-red-950/50 p-2.5 rounded-xl border border-red-200 dark:border-red-900/60">
                <CircleAlert className="h-4 w-4 shrink-0" />
                <span>{activeStep === 'front' ? errors.nicFront : errors.nicBack}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Guided 2-Step Camera Viewfinder Modal */}
      <CameraModal
        isOpen={cameraModalConfig.isOpen}
        initialStep={cameraModalConfig.initialStep}
        singleStepOnly={cameraModalConfig.singleStepOnly}
        onCaptureFront={onFrontChange}
        onCaptureBack={onBackChange}
        onClose={() => setCameraModalConfig((prev) => ({ ...prev, isOpen: false }))}
        r={r}
      />
    </>
  );
}
