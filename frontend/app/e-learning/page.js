'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import { BookOpen, Video, FileText, Award, Megaphone, Calculator, Camera, ArrowRight, ArrowLeft, GraduationCap, Lightbulb, Search, X, Check, CircleCheck } from 'lucide-react';
import Link from 'next/link';
import Reveal from '../../src/components/Reveal';
import { Lotus, PageArt } from '../../src/components/Art';
import Portal from '../../src/components/Portal';
import { useLanguage } from '../../src/lib/i18n';
import API from '../../src/lib/api';
import { useSession } from '../../src/lib/auth';

const GUEST_PROGRESS_KEY = 'elearning-progress';
const progressListeners = new Set();
let activeProgressKey = GUEST_PROGRESS_KEY;
let progressSnapshot = null;

function readProgressSnapshot() {
  if (progressSnapshot !== null) return progressSnapshot;
  try {
    progressSnapshot = localStorage.getItem(activeProgressKey) || '{}';
  } catch {
    progressSnapshot = '{}';
  }
  return progressSnapshot;
}

function getStoredProgress(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}') || {};
  } catch {
    return {};
  }
}

function setActiveProgressKey(key) {
  if (activeProgressKey === key) return;
  activeProgressKey = key;
  progressSnapshot = null;
  progressListeners.forEach((listener) => listener());
}

function subscribeToProgress(listener) {
  progressListeners.add(listener);
  const handleStorage = (event) => {
    if (event.key !== activeProgressKey && event.key !== null) return;
    progressSnapshot = event.newValue || '{}';
    listener();
  };
  window.addEventListener('storage', handleStorage);
  return () => {
    progressListeners.delete(listener);
    window.removeEventListener('storage', handleStorage);
  };
}

function writeProgressSnapshot(progress, key = activeProgressKey) {
  const snapshot = JSON.stringify(progress);
  try {
    localStorage.setItem(key, snapshot);
  } catch {
    // Progress remains available for the current visit when storage is blocked.
  }
  if (key !== activeProgressKey) return;
  progressSnapshot = snapshot;
  progressListeners.forEach((listener) => listener());
}

function mergeProgress(...sources) {
  const merged = {};
  for (const source of sources) {
    if (!source || typeof source !== 'object' || Array.isArray(source)) continue;
    for (const [courseId, course] of Object.entries(source)) {
      if (!/^(?:[1-9]\d{0,8}|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(courseId) || !course || typeof course !== 'object' || Array.isArray(course)) continue;
      const previous = merged[courseId] || {};
      const previousCompleted = Array.isArray(previous.completed) ? previous.completed : [];
      const completed = Array.isArray(course.completed)
        ? course.completed.filter((lesson) => Number.isInteger(lesson) && lesson >= 0 && lesson < 100)
        : [];
      const current = Number.isInteger(course.current) && course.current >= 0 && course.current < 100
        ? course.current
        : previous.current || 0;
      const quizScore = Number.isInteger(course.quizScore) && course.quizScore >= 0 && course.quizScore < 100
        ? course.quizScore
        : previous.quizScore;
      merged[courseId] = {
        completed: [...new Set([...previousCompleted, ...completed])],
        current,
        done: Boolean(previous.done || course.done),
        started: Boolean(previous.started || course.started || completed.length || course.done),
        ...(quizScore === undefined ? {} : { quizScore }),
      };
    }
  }
  return merged;
}

// Picture for each course category (all in the brand green)
const THEMES = {
  'Digital Marketing': {
    icon: Megaphone,
    header: 'from-brand-500 via-brand-600 to-brand-800',
    chip: 'bg-brand-50 text-brand-800 ring-brand-200',
    button: 'bg-brand-700 hover:bg-brand-800 shadow-brand-600/25',
  },
  'Financial Management': {
    icon: Calculator,
    header: 'from-brand-500 via-brand-600 to-brand-800',
    chip: 'bg-brand-50 text-brand-800 ring-brand-200',
    button: 'bg-brand-700 hover:bg-brand-800 shadow-brand-600/25',
  },
  Branding: {
    icon: Camera,
    header: 'from-brand-500 via-brand-600 to-brand-800',
    chip: 'bg-brand-50 text-brand-800 ring-brand-200',
    button: 'bg-brand-700 hover:bg-brand-800 shadow-brand-600/25',
  },
};
const DEFAULT_THEME = {
  icon: BookOpen,
  header: 'from-brand-500 to-brand-700',
  chip: 'bg-brand-50 text-brand-800 ring-brand-200',
  button: 'bg-brand-700 hover:bg-brand-800 shadow-brand-600/25',
};

const COURSE_IMAGES = {
  1: '/wallpapers/cane-market.jpg',
  2: '/wallpapers/spices.jpg',
  3: '/artisan_carver.jpg',
  4: '/hero_main.jpg',
  5: '/wallpapers/basketry.jpg',
  6: '/wallpapers/masks.jpg',
};

const LESSON_IMAGES = {
  1: ['/hero_main.jpg', '/wallpapers/masks.jpg', '/wallpapers/cane-market.jpg', '/wallpapers/tea-woman.jpg'],
  2: ['/wallpapers/spices.jpg', '/wallpapers/kitchen.jpg', '/wallpapers/basketry.jpg'],
  3: ['/wallpapers/collage-violet.jpg', '/hero_main.jpg', '/artisan_carver.jpg', '/wallpapers/basketry.jpg', '/wallpapers/masks.jpg'],
  4: ['/wallpapers/tea-woman.jpg', '/wallpapers/tea-pickers.jpg', '/hero_main.jpg'],
  5: ['/wallpapers/cane-market.jpg', '/wallpapers/spices.jpg', '/wallpapers/kitchen.jpg'],
  6: ['/wallpapers/masks.jpg', '/wallpapers/collage-violet.jpg', '/hero_main.jpg'],
};

// Icons floating in the banner
const BANNER_ICONS = [
  { icon: GraduationCap, className: 'right-[30%] top-8', delay: '0s' },
  { icon: Lightbulb, className: 'right-[14%] top-14', delay: '-2s' },
  { icon: BookOpen, className: 'right-[24%] bottom-8', delay: '-4s' },
];

export default function ELearning() {
  const { t, lang } = useLanguage();
  const session = useSession();
  const sessionUserId = session?.user?.id;
  const hub = t.elearningHub;
  const [managedCourses, setManagedCourses] = useState([]);
  const [catalogLoadFailed, setCatalogLoadFailed] = useState(false);
  const courseOverrides = new Map(managedCourses.map((course) => [String(course.id), course]));
  const courses = [
    ...hub.courses
      .map((course) => {
        const override = courseOverrides.get(String(course.id));
        if (!override) return course;
        if (!override.published) return null;
        const localized = override.translations[lang];
        return {
          ...course,
          themeKey: override.themeKey,
          categoryKey: override.categoryKey,
          levelKey: override.levelKey,
          title: localized.title,
          description: localized.description,
          duration: localized.duration,
          lessons: localized.lessons,
          modules: localized.lessons.length,
          quiz: localized.quiz,
        };
      })
      .filter(Boolean),
    ...managedCourses
      .filter((course) => course.published && !hub.courses.some((baseCourse) => String(baseCourse.id) === String(course.id)))
      .map((course) => {
        const localized = course.translations[lang];
        return {
          id: course.id,
          themeKey: course.themeKey,
          categoryKey: course.categoryKey,
          levelKey: course.levelKey,
          title: localized.title,
          description: localized.description,
          duration: localized.duration,
          lessons: localized.lessons,
          modules: localized.lessons.length,
          quiz: localized.quiz,
        };
      }),
  ];
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const progressSnapshot = useSyncExternalStore(subscribeToProgress, readProgressSnapshot, () => '{}');
  const progress = (() => {
    try {
      return JSON.parse(progressSnapshot) || {};
    } catch {
      return {};
    }
  })();
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [currentModule, setCurrentModule] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [syncStatus, setSyncStatus] = useState('local');
  const [syncAttempt, setSyncAttempt] = useState(0);
  const syncQueue = useRef(Promise.resolve());
  const categories = [...new Set(courses.map((course) => course.categoryKey))];
  const visibleCourses = courses.filter((course) => {
    const matchesCategory = activeCategory === 'all' || course.categoryKey === activeCategory;
    const searchText = `${course.title} ${course.description} ${hub.categories[course.categoryKey]}`.toLocaleLowerCase();
    return matchesCategory && searchText.includes(search.trim().toLocaleLowerCase());
  });
  const startedCourses = courses.filter((course) => {
    const saved = progress[course.id];
    return saved?.started || saved?.completed?.length || saved?.done;
  });
  const completedCourses = courses.filter((course) => progress[course.id]?.done);
  const completedLessons = courses.reduce((total, course) => total + (progress[course.id]?.completed?.length || 0), 0);
  const activeCourse = startedCourses.find((course) => !progress[course.id]?.done);
  const latestCompletedCourse = completedCourses[completedCourses.length - 1];
  const featuredCourse = activeCourse || latestCompletedCourse || courses[0];
  const featuredProgress = featuredCourse ? progress[featuredCourse.id] || { completed: [], current: 0, done: false } : null;
  const featuredPercent = featuredCourse && featuredProgress
    ? Math.round(featuredProgress.completed.length / featuredCourse.lessons.length * 100)
    : 0;
  const selectedProgress = selectedCourse ? progress[selectedCourse.id] || { completed: [], current: 0, done: false } : null;
  const lesson = selectedCourse?.lessons[currentModule];
  const lessonImage = selectedCourse ? LESSON_IMAGES[selectedCourse.id]?.[currentModule] || COURSE_IMAGES[selectedCourse.id] : null;
  const quiz = selectedCourse?.quiz || [];
  const showCompletion = showQuiz && quizSubmitted && selectedProgress?.done;
  const visibleSyncStatus = sessionUserId
    ? activeProgressKey !== `${GUEST_PROGRESS_KEY}:${sessionUserId}` || syncStatus === 'local' ? 'loading' : syncStatus
    : 'local';

  useEffect(() => {
    let cancelled = false;
    API.get('/learning/courses')
      .then((response) => {
        if (!cancelled) {
          setManagedCourses(response.data);
          setCatalogLoadFailed(false);
        }
      })
      .catch((error) => {
        if (cancelled) return;
        setCatalogLoadFailed(true);
        console.error('LEARNING_COURSES_LOAD_ERROR:', error?.response?.status || error?.message || 'Unknown error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const accountKey = sessionUserId ? `${GUEST_PROGRESS_KEY}:${sessionUserId}` : GUEST_PROGRESS_KEY;
    setActiveProgressKey(accountKey);
    if (!sessionUserId) return undefined;

    let cancelled = false;
    const accountProgress = getStoredProgress(accountKey);
    const guestProgress = getStoredProgress(GUEST_PROGRESS_KEY);

    const synchronize = async () => {
      try {
        const response = await API.get('/learning/progress');
        if (cancelled) return;
        const merged = mergeProgress(response.data.progress, accountProgress, guestProgress);
        writeProgressSnapshot(merged, accountKey);
        await API.put('/learning/progress', { progress: merged });
        if (cancelled) return;
        if (Object.keys(guestProgress).length > 0) {
          try {
            localStorage.removeItem(GUEST_PROGRESS_KEY);
          } catch {
            // Account progress has already been saved on the server.
          }
        }
        setSyncStatus('synced');
      } catch (error) {
        if (cancelled) return;
        writeProgressSnapshot(mergeProgress(accountProgress, guestProgress), accountKey);
        setSyncStatus('error');
        console.error('LEARNING_PROGRESS_SYNC_ERROR:', error?.response?.status || error?.message || 'Unknown error');
      }
    };

    Promise.resolve().then(() => {
      if (cancelled) return;
      setSyncStatus('loading');
      synchronize();
    });
    return () => {
      cancelled = true;
    };
  }, [sessionUserId, syncAttempt]);

  useEffect(() => {
    if (!selectedCourse) return undefined;
    const closeOnEscape = (event) => event.key === 'Escape' && setSelectedCourse(null);
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedCourse]);

  const openCourse = (course) => {
    const saved = progress[course.id];
    saveProgress({
      ...progress,
      [course.id]: {
        ...saved,
        completed: saved?.completed || [],
        current: saved?.current || 0,
        done: saved?.done || false,
        started: true,
      },
    });
    setCurrentModule(saved?.current || 0);
    setShowQuiz((saved?.completed?.length || 0) === course.lessons.length);
    setQuizAnswers({});
    setQuizSubmitted(typeof saved?.quizScore === 'number');
    setSelectedCourse(course);
  };

  const saveProgress = (nextProgress) => {
    writeProgressSnapshot(nextProgress);
    if (!sessionUserId) return;

    const userId = sessionUserId;
    setSyncStatus('loading');
    const save = syncQueue.current.then(() => {
      if (activeProgressKey !== `${GUEST_PROGRESS_KEY}:${userId}`) return undefined;
      return API.put('/learning/progress', { progress: nextProgress });
    });
    syncQueue.current = save.then(
      () => {
        if (activeProgressKey === `${GUEST_PROGRESS_KEY}:${userId}`) setSyncStatus('synced');
      },
      (error) => {
        if (activeProgressKey === `${GUEST_PROGRESS_KEY}:${userId}`) setSyncStatus('error');
        console.error('LEARNING_PROGRESS_SYNC_ERROR:', error?.response?.status || error?.message || 'Unknown error');
      }
    );
  };

  const completeCurrentModule = () => {
    const previousProgress = selectedProgress;
    const completed = [...new Set([...previousProgress.completed, currentModule])];
    const isLastModule = currentModule === selectedCourse.lessons.length - 1;
    const allModulesComplete = completed.length === selectedCourse.lessons.length;
    const nextModule = allModulesComplete
      ? currentModule
      : isLastModule
        ? selectedCourse.lessons.findIndex((_, index) => !completed.includes(index))
        : currentModule + 1;
    const nextProgress = {
      ...progress,
      [selectedCourse.id]: {
        ...previousProgress,
        completed,
        current: nextModule,
        done: previousProgress.done,
      },
    };
    saveProgress(nextProgress);
    setCurrentModule(nextModule);
    if (allModulesComplete) setShowQuiz(true);
  };

  const submitQuiz = () => {
    const score = quiz.reduce((total, question, index) => total + (quizAnswers[index] === question.answerIndex ? 1 : 0), 0);
    saveProgress({
      ...progress,
      [selectedCourse.id]: {
        ...selectedProgress,
        done: true,
        quizScore: score,
      },
    });
    setQuizSubmitted(true);
  };

  return (
    <div className="relative isolate flex-1 px-4 py-10 font-sans">
      <PageArt />
      <div className="mx-auto max-w-6xl space-y-10">

        {/* Banner */}
        <Reveal as="section" animation="fade-down" className="relative isolate overflow-hidden rounded-[32px] bg-ink p-8 text-white shadow-2xl sm:p-10">
          <div aria-hidden="true" className="pattern-batik pointer-events-none absolute inset-0 -z-10" />
          <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-20 -z-10 h-64 w-64 animate-float rounded-full bg-magenta/50 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 right-10 -z-10 h-56 w-56 animate-float rounded-full bg-saffron/35 blur-3xl [animation-delay:-4s]" />
          <Lotus color="white" className="pointer-events-none absolute -bottom-3 right-4 -z-10 hidden w-52 opacity-90 md:block" />
          {BANNER_ICONS.map(({ icon: Icon, className, delay }) => (
            <span
              key={className}
              aria-hidden="true"
              className={`pointer-events-none absolute -z-10 hidden h-14 w-14 animate-float items-center justify-center rounded-2xl bg-white/10 text-amber-200 ring-1 ring-white/20 backdrop-blur-sm lg:flex ${className}`}
              style={{ animationDelay: delay }}
            >
              <Icon className="h-7 w-7" />
            </span>
          ))}

          <div className="max-w-2xl">
            <span className="inline-flex animate-fade-up items-center gap-1.5 rounded-full bg-turmeric px-3 py-1 text-[11px] font-black uppercase tracking-wider text-slate-950 shadow-lg">
              <Award className="h-3.5 w-3.5" /> {hub.badge}
            </span>
            <h1 className="mt-4 animate-fade-up text-2xl font-extrabold leading-snug [animation-delay:120ms] sm:text-4xl">
              {hub.title}
            </h1>
            <span aria-hidden="true" className="mt-4 block h-1 w-16 animate-fade-up rounded-full bg-turmeric [animation-delay:180ms]" />
            <p className="mt-4 animate-fade-up text-sm leading-relaxed text-white/80 [animation-delay:240ms] sm:text-base">
              {hub.description}
            </p>
          </div>
        </Reveal>

        <section aria-labelledby="learning-dashboard-title" className="space-y-5">
          <div>
            <h2 id="learning-dashboard-title" className="text-2xl font-extrabold text-ink">{hub.dashboardTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">{hub.dashboardDescription}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm" aria-live="polite">
            {visibleSyncStatus === 'local' && (
              <>
                <span className="text-slate-500">{hub.progressLocal}</span>
                {!sessionUserId && <Link href="/login?as=customer&next=%2Fe-learning" className="font-semibold text-brand-700 underline underline-offset-2">{hub.progressSignIn}</Link>}
              </>
            )}
            {visibleSyncStatus === 'loading' && <span className="text-slate-500">{hub.progressSyncing}</span>}
            {visibleSyncStatus === 'synced' && <span className="inline-flex items-center gap-1.5 text-emerald-700"><CircleCheck className="h-4 w-4" />{hub.progressSynced}</span>}
            {visibleSyncStatus === 'error' && (
              <>
                <span className="text-red-700" role="alert">{hub.progressSyncError}</span>
                <button type="button" onClick={() => { setSyncStatus('loading'); setSyncAttempt((attempt) => attempt + 1); }} className="font-semibold text-brand-700 underline underline-offset-2">{hub.progressRetry}</button>
              </>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: hub.dashboardStarted, value: startedCourses.length, icon: BookOpen },
              { label: hub.dashboardCompleted, value: completedCourses.length, icon: CircleCheck },
              { label: hub.dashboardLessons, value: completedLessons, icon: Check },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ink/5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-2xl font-extrabold text-ink">{value}</p>
                  <p className="text-xs font-semibold text-slate-500">{label}</p>
                </div>
              </div>
            ))}
          </div>
          {featuredCourse && featuredProgress && (
            <div className="grid gap-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-ink/5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6">
              <div className="min-w-0">
                <p className="text-xs font-extrabold uppercase tracking-wide text-brand-700">
                  {activeCourse ? hub.dashboardContinue : latestCompletedCourse ? hub.dashboardReview : hub.dashboardStart}
                </p>
                <h3 className="mt-2 text-lg font-extrabold leading-snug text-ink">{featuredCourse.title}</h3>
                {activeCourse ? (
                  <>
                    <p className="mt-1 text-sm text-slate-500">
                      {hub.courseProgress.replace('{complete}', String(featuredProgress.completed.length)).replace('{total}', String(featuredCourse.lessons.length))}
                    </p>
                    <div
                      className="mt-3 h-2 max-w-xl overflow-hidden rounded-full bg-slate-100"
                      role="progressbar"
                      aria-label={hub.courseProgress.replace('{complete}', String(featuredProgress.completed.length)).replace('{total}', String(featuredCourse.lessons.length))}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={featuredPercent}
                    >
                      <div className="h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${featuredPercent}%` }} />
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-slate-500">
                    {latestCompletedCourse ? hub.dashboardAllDone : hub.dashboardWelcome}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => openCourse(featuredCourse)}
                disabled={visibleSyncStatus === 'loading'}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-brand-800"
              >
                {activeCourse ? hub.continueCourse : latestCompletedCourse ? hub.reviewCourse : hub.startCourse}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </section>

        {/* Course catalog */}
        <section aria-labelledby="course-catalog-title" className="space-y-6">
          {catalogLoadFailed && (
            <p role="status" className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{hub.catalogLoadError}</p>
          )}
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 id="course-catalog-title" className="text-2xl font-extrabold text-ink">{hub.catalogTitle}</h2>
              <p className="mt-1 text-sm text-slate-500">{hub.catalogCount.replace('{count}', String(visibleCourses.length))}</p>
            </div>
            <label className="relative block w-full sm:max-w-sm">
              <span className="sr-only">{hub.searchPlaceholder}</span>
              <Search aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={hub.searchPlaceholder}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-11 text-sm text-ink shadow-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  aria-label={hub.clearSearch}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-ink"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </label>
          </div>

          <div className="flex flex-wrap gap-2" aria-label={hub.catalogTitle}>
            <button
              type="button"
              onClick={() => setActiveCategory('all')}
              aria-pressed={activeCategory === 'all'}
              className={`rounded-full px-4 py-2 text-xs font-bold transition ${activeCategory === 'all' ? 'bg-ink text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand-300'}`}
            >
              {hub.allCourses}
            </button>
            {categories.map((categoryKey) => (
              <button
                key={categoryKey}
                type="button"
                onClick={() => setActiveCategory(categoryKey)}
                aria-pressed={activeCategory === categoryKey}
                className={`rounded-full px-4 py-2 text-xs font-bold transition ${activeCategory === categoryKey ? 'bg-ink text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-brand-300'}`}
              >
                {hub.categories[categoryKey]}
              </button>
            ))}
          </div>

          {visibleCourses.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {visibleCourses.map((course, index) => {
                const theme = THEMES[course.themeKey] || DEFAULT_THEME;
                const Icon = theme.icon;
                return (
                  <Reveal key={course.id} animation="zoom-in" delay={index * 120} className="grid">
                    <article className="group flex flex-col overflow-hidden rounded-[32px] bg-white shadow-sm ring-1 ring-ink/5 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
                      <div className={`relative isolate flex h-48 items-end justify-between overflow-hidden bg-linear-to-br ${theme.header}`}>
                        {COURSE_IMAGES[course.id] ? (
                          <Image
                            src={COURSE_IMAGES[course.id]}
                            alt=""
                            fill
                            sizes="(max-width: 768px) 100vw, 33vw"
                            loading={index === 0 ? 'eager' : 'lazy'}
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div aria-hidden="true" className="pattern-dots absolute inset-0" />
                        )}
                        <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-ink/75 via-ink/10 to-ink/10" />
                        <span className="relative z-10 mb-4 ml-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 text-white ring-1 ring-white/35 backdrop-blur-sm">
                          <Icon className="h-5 w-5" />
                        </span>
                        <span className="absolute left-4 top-4 z-10 rounded-full bg-white/95 px-3 py-1 text-[11px] font-bold text-slate-800 shadow">
                          {hub.levels[course.levelKey]}
                        </span>
                      </div>

                      <div className="flex-1 space-y-3 p-6">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ring-1 ${theme.chip}`}>
                          {hub.categories[course.categoryKey]}
                        </span>
                        <h3 className="text-base font-extrabold leading-snug text-slate-800">{course.title}</h3>
                        <p className="text-xs leading-relaxed text-slate-500">{course.description}</p>
                      </div>

                      <div className="space-y-4 border-t border-slate-100 bg-cream/70 p-6">
                        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
                          <span className="flex items-center gap-1.5"><Video className="h-4 w-4 text-slate-400" /> {course.duration}</span>
                          <span className="flex items-center gap-1.5"><FileText className="h-4 w-4 text-slate-400" /> {hub.modules.replace('{count}', String(course.modules))}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => openCourse(course)}
                          disabled={visibleSyncStatus === 'loading'}
                          className={`group/btn flex w-full items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold text-white shadow-lg transition-all duration-200 active:scale-[0.98] ${theme.button}`}
                        >
                          {progress[course.id]?.done ? <CircleCheck className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                          <span>{progress[course.id]?.done ? hub.reviewCourse : progress[course.id]?.completed?.length || progress[course.id]?.started ? hub.continueCourse : hub.startCourse}</span>
                          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover/btn:translate-x-1" />
                        </button>
                      </div>
                    </article>
                  </Reveal>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center text-sm font-semibold text-slate-500">
              {hub.noCourses}
            </div>
          )}
        </section>

      </div>

      {selectedCourse && selectedProgress && (
        <Portal>
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/65 p-0 backdrop-blur-sm sm:p-4"
            onClick={() => setSelectedCourse(null)}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="course-reader-title"
              onClick={(event) => event.stopPropagation()}
              className="flex h-full max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl sm:rounded-2xl"
            >
              <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-7">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase text-brand-700">{hub.categories[selectedCourse.categoryKey]}</p>
                  <h2 id="course-reader-title" className="mt-1 text-lg font-extrabold leading-snug text-ink sm:text-xl">{selectedCourse.title}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCourse(null)}
                  aria-label={hub.closeReader}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-ink"
                >
                  <X className="h-5 w-5" />
                </button>
              </header>

              <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[260px_minmax(0,1fr)]">
                <aside className="shrink-0 border-b border-slate-200 bg-cream/60 p-4 md:overflow-y-auto md:border-b-0 md:border-r md:p-5">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-xs font-extrabold uppercase text-slate-500">{hub.courseContents}</h3>
                    <span className="text-xs font-bold text-slate-500">
                      {hub.courseProgress.replace('{complete}', String(selectedProgress.completed.length)).replace('{total}', String(selectedCourse.lessons.length))}
                    </span>
                  </div>
                  <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
                    <div className="h-full rounded-full bg-brand-600 transition-[width]" style={{ width: `${selectedProgress.completed.length / selectedCourse.lessons.length * 100}%` }} />
                  </div>
                  <ol className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
                    {selectedCourse.lessons.map((module, index) => {
                      const isComplete = selectedProgress.completed.includes(index);
                      const isCurrent = currentModule === index;
                      return (
                        <li key={module.title} className="shrink-0 md:shrink">
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentModule(index);
                              setShowQuiz(false);
                              const nextProgress = { ...progress, [selectedCourse.id]: { ...selectedProgress, current: index } };
                              saveProgress(nextProgress);
                            }}
                            aria-current={isCurrent ? 'step' : undefined}
                            className={`flex min-h-11 max-w-[220px] items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition md:max-w-none md:w-full ${isCurrent ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-white'}`}
                          >
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px]">
                              {isComplete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                            </span>
                            <span className="line-clamp-2">{module.title}</span>
                          </button>
                        </li>
                      );
                    })}
                    {selectedProgress.completed.length === selectedCourse.lessons.length && (
                      <li className="shrink-0 md:shrink">
                        <button
                          type="button"
                          onClick={() => {
                            setShowQuiz(true);
                            setQuizSubmitted(typeof selectedProgress.quizScore === 'number');
                            setQuizAnswers({});
                          }}
                          aria-current={showQuiz ? 'step' : undefined}
                          className={`flex min-h-11 max-w-[220px] items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold transition md:max-w-none md:w-full ${showQuiz ? 'bg-brand-700 text-white' : 'text-slate-600 hover:bg-white'}`}
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px]"><Award className="h-3.5 w-3.5" /></span>
                          <span>{hub.assessment}</span>
                        </button>
                      </li>
                    )}
                  </ol>
                </aside>

                <div className="flex min-h-0 flex-1 flex-col">
                  <main className="flex-1 overflow-y-auto p-6 sm:p-10">
                    {showCompletion ? (
                      <div className="mx-auto flex min-h-full max-w-xl flex-col items-center justify-center text-center">
                        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-brand-700 ring-8 ring-brand-50/60">
                          <Award className="h-10 w-10" />
                        </span>
                        <p className="mt-6 text-xs font-extrabold uppercase tracking-wide text-brand-700">{hub.courseCompleted}</p>
                        <h3 className="mt-2 text-2xl font-extrabold leading-tight text-ink sm:text-3xl">{hub.completionTitle}</h3>
                        <p className="mt-3 text-sm leading-relaxed text-slate-600">{hub.completionMessage}</p>
                        <div className="mt-8 grid w-full grid-cols-2 gap-3 text-left">
                          <div className="rounded-xl bg-cream p-4">
                            <p className="text-xs font-semibold text-slate-500">{hub.completionLessons}</p>
                            <p className="mt-1 text-lg font-extrabold text-ink">{selectedProgress.completed.length} / {selectedCourse.lessons.length}</p>
                          </div>
                          <div className="rounded-xl bg-brand-50 p-4">
                            <p className="text-xs font-semibold text-brand-700">{hub.completionScore}</p>
                            <p className="mt-1 text-lg font-extrabold text-brand-800">{selectedProgress.quizScore ?? 0} / {quiz.length}</p>
                          </div>
                        </div>
                      </div>
                    ) : showQuiz ? (
                      <div className="mx-auto max-w-2xl">
                        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">{hub.assessment}</p>
                        <h3 className="mt-3 text-2xl font-extrabold leading-tight text-ink sm:text-3xl">{hub.assessmentTitle}</h3>
                        <p className="mt-3 text-sm leading-relaxed text-slate-600">{hub.assessmentInstructions}</p>
                        <div className="mt-8 space-y-6">
                          {quiz.map((question, questionIndex) => (
                            <fieldset key={question.question} className="rounded-xl border border-slate-200 p-5">
                              <legend className="px-1 text-sm font-bold leading-relaxed text-ink">{questionIndex + 1}. {question.question}</legend>
                              <div className="mt-3 space-y-2">
                                {question.options.map((option, optionIndex) => (
                                  <label key={option} className="flex cursor-pointer items-start gap-3 rounded-lg p-3 text-sm text-slate-700 transition hover:bg-cream">
                                    <input
                                      type="radio"
                                      name={`question-${questionIndex}`}
                                      value={optionIndex}
                                      checked={quizAnswers[questionIndex] === optionIndex}
                                      disabled={quizSubmitted}
                                      onChange={() => setQuizAnswers((answers) => ({ ...answers, [questionIndex]: optionIndex }))}
                                      className="mt-0.5 accent-brand-700"
                                    />
                                    <span>{option}</span>
                                  </label>
                                ))}
                              </div>
                            </fieldset>
                          ))}
                        </div>
                      </div>
                    ) : lesson ? (
                      <>
                        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
                          {hub.moduleProgress.replace('{current}', String(currentModule + 1)).replace('{total}', String(selectedCourse.lessons.length))}
                        </p>
                        <h3 className="mt-3 max-w-2xl text-2xl font-extrabold leading-tight text-ink sm:text-3xl">{lesson.title}</h3>
                        {lessonImage && (
                          <figure className="relative mt-6 aspect-[16/7] max-w-3xl overflow-hidden rounded-2xl bg-cream shadow-sm ring-1 ring-ink/10">
                            <Image
                              src={lessonImage}
                              alt={`${selectedCourse.title}: ${lesson.title}`}
                              fill
                              sizes="(max-width: 768px) 100vw, 720px"
                              className="object-cover"
                            />
                          </figure>
                        )}
                        <p className="mt-6 max-w-2xl whitespace-pre-line text-base leading-8 text-slate-700">{lesson.body}</p>
                        {selectedProgress.completed.includes(currentModule) && (
                          <p className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-brand-700">
                            <CircleCheck className="h-5 w-5" /> {hub.moduleCompleted}
                          </p>
                        )}
                      </>
                    ) : null}
                  </main>
                  <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:px-8">
                    {showQuiz ? (
                      showCompletion ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setSelectedCourse(null)}
                            className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
                          >
                            <ArrowLeft className="h-4 w-4" /> {hub.backToCourses}
                          </button>
                          <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentModule(0);
                                setShowQuiz(false);
                              }}
                              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
                            >
                              {hub.reviewLessons}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setQuizSubmitted(false);
                                setQuizAnswers({});
                              }}
                              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-800"
                            >
                              {hub.retakeAssessment}
                            </button>
                          </div>
                        </>
                      ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowQuiz(false)}
                          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100"
                        >
                          <ArrowLeft className="h-4 w-4" /> {hub.backToLessons}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (quizSubmitted) {
                              setQuizSubmitted(false);
                              setQuizAnswers({});
                            } else {
                              submitQuiz();
                            }
                          }}
                          disabled={!quizSubmitted && Object.keys(quizAnswers).length !== quiz.length}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {quizSubmitted ? hub.retakeAssessment : hub.submitAssessment}
                          {quizSubmitted ? <ArrowRight className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                        </button>
                      </>
                      )
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => setCurrentModule((index) => Math.max(0, index - 1))}
                          disabled={currentModule === 0}
                          className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-bold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <ArrowLeft className="h-4 w-4" /> {hub.previousModule}
                        </button>
                        <button
                          type="button"
                          onClick={completeCurrentModule}
                          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-700 px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-800 disabled:cursor-default disabled:bg-leaf"
                        >
                          {selectedProgress.completed.includes(currentModule)
                            ? <><CircleCheck className="h-4 w-4" /> {hub.moduleCompleted}</>
                            : <>{currentModule === selectedCourse.lessons.length - 1 ? hub.finishCourse : hub.completeModule}<ArrowRight className="h-4 w-4" /></>}
                        </button>
                      </>
                    )}
                  </footer>
                </div>
              </div>
            </section>
          </div>
        </Portal>
      )}
    </div>
  );
}
