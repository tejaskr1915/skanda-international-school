const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { portalAuthMiddleware, requireRole, resolveBranchId } = require('../middleware/rbac');

router.use(portalAuthMiddleware);

const ACCOUNTS_ROLES = ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'];

// 1. Cheque Cleared / Bounced Tracking
router.get('/cheques', requireRole(...ACCOUNTS_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const cheques = await prisma.chequePayment.findMany({ where: { branchId }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, cheques });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/cheques', requireRole(...ACCOUNTS_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { invoiceId, chequeNo, bankName, amount } = req.body;
    if (!invoiceId || !chequeNo || !bankName || !amount) {
      return res.status(400).json({ success: false, message: 'invoiceId, chequeNo, bankName, and amount required.' });
    }
    const cheque = await prisma.chequePayment.create({
      data: { branchId, invoiceId, chequeNo: chequeNo.trim(), bankName: bankName.trim(), amount: Number(amount) }
    });
    res.status(201).json({ success: true, cheque });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/cheques/:id/status', requireRole(...ACCOUNTS_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { status, bounceFine } = req.body;
    const cheque = await prisma.chequePayment.findFirst({ where: { id: req.params.id, branchId } });
    if (!cheque) return res.status(404).json({ success: false, message: 'Cheque not found.' });

    const fine = status === 'BOUNCED' ? Number(bounceFine) || 500 : 0;
    const updated = await prisma.chequePayment.update({
      where: { id: cheque.id },
      data: { status, bounceFine: fine }
    });

    const inv = await prisma.feeInvoice.findUnique({ where: { id: cheque.invoiceId } });
    if (inv) {
      if (status === 'CLEARED') {
        await prisma.feeInvoice.update({
          where: { id: inv.id },
          data: { totalPaid: inv.totalPaid + cheque.amount, status: 'PARTIAL' }
        });
      } else if (status === 'BOUNCED' && fine > 0) {
        await prisma.feeInvoice.update({
          where: { id: inv.id },
          data: { finesDue: inv.finesDue + fine, status: inv.status === 'PAID' ? 'PARTIAL' : inv.status }
        });
      }
    }

    res.json({ success: true, cheque: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 2. GST Receipt Tax Split (CGST 9% + SGST 9%)
router.get('/receipt/:invoiceId', async (req, res) => {
  try {
    const inv = await prisma.feeInvoice.findUnique({ where: { id: req.params.invoiceId } });
    if (!inv) return res.status(404).json({ success: false, message: 'Invoice not found.' });

    const gross = inv.totalPaid > 0 ? inv.totalPaid : inv.tuitionDue + inv.transportDue + inv.finesDue;
    const taxableBase = Math.round(gross / 1.18);
    const cgst9 = Math.round(taxableBase * 0.09);
    const sgst9 = Math.round(taxableBase * 0.09);
    res.json({
      success: true,
      gstReceipt: {
        invoiceNo: inv.invoiceNo,
        taxableBase,
        cgst9,
        sgst9,
        totalGst18: cgst9 + sgst9,
        grandTotal: gross
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Gateway Webhook Reconciliation
router.get('/reconciliations', requireRole(...ACCOUNTS_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const logs = await prisma.gatewayReconciliation.findMany({ where: { branchId }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/reconciliations', requireRole(...ACCOUNTS_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { gatewayRef, invoiceNo, amount, status, notes } = req.body;
    if (!gatewayRef || !amount || !status) return res.status(400).json({ success: false, message: 'gatewayRef, amount, and status required.' });
    const log = await prisma.gatewayReconciliation.create({
      data: { branchId, gatewayRef: gatewayRef.trim(), invoiceNo: invoiceNo?.trim() || null, amount: Number(amount), status, notes }
    });
    res.status(201).json({ success: true, log });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Student Document Requests (Bonafide, TC, ID Card)
router.get('/documents', async (req, res) => {
  try {
    const user = req.portalUser;
    if (user.role === 'STUDENT') {
      const sp = await prisma.studentProfile.findUnique({ where: { userId: user.id } });
      const requests = await prisma.documentRequest.findMany({ where: { studentId: sp?.id }, orderBy: { createdAt: 'desc' } });
      return res.json({ success: true, requests });
    }
    const branchId = await resolveBranchId(req);
    const requests = await prisma.documentRequest.findMany({ where: { branchId }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, requests });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/documents', async (req, res) => {
  try {
    const { docType, reason, studentId: reqStudentId } = req.body;
    let studentId = reqStudentId;
    if (req.portalUser.role === 'STUDENT') {
      const sp = await prisma.studentProfile.findUnique({ where: { userId: req.portalUser.id } });
      studentId = sp?.id;
    } else if (req.portalUser.role === 'PARENT' && !studentId) {
      const pp = await prisma.parentProfile.findUnique({ where: { userId: req.portalUser.id }, include: { children: true } });
      studentId = pp?.children[0]?.studentId;
    }
    const sp = await prisma.studentProfile.findUnique({ where: { id: studentId } });
    if (!sp) return res.status(404).json({ success: false, message: 'Student not found.' });

    const docReq = await prisma.documentRequest.create({
      data: { branchId: sp.branchId, studentId: sp.id, docType: docType || 'BONAFIDE', reason: reason || 'Official purpose' }
    });
    res.status(201).json({ success: true, request: docReq });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/documents/:id/decision', requireRole('SUPER_ADMIN', 'ADMIN', 'ADMISSION_OFFICER'), async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await prisma.documentRequest.update({
      where: { id: req.params.id },
      data: { status, issuedRef: status === 'ISSUED' ? `SKD-DOC-${Date.now().toString().slice(-6)}` : null }
    });
    res.json({ success: true, request: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
