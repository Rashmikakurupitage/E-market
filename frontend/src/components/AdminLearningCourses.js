'use client';

import { useEffect, useState } from 'react';
import { BookOpen, CircleCheck, CirclePlus, LoaderCircle, Pencil, Plus, Send, EyeOff, Trash2 } from 'lucide-react';
import API from '../lib/api';
import { LANGUAGES, translations, useLanguage } from '../lib/i18n';
import { inputClass } from './form';

const LANGUAGE_CODES = LANGUAGES.map(({ code }) => code);

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

  const addLesson = () => setDraft((previous) => ({
    ...previous,
    translations: Object.fromEntries(LANGUAGE_CODES.map((language) => [
      language,
      { ...previous.translations[language], lessons: [...previous.translations[language].lessons, { title: '', body: '' }] },
    ])),
  }));

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

  const saveCourse = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const response = editingId === null
        ? await API.post('/admin/learning-courses', { content: draft })
        : await API.put(`/admin/learning-courses/${encodeURIComponent(editingId)}`, { content: draft });
      setRecords((previous) => replaceRecord(previous || [], response.data));
      setEditingId(String(response.data.id));
      setDraft(response.data);
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

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-extrabold text-ink">{copy.lessons}</h4>
              <button type="button" onClick={addLesson} disabled={draft.translations.en.lessons.length >= 20} className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-brand-700 ring-1 ring-brand-200 disabled:opacity-50"><Plus className="h-4 w-4" />{copy.addLesson}</button>
            </div>
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
          <button type="submit" disabled={saving} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-semibold text-white transition hover:bg-magenta disabled:opacity-60">
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
