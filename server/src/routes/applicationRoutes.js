const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const prisma = require('../db');
const { authMiddleware } = require('../middleware/auth');
const {
  BOARD_INFO,
  CLASS_OPTIONS,
  getSubjectsForClass,
  validateAgeEligibility
} = require('../utils/academicData');

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'doc-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      return cb(null, true);
    }
    cb(new Error('Only JPEG, PNG, WEBP and PDF files are allowed.'));
  }
});

/**
 * GET /api/academic/metadata
 * Publicly accessible academic configuration
 */
router.get('/academic-metadata', (req, res) => {
  return res.json({
    success: true,
    boards: BOARD_INFO,
    classes: CLASS_OPTIONS
  });
});

/**
 * GET /api/academic/subjects
 * Query params: classOrCourse, board
 */
router.get('/academic-subjects', (req, res) => {
  const { classOrCourse, board } = req.query;
  if (!classOrCourse) {
    return res.status(400).json({ success: false, message: 'classOrCourse parameter is required.' });
  }
  const data = getSubjectsForClass(classOrCourse, board);
  return res.json({ success: true, subjectsData: data });
});

/**
 * POST /api/applications/upload
 * Single file upload
 */
router.post('/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  return res.json({
    success: true,
    message: 'File uploaded successfully',
    filename: req.file.filename,
    fileUrl,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
});

/**
 * GET /api/applications/lookup
 * Public OTP / status tracker endpoint
 */
router.post('/status-lookup', async (req, res) => {
  try {
    const { applicationNo, mobile } = req.body;
    if (!applicationNo) {
      return res.status(400).json({ success: false, message: 'Application number is required.' });
    }

    const application = await prisma.application.findFirst({
      where: {
        applicationNo: applicationNo.trim(),
        ...(mobile ? { applicantUser: { mobile: mobile.trim().replace(/\D/g, '') } } : {})
      },
      include: {
        applicantUser: {
          select: { fullName: true, mobile: true, email: true }
        }
      }
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'No application found with the provided details. Please verify your Application Number.'
      });
    }

    return res.json({
      success: true,
      application
    });
  } catch (error) {
    console.error('Error in status-lookup:', error);
    return res.status(500).json({ success: false, message: 'Error checking application status.' });
  }
});

/**
 * GET /api/applications/me
 * Protected: returns logged-in student's application
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const application = await prisma.application.findFirst({
      where: { applicantUserId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        applicantUser: {
          select: {
            id: true,
            fullName: true,
            mobile: true,
            email: true,
            isVerified: true
          }
        }
      }
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'No application record found.' });
    }

    return res.json({
      success: true,
      application
    });
  } catch (error) {
    console.error('Error in /me:', error);
    return res.status(500).json({ success: false, message: 'Failed to retrieve application.', error: error.message });
  }
});

/**
 * PUT /api/applications/step/:stepNumber
 * Auto-saves wizard data for the step, performs strict server validations
 */
router.put('/step/:stepNumber', authMiddleware, async (req, res) => {
  try {
    const stepNumber = parseInt(req.params.stepNumber, 10);
    if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 9) {
      return res.status(400).json({ success: false, message: 'Invalid step number. Must be between 1 and 9.' });
    }

    const application = await prisma.application.findFirst({
      where: { applicantUserId: req.user.id },
      orderBy: { createdAt: 'desc' }
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    // Lock mutations if already submitted or not in draft
    if (application.status !== 'DRAFT') {
      return res.status(403).json({
        success: false,
        code: 'APPLICATION_ALREADY_SUBMITTED',
        message: 'Your application has already been submitted and is locked from further edits.'
      });
    }

    const payload = req.body || {};
    const updateData = {};

    // -----------------------------------------
    // STEP 2: Programme
    // -----------------------------------------
    if (stepNumber === 2) {
      const { institutionType, classOrCourse, academicYear, specializationOrStream, mode } = payload;

      if (!institutionType || !['SCHOOL', 'COLLEGE'].includes(institutionType)) {
        return res.status(400).json({ success: false, message: 'Please select institution type (School or College).' });
      }

      if (!classOrCourse) {
        return res.status(400).json({ success: false, message: 'Class or Course selection is required.' });
      }

      updateData.institutionType = institutionType;
      updateData.classOrCourse = classOrCourse;
      updateData.academicYear = academicYear || '2026-2027';
      updateData.specializationOrStream = specializationOrStream || null;
      updateData.mode = mode && mode !== 'Residential' ? mode : 'Day Scholar';
    }

    // -----------------------------------------
    // STEP 3: Board Selection
    // -----------------------------------------
    if (stepNumber === 3) {
      const { board } = payload;
      if (!board || !['CBSE', 'ICSE_ISC', 'STATE'].includes(board)) {
        return res.status(400).json({ success: false, message: 'Please select a valid affiliated board (CBSE, ICSE/ISC, or State Board).' });
      }

      // Check board compatibility with chosen class
      const currentClass = payload.classOrCourse || application.classOrCourse;
      const classMeta = CLASS_OPTIONS.find(c => c.value === currentClass);
      if (classMeta && classMeta.boards.length > 0 && !classMeta.boards.includes(board)) {
        return res.status(400).json({
          success: false,
          message: `${board} is not currently offered for ${currentClass}. Allowed boards: ${classMeta.boards.join(', ')}`
        });
      }

      updateData.board = board;
      if (payload.classOrCourse) updateData.classOrCourse = payload.classOrCourse;
    }

    // -----------------------------------------
    // STEP 4: Curriculum & Subjects
    // -----------------------------------------
    if (stepNumber === 4) {
      const { selectedSubjects } = payload;
      if (!selectedSubjects) {
        return res.status(400).json({ success: false, message: 'Subject selection is required.' });
      }

      updateData.selectedSubjects = selectedSubjects;
    }

    // -----------------------------------------
    // STEP 5: Student Details
    // -----------------------------------------
    if (stepNumber === 5) {
      const { fullName, dob, gender, bloodGroup, nationality, address, photoUrl, category, idNumber } = payload;

      if (!fullName || fullName.trim().length < 2) {
        return res.status(400).json({ success: false, message: 'Student full name is required.' });
      }

      if (!dob) {
        return res.status(400).json({ success: false, message: 'Date of birth is required.' });
      }

      // Age eligibility check against chosen class
      const ageCheck = validateAgeEligibility(dob, application.classOrCourse);
      if (!ageCheck.valid) {
        return res.status(400).json({
          success: false,
          message: ageCheck.message,
          ageCheck
        });
      }

      if (!gender) {
        return res.status(400).json({ success: false, message: 'Gender selection is required.' });
      }

      updateData.studentDetails = {
        fullName: fullName.trim(),
        dob,
        gender,
        bloodGroup: bloodGroup || 'O+',
        nationality: nationality || 'Indian',
        category: category || 'General',
        idNumber: idNumber || '',
        address: address || {},
        photoUrl: photoUrl || null,
        calculatedAge: ageCheck.age
      };
    }

    // -----------------------------------------
    // STEP 6: Parent / Guardian Details
    // -----------------------------------------
    if (stepNumber === 6) {
      const { fatherName, motherName, guardianName, fatherOccupation, motherOccupation, mobile, email, emergencyContact, annualIncome } = payload;

      if (!fatherName && !motherName && !guardianName) {
        return res.status(400).json({ success: false, message: 'At least one parent or guardian name is required.' });
      }

      const cleanMobile = (mobile || '').toString().trim().replace(/\D/g, '');
      if (cleanMobile && cleanMobile.length !== 10) {
        return res.status(400).json({ success: false, message: 'Parent mobile number must be 10 digits.' });
      }

      const cleanEmergency = (emergencyContact || '').toString().trim().replace(/\D/g, '');
      if (cleanEmergency && cleanEmergency.length !== 10) {
        return res.status(400).json({ success: false, message: 'Emergency contact must be exactly 10 digits.' });
      }

      updateData.parentDetails = {
        fatherName: fatherName ? fatherName.trim() : '',
        motherName: motherName ? motherName.trim() : '',
        guardianName: guardianName ? guardianName.trim() : '',
        fatherOccupation: fatherOccupation || '',
        motherOccupation: motherOccupation || '',
        mobile: cleanMobile,
        email: email ? email.trim().toLowerCase() : '',
        emergencyContact: cleanEmergency,
        annualIncome: annualIncome || ''
      };
    }

    // -----------------------------------------
    // STEP 7: Previous Education
    // -----------------------------------------
    if (stepNumber === 7) {
      const { lastSchool, board, passingYear, percentageMarks, reasonForLeaving, tcNumber, skippedForNursery } = payload;
      const currentClass = payload.classOrCourse || application.classOrCourse;
      const isNursery = !!skippedForNursery || ['Nursery', 'Pre-KG', 'LKG', 'UKG', 'Kindergarten', 'Pre-Primary'].includes(currentClass);

      updateData.previousEducation = {
        skippedForNursery: isNursery,
        lastSchool: isNursery ? (lastSchool || 'N/A (First-Time Nursery Admission)') : (lastSchool ? lastSchool.trim() : ''),
        board: isNursery ? (board || 'N/A') : (board || ''),
        passingYear: isNursery ? '' : (passingYear || ''),
        percentageMarks: isNursery ? '' : (percentageMarks || ''),
        reasonForLeaving: isNursery ? '' : (reasonForLeaving || ''),
        tcNumber: isNursery ? '' : (tcNumber || '')
      };
    }

    // -----------------------------------------
    // STEP 8: Facilities (Strict Conditional Rules)
    // -----------------------------------------
    if (stepNumber === 8) {
      const { hostel, transport, library } = payload;

      // Conditional check: if hostel opted, roomType is strictly required
      if (hostel && hostel.opted) {
        if (!hostel.roomType || hostel.roomType.trim() === '') {
          return res.status(400).json({
            success: false,
            message: 'Room type selection is required when opting for Hostel accommodation.'
          });
        }
      }

      // Conditional check: if transport opted, pickupArea is strictly required
      if (transport && transport.opted) {
        if (!transport.pickupArea || transport.pickupArea.trim() === '') {
          return res.status(400).json({
            success: false,
            message: 'Pickup area is required when opting for School Transport.'
          });
        }
      }

      updateData.facilities = {
        hostel: {
          opted: !!(hostel && hostel.opted),
          roomType: hostel && hostel.opted ? hostel.roomType : null
        },
        transport: {
          opted: !!(transport && transport.opted),
          pickupArea: transport && transport.opted ? transport.pickupArea : null
        },
        library: library !== undefined ? !!library : true
      };
    }

    // -----------------------------------------
    // STEP 9: Documents
    // -----------------------------------------
    if (stepNumber === 9) {
      const { documents } = payload;
      updateData.documents = documents || {};
    }

    // Advance currentStep if moving forward
    const nextStep = Math.min(9, Math.max(application.currentStep, stepNumber + 1));
    updateData.currentStep = nextStep;

    const updatedApplication = await prisma.application.update({
      where: { id: application.id },
      data: updateData,
      include: {
        applicantUser: {
          select: { fullName: true, mobile: true, email: true }
        }
      }
    });

    return res.json({
      success: true,
      message: `Step ${stepNumber} data saved successfully.`,
      application: updatedApplication
    });
  } catch (error) {
    console.error('Error saving step:', error);
    return res.status(500).json({ success: false, message: 'Failed to save application step data.', error: error.message });
  }
});

/**
 * POST /api/applications/submit
 * Validates complete multi-step application, changes status to SUBMITTED, and locks mutations
 */
router.post('/submit', authMiddleware, async (req, res) => {
  try {
    const application = await prisma.application.findFirst({
      where: { applicantUserId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: { applicantUser: true }
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'No application found to submit.' });
    }

    if (application.status === 'SUBMITTED') {
      return res.status(400).json({
        success: false,
        message: 'Application has already been submitted.',
        application
      });
    }

    // Comprehensive Verification of Required Steps
    if (!application.institutionType || !application.classOrCourse) {
      return res.status(400).json({ success: false, message: 'Step 2 (Programme & Class) is incomplete.' });
    }

    if (application.institutionType === 'SCHOOL' && !application.board) {
      return res.status(400).json({ success: false, message: 'Step 3 (Board Selection) is incomplete.' });
    }

    if (!application.studentDetails || !application.studentDetails.fullName || !application.studentDetails.dob) {
      return res.status(400).json({ success: false, message: 'Step 5 (Student Details) is incomplete. Full Name and DOB are mandatory.' });
    }

    if (!application.parentDetails || (!application.parentDetails.fatherName && !application.parentDetails.motherName && !application.parentDetails.guardianName)) {
      return res.status(400).json({ success: false, message: 'Step 6 (Parent / Guardian Details) is incomplete.' });
    }

    // Set submitted status
    const submittedApp = await prisma.application.update({
      where: { id: application.id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
        currentStep: 9
      },
      include: {
        applicantUser: {
          select: { fullName: true, mobile: true, email: true }
        }
      }
    });

    console.log(`\n======================================================`);
    console.log(`[APPLICATION SUBMITTED] Application No: ${submittedApp.applicationNo}`);
    console.log(`Student: ${submittedApp.studentDetails?.fullName || submittedApp.applicantUser.fullName}`);
    console.log(`Academic Year: ${submittedApp.academicYear} | Class: ${submittedApp.classOrCourse}`);
    console.log(`======================================================\n`);

    return res.json({
      success: true,
      message: 'Application submitted successfully! Your submission is now under review.',
      application: submittedApp
    });
  } catch (error) {
    console.error('Error submitting application:', error);
    return res.status(500).json({ success: false, message: 'Submission failed.', error: error.message });
  }
});

/**
 * GET /api/applications/:id/pdf
 * Generates official application PDF using PDFKit as a backend fallback
 */
router.get('/:id/pdf', async (req, res) => {
  try {
    const { id } = req.params;
    const application = await prisma.application.findFirst({
      where: {
        OR: [
          { id: id },
          { applicationNo: id }
        ]
      },
      include: {
        applicantUser: true
      }
    });

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found.' });
    }

    const filename = `${application.applicationNo || 'SIS-2026'}-Application.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    let PDFDocument;
    try {
      PDFDocument = require('pdfkit');
    } catch (e) {
      try {
        const mod = await import('pdfkit');
        PDFDocument = mod.default || mod;
      } catch (e2) {
        PDFDocument = null;
      }
    }

    if (!PDFDocument) {
      const minimalPdf = `%PDF-1.4\n1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n4 0 obj << /Length 250 >> stream\nBT\n/F1 16 Tf\n50 800 Td\n(SKANDA INTERNATIONAL SCHOOL - ADMISSION SUMMARY) Tj\n0 -30 Td\n/F1 12 Tf\n(Application No: ${application.applicationNo}) Tj\n0 -20 Td\n(Status: ${application.status}) Tj\n0 -20 Td\n(Academic Year: ${application.academicYear}) Tj\nET\nendstream\nendobj\n5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\nxref\n0 6\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000244 00000 n \n0000000550 00000 n \ntrailer << /Size 6 /Root 1 0 R >>\nstartxref\n620\n%%EOF`;
      return res.send(Buffer.from(minimalPdf));
    }

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(res);

    // Header
    doc.rect(40, 40, 515, 60).fill('#1D4ED8');
    doc.fillColor('#FFFFFF').fontSize(20).text('SKANDA INTERNATIONAL SCHOOL', 55, 52);
    doc.fontSize(10).text('Bengaluru Main Campus • Admissions Academic Session 2026–2027', 55, 78);

    doc.moveDown(4);
    doc.fillColor('#0F172A').fontSize(14).text(`Application Number: ${application.applicationNo}`, 40, 120);
    doc.fillColor('#16A34A').fontSize(12).text(`Status: ${application.status}`, 40, 140);

    const student = application.studentDetails || {};
    doc.fillColor('#1E3A8A').fontSize(12).text('1. Student Information', 40, 170);
    doc.fillColor('#475569').fontSize(10)
      .text(`Full Name: ${student.fullName || application.applicantUser?.fullName || 'N/A'}`)
      .text(`DOB: ${student.dob || 'N/A'} | Gender: ${student.gender || 'N/A'}`)
      .text(`Class/Course: ${application.classOrCourse} | Board: ${application.board || 'CBSE'}`);

    const parent = application.parentDetails || {};
    doc.moveDown();
    doc.fillColor('#1E3A8A').fontSize(12).text('2. Parent / Guardian Details');
    doc.fillColor('#475569').fontSize(10)
      .text(`Father: ${parent.fatherName || 'N/A'} | Mother: ${parent.motherName || 'N/A'}`)
      .text(`Mobile: +91 ${parent.mobile || application.applicantUser?.mobile}`)
      .text(`Email: ${parent.email || application.applicantUser?.email}`);

    const fac = application.facilities || {};
    doc.moveDown();
    doc.fillColor('#1E3A8A').fontSize(12).text('3. Campus Facilities');
    doc.fillColor('#475569').fontSize(10)
      .text(`Hostel: ${fac.hostel?.opted ? `Opted (${fac.hostel.roomType})` : 'Not Opted'}`)
      .text(`Transport: ${fac.transport?.opted ? `Opted (Pickup: ${fac.transport.pickupArea})` : 'Not Opted'}`)
      .text(`Library: ${fac.library !== false ? 'Included' : 'No'}`);

    doc.moveDown(2);
    doc.fillColor('#94A3B8').fontSize(9).text('Electronically generated admission summary • Skanda International School', { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Error generating backend PDF:', error);
    res.status(500).json({ success: false, message: 'Failed to generate PDF.' });
  }
});

module.exports = router;
