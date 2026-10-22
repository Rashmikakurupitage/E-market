'use client';

import { useEffect, useState } from 'react';
import { BookOpen, CircleCheck, CirclePlus, LoaderCircle, Pencil, Plus, Send, EyeOff, Trash2, Upload, Image as ImageIcon, Video, Music2 } from 'lucide-react';
import API from '../lib/api';
import { LANGUAGES, translations, useLanguage } from '../lib/i18n';
import { inputClass } from './form';

function AdminImagePreview({ courseId, slot, label, unavailableLabel }) {
  const [imageUrl, setImageUrl] = useState('');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl;
    API.get(`/admin/learning-courses/${encodeURIComponent(courseId)}/media/${encodeURIComponent(slot)}`, {
      responseType: 'blob',
    })
      .then((response) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(response.data);
        setImageUrl(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [courseId, slot]);

  return (
    <div
      role="img"
      aria-label={label}
      className="mt-2 flex h-24 w-40 items-center justify-center rounded-lg bg-cover bg-center text-xs text-slate-500 ring-1 ring-slate-200"
      style={imageUrl ? { backgroundImage: `url("${imageUrl}")` } : undefined}
    >
      {failed && unavailableLabel}
    </div>
  );
}

const LANGUAGE_CODES = LANGUAGES.map(({ code }) => code);
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/webm'];
const AUDIO_TYPES = ['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'];
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
const MAX_LESSONS = 100;

function courseMediaUrl(courseId, slot, updatedAt) {
  const path = `/learning/media/${encodeURIComponent(courseId)}/${encodeURIComponent(slot)}`;
  return API.getUri({ url: path }) + (updatedAt ? `?v=${encodeURIComponent(updatedAt)}` : '');
}

function shrinkImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('image-processing'));
        return;
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error('image-processing')), 'image/jpeg', 0.85);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('image-processing'));
    };
    image.src = objectUrl;
  });
}

function defaultContent() {
  return {
    themeKey: 'Digital Marketing',
    categoryKey: 'digitalMarketing',
    levelKey: 'beginner',
    translations: Object.fromEntries(LANGUAGE_CODES.map((language) => [language, {
      title: '',
      description: '',
      duration: '',
      lessons: [{ title: '', body: '' }],
      quiz: [{ question: '', options: ['', '', ''], answerIndex: 0 }],
    }])),
  };
}

function contentFromBuiltIn(courseId) {
  const builtInCourses = Object.fromEntries(LANGUAGE_CODES.map((language) => [
    language,
    translations[language].elearningHub.courses.find((course) => String(course.id) === String(courseId)),
  ]));
  const builtIn = builtInCourses.en;
  if (!builtIn) return defaultContent();
  return {
    themeKey: builtIn.themeKey,
    categoryKey: builtIn.categoryKey,
    levelKey: builtIn.levelKey,
    translations: Object.fromEntries(LANGUAGE_CODES.map((language) => {
      const course = builtInCourses[language];
      return [language, {
        title: course.title,
        description: course.description,
        duration: course.duration,
        lessons: course.lessons.map(({ title, body }) => ({ title, body })),
        quiz: course.quiz.map(({ question, options, answerIndex }) => ({ question, options: [...options], answerIndex })),
      }];
    })),
  };
}

function isBuiltInId(id) {
  return /^[1-6]$/.test(String(id));
}

function replaceRecord(records, updated) {
  const filtered = records.filter((record) => record.id !== updated.id);
  return [updated, ...filtered];
}

export default function AdminLearningCourses({ onChanged, onAuthError }) {
  const { t, lang } = useLanguage();
  const copy = t.admin.courseManager;
  const [records, setRecords] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(lang);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [publishingId, setPublishingId] = useState(null);
  const [uploadingSlot, setUploadingSlot] = useState(null);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    let ignore = false;
    API.get('/admin/learning-courses')
      .then((response) => {
        if (ignore) return;
        setRecords(response.data);
        setLoadFailed(false);
      })
      .catch((error) => {
        if (ignore) return;
        if ([401, 403].includes(error.response?.status)) onAuthError();
        else setLoadFailed(true);
      });
    return () => {
      ignore = true;
    };
  }, [onAuthError]);

  const builtInCourses = translations.en.elearningHub.courses;
  const recordMap = new Map((records || []).map((record) => [String(record.id), record]));
  const courses = [
    ...builtInCourses.map((course) => {
      const saved = recordMap.get(String(course.id));
      const content = saved || contentFromBuiltIn(course.id);
      return {
        id: String(course.id),
        title: content.translations[lang].title,
        description: content.translations[lang].description,
        lessonCount: content.translations[lang].lessons.length,
        published: saved ? saved.published : true,
        saved: Boolean(saved),
      };
    }),
    ...(records || [])
      .filter((record) => !isBuiltInId(record.id))
      .map((record) => ({
        id: String(record.id),
        title: record.translations[lang].title,
        description: record.translations[lang].description,
        lessonCount: record.translations[lang].lessons.length,
        published: record.published,
        saved: true,
      })),
  ];

  const startEdit = (courseId) => {
    const existing = recordMap.get(String(courseId));
    setEditingId(String(courseId));
    setDraft(existing || contentFromBuiltIn(courseId));
    setFormError('');
    setSelectedLanguage(lang);
  };

  const startNew = () => {
    setEditingId(null);
    setDraft(defaultContent());
    setFormError('');
    setSelectedLanguage(lang);
  };

  const closeEditor = () => {
    setEditingId(null);
    setDraft(null);
    setFormError('');
  };

  const updateDraft = (key, value) => setDraft((previous) => ({ ...previous, [key]: value }));
  const updateTranslation = (language, updater) => setDraft((previous) => ({
    ...previous,
    translations: {
      ...previous.translations,
      [language]: updater(previous.translations[language]),
    },
  }));

  const addLesson = () => setDraft((previous) => {
    if (previous.translations.en.lessons.length >= MAX_LESSONS) return previous;
    return {
      ...previous,
      translations: Object.fromEntries(LANGUAGE_CODES.map((language) => [
        language,
        { ...previous.translations[language], lessons: [...previous.translations[language].lessons, { title: '', body: '' }] },
      ])),
    };
  });

  const removeLesson = (index) => setDraft((previous) => ({
    ...previous,
    translations: Object.fromEntries(LANGUAGE_CODES.map((language) => [
      language,
      { ...previous.translations[language], lessons: previous.translations[language].lessons.filter((_, i) => i !== index) },
    ])),
  }));

  const addQuestion = () => setDraft((previous) => ({
    ...previous,
    translations: Object.fromEntries(LANGUAGE_CODES.map((language) => [
      language,
      { ...previous.translations[language], quiz: [...previous.translations[language].quiz, { question: '', options: ['', '', ''], answerIndex: 0 }] },
    ])),
  }));

  const removeQuestion = (index) => setDraft((previous) => ({
    ...previous,
    translations: Object.fromEntries(LANGUAGE_CODES.map((language) => [
      language,
      { ...previous.translations[language], quiz: previous.translations[language].quiz.filter((_, i) => i !== index) },
    ])),
  }));

  const persistDraft = async (content, courseId) => {
    const response = courseId === null
      ? await API.post('/admin/learning-courses', { content })
      : await API.put(`/admin/learning-courses/${encodeURIComponent(courseId)}`, { content });
    setRecords((previous) => replaceRecord(previous || [], response.data));
    setEditingId(String(response.data.id));
    setDraft(response.data);
    return response.data;
  };

  const saveCourse = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await persistDraft(draft, editingId);
      onChanged(copy.saved);
    } catch (error) {
      if ([401, 403].includes(error.response?.status)) onAuthError();
      else setFormError(copy.saveError);
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (course) => {
    setPublishingId(course.id);
    try {
      const content = recordMap.get(course.id) || contentFromBuiltIn(course.id);
      const response = await API.patch(`/admin/learning-courses/${encodeURIComponent(course.id)}/published`, {
        published: !course.published,
        content,
      });
      setRecords((previous) => replaceRecord(previous || [], response.data));
      onChanged(copy.publicationSaved);
    } catch (error) {
      if ([401, 403].includes(error.response?.status)) onAuthError();
      else onChanged(copy.saveError, true);
    } finally {
      setPublishingId(null);
    }
  };

  const mediaFor = (slot) => recordMap.get(String(editingId))?.media?.find((item) => item.slot === slot);

  const uploadMedia = async (slot, file, kind) => {
    if (!file || !draft) return;
    if (kind === 'image' && !IMAGE_TYPES.includes(file.type)) {
      setFormError(copy.mediaTypes);
      return;
    }
    if (kind === 'video' && !VIDEO_TYPES.includes(file.type)) {
      setFormError(copy.mediaTypes);
      return;
    }
    if (kind === 'audio' && !AUDIO_TYPES.includes(file.type)) {
      setFormError(copy.mediaTypes);
      return;
    }
    const maxBytes = kind === 'image' ? MAX_IMAGE_BYTES : kind === 'video' ? MAX_VIDEO_BYTES : MAX_AUDIO_BYTES;
    if (file.size > maxBytes) {
      setFormError(kind === 'image' ? copy.imageSizeLimit : kind === 'video' ? copy.videoSizeLimit : copy.audioSizeLimit);
      return;
    }

    setUploadingSlot(slot);
    setFormError('');
    try {
      const savedCourse = await persistDraft(draft, editingId);
      const courseId = String(savedCourse.id);
      const body = kind === 'image' ? await shrinkImage(file) : file;
      const contentType = kind === 'image' ? 'image/jpeg' : file.type;
      const response = await API.put(
        `/admin/learning-courses/${encodeURIComponent(courseId)}/media/${encodeURIComponent(slot)}`,
        body,
        { headers: { 'Content-Type': contentType } }
      );
      setRecords((previous) => (previous || []).map((record) => {
        if (String(record.id) !== courseId) return record;
        return {
          ...record,
          media: [...(record.media || []).filter((item) => item.slot !== slot), response.data],
        };
      }));
      onChanged(copy.mediaSaved);
    } catch (error) {
      if ([401, 403].includes(error.response?.status)) onAuthError();
      else if (error.response?.status === 413) {
        setFormError(kind === 'image' ? copy.imageSizeLimit : kind === 'video' ? copy.videoSizeLimit : copy.audioSizeLimit);
      }
      else if (error.response?.status === 400) setFormError(copy.saveError);
      else setFormError(copy.mediaSaveError);
    } finally {
      setUploadingSlot(null);
    }
  };

  const removeMedia = async (slot) => {
    if (!editingId) return;
    setUploadingSlot(slot);
    setFormError('');
    try {
      await API.delete(`/admin/learning-courses/${encodeURIComponent(editingId)}/media/${encodeURIComponent(slot)}`);
      setRecords((previous) => (previous || []).map((record) => (
        String(record.id) === String(editingId)
          ? { ...record, media: (record.media || []).filter((item) => item.slot !== slot) }
          : record
      )));
      onChanged(copy.mediaRemoved);
    } catch (error) {
      if ([401, 403].includes(error.response?.status)) onAuthError();
      else setFormError(copy.mediaSaveError);
    } finally {
      setUploadingSlot(null);
    }
  };

  const mediaControl = (slot, kind, label) => {
    const media = mediaFor(slot);
    const busy = uploadingSlot === slot;
    const canEditMedia = Boolean(draft);
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-cream p-3">
        {kind === 'image'
          ? <ImageIcon className="h-4 w-4 shrink-0 text-slate-500" />
          : kind === 'video'
            ? <Video className="h-4 w-4 shrink-0 text-slate-500" />
            : <Music2 className="h-4 w-4 shrink-0 text-slate-500" />}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-700">{label}</p>
          {media && (
            kind === 'image'
              ? <AdminImagePreview key={`${editingId}-${slot}-${media.updatedAt}`} courseId={editingId} slot={slot} label={label} unavailableLabel={copy.mediaPreviewError} />
              : kind === 'video'
                ? <video className="mt-2 max-h-32 w-full max-w-sm rounded-lg bg-black" controls preload="metadata" src={courseMediaUrl(editingId, slot, media.updatedAt)} />
                : <audio className="mt-2 w-full max-w-sm" controls preload="metadata" src={courseMediaUrl(editingId, slot, media.updatedAt)} />
          )}
        </div>
        <label
          className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-brand-700 ring-1 ring-brand-200 ${canEditMedia && !busy ? 'cursor-pointer hover:bg-white' : 'cursor-not-allowed opacity-50'}`}
        >
          {busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {media ? copy.replaceMedia : kind === 'image' ? copy.chooseImage : kind === 'video' ? copy.chooseVideo : copy.chooseAudio}
          <input
            type="file"
            accept={kind === 'image' ? 'image/jpeg,image/png,image/webp' : kind === 'video' ? 'video/mp4,video/webm' : AUDIO_TYPES.join(',')}
            disabled={!canEditMedia || busy}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              uploadMedia(slot, file, kind);
            }}
            className="sr-only"
          />
        </label>
        {media && (
          <button type="button" onClick={() => removeMedia(slot)} disabled={busy} aria-label={`${copy.removeMedia}: ${label}`} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-50">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
        <p className="w-full text-xs text-slate-500">{copy.saveBeforeMedia}</p>
      </div>
    );
  };

  const contentLanguage = draft?.translations?.[selectedLanguage];

  return (
    <section className="space-y-5 p-4 sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-ink">{copy.title}</h2>
          <p className="mt-1 text-sm text-slate-500">{copy.description}</p>
        </div>
        <button type="button" onClick={startNew} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-magenta">
          <CirclePlus className="h-4 w-4" />
          {copy.newCourse}
        </button>
      </header>

      {draft && contentLanguage && (
        <form onSubmit={saveCourse} className="space-y-6 rounded-2xl bg-cream p-4 ring-1 ring-slate-200 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg font-extrabold text-ink">{editingId ? copy.edit : copy.newCourse}</h3>
            <button type="button" onClick={closeEditor} disabled={saving} className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 ring-1 ring-slate-300 hover:bg-white disabled:opacity-60">{copy.cancel}</button>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold text-ink">{copy.language}</p>
            <div className="flex flex-wrap gap-2" role="group" aria-label={copy.language}>
              {LANGUAGES.map((language) => (
                <button
                  key={language.code}
                  type="button"
                  onClick={() => setSelectedLanguage(language.code)}
                  aria-pressed={selectedLanguage === language.code}
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${selectedLanguage === language.code ? 'bg-brand-700 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}
                >
                  {language.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">{copy.translationFallbackNotice}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-ink">
              {copy.category}
              <select value={draft.categoryKey} onChange={(event) => updateDraft('categoryKey', event.target.value)} className={`${inputClass(false)} mt-1.5`}>
                {Object.entries(t.elearningHub.categories).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-ink">
              {copy.level}
              <select value={draft.levelKey} onChange={(event) => updateDraft('levelKey', event.target.value)} className={`${inputClass(false)} mt-1.5`}>
                {Object.entries(t.elearningHub.levels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-semibold text-ink sm:col-span-2">
              {copy.titleLabel}
              <input required maxLength={160} value={contentLanguage.title} onChange={(event) => updateTranslation(selectedLanguage, (value) => ({ ...value, title: event.target.value }))} className={`${inputClass(false)} mt-1.5`} />
            </label>
            <label className="block text-sm font-semibold text-ink sm:col-span-2">
              {copy.descriptionLabel}
              <textarea required maxLength={2000} rows={3} value={contentLanguage.description} onChange={(event) => updateTranslation(selectedLanguage, (value) => ({ ...value, description: event.target.value }))} className={`${inputClass(false)} mt-1.5`} />
            </label>
            <label className="block text-sm font-semibold text-ink sm:col-span-2">
              {copy.duration}
              <input required maxLength={60} value={contentLanguage.duration} onChange={(event) => updateTranslation(selectedLanguage, (value) => ({ ...value, duration: event.target.value }))} className={`${inputClass(false)} mt-1.5`} />
            </label>
          </div>

          <section className="space-y-3">
            <h4 className="font-extrabold text-ink">{copy.coverImage}</h4>
            <p className="text-xs text-slate-500">{copy.mediaTypes} {copy.uploadLimits}</p>
            {mediaControl('cover-image', 'image', copy.coverImage)}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-extrabold text-ink">{copy.lessons}</h4>
              <button type="button" onClick={addLesson} disabled={draft.translations.en.lessons.length >= MAX_LESSONS} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 disabled:opacity-50"><Plus className="h-4 w-4" />{copy.addLesson}</button>
            </div>
            <p className="text-xs text-slate-500">{copy.lessonLimit.replace('{count}', String(draft.translations.en.lessons.length)).replace('{max}', String(MAX_LESSONS))}</p>
            {contentLanguage.lessons.map((lesson, index) => (
              <fieldset key={index} className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
                <legend className="px-1 text-sm font-bold text-slate-700">{copy.lesson} {index + 1}</legend>
                <label className="block text-sm font-semibold text-ink">
                  {copy.lessonTitle}
                  <input required maxLength={160} value={lesson.title} onChange={(event) => updateTranslation(selectedLanguage, (value) => ({ ...value, lessons: value.lessons.map((item, i) => i === index ? { ...item, title: event.target.value } : item) }))} className={`${inputClass(false)} mt-1.5`} />
                </label>
                <label className="block text-sm font-semibold text-ink">
                  {copy.lessonBody}
                  <textarea required maxLength={5000} rows={4} value={lesson.body} onChange={(event) => updateTranslation(selectedLanguage, (value) => ({ ...value, lessons: value.lessons.map((item, i) => i === index ? { ...item, body: event.target.value } : item) }))} className={`${inputClass(false)} mt-1.5`} />
                </label>
                {mediaControl(`lesson-${index}-image`, 'image', `${copy.lesson} ${index + 1}: ${copy.lessonImage}`)}
                {mediaControl(`lesson-${index}-video`, 'video', `${copy.lesson} ${index + 1}: ${copy.lessonVideo}`)}
                {mediaControl(`lesson-${index}-audio`, 'audio', `${copy.lesson} ${index + 1}: ${copy.lessonAudio}`)}
                <button type="button" onClick={() => removeLesson(index)} disabled={contentLanguage.lessons.length <= 1} className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />{copy.removeLesson}</button>
              </fieldset>
            ))}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-extrabold text-ink">{copy.quiz}</h4>
              <button type="button" onClick={addQuestion} disabled={draft.translations.en.quiz.length >= 20} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 disabled:opacity-50"><Plus className="h-4 w-4" />{copy.addQuestion}</button>
            </div>
            {contentLanguage.quiz.map((question, index) => (
              <fieldset key={index} className="space-y-3 rounded-xl bg-white p-4 ring-1 ring-slate-200">
                <legend className="px-1 text-sm font-bold text-slate-700">{copy.question} {index + 1}</legend>
                <label className="block text-sm font-semibold text-ink">
                  {copy.question}
                  <input required maxLength={500} value={question.question} onChange={(event) => updateTranslation(selectedLanguage, (value) => ({ ...value, quiz: value.quiz.map((item, i) => i === index ? { ...item, question: event.target.value } : item) }))} className={`${inputClass(false)} mt-1.5`} />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {question.options.map((option, optionIndex) => (
                    <label key={optionIndex} className="block text-sm font-semibold text-ink">
                      {copy.option} {optionIndex + 1}
                      <input required maxLength={300} value={option} onChange={(event) => updateTranslation(selectedLanguage, (value) => ({ ...value, quiz: value.quiz.map((item, i) => i === index ? { ...item, options: item.options.map((answer, j) => j === optionIndex ? event.target.value : answer) } : item) }))} className={`${inputClass(false)} mt-1.5`} />
                    </label>
                  ))}
                </div>
                <label className="block text-sm font-semibold text-ink">
                  {copy.correctAnswer}
                  <select value={question.answerIndex} onChange={(event) => updateTranslation(selectedLanguage, (value) => ({ ...value, quiz: value.quiz.map((item, i) => i === index ? { ...item, answerIndex: Number(event.target.value) } : item) }))} className={`${inputClass(false)} mt-1.5`}>
                    {question.options.map((option, optionIndex) => (
                      <option key={optionIndex} value={optionIndex}>{option || `${copy.option} ${optionIndex + 1}`}</option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={() => removeQuestion(index)} disabled={contentLanguage.quiz.length <= 1} className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 disabled:opacity-40"><Trash2 className="h-3.5 w-3.5" />{copy.removeQuestion}</button>
              </fieldset>
            ))}
          </section>

          {formError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800" role="alert">{formError}</p>}
          <button type="submit" disabled={saving || Boolean(uploadingSlot)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-magenta disabled:opacity-60">
            {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />}
            {saving ? copy.saving : copy.save}
          </button>
        </form>
      )}

      {loadFailed ? (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{copy.loadError}</p>
      ) : records === null ? (
        <p className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><LoaderCircle className="h-4 w-4 animate-spin" />{copy.loading}</p>
      ) : courses.length === 0 ? (
        <p className="rounded-xl bg-sand/50 p-6 text-center text-sm text-slate-500">{copy.empty}</p>
      ) : (
        <ul className="grid gap-4 xl:grid-cols-2">
          {courses.map((course) => (
            <li key={course.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-ink/5 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <BookOpen className="h-4 w-4 text-brand-700" />
                    <h3 className="font-extrabold text-ink">{course.title}</h3>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${course.published ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                      {course.published ? copy.published : copy.draft}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{course.description}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-500">{course.lessonCount} {copy.lessons.toLocaleLowerCase()}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => startEdit(course.id)} className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"><Pencil className="h-4 w-4" />{copy.edit}</button>
                  <button
                    type="button"
                    onClick={() => togglePublished(course)}
                    disabled={publishingId === course.id}
                    aria-label={course.published ? copy.unpublish : copy.publish}
                    className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {publishingId === course.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : course.published ? <EyeOff className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                    <span className="hidden sm:inline">{course.published ? copy.unpublish : copy.publish}</span>
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
