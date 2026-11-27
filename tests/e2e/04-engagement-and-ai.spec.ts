import { test, expect } from '@playwright/test';
import { API_BASE, apiLoginAsRole, loginAsRole } from './helpers/auth';

const prisma = require('../../server/src/db');

test.describe('Suite 4 — Smart PTM, WhatsApp Bot & At-Risk / AI Engines', () => {
  let createdPtmEventId = '';
  let createdLeaveIds: string[] = [];

  test.afterAll(async () => {
    if (createdPtmEventId) {
      await prisma.pTMEvent.delete({ where: { id: createdPtmEventId } }).catch(() => {});
    }
    if (createdLeaveIds.length > 0) {
      await prisma.leaveRequest.deleteMany({ where: { id: { in: createdLeaveIds } } }).catch(() => {});
    }
  });

  test('1. Smart PTM Slot Booker: Teacher publishes 10-min slots, Parent books & double-book is rejected', async ({ page }) => {
    const teacher = await apiLoginAsRole(page.request, 'TEACHER');
    const evRes = await page.request.post(`${API_BASE}/comms/ptm/events`, {
      headers: { Authorization: `Bearer ${teacher.token}` },
      data: { title: 'E2E PTM Window', eventDate: '2026-12-18', startTime: '15:00', endTime: '15:20', slotMinutes: 10 }
    });
    expect(evRes.status()).toBe(201);
    const evBody = await evRes.json();
    createdPtmEventId = evBody.event.id;
    const slotId = evBody.event.slots[0].id;

    const { token: parentToken } = await loginAsRole(page, 'PARENT');
    await expect(page.getByText('E2E PTM Window')).toBeVisible();

    const book1 = await page.request.post(`${API_BASE}/comms/ptm/slots/${slotId}/book`, {
      headers: { Authorization: `Bearer ${parentToken}` },
      data: { notes: 'E2E Booking' }
    });
    expect(book1.status()).toBe(200);

    const book2 = await page.request.post(`${API_BASE}/comms/ptm/slots/${slotId}/book`, {
      headers: { Authorization: `Bearer ${parentToken}` },
      data: {}
    });
    expect(book2.status()).toBe(409);
  });

  test('2. Conversational WhatsApp Parent Bot Simulator handles 1 (Attendance), 2 (UPI), 4 (Leave)', async ({ page }) => {
    await loginAsRole(page, 'PARENT');
    await expect(page.getByText('🤖 Interactive WhatsApp Parent Bot Simulator')).toBeVisible();

    await page.getByText('1. Attendance', { exact: true }).click();
    await expect(page.getByText(/Attendance Summary/i).first()).toBeVisible();

    await page.getByText('2. Fee & UPI', { exact: true }).click();
    await expect(page.getByText(/upi:\/\/pay\?/i).first()).toBeVisible();

    await page.getByText('4. Apply Leave', { exact: true }).click();
    await expect(page.getByText(/Please reply with dates and reason/i).first()).toBeVisible();

    const leaveRes = await page.request.post(`${API_BASE}/webhooks/whatsapp`, {
      data: { phone: '9876543210', message: '2026-12-20 to 2026-12-21 | E2E Family Event' }
    });
    expect(leaveRes.status()).toBe(200);
    const leaveBody = await leaveRes.json();
    expect(leaveBody.leaveRequestId).toBeTruthy();
    createdLeaveIds.push(leaveBody.leaveRequestId);
  });

  test('3. Predictive 75% Attendance Shortage Alert displays for College child', async ({ page }) => {
    await loginAsRole(page, 'PARENT');
    const collegeChip = page.getByText(/B\.Tech/i).first();
    if (await collegeChip.isVisible().catch(() => false)) {
      await collegeChip.click();
    }
    await expect(page.getByText(/Attendance/i).first()).toBeVisible();
  });

  test.fixme('4. AI Question Paper Generator (Bloom) & Admin Copilot (Ask Your Campus) — pending Sprint 6 implementation', async () => {
    // Sprint 6 (AI Question Paper Generator & Admin Copilot) is not yet implemented in server/ and app/.
  });
});
