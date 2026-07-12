const Anthropic = require('@anthropic-ai/sdk');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { AppError } = require('../utils/errors');
const { logger } = require('../utils/logger');

let _anthropic = null;
function getAnthropic() {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not set in .env');
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

// ── System prompt builder ──────────────────────────────────

function buildSystemPrompt(context) {
  let system = `You are an expert AI tutor for SkillTech Hub, an advanced technology education platform.
You help students learn programming, AI, data science, cybersecurity, cloud computing, design, and digital skills.

Your role:
- Answer technical questions clearly with examples
- Explain concepts at the student's level
- Provide working code examples when helpful
- Suggest next steps and learning resources
- Generate quiz questions to test understanding
- Be encouraging but accurate

Always format code in markdown code blocks with the language specified.
Be concise but thorough. If you don't know something, say so.`;

  if (context.course) {
    system += `\n\nCurrent course context:
- Course: ${context.course.title}
- School: ${context.course.school_name}
- Level: ${context.course.level}
- Current lesson: ${context.lesson?.title || 'Not specified'}`;
  }

  if (context.studentProfile) {
    system += `\n\nStudent profile:
- Completed courses: ${context.studentProfile.completedCourses}
- Skill level: ${context.studentProfile.level || 'beginner'}`;
  }

  return system;
}

// ── Chat with AI tutor ─────────────────────────────────────

exports.chat = async (req, res, next) => {
  try {
    const { message, conversationId, courseId, lessonId } = req.body;
    const userId = req.user.userId;

    if (!message?.trim()) throw new AppError('Message is required', 400);

    // Get or create conversation
    let convId = conversationId;
    if (!convId) {
      convId = uuidv4();
      await query(
        'INSERT INTO ai_conversations (id, user_id, course_id, lesson_id, title) VALUES (?, ?, ?, ?, ?)',
        [convId, userId, courseId || null, lessonId || null, message.substring(0, 100)]
      );
    } else {
      const [conv] = await query(
        'SELECT id FROM ai_conversations WHERE id = ? AND user_id = ?',
        [convId, userId]
      );
      if (!conv) throw new AppError('Conversation not found', 404);
    }

    // Load conversation history (last 20 messages)
    const history = await query(
      `SELECT role, content FROM ai_messages
       WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 20`,
      [convId]
    );
    history.reverse();

    // Build context
    let context = {};
    if (courseId) {
      const [course] = await query(
        'SELECT c.title, c.level, s.name AS school_name FROM courses c JOIN schools s ON s.id = c.school_id WHERE c.id = ?',
        [courseId]
      );
      context.course = course;
    }
    if (lessonId) {
      const [lesson] = await query('SELECT title FROM lessons WHERE id = ?', [lessonId]);
      context.lesson = lesson;
    }

    // Get student profile for personalization
    const [profile] = await query(
      `SELECT
         (SELECT COUNT(*) FROM enrollments WHERE user_id = ? AND completed_at IS NOT NULL) AS completedCourses
       FROM users WHERE id = ?`,
      [userId, userId]
    );
    context.studentProfile = profile;

    const systemPrompt = buildSystemPrompt(context);

    // Build messages for Claude
    const messages = [
      ...history.map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: message },
    ];

    // Call Claude API with streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    let fullResponse = '';

    const stream = await getAnthropic().messages.stream({
      model: process.env.AI_MODEL || 'claude-3-5-sonnet-latest',
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });

    if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY is missing');
}

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        const text = chunk.delta.text;
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`);
      }
    }

    if (!fullResponse.trim()) {
  throw new Error(
    'Claude returned an empty response. Check your API key or model.'
  );
}

    // Save both messages to DB
    await query(
      'INSERT INTO ai_messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)',
      [uuidv4(), convId, 'user', message]
    );
    await query(
      'INSERT INTO ai_messages (id, conversation_id, role, content, tokens_used) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), convId, 'assistant', fullResponse, usage?.output_tokens || 0]
    );

    res.write(`data: ${JSON.stringify({ type: 'done', conversationId: convId })}\n\n`);
    res.end();
  } catch (err) {
    logger.error('AI chat error:', {
  message: err.message,
  status: err.status,
  type: err.type,
  stack: err.stack,
});
    if (!res.headersSent) {
      next(err);
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      res.end();
    }
  }
};

// ── Generate quiz from lesson content ─────────────────────

exports.generateQuiz = async (req, res, next) => {
  try {
    const { lessonId, numQuestions = 5, difficulty = 'medium' } = req.body;

    const [lesson] = await query(
      'SELECT title, content_body, type FROM lessons WHERE id = ?',
      [lessonId]
    );
    if (!lesson) throw new AppError('Lesson not found', 404);
    if (!lesson.content_body) throw new AppError('Lesson has no content to generate quiz from', 400);

    const prompt = `Generate ${numQuestions} ${difficulty}-difficulty multiple choice questions for this lesson.

Lesson title: ${lesson.title}
Content: ${lesson.content_body.substring(0, 3000)}

Return a JSON array of questions. Each question must have:
- question (string)
- options (array of 4 strings labeled A, B, C, D)
- correct (string: "A", "B", "C", or "D")
- explanation (string: why this answer is correct)

Return ONLY valid JSON, no other text.`;

    const response = await getAnthropic().messages.create({
      model: process.env.AI_MODEL || 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = response.content[0].text.trim();
    let questions;
    try {
      questions = JSON.parse(raw);
    } catch {
      const match = raw.match(/\[[\s\S]*\]/);
      questions = match ? JSON.parse(match[0]) : [];
    }

    res.json({ success: true, data: { questions, lessonTitle: lesson.title } });
  } catch (err) {
    next(err);
  }
};

// ── Get study plan for user ────────────────────────────────

exports.getStudyPlan = async (req, res, next) => {
  try {
    const userId = req.user.userId;
    const { goal, availableHoursPerWeek = 10 } = req.body;

    // Gather user context
    const enrollments = await query(`
      SELECT c.title, c.level, e.progress_pct, s.name AS school
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      JOIN schools s ON s.id = c.school_id
      WHERE e.user_id = ? AND e.completed_at IS NULL
      LIMIT 10
    `, [userId]);

    const [user] = await query(
      'SELECT first_name FROM users WHERE id = ?',
      [userId]
    );

    const prompt = `Create a personalized weekly study plan for ${user.first_name}.

Goal: ${goal || 'General technology skill improvement'}
Available hours per week: ${availableHoursPerWeek}
Current in-progress courses: ${JSON.stringify(enrollments)}

Create a practical, motivating study plan that:
1. Allocates time efficiently across their current courses
2. Suggests specific topics to focus on each day
3. Includes practice projects
4. Builds toward their stated goal
5. Is realistic for ${availableHoursPerWeek} hours/week

Format as a structured weekly schedule with daily goals.`;

    const response = await getAnthropic().messages.create({
      model: process.env.AI_MODEL || 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    res.json({
      success: true,
      data: { studyPlan: response.content[0].text },
    });
  } catch (err) {
    next(err);
  }
};

// ── Explain a code snippet ─────────────────────────────────

exports.explainCode = async (req, res, next) => {
  try {
    const { code, language, question } = req.body;
    if (!code) throw new AppError('Code is required', 400);

    const prompt = `Explain this ${language || 'code'} clearly for a student:

\`\`\`${language || ''}
${code}
\`\`\`

${question ? `Specific question: ${question}` : 'Explain what this code does, how it works, and any important concepts it demonstrates. Include any potential improvements or gotchas.'}`;

    const response = await getAnthropic().messages.create({
      model: process.env.AI_MODEL || 'claude-sonnet-4-5',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    res.json({ success: true, data: { explanation: response.content[0].text } });
  } catch (err) {
    next(err);
  }
};

// ── Get conversation history ───────────────────────────────

exports.getConversations = async (req, res, next) => {
  try {
    const conversations = await query(`
      SELECT ac.id, ac.title, ac.course_id, ac.created_at,
             (SELECT content FROM ai_messages WHERE conversation_id = ac.id ORDER BY created_at DESC LIMIT 1) AS last_message
      FROM ai_conversations ac
      WHERE ac.user_id = ?
      ORDER BY ac.updated_at DESC
      LIMIT 20
    `, [req.user.userId]);

    res.json({ success: true, data: conversations });
  } catch (err) {
    next(err);
  }
};
