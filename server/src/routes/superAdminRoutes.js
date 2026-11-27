const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const prisma = require('../db');
const { portalAuthMiddleware, requireRole } = require('../middleware/rbac');

router.use(portalAuthMiddleware);
router.use(requireRole('SUPER_ADMIN'));

/**
 * GET /api/super-admin/branches
 * List all branches with student/user counts
 */
router.get('/branches', async (req, res) => {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { createdAt: 'asc' },
      include: {
        _count: {
          select: { students: true, users: true, applications: true }
        }
      }
    });
    return res.json({ success: true, branches });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load branches.' });
  }
});

/**
 * POST /api/super-admin/branches
 * Create a new Branch + default 2026-2027 AcademicYear
 */
router.post('/branches', async (req, res) => {
  try {
    const { code, name, city, institutionMode, address, phone, email } = req.body || {};
    if (!code || !name || !city) {
      return res.status(400).json({ success: false, message: 'Branch code, name, and city are required.' });
    }

    const existing = await prisma.branch.findUnique({ where: { code: code.trim().toUpperCase() } });
    if (existing) {
      return res.status(409).json({ success: false, message: `Branch code ${code} already exists.` });
    }

    const branch = await prisma.branch.create({
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        city: city.trim(),
        institutionMode: ['SCHOOL', 'COLLEGE', 'BOTH'].includes(institutionMode) ? institutionMode : 'BOTH',
        address: address || '',
        phone: phone || '',
        email: email || ''
      }
    });

    await prisma.academicYear.create({
      data: { branchId: branch.id, name: '2026-2027', isCurrent: true }
    });

    return res.status(201).json({ success: true, branch });
  } catch (error) {
    console.error('Create branch error:', error);
    return res.status(500).json({ success: false, message: 'Failed to create branch.' });
  }
});

/**
 * PUT /api/super-admin/branches/:id
 * Update branch profile / institution mode
 */
router.put('/branches/:id', async (req, res) => {
  try {
    const { name, city, institutionMode, address, phone, email, isActive } = req.body || {};
    const branch = await prisma.branch.update({
      where: { id: req.params.id },
      data: {
        ...(name ? { name } : {}),
        ...(city ? { city } : {}),
        ...(institutionMode ? { institutionMode } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(isActive !== undefined ? { isActive: !!isActive } : {})
      }
    });
    return res.json({ success: true, branch });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update branch.' });
  }
});

/**
 * GET /api/super-admin/branches/:id/config
 * Get full Branch Configuration Studio data
 */
router.get('/branches/:id/config', async (req, res) => {
  try {
    const branchId = req.params.id;
    const [branch, syllabi, gradesOrCourses, subjects, feeStructures, academicYears] = await Promise.all([
      prisma.branch.findUnique({ where: { id: branchId } }),
      prisma.branchSyllabus.findMany({ where: { branchId } }),
      prisma.branchGradeOrCourse.findMany({ where: { branchId } }),
      prisma.branchSubject.findMany({ where: { branchId } }),
      prisma.branchFeeStructure.findMany({ where: { branchId } }),
      prisma.academicYear.findMany({ where: { branchId } })
    ]);
    if (!branch) return res.status(404).json({ success: false, message: 'Branch not found.' });
    return res.json({
      success: true,
      config: { branch, syllabi, gradesOrCourses, subjects, feeStructures, academicYears }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load branch config.' });
  }
});

/**
 * POST /api/super-admin/branches/:id/syllabi
 */
router.post('/branches/:id/syllabi', async (req, res) => {
  try {
    const { name, institutionType } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'Syllabus or Department name is required.' });
    const syllabus = await prisma.branchSyllabus.create({
      data: {
        branchId: req.params.id,
        name: name.trim(),
        institutionType: institutionType || 'SCHOOL',
        isEnabled: true
      }
    });
    return res.status(201).json({ success: true, syllabus });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add syllabus.' });
  }
});

/**
 * POST /api/super-admin/branches/:id/grades
 */
router.post('/branches/:id/grades', async (req, res) => {
  try {
    const { name, institutionType, seatCapacity, sections } = req.body || {};
    if (!name) return res.status(400).json({ success: false, message: 'Class/Course name is required.' });
    const grade = await prisma.branchGradeOrCourse.create({
      data: {
        branchId: req.params.id,
        name: name.trim(),
        institutionType: institutionType || 'SCHOOL',
        seatCapacity: parseInt(seatCapacity, 10) || 40,
        sections: sections || ['A', 'B']
      }
    });
    return res.status(201).json({ success: true, grade });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add grade/course.' });
  }
});

/**
 * POST /api/super-admin/branches/:id/subjects
 */
router.post('/branches/:id/subjects', async (req, res) => {
  try {
    const { gradeOrCourse, name, isCompulsory } = req.body || {};
    if (!gradeOrCourse || !name) {
      return res.status(400).json({ success: false, message: 'gradeOrCourse and subject name are required.' });
    }
    const subject = await prisma.branchSubject.create({
      data: {
        branchId: req.params.id,
        gradeOrCourse: gradeOrCourse.trim(),
        name: name.trim(),
        isCompulsory: isCompulsory !== false
      }
    });
    return res.status(201).json({ success: true, subject });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to add subject.' });
  }
});

/**
 * POST /api/super-admin/branches/:id/fee-structures
 */
router.post('/branches/:id/fee-structures', async (req, res) => {
  try {
    const { gradeOrCourse, tuitionFee, transportFee, hostelFee, examFee, lateFineDaily } = req.body || {};
    if (!gradeOrCourse) {
      return res.status(400).json({ success: false, message: 'gradeOrCourse is required.' });
    }
    const feeStructure = await prisma.branchFeeStructure.create({
      data: {
        branchId: req.params.id,
        gradeOrCourse: gradeOrCourse.trim(),
        tuitionFee: Number(tuitionFee) || 85000,
        transportFee: Number(transportFee) || 18000,
        hostelFee: Number(hostelFee) || 0,
        examFee: Number(examFee) || 3500,
        lateFineDaily: Number(lateFineDaily) || 50
      }
    });
    return res.status(201).json({ success: true, feeStructure });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to create fee structure.' });
  }
});

/**
 * GET /api/super-admin/users
 * List Branch Admins, Scoped Sub-Admins, and Staff (optionally filtered by branchId)
 */
router.get('/users', async (req, res) => {
  try {
    const { branchId } = req.query;
    const users = await prisma.user.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        role: {
          in: [
            'ADMIN',
            'ACCOUNTANT',
            'ADMISSION_OFFICER',
            'EXAM_CONTROLLER',
            'LIBRARIAN',
            'TRANSPORT_MANAGER',
            'HOSTEL_WARDEN',
            'TEACHER'
          ]
        }
      },
      include: { branch: { select: { id: true, name: true, code: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({
      success: true,
      users: users.map(({ passwordHash, ...rest }) => rest)
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to load staff users.' });
  }
});

/**
 * POST /api/super-admin/users
 * Provision Branch Admin or Scoped Sub-Admin with module-level CRUD permissions
 */
router.post('/users', async (req, res) => {
  try {
    const { branchId, fullName, email, mobile, password, role, permissions, department } = req.body || {};
    const allowedStaffRoles = [
      'ADMIN',
      'ACCOUNTANT',
      'ADMISSION_OFFICER',
      'EXAM_CONTROLLER',
      'LIBRARIAN',
      'TRANSPORT_MANAGER',
      'HOSTEL_WARDEN',
      'TEACHER'
    ];
    if (!branchId || !fullName || !email || !role || !allowedStaffRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'branchId, fullName, email, and a valid staff role are required.'
      });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password || 'Password@123', 10);
    const created = await prisma.user.create({
      data: {
        branchId,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile || null,
        passwordHash,
        role,
        permissions: permissions || {},
        department: department || null
      },
      include: { branch: { select: { id: true, name: true, code: true } } }
    });

    const { passwordHash: _, ...userWithoutPassword } = created;
    return res.status(201).json({ success: true, user: userWithoutPassword });
  } catch (error) {
    console.error('Provision user error:', error);
    return res.status(500).json({ success: false, message: 'Failed to provision user.' });
  }
});

/**
 * PUT /api/super-admin/users/:id/permissions
 */
router.put('/users/:id/permissions', async (req, res) => {
  try {
    const { permissions, isActive } = req.body || {};
    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(permissions !== undefined ? { permissions } : {}),
        ...(isActive !== undefined ? { isActive: !!isActive } : {})
      }
    });
    const { passwordHash: _, ...rest } = updated;
    return res.json({ success: true, user: rest });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update permissions.' });
  }
});

module.exports = router;
