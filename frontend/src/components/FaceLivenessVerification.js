'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  SwitchCamera,
  X,
} from 'lucide-react';

const MODEL_PATH = '/models/face_landmarker.task';
const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.2/wasm';
const REQUIRED_STABLE_FRAMES = 7;

function getYaw(landmarks) {
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const nose = landmarks[1];
  const eyeDistance = Math.abs(rightEye.x - leftEye.x);
  if (!eyeDistance) return 0;
  return (nose.x - (leftEye.x + rightEye.x) / 2) / eyeDistance;
}

function isFaceCentered(landmarks, yaw) {
  const leftCheek = landmarks[234];
  const rightCheek = landmarks[454];
  const forehead = landmarks[10];
  const chin = landmarks[152];
  const width = Math.abs(rightCheek.x - leftCheek.x);
  const height = Math.abs(chin.y - forehead.y);
  const centerX = (leftCheek.x + rightCheek.x) / 2;
  const centerY = (forehead.y + chin.y) / 2;

  return (
    width > 0.2 &&
    width < 0.75 &&
    height > 0.25 &&
    centerX > 0.32 &&
    centerX < 0.68 &&
    centerY > 0.28 &&
    centerY < 0.72 &&
    Math.abs(yaw) < 0.18
  );
}

function drawLandmarks(canvas, landmarks, FaceLandmarker, mirrored) {
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  const width = canvas.width;
  const height = canvas.height;
  context.clearRect(0, 0, width, height);

  if (!landmarks?.length) return;

  const connections = [
    ...FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
    ...FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
    ...FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
    ...FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
    ...FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
    ...FaceLandmarker.FACE_LANDMARKS_LIPS,
  ];

  context.strokeStyle = '#67e8f9';
  context.lineWidth = Math.max(1.5, width / 500);
  context.shadowColor = '#22d3ee';
  context.shadowBlur = 5;

  for (const connection of connections) {
    const start = landmarks[connection.start];
    const end = landmarks[connection.end];
    if (!start || !end) continue;

    const startX = (mirrored ? 1 - start.x : start.x) * width;
    const endX = (mirrored ? 1 - end.x : end.x) * width;
    context.beginPath();
    context.moveTo(startX, start.y * height);
    context.lineTo(endX, end.y * height);
    context.stroke();
  }
}

function getStepLabel(step, r) {
  if (step === 0) return r.faceScanStep1 || 'Center your face in the frame';
  if (step === 1) return r.faceScanStep2 || 'Slowly turn your head to one side';
  if (step === 2) return r.faceScanStep3 || 'Slowly turn your head to the other side';
  if (step === 3) return r.faceScanStep4 || 'Blink both eyes once';
  return r.faceScanComplete || 'Live face checks complete';
}

export default function FaceLivenessVerificationModal({
  isOpen,
  onComplete,
  onClose,
  r = {},
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const frameRef = useRef(null);
  const currentStepRef = useRef(0);
  const stableFramesRef = useRef(0);
  const firstTurnDirectionRef = useRef(0);
  const blinkClosedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const rRef = useRef(r);
  const [modelStatus, setModelStatus] = useState('idle');
  const [modelRetry, setModelRetry] = useState(0);
  const [cameraRetry, setCameraRetry] = useState(0);
  const [cameraError, setCameraError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [facingMode, setFacingMode] = useState('user');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [faceStatus, setFaceStatus] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    rRef.current = r;
  }, [onComplete, r]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const resetChallenge = useCallback(() => {
    currentStepRef.current = 0;
    stableFramesRef.current = 0;
    firstTurnDirectionRef.current = 0;
    blinkClosedRef.current = false;
    setCurrentStep(0);
    setFaceStatus('');
    setCapturedPhoto('');
    setVerificationResult(null);
  }, []);

  const handleClose = useCallback(() => {
    setModelStatus('idle');
    setCameraReady(false);
    setCameraError('');
    resetChallenge();
    onClose?.();
  }, [onClose, resetChallenge]);

  useEffect(() => {
    if (!isOpen) return undefined;

    let cancelled = false;
    Promise.resolve().then(() => {
      if (!cancelled) setModelStatus('loading');
    });

    const loadModel = async () => {
      try {
        const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
        const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
        const landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: {
            modelAssetPath: MODEL_PATH,
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numFaces: 2,
          outputFaceBlendshapes: true,
          minFaceDetectionConfidence: 0.6,
          minFacePresenceConfidence: 0.6,
          minTrackingConfidence: 0.6,
        });

        if (cancelled) {
          landmarker.close();
          return;
        }

        landmarkerRef.current = landmarker;
        setModelStatus('ready');
      } catch (error) {
        console.error('On-device face model failed to load:', error);
        if (!cancelled) setModelStatus('error');
      }
    };

    loadModel();
    return () => {
      cancelled = true;
      landmarkerRef.current?.close();
      landmarkerRef.current = null;
      stopCamera();
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      setCameraReady(false);
    };
  }, [isOpen, modelRetry, stopCamera]);

  useEffect(() => {
    if (!isOpen || modelStatus !== 'ready') return undefined;

    let cancelled = false;

    const startCamera = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setCameraError('CAMERA_UNAVAILABLE');
          return;
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 640 },
            height: { ideal: 480 },
            aspectRatio: { ideal: 4 / 3 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          setCameraError('CAMERA_UNAVAILABLE');
          stopCamera();
          return;
        }

        video.srcObject = stream;
        await video.play();

        const devices = await navigator.mediaDevices.enumerateDevices();
        setHasMultipleCameras(devices.filter((device) => device.kind === 'videoinput').length > 1);
        setCameraReady(true);
      } catch (error) {
        if (cancelled) return;
        console.error('Live face check camera failed:', error);
        stopCamera();
        setCameraReady(false);
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          setCameraError('CAMERA_PERMISSION_DENIED');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          setCameraError('NO_CAMERA_FOUND');
        } else {
          setCameraError('CAMERA_UNAVAILABLE');
        }
      }
    };

    startCamera();
    return () => {
      cancelled = true;
      setCameraReady(false);
      stopCamera();
    };
  }, [cameraRetry, facingMode, isOpen, modelStatus, stopCamera]);

  useEffect(() => {
    if (!isOpen || !cameraReady || !landmarkerRef.current) return undefined;

    let lastInferenceAt = 0;
    let isDetecting = false;
    const stepLabels = rRef.current;

    const advanceStep = (nextStep) => {
      stableFramesRef.current = 0;
      currentStepRef.current = nextStep;
      setCurrentStep(nextStep);
      setFaceStatus('');
    };

    const captureCompletedFrame = () => {
      const video = videoRef.current;
      if (!video || !video.videoWidth || !video.videoHeight) {
        setFaceStatus(rRef.current.faceScanCaptureError || 'Could not capture the photo. Please try again.');
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) {
        setFaceStatus(rRef.current.faceScanCaptureError || 'Could not capture the photo. Please try again.');
        return;
      }
      if (facingMode === 'user') {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const photo = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedPhoto(photo);
      setVerificationResult({
        photo,
        checksPassed: true,
        method: 'on-device-face-landmarks',
        completedAt: new Date().toISOString(),
      });
      stopCamera();
      setCameraReady(false);
    };

    const detect = (now) => {
      frameRef.current = requestAnimationFrame(detect);
      if (now - lastInferenceAt < 120 || isDetecting) return;

      const video = videoRef.current;
      const landmarker = landmarkerRef.current;
      if (!video || !landmarker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;

      lastInferenceAt = now;
      isDetecting = true;
      try {
        const result = landmarker.detectForVideo(video, now);
        const faces = result.faceLandmarks || [];
        const canvas = canvasRef.current;

        if (faces.length !== 1) {
          drawLandmarks(canvas, [], landmarker.constructor, facingMode === 'user');
          stableFramesRef.current = 0;
          const message = faces.length > 1
            ? stepLabels.faceScanMultipleFaces || 'Only one person should be in the frame'
            : stepLabels.faceScanNoFace || 'Move your face into the frame';
          setFaceStatus((current) => (current === message ? current : message));
          return;
        }

        const landmarks = faces[0];
        drawLandmarks(canvas, landmarks, landmarker.constructor, facingMode === 'user');
        const yaw = getYaw(landmarks);
        const step = currentStepRef.current;

        if (step === 0) {
          if (isFaceCentered(landmarks, yaw)) {
            stableFramesRef.current += 1;
            setFaceStatus(stepLabels.faceScanHoldStill || 'Good — hold still');
            if (stableFramesRef.current >= REQUIRED_STABLE_FRAMES) advanceStep(1);
          } else {
            stableFramesRef.current = 0;
            setFaceStatus(stepLabels.faceScanCenterFace || 'Move closer and center your face');
          }
        } else if (step === 1) {
          if (Math.abs(yaw) > 0.16) {
            stableFramesRef.current += 1;
            firstTurnDirectionRef.current = Math.sign(yaw);
            if (stableFramesRef.current >= REQUIRED_STABLE_FRAMES) advanceStep(2);
          } else {
            stableFramesRef.current = 0;
          }
        } else if (step === 2) {
          if (yaw * firstTurnDirectionRef.current < -0.16) {
            stableFramesRef.current += 1;
            if (stableFramesRef.current >= REQUIRED_STABLE_FRAMES) advanceStep(3);
          } else {
            stableFramesRef.current = 0;
          }
        } else if (step === 3) {
          const categories = result.faceBlendshapes?.[0]?.categories || [];
          const leftBlink = categories.find((category) => category.categoryName === 'eyeBlinkLeft')?.score || 0;
          const rightBlink = categories.find((category) => category.categoryName === 'eyeBlinkRight')?.score || 0;
          const isBlinkClosed = (leftBlink + rightBlink) / 2 > 0.55;

          if (isBlinkClosed) blinkClosedRef.current = true;
          if (blinkClosedRef.current && !isBlinkClosed && (leftBlink + rightBlink) / 2 < 0.25) {
            advanceStep(4);
            captureCompletedFrame();
          }
        }
      } catch (error) {
        console.error('On-device face landmark detection failed:', error);
        setCameraError('DETECTION_FAILED');
        stopCamera();
        setCameraReady(false);
      } finally {
        isDetecting = false;
      }
    };

    frameRef.current = requestAnimationFrame(detect);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [cameraReady, facingMode, isOpen, stopCamera]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isOpen]);

  const handleConfirm = () => {
    if (!verificationResult) return;
    onCompleteRef.current?.(verificationResult);
    handleClose();
  };

  const handleRetry = () => {
    resetChallenge();
    setCameraError('');
    if (modelStatus === 'error') setModelRetry((retry) => retry + 1);
    else setCameraRetry((retry) => retry + 1);
  };

  if (!isOpen) return null;

  const isBusy = !capturedPhoto && (
    modelStatus === 'idle' ||
    modelStatus === 'loading' ||
    (modelStatus === 'ready' && !cameraError && !cameraReady)
  );
  const cameraMessage = cameraError === 'CAMERA_PERMISSION_DENIED'
    ? r.faceScanPermissionDenied || 'Camera permission is blocked'
    : cameraError === 'NO_CAMERA_FOUND'
    ? r.faceScanNoCamera || 'No camera was found'
    : cameraError === 'DETECTION_FAILED'
    ? r.faceScanDetectionError || 'Face checks stopped. Please retry.'
    : r.faceScanCameraUnavailable || 'The camera could not be started';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
      onClick={handleClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="face-check-title"
        className="flex max-h-[92dvh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 text-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-cyan-500/15 p-2.5 text-cyan-300">
              <ScanFace className="h-5 w-5" />
            </div>
            <div>
              <h2 id="face-check-title" className="font-bold">
                {r.faceScanModalTitle || 'Live face checks'}
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                {r.faceScanModalSubtitle || 'Follow the prompts to complete a short camera check.'}
              </p>
            </div>
          </div>
          <button type="button" onClick={handleClose} aria-label={r.close || 'Close'} className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex items-start gap-2 border-b border-slate-800 bg-slate-900/70 px-5 py-3 text-xs leading-relaxed text-slate-300">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
          <p>
            {r.faceScanPrivacyNote || 'Face checks run on this device. Your final selfie is sent with registration and saved to your seller profile; it is not matched to your NIC.'}
          </p>
        </div>

        <div className="relative flex min-h-[220px] aspect-[4/3] max-h-[48vh] w-full flex-none items-center justify-center overflow-hidden bg-black">
          {modelStatus === 'ready' && !cameraError && !capturedPhoto && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onLoadedMetadata={() => {
                  if (canvasRef.current && videoRef.current) {
                    canvasRef.current.width = videoRef.current.videoWidth;
                    canvasRef.current.height = videoRef.current.videoHeight;
                  }
                }}
                className={`absolute inset-0 h-full w-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              <canvas
                ref={canvasRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 h-full w-full"
              />
              <div className="pointer-events-none absolute inset-x-4 top-4 flex justify-center">
                <span className="rounded-full border border-white/15 bg-black/70 px-4 py-2 text-center text-sm font-semibold text-white backdrop-blur">
                  {getStepLabel(currentStep, r)}
                </span>
              </div>
              {faceStatus && (
                <div role="status" aria-live="polite" className="pointer-events-none absolute inset-x-4 bottom-4 text-center">
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/75 px-3 py-2 text-xs font-medium text-cyan-100">
                    <ScanFace className="h-4 w-4 text-cyan-300" />
                    {faceStatus}
                  </span>
                </div>
              )}
            </>
          )}

          {isBusy && (
            <div className="flex flex-col items-center gap-3 px-6 text-center">
              <LoaderCircle className="h-9 w-9 animate-spin text-cyan-400" />
              <p className="text-sm text-slate-200">
                {modelStatus !== 'ready'
                  ? r.faceScanModelLoading || 'Loading the on-device face model…'
                  : r.faceScanStartingCamera || 'Starting your camera…'}
              </p>
            </div>
          )}

          {(modelStatus === 'error' || cameraError) && (
            <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center">
              <CircleAlert className="h-9 w-9 text-amber-400" />
              <p role="alert" className="text-sm font-semibold text-white">
                {modelStatus === 'error'
                  ? r.faceScanModelError || 'The on-device face model could not be loaded.'
                  : cameraMessage}
              </p>
              <p className="text-xs leading-relaxed text-slate-400">
                {cameraError === 'CAMERA_PERMISSION_DENIED'
                  ? r.faceScanPermissionHelp || 'Allow camera access in your browser settings, then try again.'
                  : r.faceScanRetryHelp || 'Check your connection and camera, then try again.'}
              </p>
              <button type="button" onClick={handleRetry} className="inline-flex items-center gap-2 rounded-xl bg-cyan-600 px-4 py-2 text-sm font-bold text-white hover:bg-cyan-500">
                <RefreshCw className="h-4 w-4" />
                {r.retry || 'Try again'}
              </button>
            </div>
          )}

          {capturedPhoto && verificationResult && (
            <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-slate-950 p-5 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={capturedPhoto} alt={r.faceScanPreviewAlt || 'Captured selfie preview'} className="max-h-[34vh] rounded-2xl border border-emerald-500/70 object-contain" />
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
                {r.faceScanVerifiedBadge || 'Live face checks complete'}
              </div>
              <p className="max-w-sm text-xs leading-relaxed text-slate-400">
                {r.faceScanVerifiedNote || 'Face position, head movement, and blink were detected on this device. This is not an identity match or a guarantee against spoofing.'}
              </p>
            </div>
          )}
        </div>

        <footer className="border-t border-slate-800 bg-slate-900/80 px-5 py-4">
          {!capturedPhoto ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="font-medium text-slate-200">{Math.min(currentStep, 4)} / 4</span>
                <span>{r.faceScanProgressLabel || 'live checks'}</span>
              </div>
              {hasMultipleCameras && cameraReady && (
                <button
                  type="button"
                  onClick={() => {
                    setFacingMode((mode) => (mode === 'user' ? 'environment' : 'user'));
                    setCameraReady(false);
                    resetChallenge();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"
                >
                  <SwitchCamera className="h-4 w-4" />
                  {r.faceScanSwitchCamera || 'Switch camera'}
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              <button type="button" onClick={handleRetry} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800">
                <RefreshCw className="h-4 w-4" />
                {r.faceScanRetake || 'Retake'}
              </button>
              <button type="button" onClick={handleConfirm} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-500">
                <CheckCircle2 className="h-4 w-4" />
                {r.faceScanSaveProceed || 'Use this selfie'}
              </button>
            </div>
          )}
        </footer>
      </section>
    </div>
  );
}

export function FaceLivenessVerificationCard({
  facePhoto,
  faceVerification,
  onStartVerification,
  onRemovePhoto,
  r = {},
  error = null,
}) {
  return (
    <div
      id="faceVerificationSection"
      className={`w-full rounded-2xl border p-4 transition-colors ${
        error
          ? 'border-red-400 bg-red-50/70 dark:border-red-800 dark:bg-red-950/30'
          : facePhoto
          ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/20'
          : 'border-brand-200 bg-white dark:border-slate-800 dark:bg-slate-900'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`rounded-xl p-2.5 ${facePhoto ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200' : 'bg-brand-600 text-white'}`}>
          {facePhoto ? <ShieldCheck className="h-5 w-5" /> : <ScanFace className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {r.faceSectionTitle || 'Live face checks'}
              <span className="ml-1 text-red-600" aria-hidden="true">*</span>
            </h3>
            {facePhoto && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                <CheckCircle2 className="h-3 w-3" />
                {r.faceVerifiedBadge || 'Face checks complete'}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {r.faceSectionDescription || 'Complete a short on-device camera check: center your face, turn your head both ways, and blink.'}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {r.faceScanPrivacyNote || 'Face checks run on this device. Your final selfie is sent with registration and saved to your seller profile; it is not matched to your NIC.'}
          </p>
        </div>
      </div>

      {!facePhoto ? (
        <button
          type="button"
          onClick={onStartVerification}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
        >
          <Camera className="h-4 w-4" />
          {r.startFaceScanBtn || 'Start face checks'}
        </button>
      ) : (
        <div className="mt-4 flex flex-col gap-3 border-t border-emerald-200 pt-3 dark:border-emerald-900 sm:flex-row sm:items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={facePhoto} alt={r.faceScanPreviewAlt || 'Captured selfie'} className="h-14 w-14 rounded-xl border border-emerald-400 object-cover" />
          <p className="flex-1 text-xs font-medium text-emerald-800 dark:text-emerald-200">
            {r.faceVerifiedDescription || 'Your face position, head movement, and blink were detected on this device.'}
            {faceVerification?.checksPassed && <span className="sr-only"> {r.faceScanChecksRecorded || 'The live checks were completed.'}</span>}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onStartVerification} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
              {r.reverifyFaceBtn || 'Retake'}
            </button>
            <button type="button" onClick={onRemovePhoto} aria-label={r.faceScanRemovePhoto || 'Remove selfie'} className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="mt-3 flex items-center gap-2 rounded-xl border border-red-300 bg-red-100 p-2.5 text-xs font-semibold text-red-800 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
          <CircleAlert className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
