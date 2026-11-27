const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { portalAuthMiddleware, requireRole } = require('../middleware/rbac');

router.use(portalAuthMiddleware);

async function evaluateNoDues(studentId) {
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: { user: { select: { fullName: true, email: true } }, branch: true }
  });
  if (!student) return null;

  // 1. Accounts: zero pending fee balance
  const invoices = await prisma.feeInvoice.findMany({ where: { studentId: student.id } });
  let pendingFeeBalance = 0;
  let pendingLibraryFines = 0;
  for (const inv of invoices) {
    const netDue = Math.max(0, inv.finesDue + inv.tuitionDue + inv.transportDue - inv.scholarshipDiscount - inv.totalPaid);
    pendingFeeBalance += netDue;
    if (inv.status !== 'PAID' && inv.finesDue > 0) {
      pendingLibraryFines += inv.finesDue;
    }
  }
  const accountsCleared = pendingFeeBalance <= 0;

  // 2. Library: zero unreturned books & zero fines
  const unreturnedBooks = await prisma.bookIssue.count({
    where: { userId: student.userId, status: { not: 'RETURNED' } }
  });
  const libraryCleared = unreturnedBooks === 0 && pendingLibraryFines === 0;

  // 3. Hostel: room/bed vacated & zero maintenance dues
  const occupiedBeds = await prisma.hostelBedAllocation.count({
    where: { studentId: student.id, status: 'OCCUPIED' }
  });
  const allocsWithDues = await prisma.hostelBedAllocation.findMany({
    where: { studentId: student.id, maintenanceDue: { gt: 0 } }
  });
  const maintenanceDueTotal = allocsWithDues.reduce((sum, a) => sum + a.maintenanceDue, 0);
  const hostelCleared = occupiedBeds === 0 && maintenanceDueTotal === 0;

  // 4. Labs: labDuesCleared flag
  const labsCleared = Boolean(student.labDuesCleared);

  const blockedReasons = [];
  if (!accountsCleared) blockedReasons.push(`Accounts: Pending fee balance of ₹${pendingFeeBalance}`);
  if (!libraryCleared) blockedReasons.push(`Library: ${unreturnedBooks} unreturned book(s), ₹${pendingLibraryFines} fine(s)`);
  if (!hostelCleared) blockedReasons.push(`Hostel: ${occupiedBeds} active bed(s), ₹${maintenanceDueTotal} maintenance due`);
  if (!labsCleared) blockedReasons.push('Labs: Pending laboratory equipment/breakage clearance');

  return {
    student,
    departments: {
      accounts: { cleared: accountsCleared, pendingBalance: pendingFeeBalance },
      library: { cleared: libraryCleared, unreturnedBooks, pendingFines: pendingLibraryFines },
      hostel: { cleared: hostelCleared, occupiedBeds, maintenanceDue: maintenanceDueTotal },
      labs: { cleared: labsCleared }
    },
    allCleared: accountsCleared && libraryCleared && hostelCleared && labsCleared,
    blockedReasons
  };
}

// GET /api/no-dues/:studentId
router.get('/:studentId', async (req, res) => {
  try {
    let targetStudentId = req.params.studentId;
    if (targetStudentId === 'me' && req.portalUser.role === 'STUDENT') {
      const sp = await prisma.studentProfile.findUnique({ where: { userId: req.portalUser.id } });
      targetStudentId = sp?.id;
    }
    const result = await evaluateNoDues(targetStudentId);
    if (!result) return res.status(404).json({ success: false, message: 'Student profile not found.' });

    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Toggle Lab Clearance (Admin / Super Admin / Teacher)
router.post('/:studentId/labs', requireRole('SUPER_ADMIN', 'ADMIN', 'TEACHER'), async (req, res) => {
  try {
    const cleared = Boolean(req.body.cleared);
    const updated = await prisma.studentProfile.update({
      where: { id: req.params.studentId },
      data: { labDuesCleared: cleared }
    });
    res.json({ success: true, labDuesCleared: updated.labDuesCleared });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Generate Transfer Certificate (Blocked unless all 4 departments clear)
router.post('/:studentId/generate-tc', requireRole('SUPER_ADMIN', 'ADMIN', 'ADMISSION_OFFICER'), async (req, res) => {
  try {
    const result = await evaluateNoDues(req.params.studentId);
    if (!result) return res.status(404).json({ success: false, message: 'Student profile not found.' });

    if (!result.allCleared) {
      return res.status(403).json({
        success: false,
        message: 'Transfer Certificate blocked: Pending No-Dues clearance across one or more departments.',
        blockedReasons: result.blockedReasons,
        departments: result.departments
      });
    }

    res.json({
      success: true,
      tcNumber: `SKD-TC-${new Date().getFullYear()}-${result.student.admissionNo}`,
      issuedAt: new Date().toISOString(),
      studentName: result.student.user?.fullName
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
