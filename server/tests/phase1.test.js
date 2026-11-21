const request = require('supertest');
const app = require('../src/index');
const prisma = require('../src/db');

describe('Skanda International School - Phase 1 Integration Tests', () => {
  // Use unique 10-digit mobile and email for test execution
  const timestamp = Date.now().toString().slice(-8);
  const testMobile = `98${timestamp}`;
  const testEmail = `student_${Date.now()}@skandatest.edu`;
  const testPassword = 'Password123';
  let authToken = '';
  let applicationId = '';
  let applicationNumber = '';

  afterAll(async () => {
    // Cleanup created test records
    try {
      if (applicationId) {
        await prisma.application.deleteMany({
          where: { applicantUser: { mobile: testMobile } }
        });
      }
      await prisma.applicantUser.deleteMany({
        where: { mobile: testMobile }
      });
    } catch (e) {
      console.warn('Cleanup warning:', e.message);
    }
    await prisma.$disconnect();
  });

  describe('1. Registration & OTP Validation', () => {
    test('Rejects weak password (< 8 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/register-step1')
        .send({
          fullName: 'Test Applicant',
          mobile: testMobile,
          email: testEmail,
          password: 'pass1' // < 8 characters
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/at least 8 characters/i);
    });

    test('Rejects weak password (no numbers)', async () => {
      const res = await request(app)
        .post('/api/auth/register-step1')
        .send({
          fullName: 'Test Applicant',
          mobile: testMobile,
          email: testEmail,
          password: 'PasswordOnly' // No number
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/contain at least 1 letter and 1 number/i);
    });

    test('Rejects invalid 10-digit mobile number', async () => {
      const res = await request(app)
        .post('/api/auth/register-step1')
        .send({
          fullName: 'Test Applicant',
          mobile: '987654321', // 9 digits
          email: testEmail,
          password: testPassword
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/valid 10-digit mobile number/i);
    });

    test('Creates a DRAFT application (SIS-2026-XXXX) at currentStep = 1', async () => {
      const res = await request(app)
        .post('/api/auth/register-step1')
        .send({
          fullName: 'Aarav Sharma',
          mobile: testMobile,
          email: testEmail,
          password: testPassword
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.application).toBeDefined();
      expect(res.body.application.applicationNo).toMatch(/^SIS-2026-\d{4}$/);
      expect(res.body.application.status).toBe('DRAFT');
      expect(res.body.application.currentStep).toBe(1);

      applicationId = res.body.application.id;
      applicationNumber = res.body.application.applicationNo;
      authToken = res.body.token;
    });

    test('Rejects duplicate mobile registration', async () => {
      const res = await request(app)
        .post('/api/auth/register-step1')
        .send({
          fullName: 'Another Applicant',
          mobile: testMobile, // duplicate
          email: `alt_${testEmail}`,
          password: testPassword
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });
  });

  describe('2. Multi-Step Data Saving & Conditional Validations', () => {
    test('PUT Step 2 (Programme) saves programme details and advances step', async () => {
      const res = await request(app)
        .put('/api/applications/step/2')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          institutionType: 'SCHOOL',
          classOrCourse: 'Grade 6',
          academicYear: '2026-2027',
          specializationOrStream: 'General',
          mode: 'Day Scholar'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.application.institutionType).toBe('SCHOOL');
      expect(res.body.application.classOrCourse).toBe('Grade 6');
    });

    test('PUT Step 3 (Board) validates board compatibility and saves', async () => {
      const res = await request(app)
        .put('/api/applications/step/3')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          board: 'CBSE'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.application.board).toBe('CBSE');
    });

    test('PUT Step 4 (Curriculum & Subjects) saves selected compulsory and elective subjects', async () => {
      const res = await request(app)
        .put('/api/applications/step/4')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          selectedSubjects: {
            compulsory: ['English', 'Mathematics', 'Science', 'Social Science', 'Second Language: Hindi'],
            electives: ['Computer Science', 'Art & Craft']
          }
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.application.selectedSubjects.compulsory).toContain('Mathematics');
    });

    test('PUT Step 5 (Student Details) enforces age-eligibility rules', async () => {
      // Grade 6 requires approx 10-12 years. If DOB is 2024 (underage, ~2 years old), must reject
      const resUnderage = await request(app)
        .put('/api/applications/step/5')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fullName: 'Aarav Sharma',
          dob: '2024-01-01', // Underage for Grade 6
          gender: 'Male'
        });

      expect(resUnderage.status).toBe(400);
      expect(resUnderage.body.success).toBe(false);
      expect(resUnderage.body.message).toMatch(/age/i);

      // Now save with valid DOB for Grade 6 (e.g. 2015-05-15, approx 11 years)
      const resValid = await request(app)
        .put('/api/applications/step/5')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fullName: 'Aarav Sharma',
          dob: '2015-05-15',
          gender: 'Male',
          bloodGroup: 'B+',
          nationality: 'Indian'
        });

      expect(resValid.status).toBe(200);
      expect(resValid.body.success).toBe(true);
      expect(resValid.body.application.studentDetails.dob).toBe('2015-05-15');
    });

    test('PUT Step 8 (Facilities) rejects missing roomType when hostel.opted === true', async () => {
      const res = await request(app)
        .put('/api/applications/step/8')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hostel: {
            opted: true,
            roomType: '' // missing roomType
          },
          transport: { opted: false },
          library: true
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/room type.*required/i);
    });

    test('PUT Step 8 (Facilities) rejects missing pickupArea when transport.opted === true', async () => {
      const res = await request(app)
        .put('/api/applications/step/8')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hostel: { opted: false },
          transport: {
            opted: true,
            pickupArea: '' // missing pickupArea
          },
          library: true
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/pickup area.*required/i);
    });

    test('PUT Step 6 (Parent Details) saves father, mother, and guardian contacts', async () => {
      const res = await request(app)
        .put('/api/applications/step/6')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          fatherName: 'Rajesh Sharma',
          motherName: 'Sunita Sharma',
          mobile: '9876543210',
          email: 'rajesh.sharma@example.com',
          fatherOccupation: 'Software Architect',
          motherOccupation: 'Professor'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.application.parentDetails.fatherName).toBe('Rajesh Sharma');
    });

    test('PUT Step 8 (Facilities) saves successfully when valid options provided', async () => {
      const res = await request(app)
        .put('/api/applications/step/8')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          hostel: {
            opted: true,
            roomType: 'Twin Sharing AC'
          },
          transport: {
            opted: true,
            pickupArea: 'Indiranagar Metro Station'
          },
          library: true
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.application.facilities.hostel.roomType).toBe('Twin Sharing AC');
      expect(res.body.application.facilities.transport.pickupArea).toBe('Indiranagar Metro Station');
    });
  });

  describe('3. 2-Day Later OTP Login & Resume Simulation', () => {
    test('Sends OTP to existing applicant mobile', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ mobile: testMobile });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/sent/i);
    });

    test('Verifies OTP, generates session, and restores previously saved draft data', async () => {
      // We can use the dev master OTP '123456'
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          mobile: testMobile,
          otp: '123456'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();

      const resumedApp = res.body.application;
      expect(resumedApp).toBeDefined();
      expect(resumedApp.applicationNo).toBe(applicationNumber);
      expect(resumedApp.board).toBe('CBSE');
      expect(resumedApp.studentDetails.fullName).toBe('Aarav Sharma');
      expect(resumedApp.selectedSubjects.compulsory).toContain('Mathematics');
      expect(resumedApp.facilities.hostel.roomType).toBe('Twin Sharing AC');
      expect(resumedApp.facilities.transport.pickupArea).toBe('Indiranagar Metro Station');

      // Update token to resumed token
      authToken = res.body.token;
    });
  });

  describe('4. Application Final Submission & Mutation Locking', () => {
    test('POST /api/applications/submit validates, marks SUBMITTED, and sets submittedAt', async () => {
      const res = await request(app)
        .post('/api/applications/submit')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          declarationAccepted: true
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.application.status).toBe('SUBMITTED');
      expect(res.body.application.submittedAt).toBeDefined();
    });

    test('Blocks further step mutations once status is SUBMITTED', async () => {
      const res = await request(app)
        .put('/api/applications/step/2')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          classOrCourse: 'Grade 7'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already been submitted and is locked/i);
    });
  });

  describe('5. PDF Document Generation Verification', () => {
    test('GET /api/applications/:id/pdf returns 200 OK with application/pdf header and non-empty binary', async () => {
      const res = await request(app)
        .get(`/api/applications/${applicationId}/pdf`)
        .set('Authorization', `Bearer ${authToken}`)
        .buffer(true)
        .parse((res, callback) => {
          res.data = '';
          res.setEncoding('binary');
          res.on('data', chunk => {
            res.data += chunk;
          });
          res.on('end', () => {
            callback(null, Buffer.from(res.data, 'binary'));
          });
        });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
      expect(res.headers['content-disposition']).toMatch(/attachment;\s*filename="?SIS-2026/);
      expect(res.body).toBeInstanceOf(Buffer);
      expect(res.body.length).toBeGreaterThan(100);
      // Valid PDF files start with %PDF
      const headerStr = res.body.slice(0, 5).toString('ascii');
      expect(headerStr).toBe('%PDF-');
    });
  });
});
