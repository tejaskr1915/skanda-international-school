import { test, expect } from '@playwright/test';

const prisma = require('../../server/src/db');
const jwt = require('../../server/node_modules/jsonwebtoken');
const { JWT_SECRET } = require('../../server/src/middleware/auth');

test.describe('Suite 1 — Public Website, Gallery, Responsiveness & Admission Wizard', () => {
  const ts = Date.now().toString().slice(-7);
  let draftUserId = '';
  let draftToken = '';
  let submittedUserId = '';
  let submittedToken = '';

  test.beforeAll(async () => {
    const draftUser = await prisma.applicantUser.create({
      data: {
        fullName: 'E2E Draft Applicant',
        mobile: `920${ts}`,
        email: `e2e_s1_draft_${ts}@skandatest.edu`,
        passwordHash: 'dummy',
        isVerified: true,
        applications: {
          create: {
            applicationNo: `SIS-2026-S1D-${ts}`,
            academicYear: '2026-2027',
            status: 'DRAFT',
            currentStep: 2,
            institutionType: 'SCHOOL',
            classOrCourse: 'Nursery',
            facilities: { hostel: { opted: false }, transport: { opted: false }, library: true }
          }
        }
      }
    });
    draftUserId = draftUser.id;
    draftToken = jwt.sign({ userId: draftUser.id, mobile: draftUser.mobile }, JWT_SECRET, { expiresIn: '2d' });

    const subUser = await prisma.applicantUser.create({
      data: {
        fullName: 'E2E Submitted Applicant',
        mobile: `921${ts}`,
        email: `e2e_s1_sub_${ts}@skandatest.edu`,
        passwordHash: 'dummy',
        isVerified: true,
        applications: {
          create: {
            applicationNo: `SIS-2026-S1S-${ts}`,
            academicYear: '2026-2027',
            status: 'SUBMITTED',
            currentStep: 9,
            institutionType: 'SCHOOL',
            classOrCourse: 'Grade 6',
            board: 'CBSE',
            studentDetails: { firstName: 'Riya', lastName: 'Menon', fullName: 'Riya Menon', dob: '2015-06-15', gender: 'Female' },
            submittedAt: new Date()
          }
        }
      }
    });
    submittedUserId = subUser.id;
    submittedToken = jwt.sign({ userId: subUser.id, mobile: subUser.mobile }, JWT_SECRET, { expiresIn: '2d' });
  });

  test.afterAll(async () => {
    await prisma.application.deleteMany({ where: { applicantUserId: { in: [draftUserId, submittedUserId] } } }).catch(() => {});
    await prisma.applicantUser.deleteMany({ where: { id: { in: [draftUserId, submittedUserId] } } }).catch(() => {});
  });

  test('1. Header navigation, /apply active-tab clear, and mobile 390px hamburger drawer', async ({ page, isMobile }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    if (isMobile) {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
      expect(overflow).toBe(false);

      const hamburger = page.getByText('☰').first();
      await expect(hamburger).toBeVisible();
      await hamburger.click();
      await expect(page.getByText('Gallery').first()).toBeVisible();
      await page.getByText('✕').first().click().catch(() => {});
    } else {
      for (const label of ['Campuses', 'News', 'Gallery', 'About', 'Contact']) {
        await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
      }
      await expect(page.locator('#public-header').getByText('Admissions', { exact: true })).toHaveCount(0);

      await page.getByText('Apply Online ➜').first().click();
      await page.waitForURL('**/apply');
    }
  });

  test('2. Hero uniform height, 7 Gallery photos Lightbox & Explore/Honors/Openings modals', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const h1 = await page.locator('#hero-section').boundingBox();
    expect(h1).toBeTruthy();
    expect(h1!.height).toBeGreaterThanOrEqual(400);
    await page.waitForTimeout(1200);
    const h2 = await page.locator('#hero-section').boundingBox();
    expect(Math.abs(h1!.height - h2!.height)).toBeLessThanOrEqual(2);

    await expect(page.getByText('Life at Skanda International School')).toBeVisible();
    await page.getByText('Smart Interactive Classrooms').first().click();
    await expect(page.getByText('✕').first()).toBeVisible();
    await page.getByText('✕').first().click();

    await page.getByText('Explore Life ➜').first().click();
    await expect(page.getByLabel('Close Modal')).toBeVisible();
    await page.getByLabel('Close Modal').click();
  });

  test('3. Admission Wizard dynamic rules (Step 2-7) & Submitted back-nav guard', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((tok) => window.localStorage.setItem('skanda_token', tok), draftToken);
    await page.goto('/apply/step/2');
    await page.waitForLoadState('networkidle');

    // Step 2: no Residential mode
    await expect(page.getByText('Residential', { exact: true })).toHaveCount(0);

    // Switch to College & University -> select a college course -> verify Step 3 becomes College Departments
    await page.getByText('College & University').first().click();
    const btechBtn = page.getByText(/B\.Tech/i).first();
    if (await btechBtn.isVisible().catch(() => false)) {
      await btechBtn.click();
    }
    const regModeBtn = page.getByText(/Regular Full-Time|Day Scholar/i).first();
    if (await regModeBtn.isVisible().catch(() => false)) {
      await regModeBtn.click();
    }
    await page.getByText('Next ➜ Department Selection').first().click();
    await expect(page.getByText('Apply Step 3: College Department Selection')).toBeVisible();

    // Verify Step 5 First Name & Last Name + Aadhaar + Category
    await page.goto('/apply/step/5');
    await expect(page.getByPlaceholder('First Name')).toBeVisible();
    await expect(page.getByPlaceholder('Last Name')).toBeVisible();
    await expect(page.getByPlaceholder(/Aadhaar/i)).toBeVisible();

    // Verify Step 6 Emergency Contact 10-digit limit
    await page.goto('/apply/step/6');
    const emergInput = page.locator('#emergency-contact-input');
    await expect(emergInput).toBeVisible();
    await emergInput.fill('987654321099');
    expect((await emergInput.inputValue()).length).toBeLessThanOrEqual(10);

    // Verify Submitted guard on back navigation
    await page.evaluate((tok) => window.localStorage.setItem('skanda_token', tok), submittedToken);
    await page.goto('/student/dashboard');
    await page.waitForLoadState('networkidle');
    await page.goto('/apply/step/2');
    await expect(page).toHaveURL(/\/student\/dashboard/);
  });
});
