const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envPaths = [
  path.resolve(__dirname, '../server/.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '.env')
];
for (const envPath of envPaths) {
  try {
    dotenv.config({ path: envPath });
  } catch (_) {}
}

let PrismaClient;
try {
  ({ PrismaClient } = require('@prisma/client'));
} catch (_) {
  ({ PrismaClient } = require(path.resolve(__dirname, '../server/node_modules/@prisma/client')));
}

let bcrypt;
try {
  bcrypt = require('bcryptjs');
} catch (_) {
  bcrypt = require(path.resolve(__dirname, '../server/node_modules/bcryptjs'));
}

const prisma = new PrismaClient();

const CAMPUSES = [
  { id: 'kanakapura', name: 'Skanda International School (Main Campus)', city: 'Bengaluru', location: 'Kanakapura Road', board: 'CBSE & ICSE' },
  { id: 'whitefield', name: 'Skanda World School (Tech Corridor Campus)', city: 'Bengaluru', location: 'Whitefield', board: 'CBSE & Cambridge' },
  { id: 'mysuru', name: 'Skanda Heritage Academy', city: 'Mysuru', location: 'Vijayanagar', board: 'CBSE & State Board' },
  { id: 'mangaluru', name: 'Skanda Coastal Pre-University College', city: 'Mangaluru', location: 'Kadri Hills', board: 'Karnataka State PU & College' }
];

const BOARDS = [
  { code: 'CBSE', name: 'Central Board of Secondary Education (CBSE)', classes: 'Nursery to Grade 12' },
  { code: 'ICSE_ISC', name: 'Council for the Indian School Certificate Examinations (ICSE/ISC)', classes: 'Grade 1 to Grade 12' },
  { code: 'STATE', name: 'Karnataka Secondary Education Examination Board', classes: 'Grade 1 to Grade 10 / PUC' }
];

const DEFAULT_APPLICANT = {
  fullName: 'Aarav Sharma',
  mobile: '9876543210',
  email: 'applicant.demo@skandaschool.edu.in',
  password: 'Password@123',
  applicationNo: 'SKD-2026-00001'
};

async function main() {
  console.log('🌱 Starting Skanda International School Database Seed...');

  console.log(`📍 Validated ${CAMPUSES.length} Campuses:`);
  CAMPUSES.forEach(c => console.log(`   - ${c.name} (${c.city} • ${c.board})`));

  console.log(`📚 Validated ${BOARDS.length} Educational Boards:`);
  BOARDS.forEach(b => console.log(`   - ${b.code}: ${b.name} (${b.classes})`));

  // Seed sample demo applicant user
  const passwordHash = await bcrypt.hash(DEFAULT_APPLICANT.password, 10);
  const user = await prisma.applicantUser.upsert({
    where: { mobile: DEFAULT_APPLICANT.mobile },
    update: {
      fullName: DEFAULT_APPLICANT.fullName,
      email: DEFAULT_APPLICANT.email,
      isVerified: true
    },
    create: {
      fullName: DEFAULT_APPLICANT.fullName,
      mobile: DEFAULT_APPLICANT.mobile,
      email: DEFAULT_APPLICANT.email,
      passwordHash,
      isVerified: true
    }
  });

  console.log(`👤 Seeded Applicant User: ${user.fullName} (${user.mobile})`);

  // Seed default draft application for the demo applicant
  const existingApp = await prisma.application.findFirst({
    where: { applicantUserId: user.id }
  });

  if (!existingApp) {
    const application = await prisma.application.create({
      data: {
        applicationNo: DEFAULT_APPLICANT.applicationNo,
        applicantUserId: user.id,
        academicYear: '2026-2027',
        status: 'DRAFT',
        currentStep: 2,
        institutionType: 'SCHOOL',
        classOrCourse: 'Grade 11',
        board: 'CBSE',
        specializationOrStream: 'Pure Sciences (PCMB)',
        mode: 'Day Scholar',
        selectedSubjects: ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English Core'],
        studentDetails: {
          firstName: 'Aarav',
          lastName: 'Sharma',
          dob: '2010-05-15',
          gender: 'Male',
          bloodGroup: 'O+',
          nationality: 'Indian'
        },
        parentDetails: {
          fatherName: 'Rajesh Sharma',
          motherName: 'Sunita Sharma',
          emergencyContact: '9876543210',
          address: '42, Kanakapura Main Road, Bengaluru, Karnataka - 560062'
        },
        facilities: {
          hostel: false,
          transport: true,
          busRoute: 'Route 12 - Jayanagar to Campus',
          library: true
        }
      }
    });
    console.log(`📝 Seeded Demo Application: ${application.applicationNo} [Step ${application.currentStep}]`);
  } else {
    console.log(`📝 Verified Demo Application: ${existingApp.applicationNo} (Status: ${existingApp.status})`);
  }

  console.log('✅ Skanda International School database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
