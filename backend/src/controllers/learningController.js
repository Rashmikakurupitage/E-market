const prisma = require('../config/db');

const MAX_COURSES = 100;
const MAX_LESSONS = 100;
const MAX_PROGRESS_BYTES = 50_000;

function normalizeProgress(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null;

  const courseIds = Object.keys(input);
  if (courseIds.length > MAX_COURSES) return null;

  const normalized = {};
  for (const courseId of courseIds) {
    if (!/^(?:[1-9]\d{0,8}|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(courseId)) return null;
    const course = input[courseId];
    if (!course || typeof course !== 'object' || Array.isArray(course)) return null;

    const completed = course.completed ?? [];
    const current = course.current ?? 0;
    const done = course.done ?? false;
    const started = course.started ?? false;
    if (
      !Array.isArray(completed) ||
      completed.length > MAX_LESSONS ||
      completed.some((lesson) => !Number.isInteger(lesson) || lesson < 0 || lesson >= MAX_LESSONS) ||
      !Number.isInteger(current) ||
      current < 0 ||
      current >= MAX_LESSONS ||
      typeof done !== 'boolean' ||
      typeof started !== 'boolean' ||
      (course.quizScore !== undefined && (!Number.isInteger(course.quizScore) || course.quizScore < 0 || course.quizScore >= MAX_LESSONS))
    ) {
      return null;
    }

    normalized[courseId] = {
      completed: [...new Set(completed)],
      current,
      done,
      started: started || completed.length > 0 || done,
      ...(course.quizScore === undefined ? {} : { quizScore: course.quizScore }),
    };
  }

  return Buffer.byteLength(JSON.stringify(normalized), 'utf8') <= MAX_PROGRESS_BYTES ? normalized : null;
}

exports.getLearningProgress = async (req, res) => {
  try {
    const saved = await prisma.learningProgress.findUnique({
      where: { userId: req.user.userId },
      select: { progress: true, updatedAt: true },
    });
    res.json({ progress: saved?.progress || {}, updatedAt: saved?.updatedAt || null });
  } catch (error) {
    console.error('LEARNING_PROGRESS_GET_ERROR:', error);
    res.status(500).json({ message: 'Could not load learning progress.' });
  }
};

exports.saveLearningProgress = async (req, res) => {
  const progress = normalizeProgress(req.body?.progress);
  if (!progress) {
    return res.status(400).json({ code: 'INVALID_LEARNING_PROGRESS', message: 'Learning progress is invalid.' });
  }

  try {
    const saved = await prisma.learningProgress.upsert({
      where: { userId: req.user.userId },
      create: { userId: req.user.userId, progress },
      update: { progress },
      select: { progress: true, updatedAt: true },
    });
    res.json({ progress: saved.progress, updatedAt: saved.updatedAt });
  } catch (error) {
    console.error('LEARNING_PROGRESS_SAVE_ERROR:', error);
    res.status(500).json({ message: 'Could not save learning progress.' });
  }
};
