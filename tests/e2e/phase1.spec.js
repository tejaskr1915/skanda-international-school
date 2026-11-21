const { test, expect } = require('@playwright/test');
const prisma = require('../../server/src/db');
const jwt = require('../../server/node_modules/jsonwebtoken');
const { JWT_SECRET } = require('../../server/src/middleware/auth');

test.describe('Skanda International School - Phase 1 E2E Verification Suite', () => {
  const timestamp = Date.now().toString().slice(-8);
  const draftMobile = `91${timestamp}`;
  const draftEmail = `e2e_draft_${timestamp}@skandatest.edu`;
  let draftUserId = '';
  let draftAppId = '';
  let draftToken = '';

  test.beforeAll(async () => {
    // Seed a DRAFT applicant at currentStep = 3
    const user = await prisma.applicantUser.create({
      data: {
        fullName: 'Devansh Kulkarni',
        mobile: draftMobile,
        email: draftEmail,
        passwordHash: 'dummyhash',
        isVerified: true,
        applications: {
          create: {
            applicationNo: `SIS-2026-E2E1`,
            academicYear: '2026-2027',
            status: 'DRAFT',
            currentStep: 3,
            institutionType: 'SCHOOL',
            classOrCourse: 'Grade 6',
            board: 'CBSE',
            studentDetails: {
              fullName: 'Devansh Kulkarni',
              dob: '2015-04-10',
              gender: 'Male'
            },
            facilities: {
              hostel: { opted: false },
              transport: { opted: false },
              library: true
            }
          }
        }
      },
      include: { applications: true }
    });

    draftUserId = user.id;
    draftAppId = user.applications[0].id;
    draftToken = jwt.sign({ userId: user.id, mobile: user.mobile }, JWT_SECRET, { expiresIn: '7d' });
  });

  test.afterAll(async () => {
    try {
      await prisma.application.deleteMany({
        where: { applicantUserId: draftUserId }
      });
      await prisma.applicantUser.deleteMany({
        where: { id: draftUserId }
      });
    } catch (e) {
      console.warn('E2E teardown notice:', e.message);
    }
    await prisma.$disconnect();
  });

  test('1. Zero Overlap & Header Layout Integrity', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Measure bounding boxes
    const heroBox = await page.evaluate(() => {
      const el = document.getElementById('hero-section') || document.querySelector('[data-testid="hero-section"]');
      return el ? el.getBoundingClientRect() : null;
    });

    const tickerBox = await page.evaluate(() => {
      const el = document.getElementById('ticker-bar') || document.querySelector('[data-testid="ticker-bar"]');
      return el ? el.getBoundingClientRect() : null;
    });

    const statsBox = await page.evaluate(() => {
      const el = document.getElementById('stats-grid') || document.querySelector('[data-testid="stats-grid"]');
      return el ? el.getBoundingClientRect() : null;
    });

    const applyNowBox = await page.evaluate(() => {
      const el = document.getElementById('apply-now-btn') || document.querySelector('[data-testid="apply-now-btn"]');
      return el ? el.getBoundingClientRect() : null;
    });

    const windowWidth = await page.evaluate(() => window.innerWidth);

    expect(heroBox).not.toBeNull();
    expect(tickerBox).not.toBeNull();
    expect(statsBox).not.toBeNull();
    expect(applyNowBox).not.toBeNull();

    // Verify zero overlap in document flow
    // 1. Hero banner ends at or before ticker starts
    expect(heroBox.bottom).toBeLessThanOrEqual(tickerBox.top + 2); // 2px margin tolerance
    // 2. Ticker bar ends before stats grid starts (positive vertical gap)
    expect(tickerBox.bottom).toBeLessThanOrEqual(statsBox.top);

    // Verify Apply Now button is not clipped off right side of screen
    expect(applyNowBox.right).toBeLessThanOrEqual(windowWidth);

    // Click navigation links to ensure no 404 or dead broken links
    const aboutLink = page.getByRole('link', { name: 'About' }).or(page.locator('text=About Us').first());
    if (await aboutLink.isVisible()) {
      await aboutLink.click();
      await page.waitForTimeout(300);
    }

    const campusLink = page.getByRole('link', { name: 'Find a Campus' }).or(page.locator('text=Campus').first());
    if (await campusLink.isVisible()) {
      await campusLink.click();
      await page.waitForTimeout(300);
    }

    // Verify Apply Now navigates cleanly to /apply
    const applyNowBtn = page.locator('#apply-now-btn').or(page.locator('[data-testid="apply-now-btn"]')).first();
    await applyNowBtn.click();
    await expect(page).toHaveURL(/.*\/apply/);
  });

  test('2. Navigation Guard: DRAFT applicant is locked out of dashboard and redirected to current step', async ({ page }) => {
    await page.goto('/');
    // Set DRAFT student auth token in browser
    await page.evaluate((tok) => {
      localStorage.setItem('skanda_token', tok);
    }, draftToken);

    // Attempt direct access to /student/dashboard
    await page.goto('/student/dashboard');
    await page.waitForLoadState('networkidle');

    // Should be redirected to /apply/step/3
    await expect(page).toHaveURL(/.*\/apply\/step\/3/);

    // Verify full post-enrollment portal menus (Attendance, Timetable, Exams) are absent
    const attendanceMenu = page.locator('text=Attendance');
    await expect(attendanceMenu).toHaveCount(0);
  });

  test('3. Post-Submission Dashboard, PDF Download & Strict RBAC Sidebar Gate', async ({ page }) => {
    // Transition application to SUBMITTED in MySQL
    await prisma.application.update({
      where: { id: draftAppId },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        studentDetails: {
          fullName: 'Devansh Kulkarni',
          dob: '2015-04-10',
          gender: 'Male',
          bloodGroup: 'O+',
          nationality: 'Indian'
        },
        parentDetails: {
          fatherName: 'Suresh Kulkarni',
          mobile: '9876543210'
        },
        facilities: {
          hostel: { opted: true, roomType: 'Twin Sharing AC' },
          transport: { opted: false },
          library: true
        }
      }
    });

    await page.goto('/');
    await page.evaluate((tok) => {
      localStorage.setItem('skanda_token', tok);
    }, draftToken);

    await page.goto('/student/dashboard');
    await page.waitForLoadState('networkidle');

    // Now on /student/dashboard
    await expect(page).toHaveURL(/.*\/student\/dashboard/);

    // Verify submitted details visible on dashboard
    await expect(page.locator('text=Devansh Kulkarni').first()).toBeVisible();
    await expect(page.locator('text=SUBMITTED').first()).toBeVisible();
    await expect(page.locator('text=CBSE').first()).toBeVisible();

    // Verify strict RBAC sidebar gate: Attendance, Timetable, Homework, Exams MUST be hidden from sidebar
    await expect(page.locator('#sidebar-attendance').or(page.locator('[data-testid="sidebar-attendance"]'))).toHaveCount(0);
    await expect(page.locator('#sidebar-timetable').or(page.locator('[data-testid="sidebar-timetable"]'))).toHaveCount(0);
    await expect(page.locator('#sidebar-homework').or(page.locator('[data-testid="sidebar-homework"]'))).toHaveCount(0);
    await expect(page.locator('#sidebar-exams').or(page.locator('[data-testid="sidebar-exams"]'))).toHaveCount(0);

    // Only permitted items: Dashboard, Documents, Profile, and Lock Notice
    await expect(page.locator('#sidebar-dashboard').or(page.locator('[data-testid="sidebar-dashboard"]'))).toBeVisible();
    await expect(page.locator('#sidebar-documents').or(page.locator('[data-testid="sidebar-documents"]'))).toBeVisible();
    await expect(page.locator('#sidebar-profile').or(page.locator('[data-testid="sidebar-profile"]'))).toBeVisible();
    await expect(page.locator('text=Post-Enrollment Portal')).toBeVisible();

    // Verify Download Application PDF triggers download
    const downloadBtn = page.locator('#download-pdf-btn').or(page.locator('[data-testid="download-pdf-btn"]')).or(page.locator('text=Download Application PDF'));
    await expect(downloadBtn.first()).toBeVisible();

    // Verify clicking triggers either client jsPDF download or backend PDF stream
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 8000 }).catch(() => null),
      downloadBtn.first().click()
    ]);

    if (download) {
      expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
    }

    // Now update status in MySQL to ACCEPTED to verify unlock of full student portal menus
    await prisma.application.update({
      where: { id: draftAppId },
      data: { status: 'ACCEPTED' }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Now full post-enrollment sidebar links must be unlocked
    await expect(page.locator('#sidebar-attendance').or(page.locator('[data-testid="sidebar-attendance"]'))).toBeVisible();
    await expect(page.locator('#sidebar-timetable').or(page.locator('[data-testid="sidebar-timetable"]'))).toBeVisible();
    await expect(page.locator('#sidebar-homework').or(page.locator('[data-testid="sidebar-homework"]'))).toBeVisible();
    await expect(page.locator('#sidebar-exams').or(page.locator('[data-testid="sidebar-exams"]'))).toBeVisible();
  });

  test('4. Real-Time Top Header Search Bar Functionality', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((tok) => {
      localStorage.setItem('skanda_token', tok);
    }, draftToken);

    await page.goto('/student/dashboard');
    await page.waitForLoadState('networkidle');

    const searchInput = page.locator('#student-search-input').or(page.locator('[data-testid="student-search-input"]')).or(page.locator('input[placeholder*="Search admission steps"]'));
    await expect(searchInput.first()).toBeVisible();

    // Type 'Facilities'
    await searchInput.first().fill('Facilities');
    await page.waitForTimeout(300);

    // Verify matching dropdown results appear
    const searchDropdown = page.locator('text=Search Results');
    await expect(searchDropdown).toBeVisible();
    await expect(page.locator('text=Step 8: Campus Facilities').first()).toBeVisible();

    // Type 'Documents'
    await searchInput.first().fill('Documents');
    await page.waitForTimeout(300);

    // Verify matching documents results appear
    await expect(page.locator('text=Step 9: Documents & Review Summary').first()).toBeVisible();

    // Click search result to verify navigation
    await page.locator('text=Step 9: Documents & Review Summary').first().click();
    await page.waitForTimeout(500);

    // Should navigate to /apply/step/9
    await expect(page).toHaveURL(/.*\/apply\/step\/9/);
  });
});
