const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { portalAuthMiddleware, requireRole, resolveBranchId, getCurrentAcademicYearId } = require('../middleware/rbac');

router.use(portalAuthMiddleware);

const LAB_ROLES = ['SUPER_ADMIN', 'ADMIN', 'LAB_ASSISTANT', 'TEACHER'];

async function syncLabFineToInvoice(branchId, studentId, fineDelta) {
  if (!fineDelta || fineDelta <= 0) return null;
  let inv = await prisma.feeInvoice.findFirst({ where: { branchId, studentId }, orderBy: { createdAt: 'desc' } });
  if (!inv) {
    const academicYearId = await getCurrentAcademicYearId(branchId);
    return prisma.feeInvoice.create({
      data: { branchId, academicYearId, studentId, invoiceNo: `INV-LAB-${Date.now().toString().slice(-6)}`, finesDue: fineDelta, tuitionDue: 0, transportDue: 0, status: 'PENDING' }
    });
  }
  return prisma.feeInvoice.update({
    where: { id: inv.id },
    data: { finesDue: inv.finesDue + fineDelta, status: inv.status === 'PAID' ? 'PARTIAL' : inv.status }
  });
}

router.get('/', async (req, res) => {
  try {
    const branchId = req.portalUser.branchId || (await resolveBranchId(req));
    const labs = await prisma.lab.findMany({
      where: { branchId },
      include: {
        batches: true,
        experiments: true,
        equipment: true
      },
      orderBy: { name: 'asc' }
    });

    const now = Date.now();
    const enriched = labs.map((lab) => ({
      ...lab,
      equipment: lab.equipment.map((eq) => ({
        ...eq,
        lowStockAlert: eq.quantity <= eq.minStockLevel,
        expiryAlert: eq.expiryDate ? new Date(eq.expiryDate).getTime() - now <= 30 * 86400000 : false
      }))
    }));
    res.json({ success: true, labs: enriched });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/', requireRole(...LAB_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { name, labType, roomNo, capacity } = req.body;
    if (!name || !labType || !roomNo) return res.status(400).json({ success: false, message: 'name, labType, and roomNo are required.' });
    const lab = await prisma.lab.create({
      data: { branchId, name: name.trim(), labType: labType.trim().toUpperCase(), roomNo: roomNo.trim(), capacity: Number(capacity) || 30 }
    });
    res.status(201).json({ success: true, lab });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/:labId/equipment', requireRole(...LAB_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { name, category, quantity, minStockLevel, expiryDate, calibrationStatus } = req.body;
    if (!name || !category) return res.status(400).json({ success: false, message: 'name and category are required.' });
    const qrTag = req.body.qrTag || `LAB-EQ-${Date.now().toString().slice(-6)}`;
    const item = await prisma.labEquipmentItem.create({
      data: {
        branchId,
        labId: req.params.labId,
        name: name.trim(),
        qrTag,
        category: category.trim().toUpperCase(),
        quantity: Number(quantity) || 1,
        minStockLevel: Number(minStockLevel) || 5,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        calibrationStatus: calibrationStatus || 'OK'
      }
    });
    res.status(201).json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/equipment/:id', requireRole(...LAB_ROLES), async (req, res) => {
  try {
    const item = await prisma.labEquipmentItem.update({
      where: { id: req.params.id },
      data: {
        calibrationStatus: req.body.calibrationStatus,
        maintenanceNotes: req.body.maintenanceNotes,
        quantity: req.body.quantity !== undefined ? Number(req.body.quantity) : undefined
      }
    });
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/equipment/:id/issue', requireRole(...LAB_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { emailOrAdmission, studentId, quantity } = req.body;
    const item = await prisma.labEquipmentItem.findFirst({ where: { id: req.params.id, branchId } });
    if (!item || item.quantity < (Number(quantity) || 1)) {
      return res.status(400).json({ success: false, message: 'Insufficient lab equipment stock.' });
    }
    const student = studentId
      ? await prisma.studentProfile.findFirst({ where: { id: studentId, branchId } })
      : await prisma.studentProfile.findFirst({
          where: { branchId, OR: [{ admissionNo: String(emailOrAdmission).trim() }, { user: { email: String(emailOrAdmission).trim() } }] }
        });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const qty = Number(quantity) || 1;
    const [issue] = await prisma.$transaction([
      prisma.labEquipmentIssue.create({ data: { branchId, itemId: item.id, studentId: student.id, quantity: qty } }),
      prisma.labEquipmentItem.update({ where: { id: item.id }, data: { quantity: { decrement: qty } } })
    ]);
    res.status(201).json({ success: true, issue });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/equipment-issues/:issueId/return', requireRole(...LAB_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const issue = await prisma.labEquipmentIssue.findFirst({ where: { id: req.params.issueId, branchId } });
    if (!issue || issue.status !== 'ISSUED') return res.status(404).json({ success: false, message: 'Active issue not found.' });

    const damaged = Boolean(req.body.damaged);
    const damageFine = damaged ? Number(req.body.damageFine) || 500 : 0;

    const updated = await prisma.labEquipmentIssue.update({
      where: { id: issue.id },
      data: { status: damaged ? 'DAMAGED' : 'RETURNED', damageFine, returnedAt: new Date() }
    });
    if (!damaged) {
      await prisma.labEquipmentItem.update({ where: { id: issue.itemId }, data: { quantity: { increment: issue.quantity } } });
    }
    let syncedInvoice = null;
    if (damageFine > 0) {
      syncedInvoice = await syncLabFineToInvoice(branchId, issue.studentId, damageFine);
    }
    res.json({ success: true, issue: updated, damageFine, syncedInvoice });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/journals', async (req, res) => {
  try {
    const branchId = req.portalUser.branchId || (await resolveBranchId(req));
    let where = { branchId };
    if (req.portalUser.role === 'STUDENT') {
      const sp = await prisma.studentProfile.findUnique({ where: { userId: req.portalUser.id } });
      where = { studentId: sp?.id };
    }
    const journals = await prisma.labJournal.findMany({
      where,
      include: { experiment: { include: { lab: true } } },
      orderBy: { id: 'desc' }
    });
    res.json({ success: true, journals });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/journals', async (req, res) => {
  try {
    const { experimentId, submissionNotes, studentId: reqStudentId } = req.body;
    if (!experimentId || !submissionNotes) return res.status(400).json({ success: false, message: 'experimentId and submissionNotes required.' });
    let studentId = reqStudentId;
    if (req.portalUser.role === 'STUDENT') {
      const sp = await prisma.studentProfile.findUnique({ where: { userId: req.portalUser.id } });
      studentId = sp?.id;
    }
    const exp = await prisma.labExperiment.findUnique({ where: { id: experimentId } });
    if (!exp || !studentId) return res.status(404).json({ success: false, message: 'Experiment or student not found.' });

    const journal = await prisma.labJournal.create({
      data: { branchId: exp.branchId, experimentId, studentId, submissionNotes: submissionNotes.trim() }
    });
    res.status(201).json({ success: true, journal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/journals/:id/grade', requireRole(...LAB_ROLES), async (req, res) => {
  try {
    const { observationMarks = 0, recordMarks = 0, vivaMarks = 0 } = req.body;
    const totalMarks = Number(observationMarks) + Number(recordMarks) + Number(vivaMarks);
    const journal = await prisma.labJournal.update({
      where: { id: req.params.id },
      data: {
        observationMarks: Number(observationMarks),
        recordMarks: Number(recordMarks),
        vivaMarks: Number(vivaMarks),
        totalMarks,
        signedOffById: req.portalUser.id,
        signedOffAt: new Date(),
        status: 'GRADED_SIGNED'
      },
      include: { experiment: { include: { lab: true } } }
    });

    // Flow into internal practical marks if an Exam exists in the branch
    const exam = await prisma.exam.findFirst({ where: { branchId: journal.branchId }, orderBy: { createdAt: 'desc' } });
    if (exam) {
      await prisma.examMark.create({
        data: {
          examId: exam.id,
          branchId: journal.branchId,
          studentId: journal.studentId,
          subject: `${journal.experiment?.lab?.labType || 'Lab'} Practical`,
          marksObtained: totalMarks,
          maxMarks: journal.experiment?.maxMarks || 25,
          grade: totalMarks >= 20 ? 'A1' : 'B1'
        }
      });
    }

    res.json({ success: true, journal });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
