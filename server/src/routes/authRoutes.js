const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

// Helper to generate next application number
async function generateApplicationNumber() {
  const currentYear = '2026';
  const count = await prisma.application.count();
  const nextNum = (count + 1).toString().padStart(4, '0');
  return `SIS-${currentYear}-${nextNum}`;
}

// Generate 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * POST /api/auth/register-step1
 * Full applicant registration creating ApplicantUser + initial DRAFT Application
 */
router.post('/register-step1', async (req, res) => {
  try {
    const { fullName, mobile, email, password } = req.body;

    // Strict Validations
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Full name is required (minimum 2 characters).' });
    }

    const cleanMobile = (mobile || '').toString().trim().replace(/\D/g, '');
    if (!/^\d{10}$/.test(cleanMobile)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim().toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    // Minimum 8 characters with at least 1 letter and 1 number
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!password || !passwordRegex.test(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and contain at least 1 letter and 1 number.'
      });
    }

    // Check existing
    const existingUser = await prisma.applicantUser.findFirst({
      where: {
        OR: [
          { mobile: cleanMobile },
          { email: email.trim().toLowerCase() }
        ]
      },
      include: {
        applications: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this mobile number or email already exists. Please log in to continue your application.',
        alreadyRegistered: true,
        mobile: existingUser.mobile
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const otpCode = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    // Create user & initial draft application
    const applicationNo = await generateApplicationNumber();

    const newUser = await prisma.applicantUser.create({
      data: {
        fullName: fullName.trim(),
        mobile: cleanMobile,
        email: email.trim().toLowerCase(),
        passwordHash,
        isVerified: false,
        otpCode,
        otpExpiresAt,
        applications: {
          create: {
            applicationNo,
            academicYear: '2026-2027',
            status: 'DRAFT',
            currentStep: 2, // successfully passed step 1
            institutionType: 'SCHOOL',
            classOrCourse: 'Grade 6',
            studentDetails: {
              fullName: fullName.trim()
            }
          }
        }
      },
      include: {
        applications: true
      }
    });

    console.log(`\n======================================================`);
    console.log(`[DEV OTP NOTIFICATION] Mobile: ${cleanMobile} | OTP: ${otpCode}`);
    console.log(`Application Created: ${applicationNo}`);
    console.log(`======================================================\n`);

    const application = newUser.applications[0];
    const token = jwt.sign({ userId: newUser.id, mobile: newUser.mobile }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully. An OTP has been sent for verification.',
      otpPreview: otpCode, // sent for development/demo ease
      token,
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        mobile: newUser.mobile,
        email: newUser.email,
        isVerified: newUser.isVerified
      },
      application
    });
  } catch (error) {
    console.error('Error in register-step1:', error);
    return res.status(500).json({ success: false, message: 'Registration failed due to a server error.', error: error.message });
  }
});

/**
 * POST /api/auth/send-otp
 * Generates OTP for login or verification
 */
router.post('/send-otp', async (req, res) => {
  try {
    const { mobile } = req.body;
    const cleanMobile = (mobile || '').toString().trim().replace(/\D/g, '');

    if (!cleanMobile || cleanMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 10-digit mobile number.' });
    }

    const user = await prisma.applicantUser.findUnique({
      where: { mobile: cleanMobile }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No application account found with this mobile number. Please start a new application.'
      });
    }

    const otpCode = generateOtp();
    const otpExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.applicantUser.update({
      where: { id: user.id },
      data: { otpCode, otpExpiresAt }
    });

    console.log(`\n======================================================`);
    console.log(`[DEV OTP SENT] Mobile: ${cleanMobile} | OTP: ${otpCode}`);
    console.log(`======================================================\n`);

    return res.json({
      success: true,
      message: 'OTP has been sent to your registered mobile number.',
      otpPreview: otpCode
    });
  } catch (error) {
    console.error('Error in send-otp:', error);
    return res.status(500).json({ success: false, message: 'Failed to dispatch OTP.', error: error.message });
  }
});

/**
 * POST /api/auth/verify-otp
 * OTP Verification for both registration confirmation and resuming application
 */
router.post('/verify-otp', async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    const cleanMobile = (mobile || '').toString().trim().replace(/\D/g, '');

    if (!cleanMobile || cleanMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Valid 10-digit mobile number is required.' });
    }

    if (!otp || otp.toString().trim().length < 4) {
      return res.status(400).json({ success: false, message: 'Please enter the OTP.' });
    }

    const user = await prisma.applicantUser.findUnique({
      where: { mobile: cleanMobile },
      include: {
        applications: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Account not found for this mobile number.' });
    }

    // Check OTP match or master test OTP '123456'
    const trimmedOtp = otp.toString().trim();
    const isMasterOtp = trimmedOtp === '123456';
    const isMatched = user.otpCode === trimmedOtp;

    if (!isMasterOtp && !isMatched) {
      return res.status(400).json({ success: false, message: 'Invalid OTP entered. Please try again.' });
    }

    if (!isMasterOtp && user.otpExpiresAt && new Date() > new Date(user.otpExpiresAt)) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Mark verified
    const updatedUser = await prisma.applicantUser.update({
      where: { id: user.id },
      data: {
        isVerified: true,
        otpCode: null
      }
    });

    let application = user.applications && user.applications[0];
    if (!application) {
      const applicationNo = await generateApplicationNumber();
      application = await prisma.application.create({
        data: {
          applicationNo,
          applicantUserId: user.id,
          academicYear: '2026-2027',
          status: 'DRAFT',
          currentStep: 1,
          institutionType: 'SCHOOL'
        }
      });
    }

    const token = jwt.sign({ userId: updatedUser.id, mobile: updatedUser.mobile }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      success: true,
      message: 'Mobile verification successful.',
      token,
      user: {
        id: updatedUser.id,
        fullName: updatedUser.fullName,
        mobile: updatedUser.mobile,
        email: updatedUser.email,
        isVerified: updatedUser.isVerified
      },
      application
    });
  } catch (error) {
    console.error('Error in verify-otp:', error);
    return res.status(500).json({ success: false, message: 'OTP verification failed.', error: error.message });
  }
});

/**
 * POST /api/auth/login-password
 * Direct login with registered mobile and password
 */
router.post('/login-password', async (req, res) => {
  try {
    const { mobile, password } = req.body;
    const cleanMobile = (mobile || '').toString().trim().replace(/\D/g, '');

    if (!cleanMobile || cleanMobile.length !== 10) {
      return res.status(400).json({ success: false, message: 'Please provide a valid 10-digit mobile number.' });
    }

    if (!password) {
      return res.status(400).json({ success: false, message: 'Password is required.' });
    }

    const user = await prisma.applicantUser.findUnique({
      where: { mobile: cleanMobile },
      include: {
        applications: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No registered applicant found with this mobile number.' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Invalid password. Please verify your credentials or use OTP login.' });
    }

    let application = user.applications && user.applications[0];
    if (!application) {
      const applicationNo = await generateApplicationNumber();
      application = await prisma.application.create({
        data: {
          applicationNo,
          applicantUserId: user.id,
          academicYear: '2026-2027',
          status: 'DRAFT',
          currentStep: 1,
          institutionType: 'SCHOOL'
        }
      });
    }

    const token = jwt.sign({ userId: user.id, mobile: user.mobile }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user.id,
        fullName: user.fullName,
        mobile: user.mobile,
        email: user.email,
        isVerified: user.isVerified
      },
      application
    });
  } catch (error) {
    console.error('Error in login-password:', error);
    return res.status(500).json({ success: false, message: 'Login failed due to a server error.', error: error.message });
  }
});

module.exports = router;
