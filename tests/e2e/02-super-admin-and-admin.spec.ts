import { test, expect } from '@playwright/test';
import { API_BASE, apiLoginAsRole, loginAsRole } from './helpers/auth';

const prisma = require('../../server/src/db');

test.describe('Suite 2 — Super Admin Multi-Branch, Branch Admin CRM & RBAC', () => {
  const ts = Date.now().toString().slice(-5);
  let createdBranchId = '';
  let testAppUserId = '';
  let testAppId = '';
  let convertedStudentId = '';

  test.beforeAll(async () => {
    const mainBranch = await prisma.branch.findFirst({ where: { code: 'BLR-MAIN' } });
    const ay = await prisma.academicYear.findFirst({ where: { branchId: mainBranch.id, isCurrent: true } });

    const appUser = await prisma.applicantUser.create({
      data: {
        fullName: 'Siddharth Nair',
        mobile: `930${ts}11`,
        email: `e2e_conv_${ts}@skandatest.edu`,
        passwordHash: 'dummy',
        isVerified: true,
        applications: {
          create: {
            applicationNo: `SKD-E2E-CONV-${ts}`,
            branchId: mainBranch.id,
            academicYearId: ay.id,
            academicYear: ay.name,
            status: 'SUBMITTED',
            currentStep: 9,
            institutionType: 'SCHOOL',
            classOrCourse: 'Grade 8',
            board: 'CBSE',
            studentDetails: { firstName: 'Siddharth', lastName: 'Nair', fullName: 'Siddharth Nair' },
            parentDetails: { fatherName: 'Mohan Nair', mobile: `930${ts}11`, email: `e2e_parent_${ts}@skandatest.edu` },
            submittedAt: new Date()
          }
        }
      },
      include: { applications: true }
    });
    testAppUserId = appUser.id;
    testAppId = appUser.applications[0].id;
  });

  test.afterAll(async () => {
    if (convertedStudentId) {
      await prisma.feeInvoice.deleteMany({ where: { studentId: convertedStudentId } }).catch(() => {});
      await prisma.parentStudentLink.deleteMany({ where: { studentId: convertedStudentId } }).catch(() => {});
      await prisma.studentProfile.delete({ where: { id: convertedStudentId } }).catch(() => {});
    }
    await prisma.user.deleteMany({ where: { email: { contains: ts } } }).catch(() => {});
    await prisma.application.deleteMany({ where: { id: testAppId } }).catch(() => {});
    await prisma.applicantUser.deleteMany({ where: { id: testAppUserId } }).catch(() => {});
    if (createdBranchId) {
      await prisma.branch.delete({ where: { id: createdBranchId } }).catch(() => {});
    }
  });

  test('1. Super Admin creates Branch, Subject & Fee Structure and verifies availability', async ({ page }) => {
    const { token } = await loginAsRole(page, 'SUPER_ADMIN');
    await expect(page.getByText('Super Admin').first()).toBeVisible();

    const code = `E2E-${ts}`;
    const bRes = await page.request.post(`${API_BASE}/super-admin/branches`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { code, name: `Skanda E2E Campus ${ts}`, city: 'Hubballi', institutionMode: 'BOTH' }
    });
    expect(bRes.status()).toBe(201);
    const bData = await bRes.json();
    createdBranchId = bData.branch.id;

    const subRes = await page.request.post(`${API_BASE}/super-admin/branches/${createdBranchId}/subjects`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { gradeOrCourse: 'Grade 10', name: 'Robotics & AI', isCompulsory: false }
    });
    expect(subRes.status()).toBe(201);

    const feeRes = await page.request.post(`${API_BASE}/super-admin/branches/${createdBranchId}/fee-structures`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { gradeOrCourse: 'Grade 10', tuitionFee: 92000, transportFee: 18000, hostelFee: 60000, examFee: 4000 }
    });
    expect(feeRes.status()).toBe(201);

    const pubRes = await page.request.get(`${API_BASE}/super-admin/branches`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    expect(pubRes.status()).toBe(200);
    const pubData = await pubRes.json();
    expect(pubData.branches.some((b: any) => b.id === createdBranchId && b.name === `Skanda E2E Campus ${ts}`)).toBe(true);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(code).first()).toBeVisible();
  });

  test('2. Branch Admin converts Submitted Application to Student + Parent + FeeInvoice', async ({ page }) => {
    await loginAsRole(page, 'ADMIN');
    await page.getByText('📝 Admissions CRM').first().click();
    await expect(page.getByText(`SKD-E2E-CONV-${ts}`).first()).toBeVisible();

    const convBtn = page.getByText('Convert to Student').first();
    await convBtn.click();
    await expect(page.getByText(/Student:.*Parent:/i).first()).toBeVisible({ timeout: 10000 });

    const updatedApp = await prisma.application.findUnique({ where: { id: testAppId } });
    expect(updatedApp.status).toBe('ENROLLED');
    convertedStudentId = updatedApp.convertedStudentId;
    expect(convertedStudentId).toBeTruthy();
  });

  test('3. RBAC Enforcement blocks LIBRARIAN & TEACHER from Super Admin and Fee Override routes', async ({ page }) => {
    const lib = await apiLoginAsRole(page.request, 'LIBRARIAN');
    const saRes = await page.request.get(`${API_BASE}/super-admin/branches`, {
      headers: { Authorization: `Bearer ${lib.token}` }
    });
    expect(saRes.status()).toBe(403);

    const teacher = await apiLoginAsRole(page.request, 'TEACHER');
    const feeRes = await page.request.post(`${API_BASE}/branch-admin/fees/override`, {
      headers: { Authorization: `Bearer ${teacher.token}` },
      data: { invoiceId: 'any', scholarshipDiscount: 5000 }
    });
    expect(feeRes.status()).toBe(403);

    await loginAsRole(page, 'TEACHER');
    await page.goto('/super-admin');
    await expect(page.getByText('Learning That Opens Every Door')).toBeVisible();
    await expect(page.getByText('Super Admin Control')).toHaveCount(0);
  });
});
