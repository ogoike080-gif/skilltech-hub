const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { AppError } = require('../utils/errors');

exports.listByCourse = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const assessments = await query(
      'SELECT id, title, `type`, time_limit, passing_score, max_attempts, is_published FROM assessments WHERE course_id = ?',
      [courseId]
    );
    res.json({ success: true, data: assessments });
  } catch (err) { next(err); }
};

exports.getAssessment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const [assessment] = await query('SELECT * FROM assessments WHERE id = ? AND is_published = TRUE', [id]);
    if (!assessment) throw new AppError('Assessment not found', 404);
    const questions = await query(
      'SELECT id, `type`, question_text, options, points, sort_order FROM questions WHERE assessment_id = ? ORDER BY sort_order',
      [id]
    );
    // Strip correct answers from questions before sending to student
    const safeQuestions = questions.map(q => ({ ...q, correct_answer: undefined }));
    res.json({ success: true, data: { ...assessment, questions: safeQuestions } });
  } catch (err) { next(err); }
};

exports.submitAttempt = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;
    const userId = req.user.userId;

    const [assessment] = await query('SELECT * FROM assessments WHERE id = ?', [id]);
    if (!assessment) throw new AppError('Assessment not found', 404);

    // Check attempt count
    const attempts = await query(
      'SELECT id FROM assessment_attempts WHERE assessment_id = ? AND user_id = ?',
      [id, userId]
    );
    if (attempts.length >= assessment.max_attempts) {
      throw new AppError(`Maximum attempts (${assessment.max_attempts}) reached`, 400);
    }

    // Fetch correct answers and grade
    const questions = await query(
      'SELECT id, correct_answer, points FROM questions WHERE assessment_id = ?', [id]
    );

    let earned = 0, total = 0;
    for (const q of questions) {
      total += q.points;
      const studentAnswer = answers[q.id];
      const correct = q.correct_answer;
      if (Array.isArray(correct)) {
        if (JSON.stringify(studentAnswer) === JSON.stringify(correct)) earned += q.points;
      } else {
        if (String(studentAnswer).trim().toLowerCase() === String(correct).trim().toLowerCase()) earned += q.points;
      }
    }

    const score  = total > 0 ? Math.round((earned / total) * 100) : 0;
    const passed = score >= assessment.passing_score;
    const attemptId = uuidv4();

    await query(
      'INSERT INTO assessment_attempts (id, assessment_id, user_id, answers, score, passed, submitted_at, graded_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())',
      [attemptId, id, userId, JSON.stringify(answers), score, passed ? 1 : 0]
    );

    res.json({ success: true, data: { score, passed, passingScore: assessment.passing_score, attemptId } });
  } catch (err) { next(err); }
};

exports.myAttempts = async (req, res, next) => {
  try {
    const { id } = req.params;
    const attempts = await query(
      'SELECT id, score, passed, submitted_at FROM assessment_attempts WHERE assessment_id = ? AND user_id = ? ORDER BY submitted_at DESC',
      [id, req.user.userId]
    );
    res.json({ success: true, data: attempts });
  } catch (err) { next(err); }
};

exports.create = async (req, res, next) => {
  try {
    const { courseId, lessonId, title, type = 'quiz', instructions, timeLimit, passingScore = 70, maxAttempts = 3 } = req.body;
    const id = uuidv4();
    await query(
      'INSERT INTO assessments (id, course_id, lesson_id, title, `type`, instructions, time_limit, passing_score, max_attempts) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, courseId, lessonId || null, title, type, instructions, timeLimit || null, passingScore, maxAttempts]
    );
    res.status(201).json({ success: true, data: { id } });
  } catch (err) { next(err); }
};

exports.addQuestion = async (req, res, next) => {
  try {
    const { assessmentId } = req.params;
    const { type = 'mcq', questionText, options, correctAnswer, explanation, points = 1, sortOrder = 0 } = req.body;
    const id = uuidv4();
    await query(
      'INSERT INTO questions (id, assessment_id, `type`, question_text, options, correct_answer, explanation, points, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [id, assessmentId, type, questionText, JSON.stringify(options || []), JSON.stringify(correctAnswer), explanation, points, sortOrder]
    );
    res.status(201).json({ success: true, data: { id } });
  } catch (err) { next(err); }
};
