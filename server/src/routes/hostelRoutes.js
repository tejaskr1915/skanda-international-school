const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const prisma = require('../db');
const { portalAuthMiddleware, requireRole, resolveBranchId } = require('../middleware/rbac');

const QR_SECRET = process.env.JWT_SECRET || 'skanda_secret_jwt_key_2026_super_secure';

function signQrPayload(passId) {
  const sig = crypto.createHmac('sha256', QR_SECRET).update(passId).digest('hex').slice(0, 12).toUpperCase();
  return `SKD-GP:${passId}:${sig}`;
}

router.use(portalAuthMiddleware);

const WARDEN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'HOSTEL_WARDEN'];

// ----------------------------------------------------------------------------
// BLOCKS, ROOMS & BED OCCUPANCY GRID
// ----------------------------------------------------------------------------

router.get('/occupancy', requireRole(...WARDEN_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const [blocks, students] = await Promise.all([
      prisma.hostelBlock.findMany({
        where: { branchId },
        include: {
          rooms: {
            include: {
              beds: {
                where: { status: 'OCCUPIED' },
                include: { student: { include: { user: { select: { fullName: true, email: true } } } } },
                orderBy: { bedNumber: 'asc' }
              }
            },
            orderBy: { roomNumber: 'asc' }
          }
        },
        orderBy: { blockName: 'asc' }
      }),
      prisma.studentProfile.findMany({
        where: { branchId },
        include: { user: { select: { fullName: true, email: true } } },
        orderBy: { admissionNo: 'asc' }
      })
    ]);
    res.json({ success: true, blocks, students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/blocks', requireRole(...WARDEN_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { blockName, genderType } = req.body;
    if (!blockName) return res.status(400).json({ success: false, message: 'blockName is required.' });
    const block = await prisma.hostelBlock.create({
      data: { branchId, blockName: blockName.trim(), genderType: genderType || 'BOYS' }
    });
    res.status(201).json({ success: true, block });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/rooms', requireRole(...WARDEN_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { blockId, roomNumber, floor, capacity } = req.body;
    if (!blockId || !roomNumber) return res.status(400).json({ success: false, message: 'blockId and roomNumber are required.' });
    const room = await prisma.hostelRoom.create({
      data: { branchId, blockId, roomNumber: roomNumber.trim(), floor: Number(floor) || 1, capacity: Number(capacity) || 3 }
    });
    res.status(201).json({ success: true, room });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/allocate-bed', requireRole(...WARDEN_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { roomId, bedNumber, emailOrAdmission, studentId } = req.body;
    if (!roomId || !bedNumber || (!emailOrAdmission && !studentId)) {
      return res.status(400).json({ success: false, message: 'roomId, bedNumber, and student are required.' });
    }

    const room = await prisma.hostelRoom.findFirst({
      where: { id: roomId, branchId },
      include: { beds: { where: { status: 'OCCUPIED' } } }
    });
    if (!room) return res.status(404).json({ success: false, message: 'Room not found.' });
    if (room.beds.some((b) => b.bedNumber === Number(bedNumber))) {
      return res.status(409).json({ success: false, message: `Bed #${bedNumber} is already occupied.` });
    }
    if (room.beds.length >= room.capacity) {
      return res.status(400).json({ success: false, message: 'Room is at full capacity.' });
    }

    const student = studentId
      ? await prisma.studentProfile.findFirst({ where: { id: studentId, branchId } })
      : await prisma.studentProfile.findFirst({
          where: { branchId, OR: [{ admissionNo: String(emailOrAdmission).trim() }, { user: { email: String(emailOrAdmission).trim() } }] }
        });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found in branch.' });

    const existingOccupied = await prisma.hostelBedAllocation.findFirst({
      where: { studentId: student.id, status: 'OCCUPIED' }
    });
    if (existingOccupied) {
      return res.status(409).json({ success: false, message: 'Student already occupies a hostel bed.' });
    }

    const allocation = await prisma.hostelBedAllocation.create({
      data: { branchId, roomId: room.id, bedNumber: Number(bedNumber), studentId: student.id, status: 'OCCUPIED' },
      include: { student: { include: { user: { select: { fullName: true, email: true } } } } }
    });

    await prisma.studentProfile.update({ where: { id: student.id }, data: { hostelOpted: true } });
    res.status(201).json({ success: true, allocation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/vacate-bed/:allocationId', requireRole(...WARDEN_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const alloc = await prisma.hostelBedAllocation.findFirst({ where: { id: req.params.allocationId, branchId } });
    if (!alloc) return res.status(404).json({ success: false, message: 'Bed allocation not found.' });

    const updated = await prisma.hostelBedAllocation.update({
      where: { id: alloc.id },
      data: {
        status: 'VACATED',
        vacatedAt: new Date(),
        maintenanceDue: req.body.maintenanceDue !== undefined ? Number(req.body.maintenanceDue) : alloc.maintenanceDue
      }
    });
    res.json({ success: true, allocation: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// MESS MENU & MAINTENANCE TICKETS
// ----------------------------------------------------------------------------

router.get('/mess-menu', async (req, res) => {
  try {
    const branchId = req.portalUser.branchId || (await resolveBranchId(req));
    const menus = await prisma.messMenu.findMany({ where: { branchId } });
    res.json({ success: true, menus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/mess-menu', requireRole(...WARDEN_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { dayOfWeek, breakfast, lunch, snacks, dinner } = req.body;
    if (!dayOfWeek || !breakfast || !lunch || !snacks || !dinner) {
      return res.status(400).json({ success: false, message: 'All mess menu fields are required.' });
    }
    const menu = await prisma.messMenu.upsert({
      where: { branchId_dayOfWeek: { branchId, dayOfWeek: dayOfWeek.trim() } },
      update: { breakfast, lunch, snacks, dinner },
      create: { branchId, dayOfWeek: dayOfWeek.trim(), breakfast, lunch, snacks, dinner }
    });
    res.json({ success: true, menu });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/tickets', requireRole(...WARDEN_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const tickets = await prisma.hostelMaintenanceTicket.findMany({
      where: { branchId },
      include: { room: { include: { block: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, tickets });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/tickets', async (req, res) => {
  try {
    const branchId = req.portalUser.branchId || (await resolveBranchId(req));
    const { roomId, title, description, studentId } = req.body;
    if (!roomId || !title || !description) {
      return res.status(400).json({ success: false, message: 'roomId, title, and description are required.' });
    }
    const ticket = await prisma.hostelMaintenanceTicket.create({
      data: { branchId, roomId, studentId: studentId || null, title: title.trim(), description: description.trim() }
    });
    res.status(201).json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.put('/tickets/:id', requireRole(...WARDEN_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const existing = await prisma.hostelMaintenanceTicket.findFirst({ where: { id: req.params.id, branchId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Ticket not found.' });

    const nextStatus = req.body.status || existing.status;
    const ticket = await prisma.hostelMaintenanceTicket.update({
      where: { id: existing.id },
      data: {
        status: nextStatus,
        repairCost: req.body.repairCost !== undefined ? Number(req.body.repairCost) : existing.repairCost,
        resolvedAt: nextStatus === 'RESOLVED' ? new Date() : existing.resolvedAt
      }
    });
    res.json({ success: true, ticket });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// CRYPTOGRAPHIC QR GATE OUT-PASS & EARLY PICKUP
// ----------------------------------------------------------------------------

router.get('/gate-passes', requireRole(...WARDEN_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const passes = await prisma.gatePass.findMany({
      where: { branchId },
      include: {
        student: { include: { user: { select: { fullName: true, email: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    res.json({ success: true, passes });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/my-gate-passes', async (req, res) => {
  try {
    const user = req.portalUser;
    let studentId = req.query.studentId;
    if (user.role === 'STUDENT') {
      const sp = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
      studentId = sp?.id;
    } else if (user.role === 'PARENT') {
      const pp = await prisma.parentProfile.findUnique({ where: { userId: user.id }, include: { children: true } });
      const childIds = (pp?.children || []).map((c) => c.studentId);
      if (!studentId || !childIds.includes(studentId)) studentId = childIds[0] || null;
    }

    if (!studentId) return res.json({ success: true, passes: [], hostelAllocation: null, messMenus: [] });

    const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });
    const [passes, hostelAllocation, messMenus] = await Promise.all([
      prisma.gatePass.findMany({ where: { studentId }, orderBy: { createdAt: 'desc' } }),
      prisma.hostelBedAllocation.findFirst({
        where: { studentId, status: 'OCCUPIED' },
        include: { room: { include: { block: true } } }
      }),
      prisma.messMenu.findMany({ where: { branchId: student?.branchId } })
    ]);

    res.json({ success: true, passes, hostelAllocation, messMenus });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/gate-passes', async (req, res) => {
  try {
    const user = req.portalUser;
    const { passType, reason, destination, expiresInHours, studentId: requestedStudentId } = req.body;
    if (!passType || !reason) {
      return res.status(400).json({ success: false, message: 'passType and reason are required.' });
    }

    let studentId = requestedStudentId;
    let branchId = user.branchId;
    if (user.role === 'STUDENT') {
      const sp = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
      studentId = sp?.id;
      branchId = sp?.branchId;
    } else if (user.role === 'PARENT') {
      const pp = await prisma.parentProfile.findUnique({ where: { userId: user.id }, include: { children: true } });
      const childIds = (pp?.children || []).map((c) => c.studentId);
      if (!studentId || !childIds.includes(studentId)) studentId = childIds[0];
    }

    if (!studentId) return res.status(400).json({ success: false, message: 'Target student not found.' });
    const student = await prisma.studentProfile.findUnique({ where: { id: studentId } });
    branchId = student.branchId;

    const passId = crypto.randomUUID();
    const qrPayload = signQrPayload(passId);
    const expiresAt = new Date(Date.now() + (Number(expiresInHours) || 12) * 3600000);

    const isParent = user.role === 'PARENT';
    const pass = await prisma.gatePass.create({
      data: {
        id: passId,
        branchId,
        studentId,
        passType,
        reason: reason.trim(),
        destination: destination?.trim() || null,
        qrPayload,
        expiresAt,
        parentApprovedAt: isParent ? new Date() : null,
        status: isParent ? 'PENDING_WARDEN' : 'PENDING_PARENT'
      }
    });

    res.status(201).json({ success: true, pass });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/gate-passes/:id/parent-approve', requireRole('PARENT', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const existing = await prisma.gatePass.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Gate pass not found.' });

    const pass = await prisma.gatePass.update({
      where: { id: existing.id },
      data: {
        parentApprovedAt: new Date(),
        status: existing.wardenApprovedAt ? 'APPROVED' : 'PENDING_WARDEN'
      }
    });
    res.json({ success: true, pass });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/gate-passes/:id/warden-approve', requireRole(...WARDEN_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const existing = await prisma.gatePass.findFirst({ where: { id: req.params.id, branchId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Gate pass not found.' });

    const pass = await prisma.gatePass.update({
      where: { id: existing.id },
      data: {
        wardenApprovedAt: new Date(),
        status: 'APPROVED'
      }
    });
    res.json({ success: true, pass });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/gate-passes/:id/reject', async (req, res) => {
  try {
    const existing = await prisma.gatePass.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Gate pass not found.' });
    const pass = await prisma.gatePass.update({
      where: { id: existing.id },
      data: { rejectedAt: new Date(), status: 'REJECTED' }
    });
    res.json({ success: true, pass });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
