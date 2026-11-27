const express = require('express');
const router = express.Router();
const prisma = require('../db');
const {
  portalAuthMiddleware,
  requireRole,
  requireModulePermission,
  resolveBranchId,
  getCurrentAcademicYearId
} = require('../middleware/rbac');

router.use(portalAuthMiddleware);

/**
 * Helper: Sync library fine delta onto student's active FeeInvoice (Priority: fines -> tuition -> transport)
 */
async function syncFineToStudentInvoice(branchId, userId, fineDelta) {
  if (!fineDelta || fineDelta <= 0) return null;
  const student = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!student) return null;

  let invoice = await prisma.feeInvoice.findFirst({
    where: { branchId, studentId: student.id },
    orderBy: { createdAt: 'desc' }
  });

  if (!invoice) {
    const academicYearId = await getCurrentAcademicYearId(branchId);
    invoice = await prisma.feeInvoice.create({
      data: {
        branchId,
        academicYearId,
        studentId: student.id,
        invoiceNo: `INV-LIB-${Date.now().toString().slice(-6)}`,
        finesDue: fineDelta,
        tuitionDue: 0,
        transportDue: 0,
        status: 'PENDING'
      }
    });
    return invoice;
  }

  const nextStatus = invoice.status === 'PAID' ? 'PARTIAL' : invoice.status;
  return prisma.feeInvoice.update({
    where: { id: invoice.id },
    data: {
      finesDue: invoice.finesDue + fineDelta,
      status: nextStatus
    }
  });
}

/**
 * GET /api/library/books
 * Searchable branch book catalog (accessible to all authenticated portal roles)
 */
router.get('/books', async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { search, category } = req.query;

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    let books = await prisma.libraryBook.findMany({
      where: {
        branchId,
        ...(category && category !== 'All' ? { category } : {})
      },
      orderBy: { createdAt: 'desc' }
    });

    if (search && String(search).trim()) {
      const q = String(search).trim().toLowerCase();
      books = books.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.author.toLowerCase().includes(q) ||
          b.isbn.toLowerCase().includes(q) ||
          b.accessionCode.toLowerCase().includes(q)
      );
    }

    return res.json({
      success: true,
      books,
      branchLimits: {
        maxStudentBookLimit: branch?.maxStudentBookLimit ?? 3,
        maxFacultyBookLimit: branch?.maxFacultyBookLimit ?? 5,
        libraryFinePerDay: branch?.libraryFinePerDay ?? 10
      }
    });
  } catch (error) {
    console.error('Load library books error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load library catalog.' });
  }
});

/**
 * POST /api/library/books
 * Catalog CRUD: Add Book (LIBRARIAN / ADMIN / SUPER_ADMIN)
 */
router.post('/books', requireModulePermission('library', 'create'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { isbn, title, author, category, totalCopies, accessionCode } = req.body || {};
    if (!isbn || !title || !author) {
      return res.status(400).json({ success: false, message: 'ISBN, title, and author are required.' });
    }

    const copies = Math.max(1, parseInt(totalCopies, 10) || 1);
    const code =
      accessionCode && accessionCode.trim()
        ? accessionCode.trim().toUpperCase()
        : `LIB-${Date.now().toString().slice(-6)}`;

    const book = await prisma.libraryBook.create({
      data: {
        branchId,
        isbn: isbn.trim(),
        title: title.trim(),
        author: author.trim(),
        category: (category || 'General').trim(),
        totalCopies: copies,
        availableCopies: copies,
        accessionCode: code
      }
    });
    return res.status(201).json({ success: true, book });
  } catch (error) {
    console.error('Create book error:', error);
    return res.status(500).json({ success: false, message: 'Failed to add book to catalog.' });
  }
});

/**
 * PUT /api/library/books/:id
 */
router.put('/books/:id', requireModulePermission('library', 'update'), async (req, res) => {
  try {
    const { title, author, category, totalCopies } = req.body || {};
    const existing = await prisma.libraryBook.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Book not found.' });

    let nextAvailable = existing.availableCopies;
    let nextTotal = existing.totalCopies;
    if (totalCopies !== undefined) {
      nextTotal = Math.max(1, parseInt(totalCopies, 10) || 1);
      const diff = nextTotal - existing.totalCopies;
      nextAvailable = Math.max(0, existing.availableCopies + diff);
    }

    const book = await prisma.libraryBook.update({
      where: { id: existing.id },
      data: {
        ...(title ? { title: title.trim() } : {}),
        ...(author ? { author: author.trim() } : {}),
        ...(category ? { category: category.trim() } : {}),
        totalCopies: nextTotal,
        availableCopies: nextAvailable
      }
    });
    return res.json({ success: true, book });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update book.' });
  }
});

/**
 * DELETE /api/library/books/:id
 */
router.delete('/books/:id', requireModulePermission('library', 'delete'), async (req, res) => {
  try {
    await prisma.libraryBook.delete({ where: { id: req.params.id } });
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete book.' });
  }
});

/**
 * GET /api/library/issues
 * List active, overdue, and returned issues for branch
 */
router.get('/issues', requireModulePermission('library', 'read'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const issues = await prisma.bookIssue.findMany({
      where: { branchId },
      include: {
        book: true,
        user: { select: { id: true, fullName: true, email: true, role: true } }
      },
      orderBy: { issuedAt: 'desc' }
    });
    return res.json({ success: true, issues });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load book issues.' });
  }
});

/**
 * POST /api/library/issue
 * Issue a book enforcing member limits (max 3 students, max 5 faculty) and no duplicate active issue
 */
router.post('/issue', requireModulePermission('library', 'create'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { bookId, accessionCode, userId, email, dueDate } = req.body || {};

    const book = bookId
      ? await prisma.libraryBook.findUnique({ where: { id: bookId } })
      : accessionCode
      ? await prisma.libraryBook.findUnique({ where: { accessionCode: accessionCode.trim().toUpperCase() } })
      : null;

    if (!book || book.branchId !== branchId) {
      return res.status(404).json({ success: false, message: 'Book not found in this branch.' });
    }
    if (book.availableCopies <= 0) {
      return res.status(400).json({ success: false, message: 'No available copies left for this book.' });
    }

    const borrower = userId
      ? await prisma.user.findUnique({ where: { id: userId } })
      : email
      ? await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
      : null;

    if (!borrower) {
      return res.status(404).json({ success: false, message: 'Member account not found.' });
    }

    // Check duplicate active issue
    const duplicate = await prisma.bookIssue.findFirst({
      where: {
        branchId,
        bookId: book.id,
        userId: borrower.id,
        status: { in: ['ISSUED', 'OVERDUE'] }
      }
    });
    if (duplicate) {
      return res.status(409).json({
        success: false,
        code: 'DUPLICATE_ACTIVE_ISSUE',
        message: `${borrower.fullName} already has an active issue for "${book.title}".`
      });
    }

    // Enforce configurable member issue limit
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    const limit =
      borrower.role === 'TEACHER'
        ? branch?.maxFacultyBookLimit ?? 5
        : branch?.maxStudentBookLimit ?? 3;

    const activeCount = await prisma.bookIssue.count({
      where: {
        branchId,
        userId: borrower.id,
        status: { in: ['ISSUED', 'OVERDUE'] }
      }
    });

    if (activeCount >= limit) {
      return res.status(400).json({
        success: false,
        code: 'MEMBER_ISSUE_LIMIT_REACHED',
        message: `Issue limit reached (${activeCount}/${limit} active books allowed for ${borrower.role}).`
      });
    }

    const parsedDue = dueDate ? new Date(dueDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const [issue] = await prisma.$transaction([
      prisma.bookIssue.create({
        data: {
          branchId,
          bookId: book.id,
          userId: borrower.id,
          dueDate: parsedDue,
          status: parsedDue < new Date() ? 'OVERDUE' : 'ISSUED'
        },
        include: { book: true, user: { select: { id: true, fullName: true, email: true, role: true } } }
      }),
      prisma.libraryBook.update({
        where: { id: book.id },
        data: { availableCopies: book.availableCopies - 1 }
      }),
      prisma.bookReservation.updateMany({
        where: { branchId, bookId: book.id, userId: borrower.id, status: 'PENDING' },
        data: { status: 'FULFILLED' }
      })
    ]);

    return res.status(201).json({ success: true, issue });
  } catch (error) {
    console.error('Issue book error:', error);
    return res.status(500).json({ success: false, message: 'Failed to issue book.' });
  }
});

/**
 * POST /api/library/return/:issueId
 * Return book + automated late fine calculation & FeeInvoice sync
 */
router.post('/return/:issueId', requireModulePermission('library', 'update'), async (req, res) => {
  try {
    const issue = await prisma.bookIssue.findUnique({
      where: { id: req.params.issueId },
      include: { book: true, user: true }
    });
    if (!issue) return res.status(404).json({ success: false, message: 'Book issue record not found.' });
    if (issue.status === 'RETURNED') {
      return res.status(400).json({ success: false, message: 'Book has already been returned.' });
    }

    const branch = await prisma.branch.findUnique({ where: { id: issue.branchId } });
    const finePerDay = branch?.libraryFinePerDay ?? 10;

    const now = new Date();
    const msLate = now.getTime() - new Date(issue.dueDate).getTime();
    const daysLate = msLate > 0 ? Math.ceil(msLate / (1000 * 60 * 60 * 24)) : 0;
    const totalFine = daysLate * finePerDay;
    const unsyncedDelta = issue.fineSyncedToInvoice ? Math.max(0, totalFine - issue.fineAmount) : totalFine;

    let syncedInvoice = null;
    if (unsyncedDelta > 0) {
      syncedInvoice = await syncFineToStudentInvoice(issue.branchId, issue.userId, unsyncedDelta);
    }

    const [updatedIssue] = await prisma.$transaction([
      prisma.bookIssue.update({
        where: { id: issue.id },
        data: {
          returnedAt: now,
          status: 'RETURNED',
          fineAmount: totalFine,
          fineSyncedToInvoice: totalFine > 0 ? true : issue.fineSyncedToInvoice
        },
        include: { book: true, user: { select: { id: true, fullName: true, email: true, role: true } } }
      }),
      prisma.libraryBook.update({
        where: { id: issue.bookId },
        data: { availableCopies: Math.min(issue.book.totalCopies, issue.book.availableCopies + 1) }
      })
    ]);

    return res.json({
      success: true,
      issue: updatedIssue,
      daysLate,
      fineAmount: totalFine,
      syncedInvoice
    });
  } catch (error) {
    console.error('Return book error:', error);
    return res.status(500).json({ success: false, message: 'Failed to return book.' });
  }
});

/**
 * POST /api/library/sync-overdue
 * Daily overdue check: computes accrued fines & posts unsynced delta to FeeInvoice
 */
router.post('/sync-overdue', requireModulePermission('library', 'update'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    const finePerDay = branch?.libraryFinePerDay ?? 10;
    const now = new Date();

    const activeOverdue = await prisma.bookIssue.findMany({
      where: {
        branchId,
        status: { in: ['ISSUED', 'OVERDUE'] },
        dueDate: { lt: now }
      }
    });

    let syncedCount = 0;
    let totalFineAdded = 0;

    for (const issue of activeOverdue) {
      const daysLate = Math.ceil((now.getTime() - new Date(issue.dueDate).getTime()) / (1000 * 60 * 60 * 24));
      const newFine = Math.max(0, daysLate * finePerDay);
      const delta = issue.fineSyncedToInvoice ? Math.max(0, newFine - issue.fineAmount) : newFine;

      if (delta > 0) {
        await syncFineToStudentInvoice(branchId, issue.userId, delta);
        totalFineAdded += delta;
      }

      await prisma.bookIssue.update({
        where: { id: issue.id },
        data: {
          status: 'OVERDUE',
          fineAmount: newFine,
          fineSyncedToInvoice: newFine > 0 ? true : issue.fineSyncedToInvoice
        }
      });
      syncedCount++;
    }

    return res.json({ success: true, overdueCount: syncedCount, totalFineAdded });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to run daily overdue sync.' });
  }
});

/**
 * GET /api/library/reservations & POST /api/library/reservations
 */
router.get('/reservations', requireModulePermission('library', 'read'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const reservations = await prisma.bookReservation.findMany({
      where: { branchId },
      include: {
        book: true,
        user: { select: { id: true, fullName: true, email: true, role: true } }
      },
      orderBy: { reservedAt: 'desc' }
    });
    return res.json({ success: true, reservations });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load reservations.' });
  }
});

router.post('/reservations', requireRole('STUDENT', 'TEACHER', 'PARENT', 'LIBRARIAN', 'ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { bookId } = req.body || {};
    if (!bookId) return res.status(400).json({ success: false, message: 'bookId is required.' });

    const existing = await prisma.bookReservation.findFirst({
      where: { branchId, bookId, userId: req.portalUser.id, status: 'PENDING' }
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You already have an active reservation for this book.' });
    }

    const reservation = await prisma.bookReservation.create({
      data: { branchId, bookId, userId: req.portalUser.id },
      include: { book: true }
    });
    return res.status(201).json({ success: true, reservation });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to reserve book.' });
  }
});

/**
 * GET /api/library/my-library
 * Student / Parent / Teacher view: borrowed books with due-date countdown, reservations, and synced fines
 */
router.get('/my-library', requireRole('STUDENT', 'TEACHER', 'PARENT'), async (req, res) => {
  try {
    let targetUserId = req.portalUser.id;
    let studentProfile = null;

    if (req.portalUser.role === 'PARENT') {
      const parentProfile = await prisma.parentProfile.findUnique({
        where: { userId: req.portalUser.id },
        include: { children: { include: { student: true } } }
      });
      if (parentProfile && parentProfile.children.length > 0) {
        const reqChildId = req.query.studentId;
        const matched = reqChildId
          ? parentProfile.children.find((c) => c.studentId === reqChildId)
          : parentProfile.children[0];
        if (matched) {
          studentProfile = matched.student;
          targetUserId = matched.student.userId;
        }
      }
    } else if (req.portalUser.role === 'STUDENT') {
      studentProfile = await prisma.studentProfile.findUnique({ where: { userId: targetUserId } });
    }

    const [issues, reservations, invoices] = await Promise.all([
      prisma.bookIssue.findMany({
        where: { userId: targetUserId },
        include: { book: true },
        orderBy: { issuedAt: 'desc' }
      }),
      prisma.bookReservation.findMany({
        where: { userId: req.portalUser.id },
        include: { book: true },
        orderBy: { reservedAt: 'desc' }
      }),
      studentProfile
        ? prisma.feeInvoice.findMany({ where: { studentId: studentProfile.id } })
        : Promise.resolve([])
    ]);

    const now = Date.now();
    const enrichedIssues = issues.map((iss) => {
      const daysRemaining = Math.ceil((new Date(iss.dueDate).getTime() - now) / (1000 * 60 * 60 * 24));
      return { ...iss, daysRemaining };
    });

    const syncedFinesDue = invoices.reduce((sum, inv) => sum + inv.finesDue, 0);

    return res.json({
      success: true,
      issues: enrichedIssues,
      reservations,
      syncedFinesDue
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load member library data.' });
  }
});

module.exports = router;
