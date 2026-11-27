const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { portalAuthMiddleware, requireRole, resolveBranchId, getCurrentAcademicYearId } = require('../middleware/rbac');

router.use(portalAuthMiddleware);

const COORD_ROLES = ['SUPER_ADMIN', 'ADMIN', 'ACTIVITY_COORDINATOR'];

router.get('/', async (req, res) => {
  try {
    const branchId = req.portalUser.branchId || (await resolveBranchId(req));
    const activities = await prisma.activity.findMany({
      where: { branchId },
      include: {
        enrollments: { where: { status: { not: 'WITHDRAWN' } } }
      },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, activities });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', requireRole(...COORD_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { name, category, venue, scheduleSlot, eligibleGrades, seatLimit, feeAmount, withdrawalCutoffDate } = req.body;
    if (!name || !venue || !scheduleSlot) {
      return res.status(400).json({ success: false, message: 'name, venue, and scheduleSlot are required.' });
    }

    // Venue & timetable clash detection
    const clash = await prisma.activity.findFirst({
      where: { branchId, venue: venue.trim(), scheduleSlot: scheduleSlot.trim() }
    });
    if (clash) {
      return res.status(409).json({
        success: false,
        message: `Venue/Timetable Clash: "${clash.name}" already occupies ${venue} at ${scheduleSlot}.`
      });
    }

    const activity = await prisma.activity.create({
      data: {
        branchId,
        name: name.trim(),
        category: (category || 'SPORTS').trim().toUpperCase(),
        venue: venue.trim(),
        scheduleSlot: scheduleSlot.trim(),
        eligibleGrades: eligibleGrades || 'ALL',
        seatLimit: Number(seatLimit) || 25,
        feeAmount: Number(feeAmount) || 0,
        withdrawalCutoffDate: withdrawalCutoffDate ? new Date(withdrawalCutoffDate) : new Date(Date.now() + 30 * 86400000)
      }
    });
    res.status(201).json({ success: true, activity });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:id/enroll', async (req, res) => {
  try {
    const user = req.portalUser;
    const activity = await prisma.activity.findUnique({
      where: { id: req.params.id },
      include: { enrollments: { where: { status: { not: 'WITHDRAWN' } } } }
    });
    if (!activity) return res.status(404).json({ success: false, message: 'Activity not found.' });

    let studentId = req.body.studentId;
    if (user.role === 'STUDENT') {
      const sp = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
      studentId = sp?.id;
    } else if (user.role === 'PARENT' && !studentId) {
      const pp = await prisma.parentProfile.findUnique({ where: { userId: user.id }, include: { children: true } });
      studentId = pp?.children[0]?.studentId;
    }
    if (!studentId) return res.status(400).json({ success: false, message: 'Target studentId is required.' });

    const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    // Eligibility check
    if (activity.eligibleGrades !== 'ALL') {
      const allowed = activity.eligibleGrades.split(',').map((g) => g.trim().toLowerCase());
      if (!allowed.includes(student.classOrCourse.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: `Eligibility failed: ${student.classOrCourse} is not in [${activity.eligibleGrades}].`
        });
      }
    }

    // Seat limit check
    if (activity.enrollments.length >= activity.seatLimit) {
      return res.status(400).json({ success: false, message: 'Activity seat limit reached.' });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const isParentDirect = user.role === 'PARENT';
    const enrollment = await prisma.activityEnrollment.create({
      data: {
        branchId: activity.branchId,
        activityId: activity.id,
        studentId: student.id,
        status: isParentDirect ? 'ENROLLED' : 'PENDING_CONSENT',
        parentConsentOtp: otp,
        parentConsentedAt: isParentDirect ? new Date() : null
      }
    });

    res.status(201).json({ success: true, enrollment, devConsentOtp: otp });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, message: 'Student already enrolled in this activity.' });
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/enrollments/:id/consent', async (req, res) => {
  try {
    const enrollment = await prisma.activityEnrollment.findUnique({
      where: { id: req.params.id },
      include: { activity: true }
    });
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found.' });
    if (req.body.otpCode && enrollment.parentConsentOtp !== String(req.body.otpCode).trim()) {
      return res.status(400).json({ success: false, message: 'Invalid Parent Consent OTP.' });
    }

    // Post activity fee to FeeInvoice
    if (!enrollment.feeSynced && enrollment.activity.feeAmount > 0) {
      const inv = await prisma.feeInvoice.findFirst({ where: { studentId: enrollment.studentId }, orderBy: { createdAt: 'desc' } });
      if (inv) {
        await prisma.feeInvoice.update({
          where: { id: inv.id },
          data: { tuitionDue: inv.tuitionDue + enrollment.activity.feeAmount, status: inv.status === 'PAID' ? 'PARTIAL' : inv.status }
        });
      } else {
        const ayId = await getCurrentAcademicYearId(enrollment.branchId);
        await prisma.feeInvoice.create({
          data: {
            branchId: enrollment.branchId,
            academicYearId: ayId,
            studentId: enrollment.studentId,
            invoiceNo: `INV-ACT-${Date.now().toString().slice(-6)}`,
            tuitionDue: enrollment.activity.feeAmount,
            status: 'PENDING'
          }
        });
      }
    }

    const updated = await prisma.activityEnrollment.update({
      where: { id: enrollment.id },
      data: { status: 'ENROLLED', parentConsentedAt: new Date(), feeSynced: true }
    });
    res.json({ success: true, enrollment: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/enrollments/:id/withdraw', async (req, res) => {
  try {
    const enrollment = await prisma.activityEnrollment.findUnique({
      where: { id: req.params.id },
      include: { activity: true }
    });
    if (!enrollment) return res.status(404).json({ success: false, message: 'Enrollment not found.' });
    if (new Date() > new Date(enrollment.activity.withdrawalCutoffDate)) {
      return res.status(400).json({ success: false, message: 'Withdrawal cut-off date has passed.' });
    }
    const updated = await prisma.activityEnrollment.update({
      where: { id: enrollment.id },
      data: { status: 'WITHDRAWN' }
    });
    res.json({ success: true, enrollment: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
