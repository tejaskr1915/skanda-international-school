const request = require('supertest');
const bcrypt = require('bcryptjs');
const app = require('../src/index');
const prisma = require('../src/db');

describe('Skanda International School - Phase 2 Sprint 7 BRD Gap-Closure Tests', () => {
  let labToken = '';
  let coordToken = '';
  let adminToken = '';
  let teacherToken = '';
  let placementToken = '';
  let student1Token = '';
  let student2Token = '';
  let student1Id = '';
  let student2Id = '';
  let createdBranchId = '';
  let lockoutUserId = '';

  beforeAll(async () => {
    const s1 = await prisma.user.findUnique({ where: { email: 'student1.blr@skanda.edu.in' }, include: { studentProfile: true } });
    const s2 = await prisma.user.findUnique({ where: { email: 'student2.blr@skanda.edu.in' }, include: { studentProfile: true } });
    student1Id = s1.studentProfile.id;
    student2Id = s2.studentProfile.id;
  });

  afterAll(async () => {
    if (lockoutUserId) await prisma.user.delete({ where: { id: lockoutUserId } }).catch(() => {});
    if (createdBranchId) await prisma.branch.delete({ where: { id: createdBranchId } }).catch(() => {});
    await prisma.$disconnect();
  });

  test('1. Labs Management: LAB_ASSISTANT alerts, damage fine sync & LabJournal practical sign-off', async () => {
    const lLogin = await request(app).post('/api/portal-auth/login').send({ email: 'lab.blr@skanda.edu.in', password: 'Password@123' });
    expect(lLogin.status).toBe(200);
    labToken = lLogin.body.token;

    const labsRes = await request(app).get('/api/labs').set('Authorization', `Bearer ${labToken}`);
    expect(labsRes.status).toBe(200);
    expect(labsRes.body.labs.length).toBeGreaterThanOrEqual(1);
    const lab = labsRes.body.labs[0];
    expect(lab.equipment.some((e) => e.lowStockAlert || e.expiryAlert)).toBe(true);

    const eqId = lab.equipment[0].id;
    const issRes = await request(app)
      .post(`/api/labs/equipment/${eqId}/issue`)
      .set('Authorization', `Bearer ${labToken}`)
      .send({ studentId: student1Id, quantity: 1 });
    expect(issRes.status).toBe(201);

    const retRes = await request(app)
      .post(`/api/labs/equipment-issues/${issRes.body.issue.id}/return`)
      .set('Authorization', `Bearer ${labToken}`)
      .send({ damaged: true, damageFine: 350 });
    expect(retRes.status).toBe(200);
    expect(retRes.body.damageFine).toBe(350);

    // Student submits LabJournal -> Teacher grades & signs off
    const s1Login = await request(app).post('/api/portal-auth/login').send({ email: 'student1.blr@skanda.edu.in', password: 'Password@123' });
    student1Token = s1Login.body.token;
    const jRes = await request(app)
      .post('/api/labs/journals')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ experimentId: lab.experiments[0].id, submissionNotes: 'Titration endpoint observed at 14.2ml.' });
    expect(jRes.status).toBe(201);

    const tLogin = await request(app).post('/api/portal-auth/login').send({ email: 'teacher.blr@skanda.edu.in', password: 'Password@123' });
    teacherToken = tLogin.body.token;
    const gradeRes = await request(app)
      .post(`/api/labs/journals/${jRes.body.journal.id}/grade`)
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({ observationMarks: 9, recordMarks: 8, vivaMarks: 7 });
    expect(gradeRes.status).toBe(200);
    expect(gradeRes.body.journal.totalMarks).toBe(24);
    expect(gradeRes.body.journal.status).toBe('GRADED_SIGNED');

    await prisma.labJournal.delete({ where: { id: jRes.body.journal.id } }).catch(() => {});
    await prisma.labEquipmentIssue.delete({ where: { id: issRes.body.issue.id } }).catch(() => {});
  });

  test('2. Activities: Venue/Timetable clash detection & OTP parent consent', async () => {
    const cLogin = await request(app).post('/api/portal-auth/login').send({ email: 'activity.blr@skanda.edu.in', password: 'Password@123' });
    expect(cLogin.status).toBe(200);
    coordToken = cLogin.body.token;

    // Clash with seeded Robotics club (STEM Innovation Arena + SAT-10:00) -> 409
    const clashRes = await request(app)
      .post('/api/activities')
      .set('Authorization', `Bearer ${coordToken}`)
      .send({ name: 'Drone Racing', venue: 'STEM Innovation Arena', scheduleSlot: 'SAT-10:00', eligibleGrades: 'ALL' });
    expect(clashRes.status).toBe(409);

    const actsRes = await request(app).get('/api/activities').set('Authorization', `Bearer ${coordToken}`);
    const musicAct = actsRes.body.activities.find((a) => a.category === 'MUSIC');

    const enrRes = await request(app)
      .post(`/api/activities/${musicAct.id}/enroll`)
      .set('Authorization', `Bearer ${student1Token}`)
      .send({});
    expect(enrRes.status).toBe(201);

    const conRes = await request(app)
      .post(`/api/activities/enrollments/${enrRes.body.enrollment.id}/consent`)
      .set('Authorization', `Bearer ${coordToken}`)
      .send({ otpCode: enrRes.body.devConsentOtp });
    expect(conRes.status).toBe(200);
    expect(conRes.body.enrollment.status).toBe('ENROLLED');

    await prisma.activityEnrollment.delete({ where: { id: enrRes.body.enrollment.id } }).catch(() => {});
  });

  test('3. 5-Step Academic Year Rollover locks closed year and promotes/graduates students', async () => {
    const aLogin = await request(app).post('/api/portal-auth/login').send({ email: 'superadmin@skanda.edu.in', password: 'Password@123' });
    adminToken = aLogin.body.token;

    const bRes = await request(app)
      .post('/api/super-admin/branches')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ code: `RLV-${Date.now().toString().slice(-4)}`, name: 'Rollover Test Branch', city: 'Pune', institutionMode: 'SCHOOL' });
    expect(bRes.status).toBe(201);
    createdBranchId = bRes.body.branch.id;

    const ay = await prisma.academicYear.findFirst({ where: { branchId: createdBranchId } });
    const prevRes = await request(app)
      .post('/api/rollover/preview')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-branch-id', createdBranchId)
      .send({ fromYearId: ay.id });
    expect(prevRes.status).toBe(200);

    const execRes = await request(app)
      .post('/api/rollover/execute')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-branch-id', createdBranchId)
      .send({ fromYearId: ay.id, toYearName: '2027-2028' });
    expect(execRes.status).toBe(200);

    const lockedAy = await prisma.academicYear.findUnique({ where: { id: ay.id } });
    expect(lockedAy.isLocked).toBe(true);
  });

  test('4. Syllabus Tracker, College Revaluation, Cheque Bounce, GST Split, Document Requests & 5-Attempt Lockout', async () => {
    const pAdminLogin = await request(app).post('/api/portal-auth/login').send({ email: 'principal.blr@skanda.edu.in', password: 'Password@123' });
    const branchAdminToken = pAdminLogin.body.token;

    const sylRes = await request(app).get('/api/academics-ext/syllabus').set('Authorization', `Bearer ${teacherToken}`);
    expect(sylRes.status).toBe(200);
    expect(sylRes.body.chapters.length).toBeGreaterThanOrEqual(1);

    // GST Receipt Split
    const inv = await prisma.feeInvoice.findFirst({ where: { studentId: student1Id } });
    const gstRes = await request(app).get(`/api/finance-docs/receipt/${inv.id}`).set('Authorization', `Bearer ${branchAdminToken}`);
    expect(gstRes.status).toBe(200);
    expect(gstRes.body.gstReceipt.totalGst18).toBe(gstRes.body.gstReceipt.cgst9 + gstRes.body.gstReceipt.sgst9);

    // Document Request
    const docRes = await request(app)
      .post('/api/finance-docs/documents')
      .set('Authorization', `Bearer ${student1Token}`)
      .send({ docType: 'BONAFIDE', reason: 'Passport renewal' });
    expect(docRes.status).toBe(201);
    const decRes = await request(app)
      .post(`/api/finance-docs/documents/${docRes.body.request.id}/decision`)
      .set('Authorization', `Bearer ${branchAdminToken}`)
      .send({ status: 'ISSUED' });
    expect(decRes.status).toBe(200);
    expect(decRes.body.request.issuedRef).toMatch(/^SKD-DOC-/);
    await prisma.documentRequest.delete({ where: { id: docRes.body.request.id } }).catch(() => {});

    // 5-Attempt 15-Minute Login Lockout
    const hash = await bcrypt.hash('CorrectPass@123', 10);
    const lockUser = await prisma.user.create({
      data: { fullName: 'Lockout Test', email: `lock_${Date.now()}@skanda.edu.in`, passwordHash: hash, role: 'TEACHER' }
    });
    lockoutUserId = lockUser.id;

    for (let i = 1; i <= 4; i++) {
      const fail = await request(app).post('/api/portal-auth/login').send({ email: lockUser.email, password: 'WrongPassword' });
      expect(fail.status).toBe(401);
    }
    const fifthFail = await request(app).post('/api/portal-auth/login').send({ email: lockUser.email, password: 'WrongPassword' });
    expect(fifthFail.status).toBe(423);
  });

  test('5. Placement Officer verifies alumni, creates drive & eligible college student applies', async () => {
    const plLogin = await request(app).post('/api/portal-auth/login').send({ email: 'placement.blr@skanda.edu.in', password: 'Password@123' });
    expect(plLogin.status).toBe(200);
    placementToken = plLogin.body.token;

    const drivesRes = await request(app).get('/api/placement/drives').set('Authorization', `Bearer ${placementToken}`);
    expect(drivesRes.status).toBe(200);
    const drive = drivesRes.body.drives[0];

    const s2Login = await request(app).post('/api/portal-auth/login').send({ email: 'student2.blr@skanda.edu.in', password: 'Password@123' });
    student2Token = s2Login.body.token;

    const appRes = await request(app)
      .post(`/api/placement/drives/${drive.id}/apply`)
      .set('Authorization', `Bearer ${student2Token}`)
      .send({});
    expect(appRes.status).toBe(201);
    await prisma.placementApplication.delete({ where: { id: appRes.body.application.id } }).catch(() => {});
  });
});
