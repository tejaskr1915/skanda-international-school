const request = require('supertest');
const app = require('../src/index');
const prisma = require('../src/db');

describe('Skanda International School - Phase 2 Sprint 2 Library & Fee Sync Tests', () => {
  let librarianToken = '';
  let student2Token = '';
  let createdBookIds = [];
  let createdIssueIds = [];
  let createdReservationIds = [];
  let initialFinesDue = 0;
  let student2InvoiceId = null;

  beforeAll(async () => {
    const student2User = await prisma.user.findUnique({
      where: { email: 'student2.blr@skanda.edu.in' },
      include: { studentProfile: true }
    });
    if (student2User?.studentProfile) {
      const inv = await prisma.feeInvoice.findFirst({
        where: { studentId: student2User.studentProfile.id },
        orderBy: { createdAt: 'desc' }
      });
      if (inv) {
        student2InvoiceId = inv.id;
        initialFinesDue = inv.finesDue;
      }
    }
  });

  afterAll(async () => {
    if (createdIssueIds.length > 0) {
      await prisma.bookIssue.deleteMany({ where: { id: { in: createdIssueIds } } }).catch(() => {});
    }
    if (createdReservationIds.length > 0) {
      await prisma.bookReservation.deleteMany({ where: { id: { in: createdReservationIds } } }).catch(() => {});
    }
    if (createdBookIds.length > 0) {
      await prisma.libraryBook.deleteMany({ where: { id: { in: createdBookIds } } }).catch(() => {});
    }
    if (student2InvoiceId) {
      await prisma.feeInvoice.update({
        where: { id: student2InvoiceId },
        data: { finesDue: initialFinesDue, status: 'PARTIAL' }
      }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  test('1. Librarian authenticates and performs Book Catalog CRUD', async () => {
    const loginRes = await request(app).post('/api/portal-auth/login').send({
      email: 'librarian.blr@skanda.edu.in',
      password: 'Password@123'
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.role).toBe('LIBRARIAN');
    librarianToken = loginRes.body.token;

    const createRes = await request(app)
      .post('/api/library/books')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        isbn: `978-TEST-${Date.now()}`,
        title: 'Clean Architecture in Practice',
        author: 'Robert C. Martin',
        category: 'Computer Science',
        totalCopies: 3
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.book.accessionCode).toMatch(/^LIB-/);
    createdBookIds.push(createRes.body.book.id);

    const updateRes = await request(app)
      .put(`/api/library/books/${createRes.body.book.id}`)
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({ totalCopies: 4 });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.book.totalCopies).toBe(4);
    expect(updateRes.body.book.availableCopies).toBe(4);
  });

  test('2. Student reserves a book and views My Library', async () => {
    const sLogin = await request(app).post('/api/portal-auth/login').send({
      email: 'student2.blr@skanda.edu.in',
      password: 'Password@123'
    });
    expect(sLogin.status).toBe(200);
    student2Token = sLogin.body.token;

    const resvRes = await request(app)
      .post('/api/library/reservations')
      .set('Authorization', `Bearer ${student2Token}`)
      .send({ bookId: createdBookIds[0] });
    expect(resvRes.status).toBe(201);
    createdReservationIds.push(resvRes.body.reservation.id);

    const myRes = await request(app)
      .get('/api/library/my-library')
      .set('Authorization', `Bearer ${student2Token}`);
    expect(myRes.status).toBe(200);
    expect(myRes.body.reservations.length).toBeGreaterThanOrEqual(1);
  });

  test('3. Prevents duplicate active issue and enforces Student 3-book limit', async () => {
    // Create 3 more books for limit testing
    for (let i = 1; i <= 3; i++) {
      const bRes = await request(app)
        .post('/api/library/books')
        .set('Authorization', `Bearer ${librarianToken}`)
        .send({
          isbn: `978-LIM-${Date.now()}-${i}`,
          title: `Limit Test Book ${i}`,
          author: 'Test Author',
          category: 'General',
          totalCopies: 2
        });
      expect(bRes.status).toBe(201);
      createdBookIds.push(bRes.body.book.id);
    }

    // Issue book 0
    const iss1 = await request(app)
      .post('/api/library/issue')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({ bookId: createdBookIds[0], email: 'student2.blr@skanda.edu.in' });
    expect(iss1.status).toBe(201);
    createdIssueIds.push(iss1.body.issue.id);

    // Duplicate active issue of book 0 must fail
    const dupRes = await request(app)
      .post('/api/library/issue')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({ bookId: createdBookIds[0], email: 'student2.blr@skanda.edu.in' });
    expect(dupRes.status).toBe(409);
    expect(dupRes.body.message).toMatch(/already has an active issue/i);

    // Issue book 1 and book 2 (total 3 active)
    const iss2 = await request(app)
      .post('/api/library/issue')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({ bookId: createdBookIds[1], email: 'student2.blr@skanda.edu.in' });
    expect(iss2.status).toBe(201);
    createdIssueIds.push(iss2.body.issue.id);

    const iss3 = await request(app)
      .post('/api/library/issue')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({ bookId: createdBookIds[2], email: 'student2.blr@skanda.edu.in' });
    expect(iss3.status).toBe(201);
    createdIssueIds.push(iss3.body.issue.id);

    // 4th active book must fail due to maxStudentBookLimit (3)
    const iss4 = await request(app)
      .post('/api/library/issue')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({ bookId: createdBookIds[3], email: 'student2.blr@skanda.edu.in' });
    expect(iss4.status).toBe(400);
    expect(iss4.body.message).toMatch(/issue limit reached/i);
  });

  test('4. Overdue return calculates fine and automatically syncs to FeeInvoice.finesDue', async () => {
    // Return iss2 (on time) to free a slot
    const retOnTime = await request(app)
      .post(`/api/library/return/${createdIssueIds[1]}`)
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({});
    expect(retOnTime.status).toBe(200);
    expect(retOnTime.body.fineAmount).toBe(0);

    // Issue book 3 with a dueDate 5 days in the past
    const fiveDaysAgo = new Date(Date.now() - 5 * 86400000).toISOString();
    const overdueIss = await request(app)
      .post('/api/library/issue')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        bookId: createdBookIds[3],
        email: 'student2.blr@skanda.edu.in',
        dueDate: fiveDaysAgo
      });
    expect(overdueIss.status).toBe(201);
    createdIssueIds.push(overdueIss.body.issue.id);

    // Return overdue book -> should compute 5 * 10 = 50 and sync to FeeInvoice
    const retOverdue = await request(app)
      .post(`/api/library/return/${overdueIss.body.issue.id}`)
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({});
    expect(retOverdue.status).toBe(200);
    expect(retOverdue.body.daysLate).toBeGreaterThanOrEqual(5);
    expect(retOverdue.body.fineAmount).toBeGreaterThanOrEqual(50);

    if (student2InvoiceId) {
      const updatedInv = await prisma.feeInvoice.findUnique({ where: { id: student2InvoiceId } });
      expect(updatedInv.finesDue).toBeGreaterThanOrEqual(initialFinesDue + 50);
    }

    // Daily overdue sync endpoint works cleanly
    const syncRes = await request(app)
      .post('/api/library/sync-overdue')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({});
    expect(syncRes.status).toBe(200);
    expect(syncRes.body.success).toBe(true);
  });
});
