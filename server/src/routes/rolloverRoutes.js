const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { portalAuthMiddleware, requireRole, resolveBranchId } = require('../middleware/rbac');

router.use(portalAuthMiddleware);

function nextClassMapping(currentClass) {
  const m = String(currentClass).match(/^Grade\s+(\d+)$/i);
  if (m) {
    const n = Number(m[1]);
    if (n >= 12) return { nextClass: 'Passed Out / Alumni', status: 'PASSED_OUT_ALUMNI' };
    return { nextClass: `Grade ${n + 1}`, status: 'PROMOTED' };
  }
  if (/Nursery/i.test(currentClass)) return { nextClass: 'LKG', status: 'PROMOTED' };
  if (/LKG/i.test(currentClass)) return { nextClass: 'UKG', status: 'PROMOTED' };
  if (/UKG/i.test(currentClass)) return { nextClass: 'Grade 1', status: 'PROMOTED' };
  return { nextClass: currentClass, status: 'PROMOTED' };
}

router.get('/years', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const years = await prisma.academicYear.findMany({ where: { branchId }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, years });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/preview', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { fromYearId } = req.body;
    const students = await prisma.studentProfile.findMany({
      where: { branchId, ...(fromYearId ? { academicYearId: fromYearId } : {}) },
      include: { user: { select: { fullName: true, email: true } } }
    });

    const previews = await Promise.all(
      students.map(async (s) => {
        const invoices = await prisma.feeInvoice.findMany({ where: { studentId: s.id } });
        const unpaidFees = invoices.reduce(
          (sum, inv) => sum + Math.max(0, inv.finesDue + inv.tuitionDue + inv.transportDue - inv.scholarshipDiscount - inv.totalPaid),
          0
        );
        const openBooks = await prisma.bookIssue.count({ where: { userId: s.userId, status: { not: 'RETURNED' } } });
        const mapping = nextClassMapping(s.classOrCourse);
        return {
          studentId: s.id,
          fullName: s.user?.fullName,
          admissionNo: s.admissionNo,
          currentClass: s.classOrCourse,
          suggestedNextClass: mapping.nextClass,
          suggestedAction: mapping.status,
          unpaidFees,
          openBooks
        };
      })
    );

    res.json({ success: true, previews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/execute', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { fromYearId, toYearName, exceptions = {} } = req.body;
    if (!fromYearId || !toYearName) {
      return res.status(400).json({ success: false, message: 'fromYearId and toYearName are required.' });
    }

    const fromYear = await prisma.academicYear.findFirst({ where: { id: fromYearId, branchId } });
    if (!fromYear) return res.status(404).json({ success: false, message: 'Source academic year not found.' });
    if (fromYear.isLocked) return res.status(400).json({ success: false, message: 'Source academic year is already locked.' });

    // Create or find target academic year and set as current
    let toYear = await prisma.academicYear.findFirst({ where: { branchId, name: toYearName.trim() } });
    if (!toYear) {
      toYear = await prisma.academicYear.create({ data: { branchId, name: toYearName.trim(), isCurrent: true, isLocked: false } });
    } else {
      toYear = await prisma.academicYear.update({ where: { id: toYear.id }, data: { isCurrent: true } });
    }

    // Lock closed academic year as read-only
    await prisma.academicYear.update({ where: { id: fromYear.id }, data: { isCurrent: false, isLocked: true } });

    const students = await prisma.studentProfile.findMany({
      where: { branchId, academicYearId: fromYear.id },
      include: { user: true }
    });

    let promotedCount = 0;
    let alumniCount = 0;
    let heldBackCount = 0;

    for (const s of students) {
      const ex = exceptions[s.id];
      const mapping = nextClassMapping(s.classOrCourse);
      const action = ex || mapping.status;

      if (action === 'HELD_BACK' || action === 'TRANSFERRED') {
        await prisma.studentProfile.update({
          where: { id: s.id },
          data: { academicYearId: toYear.id, promotionStatus: action }
        });
        heldBackCount++;
      } else if (action === 'PASSED_OUT_ALUMNI') {
        await prisma.studentProfile.update({
          where: { id: s.id },
          data: { promotionStatus: 'PASSED_OUT_ALUMNI' }
        });
        await prisma.alumniProfile.upsert({
          where: { email: s.user.email },
          update: {},
          create: {
            branchId,
            fullName: s.user.fullName,
            email: s.user.email,
            graduationYear: new Date().getFullYear(),
            department: s.boardOrDept || s.classOrCourse,
            company: 'Skanda Alumni Network',
            roleTitle: 'Graduate',
            status: 'VERIFIED'
          }
        });
        alumniCount++;
      } else {
        await prisma.studentProfile.update({
          where: { id: s.id },
          data: { academicYearId: toYear.id, classOrCourse: mapping.nextClass, promotionStatus: 'PROMOTED' }
        });
        promotedCount++;
      }
    }

    res.json({
      success: true,
      lockedYear: fromYear.name,
      activeYear: toYear.name,
      summary: { total: students.length, promotedCount, alumniCount, heldBackCount }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
