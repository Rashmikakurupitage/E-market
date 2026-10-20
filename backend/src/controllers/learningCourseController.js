const { randomUUID } = require('node:crypto');
const prisma = require('../config/db');

const LANGUAGES = ['si', 'ta', 'en'];
const CATEGORIES = ['digitalMarketing', 'financialManagement', 'branding'];
const THEMES = ['Digital Marketing', 'Financial Management', 'Branding'];
const LEVELS = ['beginner', 'intermediate'];
const MAX_CONTENT_BYTES = 100_000;

const validText = (value, maxLength) =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= maxLength;

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

  const normalizedTranslations = {};
  for (const language of LANGUAGES) {
    const translation = translations[language];
    const { title, description, duration, lessons, quiz } = translation;
    if (
      !validText(title, 160) ||
      !validText(description, 2000) ||
      !validText(duration, 60) ||
      !Array.isArray(lessons) ||
      lessons.length < 1 ||
      lessons.length > 20 ||
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

    normalizedTranslations[language] = {
      title: title.trim(),
      description: description.trim(),
      duration: duration.trim(),
      lessons: normalizedLessons,
      quiz: normalizedQuiz,
    };
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
  };
}

exports.listAdminCourses = async (req, res) => {
  try {
    const records = await prisma.learningCourse.findMany({ orderBy: [{ updatedAt: 'desc' }] });
    res.json(records.map(toCourseRecord));
  } catch (error) {
    console.error('LEARNING_COURSES_ADMIN_LIST_ERROR:', error);
    res.status(500).json({ message: 'Could not load learning courses.' });
  }
};

exports.listPublicCourses = async (req, res) => {
  try {
    const records = await prisma.learningCourse.findMany({
      select: { courseId: true, content: true, published: true },
    });
    res.json(records.map((record) => record.published
      ? { id: record.courseId, ...record.content, published: true }
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
      create: { courseId, content, published: req.body.published },
      update: { published: req.body.published },
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
