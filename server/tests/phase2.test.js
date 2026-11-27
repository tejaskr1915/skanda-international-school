const request = require('supertest');
const app = require('../src/index');
const prisma = require('../src/db');

describe('Skanda International School - Phase 2 Sprint 1 Integration Tests', () => {
  let superToken = '';
  let adminToken = '';
  let accountantToken = '';
  let parentToken = '';
  let teacherToken = '';
  let createdBranchId = '';
  let testStudentId2 = '';

  afterAll(async () => {
    if (testStudentId2) {
      await prisma.attendanceRecord.deleteMany({
        where: { studentId: testStudentId2, date: '2026-11-26' }
      }).catch(() => {});
    }
    if (createdBranchId) {
      await prisma.branch.delete({ where: { id: createdBranchId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  test('1. Super Admin authenticates and creates a new Branch + Config', async () => {
    const loginRes = await request(app).post('/api/portal-auth/login').send({
      email: 'superadmin@skanda.edu.in',
      password: 'Password@123'
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.role).toBe('SUPER_ADMIN');
    superToken = loginRes.body.token;

    const uniqueCode = `TST-${Date.now().toString().slice(-4)}`;
    const branchRes = await request(app)
      .post('/api/super-admin/branches')
      .set('Authorization', `Bearer ${superToken}`)
      .send({
        code: uniqueCode,
        name: 'Skanda Test Campus',
        city: 'Mysuru',
        institutionMode: 'BOTH'
      });
    expect(branchRes.status).toBe(201);
    createdBranchId = branchRes.body.branch.id;

    const cfgRes = await request(app)
      .get(`/api/super-admin/branches/${createdBranchId}/config`)
      .set('Authorization', `Bearer ${superToken}`);
    expect(cfgRes.status).toBe(200);
    expect(cfgRes.body.config.branch.code).toBe(uniqueCode);
  });

  test('2. Scoped Sub-Admin RBAC Guard allows Fees read but blocks Exams', async () => {
    const accLogin = await request(app).post('/api/portal-auth/login').send({
      email: 'accountant.blr@skanda.edu.in',
      password: 'Password@123'
    });
    expect(accLogin.status).toBe(200);
    accountantToken = accLogin.body.token;

    const feesRes = await request(app)
      .get('/api/branch-admin/fees')
      .set('Authorization', `Bearer ${accountantToken}`);
    expect(feesRes.status).toBe(200);

    const examsRes = await request(app)
      .get('/api/branch-admin/exams')
      .set('Authorization', `Bearer ${accountantToken}`);
    expect(examsRes.status).toBe(403);
  });

  test('3. Branch Admin fetches Executive KPIs and Teacher Leave Auto-Sub recommendations', async () => {
    const adminLogin = await request(app).post('/api/portal-auth/login').send({
      email: 'principal.blr@skanda.edu.in',
      password: 'Password@123'
    });
    expect(adminLogin.status).toBe(200);
    adminToken = adminLogin.body.token;

    const kpiRes = await request(app)
      .get('/api/branch-admin/kpis')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(kpiRes.status).toBe(200);
    expect(kpiRes.body.kpis.totalStudents).toBeGreaterThanOrEqual(2);

    const leavesRes = await request(app)
      .get('/api/branch-admin/leaves')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(leavesRes.status).toBe(200);
    const pendingTeacherLeave = leavesRes.body.leaves.find((l) => l.requesterType === 'TEACHER');
    if (pendingTeacherLeave) {
      const subRes = await request(app)
        .get(`/api/branch-admin/leaves/${pendingTeacherLeave.id}/substitute-recommendations`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(subRes.status).toBe(200);
      expect(Array.isArray(subRes.body.recommendedTeachers)).toBe(true);
    }
  });

  test('4. Priority Fee Allocation allocates Fines -> Tuition -> Transport', async () => {
    const feesRes = await request(app)
      .get('/api/branch-admin/fees')
      .set('Authorization', `Bearer ${adminToken}`);
    const inv = feesRes.body.invoices.find((i) => i.finesDue > 0);
    if (inv) {
      const payAmt = inv.finesDue + 2000;
      const payRes = await request(app)
        .post(`/api/branch-admin/fees/${inv.id}/pay`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: payAmt });
      expect(payRes.status).toBe(200);
      expect(payRes.body.transaction.allocatedToFines).toBe(inv.finesDue);
      expect(payRes.body.transaction.allocatedToTuition).toBe(2000);
      expect(payRes.body.transaction.allocatedToTransport).toBe(0);
    }
  });

  test('5. Parent Multi-Child Switcher & 75% College Attendance Shortage Alert', async () => {
    const pLogin = await request(app).post('/api/portal-auth/login').send({
      email: 'parent.blr@skanda.edu.in',
      password: 'Password@123'
    });
    expect(pLogin.status).toBe(200);
    expect(pLogin.body.user.children.length).toBeGreaterThanOrEqual(2);
    parentToken = pLogin.body.token;

    const collegeChild = pLogin.body.user.children.find((c) => c.institutionType === 'COLLEGE');
    expect(collegeChild).toBeTruthy();
    testStudentId2 = collegeChild.studentId;

    const viewRes = await request(app)
      .get(`/api/portal/student-view?studentId=${testStudentId2}`)
      .set('Authorization', `Bearer ${parentToken}`);
    expect(viewRes.status).toBe(200);
    expect(viewRes.body.attendance.isShortageAlert).toBe(true);
  });

  test('6. Teacher Offline-Cached Attendance Batch Sync succeeds', async () => {
    const tLogin = await request(app).post('/api/portal-auth/login').send({
      email: 'teacher.blr@skanda.edu.in',
      password: 'Password@123'
    });
    expect(tLogin.status).toBe(200);
    teacherToken = tLogin.body.token;

    const syncRes = await request(app)
      .post('/api/portal/teacher/attendance/sync')
      .set('Authorization', `Bearer ${teacherToken}`)
      .send({
        entries: [
          {
            studentId: testStudentId2,
            status: 'PRESENT',
            date: '2026-11-26',
            offlineCapturedAt: new Date().toISOString()
          }
        ]
      });
    expect(syncRes.status).toBe(200);
    expect(syncRes.body.syncedCount).toBe(1);
  });
});
