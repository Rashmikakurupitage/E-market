'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { LoaderCircle, CircleAlert, CircleCheck, ArrowRight, KeyRound } from 'lucide-react';
import API from '../../src/lib/api';
import { fill, useLanguage } from '../../src/lib/i18n';
import { saveSession, safeNextPath } from '../../src/lib/auth';
import AuthPanel from '../../src/components/AuthPanel';
import AccountTypeTabs, { useAccountType } from '../../src/components/AccountTypeTabs';
import { Field, inputClass, primaryButtonClass } from '../../src/components/form';
import PasswordInput from '../../src/components/PasswordInput';
import { PageArt } from '../../src/components/Art';
import { BUSINESS_TYPES, DISTRICTS, isStrongPassword } from '../../src/lib/catalog';
import { parseNic } from '../../src/lib/nicInfo';
import NicPhotoUpload, { shrinkImage } from '../../src/components/NicPhotoUpload';
import FaceLivenessVerificationModal, { FaceLivenessVerificationCard } from '../../src/components/FaceLivenessVerification';

// Same rules as the backend (authController.js)
const PHONE_PATTERN = /^(?:\+94|94|0)\d{9}$/;

// A clear message when the server says the email address or NIC is wrong
const emailErrorText = (data, r) => {
  if (data?.code === 'NIC_FRONT_REQUIRED') return r.nicFrontRequired || 'Front side photo of your NIC is essential.';
  if (data?.code === 'NIC_BACK_REQUIRED') return r.nicBackRequired || 'Back side photo of your NIC is essential.';
  if (data?.code === 'FACE_VERIFICATION_REQUIRED') return r.faceVerificationRequired || 'A live face check is required.';
  if (data?.code === 'WOMEN_ONLY') return r.nicWomenOnly;
  if (data?.code === 'INVALID_NIC') return r.nicIncorrect;
  if (data?.code === 'EMAIL_TYPO') return fill(r.emailTypo, { suggestion: data.suggestion });
  if (data?.code === 'EMAIL_INVALID') return r.emailInvalid;
  if (data?.code === 'INVALID_BUSINESS_TYPE') return r.businessTypeInvalid;
  return '';
};

const cleanPhone = (value) => value.replace(/[\s-]/g, '');
const MAX_IDENTITY_IMAGE_BYTES = 900 * 1024;

const canvasToDataUrl = (canvas) => {
  for (const quality of [0.86, 0.76, 0.66, 0.56, 0.46]) {
    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
    if (Math.ceil(base64.length * 3 / 4) <= MAX_IDENTITY_IMAGE_BYTES) return dataUrl;
  }
  throw new Error('IMAGE_TOO_LARGE');
};

const compressImageFile = (file) => new Promise((resolve, reject) => {
  const image = new window.Image();
  const objectUrl = URL.createObjectURL(file);
  image.onload = () => {
    URL.revokeObjectURL(objectUrl);
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    try {
      resolve(canvasToDataUrl(canvas));
    } catch (error) {
      reject(error);
    }
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    reject(new Error('IMAGE_INVALID'));
  };
  image.src = objectUrl;
});

// Auto-capitalize first letter of each word (e.g. "kamal" -> "Kamal", "nimal perera" -> "Nimal Perera")
const capitalizeName = (value) => {
  if (!value) return '';
  return String(value)
    .split(/(\s+|[-'])/)
    .map((part) => {
      if (!part || /^\s+$/.test(part) || part === '-' || part === "'") return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
};

function SectionTitle({ number, children }) {
  return (
    <h2 className="font-sans flex items-center gap-2.5 text-sm font-bold uppercase tracking-wider text-slate-800">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs text-white">{number}</span>
      {children}
    </h2>
  );
}

function SellerRegisterForm({ onRegistered, onVerify, onNicTaken }) {
  const { t } = useLanguage();
  const r = t.register;

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    nicNumber: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    businessType: '',
    district: 'Colombo',
    description: '',
    phone: '',
    whatsappNo: '',
    messengerUrl: '',
    facebookUrl: '',
  });
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(true);
  const [nicTouched, setNicTouched] = useState(false);
  const [nicFront, setNicFront] = useState('');
  const [nicBack, setNicBack] = useState('');
  const [facePhoto, setFacePhoto] = useState('');
  const [faceVerification, setFaceVerification] = useState(null);
  const [isFaceModalOpen, setIsFaceModalOpen] = useState(false);
  const [scanningNic, setScanningNic] = useState(false);
  const [scanFeedback, setScanFeedback] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleResetPhotos = () => {
    setNicFront('');
    setNicBack('');
    setScanFeedback(null);
    setFormData((prev) => ({ ...prev, nicNumber: '' }));
    setFieldErrors((prev) => ({ ...prev, nic: undefined, nicFront: undefined, nicBack: undefined }));
  };

  const triggerBothPhotosScan = async (front, back) => {
    if (!front || !back) return;
    setScanningNic(true);
    setScanFeedback(null);
    try {
      const res = await API.post('/auth/scan-nic', { frontImage: front, backImage: back });
      if (res.data?.success && res.data.nicNumber) {
        const scannedNic = res.data.nicNumber;
        setFormData((prev) => ({ ...prev, nicNumber: scannedNic }));
        setNicTouched(false);

        const parsed = parseNic(scannedNic);
        const isMale = res.data.gender === 'male' || (parsed.valid && parsed.gender === 'male');

        if (isMale) {
          setFieldErrors((prev) => ({ ...prev, nic: r.nicWomenOnly }));
          setScanFeedback({
            type: 'male_rejected',
            gender: 'male',
            nic: scannedNic,
            title: r.womenOnlyTitle || 'Only Female Entrepreneurs Can Register as Sellers',
            text: r.nicWomenOnly
          });
        } else {
          setFieldErrors((prev) => ({ ...prev, nic: undefined }));
          const dob = res.data.birthDate ? res.data.birthDate.split('-').reverse().join('/') : '';
          setScanFeedback({
            type: 'success',
            text: (r.bothPhotosAutofilled ? fill(r.bothPhotosAutofilled, { nic: scannedNic, dob: dob || '—' }) : '') ||
              `Both photos uploaded! NIC Number (${scannedNic}) and Date of Birth (${dob || '—'}) auto-filled.`
          });
        }
      } else {
        setScanFeedback({
          type: 'warning',
          text: r.scanFailed || 'Could not auto-detect NIC number from the photos. Please upload a clearer photo or retake.'
        });
      }
    } catch (err) {
      console.error('OCR Error:', err);
      setScanFeedback({
        type: 'warning',
        text: r.scanFailed || 'Could not auto-detect NIC number from the photos. Please upload a clearer photo or retake.'
      });
    } finally {
      setScanningNic(false);
    }
  };

  const handleFrontChange = async (fileOrDataUrl) => {
    try {
      const dataUrl = await shrinkImage(fileOrDataUrl, 1400);
      setNicFront(dataUrl);
      setFieldErrors((prev) => ({ ...prev, nicFront: undefined }));

      setNicBack((currentBack) => {
        if (currentBack) {
          triggerBothPhotosScan(dataUrl, currentBack);
        } else {
          setScanFeedback({
            type: 'info',
            text: r.frontDoneNextBack || r.frontUploadedNeedBack || 'Front photo added. Now capture the Back side photo to auto-fill your details.'
          });
        }
        return currentBack;
      });
    } catch (err) {
      console.error('Front photo error:', err);
    }
  };

  const handleBackChange = async (fileOrDataUrl) => {
    try {
      const dataUrl = await shrinkImage(fileOrDataUrl, 1400);
      setNicBack(dataUrl);
      setFieldErrors((prev) => ({ ...prev, nicBack: undefined }));

      setNicFront((currentFront) => {
        if (currentFront) {
          triggerBothPhotosScan(currentFront, dataUrl);
        } else {
          setScanFeedback({
            type: 'info',
            text: r.backUploadedNeedFront || 'Back photo added. Please upload the Front side photo to auto-fill your NIC number and Date of Birth.'
          });
        }
        return currentFront;
      });
    } catch (err) {
      console.error('Back photo error:', err);
    }
  };

  const [currentStep, setCurrentStep] = useState(0);
  const [identityImages, setIdentityImages] = useState({ front: '', back: '', selfie: '' });
  const [identityConsent, setIdentityConsent] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraLoading, setCameraLoading] = useState(false);
  const videoRef = useRef(null);
  const cameraStreamRef = useRef(null);
  const cameraGenerationRef = useRef(0);
  const stepFieldsetRef = useRef(null);
  const stepperRef = useRef(null);

  useEffect(() => {
    if (cameraOpen && cameraStreamRef.current && videoRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
    }
  }, [cameraOpen, cameraLoading]);

  useEffect(() => () => {
    cameraGenerationRef.current += 1;
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (currentStep === 0) return;
    stepperRef.current?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'start',
    });
  }, [currentStep]);

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'firstName' || name === 'lastName') {
      value = capitalizeName(value);
    }
    setFormData({ ...formData, [name]: value });
    if (fieldErrors[name]) setFieldErrors({ ...fieldErrors, [name]: undefined });
  };

  const handleNameBlur = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: capitalizeName(value.trim()) }));
  };

  // The NIC number gives the gender and birth date: women only, and the birth date fills in by itself
  const nicInfo = parseNic(formData.nicNumber);
  const nicText = formData.nicNumber.trim();
  // Say so as soon as the NIC is clearly wrong: too many digits, wrong letters, or (once the person leaves the box) too few
  const nicLooksWrong = nicText.length > 0 && !nicInfo.valid && (nicText.length > 12 || !/^\d{0,12}[VvXx]?$/.test(nicText) || /^\d{9}[VvXx]$|^\d{12}$/.test(nicText) || nicTouched);
  const nicProblem = nicLooksWrong ? r.nicIncorrect : nicInfo.valid && nicInfo.gender === 'male' ? r.nicWomenOnly : '';
  const birthDate = nicInfo.valid && nicInfo.gender === 'female' ? nicInfo.birthDate : '';

  const validate = () => {
    const errors = {};
    if (!nicFront) errors.nicFront = r.nicFrontRequired || 'Front side photo of your NIC is essential.';
    if (!nicBack) errors.nicBack = r.nicBackRequired || 'Back side photo of your NIC is essential.';
    if (!facePhoto) {
      errors.facePhoto = r.faceVerificationRequired || 'A live face check is required for seller registration.';
    }
    if (!formData.nicNumber) {
      errors.nic = r.nicHint || 'NIC number is required (auto-filled from photos).';
    } else if (!nicInfo.valid) {
      errors.nic = r.nicIncorrect;
    } else if (nicInfo.gender === 'male') {
      errors.nic = r.nicWomenOnly;
      setScanFeedback({
        type: 'male_rejected',
        gender: 'male',
        nic: formData.nicNumber,
        title: r.womenOnlyTitle || 'Only Female Entrepreneurs Can Register as Sellers',
        text: r.nicWomenOnly
      });
    }
    if (!isStrongPassword(formData.password)) errors.password = r.passwordRule;
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    if (!formData.businessType) errors.businessType = r.businessTypeInvalid;
    if (!PHONE_PATTERN.test(cleanPhone(formData.phone))) errors.phone = r.phoneInvalid;
    if (!whatsappSameAsPhone && !PHONE_PATTERN.test(cleanPhone(formData.whatsappNo))) {
      errors.whatsappNo = r.phoneInvalid;
    }
    if (!identityImages.front || !identityImages.back || !identityImages.selfie) errors.identityDocuments = r.identityImagesRequired;
    if (!identityConsent) errors.identityConsent = r.identityConsentRequired;
    return errors;
  };

  const validateCurrentStep = () => {
    const fieldset = stepFieldsetRef.current;
    if (fieldset && !fieldset.reportValidity()) return false;

    const errors = {};
    if (currentStep === 0) {
      if (!nicInfo.valid) errors.nic = r.nicIncorrect;
      else if (nicInfo.gender === 'male') errors.nic = r.nicWomenOnly;
      if (!nicFront) errors.nicFront = r.nicFrontRequired || 'Front side photo of your NIC is essential.';
      if (!nicBack) errors.nicBack = r.nicBackRequired || 'Back side photo of your NIC is essential.';
      if (!facePhoto) errors.facePhoto = r.faceVerificationRequired || 'A live face check is required for seller registration.';
      if (!isStrongPassword(formData.password)) errors.password = r.passwordRule;
      if (formData.password !== formData.confirmPassword) errors.confirmPassword = r.passwordMismatch;
    }
    if (currentStep === 2) {
      if (!PHONE_PATTERN.test(cleanPhone(formData.phone))) errors.phone = r.phoneInvalid;
      if (!whatsappSameAsPhone && !PHONE_PATTERN.test(cleanPhone(formData.whatsappNo))) {
        errors.whatsappNo = r.phoneInvalid;
      }
    }
    if (currentStep === 3) {
      if (!identityImages.front || !identityImages.back || !identityImages.selfie) errors.identityDocuments = r.identityImagesRequired;
      if (!identityConsent) errors.identityConsent = r.identityConsentRequired;
    }

    setFieldErrors((previous) => ({ ...previous, ...errors }));
    const firstError = Object.keys(errors)[0];
    if (firstError) {
      if (currentStep === 0 && (errors.nicFront || errors.nicBack || errors.facePhoto)) {
        document.getElementById(errors.facePhoto ? 'faceVerificationSection' : 'nicPhotosSection')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      document.getElementById(firstError)?.focus();
      return false;
    }
    return true;
  };

  const moveToStep = (step) => {
    if (step <= currentStep) {
      setError('');
      setCurrentStep(step);
    } else if (step === currentStep + 1 && validateCurrentStep()) {
      setError('');
      setCurrentStep(step);
    }
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      if (errors.facePhoto) {
        document.getElementById('faceVerificationSection')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (errors.nicFront || errors.nicBack || (errors.nic && nicInfo?.gender === 'male')) {
        document.getElementById('nicPhotosSection')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        const firstKey = Object.keys(errors)[0];
        const el = document.getElementById(firstKey);
        if (el) {
          el.focus();
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      return;
    }

    const phone = cleanPhone(formData.phone);
    setLoading(true);
    try {
      const res = await API.post('/auth/register', {
        role: 'SELLER',
        firstName: capitalizeName(formData.firstName.trim()),
        lastName: capitalizeName(formData.lastName.trim()),
        email: formData.email.trim() || null,
        password: formData.password,
        nicNumber: formData.nicNumber.trim().toUpperCase(),
        businessName: formData.businessName.trim(),
        businessType: formData.businessType,
        district: formData.district,
        description: formData.description.trim(),
        phone,
        whatsappNo: whatsappSameAsPhone ? phone : cleanPhone(formData.whatsappNo),
        messengerUrl: formData.messengerUrl.trim(),
        facebookUrl: formData.facebookUrl.trim(),
        nicFront: nicFront || null,
        nicBack: nicBack || null,
        facePhoto: facePhoto || null,
        faceVerification: faceVerification || null,
        identityConsent,
        identityDocuments: identityImages,
      });

      // Log the new seller straight in
      // The account is not active until the emailed code is entered
      if (res.data.verificationRequired) {
        onVerify(res.data.email);
        return;
      }
      saveSession(res.data.user);
      onRegistered({ email: res.data.email, emailSent: Boolean(res.data.emailSent) });
    } catch (err) {
      const data = err.response?.data;
      if (data?.code === 'NIC_TAKEN') {
        onNicTaken();
      } else if (data?.code === 'INVALID_NIC' || data?.code === 'WOMEN_ONLY') {
        setCurrentStep(0);
        setFieldErrors((previous) => ({
          ...previous,
          nic: data.code === 'WOMEN_ONLY' ? r.nicWomenOnly : r.nicIncorrect,
        }));
      } else if (data?.code === 'IDENTITY_DOCUMENTS_REQUIRED' || data?.code === 'IDENTITY_CONSENT_REQUIRED') {
        setCurrentStep(3);
        setError(data.code === 'IDENTITY_CONSENT_REQUIRED' ? r.identityConsentRequired : r.identityImagesRequired);
      } else if (!err.response) {
        setError(r.networkError);
      } else {
        const respData = err.response.data;
        if (respData?.code === 'FACE_VERIFICATION_REQUIRED') {
          setFieldErrors((prev) => ({ ...prev, facePhoto: r.faceVerificationRequired || 'A live face check is required.' }));
          document.getElementById('faceVerificationSection')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (respData?.code === 'NIC_FRONT_REQUIRED') {
          setFieldErrors((prev) => ({ ...prev, nicFront: r.nicFrontRequired || 'Front side photo of your NIC is essential.' }));
          document.getElementById('nicPhotosSection')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (respData?.code === 'NIC_BACK_REQUIRED') {
          setFieldErrors((prev) => ({ ...prev, nicBack: r.nicBackRequired || 'Back side photo of your NIC is essential.' }));
          document.getElementById('nicPhotosSection')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (respData?.code === 'WOMEN_ONLY') {
          setFieldErrors((prev) => ({ ...prev, nic: r.nicWomenOnly }));
          setScanFeedback({
            type: 'male_rejected',
            gender: 'male',
            nic: formData.nicNumber,
            title: r.womenOnlyTitle || 'Only Female Entrepreneurs Can Register as Sellers',
            text: r.nicWomenOnly
          });
          document.getElementById('nicPhotosSection')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        setError(emailErrorText(respData, r) || respData?.message || r.genericError);
      }
    } finally {
      setLoading(false);
    }
  };

  const steps = [r.sectionPersonal, r.sectionBusiness, r.sectionContact, r.identitySection];
  const setIdentityImageFromFile = async (key, file) => {
    setError('');
    try {
      const data = await compressImageFile(file);
      setIdentityImages((images) => ({ ...images, [key]: data }));
      setFieldErrors((previous) => ({ ...previous, identityDocuments: undefined }));
    } catch (imageError) {
      setError(imageError.message === 'IMAGE_TOO_LARGE' ? r.identityImageTooLarge : r.identityImageInvalid);
    }
  };
  const openCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(r.cameraUnavailable);
      return;
    }
    const generation = ++cameraGenerationRef.current;
    setCameraLoading(true);
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      if (generation !== cameraGenerationRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      cameraStreamRef.current = stream;
    } catch {
      if (generation === cameraGenerationRef.current) setCameraError(r.cameraPermission);
    } finally {
      if (generation === cameraGenerationRef.current) setCameraLoading(false);
    }
  };
  const closeCamera = () => {
    cameraGenerationRef.current += 1;
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setCameraOpen(false);
    setCameraLoading(false);
  };
  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video?.videoWidth || !video.videoHeight) {
      setCameraError(r.cameraNotReady);
      return;
    }
    const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    try {
      setIdentityImages((images) => ({ ...images, selfie: canvasToDataUrl(canvas) }));
      setFieldErrors((previous) => ({ ...previous, identityDocuments: undefined }));
      closeCamera();
      setCameraError('');
    } catch {
      setCameraError(r.identityImageTooLarge);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div ref={stepperRef} className="scroll-mt-40 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate-800">
            {r.stepProgress.replace('{current}', String(currentStep + 1)).replace('{total}', String(steps.length))}
          </p>
          <p className="text-xs font-semibold text-slate-500">
            {steps[currentStep]}
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={currentStep + 1} aria-label={r.stepProgress.replace('{current}', String(currentStep + 1)).replace('{total}', String(steps.length))}>
          <div className="h-full rounded-full bg-brand-600 transition-[width] duration-300" style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }} />
        </div>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {steps.map((label, index) => (
            <li key={label}>
              <button
                type="button"
                onClick={() => moveToStep(index)}
                aria-current={index === currentStep ? 'step' : undefined}
                disabled={index > currentStep}
                className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-left text-xs font-semibold transition sm:px-3 ${index === currentStep ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-200' : index < currentStep ? 'text-brand-700 hover:bg-brand-50' : 'cursor-not-allowed text-slate-400'}`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${index < currentStep ? 'bg-brand-600 text-white' : index === currentStep ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {index < currentStep ? <CircleCheck className="h-4 w-4" /> : index + 1}
                </span>
                <span className="truncate">{label}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
      {/* 1. Personal details */}
      {currentStep === 0 && <fieldset ref={stepFieldsetRef} className="space-y-4">
        <SectionTitle number={1}>
          <span>{r.sectionPersonal}</span>
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-red-700 dark:bg-red-950/80 dark:text-red-300 ring-1 ring-red-400/40">
            {r.faceEssentialBadge || 'ESSENTIAL · MANDATORY KYC'}
          </span>
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="firstName" label={r.firstName} required>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              autoComplete="given-name"
              autoCapitalize="words"
              value={formData.firstName}
              onChange={handleChange}
              onBlur={handleNameBlur}
              className={inputClass(false)}
            />
          </Field>
          <Field id="lastName" label={r.lastName} required>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              autoComplete="family-name"
              autoCapitalize="words"
              value={formData.lastName}
              onChange={handleChange}
              onBlur={handleNameBlur}
              className={inputClass(false)}
            />
          </Field>
          <Field id="email" label={r.emailOptionalLabel || r.email} hint={r.emailOptionalHint} className="sm:col-span-2">
            <input id="email" name="email" type="email" autoComplete="email" value={formData.email} onChange={handleChange} className={inputClass(false)} placeholder="name@example.com" />
          </Field>

          {/* Front & Back NIC Photos with OCR Scanning & Autofill */}
          <NicPhotoUpload
            frontImage={nicFront}
            backImage={nicBack}
            onFrontChange={handleFrontChange}
            onBackChange={handleBackChange}
            onFrontRemove={() => {
              setNicFront('');
              setScanFeedback(null);
              setFormData((prev) => ({ ...prev, nicNumber: '' }));
              setFieldErrors((prev) => ({ ...prev, nic: undefined, nicFront: undefined }));
            }}
            onBackRemove={() => {
              setNicBack('');
              setScanFeedback(null);
              setFormData((prev) => ({ ...prev, nicNumber: '' }));
              setFieldErrors((prev) => ({ ...prev, nic: undefined, nicBack: undefined }));
            }}
            onResetAll={handleResetPhotos}
            scanning={scanningNic}
            scanFeedback={scanFeedback}
            errors={fieldErrors}
            r={r}
          />

          {/* On-device live face checks for seller registration */}
          <div className="sm:col-span-2">
            <FaceLivenessVerificationCard
              facePhoto={facePhoto}
              faceVerification={faceVerification}
              onStartVerification={() => setIsFaceModalOpen(true)}
              onRemovePhoto={() => {
                setFacePhoto('');
                setFaceVerification(null);
              }}
              r={r}
              error={fieldErrors.facePhoto}
            />
          </div>

          <Field id="nicNumber" label={r.nic} required hint={r.nicHint} error={fieldErrors.nic || nicProblem}>
            <input
              id="nicNumber"
              name="nicNumber"
              type="text"
              readOnly
              tabIndex={-1}
              placeholder={r.nicPlaceholderAuto || "Auto-filled from photos"}
              value={formData.nicNumber}
              className={`${inputClass(!!(fieldErrors.nic || nicProblem))} cursor-not-allowed bg-slate-50 text-sm font-sans tracking-normal`}
              aria-invalid={!!(fieldErrors.nic || nicProblem)}
            />
          </Field>
          <Field id="dateOfBirth" label={r.dateOfBirth} hint={r.dateOfBirthHint}>
            <input id="dateOfBirth" name="dateOfBirth" type="text" readOnly tabIndex={-1} placeholder="dd/mm/yyyy" value={birthDate ? birthDate.split("-").reverse().join("/") : ""} className={`${inputClass(false)} cursor-not-allowed bg-slate-50 text-sm font-sans tracking-normal`} />
          </Field>
          <Field id="password" label={r.password || 'Password'} required hint={r.passwordRule} error={fieldErrors.password}>
            <PasswordInput id="password" name="password" autoComplete="new-password" value={formData.password} onChange={handleChange} hasError={!!fieldErrors.password} placeholder="" showLabel={r.showPassword} hideLabel={r.hidePassword} />
          </Field>
          <Field id="confirmPassword" label={r.confirmPassword || 'Confirm password'} required error={fieldErrors.confirmPassword}>
            <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} hasError={!!fieldErrors.confirmPassword} placeholder="Repeat your password" showLabel={r.showPassword} hideLabel={r.hidePassword} />
          </Field>
        </div>
        <p className="flex items-start gap-2.5 rounded-xl bg-brand-50 p-3.5 text-sm text-slate-700 ring-1 ring-brand-100">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
          {r.loginInfo}
        </p>
      </fieldset>}

      {/* 2. Business details */}
      {currentStep === 1 && <fieldset ref={stepFieldsetRef} className="space-y-4">
        <SectionTitle number={2}>{r.sectionBusiness}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="businessName" label={r.businessName} required>
            <input id="businessName" name="businessName" type="text" required autoComplete="organization" value={formData.businessName} onChange={handleChange} className={inputClass(false)} />
          </Field>
          <Field id="businessType" label={r.businessType} required error={fieldErrors.businessType}>
            <select id="businessType" name="businessType" required value={formData.businessType} onChange={handleChange} aria-invalid={!!fieldErrors.businessType} className={inputClass(fieldErrors.businessType)}>
              <option value="" disabled>{r.businessTypePlaceholder}</option>
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type}>{t.categories[type] || type}</option>
              ))}
            </select>
          </Field>
          <Field id="district" label={r.district} required>
            <select id="district" name="district" value={formData.district} onChange={handleChange} className={inputClass(false)}>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <Field id="description" label={r.description} className="sm:col-span-2">
            <textarea id="description" name="description" rows={3} value={formData.description} onChange={handleChange} className={inputClass(false)} placeholder={r.descriptionPlaceholder} />
          </Field>
        </div>
      </fieldset>}

      {/* 3. Contact details */}
      {currentStep === 2 && <fieldset ref={stepFieldsetRef} className="space-y-4">
        <SectionTitle number={3}>{r.sectionContact}</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="phone" label={r.phone} required error={fieldErrors.phone}>
            <input id="phone" name="phone" type="tel" inputMode="tel" required autoComplete="tel" value={formData.phone} onChange={handleChange} aria-invalid={!!fieldErrors.phone} className={inputClass(fieldErrors.phone)} />
          </Field>
          <Field id="whatsappNo" label={r.whatsapp} required hint={r.whatsappHint} error={fieldErrors.whatsappNo}>
            <input
              id="whatsappNo"
              name="whatsappNo"
              type="tel"
              inputMode="tel"
              required={!whatsappSameAsPhone}
              disabled={whatsappSameAsPhone}
              value={whatsappSameAsPhone ? formData.phone : formData.whatsappNo}
              onChange={handleChange}
              aria-invalid={!!fieldErrors.whatsappNo}
              className={inputClass(fieldErrors.whatsappNo)}
            />
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={whatsappSameAsPhone}
                onChange={(e) => {
                  setWhatsappSameAsPhone(e.target.checked);
                  setFieldErrors({ ...fieldErrors, whatsappNo: undefined });
                }}
                className="h-4 w-4 rounded border-slate-300 accent-brand-600"
              />
              {r.sameAsPhone}
            </label>
          </Field>
          <Field id="messengerUrl" label={r.messengerUrl || 'Facebook Messenger URL'} className="sm:col-span-2">
            <input id="messengerUrl" name="messengerUrl" type="url" value={formData.messengerUrl} onChange={handleChange} className={inputClass(false)} placeholder="https://m.me/your-page" />
          </Field>
          <Field id="facebookUrl" label={r.facebookUrl || 'Facebook profile URL'} className="sm:col-span-2">
            <input id="facebookUrl" name="facebookUrl" type="url" value={formData.facebookUrl} onChange={handleChange} className={inputClass(false)} placeholder="https://facebook.com/your-page" />
          </Field>
        </div>
      </fieldset>}

      {currentStep === 3 && <fieldset ref={stepFieldsetRef} className="space-y-4">
        <SectionTitle number={4}>{r.identitySection}</SectionTitle>
        <p className="rounded-xl bg-amber-50 p-3.5 text-sm text-amber-900 ring-1 ring-amber-200">{r.identityReviewInfo}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            { key: 'front', label: r.nicFront },
            { key: 'back', label: r.nicBack },
          ].map(({ key, label }) => (
            <Field key={key} id={`identity-${key}`} label={label} required>
              <input
                id={`identity-${key}`}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) setIdentityImageFromFile(key, file);
                  event.target.value = '';
                }}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-50 file:px-3 file:py-2 file:font-semibold file:text-brand-700 hover:file:bg-brand-100"
              />
              {identityImages[key] && <Image src={identityImages[key]} alt={label} width={640} height={400} unoptimized className="mt-2 max-h-40 w-full rounded-lg border border-slate-200 bg-white object-contain" />}
            </Field>
          ))}
          <div className="space-y-3 sm:col-span-2">
            <p className="text-sm font-semibold text-slate-800">{r.liveSelfie}</p>
            {cameraOpen ? (
              <div className="space-y-3">
                <video ref={videoRef} autoPlay playsInline muted className="max-h-80 w-full rounded-xl bg-slate-900 object-contain" />
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={captureSelfie} disabled={cameraLoading || !!cameraError} className="rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{cameraLoading ? r.cameraStarting : r.captureSelfie}</button>
                  <button type="button" onClick={closeCamera} className="rounded-full px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">{r.cancelCamera}</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={openCamera} className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-100">{identityImages.selfie ? r.retakeSelfie : r.startCamera}</button>
            )}
            {cameraError && <p role="alert" className="text-sm text-red-700">{cameraError}</p>}
            {identityImages.selfie && !cameraOpen && <Image src={identityImages.selfie} alt={r.liveSelfie} width={640} height={640} unoptimized className="max-h-56 w-full rounded-lg border border-slate-200 bg-white object-contain" />}
          </div>
        </div>
        {fieldErrors.identityDocuments && <p id="identityDocuments" role="alert" className="text-sm text-red-700">{fieldErrors.identityDocuments}</p>}
        <label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
          <input id="identityConsent" type="checkbox" checked={identityConsent} onChange={(event) => { setIdentityConsent(event.target.checked); setFieldErrors((previous) => ({ ...previous, identityConsent: undefined })); }} className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600" />
          <span>{r.identityConsent}</span>
        </label>
        {fieldErrors.identityConsent && <p role="alert" className="text-sm text-red-700">{fieldErrors.identityConsent}</p>}
      </fieldset>}

      <div className="space-y-4 border-t border-slate-100 pt-5">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          {currentStep > 0 ? (
            <button type="button" onClick={() => moveToStep(currentStep - 1)} className="min-h-12 rounded-xl px-5 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100">
              {r.stepBack}
            </button>
          ) : <span />}
          {currentStep < steps.length - 1 ? (
            <button type="button" onClick={() => moveToStep(currentStep + 1)} className={`${primaryButtonClass} min-h-12 sm:min-w-40`}>
              {r.stepNext}<ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="submit" disabled={loading} className={`${primaryButtonClass} min-h-12 sm:min-w-56`}>
              {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
              {loading ? r.submitting : r.submit}
            </button>
          )}
        </div>
        <p className="text-center text-sm text-slate-500">
          {r.haveAccount}{' '}
          <Link href="/login" className="font-semibold text-brand-700 hover:underline">
            {r.loginLink}
          </Link>
        </p>
      </div>

      <FaceLivenessVerificationModal
        isOpen={isFaceModalOpen}
        onComplete={(result) => {
          setFacePhoto(result.photo);
          setFaceVerification(result);
          setFieldErrors((prev) => ({ ...prev, facePhoto: undefined }));
        }}
        onClose={() => setIsFaceModalOpen(false)}
        r={r}
      />
    </form>
  );
}

function CustomerRegisterForm({ onRegistered, onVerify }) {
  const { t } = useLanguage();
  const r = t.register;
  const c = t.customer;
  // Keep the page the customer came from (e.g. a product) when they choose to log in instead
  const next = safeNextPath(useSearchParams().get('next'));

  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', phone: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    let { name, value } = e.target;
    if (name === 'firstName' || name === 'lastName') {
      value = capitalizeName(value);
    }
    setFormData({ ...formData, [name]: value });
    if (fieldErrors[name]) setFieldErrors({ ...fieldErrors, [name]: undefined });
  };

  const handleNameBlur = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: capitalizeName(value.trim()) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const errors = {};
    if (!isStrongPassword(formData.password)) errors.password = r.passwordRule;
    if (formData.password !== formData.confirmPassword) errors.confirmPassword = 'Passwords do not match.';
    if (!PHONE_PATTERN.test(cleanPhone(formData.phone))) errors.phone = r.phoneInvalid;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      document.getElementById(Object.keys(errors)[0])?.focus();
      return;
    }

    const phone = cleanPhone(formData.phone);
    setLoading(true);
    try {
      const res = await API.post('/auth/register', {
        role: 'CUSTOMER',
        firstName: capitalizeName(formData.firstName.trim()),
        lastName: capitalizeName(formData.lastName.trim()),
        email: formData.email.trim() || null,
        password: formData.password,
        nicNumber: '',
        phone,
      });

      // Log the new customer straight in
      // The account is not active until the emailed code is entered
      if (res.data.verificationRequired) {
        onVerify(res.data.email);
        return;
      }
      saveSession(res.data.user);
      onRegistered({ email: res.data.email, emailSent: Boolean(res.data.emailSent) });
    } catch (err) {
      if (!err.response) {
        setError(r.networkError);
      } else {
        setError(emailErrorText(err.response.data, r) || err.response.data?.message || r.genericError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <fieldset className="space-y-4">
        <SectionTitle number={1}>
          <span>{r.sectionPersonal}</span>
          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-red-700 dark:bg-red-950/80 dark:text-red-300 ring-1 ring-red-400/40">
            {r.faceEssentialBadge || 'ESSENTIAL · MANDATORY KYC'}
          </span>
        </SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="firstName" label={r.firstName} required>
            <input
              id="firstName"
              name="firstName"
              type="text"
              required
              autoComplete="given-name"
              autoCapitalize="words"
              value={formData.firstName}
              onChange={handleChange}
              onBlur={handleNameBlur}
              className={inputClass(false)}
            />
          </Field>
          <Field id="lastName" label={r.lastName} required>
            <input
              id="lastName"
              name="lastName"
              type="text"
              required
              autoComplete="family-name"
              autoCapitalize="words"
              value={formData.lastName}
              onChange={handleChange}
              onBlur={handleNameBlur}
              className={inputClass(false)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Field id="email" label={r.emailOptionalLabel || r.email} hint={r.emailOptionalHint}>
              <input id="email" name="email" type="email" autoComplete="email" value={formData.email} onChange={handleChange} className={inputClass(false)} placeholder="name@example.com" />
            </Field>
          </div>
          <Field id="password" label={r.password || 'Password'} required hint={r.passwordRule} error={fieldErrors.password}>
            <PasswordInput id="password" name="password" autoComplete="new-password" value={formData.password} onChange={handleChange} hasError={!!fieldErrors.password} placeholder="" showLabel={r.showPassword} hideLabel={r.hidePassword} />
          </Field>
          <Field id="confirmPassword" label={r.confirmPassword || 'Confirm password'} required error={fieldErrors.confirmPassword}>
            <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" value={formData.confirmPassword} onChange={handleChange} hasError={!!fieldErrors.confirmPassword} placeholder="Repeat your password" showLabel={r.showPassword} hideLabel={r.hidePassword} />
          </Field>
          <Field id="phone" label={r.phone} required error={fieldErrors.phone} className="sm:col-span-2">
            <input id="phone" name="phone" type="tel" inputMode="tel" required autoComplete="tel" value={formData.phone} onChange={handleChange} aria-invalid={!!fieldErrors.phone} className={inputClass(fieldErrors.phone)} />
          </Field>
        </div>
        <p className="flex items-start gap-2.5 rounded-xl bg-brand-50 p-3.5 text-sm text-slate-700 ring-1 ring-brand-100">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
          {r.loginInfo}
        </p>
      </fieldset>

      <div className="space-y-4">
        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading && <LoaderCircle className="h-4 w-4 animate-spin" />}
          {loading ? r.submitting : c.submit}
        </button>
        <p className="text-center text-sm text-slate-500">
          {r.haveAccount}{' '}
          <Link href={`/login?as=customer${next ? `&next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-brand-700 hover:underline">
            {r.loginLink}
          </Link>
        </p>
      </div>
    </form>
  );
}

function Register() {
  const router = useRouter();
  const { t } = useLanguage();
  const r = t.register;
  const c = t.customer;
  const type = useAccountType();
  const [registered, setRegistered] = useState(null); // { role: 'seller' | 'customer', email, emailSent } once signed up

  // Customers sent here from the Store's checkout go back there after signing up
  const next = safeNextPath(useSearchParams().get('next'));
  const nextPage = registered?.role === 'customer' ? next || '/account' : '/dashboard';

  // Optional verification page if user chooses to verify
  const goVerify = (email) =>
    router.push(`/verify-email?email=${encodeURIComponent(email)}&as=${type}${next ? `&next=${encodeURIComponent(next)}` : ''}`);

  // After a successful sign-up, move straight on to the dashboard (sellers) or account page (customers)
  useEffect(() => {
    if (!registered) return;
    const timer = setTimeout(() => router.push(nextPage), 2500);
    return () => clearTimeout(timer);
  }, [registered, nextPage, router]);

  const panel =
    type === 'customer'
      ? { title: c.registerTitle, subtitle: c.registerSubtitle, listTitle: c.benefitsTitle, items: c.benefits }
      : { title: r.title, subtitle: r.subtitle, listTitle: r.benefitsTitle, items: r.benefits };

  return (
    <main className="relative isolate flex-1 px-3 py-6 sm:px-6 sm:py-14 w-full max-w-full overflow-x-hidden">
      <PageArt />
      <div className="mx-auto grid max-w-6xl animate-zoom-in overflow-hidden rounded-[24px] sm:rounded-[32px] bg-white shadow-xl ring-1 ring-ink/5 lg:grid-cols-[2fr_3fr]">
        <AuthPanel {...panel} />

        <section className="px-4 py-6 sm:px-10 sm:py-10">
          {registered ? (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center" role="status">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 ring-8 ring-brand-50/50">
                <CircleCheck className="h-9 w-9 text-brand-600" />
              </span>
              <h2 className="mt-6 text-2xl font-extrabold text-slate-900">{r.successTitle}</h2>
              <p className="mt-2 max-w-sm text-sm text-slate-500">{registered.role === 'customer' ? c.successSub : r.successSub}</p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push(nextPage)}
                  className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
                >
                  {registered.role === 'customer' ? c.goToAccount : r.goToDashboard}
                  <ArrowRight className="h-4 w-4" />
                </button>
                {registered.email && registered.emailSent && (
                  <button
                    type="button"
                    onClick={() => goVerify(registered.email)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-xs font-semibold text-ink/75 hover:border-brand-300 hover:text-brand-700"
                  >
                    {r.verifyEmailOptional || 'Verify email now (Optional)'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <AccountTypeTabs basePath="/register" current={type} />
              </div>
              {type === 'customer' ? (
                <CustomerRegisterForm onRegistered={(info) => setRegistered({ role: 'customer', ...info })} onVerify={goVerify} />
              ) : (
                <SellerRegisterForm
                  onRegistered={(info) => setRegistered({ role: 'seller', ...info })}
                  onVerify={goVerify}
                  onNicTaken={() => router.push('/login?nicRegistered=1')}
                />
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

// The Seller/Customer choice comes from the URL (?as=customer), which needs a Suspense boundary
export default function RegisterPage() {
  return (
    <Suspense fallback={<main className="flex-1" />}>
      <Register />
    </Suspense>
  );
}
