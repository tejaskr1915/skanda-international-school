const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { portalAuthMiddleware } = require('../middleware/rbac');

const JWT_SECRET = process.env.JWT_SECRET || 'skanda_secret_jwt_key_2026_super_secure';

async function buildPortalUserPayload(user) {
  let children = [];
  if (user.role === 'PARENT') {
    const parentProfile = await prisma.parentProfile.findUnique({
      where: { userId: user.id },
      include: {
        children: {
          include: {
            student: {
              include: {
                user: { select: { id: true, fullName: true, email: true } },
                branch: { select: { id: true, name: true, code: true } }
              }
            }
          }
        }
      }
    });
    if (parentProfile) {
      children = parentProfile.children.map((link) => ({
        studentId: link.student.id,
        fullName: link.student.user.fullName,
        admissionNo: link.student.admissionNo,
        rollNumber: link.student.rollNumber,
        classOrCourse: link.student.classOrCourse,
        section: link.student.section,
        institutionType: link.student.institutionType,
        boardOrDept: link.student.boardOrDept,
        relation: link.relation,
        branch: link.student.branch
      }));
    }
  }

  let studentProfile = null;
  if (user.role === 'STUDENT') {
    studentProfile = await prisma.studentProfile.findUnique({
      where: { userId: user.id },
      include: { branch: { select: { id: true, name: true, code: true } } }
    });
  }

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    branchId: user.branchId,
    branch: user.branch || null,
    permissions: user.permissions || {},
    department: user.department || null,
    children,
    studentProfile
  };
}

/**
 * POST /api/portal-auth/login
 * Unified login for Super Admin, Branch Admin, Sub-Admins, Teacher, Parent, and Student
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: { branch: true }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account.' });
    }

    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      const minsLeft = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Account locked due to 5 failed login attempts. Try again in ${minsLeft} minute(s).`
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      const nextAttempts = (user.failedLoginAttempts || 0) + 1;
      const shouldLock = nextAttempts >= 5;
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: shouldLock ? 0 : nextAttempts,
          lockedUntil: shouldLock ? new Date(Date.now() + 15 * 60000) : null
        }
      });
      if (shouldLock) {
        return res.status(423).json({
          success: false,
          message: 'Account locked for 15 minutes after 5 consecutive failed login attempts.'
        });
      }
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null }
      });
    }

    const token = jwt.sign(
      { portalUserId: user.id, role: user.role, branchId: user.branchId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const payload = await buildPortalUserPayload(user);
    return res.json({ success: true, token, user: payload });
  } catch (error) {
    console.error('Portal login error:', error);
    return res.status(500).json({ success: false, message: 'Portal login failed.' });
  }
});

/**
 * GET /api/portal-auth/me
 */
router.get('/me', portalAuthMiddleware, async (req, res) => {
  try {
    const payload = await buildPortalUserPayload(req.portalUser);
    return res.json({ success: true, user: payload });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load portal session.' });
  }
});

module.exports = router;
