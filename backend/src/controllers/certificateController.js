const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const { query } = require('../config/database');
const { uploadBuffer } = require('../services/cloudinary');
const { AppError } = require('../utils/errors');

// ── Issue certificate ──────────────────────────────────────

exports.issue = async (req, res, next) => {
  try {
    const { userId, courseId } = req.body;
    const targetUserId = userId || req.user.userId;

    // Check enrollment and completion
    const [enrollment] = await query(
      'SELECT id, completed_at FROM enrollments WHERE user_id = ? AND course_id = ? AND completed_at IS NOT NULL',
      [targetUserId, courseId]
    );
    if (!enrollment) throw new AppError('Course not completed. Finish all lessons first.', 400);

    // Check not already issued
    const [existing] = await query(
      'SELECT id, verify_token FROM certificates WHERE user_id = ? AND course_id = ?',
      [targetUserId, courseId]
    );
    if (existing) {
      return res.json({
        success: true,
        message: 'Certificate already issued',
        data: { certificateId: existing.id, verifyToken: existing.verify_token },
      });
    }

    // Fetch data for the certificate
    const [user] = await query(
      'SELECT first_name, last_name, email FROM users WHERE id = ?',
      [targetUserId]
    );
    const [course] = await query(`
      SELECT c.title, c.level, c.duration_hours,
             u.first_name AS inst_first, u.last_name AS inst_last,
             s.name AS school_name
      FROM courses c
      JOIN users u   ON u.id = c.instructor_id
      JOIN schools s ON s.id = c.school_id
      WHERE c.id = ?
    `, [courseId]);

    if (!user || !course) throw new AppError('User or course not found', 404);

    const certId      = uuidv4();
    const verifyToken = uuidv4().replace(/-/g, '');
    const verifyUrl   = `${process.env.CLIENT_URL}/verify/${verifyToken}`;
    const issuedAt    = new Date();

    // Generate PDF
    const pdfBuffer = await generateCertificatePDF({
      user, course, certId, verifyUrl,
      issuedAt: issuedAt.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    });

    // Upload PDF
    const pdfUrl = await uploadBuffer(pdfBuffer, `certificates/${certId}.pdf`, 'raw');

    // Save to DB
    await query(
      `INSERT INTO certificates (id, user_id, course_id, verify_token, issued_at, pdf_url, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [certId, targetUserId, courseId, verifyToken, issuedAt, pdfUrl,
       JSON.stringify({ userName: `${user.first_name} ${user.last_name}`, courseTitle: course.title })]
    );

    res.status(201).json({
      success: true,
      data: { certificateId: certId, verifyToken, pdfUrl, verifyUrl },
    });
  } catch (err) {
    next(err);
  }
};

// ── Verify certificate (public) ────────────────────────────

exports.verify = async (req, res, next) => {
  try {
    const { token } = req.params;

    const [cert] = await query(`
      SELECT c.id, c.issued_at, c.is_valid,
             u.first_name, u.last_name,
             co.title AS course_title, co.level,
             s.name AS school_name,
             inst.first_name AS inst_first, inst.last_name AS inst_last
      FROM certificates c
      JOIN users u      ON u.id  = c.user_id
      JOIN courses co   ON co.id = c.course_id
      JOIN schools s    ON s.id  = co.school_id
      JOIN users inst   ON inst.id = co.instructor_id
      WHERE c.verify_token = ?
    `, [token]);

    if (!cert) {
      return res.json({
        success: false,
        valid: false,
        message: 'Certificate not found or invalid',
      });
    }

    res.json({
      success: true,
      valid: cert.is_valid,
      data: {
        certificateId: cert.id,
        recipientName: `${cert.first_name} ${cert.last_name}`,
        courseTitle: cert.course_title,
        schoolName: cert.school_name,
        level: cert.level,
        instructorName: `${cert.inst_first} ${cert.inst_last}`,
        issuedAt: cert.issued_at,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── My certificates ────────────────────────────────────────

exports.myCertificates = async (req, res, next) => {
  try {
    const certs = await query(`
      SELECT c.id, c.verify_token, c.issued_at, c.pdf_url,
             co.title AS course_title, co.level,
             s.name AS school_name, s.color AS school_color
      FROM certificates c
      JOIN courses co ON co.id = c.course_id
      JOIN schools s  ON s.id  = co.school_id
      WHERE c.user_id = ? AND c.is_valid = TRUE
      ORDER BY c.issued_at DESC
    `, [req.user.userId]);

    res.json({ success: true, data: certs });
  } catch (err) {
    next(err);
  }
};

// ── PDF Generator ──────────────────────────────────────────

async function generateCertificatePDF({ user, course, certId, verifyUrl, issuedAt }) {
  return new Promise(async (resolve, reject) => {
    try {
      const chunks = [];
      const doc = new PDFDocument({
        size: 'A4',
        layout: 'landscape',
        margins: { top: 50, bottom: 50, left: 60, right: 60 },
      });

      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const W = doc.page.width;
      const H = doc.page.height;

      // Background
      doc.rect(0, 0, W, H).fill('#0a0a1a');

      // Decorative border
      doc.rect(20, 20, W - 40, H - 40)
         .stroke('#6366f1')
         .lineWidth(2);

      doc.rect(28, 28, W - 56, H - 56)
         .stroke('#8b5cf6')
         .lineWidth(0.5);

      // Header accent bar
      doc.rect(60, 60, W - 120, 4).fill('#6366f1');

      // Platform name
      doc.fillColor('#a5b4fc')
         .fontSize(14)
         .font('Helvetica')
         .text('SKILLTECH HUB', { align: 'center', characterSpacing: 6 });

      // Certificate of completion
      doc.fillColor('#ffffff')
         .fontSize(36)
         .font('Helvetica-Bold')
         .text('Certificate of Completion', { align: 'center' });

      doc.moveDown(0.3);

      // Recipient name
      doc.fillColor('#a5b4fc')
         .fontSize(14)
         .font('Helvetica')
         .text('This certifies that', { align: 'center' });

      doc.fillColor('#f0f0ff')
         .fontSize(42)
         .font('Helvetica-Bold')
         .text(`${user.first_name} ${user.last_name}`, { align: 'center' });

      // Decorative line under name
      const nameY = doc.y + 8;
      const lineX = (W - 300) / 2;
      doc.moveTo(lineX, nameY)
         .lineTo(lineX + 300, nameY)
         .stroke('#6366f1')
         .lineWidth(1);

      doc.moveDown(0.6);

      // Course details
      doc.fillColor('#a5b4fc')
         .fontSize(14)
         .font('Helvetica')
         .text('has successfully completed the course', { align: 'center' });

      doc.fillColor('#ffffff')
         .fontSize(26)
         .font('Helvetica-Bold')
         .text(course.title, { align: 'center' });

      doc.fillColor('#a5b4fc')
         .fontSize(13)
         .font('Helvetica')
         .text(`${course.school_name} · ${course.level} Level`, { align: 'center' });

      if (course.duration_hours) {
        doc.text(`${course.duration_hours} hours of instruction`, { align: 'center' });
      }

      doc.moveDown(1.2);

      // Instructor signature area
      const sigStartX = 80;
      const sigY = doc.y;

      doc.moveTo(sigStartX, sigY)
         .lineTo(sigStartX + 200, sigY)
         .stroke('#6366f1');
      doc.fillColor('#ffffff')
         .fontSize(12)
         .text(`${course.inst_first} ${course.inst_last}`, sigStartX, sigY + 6);
      doc.fillColor('#a5b4fc')
         .fontSize(10)
         .text('Course Instructor', sigStartX, sigY + 22);

      // Issue date
      doc.fillColor('#a5b4fc')
         .fontSize(12)
         .text(`Issued: ${issuedAt}`, { align: 'center' });

      // Certificate ID
      doc.fillColor('#6366f1')
         .fontSize(9)
         .text(`Certificate ID: ${certId}`, { align: 'center' });

      // QR Code
      const qrBuffer = await QRCode.toBuffer(verifyUrl, {
        type: 'png', width: 80, margin: 1,
        color: { dark: '#6366f1', light: '#0a0a1a' },
      });
      const qrX = W - 130;
      const qrY = H - 140;
      doc.image(qrBuffer, qrX, qrY, { width: 70 });
      doc.fillColor('#a5b4fc')
         .fontSize(8)
         .text('Verify certificate', qrX - 5, qrY + 74, { width: 80, align: 'center' });

      // Footer accent bar
      doc.rect(60, H - 64, W - 120, 4).fill('#6366f1');

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
