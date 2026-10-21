const { randomUUID } = require('node:crypto');
const prisma = require('../config/db');

const LANGUAGES = ['si', 'ta', 'en'];
const CATEGORIES = ['digitalMarketing', 'financialManagement', 'branding'];
const THEMES = ['Digital Marketing', 'Financial Management', 'Branding'];
const LEVELS = ['beginner', 'intermediate'];
const MAX_CONTENT_BYTES = 3_000_000;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);
const AUDIO_TYPES = new Set(['audio/aac', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_AUDIO_BYTES = 100 * 1024 * 1024;
const COURSE_ID_PATTERN = /^(?:[1-6]|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
const MEDIA_SLOT_PATTERN = /^(?:cover-image|lesson-(?:[0-9]|[1-9]\d)-image|lesson-(?:[0-9]|[1-9]\d)-(?:video|audio))$/;

const validText = (value, maxLength) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;

function normalizeTranslation(translation) {
  if (!translation || typeof translation !== 'object' || Array.isArray(translation)) return null;
  const { title, description, duration, lessons, quiz } = translation;
  if (
    !validText(title, 160) ||
    !validText(description, 2000) ||
    !validText(duration, 60) ||
    !Array.isArray(lessons) ||
    lessons.length < 1 ||
    lessons.length > 100 ||
    !Array.isArray(quiz) ||
    quiz.length < 1 ||
    quiz.length > 20
  ) {
    return null;
  }

  const normalizedLessons = [];
  for (const lesson of lessons) {
    if (!lesson || typeof lesson !== 'object' || Array.isArray(lesson) ||
      !validText(lesson.title, 160) || !validText(lesson.body, 5000)) return null;
    normalizedLessons.push({ title: lesson.title.trim(), body: lesson.body.trim() });
  }

  const normalizedQuiz = [];
  for (const question of quiz) {
    if (
      !question ||
      typeof question !== 'object' ||
      Array.isArray(question) ||
      !validText(question.question, 500) ||
      !Array.isArray(question.options) ||
      question.options.length < 2 ||
      question.options.length > 6 ||
      question.options.some((option) => !validText(option, 300)) ||
      !Number.isInteger(question.answerIndex) ||
      question.answerIndex < 0 ||
      question.answerIndex >= question.options.length
    ) {
      return null;
    }
    normalizedQuiz.push({
      question: question.question.trim(),
      options: question.options.map((option) => option.trim()),
      answerIndex: question.answerIndex,
    });
  }

  return {
    title: title.trim(),
    description: description.trim(),
    duration: duration.trim(),
    lessons: normalizedLessons,
    quiz: normalizedQuiz,
  };
}

function normalizeContent(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
  const { themeKey, categoryKey, levelKey, translations } = input;
  if (
    !THEMES.includes(themeKey) ||
    !CATEGORIES.includes(categoryKey) ||
    !LEVELS.includes(levelKey) ||
    !translations ||
    typeof translations !== 'object' ||
    Array.isArray(translations) ||
    LANGUAGES.some((language) => !translations[language] || typeof translations[language] !== 'object')
  ) {
    return null;
  }

  const normalizedTranslations = Object.fromEntries(
    LANGUAGES.map((language) => [language, normalizeTranslation(translations[language])])
  );
  const fallbackTranslation = normalizedTranslations.en
    || normalizedTranslations.si
    || normalizedTranslations.ta;
  if (!fallbackTranslation) return null;

  for (const language of LANGUAGES) {
    normalizedTranslations[language] ||= fallbackTranslation;
  }

  const content = { themeKey, categoryKey, levelKey, translations: normalizedTranslations };
  return Buffer.byteLength(JSON.stringify(content), 'utf8') <= MAX_CONTENT_BYTES ? content : null;
}

function toCourseRecord(record) {
  return {
    id: record.courseId,
    ...record.content,
    published: record.published,
    updatedAt: record.updatedAt,
    media: (record.media || []).map(({ slot, contentType, updatedAt }) => ({ slot, contentType, updatedAt })),
  };
}

exports.listAdminCourses = async (req, res) => {
  try {
    const records = await prisma.learningCourse.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      include: { media: { select: { slot: true, contentType: true, updatedAt: true } } },
    });
    res.json(records.map(toCourseRecord));
  } catch (error) {
    console.error('LEARNING_COURSES_ADMIN_LIST_ERROR:', error);
    res.status(500).json({ message: 'Could not load learning courses.' });
  }
};

exports.listPublicCourses = async (req, res) => {
  try {
    const records = await prisma.learningCourse.findMany({
      select: {
        courseId: true,
        content: true,
        published: true,
        media: { select: { slot: true, contentType: true, updatedAt: true } },
      },
    });
    res.json(records.map((record) => record.published
      ? { id: record.courseId, ...record.content, published: true, media: record.media }
      : { id: record.courseId, published: false }));
  } catch (error) {
    console.error('LEARNING_COURSES_PUBLIC_LIST_ERROR:', error);
    res.status(500).json({ message: 'Could not load learning courses.' });
  }
};

exports.createCourse = async (req, res) => {
  const content = normalizeContent(req.body?.content);
  if (!content) {
    return res.status(400).json({ code: 'INVALID_LEARNING_COURSE', message: 'Course content is invalid.' });
  }

  try {
    const record = await prisma.learningCourse.create({
      data: { courseId: randomUUID(), content, published: req.body?.published === true },
      include: { media: { select: { slot: true, contentType: true, updatedAt: true } } },
    });
    res.status(201).json(toCourseRecord(record));
  } catch (error) {
    console.error('LEARNING_COURSE_CREATE_ERROR:', error);
    res.status(500).json({ message: 'Could not create learning course.' });
  }
};

exports.updateCourse = async (req, res) => {
  const { courseId } = req.params;
  if (!/^(?:[1-9]\d{0,8}|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(courseId)) {
    return res.status(400).json({ code: 'INVALID_LEARNING_COURSE_ID', message: 'Course ID is invalid.' });
  }
  const content = normalizeContent(req.body?.content);
  if (!content) {
    return res.status(400).json({ code: 'INVALID_LEARNING_COURSE', message: 'Course content is invalid.' });
  }

  try {
    const record = await prisma.learningCourse.upsert({
      where: { courseId },
      create: { courseId, content, published: true },
      update: { content },
      include: { media: { select: { slot: true, contentType: true, updatedAt: true } } },
    });
    res.json(toCourseRecord(record));
  } catch (error) {
    console.error('LEARNING_COURSE_UPDATE_ERROR:', error);
    res.status(500).json({ message: 'Could not update learning course.' });
  }
};

exports.setCoursePublished = async (req, res) => {
  const { courseId } = req.params;
  if (!/^(?:[1-9]\d{0,8}|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(courseId)) {
    return res.status(400).json({ code: 'INVALID_LEARNING_COURSE_ID', message: 'Course ID is invalid.' });
  }
  if (typeof req.body?.published !== 'boolean') {
    return res.status(400).json({ code: 'INVALID_PUBLISH_STATE', message: 'Published state must be a boolean.' });
  }
  const content = req.body.content === undefined ? undefined : normalizeContent(req.body.content);
  if (req.body.content !== undefined && !content) {
    return res.status(400).json({ code: 'INVALID_LEARNING_COURSE', message: 'Course content is invalid.' });
  }

  try {
    const existing = await prisma.learningCourse.findUnique({ where: { courseId } });
    if (!existing && !content) {
      return res.status(404).json({ code: 'LEARNING_COURSE_NOT_FOUND', message: 'Course content is required to set publication state.' });
    }
    const record = await prisma.learningCourse.upsert({
      where: { courseId },
      create: { courseId, content: content || existing.content, published: req.body.published },
      update: { published: req.body.published },
      include: { media: { select: { slot: true, contentType: true, updatedAt: true } } },
    });
    res.json(toCourseRecord(record));
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ code: 'LEARNING_COURSE_NOT_FOUND', message: 'Learning course was not found.' });
    }
    console.error('LEARNING_COURSE_PUBLISH_ERROR:', error);
    res.status(500).json({ message: 'Could not update course publication.' });
  }
};

exports.uploadCourseMedia = async (req, res) => {
  const { courseId, slot } = req.params;
  if (!COURSE_ID_PATTERN.test(courseId) || !MEDIA_SLOT_PATTERN.test(slot)) {
    return res.status(400).json({ code: 'INVALID_COURSE_MEDIA_TARGET', message: 'Course media target is invalid.' });
  }

  const contentType = req.headers['content-type']?.split(';')[0].trim().toLowerCase();
  const isImage = IMAGE_TYPES.has(contentType);
  const isVideo = VIDEO_TYPES.has(contentType);
  const isAudio = AUDIO_TYPES.has(contentType);
  if (!isImage && !isVideo && !isAudio) {
    return res.status(415).json({ code: 'UNSUPPORTED_COURSE_MEDIA_TYPE', message: 'Upload a JPEG, PNG, or WebP image; an MP4 or WebM video; or an AAC, MP4, MP3, OGG, WAV, or WebM audio file.' });
  }
  if ((slot.endsWith('-image') && !isImage) || (slot.endsWith('-video') && !isVideo) || (slot.endsWith('-audio') && !isAudio)) {
    return res.status(415).json({ code: 'COURSE_MEDIA_SLOT_TYPE_MISMATCH', message: 'This media slot does not accept that file type.' });
  }
  if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
    return res.status(400).json({ code: 'EMPTY_COURSE_MEDIA', message: 'The uploaded file is empty.' });
  }
  const maxBytes = isImage ? MAX_IMAGE_BYTES : isVideo ? MAX_VIDEO_BYTES : MAX_AUDIO_BYTES;
  if (req.body.length > maxBytes) {
    return res.status(413).json({
      code: 'COURSE_MEDIA_TOO_LARGE',
      message: isImage ? 'Images must be 10 MB or smaller.' : `${isVideo ? 'Videos' : 'Audio files'} must be 100 MB or smaller.`,
    });
  }

  try {
    const course = await prisma.learningCourse.findUnique({ where: { courseId }, select: { courseId: true } });
    if (!course) {
      return res.status(404).json({ code: 'LEARNING_COURSE_NOT_FOUND', message: 'Save the course before adding media.' });
    }
    const saved = await prisma.learningCourseMedia.upsert({
      where: { courseId_slot: { courseId, slot } },
      create: { courseId, slot, contentType, data: req.body },
      update: { contentType, data: req.body },
      select: { slot: true, contentType: true, updatedAt: true },
    });
    res.json(saved);
  } catch (error) {
    console.error('LEARNING_COURSE_MEDIA_UPLOAD_ERROR:', error);
    res.status(500).json({ message: 'Could not save course media.' });
  }
};

exports.deleteCourseMedia = async (req, res) => {
  const { courseId, slot } = req.params;
  if (!COURSE_ID_PATTERN.test(courseId) || !MEDIA_SLOT_PATTERN.test(slot)) {
    return res.status(400).json({ code: 'INVALID_COURSE_MEDIA_TARGET', message: 'Course media target is invalid.' });
  }

  try {
    const deleted = await prisma.learningCourseMedia.deleteMany({ where: { courseId, slot } });
    if (deleted.count === 0) {
      return res.status(404).json({ code: 'COURSE_MEDIA_NOT_FOUND', message: 'Course media was not found.' });
    }
    res.json({ slot, removed: true });
  } catch (error) {
    console.error('LEARNING_COURSE_MEDIA_DELETE_ERROR:', error);
    res.status(500).json({ message: 'Could not remove course media.' });
  }
};

exports.getCourseMedia = async (req, res) => {
  const { courseId, slot } = req.params;
  if (!COURSE_ID_PATTERN.test(courseId) || !MEDIA_SLOT_PATTERN.test(slot)) {
    return res.status(400).json({ code: 'INVALID_COURSE_MEDIA_TARGET', message: 'Course media target is invalid.' });
  }

  try {
    const media = await prisma.learningCourseMedia.findUnique({
      where: { courseId_slot: { courseId, slot } },
      select: { data: true, contentType: true, course: { select: { published: true } } },
    });
    if (!media || !media.course.published) {
      return res.status(404).json({ message: 'Course media was not found.' });
    }

    const data = Buffer.from(media.data);
    res.set({
      'Content-Type': media.contentType,
      'Content-Length': String(data.length),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
    });

    const range = req.headers.range;
    if (range && (media.contentType.startsWith('video/') || media.contentType.startsWith('audio/'))) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) {
        res.set('Content-Range', `bytes */${data.length}`);
        return res.status(416).end();
      }
      const start = match[1] ? Number(match[1]) : Math.max(0, data.length - Number(match[2]));
      const end = match[2] && match[1] ? Math.min(Number(match[2]), data.length - 1) : data.length - 1;
      if (start >= data.length || end < start) {
        res.set('Content-Range', `bytes */${data.length}`);
        return res.status(416).end();
      }
      res.status(206);
      res.set({
        'Content-Range': `bytes ${start}-${end}/${data.length}`,
        'Content-Length': String(end - start + 1),
      });
      return res.end(data.subarray(start, end + 1));
    }
    return res.send(data);
  } catch (error) {
    console.error('LEARNING_COURSE_MEDIA_GET_ERROR:', error);
    res.status(500).json({ message: 'Could not load course media.' });
  }
};
