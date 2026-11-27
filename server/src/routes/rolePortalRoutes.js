const express = require('express');
const router = express.Router();
const prisma = require('../db');
const {
  portalAuthMiddleware,
  requireRole,
  getCurrentAcademicYearId
} = require('../middleware/rbac');

router.use(portalAuthMiddleware);

/**
 * Helper to resolve StudentProfile for STUDENT or PARENT (via ?studentId=...)
 */
async function resolveTargetStudent(req) {
  const user = req.portalUser;
  if (user.role === 'STUDENT') {
    return prisma.studentProfile.findUnique({
      where: { userId: user.id },
      include: { user: { select: { fullName: true, email: true } }, branch: true }
    });
  }
  if (user.role === 'PARENT') {
    const parentProfile = await prisma.parentProfile.findUnique({
      where: { userId: user.id },
      include: {
        children: {
          include: {
            student: {
              include: { user: { select: { fullName: true, email: true } }, branch: true }
            }
          }
        }
      }
    });
    if (!parentProfile || parentProfile.children.length === 0) return null;
    const requestedStudentId = req.query.studentId || req.body?.studentId;
    const matched = requestedStudentId
      ? parentProfile.children.find((c) => c.studentId === requestedStudentId)
      : parentProfile.children[0];
    return matched ? matched.student : parentProfile.children[0].student;
  }
  return null;
}

/**
 * GET /api/portal/student-view
 * Unified Student & Parent Dashboard Data (supports multi-child ?studentId=...)
 */
router.get('/student-view', requireRole('STUDENT', 'PARENT'), async (req, res) => {
  try {
    const student = await resolveTargetStudent(req);
    if (!student) {
      return res.status(404).json({ success: false, message: 'No student profile linked to this account.' });
    }

    const [attendance, timetable, assignments, submissions, examMarks, hallTickets, invoices, cms, leaves] =
      await Promise.all([
        prisma.attendanceRecord.findMany({ where: { branchId: student.branchId, studentId: student.id }, orderBy: { date: 'desc' } }),
        prisma.timetableSlot.findMany({ where: { branchId: student.branchId, classOrCourse: student.classOrCourse }, orderBy: { periodNo: 'asc' } }),
        prisma.assignment.findMany({ where: { branchId: student.branchId, classOrCourse: student.classOrCourse }, orderBy: { createdAt: 'desc' } }),
        prisma.assignmentSubmission.findMany({ where: { branchId: student.branchId, studentId: student.id } }),
        prisma.examMark.findMany({
          where: { branchId: student.branchId, studentId: student.id },
          include: { exam: true }
        }),
        prisma.hallTicket.findMany({
          where: { branchId: student.branchId, studentId: student.id },
          include: { exam: true }
        }),
        prisma.feeInvoice.findMany({
          where: { branchId: student.branchId, studentId: student.id },
          include: { transactions: true }
        }),
        prisma.cmsContent.findMany({ where: { branchId: student.branchId, isActive: true }, orderBy: { updatedAt: 'desc' } }),
        prisma.leaveRequest.findMany({ where: { branchId: student.branchId, requesterUserId: student.userId }, orderBy: { createdAt: 'desc' } })
      ]);

    const totalClasses = attendance.length;
    const presentCount = attendance.filter((a) => a.status === 'PRESENT').length;
    const attendancePct = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 100;
    const isShortageAlert = student.institutionType === 'COLLEGE' && attendancePct < 75;

    const submissionMap = Object.fromEntries(submissions.map((s) => [s.assignmentId, s]));

    return res.json({
      success: true,
      student: {
        id: student.id,
        fullName: student.user.fullName,
        admissionNo: student.admissionNo,
        rollNumber: student.rollNumber,
        classOrCourse: student.classOrCourse,
        section: student.section,
        institutionType: student.institutionType,
        boardOrDept: student.boardOrDept,
        branch: student.branch
      },
      attendance: {
        records: attendance,
        totalClasses,
        presentCount,
        attendancePct,
        isShortageAlert
      },
      timetable,
      assignments: assignments.map((a) => ({
        ...a,
        submission: submissionMap[a.id] || null
      })),
      examMarks: examMarks.filter((m) => m.exam?.isPublished),
      hallTickets,
      invoices,
      cms,
      leaves
    });
  } catch (error) {
    console.error('Student view error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load student dashboard.' });
  }
});

/**
 * POST /api/portal/assignments/:id/submit
 */
router.post('/assignments/:id/submit', requireRole('STUDENT'), async (req, res) => {
  try {
    const student = await resolveTargetStudent(req);
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });
    const { content } = req.body || {};
    if (!content || !content.trim()) return res.status(400).json({ success: false, message: 'Submission content is required.' });

    const submission = await prisma.assignmentSubmission.create({
      data: {
        assignmentId: req.params.id,
        studentId: student.id,
        branchId: student.branchId,
        content: content.trim()
      }
    });
    return res.status(201).json({ success: true, submission });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to submit assignment.' });
  }
});

/**
 * POST /api/portal/fees/:invoiceId/pay
 * Priority allocation for Student/Parent online payment: fines -> tuition -> transport
 */
router.post('/fees/:invoiceId/pay', requireRole('STUDENT', 'PARENT'), async (req, res) => {
  try {
    const payAmount = Number(req.body?.amount) || 0;
    if (payAmount <= 0) return res.status(400).json({ success: false, message: 'Payment amount must be > 0.' });

    const inv = await prisma.feeInvoice.findUnique({ where: { id: req.params.invoiceId } });
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    let remaining = payAmount;
    const allocatedToFines = Math.min(remaining, inv.finesDue);
    remaining -= allocatedToFines;
    const allocatedToTuition = Math.min(remaining, inv.tuitionDue);
    remaining -= allocatedToTuition;
    const allocatedToTransport = Math.min(remaining, inv.transportDue);
    remaining -= allocatedToTransport;

    const newFines = inv.finesDue - allocatedToFines;
    const newTuition = inv.tuitionDue - allocatedToTuition;
    const newTransport = inv.transportDue - allocatedToTransport;
    const newStatus = newFines + newTuition + newTransport === 0 ? 'PAID' : 'PARTIAL';

    const tx = await prisma.feeTransaction.create({
      data: {
        invoiceId: inv.id,
        branchId: inv.branchId,
        amount: payAmount,
        allocatedToFines,
        allocatedToTuition,
        allocatedToTransport,
        paymentMethod: 'ONLINE_UPI',
        receiptNo: `RCP-${Date.now().toString().slice(-6)}`
      }
    });

    const updated = await prisma.feeInvoice.update({
      where: { id: inv.id },
      data: {
        finesDue: newFines,
        tuitionDue: newTuition,
        transportDue: newTransport,
        totalPaid: inv.totalPaid + payAmount,
        status: newStatus
      }
    });

    return res.json({ success: true, invoice: updated, transaction: tx });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to process fee payment.' });
  }
});

/**
 * POST /api/portal/leaves
 * Submit LeaveRequest (STUDENT or TEACHER)
 */
router.post('/leaves', requireRole('STUDENT', 'PARENT', 'TEACHER'), async (req, res) => {
  try {
    const user = req.portalUser;
    const branchId = user.branchId;
    const academicYearId = await getCurrentAcademicYearId(branchId);
    const { fromDate, toDate, reason } = req.body || {};
    if (!fromDate || !toDate || !reason) {
      return res.status(400).json({ success: false, message: 'fromDate, toDate, and reason are required.' });
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        branchId,
        academicYearId,
        requesterUserId: user.id,
        requesterType: user.role === 'TEACHER' ? 'TEACHER' : 'STUDENT',
        fromDate,
        toDate,
        reason: reason.trim()
      }
    });
    return res.status(201).json({ success: true, leave });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to submit leave request.' });
  }
});

/**
 * GET /api/portal/teacher-view
 */
router.get('/teacher-view', requireRole('TEACHER'), async (req, res) => {
  try {
    const user = req.portalUser;
    const branchId = user.branchId;

    const [students, timetable, assignments, exams, leaves] = await Promise.all([
      prisma.studentProfile.findMany({
        where: { branchId },
        include: { user: { select: { fullName: true } } },
        orderBy: { rollNumber: 'asc' }
      }),
      prisma.timetableSlot.findMany({ where: { branchId, teacherUserId: user.id }, orderBy: { periodNo: 'asc' } }),
      prisma.assignment.findMany({
        where: { branchId, teacherUserId: user.id },
        include: { submissions: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.exam.findMany({ where: { branchId }, orderBy: { createdAt: 'desc' } }),
      prisma.leaveRequest.findMany({ where: { branchId, requesterUserId: user.id }, orderBy: { createdAt: 'desc' } })
    ]);

    return res.json({
      success: true,
      teacher: { id: user.id, fullName: user.fullName, department: user.department, branch: user.branch },
      students: students.map((s) => ({
        id: s.id,
        fullName: s.user.fullName,
        rollNumber: s.rollNumber,
        classOrCourse: s.classOrCourse,
        section: s.section
      })),
      timetable,
      assignments,
      exams,
      leaves
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load teacher dashboard.' });
  }
});

/**
 * POST /api/portal/teacher/attendance/sync
 * Offline-cached Attendance batch sync
 */
router.post('/teacher/attendance/sync', requireRole('TEACHER'), async (req, res) => {
  try {
    const user = req.portalUser;
    const branchId = user.branchId;
    const academicYearId = await getCurrentAcademicYearId(branchId);
    const { entries } = req.body || {};
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ success: false, message: 'Attendance entries array is required.' });
    }

    const synced = [];
    for (const entry of entries) {
      const rec = await prisma.attendanceRecord.create({
        data: {
          branchId,
          academicYearId,
          studentId: entry.studentId,
          date: entry.date || new Date().toISOString().split('T')[0],
          status: ['PRESENT', 'ABSENT', 'LATE'].includes(entry.status) ? entry.status : 'PRESENT',
          markedByUserId: user.id,
          offlineCapturedAt: entry.offlineCapturedAt ? new Date(entry.offlineCapturedAt) : new Date(),
          syncedAt: new Date()
        }
      });
      synced.push(rec);
    }

    return res.json({ success: true, syncedCount: synced.length, records: synced });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to sync attendance records.' });
  }
});

/**
 * POST /api/portal/teacher/assignments
 */
router.post('/teacher/assignments', requireRole('TEACHER'), async (req, res) => {
  try {
    const user = req.portalUser;
    const branchId = user.branchId;
    const academicYearId = await getCurrentAcademicYearId(branchId);
    const { classOrCourse, subject, title, description, dueDate } = req.body || {};
    if (!classOrCourse || !subject || !title) {
      return res.status(400).json({ success: false, message: 'classOrCourse, subject, and title are required.' });
    }
    const assignment = await prisma.assignment.create({
      data: {
        branchId,
        academicYearId,
        classOrCourse,
        subject,
        title: title.trim(),
        description: description || '',
        dueDate: dueDate || '2026-12-10',
        teacherUserId: user.id
      }
    });
    return res.status(201).json({ success: true, assignment });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to post assignment.' });
  }
});

/**
 * POST /api/portal/teacher/submissions/:id/grade
 */
router.post('/teacher/submissions/:id/grade', requireRole('TEACHER'), async (req, res) => {
  try {
    const { marks, feedback } = req.body || {};
    const updated = await prisma.assignmentSubmission.update({
      where: { id: req.params.id },
      data: { marks: Number(marks) || 0, feedback: feedback || '' }
    });
    return res.json({ success: true, submission: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to grade submission.' });
  }
});

/**
 * POST /api/portal/teacher/marks
 */
router.post('/teacher/marks', requireRole('TEACHER'), async (req, res) => {
  try {
    const branchId = req.portalUser.branchId;
    const { examId, studentId, subject, marksObtained, maxMarks } = req.body || {};
    if (!examId || !studentId || !subject || marksObtained === undefined) {
      return res.status(400).json({ success: false, message: 'examId, studentId, subject, and marksObtained are required.' });
    }
    const score = Number(marksObtained);
    const grade = score >= 90 ? 'A1' : score >= 80 ? 'A2' : score >= 70 ? 'B1' : score >= 60 ? 'B2' : score >= 40 ? 'C' : 'F';
    const mark = await prisma.examMark.create({
      data: {
        examId,
        branchId,
        studentId,
        subject,
        marksObtained: score,
        maxMarks: Number(maxMarks) || 100,
        grade
      }
    });
    return res.status(201).json({ success: true, mark });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to enter exam marks.' });
  }
});

module.exports = router;
