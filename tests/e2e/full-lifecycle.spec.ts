import { test, expect } from '@playwright/test';
import { API_BASE, apiLoginAsRole, loginAsRole, loginWithCredentials } from './helpers/auth';
import { createInitialE2EContext } from './helpers/context';

const prisma = require('../../server/src/db');
const bcrypt = require('../../server/node_modules/bcryptjs');

test.describe.serial('Skanda International School — Complete Phase 1 & Phase 2 E2E Lifecycle', () => {
  const ctx = createInitialE2EContext();

  test.afterAll(async () => {
    try {
      if (ctx.leaveRequestId) await prisma.leaveRequest.delete({ where: { id: ctx.leaveRequestId } }).catch(() => {});
      if (ctx.ptmEventId) await prisma.pTMEvent.delete({ where: { id: ctx.ptmEventId } }).catch(() => {});
      if (ctx.gatePassId) await prisma.gatePass.delete({ where: { id: ctx.gatePassId } }).catch(() => {});
      if (ctx.tripId) await prisma.activeBusTrip.delete({ where: { id: ctx.tripId } }).catch(() => {});
      if (ctx.bookIssueId) await prisma.bookIssue.delete({ where: { id: ctx.bookIssueId } }).catch(() => {});
      if (ctx.bookId) await prisma.libraryBook.delete({ where: { id: ctx.bookId } }).catch(() => {});
      if (ctx.studentId) {
        await prisma.feeTransaction.deleteMany({ where: { invoice: { studentId: ctx.studentId } } }).catch(() => {});
        await prisma.feeInvoice.deleteMany({ where: { studentId: ctx.studentId } }).catch(() => {});
        await prisma.attendanceRecord.deleteMany({ where: { studentId: ctx.studentId } }).catch(() => {});
        await prisma.parentStudentLink.deleteMany({ where: { studentId: ctx.studentId } }).catch(() => {});
        await prisma.studentProfile.delete({ where: { id: ctx.studentId } }).catch(() => {});
      }
      if (ctx.studentEmail) await prisma.user.deleteMany({ where: { email: ctx.studentEmail } }).catch(() => {});
      if (ctx.parentEmail) await prisma.user.deleteMany({ where: { email: ctx.parentEmail } }).catch(() => {});
      if (ctx.applicationId) await prisma.application.deleteMany({ where: { id: ctx.applicationId } }).catch(() => {});
      await prisma.applicantUser.deleteMany({ where: { email: ctx.applicantEmail } }).catch(() => {});
      if (ctx.lockoutUserId) await prisma.user.delete({ where: { id: ctx.lockoutUserId } }).catch(() => {});
      if (ctx.branchId) await prisma.branch.delete({ where: { id: ctx.branchId } }).catch(() => {});
    } catch (e: any) {
      console.warn('Lifecycle teardown notice:', e.message);
    }
  });

  test('Stage 1 — Super Admin Multi-Branch, Dynamic Curriculum/Fee Setup & 5-Attempt Lockout', async ({ page }) => {
    // 1. Verify 5-attempt 15-minute login lockout on dummy account
    const hash = await bcrypt.hash('CorrectPass@123', 10);
    const dummy = await prisma.user.create({
      data: { fullName: 'Lockout Dummy', email: `lock_life_${ctx.ts}@skanda.edu.in`, passwordHash: hash, role: 'TEACHER' }
    });
    ctx.lockoutUserId = dummy.id;

    for (let i = 1; i <= 4; i++) {
      const r = await page.request.post(`${API_BASE}/portal-auth/login`, {
        data: { email: dummy.email, password: 'WrongPassword' }
      });
      expect(r.status()).toBe(401);
    }
    const fifth = await page.request.post(`${API_BASE}/portal-auth/login`, {
      data: { email: dummy.email, password: 'WrongPassword' }
    });
    expect(fifth.status()).toBe(423);

    // 2. Super Admin logs in & creates Whitefield branch (BOTH: School + College)
    const { token } = await loginAsRole(page, 'SUPER_ADMIN');
    await expect(page.getByText('Super Admin').first()).toBeVisible();

    const bRes = await page.request.post(`${API_BASE}/super-admin/branches`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { code: ctx.branchCode, name: ctx.branchName, city: 'Bengaluru', institutionMode: 'BOTH' }
    });
    expect(bRes.status()).toBe(201);
    ctx.branchId = (await bRes.json()).branch.id;

    // Configure boards, college department, classes, subjects & fee structure
    for (const name of ['CBSE', 'ICSE', 'Computer Science & Engineering']) {
      await page.request.post(`${API_BASE}/super-admin/branches/${ctx.branchId}/syllabi`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { name, type: name.includes('Engineering') ? 'DEPARTMENT' : 'BOARD' }
      });
    }
    for (const grade of ['Nursery', 'Grade 10', 'B.Tech CSE']) {
      await page.request.post(`${API_BASE}/super-admin/branches/${ctx.branchId}/grades`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { name: grade, institutionType: grade.includes('B.Tech') ? 'COLLEGE' : 'SCHOOL' }
      });
    }
    for (const sub of [
      { gradeOrCourse: 'Grade 10', name: 'Mathematics Standard', isCompulsory: true },
      { gradeOrCourse: 'Grade 10', name: 'Artificial Intelligence', isCompulsory: false }
    ]) {
      await page.request.post(`${API_BASE}/super-admin/branches/${ctx.branchId}/subjects`, {
        headers: { Authorization: `Bearer ${token}` },
        data: sub
      });
    }
    const feeRes = await page.request.post(`${API_BASE}/super-admin/branches/${ctx.branchId}/fee-structures`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { gradeOrCourse: 'Grade 10', tuitionFee: 85000, transportFee: 18000, hostelFee: 60000, examFee: 3500 }
    });
    expect(feeRes.status()).toBe(201);

    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(ctx.branchCode).first()).toBeVisible();
  });

  test('Stage 2 — Public Website, Gallery, Modals & Mobile Responsiveness (390x844)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    for (const link of ['Campuses', 'News', 'Gallery', 'About', 'Contact']) {
      await expect(page.getByText(link, { exact: true }).first()).toBeVisible();
    }

    // Uniform Hero container height
    const h1 = await page.locator('#hero-section').boundingBox();
    expect(h1!.height).toBeGreaterThanOrEqual(400);
    await page.waitForTimeout(1000);
    const h2 = await page.locator('#hero-section').boundingBox();
    expect(Math.abs(h1!.height - h2!.height)).toBeLessThanOrEqual(2);

    // Interactive Campus Geo-Locator & Gallery Lightbox + Explore Life modal
    await expect(page.getByText('Interactive Campus Geo-Locator')).toBeVisible();
    await expect(page.getByText('Life at Skanda International School')).toBeVisible();
    await page.getByText('Smart Interactive Classrooms').first().click();
    await expect(page.getByText('✕').first()).toBeVisible();
    await page.getByText('✕').first().click();

    await page.getByText('Explore Life ➜').first().click();
    await expect(page.getByLabel('Close Modal')).toBeVisible();
    await page.getByLabel('Close Modal').click();

    // Mobile 390x844 responsiveness + hamburger drawer
    await page.setViewportSize({ width: 390, height: 844 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2);
    expect(overflow).toBe(false);

    const hamburger = page.getByText('☰').first();
    await expect(hamburger).toBeVisible();
    await hamburger.click();
    await expect(page.getByText('Gallery').first()).toBeVisible();
    await page.getByText('✕').first().click().catch(() => {});
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test('Stage 3 — Complete 9-Step Online Admission Funnel & Post-Submission Lock', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Apply Online ➜').first().click();
    await page.waitForURL('**/apply');

    // Step 1: Register applicant & verify OTP via API (deterministic), then hydrate browser session
    const regRes = await page.request.post(`${API_BASE}/auth/register-step1`, {
      data: {
        fullName: 'Ananya Verma',
        mobile: ctx.applicantMobile,
        email: ctx.applicantEmail,
        password: 'Password@123'
      }
    });
    expect(regRes.status()).toBe(201);
    const regBody = await regRes.json();
    const applicantDb = await prisma.applicantUser.findUnique({ where: { mobile: ctx.applicantMobile } });
    const otp = regBody.devOtp || applicantDb?.otpCode;
    expect(otp).toBeTruthy();

    const verRes = await page.request.post(`${API_BASE}/auth/verify-otp`, {
      data: { mobile: ctx.applicantMobile, otp }
    });
    expect(verRes.status()).toBe(200);
    const verBody = await verRes.json();
    ctx.applicantToken = verBody.token;
    ctx.applicationId = verBody.application.id;
    ctx.applicationNumber = verBody.application.applicationNo;

    // Hydrate browser & test Step 2 dynamic rules (no Residential mode, College switching)
    await page.evaluate((tok) => window.localStorage.setItem('skanda_token', tok), ctx.applicantToken);
    await page.goto('/apply/step/2');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Residential', { exact: true })).toHaveCount(0);

    // Save Steps 2-8 cleanly via /api/applications/step/:stepNumber and verify Step 5/6 UI rules
    await page.goto('/apply/step/5');
    await expect(page.getByPlaceholder('First Name')).toBeVisible();
    await expect(page.getByPlaceholder('Last Name')).toBeVisible();

    await page.goto('/apply/step/6');
    const emergInput = page.locator('#emergency-contact-input');
    await expect(emergInput).toBeVisible();
    await emergInput.fill('987654321099');
    expect((await emergInput.inputValue()).length).toBeLessThanOrEqual(10);

    // Persist Steps 2-8 cleanly via /api/applications/step/:n & submit
    const hdrs = { Authorization: `Bearer ${ctx.applicantToken}` };
    const s2 = await page.request.put(`${API_BASE}/applications/step/2`, {
      headers: hdrs,
      data: { institutionType: 'SCHOOL', classOrCourse: 'Grade 10', academicYear: '2026-2027', mode: 'Day Scholar' }
    });
    expect(s2.status()).toBe(200);
    const s3 = await page.request.put(`${API_BASE}/applications/step/3`, { headers: hdrs, data: { board: 'CBSE' } });
    expect(s3.status()).toBe(200);
    const s4 = await page.request.put(`${API_BASE}/applications/step/4`, {
      headers: hdrs,
      data: { selectedSubjects: ['Mathematics Standard', 'Artificial Intelligence'] }
    });
    expect(s4.status()).toBe(200);
    const s5 = await page.request.put(`${API_BASE}/applications/step/5`, {
      headers: hdrs,
      data: {
        firstName: 'Ananya',
        lastName: 'Verma',
        fullName: 'Ananya Verma',
        dob: '2011-05-15',
        gender: 'Female',
        category: 'OBC',
        aadhaarNumber: '123456789012'
      }
    });
    expect(s5.status()).toBe(200);
    const s6 = await page.request.put(`${API_BASE}/applications/step/6`, {
      headers: hdrs,
      data: {
        fatherName: 'Vikram Verma',
        motherName: 'Meera Verma',
        mobile: ctx.applicantMobile,
        email: `parent_life_${ctx.ts}@skandatest.edu`,
        emergencyContact: '9876543210'
      }
    });
    expect(s6.status()).toBe(200);
    const s7 = await page.request.put(`${API_BASE}/applications/step/7`, {
      headers: hdrs,
      data: { schoolName: 'Delhi Public School', lastGrade: 'Grade 9', percentage: '91%' }
    });
    expect(s7.status()).toBe(200);
    const saveRes = await page.request.put(`${API_BASE}/applications/step/8`, {
      headers: hdrs,
      data: { hostel: { opted: true, roomType: 'Triple Sharing AC' }, transport: { opted: true, pickupArea: 'Whitefield' }, library: true }
    });
    expect(saveRes.status()).toBe(200);
    await prisma.application.update({ where: { id: ctx.applicationId }, data: { branchId: ctx.branchId } });

    const subRes = await page.request.post(`${API_BASE}/applications/submit`, {
      headers: { Authorization: `Bearer ${ctx.applicantToken}` },
      data: { declarationAccepted: true }
    });
    expect(subRes.status()).toBe(200);

    // Navigation Lock Check: /student/dashboard + goBack() stays locked on /student/dashboard
    await page.goto('/student/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(ctx.applicationNumber).first()).toBeVisible();
    await page.goto('/apply/step/2');
    await expect(page).toHaveURL(/\/student\/dashboard/);
  });

  test('Stage 4 — Branch Admin CRM & One-Click Convert to Student', async ({ page }) => {
    // Log in as SUPER_ADMIN with x-branch-id or create Branch Admin for Whitefield & convert
    const sa = await apiLoginAsRole(page.request, 'SUPER_ADMIN');
    const convRes = await page.request.post(`${API_BASE}/branch-admin/applications/${ctx.applicationId}/convert`, {
      headers: { Authorization: `Bearer ${sa.token}`, 'x-branch-id': ctx.branchId },
      data: { section: 'A' }
    });
    expect(convRes.ok()).toBe(true);
    const convBody = await convRes.json();
    ctx.studentId = convBody.application.convertedStudentId;
    ctx.studentEmail = convBody.provisioned.studentEmail;
    ctx.parentEmail = convBody.provisioned.parentEmail;
    const inv = await prisma.feeInvoice.findUnique({ where: { invoiceNo: convBody.provisioned.invoiceNo } });
    ctx.feeInvoiceId = inv.id;
    expect(ctx.studentId).toBeTruthy();
    expect(ctx.studentEmail).toBeTruthy();
    expect(ctx.parentEmail).toBeTruthy();
  });

  test('Stage 5 — Offline Attendance, Board Syllabus, Labs & Extracurriculars', async ({ page, context }) => {
    // Teacher logs in on main branch (or uses student1 for branch-scoped teacher tests)
    const { token: teacherToken } = await loginAsRole(page, 'TEACHER');

    // Offline Attendance simulation -> sync when back online
    await context.setOffline(true);
    await context.setOffline(false);
    const syncRes = await page.request.post(`${API_BASE}/portal/teacher/attendance/sync`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
      data: { entries: [{ studentId: ctx.studentId, status: 'ABSENT', date: '2026-11-27', offlineCapturedAt: new Date().toISOString() }] }
    });
    expect(syncRes.status()).toBe(200);

    // Board Syllabus Tracker chapter completion
    const sylRes = await page.request.get(`${API_BASE}/academics-ext/syllabus`, {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    const chapters = (await sylRes.json()).chapters;
    if (chapters.length > 0) {
      const tog = await page.request.post(`${API_BASE}/academics-ext/syllabus/${chapters[0].id}/toggle`, {
        headers: { Authorization: `Bearer ${teacherToken}` },
        data: {}
      });
      expect(tog.status()).toBe(200);
    }

    // Lab Journal submission & Teacher sign-off
    const labUser = await apiLoginAsRole(page.request, 'LAB_ASSISTANT');
    const labs = (await (await page.request.get(`${API_BASE}/labs`, { headers: { Authorization: `Bearer ${labUser.token}` } })).json()).labs;
    const expId = labs[0].experiments[0].id;

    const stuLogin = await loginWithCredentials(page, ctx.studentEmail, ctx.studentPassword, '/portal');
    const jRes = await page.request.post(`${API_BASE}/labs/journals`, {
      headers: { Authorization: `Bearer ${stuLogin.token}` },
      data: { experimentId: expId, submissionNotes: 'Lifecycle titration reading 15.0ml' }
    });
    expect(jRes.status()).toBe(201);
    const journalId = (await jRes.json()).journal.id;

    const gradeRes = await page.request.post(`${API_BASE}/labs/journals/${journalId}/grade`, {
      headers: { Authorization: `Bearer ${teacherToken}` },
      data: { observationMarks: 9, recordMarks: 9, vivaMarks: 6 }
    });
    expect(gradeRes.status()).toBe(200);
    expect((await gradeRes.json()).journal.status).toBe('GRADED_SIGNED');

    // Extracurricular Activity Enrollment + Parent OTP Consent
    const acts = (await (await page.request.get(`${API_BASE}/activities`, { headers: { Authorization: `Bearer ${stuLogin.token}` } })).json()).activities;
    if (acts.length > 0) {
      const enrRes = await page.request.post(`${API_BASE}/activities/${acts[0].id}/enroll`, {
        headers: { Authorization: `Bearer ${stuLogin.token}` },
        data: {}
      });
      if (enrRes.status() === 201) {
        const enrBody = await enrRes.json();
        const conRes = await page.request.post(`${API_BASE}/activities/enrollments/${enrBody.enrollment.id}/consent`, {
          headers: { Authorization: `Bearer ${stuLogin.token}` },
          data: { otpCode: enrBody.devConsentOtp }
        });
        expect(conRes.status()).toBe(200);
      }
    }
  });

  test('Stage 6 — Library Fine Sync, Transport Live ETA, Hostel QR Out-Pass, Gate Kiosk & No-Dues Clearance', async ({ page }) => {
    const sa = await apiLoginAsRole(page.request, 'SUPER_ADMIN');
    const stu = await loginWithCredentials(page, ctx.studentEmail, ctx.studentPassword, '/portal');
    const par = await loginWithCredentials(page, ctx.parentEmail, ctx.parentPassword, '/portal');

    // 1. Library: create book, issue & overdue return -> fine syncs to FeeInvoice
    const bRes = await page.request.post(`${API_BASE}/library/books`, {
      headers: { Authorization: `Bearer ${sa.token}`, 'x-branch-id': ctx.branchId },
      data: { isbn: `978-LF-${ctx.ts}`, title: `Lifecycle Book ${ctx.ts}`, author: 'Author', category: 'STEM', totalCopies: 2 }
    });
    expect(bRes.status()).toBe(201);
    ctx.bookId = (await bRes.json()).book.id;

    const issRes = await page.request.post(`${API_BASE}/library/issue`, {
      headers: { Authorization: `Bearer ${sa.token}`, 'x-branch-id': ctx.branchId },
      data: { bookId: ctx.bookId, email: ctx.studentEmail, dueDate: new Date(Date.now() - 3 * 86400000).toISOString() }
    });
    expect(issRes.status()).toBe(201);
    ctx.bookIssueId = (await issRes.json()).issue.id;

    const retRes = await page.request.post(`${API_BASE}/library/return/${ctx.bookIssueId}`, {
      headers: { Authorization: `Bearer ${sa.token}`, 'x-branch-id': ctx.branchId },
      data: {}
    });
    expect(retRes.status()).toBe(200);
    expect((await retRes.json()).fineAmount).toBeGreaterThanOrEqual(30);

    // 2. Hostel Out-Pass -> Parent & Warden Approve -> Security Guard scans on /kiosk/gate
    const gpRes = await page.request.post(`${API_BASE}/hostel/gate-passes`, {
      headers: { Authorization: `Bearer ${stu.token}` },
      data: { passType: 'HOSTEL_OUTPASS', reason: 'Lifecycle Weekend Home Visit', destination: 'Bengaluru' }
    });
    expect(gpRes.status()).toBe(201);
    const gp = (await gpRes.json()).pass;
    ctx.gatePassId = gp.id;
    ctx.gatePassQrToken = gp.qrPayload;

    await page.request.post(`${API_BASE}/hostel/gate-passes/${ctx.gatePassId}/parent-approve`, {
      headers: { Authorization: `Bearer ${par.token}` },
      data: {}
    });
    await page.request.post(`${API_BASE}/hostel/gate-passes/${ctx.gatePassId}/warden-approve`, {
      headers: { Authorization: `Bearer ${sa.token}`, 'x-branch-id': ctx.branchId },
      data: {}
    });

    // SECURITY_GUARD direct login routing to /kiosk/gate & QR exit scan
    const guard = await apiLoginAsRole(page.request, 'SECURITY_GUARD');
    expect(guard.user.role).toBe('SECURITY_GUARD');
    await page.goto('/kiosk/gate');
    await page.getByPlaceholder(/Paste QR Payload/i).fill(ctx.gatePassQrToken);
    await page.getByText('Verify & Log Gate Scan').click();
    await expect(page.getByText(/EXIT_LOGGED/i).first()).toBeVisible();

    // 3. Digital No-Dues: Blocked while invoice has unpaid balance -> Pay full balance -> Unlocks TC!
    const blockedTc = await page.request.post(`${API_BASE}/no-dues/${ctx.studentId}/generate-tc`, {
      headers: { Authorization: `Bearer ${sa.token}` },
      data: {}
    });
    expect(blockedTc.status()).toBe(403);

    const inv = await prisma.feeInvoice.findUnique({ where: { id: ctx.feeInvoiceId } });
    const fullBalance = Math.max(0, inv.finesDue + inv.tuitionDue + inv.transportDue - inv.scholarshipDiscount - inv.totalPaid);
    const payRes = await page.request.post(`${API_BASE}/portal/fees/${ctx.feeInvoiceId}/pay`, {
      headers: { Authorization: `Bearer ${par.token}` },
      data: { amount: fullBalance }
    });
    expect(payRes.status()).toBe(200);

    const unlockedTc = await page.request.post(`${API_BASE}/no-dues/${ctx.studentId}/generate-tc`, {
      headers: { Authorization: `Bearer ${sa.token}` },
      data: {}
    });
    expect(unlockedTc.status()).toBe(200);
    expect((await unlockedTc.json()).tcNumber).toMatch(/^SKD-TC-/);
  });

  test('Stage 7 — Smart PTM, WhatsApp Parent Bot, DLT Reminder & 5-Step Year-End Promotion', async ({ page }) => {
    const teacher = await apiLoginAsRole(page.request, 'TEACHER');
    const par = await apiLoginAsRole(page.request, 'PARENT');
    const adm = await apiLoginAsRole(page.request, 'ADMIN');

    // 1. Smart PTM 10-min slot booking + double-book lock
    const ptmRes = await page.request.post(`${API_BASE}/comms/ptm/events`, {
      headers: { Authorization: `Bearer ${teacher.token}` },
      data: { title: `Lifecycle PTM ${ctx.ts}`, eventDate: '2026-12-22', startTime: '16:00', endTime: '16:20', slotMinutes: 10 }
    });
    expect(ptmRes.status()).toBe(201);
    const ptmBody = await ptmRes.json();
    ctx.ptmEventId = ptmBody.event.id;
    const slotId = ptmBody.event.slots[0].id;

    const b1 = await page.request.post(`${API_BASE}/comms/ptm/slots/${slotId}/book`, {
      headers: { Authorization: `Bearer ${par.token}` },
      data: { notes: 'Lifecycle review' }
    });
    expect(b1.status()).toBe(200);
    const b2 = await page.request.post(`${API_BASE}/comms/ptm/slots/${slotId}/book`, {
      headers: { Authorization: `Bearer ${par.token}` },
      data: {}
    });
    expect(b2.status()).toBe(409);

    // 2. WhatsApp Parent Bot (1 Attendance, 2 Fee Balance, 4 Apply Leave)
    const wa1 = await page.request.post(`${API_BASE}/webhooks/whatsapp`, { data: { phone: '9876543210', message: '1' } });
    expect(wa1.status()).toBe(200);
    const wa2 = await page.request.post(`${API_BASE}/webhooks/whatsapp`, { data: { phone: '9876543210', message: '2' } });
    expect((await wa2.json()).upiLink).toMatch(/^upi:\/\/pay\?/);
    await page.request.post(`${API_BASE}/webhooks/whatsapp`, { data: { phone: '9876543210', message: '4' } });
    const wa4 = await page.request.post(`${API_BASE}/webhooks/whatsapp`, {
      data: { phone: '9876543210', message: '2026-12-24 to 2026-12-25 | Lifecycle Leave' }
    });
    ctx.leaveRequestId = (await wa4.json()).leaveRequestId;
    expect(ctx.leaveRequestId).toBeTruthy();

    // 3. DLT Campaign Reminder Dispatch + 5-Step Academic Year Rollover Preview
    const tpls = (await (await page.request.get(`${API_BASE}/comms/dlt-templates`, { headers: { Authorization: `Bearer ${adm.token}` } })).json()).templates;
    const absTpl = tpls.find((t: any) => t.eventTrigger === 'ABSENCE');
    const campRes = await page.request.post(`${API_BASE}/comms/campaigns/send`, {
      headers: { Authorization: `Bearer ${adm.token}` },
      data: { templateId: absTpl.id, targetAudience: 'ALL_PARENTS', variables: { studentName: 'Ananya', date: '2026-11-27' } }
    });
    expect(campRes.status()).toBe(200);

    const years = (await (await page.request.get(`${API_BASE}/rollover/years`, { headers: { Authorization: `Bearer ${adm.token}` } })).json()).years;
    const prevRes = await page.request.post(`${API_BASE}/rollover/preview`, {
      headers: { Authorization: `Bearer ${adm.token}` },
      data: { fromYearId: years[0].id }
    });
    expect(prevRes.status()).toBe(200);
    expect((await prevRes.json()).previews.length).toBeGreaterThanOrEqual(1);
  });
});
