// The six starter courses that ship with the website (frontend/src/lib/i18n.js, elearningHub.courses).
// Certificates are issued with these server-side details, never with a title or size sent by the browser.
// An admin can replace a starter course in the admin panel; that saved version (LearningCourse) wins.
// Keep this list in step with the website when a starter course changes.
const BUILT_IN_COURSES = {
  '1': { title: 'How to Sell Products with WhatsApp Business', lessonCount: 4, quizQuestionCount: 3 },
  '2': { title: 'How to Set the Right Price for Your Products', lessonCount: 3, quizQuestionCount: 3 },
  '3': { title: 'Take Appealing Product Photos with Your Phone', lessonCount: 5, quizQuestionCount: 3 },
  '4': { title: 'Plan Social Media Posts for Your Small Business', lessonCount: 3, quizQuestionCount: 3 },
  '5': { title: 'Keep Simple Sales and Expense Records', lessonCount: 3, quizQuestionCount: 3 },
  '6': { title: 'Build a Clear and Memorable Brand', lessonCount: 3, quizQuestionCount: 3 },
};

// A learner needs at least 60% of the knowledge-check questions right (2 of 3) for a certificate
const PASS_RATIO = 0.6;
const passMarkFor = (questionCount) => Math.max(1, Math.ceil(questionCount * PASS_RATIO));

module.exports = { BUILT_IN_COURSES, passMarkFor };
