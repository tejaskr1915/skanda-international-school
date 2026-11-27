const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { portalAuthMiddleware, requireRole, resolveBranchId } = require('../middleware/rbac');

router.use(portalAuthMiddleware);

const PLACEMENT_ROLES = ['SUPER_ADMIN', 'ADMIN', 'PLACEMENT_OFFICER'];

router.get('/alumni', async (req, res) => {
  try {
    const branchId = req.portalUser.branchId || (await resolveBranchId(req));
    const alumni = await prisma.alumniProfile.findMany({ where: { branchId }, orderBy: { createdAt: 'desc' } });
    res.json({ success: true, alumni });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/alumni', async (req, res) => {
  try {
    const branchId = req.portalUser.branchId || (await resolveBranchId(req));
    const { fullName, email, graduationYear, department, company, roleTitle } = req.body;
    if (!fullName || !email || !graduationYear) return res.status(400).json({ success: false, message: 'fullName, email, graduationYear required.' });
    const profile = await prisma.alumniProfile.create({
      data: {
        branchId,
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        graduationYear: Number(graduationYear),
        department: department || 'CSE',
        company: company || 'Tech Partner',
        roleTitle: roleTitle || 'Engineer',
        status: 'PENDING'
      }
    });
    res.status(201).json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/alumni/:id/verify', requireRole(...PLACEMENT_ROLES), async (req, res) => {
  try {
    const profile = await prisma.alumniProfile.update({
      where: { id: req.params.id },
      data: { status: 'VERIFIED' }
    });
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/drives', async (req, res) => {
  try {
    const branchId = req.portalUser.branchId || (await resolveBranchId(req));
    const drives = await prisma.placementDrive.findMany({
      where: { branchId },
      include: { applications: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, drives });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/drives', requireRole(...PLACEMENT_ROLES), async (req, res) => {
  try {
    const branchId = await resolveBranchId(req);
    const { companyName, jobTitle, packageLpa, minCgpa, maxBacklogs, driveDate, isReferral, postedByAlumniId } = req.body;
    if (!companyName || !jobTitle) return res.status(400).json({ success: false, message: 'companyName and jobTitle required.' });
    const drive = await prisma.placementDrive.create({
      data: {
        branchId,
        companyName: companyName.trim(),
        jobTitle: jobTitle.trim(),
        packageLpa: Number(packageLpa) || 6.0,
        minCgpa: Number(minCgpa) || 6.0,
        maxBacklogs: Number(maxBacklogs) || 0,
        driveDate: driveDate || '2027-02-01',
        isReferral: Boolean(isReferral),
        postedByAlumniId: postedByAlumniId || null,
        moderationStatus: isReferral ? 'PENDING' : 'APPROVED'
      }
    });
    res.status(201).json({ success: true, drive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/drives/:id/moderate', requireRole(...PLACEMENT_ROLES), async (req, res) => {
  try {
    const drive = await prisma.placementDrive.update({
      where: { id: req.params.id },
      data: { moderationStatus: req.body.moderationStatus || 'APPROVED' }
    });
    res.json({ success: true, drive });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/drives/:id/apply', async (req, res) => {
  try {
    const drive = await prisma.placementDrive.findUnique({ where: { id: req.params.id } });
    if (!drive || drive.moderationStatus !== 'APPROVED') {
      return res.status(404).json({ success: false, message: 'Approved placement drive not found.' });
    }

    let studentId = req.body.studentId;
    if (req.portalUser.role === 'STUDENT') {
      const sp = await prisma.studentProfile.findUnique({ where: { userId: req.portalUser.id } });
      studentId = sp?.id;
    }
    if (!studentId) return res.status(400).json({ success: false, message: 'studentId required.' });

    const latestRec = await prisma.collegeAcademicRecord.findFirst({
      where: { studentId },
      orderBy: { semester: 'desc' }
    });
    if (latestRec) {
      if (latestRec.cgpa < drive.minCgpa) {
        return res.status(400).json({ success: false, message: `Ineligible: CGPA ${latestRec.cgpa} is below minimum ${drive.minCgpa}.` });
      }
      if (latestRec.backlogs > drive.maxBacklogs) {
        return res.status(400).json({ success: false, message: `Ineligible: ${latestRec.backlogs} backlogs exceed maximum ${drive.maxBacklogs}.` });
      }
    }

    const application = await prisma.placementApplication.create({
      data: { branchId: drive.branchId, driveId: drive.id, studentId, status: 'APPLIED' }
    });
    res.status(201).json({ success: true, application });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, message: 'Already applied to this drive.' });
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
