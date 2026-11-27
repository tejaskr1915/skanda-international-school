const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { getCurrentAcademicYearId } = require('../middleware/rbac');

const MAIN_MENU = [
  '🏫 *Skanda International School — Parent WhatsApp Assistant*',
  'Reply with a number to continue:',
  '1. Attendance Summary',
  '2. Fee Balance & Pay via UPI',
  '3. Download Last Fee Receipt',
  '4. Apply Student Leave',
  '',
  'Reply *menu* anytime to see these options.'
].join('\n');

function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  return digits.slice(-10);
}

/**
 * POST /api/webhooks/whatsapp
 * Compatible with WhatsApp Cloud API / Twilio payloads and Built-in Simulator
 */
router.post('/', async (req, res) => {
  try {
    const rawFrom = req.body.From || req.body.from || req.body.phone || '';
    const rawBody = req.body.Body || req.body.body || req.body.text || req.body.message || '';
    const phone10 = normalizePhone(rawFrom);
    const input = String(rawBody).trim();

    if (!phone10 || phone10.length < 10) {
      return res.status(400).json({ success: false, reply: 'Please provide a valid 10-digit registered parent mobile number.' });
    }

    // Verify registered parent mobile number
    const parentUser = await prisma.user.findFirst({
      where: {
        role: 'PARENT',
        OR: [{ mobile: phone10 }, { mobile: { endsWith: phone10 } }]
      },
      include: {
        parentProfile: {
          include: {
            children: {
              include: {
                student: {
                  include: { user: { select: { fullName: true } } }
                }
              }
            }
          }
        }
      }
    });

    if (!parentUser || !parentUser.parentProfile || parentUser.parentProfile.children.length === 0) {
      return res.status(404).json({
        success: false,
        reply: 'Mobile number is not registered as a Skanda Parent account. Please contact the school office.'
      });
    }

    const child = parentUser.parentProfile.children[0].student;
    const childName = child.user?.fullName || child.admissionNo;

    let session = await prisma.whatsAppSession.upsert({
      where: { phone: phone10 },
      update: {},
      create: { phone: phone10, step: 'MENU' }
    });

    const lower = input.toLowerCase();
    if (!input || lower === 'hi' || lower === 'hello' || lower === 'menu' || lower === '0') {
      await prisma.whatsAppSession.update({ where: { id: session.id }, data: { step: 'MENU', draftData: null } });
      return res.json({ success: true, step: 'MENU', reply: MAIN_MENU });
    }

    // Handle multi-step Leave Application
    if (session.step === 'AWAIT_LEAVE_DETAILS' && !['1', '2', '3', '4'].includes(input)) {
      const parts = input.split('|').map((s) => s.trim());
      const dateMatch = input.match(/(\d{4}-\d{2}-\d{2})/g);
      const fromDate = dateMatch?.[0] || new Date(Date.now() + 86400000).toISOString().split('T')[0];
      const toDate = dateMatch?.[1] || fromDate;
      const reason = parts[1] || input.replace(/\d{4}-\d{2}-\d{2}/g, '').replace(/\bto\b/gi, '').trim() || 'Family / Personal Leave';

      const academicYearId = await getCurrentAcademicYearId(child.branchId);
      const leave = await prisma.leaveRequest.create({
        data: {
          branchId: child.branchId,
          academicYearId,
          requesterUserId: child.userId,
          requesterType: 'STUDENT',
          fromDate,
          toDate,
          reason,
          status: 'PENDING'
        }
      });

      await prisma.whatsAppSession.update({ where: { id: session.id }, data: { step: 'MENU', draftData: null } });
      return res.json({
        success: true,
        step: 'MENU',
        leaveRequestId: leave.id,
        reply: `✅ Leave request submitted for *${childName}* (${fromDate} to ${toDate}).\nReason: ${reason}\nStatus: PENDING Class Teacher approval.`
      });
    }

    // Option 1: Attendance Summary
    if (input === '1') {
      const records = await prisma.attendanceRecord.findMany({
        where: { studentId: child.id },
        orderBy: { date: 'desc' },
        take: 30
      });
      const total = records.length;
      const present = records.filter((r) => r.status === 'PRESENT').length;
      const pct = total > 0 ? Math.round((present / total) * 100) : 100;
      const recentAbsences = records.filter((r) => r.status === 'ABSENT').slice(0, 3).map((r) => r.date);

      return res.json({
        success: true,
        step: 'MENU',
        data: { attendancePct: pct, total, present, recentAbsences },
        reply: `📊 *Attendance Summary — ${childName}*\nAttendance: *${pct}%* (${present}/${total} days)\nRecent Absences: ${
          recentAbsences.length > 0 ? recentAbsences.join(', ') : 'None'
        }`
      });
    }

    // Option 2: Fee Balance & Pay via UPI
    if (input === '2') {
      const invoices = await prisma.feeInvoice.findMany({
        where: { studentId: child.id },
        orderBy: { createdAt: 'desc' }
      });
      const pending = invoices.find((i) => i.status !== 'PAID') || invoices[0];
      if (!pending) {
        return res.json({ success: true, step: 'MENU', reply: `💳 No fee invoices found for ${childName}.` });
      }
      const balance = Math.max(
        0,
        pending.finesDue + pending.tuitionDue + pending.transportDue - pending.scholarshipDiscount - pending.totalPaid
      );
      const upiLink = `upi://pay?pa=skandaschool@icici&pn=Skanda%20International%20School&am=${balance}&cu=INR&tr=${pending.invoiceNo}`;
      return res.json({
        success: true,
        step: 'MENU',
        upiLink,
        balance,
        reply:
          balance > 0
            ? `💳 *Fee Balance — ${childName}*\nInvoice: ${pending.invoiceNo}\nPending Balance: *₹${balance.toLocaleString()}*\nOne-Click UPI Pay Link:\n${upiLink}`
            : `✅ All fees for *${childName}* (${pending.invoiceNo}) are fully PAID!`
      });
    }

    // Option 3: Download Last Fee Receipt
    if (input === '3') {
      const invoice = await prisma.feeInvoice.findFirst({
        where: { studentId: child.id },
        orderBy: { createdAt: 'desc' }
      });
      if (!invoice) {
        return res.json({ success: true, step: 'MENU', reply: `📄 No fee receipt available yet for ${childName}.` });
      }
      const receiptUrl = `/api/webhooks/whatsapp/receipt/${invoice.invoiceNo}`;
      return res.json({
        success: true,
        step: 'MENU',
        receiptUrl,
        reply: `📄 *Latest Fee Receipt — ${childName}*\nInvoice: ${invoice.invoiceNo} (Paid: ₹${invoice.totalPaid.toLocaleString()})\nDownload PDF/Receipt: ${receiptUrl}`
      });
    }

    // Option 4: Apply Student Leave
    if (input === '4') {
      await prisma.whatsAppSession.update({ where: { id: session.id }, data: { step: 'AWAIT_LEAVE_DETAILS' } });
      return res.json({
        success: true,
        step: 'AWAIT_LEAVE_DETAILS',
        reply: `🗓️ *Apply Student Leave — ${childName}*\nPlease reply with dates and reason, e.g.:\n\`2026-12-05 to 2026-12-06 | Family function\``
      });
    }

    return res.json({ success: true, step: 'MENU', reply: `I didn't recognize "${input}".\n\n${MAIN_MENU}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Printable Fee Receipt Endpoint referenced by Bot Option 3
router.get('/receipt/:invoiceNo', async (req, res) => {
  try {
    const invoice = await prisma.feeInvoice.findUnique({ where: { invoiceNo: req.params.invoiceNo } });
    if (!invoice) return res.status(404).json({ success: false, message: 'Receipt not found.' });
    res.json({
      success: true,
      receipt: {
        school: 'Skanda International School',
        invoiceNo: invoice.invoiceNo,
        totalPaid: invoice.totalPaid,
        status: invoice.status,
        issuedAt: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
