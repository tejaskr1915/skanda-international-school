const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { portalAuthMiddleware, requireRole, resolveBranchId, getCurrentAcademicYearId } = require('../middleware/rbac');

router.use(portalAuthMiddleware);

// 1. Syllabus Completion Tracker
router.get('/syllabus', async (req, res) => {
  try {
    const branchId = req.portalUser.branchId || (await resolveBranchId(req));
    const chapters = await prisma.syllabusChapter.findMany({
      where: { branchId },
      orderBy: [{ subject: 'asc' }, { chapterNo: 'asc' }]
    });

    const summary = {};
    for (const ch of chapters) {
      const key = `${ch.classOrCourse} • ${ch.subject}`;
      if (!summary[key]) summary[key] = { total: 0, completed: 0, pct: 0 };
      summary[key].total++;
      if (ch.isCompleted) summary[key].completed++;
      summary[key].pct = Math.round((summary[key].completed / summary[key].total) * 100);
    }

    res.json({ success: true, chapters, summary });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/syllabus', requireRole('SUPER_ADMIN', 'ADMIN', 'TEACHER'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { classOrCourse, subject, chapterNo, title } = req.body;
    if (!classOrCourse || !subject || !title) {
      return res.status(400).json({ success: false, message: 'classOrCourse, subject, and title are required.' });
    }
    const chapter = await prisma.syllabusChapter.create({
      data: {
        branchId,
        classOrCourse: classOrCourse.trim(),
        subject: subject.trim(),
        chapterNo: Number(chapterNo) || 1,
        title: title.trim(),
        teacherUserId: req.portalUser.id
      }
    });
    res.status(201).json({ success: true, chapter });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/syllabus/:id/toggle', requireRole('SUPER_ADMIN', 'ADMIN', 'TEACHER'), async (req, res) => {
  try {
    const existing = await prisma.syllabusChapter.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Chapter not found.' });
    const next = !existing.isCompleted;
    const chapter = await prisma.syllabusChapter.update({
      where: { id: existing.id },
      data: { isCompleted: next, completedAt: next ? new Date() : null }
    });
    res.json({ success: true, chapter });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. Board Exam Registration & Roll-Number / Admit-Card Upload
router.get('/board-exams', requireRole('SUPER_ADMIN', 'ADMIN', 'EXAM_CONTROLLER', 'TEACHER'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const registrations = await prisma.boardExamRegistration.findMany({ where: { branchId }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, registrations });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/board-exams/register', requireRole('SUPER_ADMIN', 'ADMIN', 'EXAM_CONTROLLER'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const academicYearId = await getCurrentAcademicYearId(branchId);
    const { studentId, board, rollNumber, admitCardUrl } = req.body;
    if (!studentId || !board) return res.status(400).json({ success: false, message: 'studentId and board are required.' });

    const reg = await prisma.boardExamRegistration.upsert({
      where: { academicYearId_studentId: { academicYearId, studentId } },
      update: { board, rollNumber, admitCardUrl, status: admitCardUrl ? 'ADMIT_CARD_UPLOADED' : 'REGISTERED' },
      create: { branchId, academicYearId, studentId, board, rollNumber, admitCardUrl, status: admitCardUrl ? 'ADMIT_CARD_UPLOADED' : 'REGISTERED' }
    });
    res.status(201).json({ success: true, registration: reg });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Admin-Approved Board Change Log
router.get('/board-changes', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const logs = await prisma.boardChangeLog.findMany({ where: { branchId }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/board-changes', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { studentId, toBoard, reason } = req.body;
    const student = await prisma.studentProfile.findFirst({ where: { id: studentId, branchId } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const fromBoard = student.boardOrDept || 'CBSE';
    await prisma.studentProfile.update({ where: { id: student.id }, data: { boardOrDept: toBoard } });
    const log = await prisma.boardChangeLog.create({
      data: { branchId, studentId: student.id, fromBoard, toBoard, reason: reason || 'Admin Approved', approvedByUserId: req.portalUser.id }
    });
    res.status(201).json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. College SGPA/CGPA, Revaluation & Backlogs
router.get('/college-records', async (req, res) => {
  try {
    let studentId = req.query.studentId;
    if (req.portalUser.role === 'STUDENT') {
      const sp = await prisma.studentProfile.findUnique({ where: { userId: req.portalUser.id } });
      studentId = sp?.id;
    }
    const branchId = req.portalUser.branchId || (await resolveBranchId(req));
    const records = await prisma.collegeAcademicRecord.findMany({
      where: studentId ? { studentId } : { branchId },
      orderBy: { semester: 'asc' }
    });
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/college-records', requireRole('SUPER_ADMIN', 'ADMIN', 'EXAM_CONTROLLER', 'TEACHER'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { studentId, semester, sgpa, cgpa, backlogs } = req.body;
    if (!studentId || !semester || sgpa === undefined || cgpa === undefined) {
      return res.status(400).json({ success: false, message: 'studentId, semester, sgpa, and cgpa are required.' });
    }
    const record = await prisma.collegeAcademicRecord.upsert({
      where: { studentId_semester: { studentId, semester: Number(semester) } },
      update: { sgpa: Number(sgpa), cgpa: Number(cgpa), backlogs: Number(backlogs) || 0 },
      create: { branchId, studentId, semester: Number(semester), sgpa: Number(sgpa), cgpa: Number(cgpa), backlogs: Number(backlogs) || 0 }
    });
    res.status(201).json({ success: true, record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/college-records/:id/revaluation', async (req, res) => {
  try {
    const record = await prisma.collegeAcademicRecord.update({
      where: { id: req.params.id },
      data: { revaluationStatus: 'REQUESTED', revaluationSubject: req.body.revaluationSubject || 'Core Paper' }
    });
    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
