const express = require('express');
const crypto = require('crypto');
const router = express.Router();
const prisma = require('../db');

const QR_SECRET = process.env.JWT_SECRET || 'skanda_secret_jwt_key_2026_super_secure';

function verifyQrSignature(qrPayload) {
  if (!qrPayload || typeof qrPayload !== 'string') return false;
  const parts = qrPayload.trim().split(':');
  if (parts.length !== 3 || parts[0] !== 'SKD-GP') return false;
  const [, passId, sig] = parts;
  const expected = crypto.createHmac('sha256', QR_SECRET).update(passId).digest('hex').slice(0, 12).toUpperCase();
  return sig === expected;
}

async function resolveKioskBranchId(branchId) {
  if (branchId) return branchId;
  const first = await prisma.branch.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
  return first?.id || null;
}

// List branches for tablet gate selector
router.get('/branches', async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
    res.json({ success: true, branches });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Recent visitor logs
router.get('/visitors', async (req, res) => {
  try {
    const branchId = await resolveKioskBranchId(req.query.branchId);
    const visitors = await prisma.hostelVisitorLog.findMany({
      where: branchId ? { branchId } : {},
      orderBy: { createdAt: 'desc' },
      take: 30
    });
    res.json({ success: true, visitors });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Step 1: Request OTP for Visitor Check-In
router.post('/visitors/request-otp', async (req, res) => {
  try {
    const { branchId: reqBranchId, visitorName, visitorPhone, purpose, hostStudentAdmissionNo } = req.body;
    if (!visitorName || !visitorPhone || !purpose) {
      return res.status(400).json({ success: false, message: 'visitorName, visitorPhone, and purpose are required.' });
    }
    const branchId = await resolveKioskBranchId(reqBranchId);
    if (!branchId) return res.status(400).json({ success: false, message: 'No active branch found.' });

    let hostStudentId = null;
    if (hostStudentAdmissionNo) {
      const sp = await prisma.studentProfile.findFirst({ where: { admissionNo: hostStudentAdmissionNo.trim(), branchId } });
      hostStudentId = sp?.id || null;
    }

    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const visitorLog = await prisma.hostelVisitorLog.create({
      data: {
        branchId,
        visitorName: visitorName.trim(),
        visitorPhone: visitorPhone.trim(),
        purpose: purpose.trim(),
        hostStudentId,
        otpCode,
        otpVerified: false
      }
    });

    console.log(`[DEV VISITOR KIOSK OTP] Phone: ${visitorPhone} | OTP: ${otpCode}`);
    res.status(201).json({ success: true, visitorLog, devOtp: otpCode });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Step 2: Verify Visitor OTP & Auto Check-In
router.post('/visitors/verify-otp', async (req, res) => {
  try {
    const { visitorLogId, otpCode } = req.body;
    if (!visitorLogId || !otpCode) {
      return res.status(400).json({ success: false, message: 'visitorLogId and otpCode are required.' });
    }

    const log = await prisma.hostelVisitorLog.findUnique({ where: { id: visitorLogId } });
    if (!log) return res.status(404).json({ success: false, message: 'Visitor log not found.' });
    if (log.otpCode !== String(otpCode).trim()) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code.' });
    }

    const updated = await prisma.hostelVisitorLog.update({
      where: { id: log.id },
      data: { otpVerified: true, checkedInAt: new Date() }
    });

    // Issue Visitor Gate Pass
    const passId = crypto.randomUUID();
    const sig = crypto.createHmac('sha256', QR_SECRET).update(passId).digest('hex').slice(0, 12).toUpperCase();
    const visitorPass = await prisma.gatePass.create({
      data: {
        id: passId,
        branchId: log.branchId,
        studentId: log.hostStudentId,
        passType: 'VISITOR',
        reason: `Visitor: ${log.visitorName} (${log.purpose})`,
        qrPayload: `SKD-GP:${passId}:${sig}`,
        expiresAt: new Date(Date.now() + 4 * 3600000),
        parentApprovedAt: new Date(),
        wardenApprovedAt: new Date(),
        status: 'APPROVED'
      }
    });

    res.json({ success: true, visitorLog: updated, visitorPass });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/visitors/:id/checkout', async (req, res) => {
  try {
    const updated = await prisma.hostelVisitorLog.update({
      where: { id: req.params.id },
      data: { checkedOutAt: new Date() }
    });
    res.json({ success: true, visitorLog: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// QR Gate Scanner: Verifies cryptographic QR payload and logs exit/entry timestamps
router.post('/scan-qr', async (req, res) => {
  try {
    const { qrPayload } = req.body;
    if (!verifyQrSignature(qrPayload)) {
      return res.status(400).json({ success: false, message: 'Invalid or tampered cryptographic QR signature.' });
    }

    const pass = await prisma.gatePass.findUnique({
      where: { qrPayload: qrPayload.trim() },
      include: {
        student: { include: { user: { select: { fullName: true, email: true } } } }
      }
    });
    if (!pass) return res.status(404).json({ success: false, message: 'Gate pass record not found.' });
    if (pass.status === 'REJECTED') return res.status(403).json({ success: false, message: 'Gate pass was rejected.' });
    if (new Date(pass.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, message: 'Gate pass has expired.' });
    }

    if (pass.status === 'PENDING_PARENT' || pass.status === 'PENDING_WARDEN') {
      return res.status(403).json({
        success: false,
        message: `Gate pass is awaiting approval (${pass.status}).`
      });
    }

    if (pass.status === 'APPROVED') {
      const updated = await prisma.gatePass.update({
        where: { id: pass.id },
        data: { exitScannedAt: new Date(), status: 'EXITED' },
        include: { student: { include: { user: { select: { fullName: true, email: true } } } } }
      });
      return res.json({ success: true, action: 'EXIT_LOGGED', pass: updated });
    }

    if (pass.status === 'EXITED') {
      const updated = await prisma.gatePass.update({
        where: { id: pass.id },
        data: { entryScannedAt: new Date(), status: 'RETURNED' },
        include: { student: { include: { user: { select: { fullName: true, email: true } } } } }
      });
      return res.json({ success: true, action: 'ENTRY_LOGGED', pass: updated });
    }

    return res.status(400).json({ success: false, message: `Gate pass already completed (${pass.status}).` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
