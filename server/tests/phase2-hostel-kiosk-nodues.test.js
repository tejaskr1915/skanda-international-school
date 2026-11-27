const request = require('supertest');
const app = require('../src/index');
const prisma = require('../src/db');

describe('Skanda International School - Phase 2 Sprint 4 Hostel, Gate Kiosk & No-Dues Tests', () => {
  let wardenToken = '';
  let adminToken = '';
  let parentToken = '';
  let student2Token = '';
  let student2Id = '';
  let createdPassId = '';
  let createdVisitorId = '';
  let createdTicketId = '';

  beforeAll(async () => {
    const s2 = await prisma.user.findUnique({
      where: { email: 'student2.blr@skanda.edu.in' },
      include: { studentProfile: true }
    });
    student2Id = s2?.studentProfile?.id || '';
  });

  afterAll(async () => {
    if (createdPassId) await prisma.gatePass.delete({ where: { id: createdPassId } }).catch(() => {});
    if (createdVisitorId) await prisma.hostelVisitorLog.delete({ where: { id: createdVisitorId } }).catch(() => {});
    if (createdTicketId) await prisma.hostelMaintenanceTicket.delete({ where: { id: createdTicketId } }).catch(() => {});
    await prisma.$disconnect();
  });

  test('1. Warden logs in, views occupancy, publishes mess menu & resolves maintenance ticket', async () => {
    const wLogin = await request(app).post('/api/portal-auth/login').send({
      email: 'warden.blr@skanda.edu.in',
      password: 'Password@123'
    });
    expect(wLogin.status).toBe(200);
    expect(wLogin.body.user.role).toBe('HOSTEL_WARDEN');
    wardenToken = wLogin.body.token;

    const occRes = await request(app).get('/api/hostel/occupancy').set('Authorization', `Bearer ${wardenToken}`);
    expect(occRes.status).toBe(200);
    expect(occRes.body.blocks.length).toBeGreaterThanOrEqual(1);

    const roomId = occRes.body.blocks[0].rooms[0].id;
    const messRes = await request(app)
      .post('/api/hostel/mess-menu')
      .set('Authorization', `Bearer ${wardenToken}`)
      .send({
        dayOfWeek: 'Wednesday',
        breakfast: 'Poha & Milk',
        lunch: 'Rajma Chawal',
        snacks: 'Samosa & Tea',
        dinner: 'Roti & Palak Paneer'
      });
    expect(messRes.status).toBe(200);

    const tRes = await request(app)
      .post('/api/hostel/tickets')
      .set('Authorization', `Bearer ${wardenToken}`)
      .send({ roomId, title: 'Water Cooler Filter', description: 'Needs filter cartridge change' });
    expect(tRes.status).toBe(201);
    createdTicketId = tRes.body.ticket.id;

    const resTicket = await request(app)
      .put(`/api/hostel/tickets/${createdTicketId}`)
      .set('Authorization', `Bearer ${wardenToken}`)
      .send({ status: 'RESOLVED' });
    expect(resTicket.status).toBe(200);
    expect(resTicket.body.ticket.status).toBe('RESOLVED');
  });

  test('2. Student requests QR Out-Pass -> Parent 1-tap approve -> Warden approve -> Gate Kiosk QR Exit/Entry scan', async () => {
    const sLogin = await request(app).post('/api/portal-auth/login').send({
      email: 'student2.blr@skanda.edu.in',
      password: 'Password@123'
    });
    student2Token = sLogin.body.token;

    const pLogin = await request(app).post('/api/portal-auth/login').send({
      email: 'parent.blr@skanda.edu.in',
      password: 'Password@123'
    });
    parentToken = pLogin.body.token;

    const reqPass = await request(app)
      .post('/api/hostel/gate-passes')
      .set('Authorization', `Bearer ${student2Token}`)
      .send({ passType: 'HOSTEL_OUTPASS', reason: 'Dental Checkup', destination: 'Jayanagar Clinic' });
    expect(reqPass.status).toBe(201);
    expect(reqPass.body.pass.status).toBe('PENDING_PARENT');
    createdPassId = reqPass.body.pass.id;
    const qrPayload = reqPass.body.pass.qrPayload;

    const pApprove = await request(app)
      .post(`/api/hostel/gate-passes/${createdPassId}/parent-approve`)
      .set('Authorization', `Bearer ${parentToken}`)
      .send({});
    expect(pApprove.status).toBe(200);
    expect(pApprove.body.pass.status).toBe('PENDING_WARDEN');

    const wApprove = await request(app)
      .post(`/api/hostel/gate-passes/${createdPassId}/warden-approve`)
      .set('Authorization', `Bearer ${wardenToken}`)
      .send({});
    expect(wApprove.status).toBe(200);
    expect(wApprove.body.pass.status).toBe('APPROVED');

    // Tampered QR must be rejected
    const badScan = await request(app).post('/api/kiosk/scan-qr').send({ qrPayload: 'SKD-GP:fake:BADSIG123456' });
    expect(badScan.status).toBe(400);

    // Valid QR 1st scan -> EXIT_LOGGED
    const exitScan = await request(app).post('/api/kiosk/scan-qr').send({ qrPayload });
    expect(exitScan.status).toBe(200);
    expect(exitScan.body.action).toBe('EXIT_LOGGED');
    expect(exitScan.body.pass.exitScannedAt).toBeTruthy();

    // Valid QR 2nd scan -> ENTRY_LOGGED
    const entryScan = await request(app).post('/api/kiosk/scan-qr').send({ qrPayload });
    expect(entryScan.status).toBe(200);
    expect(entryScan.body.action).toBe('ENTRY_LOGGED');
    expect(entryScan.body.pass.entryScannedAt).toBeTruthy();
  });

  test('3. Smart Gate Kiosk OTP-Verified Visitor Check-In', async () => {
    const otpReq = await request(app).post('/api/kiosk/visitors/request-otp').send({
      visitorName: 'Kiran Rao',
      visitorPhone: '9900112233',
      purpose: 'Parent Teacher Meeting'
    });
    expect(otpReq.status).toBe(201);
    createdVisitorId = otpReq.body.visitorLog.id;

    const otpVerify = await request(app).post('/api/kiosk/visitors/verify-otp').send({
      visitorLogId: createdVisitorId,
      otpCode: otpReq.body.devOtp
    });
    expect(otpVerify.status).toBe(200);
    expect(otpVerify.body.visitorLog.otpVerified).toBe(true);
    expect(otpVerify.body.visitorPass.passType).toBe('VISITOR');
    if (otpVerify.body.visitorPass?.id) {
      await prisma.gatePass.delete({ where: { id: otpVerify.body.visitorPass.id } }).catch(() => {});
    }
  });

  test('4. Digital No-Dues Engine checks 4 departments and blocks TC until all clear', async () => {
    const aLogin = await request(app).post('/api/portal-auth/login').send({
      email: 'principal.blr@skanda.edu.in',
      password: 'Password@123'
    });
    adminToken = aLogin.body.token;

    const ndRes = await request(app)
      .get(`/api/no-dues/${student2Id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(ndRes.status).toBe(200);
    expect(ndRes.body.departments).toHaveProperty('accounts');
    expect(ndRes.body.departments).toHaveProperty('library');
    expect(ndRes.body.departments).toHaveProperty('hostel');
    expect(ndRes.body.departments).toHaveProperty('labs');
    expect(ndRes.body.allCleared).toBe(false);

    const tcRes = await request(app)
      .post(`/api/no-dues/${student2Id}/generate-tc`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});
    expect(tcRes.status).toBe(403);
    expect(tcRes.body.blockedReasons.length).toBeGreaterThanOrEqual(1);
  });
});
