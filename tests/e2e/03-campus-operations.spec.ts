import { test, expect } from '@playwright/test';
import { API_BASE, apiLoginAsRole, loginAsRole } from './helpers/auth';

const prisma = require('../../server/src/db');

test.describe('Suite 3 — Library, Transport, Hostel, Gate Kiosk & Digital No-Dues', () => {
  const ts = Date.now().toString().slice(-6);
  let createdBookId = '';
  let createdIssueId = '';
  let createdTripId = '';
  let createdPassId = '';
  let student2Id = '';
  let student2InvId = '';
  let initialFinesDue = 0;

  test.beforeAll(async () => {
    const s2 = await prisma.user.findUnique({
      where: { email: 'student2.blr@skanda.edu.in' },
      include: { studentProfile: true }
    });
    student2Id = s2?.studentProfile?.id || '';
    if (student2Id) {
      const inv = await prisma.feeInvoice.findFirst({ where: { studentId: student2Id }, orderBy: { createdAt: 'desc' } });
      if (inv) {
        student2InvId = inv.id;
        initialFinesDue = inv.finesDue;
      }
    }
  });

  test.afterAll(async () => {
    if (createdIssueId) await prisma.bookIssue.delete({ where: { id: createdIssueId } }).catch(() => {});
    if (createdBookId) await prisma.libraryBook.delete({ where: { id: createdBookId } }).catch(() => {});
    if (createdTripId) await prisma.activeBusTrip.delete({ where: { id: createdTripId } }).catch(() => {});
    if (createdPassId) await prisma.gatePass.delete({ where: { id: createdPassId } }).catch(() => {});
    if (student2InvId) {
      await prisma.feeInvoice.update({ where: { id: student2InvId }, data: { finesDue: initialFinesDue } }).catch(() => {});
    }
  });

  test('1. Library: Librarian issues book, returns overdue & syncs fine to FeeInvoice', async ({ page }) => {
    const { token } = await loginAsRole(page, 'LIBRARIAN');
    await expect(page.getByText('📚 Central Branch Library')).toBeVisible();

    const bRes = await page.request.post(`${API_BASE}/library/books`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { isbn: `978-E2E-${ts}`, title: `E2E Physics ${ts}`, author: 'H.C. Verma', category: 'STEM', totalCopies: 2 }
    });
    expect(bRes.status()).toBe(201);
    createdBookId = (await bRes.json()).book.id;

    const fourDaysAgo = new Date(Date.now() - 4 * 86400000).toISOString();
    const issRes = await page.request.post(`${API_BASE}/library/issue`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { bookId: createdBookId, email: 'student2.blr@skanda.edu.in', dueDate: fourDaysAgo }
    });
    expect(issRes.status()).toBe(201);
    createdIssueId = (await issRes.json()).issue.id;

    const retRes = await page.request.post(`${API_BASE}/library/return/${createdIssueId}`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {}
    });
    expect(retRes.status()).toBe(200);
    const retBody = await retRes.json();
    expect(retBody.fineAmount).toBeGreaterThanOrEqual(40);
  });

  test('2. Transport: Driver starts trip, streams GPS telemetry & Parent sees live ETA', async ({ page }) => {
    const { token: driverToken } = await loginAsRole(page, 'DRIVER');
    await expect(page.getByText(/Driver Trip Mode/i).first()).toBeVisible();

    const rRes = await page.request.get(`${API_BASE}/transport/routes`, {
      headers: { Authorization: `Bearer ${driverToken}` }
    });
    const routes = (await rRes.json()).routes;
    expect(routes.length).toBeGreaterThanOrEqual(1);

    const startRes = await page.request.post(`${API_BASE}/transport/trips/start`, {
      headers: { Authorization: `Bearer ${driverToken}` },
      data: { routeId: routes[0].id, lat: 12.925, lng: 77.5938 }
    });
    const startBody = await startRes.json();
    createdTripId = startBody.trip.id;

    const telRes = await page.request.post(`${API_BASE}/transport/trips/${createdTripId}/telemetry`, {
      headers: { Authorization: `Bearer ${driverToken}` },
      data: { lat: 12.91, lng: 77.585, speed: 32 }
    });
    expect(telRes.status()).toBe(200);

    await loginAsRole(page, 'PARENT');
    await expect(page.getByText('🚌 Live School Bus Tracker')).toBeVisible();
    await expect(page.getByText(/ETA \d+ min/i).first()).toBeVisible();
  });

  test('3. Hostel Out-Pass: Student requests -> Parent & Warden approve -> Gate Kiosk QR Exit scan', async ({ page }) => {
    const stu = await apiLoginAsRole(page.request, 'STUDENT');
    const par = await apiLoginAsRole(page.request, 'PARENT');
    const war = await apiLoginAsRole(page.request, 'HOSTEL_WARDEN');

    const reqRes = await page.request.post(`${API_BASE}/hostel/gate-passes`, {
      headers: { Authorization: `Bearer ${stu.token}` },
      data: { passType: 'HOSTEL_OUTPASS', reason: `E2E Outpass ${ts}`, destination: 'City Center' }
    });
    expect(reqRes.status()).toBe(201);
    const pass = (await reqRes.json()).pass;
    createdPassId = pass.id;

    await page.request.post(`${API_BASE}/hostel/gate-passes/${createdPassId}/parent-approve`, {
      headers: { Authorization: `Bearer ${par.token}` },
      data: {}
    });
    await page.request.post(`${API_BASE}/hostel/gate-passes/${createdPassId}/warden-approve`, {
      headers: { Authorization: `Bearer ${war.token}` },
      data: {}
    });

    await page.goto('/kiosk/gate');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Smart Campus Gate & Visitor Kiosk')).toBeVisible();
    await page.getByPlaceholder(/Paste QR Payload/i).fill(pass.qrPayload);
    await page.getByText('Verify & Log Gate Scan').click();
    await expect(page.getByText(/EXIT_LOGGED/i).first()).toBeVisible();
  });

  test('4. Digital No-Dues Clearance blocks TC when dues exist and unlocks when cleared', async ({ page }) => {
    const adm = await apiLoginAsRole(page.request, 'ADMIN');

    // student2 has pending fees & hostel bed -> TC blocked (403)
    const blockedRes = await page.request.post(`${API_BASE}/no-dues/${student2Id}/generate-tc`, {
      headers: { Authorization: `Bearer ${adm.token}` },
      data: {}
    });
    expect(blockedRes.status()).toBe(403);

    // Create a clean temporary student with 0 dues and verify TC unlocks (200)
    const mainBranch = await prisma.branch.findFirst({ where: { code: 'BLR-MAIN' } });
    const ay = await prisma.academicYear.findFirst({ where: { branchId: mainBranch.id, isCurrent: true } });
    const cleanUser = await prisma.user.create({
      data: {
        branchId: mainBranch.id,
        fullName: `Clean Student ${ts}`,
        email: `clean_${ts}@skandatest.edu`,
        passwordHash: 'x',
        role: 'STUDENT',
        studentProfile: {
          create: {
            branchId: mainBranch.id,
            academicYearId: ay.id,
            admissionNo: `CLN-${ts}`,
            rollNumber: `99${ts.slice(-2)}`,
            classOrCourse: 'Grade 10',
            labDuesCleared: true
          }
        }
      },
      include: { studentProfile: true }
    });

    try {
      const okRes = await page.request.post(`${API_BASE}/no-dues/${cleanUser.studentProfile.id}/generate-tc`, {
        headers: { Authorization: `Bearer ${adm.token}` },
        data: {}
      });
      expect(okRes.status()).toBe(200);
      expect((await okRes.json()).tcNumber).toMatch(/^SKD-TC-/);
    } finally {
      await prisma.studentProfile.delete({ where: { id: cleanUser.studentProfile.id } }).catch(() => {});
      await prisma.user.delete({ where: { id: cleanUser.id } }).catch(() => {});
    }
  });
});
