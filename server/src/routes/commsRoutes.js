const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { portalAuthMiddleware, requireRole, resolveBranchId } = require('../middleware/rbac');

router.use(portalAuthMiddleware);

function parseTimeToMinutes(hhmm) {
  const [h, m] = String(hhmm).split(':').map(Number);
  return h * 60 + m;
}

function formatMinutesToHHMM(totalMins) {
  const h = String(Math.floor(totalMins / 60)).padStart(2, '0');
  const m = String(totalMins % 60).padStart(2, '0');
  return `${h}:${m}`;
}

function extractPlaceholders(body) {
  const matches = String(body || '').match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/\{\{|\}\}/g, '')))];
}

// ----------------------------------------------------------------------------
// SMART PTM SLOT BOOKER
// ----------------------------------------------------------------------------

router.get('/ptm/events', async (req, res) => {
  try {
    const branchId = req.portalUser.branchId || (await resolveBranchId(req));
    const events = await prisma.pTMEvent.findMany({
      where: { branchId },
      include: { slots: { orderBy: { startTime: 'asc' } } },
      orderBy: [{ eventDate: 'asc' }, { startTime: 'asc' }]
    });

    const teacherIds = [...new Set(events.map((e) => e.teacherUserId))];
    const teachers = await prisma.user.findMany({
      where: { id: { in: teacherIds } },
      select: { id: true, fullName: true, email: true, department: true }
    });
    const teacherMap = Object.fromEntries(teachers.map((t) => [t.id, t]));

    res.json({
      success: true,
      events: events.map((e) => ({ ...e, teacher: teacherMap[e.teacherUserId] || null }))
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/ptm/events', requireRole('SUPER_ADMIN', 'ADMIN', 'TEACHER'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { title, eventDate, startTime, endTime, slotMinutes, meetingMode, meetingLink } = req.body;
    if (!title || !eventDate || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'title, eventDate, startTime, and endTime are required.' });
    }

    const startMins = parseTimeToMinutes(startTime);
    const endMins = parseTimeToMinutes(endTime);
    const step = Number(slotMinutes) || 10;
    if (isNaN(startMins) || isNaN(endMins) || endMins <= startMins || step < 5) {
      return res.status(400).json({ success: false, message: 'Invalid startTime/endTime window.' });
    }

    const generatedSlots = [];
    for (let t = startMins; t + step <= endMins; t += step) {
      generatedSlots.push({
        branchId,
        startTime: formatMinutesToHHMM(t),
        endTime: formatMinutesToHHMM(t + step),
        status: 'AVAILABLE'
      });
    }

    if (generatedSlots.length === 0) {
      return res.status(400).json({ success: false, message: 'Availability window is too short for a 10-minute slot.' });
    }

    const event = await prisma.pTMEvent.create({
      data: {
        branchId,
        teacherUserId: req.portalUser.id,
        title: title.trim(),
        eventDate: eventDate.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        slotMinutes: step,
        meetingMode: meetingMode || 'IN_PERSON',
        meetingLink: meetingLink?.trim() || null,
        slots: { create: generatedSlots }
      },
      include: { slots: { orderBy: { startTime: 'asc' } } }
    });

    res.status(201).json({ success: true, event });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * Atomic PTM Slot Booking:
 * Uses updateMany with status='AVAILABLE' guard so two parents can never double-book the same slot.
 */
router.post('/ptm/slots/:slotId/book', requireRole('PARENT', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { studentId, notes } = req.body;
    const result = await prisma.pTMSlot.updateMany({
      where: { id: req.params.slotId, status: 'AVAILABLE' },
      data: {
        status: 'BOOKED',
        bookedByParentUserId: req.portalUser.id,
        studentId: studentId || null,
        notes: notes?.trim() || null,
        bookedAt: new Date()
      }
    });

    if (result.count === 0) {
      return res.status(409).json({
        success: false,
        message: 'This 10-minute PTM slot was just booked by another parent or is unavailable.'
      });
    }

    const slot = await prisma.pTMSlot.findUnique({ where: { id: req.params.slotId } });
    res.json({ success: true, slot });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/ptm/slots/:slotId/cancel', async (req, res) => {
  try {
    const slot = await prisma.pTMSlot.update({
      where: { id: req.params.slotId },
      data: { status: 'AVAILABLE', bookedByParentUserId: null, studentId: null, bookedAt: null }
    });
    res.json({ success: true, slot });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------------------------------
// DLT-COMPLIANT BULK SMS & WHATSAPP AUTOMATION
// ----------------------------------------------------------------------------

router.get('/dlt-templates', requireRole('SUPER_ADMIN', 'ADMIN', 'TEACHER', 'TRANSPORT_MANAGER', 'ACCOUNTANT'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const templates = await prisma.dltTemplate.findMany({
      where: { branchId },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, templates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/dlt-templates', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { templateId, senderId, channel, eventTrigger, bodyWithPlaceholders } = req.body;
    if (!templateId || !senderId || !channel || !eventTrigger || !bodyWithPlaceholders) {
      return res.status(400).json({ success: false, message: 'All DLT template fields are required.' });
    }

    const template = await prisma.dltTemplate.create({
      data: {
        branchId,
        templateId: templateId.trim().toUpperCase(),
        senderId: senderId.trim().toUpperCase(),
        channel,
        eventTrigger,
        bodyWithPlaceholders: bodyWithPlaceholders.trim()
      }
    });
    res.status(201).json({ success: true, template });
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'DLT Template ID already exists in this branch.' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/dlt-templates/:id', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const existing = await prisma.dltTemplate.findFirst({ where: { id: req.params.id, branchId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Template not found.' });
    await prisma.dltTemplate.delete({ where: { id: existing.id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/campaigns/send', requireRole('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'TRANSPORT_MANAGER'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { templateId, targetAudience, customPhones, variables = {} } = req.body;
    if (!templateId) return res.status(400).json({ success: false, message: 'templateId is required.' });

    const template = await prisma.dltTemplate.findFirst({
      where: { branchId, OR: [{ id: templateId }, { templateId }] }
    });
    if (!template) return res.status(404).json({ success: false, message: 'DLT Template not found in branch.' });

    const requiredVars = extractPlaceholders(template.bodyWithPlaceholders);
    const missingVariables = requiredVars.filter((v) => variables[v] === undefined || String(variables[v]).trim() === '');
    if (missingVariables.length > 0) {
      return res.status(400).json({
        success: false,
        message: `DLT Validation Failed: Missing required template variable(s): ${missingVariables.join(', ')}`,
        missingVariables
      });
    }

    let phones = [];
    if (targetAudience === 'CUSTOM' && Array.isArray(customPhones) && customPhones.length > 0) {
      phones = customPhones.map((p) => String(p).trim()).filter(Boolean);
    } else {
      const parents = await prisma.user.findMany({
        where: { branchId, role: 'PARENT', mobile: { not: null } },
        select: { mobile: true }
      });
      phones = parents.map((p) => p.mobile).filter(Boolean);
    }

    if (phones.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid recipient phone numbers found.' });
    }

    let renderedBody = template.bodyWithPlaceholders;
    for (const key of requiredVars) {
      renderedBody = renderedBody.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(variables[key]));
    }

    const logRecords = await Promise.all(
      phones.map((recipientPhone) =>
        prisma.campaignDispatchLog.create({
          data: {
            branchId,
            templateId: template.templateId,
            channel: template.channel,
            eventTrigger: template.eventTrigger,
            recipientPhone,
            renderedBody,
            status: 'SENT'
          }
        })
      )
    );

    console.log(`[DLT ${template.channel} DISPATCH] Template: ${template.templateId} (${template.senderId}) -> ${phones.length} recipient(s)`);
    res.json({ success: true, dispatchedCount: logRecords.length, renderedBody, logs: logRecords });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/logs', requireRole('SUPER_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const logs = await prisma.campaignDispatchLog.findMany({
      where: { branchId },
      orderBy: { dispatchedAt: 'desc' },
      take: 40
    });
    res.json({ success: true, logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
