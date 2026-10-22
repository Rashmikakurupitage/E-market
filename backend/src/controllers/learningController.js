const prisma = require('../config/db');
const { randomUUID } = require('node:crypto');

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

function certificateResponse(certificate) {
  return {
    certificateCode: certificate.certificateCode,
    courseId: certificate.courseId,
    courseTitle: certificate.courseTitle,
    learnerName: certificate.learnerName,
    lessonCount: certificate.lessonCount,
    quizScore: certificate.quizScore,
    quizQuestionCount: certificate.quizQuestionCount,
    issuedAt: certificate.issuedAt,
    verificationUrl: `/verify-certificate/${encodeURIComponent(certificate.certificateCode)}`,
  };
}

exports.issueLearningCertificate = async (req, res) => {
  const { courseId } = req.body || {};
  const requestedTitle = typeof req.body?.courseTitle === 'string' ? req.body.courseTitle.trim() : '';
  const requestedLessonCount = req.body?.lessonCount;
  const requestedQuizQuestionCount = req.body?.quizQuestionCount;
  if (
    typeof courseId !== 'string' ||
    !/^(?:[1-6]|[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.test(courseId) ||
    requestedTitle.length > 160 ||
    !Number.isInteger(requestedLessonCount) ||
    requestedLessonCount < 1 ||
    requestedLessonCount > MAX_LESSONS ||
    !Number.isInteger(requestedQuizQuestionCount) ||
    requestedQuizQuestionCount < 1 ||
    requestedQuizQuestionCount > 20
  ) {
    return res.status(400).json({ code: 'INVALID_CERTIFICATE_REQUEST', message: 'Certificate request is invalid.' });
  }

  try {
    const [user, savedProgress, managedCourse] = await Promise.all([
      prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
          role: true,
          customerProfile: { select: { fullName: true } },
          sellerProfile: { select: { firstName: true, lastName: true, businessName: true } },
          adminProfile: { select: { fullName: true } },
        },
      }),
      prisma.learningProgress.findUnique({
        where: { userId: req.user.userId },
        select: { progress: true },
      }),
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(courseId)
        ? prisma.learningCourse.findUnique({
          where: { courseId },
          select: { content: true, published: true },
        })
        : Promise.resolve(null),
    ]);
    if (!user || !['CUSTOMER', 'SELLER'].includes(user.role)) {
      return res.status(403).json({ code: 'CERTIFICATE_LEARNER_REQUIRED', message: 'A learner account is required for certificates.' });
    }

    const learnerName = user.customerProfile?.fullName
      || [user.sellerProfile?.firstName, user.sellerProfile?.lastName].filter(Boolean).join(' ')
      || user.sellerProfile?.businessName
      || user.adminProfile?.fullName;
    if (!learnerName) {
      return res.status(400).json({ code: 'CERTIFICATE_PROFILE_NAME_REQUIRED', message: 'Add a name to your account profile before requesting a certificate.' });
    }

    let courseTitle = requestedTitle;
    let lessonCount = requestedLessonCount;
    if (managedCourse) {
      if (!managedCourse.published) {
        return res.status(404).json({ code: 'CERTIFICATE_COURSE_NOT_FOUND', message: 'Published course was not found.' });
      }
      const content = managedCourse.content;
      courseTitle = content?.translations?.en?.title || content?.translations?.si?.title || content?.translations?.ta?.title || '';
      lessonCount = content?.translations?.en?.lessons?.length
        || content?.translations?.si?.lessons?.length
        || content?.translations?.ta?.lessons?.length;
      if (lessonCount !== requestedLessonCount) {
        return res.status(409).json({ code: 'CERTIFICATE_COURSE_CHANGED', message: 'The course content changed. Refresh the course before requesting a certificate.' });
      }
    } else if (!/^[1-6]$/.test(courseId) || !courseTitle) {
      return res.status(404).json({ code: 'CERTIFICATE_COURSE_NOT_FOUND', message: 'Course was not found.' });
    }

    const courseProgress = savedProgress?.progress?.[courseId];
    const completed = Array.isArray(courseProgress?.completed) ? [...new Set(courseProgress.completed)] : [];
    const isComplete = courseProgress?.done === true
      && completed.length === lessonCount
      && completed.every((lesson) => Number.isInteger(lesson) && lesson >= 0 && lesson < lessonCount)
      && Number.isInteger(courseProgress.quizScore)
      && courseProgress.quizScore >= 0
      && courseProgress.quizScore <= requestedQuizQuestionCount;
    if (!isComplete) {
      return res.status(403).json({ code: 'COURSE_COMPLETION_REQUIRED', message: 'Complete every lesson and the knowledge check before requesting a certificate.' });
    }

    const existing = await prisma.learningCertificate.findUnique({
      where: { userId_courseId: { userId: req.user.userId, courseId } },
    });
    if (existing) return res.json(certificateResponse(existing));

    const certificate = await prisma.learningCertificate.create({
      data: {
        certificateCode: randomUUID(),
        userId: req.user.userId,
        courseId,
        courseTitle,
        learnerName,
        lessonCount,
        quizScore: courseProgress.quizScore,
        quizQuestionCount: requestedQuizQuestionCount,
      },
    });
    res.status(201).json(certificateResponse(certificate));
  } catch (error) {
    if (error.code === 'P2002') {
      try {
        const existing = await prisma.learningCertificate.findUnique({
          where: { userId_courseId: { userId: req.user.userId, courseId } },
        });
        if (existing) return res.json(certificateResponse(existing));
      } catch (lookupError) {
        console.error('LEARNING_CERTIFICATE_LOOKUP_ERROR:', lookupError);
      }
    }
    console.error('LEARNING_CERTIFICATE_ISSUE_ERROR:', error);
    res.status(500).json({ message: 'Could not issue learning certificate.' });
  }
};

exports.verifyLearningCertificate = async (req, res) => {
  const { certificateCode } = req.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(certificateCode)) {
    return res.status(404).json({ code: 'CERTIFICATE_NOT_FOUND', message: 'Certificate was not found.' });
  }
  try {
    const certificate = await prisma.learningCertificate.findUnique({ where: { certificateCode } });
    if (!certificate) {
      return res.status(404).json({ code: 'CERTIFICATE_NOT_FOUND', message: 'Certificate was not found.' });
    }
    res.json({ verified: true, certificate: certificateResponse(certificate) });
  } catch (error) {
    console.error('LEARNING_CERTIFICATE_VERIFY_ERROR:', error);
    res.status(500).json({ message: 'Could not verify learning certificate.' });
  }
};
