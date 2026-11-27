const request = require('supertest');
const app = require('../src/index');
const prisma = require('../src/db');

describe('Skanda International School - Phase 2 Sprint 5 PTM, DLT Campaigns & WhatsApp Bot Tests', () => {
  let teacherToken = '';
  let parentToken = '';
  let adminToken = '';
  let createdPtmEventId = '';
  let createdLeaveId = '';

  afterAll(async () => {
    if (createdPtmEventId) {
      await prisma.pTMEvent.delete({ where: { id: createdPtmEventId } }).catch(() => {});
    }
    if (createdLeaveId) {
      await prisma.leaveRequest.delete({ where: { id: createdLeaveId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  test('1. Teacher auto-generates 10-min PTM slots & Parent books with atomic double-book lock', async () => {
    const tLogin = await request(app).post('/api/portal-auth/login').send({
      email: 'teacher.blr@skanda.edu.in',
      password: 'Password@123'
    });
    expect(tLogin.status).toBe(200);
    teacherToken = tLogin.body.token;

    const evRes = await request(app)
      .post('/api/comms/ptm/events')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        title: 'Sprint 5 Atomic PTM Test',
        eventDate: '2026-12-15',
        startTime: '14:00',
        endTime: '14:30',
        slotMinutes: 10
      });
    expect(evRes.status).toBe(201);
    expect(evRes.body.event.slots.length).toBe(3);
    createdPtmEventId = evRes.body.event.id;
    const slot1Id = evRes.body.event.slots[0].id;

    const pLogin = await request(app).post('/api/portal-auth/login').send({
      email: 'parent.blr@skanda.edu.in',
      password: 'Password@123'
    });
    expect(pLogin.status).toBe(200);
    parentToken = pLogin.body.token;

    // 1st book succeeds
    const book1 = await request(app)
      .post(`/api/comms/ptm/slots/${slot1Id}/book`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({ notes: 'Discuss Algebra progress' });
    expect(book1.status).toBe(200);
    expect(book1.body.slot.status).toBe('BOOKED');

    // 2nd book on same slot must fail with 409 Conflict
    const book2 = await request(app)
      .post(`/api/comms/ptm/slots/${slot1Id}/book`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({});
    expect(book2.status).toBe(409);
  });

  test('2. Branch Admin DLT campaign validates placeholders and dispatches logs', async () => {
    const aLogin = await request(app).post('/api/portal-auth/login').send({
      email: 'principal.blr@skanda.edu.in',
      password: 'Password@123'
    });
    adminToken = aLogin.body.token;

    const tplRes = await request(app)
      .get('/api/comms/dlt-templates')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(tplRes.status).toBe(200);
    expect(tplRes.body.templates.length).toBeGreaterThanOrEqual(1);
    const absTpl = tplRes.body.templates.find((t) => t.eventTrigger === 'ABSENCE');

    // Missing variables -> 400
    const badCamp = await request(app)
      .post('/api/comms/campaigns/send')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ templateId: absTpl.id, targetAudience: 'ALL_PARENTS', variables: { studentName: 'Aarav' } });
    expect(badCamp.status).toBe(400);
    expect(badCamp.body.missingVariables).toContain('date');

    // Valid variables -> 200
    const okCamp = await request(app)
      .post('/api/comms/campaigns/send')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        templateId: absTpl.id,
        targetAudience: 'ALL_PARENTS',
        variables: { studentName: 'Aarav', date: '2026-11-26' }
      });
    expect(okCamp.status).toBe(200);
    expect(okCamp.body.dispatchedCount).toBeGreaterThanOrEqual(1);
  });

  test('3. Conversational WhatsApp Parent Bot handles menu, 1 (Attendance), 2 (UPI), 3 (Receipt), 4 (Leave)', async () => {
    const phone = '9876543210';

    const menuRes = await request(app).post('/api/webhooks/whatsapp').send({ phone, message: 'menu' });
    expect(menuRes.status).toBe(200);
    expect(menuRes.body.reply).toMatch(/1\. Attendance Summary/);

    const attRes = await request(app).post('/api/webhooks/whatsapp').send({ phone, message: '1' });
    expect(attRes.status).toBe(200);
    expect(attRes.body.data.attendancePct).toBeDefined();

    const feeRes = await request(app).post('/api/webhooks/whatsapp').send({ phone, message: '2' });
    expect(feeRes.status).toBe(200);
    expect(feeRes.body.upiLink).toMatch(/^upi:\/\/pay\?/);

    const recRes = await request(app).post('/api/webhooks/whatsapp').send({ phone, message: '3' });
    expect(recRes.status).toBe(200);
    expect(recRes.body.receiptUrl).toMatch(/\/api\/webhooks\/whatsapp\/receipt\//);

    const leavePrompt = await request(app).post('/api/webhooks/whatsapp').send({ phone, message: '4' });
    expect(leavePrompt.status).toBe(200);
    expect(leavePrompt.body.step).toBe('AWAIT_LEAVE_DETAILS');

    const leaveCreate = await request(app)
      .post('/api/webhooks/whatsapp')
      .send({ phone, message: '2026-12-12 to 2026-12-13 | Medical checkup' });
    expect(leaveCreate.status).toBe(200);
    expect(leaveCreate.body.leaveRequestId).toBeTruthy();
    createdLeaveId = leaveCreate.body.leaveRequestId;
  });
});
