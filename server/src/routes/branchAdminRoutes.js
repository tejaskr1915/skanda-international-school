const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../db');
const {
  portalAuthMiddleware,
  requireRole,
  requireModulePermission,
  resolveBranchId,
  getCurrentAcademicYearId
} = require('../middleware/rbac');

router.use(portalAuthMiddleware);
router.use(
  requireRole(
    'SUPER_ADMIN',
    'ADMIN',
    'ACCOUNTANT',
    'ADMISSION_OFFICER',
    'EXAM_CONTROLLER',
    'LIBRARIAN',
    'TRANSPORT_MANAGER',
    'HOSTEL_WARDEN'
  )
);

/**
 * GET /api/branch-admin/kpis
 * Executive Campus KPI Dashboard scoped to assigned branchId
 */
router.get('/kpis', async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    if (!branchId) return res.status(400).json({ success: false, message: 'No branch assigned.' });

    const [
      branch,
      totalStudents,
      pendingApplications,
      attendanceRecords,
      invoices,
      pendingTeacherLeaves
    ] = await Promise.all([
      prisma.branch.findUnique({ where: { id: branchId } }),
      prisma.studentProfile.count({ where: { branchId } }),
      prisma.application.count({
        where: {
          OR: [{ branchId }, { branchId: null }],
          status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED'] }
        }
      }),
      prisma.attendanceRecord.findMany({ where: { branchId } }),
      prisma.feeInvoice.findMany({ where: { branchId } }),
      prisma.leaveRequest.count({ where: { branchId, requesterType: 'TEACHER', status: 'PENDING' } })
    ]);

    const presentCount = attendanceRecords.filter((a) => a.status === 'PRESENT').length;
    const attendancePct = attendanceRecords.length > 0 ? Math.round((presentCount / attendanceRecords.length) * 100) : 96;

    let feeCollected = 0;
    let feeDues = 0;
    for (const inv of invoices) {
      feeCollected += inv.totalPaid;
      feeDues += inv.finesDue + inv.tuitionDue + inv.transportDue;
    }

    return res.json({
      success: true,
      branch,
      kpis: {
        totalStudents,
        attendancePct,
        pendingApplications,
        feeCollected,
        feeDues,
        pendingTeacherLeaves
      }
    });
  } catch (error) {
    console.error('Branch KPIs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load KPIs.' });
  }
});

/**
 * GET /api/branch-admin/applications
 */
router.get('/applications', requireModulePermission('admissions', 'read'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const applications = await prisma.application.findMany({
      where: {
        OR: [{ branchId }, { branchId: null }],
        status: { not: 'DRAFT' }
      },
      include: {
        applicantUser: { select: { fullName: true, mobile: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, applications });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load applications.' });
  }
});

/**
 * PATCH /api/branch-admin/applications/:id/status
 */
router.patch('/applications/:id/status', requireModulePermission('admissions', 'update'), async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowed = ['UNDER_REVIEW', 'SHORTLISTED', 'ACCEPTED', 'REJECTED'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status update.' });
    }
    const branchId = await resolveBranchId(req);
    const updated = await prisma.application.update({
      where: { id: req.params.id },
      data: { status, branchId: branchId || undefined }
    });
    return res.json({ success: true, application: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update application status.' });
  }
});

/**
 * POST /api/branch-admin/applications/:id/convert
 * One-Click Convert to Student:
 * - Provisions separate Student and Parent login accounts
 * - Assigns rollNumber & section
 * - Generates initial FeeInvoice
 * - Forwards opted Hostel / Transport / Library requests
 */
router.post('/applications/:id/convert', requireModulePermission('admissions', 'create'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const academicYearId = await getCurrentAcademicYearId(branchId);
    if (!branchId || !academicYearId) {
      return res.status(400).json({ success: false, message: 'Active branch and academic year required.' });
    }

    const app = await prisma.application.findUnique({
      where: { id: req.params.id },
      include: { applicantUser: true }
    });
    if (!app) return res.status(404).json({ success: false, message: 'Application not found.' });
    if (app.convertedStudentId || app.status === 'ENROLLED') {
      return res.status(409).json({ success: false, message: 'Application is already converted to an enrolled student.' });
    }

    const studentDetails = app.studentDetails || {};
    const parentDetails = app.parentDetails || {};
    const facilities = app.facilities || {};

    const studentFullName =
      studentDetails.firstName && studentDetails.lastName
        ? `${studentDetails.firstName} ${studentDetails.lastName}`
        : studentDetails.fullName || app.applicantUser.fullName;

    const parentFullName = parentDetails.fatherName || parentDetails.motherName || parentDetails.guardianName || `Parent of ${studentFullName}`;
    const defaultPasswordHash = await bcrypt.hash('Password@123', 10);

    const uniqueSuffix = Date.now().toString().slice(-5);
    const studentEmail = `student.${app.applicationNo.toLowerCase().replace(/[^a-z0-9]/g, '')}.${uniqueSuffix}@skanda.edu.in`;
    const parentEmail =
      parentDetails.email && parentDetails.email !== app.applicantUser.email
        ? parentDetails.email.toLowerCase()
        : `parent.${app.applicationNo.toLowerCase().replace(/[^a-z0-9]/g, '')}.${uniqueSuffix}@skanda.edu.in`;

    // 1. Provision Student User + Profile
    const studentUser = await prisma.user.create({
      data: {
        branchId,
        fullName: studentFullName,
        email: studentEmail,
        mobile: app.applicantUser.mobile,
        passwordHash: defaultPasswordHash,
        role: 'STUDENT'
      }
    });

    const [studentCount, globalStudentCount] = await Promise.all([
      prisma.studentProfile.count({ where: { branchId } }),
      prisma.studentProfile.count()
    ]);
    const rollNumber = `${(app.classOrCourse || 'G1').replace(/\s+/g, '').slice(0, 4).toUpperCase()}-${String(studentCount + 1).padStart(2, '0')}`;
    const admissionNo = `SKD-ADM-${new Date().getFullYear()}-${String(globalStudentCount + 1).padStart(4, '0')}-${Date.now().toString().slice(-3)}`;

    const studentProfile = await prisma.studentProfile.create({
      data: {
        userId: studentUser.id,
        branchId,
        academicYearId,
        admissionNo,
        rollNumber,
        classOrCourse: app.classOrCourse || 'Grade 6',
        section: req.body?.section || 'A',
        institutionType: app.institutionType || 'SCHOOL',
        boardOrDept: app.specializationOrStream || app.board || 'CBSE',
        hostelOpted: !!facilities?.hostel?.opted,
        transportOpted: !!facilities?.transport?.opted,
        libraryOpted: facilities?.library !== false
      }
    });

    // 2. Provision Parent User + Profile + Link (reuse if parent email already exists)
    let parentUser = await prisma.user.findUnique({ where: { email: parentEmail } });
    if (!parentUser) {
      parentUser = await prisma.user.create({
        data: {
          branchId,
          fullName: parentFullName,
          email: parentEmail,
          mobile: parentDetails.mobile || app.applicantUser.mobile,
          passwordHash: defaultPasswordHash,
          role: 'PARENT'
        }
      });
    }

    let parentProfile = await prisma.parentProfile.findUnique({ where: { userId: parentUser.id } });
    if (!parentProfile) {
      parentProfile = await prisma.parentProfile.create({
        data: {
          userId: parentUser.id,
          branchId,
          phone: parentDetails.mobile || app.applicantUser.mobile
        }
      });
    }

    await prisma.parentStudentLink.create({
      data: { parentId: parentProfile.id, studentId: studentProfile.id, relation: 'Guardian' }
    });

    // 3. Generate Initial FeeInvoice from BranchFeeStructure
    const feeStruct = await prisma.branchFeeStructure.findFirst({
      where: { branchId, gradeOrCourse: app.classOrCourse || 'Grade 10' }
    });
    const tuitionDue = feeStruct ? feeStruct.tuitionFee : app.institutionType === 'COLLEGE' ? 145000 : 85000;
    const transportDue = facilities?.transport?.opted ? (feeStruct?.transportFee || 18000) : 0;

    const invoice = await prisma.feeInvoice.create({
      data: {
        branchId,
        academicYearId,
        studentId: studentProfile.id,
        invoiceNo: `INV-${uniqueSuffix}-${studentCount + 1}`,
        finesDue: 0,
        tuitionDue,
        transportDue,
        status: 'PENDING'
      }
    });

    // 4. Mark Application as ENROLLED
    const updatedApp = await prisma.application.update({
      where: { id: app.id },
      data: {
        status: 'ENROLLED',
        branchId,
        academicYearId,
        convertedStudentId: studentProfile.id
      }
    });

    return res.json({
      success: true,
      message: `Converted ${studentFullName} to Enrolled Student (${rollNumber})`,
      application: updatedApp,
      provisioned: {
        studentEmail,
        parentEmail,
        defaultPassword: 'Password@123',
        rollNumber,
        section: studentProfile.section,
        admissionNo,
        invoiceNo: invoice.invoiceNo,
        forwardedServices: {
          hostel: studentProfile.hostelOpted,
          transport: studentProfile.transportOpted,
          library: studentProfile.libraryOpted
        }
      }
    });
  } catch (error) {
    console.error('Convert to student error:', error);
    return res.status(500).json({ success: false, message: 'Failed to convert application to student.' });
  }
});

/**
 * GET /api/branch-admin/attendance & PUT /api/branch-admin/attendance/:id (Override)
 */
router.get('/attendance', async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const records = await prisma.attendanceRecord.findMany({
      where: { branchId },
      orderBy: { date: 'desc' },
      take: 50
    });
    const students = await prisma.studentProfile.findMany({
      where: { branchId },
      include: { user: { select: { fullName: true } } }
    });
    const studentMap = Object.fromEntries(students.map((s) => [s.id, s]));
    return res.json({
      success: true,
      records: records.map((r) => ({
        ...r,
        studentName: studentMap[r.studentId]?.user?.fullName || 'Student',
        rollNumber: studentMap[r.studentId]?.rollNumber || '-',
        classOrCourse: studentMap[r.studentId]?.classOrCourse || '-'
      }))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load attendance.' });
  }
});

router.put('/attendance/:id', async (req, res) => {
  try {
    const { status } = req.body || {};
    if (!['PRESENT', 'ABSENT', 'LATE'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid attendance status.' });
    }
    const updated = await prisma.attendanceRecord.update({
      where: { id: req.params.id },
      data: { status, syncedAt: new Date() }
    });
    return res.json({ success: true, record: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to override attendance.' });
  }
});

/**
 * GET /api/branch-admin/leaves & Auto-Substitution Recommendations & Approve
 */
router.get('/leaves', async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const leaves = await prisma.leaveRequest.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' }
    });
    const users = await prisma.user.findMany({ where: { branchId }, select: { id: true, fullName: true, role: true } });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
    return res.json({
      success: true,
      leaves: leaves.map((l) => ({
        ...l,
        requesterName: userMap[l.requesterUserId]?.fullName || 'Staff/Student'
      }))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load leave requests.' });
  }
});

router.get('/leaves/:id/substitute-recommendations', async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const leave = await prisma.leaveRequest.findUnique({ where: { id: req.params.id } });
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found.' });

    const [slots, teachers] = await Promise.all([
      prisma.timetableSlot.findMany({ where: { branchId, teacherUserId: leave.requesterUserId } }),
      prisma.user.findMany({
        where: { branchId, role: 'TEACHER', id: { not: leave.requesterUserId }, isActive: true },
        select: { id: true, fullName: true, department: true }
      })
    ]);

    return res.json({
      success: true,
      affectedSlots: slots,
      recommendedTeachers: teachers
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to compute substitution recommendations.' });
  }
});

router.post('/leaves/:id/approve', async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const academicYearId = await getCurrentAcademicYearId(branchId);
    const { status, substituteTeacherId } = req.body || {};

    const leave = await prisma.leaveRequest.update({
      where: { id: req.params.id },
      data: { status: status || 'APPROVED' }
    });

    if (leave.status === 'APPROVED' && substituteTeacherId && leave.requesterType === 'TEACHER') {
      const slots = await prisma.timetableSlot.findMany({
        where: { branchId, teacherUserId: leave.requesterUserId }
      });
      for (const slot of slots) {
        await prisma.teacherSubstitution.create({
          data: {
            branchId,
            academicYearId,
            leaveRequestId: leave.id,
            timetableSlotId: slot.id,
            originalTeacherId: leave.requesterUserId,
            substituteTeacherId,
            date: leave.fromDate
          }
        });
      }
    }

    return res.json({ success: true, leave });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to process leave request.' });
  }
});

/**
 * Exams Lock / Publish & QR Hall Tickets
 */
router.get('/exams', requireModulePermission('exams', 'read'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const exams = await prisma.exam.findMany({
      where: { branchId },
      include: { _count: { select: { marks: true, hallTickets: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, exams });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load exams.' });
  }
});

router.post('/exams/:id/publish', requireModulePermission('exams', 'update'), async (req, res) => {
  try {
    const exam = await prisma.exam.update({
      where: { id: req.params.id },
      data: { isLocked: true, isPublished: true }
    });
    return res.json({ success: true, exam });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to lock and publish exam results.' });
  }
});

router.post('/exams/:id/hall-tickets', requireModulePermission('exams', 'create'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const exam = await prisma.exam.findUnique({ where: { id: req.params.id } });
    if (!exam) return res.status(404).json({ success: false, message: 'Exam not found.' });

    const students = await prisma.studentProfile.findMany({ where: { branchId, classOrCourse: exam.classOrCourse } });
    const issued = [];
    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      const existing = await prisma.hallTicket.findFirst({ where: { examId: exam.id, studentId: s.id } });
      if (!existing) {
        const token = crypto.createHash('sha256').update(`${exam.id}:${s.id}:${Date.now()}`).digest('hex').slice(0, 20).toUpperCase();
        const ht = await prisma.hallTicket.create({
          data: {
            examId: exam.id,
            branchId,
            studentId: s.id,
            qrToken: `SKD-QR-${token}`,
            seatNumber: `HALL-${s.section}-${i + 10}`
          }
        });
        issued.push(ht);
      }
    }
    return res.json({ success: true, issuedCount: issued.length });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to generate QR Hall Tickets.' });
  }
});

/**
 * Fees & Priority Allocation (fines -> tuition -> transport) & Scholarships
 */
router.get('/fees', requireModulePermission('fees', 'read'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const [invoices, students] = await Promise.all([
      prisma.feeInvoice.findMany({ where: { branchId }, include: { transactions: true }, orderBy: { createdAt: 'desc' } }),
      prisma.studentProfile.findMany({ where: { branchId }, include: { user: { select: { fullName: true } } } })
    ]);
    const studentMap = Object.fromEntries(students.map((s) => [s.id, s]));
    return res.json({
      success: true,
      invoices: invoices.map((inv) => ({
        ...inv,
        studentName: studentMap[inv.studentId]?.user?.fullName || 'Student',
        rollNumber: studentMap[inv.studentId]?.rollNumber || '-',
        classOrCourse: studentMap[inv.studentId]?.classOrCourse || '-'
      }))
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load fee invoices.' });
  }
});

router.post('/fees/:invoiceId/scholarship', requireModulePermission('fees', 'update'), async (req, res) => {
  try {
    const amount = Number(req.body?.scholarshipDiscount) || 0;
    const inv = await prisma.feeInvoice.findUnique({ where: { id: req.params.invoiceId } });
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    const newTuition = Math.max(0, inv.tuitionDue - amount);
    const updated = await prisma.feeInvoice.update({
      where: { id: inv.id },
      data: {
        tuitionDue: newTuition,
        scholarshipDiscount: inv.scholarshipDiscount + amount
      }
    });
    return res.json({ success: true, invoice: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to apply scholarship.' });
  }
});

router.post('/fees/:invoiceId/pay', requireModulePermission('fees', 'update'), async (req, res) => {
  try {
    const payAmount = Number(req.body?.amount) || 0;
    if (payAmount <= 0) return res.status(400).json({ success: false, message: 'Payment amount must be greater than 0.' });

    const inv = await prisma.feeInvoice.findUnique({ where: { id: req.params.invoiceId } });
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    // Strict Priority Allocation: 1. Fines -> 2. Tuition -> 3. Transport
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
        paymentMethod: req.body?.paymentMethod || 'ONLINE_UPI',
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
    return res.status(500).json({ success: false, message: 'Failed to record payment.' });
  }
});

/**
 * Branch CMS Announcements & Banners
 */
router.get('/cms', async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const contents = await prisma.cmsContent.findMany({ where: { branchId }, orderBy: { updatedAt: 'desc' } });
    return res.json({ success: true, contents });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load CMS contents.' });
  }
});

router.post('/cms', async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { title, body, category } = req.body || {};
    if (!title || !body) return res.status(400).json({ success: false, message: 'Title and body are required.' });
    const item = await prisma.cmsContent.create({
      data: { branchId, title: title.trim(), body: body.trim(), category: category || 'ANNOUNCEMENT' }
    });
    return res.status(201).json({ success: true, item });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to publish CMS banner.' });
  }
});

module.exports = router;
