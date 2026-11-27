const path = require('path');
const dotenv = require('dotenv');

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

async function main() {
  console.log('🌱 Starting Skanda International School Phase 1 & Phase 2 Seed...');

  // 1. Seed Branches
  const mainBranch = await prisma.branch.upsert({
    where: { code: 'BLR-MAIN' },
    update: {},
    create: {
      code: 'BLR-MAIN',
      name: 'Skanda International School (Kanakapura Main)',
      city: 'Bengaluru',
      institutionMode: 'BOTH',
      address: 'Kanakapura Main Road, South Bengaluru - 560062',
      phone: '+91 80 2843 9000',
      email: 'main@skanda.edu.in'
    }
  });

  const eastBranch = await prisma.branch.upsert({
    where: { code: 'BLR-EAST' },
    update: {},
    create: {
      code: 'BLR-EAST',
      name: 'Skanda World School (Whitefield Tech Campus)',
      city: 'Bengaluru',
      institutionMode: 'SCHOOL',
      address: 'ITPL Main Road, Whitefield, Bengaluru - 560066',
      phone: '+91 80 2843 9100',
      email: 'whitefield@skanda.edu.in'
    }
  });

  // 2. Seed Academic Year 2026-2027
  let ayMain = await prisma.academicYear.findFirst({
    where: { branchId: mainBranch.id, name: '2026-2027' }
  });
  if (!ayMain) {
    ayMain = await prisma.academicYear.create({
      data: { branchId: mainBranch.id, name: '2026-2027', isCurrent: true }
    });
  }

  let ayEast = await prisma.academicYear.findFirst({
    where: { branchId: eastBranch.id, name: '2026-2027' }
  });
  if (!ayEast) {
    ayEast = await prisma.academicYear.create({
      data: { branchId: eastBranch.id, name: '2026-2027', isCurrent: true }
    });
  }

  // 3. Seed Branch Config (Syllabi, Grades/Courses, Subjects, Fee Structures)
  const existingSyllabi = await prisma.branchSyllabus.count({ where: { branchId: mainBranch.id } });
  if (existingSyllabi === 0) {
    await prisma.branchSyllabus.createMany({
      data: [
        { branchId: mainBranch.id, name: 'CBSE', institutionType: 'SCHOOL', isEnabled: true },
        { branchId: mainBranch.id, name: 'ICSE_ISC', institutionType: 'SCHOOL', isEnabled: true },
        { branchId: mainBranch.id, name: 'Department of Computer Science & Engineering', institutionType: 'COLLEGE', isEnabled: true },
        { branchId: eastBranch.id, name: 'CBSE', institutionType: 'SCHOOL', isEnabled: true }
      ]
    });
  }

  const existingGrades = await prisma.branchGradeOrCourse.count({ where: { branchId: mainBranch.id } });
  if (existingGrades === 0) {
    await prisma.branchGradeOrCourse.createMany({
      data: [
        { branchId: mainBranch.id, name: 'Grade 10', institutionType: 'SCHOOL', seatCapacity: 60, sections: ['A', 'B'] },
        { branchId: mainBranch.id, name: 'B.Tech Computer Science', institutionType: 'COLLEGE', seatCapacity: 60, sections: ['A'] },
        { branchId: eastBranch.id, name: 'Grade 6', institutionType: 'SCHOOL', seatCapacity: 40, sections: ['A'] }
      ]
    });
  }

  const existingFees = await prisma.branchFeeStructure.count({ where: { branchId: mainBranch.id } });
  if (existingFees === 0) {
    await prisma.branchFeeStructure.createMany({
      data: [
        { branchId: mainBranch.id, gradeOrCourse: 'Grade 10', tuitionFee: 85000, transportFee: 18000, hostelFee: 65000, examFee: 3500, lateFineDaily: 50 },
        { branchId: mainBranch.id, gradeOrCourse: 'B.Tech Computer Science', tuitionFee: 165000, transportFee: 22000, hostelFee: 78000, examFee: 5000, lateFineDaily: 100 },
        { branchId: eastBranch.id, gradeOrCourse: 'Grade 6', tuitionFee: 95000, transportFee: 20000, hostelFee: 0, examFee: 3000, lateFineDaily: 50 }
      ]
    });
  }

  // 4. Seed Phase 2 RBAC Users
  const passwordHash = await bcrypt.hash('Password@123', 10);

  const upsertUser = (email, data) =>
    prisma.user.upsert({
      where: { email },
      update: { ...data, passwordHash },
      create: { email, passwordHash, ...data }
    });

  const superAdmin = await upsertUser('superadmin@skanda.edu.in', {
    fullName: 'Dr. Vikramaditya Rao (Super Admin)',
    mobile: '9900000001',
    role: 'SUPER_ADMIN',
    permissions: { all: ['create', 'read', 'update', 'delete'] }
  });

  const branchAdmin = await upsertUser('principal.blr@skanda.edu.in', {
    branchId: mainBranch.id,
    fullName: 'Prof. Meenakshi Iyer (Principal)',
    mobile: '9900000002',
    role: 'ADMIN',
    permissions: { campus: ['create', 'read', 'update', 'delete'] }
  });

  await upsertUser('accountant.blr@skanda.edu.in', {
    branchId: mainBranch.id,
    fullName: 'Ramesh Kulkarni (Accountant)',
    mobile: '9900000003',
    role: 'ACCOUNTANT',
    permissions: { fees: ['create', 'read', 'update'], reports: ['read'] }
  });

  await upsertUser('librarian.blr@skanda.edu.in', {
    branchId: mainBranch.id,
    fullName: 'Kavitha Menon (Chief Librarian)',
    mobile: '9900000006',
    role: 'LIBRARIAN',
    permissions: { library: ['create', 'read', 'update', 'delete'] }
  });

  const teacher1 = await upsertUser('teacher.blr@skanda.edu.in', {
    branchId: mainBranch.id,
    fullName: 'Ananya Deshmukh (Senior Mathematics)',
    mobile: '9900000004',
    role: 'TEACHER',
    department: 'Mathematics & Computer Science'
  });

  const teacher2 = await upsertUser('teacher2.blr@skanda.edu.in', {
    branchId: mainBranch.id,
    fullName: 'Karthik Nair (Physics & STEM)',
    mobile: '9900000005',
    role: 'TEACHER',
    department: 'Physics & Engineering'
  });

  const parentUser = await upsertUser('parent.blr@skanda.edu.in', {
    branchId: mainBranch.id,
    fullName: 'Rajesh Sharma (Parent)',
    mobile: '9876543210',
    role: 'PARENT'
  });

  const studentUser1 = await upsertUser('student1.blr@skanda.edu.in', {
    branchId: mainBranch.id,
    fullName: 'Aarav Sharma',
    mobile: '9900000011',
    role: 'STUDENT'
  });

  const studentUser2 = await upsertUser('student2.blr@skanda.edu.in', {
    branchId: mainBranch.id,
    fullName: 'Diya Sharma',
    mobile: '9900000012',
    role: 'STUDENT'
  });

  // 5. Seed Student & Parent Profiles + Multi-Child Links
  const student1 = await prisma.studentProfile.upsert({
    where: { userId: studentUser1.id },
    update: {},
    create: {
      userId: studentUser1.id,
      branchId: mainBranch.id,
      academicYearId: ayMain.id,
      admissionNo: 'SKD-ADM-2026-001',
      rollNumber: '10A-01',
      classOrCourse: 'Grade 10',
      section: 'A',
      institutionType: 'SCHOOL',
      boardOrDept: 'CBSE',
      transportOpted: true
    }
  });

  const student2 = await prisma.studentProfile.upsert({
    where: { userId: studentUser2.id },
    update: {},
    create: {
      userId: studentUser2.id,
      branchId: mainBranch.id,
      academicYearId: ayMain.id,
      admissionNo: 'SKD-ADM-2026-002',
      rollNumber: 'CSE-01',
      classOrCourse: 'B.Tech Computer Science',
      section: 'A',
      institutionType: 'COLLEGE',
      boardOrDept: 'Department of Computer Science & Engineering',
      hostelOpted: true
    }
  });

  const parentProfile = await prisma.parentProfile.upsert({
    where: { userId: parentUser.id },
    update: {},
    create: {
      userId: parentUser.id,
      branchId: mainBranch.id,
      phone: '9876543210'
    }
  });

  await prisma.parentStudentLink.upsert({
    where: { parentId_studentId: { parentId: parentProfile.id, studentId: student1.id } },
    update: {},
    create: { parentId: parentProfile.id, studentId: student1.id, relation: 'Father' }
  });

  await prisma.parentStudentLink.upsert({
    where: { parentId_studentId: { parentId: parentProfile.id, studentId: student2.id } },
    update: {},
    create: { parentId: parentProfile.id, studentId: student2.id, relation: 'Father' }
  });

  // 6. Seed Attendance (Student 1: 90%, Student 2 College: 60% -> triggers 75% shortage alert!)
  const attCount = await prisma.attendanceRecord.count({ where: { branchId: mainBranch.id } });
  if (attCount === 0) {
    const records = [
      { branchId: mainBranch.id, academicYearId: ayMain.id, studentId: student1.id, date: '2026-11-20', status: 'PRESENT', markedByUserId: teacher1.id },
      { branchId: mainBranch.id, academicYearId: ayMain.id, studentId: student1.id, date: '2026-11-21', status: 'PRESENT', markedByUserId: teacher1.id },
      { branchId: mainBranch.id, academicYearId: ayMain.id, studentId: student1.id, date: '2026-11-22', status: 'PRESENT', markedByUserId: teacher1.id },
      { branchId: mainBranch.id, academicYearId: ayMain.id, studentId: student1.id, date: '2026-11-23', status: 'PRESENT', markedByUserId: teacher1.id },
      { branchId: mainBranch.id, academicYearId: ayMain.id, studentId: student2.id, date: '2026-11-20', status: 'PRESENT', markedByUserId: teacher1.id },
      { branchId: mainBranch.id, academicYearId: ayMain.id, studentId: student2.id, date: '2026-11-21', status: 'ABSENT', markedByUserId: teacher1.id },
      { branchId: mainBranch.id, academicYearId: ayMain.id, studentId: student2.id, date: '2026-11-22', status: 'ABSENT', markedByUserId: teacher1.id },
      { branchId: mainBranch.id, academicYearId: ayMain.id, studentId: student2.id, date: '2026-11-23', status: 'PRESENT', markedByUserId: teacher1.id },
      { branchId: mainBranch.id, academicYearId: ayMain.id, studentId: student2.id, date: '2026-11-24', status: 'ABSENT', markedByUserId: teacher1.id }
    ];
    await prisma.attendanceRecord.createMany({ data: records });
  }

  // 7. Seed Timetable, Assignment, Exam, Leave & FeeInvoice
  const ttCount = await prisma.timetableSlot.count({ where: { branchId: mainBranch.id } });
  if (ttCount === 0) {
    await prisma.timetableSlot.createMany({
      data: [
        { branchId: mainBranch.id, academicYearId: ayMain.id, classOrCourse: 'Grade 10', section: 'A', dayOfWeek: 'Monday', periodNo: 1, timeRange: '09:00 - 09:45', subject: 'Mathematics Standard', teacherUserId: teacher1.id },
        { branchId: mainBranch.id, academicYearId: ayMain.id, classOrCourse: 'Grade 10', section: 'A', dayOfWeek: 'Monday', periodNo: 2, timeRange: '09:50 - 10:35', subject: 'Physics & STEM Lab', teacherUserId: teacher2.id },
        { branchId: mainBranch.id, academicYearId: ayMain.id, classOrCourse: 'B.Tech Computer Science', section: 'A', dayOfWeek: 'Monday', periodNo: 1, timeRange: '10:45 - 11:45', subject: 'CS102: Data Structures & Algorithms', teacherUserId: teacher1.id }
      ]
    });
  }

  const assignCount = await prisma.assignment.count({ where: { branchId: mainBranch.id } });
  if (assignCount === 0) {
    await prisma.assignment.createMany({
      data: [
        { branchId: mainBranch.id, academicYearId: ayMain.id, classOrCourse: 'Grade 10', subject: 'Mathematics Standard', title: 'Quadratic Equations Problem Set #4', description: 'Solve exercises 4.1 to 4.3 and submit worked steps.', dueDate: '2026-12-02', teacherUserId: teacher1.id },
        { branchId: mainBranch.id, academicYearId: ayMain.id, classOrCourse: 'B.Tech Computer Science', subject: 'CS102: Data Structures & Algorithms', title: 'Balanced AVL Tree Implementation', description: 'Implement AVL insertion/rotation in Python or C++.', dueDate: '2026-12-05', teacherUserId: teacher1.id }
      ]
    });
  }

  const examCount = await prisma.exam.count({ where: { branchId: mainBranch.id } });
  if (examCount === 0) {
    const exam = await prisma.exam.create({
      data: {
        branchId: mainBranch.id,
        academicYearId: ayMain.id,
        name: 'Term 1 Mid-Year Assessment 2026',
        classOrCourse: 'Grade 10',
        examDate: '2026-12-15',
        isPublished: true
      }
    });
    await prisma.examMark.create({
      data: { examId: exam.id, branchId: mainBranch.id, studentId: student1.id, subject: 'Mathematics Standard', marksObtained: 94, maxMarks: 100, grade: 'A1' }
    });
    await prisma.hallTicket.create({
      data: { examId: exam.id, branchId: mainBranch.id, studentId: student1.id, qrToken: `SKD-HT-${student1.rollNumber}-2026`, seatNumber: 'HALL-A-14' }
    });
  }

  const invCount = await prisma.feeInvoice.count({ where: { branchId: mainBranch.id } });
  if (invCount === 0) {
    await prisma.feeInvoice.createMany({
      data: [
        { branchId: mainBranch.id, academicYearId: ayMain.id, studentId: student1.id, invoiceNo: 'INV-BLR-2026-001', finesDue: 500, tuitionDue: 85000, transportDue: 18000, status: 'PENDING' },
        { branchId: mainBranch.id, academicYearId: ayMain.id, studentId: student2.id, invoiceNo: 'INV-BLR-2026-002', finesDue: 1000, tuitionDue: 165000, transportDue: 0, status: 'PENDING' }
      ]
    });
  }

  const leaveCount = await prisma.leaveRequest.count({ where: { branchId: mainBranch.id } });
  if (leaveCount === 0) {
    await prisma.leaveRequest.create({
      data: {
        branchId: mainBranch.id,
        academicYearId: ayMain.id,
        requesterUserId: teacher1.id,
        requesterType: 'TEACHER',
        fromDate: '2026-11-28',
        toDate: '2026-11-28',
        reason: 'Attending CBSE National Mathematics Pedagogical Workshop',
        status: 'PENDING'
      }
    });
  }

  const cmsCount = await prisma.cmsContent.count({ where: { branchId: mainBranch.id } });
  if (cmsCount === 0) {
    await prisma.cmsContent.create({
      data: {
        branchId: mainBranch.id,
        title: 'Annual Sports & Science Expo 2026',
        body: 'Registrations are open for Inter-House Robotics and Track & Field qualifiers at Kanakapura Main Campus.',
        category: 'ANNOUNCEMENT',
        isActive: true
      }
    });
  }

  // 7.5 Seed Library Books & Sample Issue
  const bookCount = await prisma.libraryBook.count({ where: { branchId: mainBranch.id } });
  if (bookCount === 0) {
    const book1 = await prisma.libraryBook.create({
      data: {
        branchId: mainBranch.id,
        isbn: '978-0-13-468599-1',
        title: 'Introduction to Algorithms (CLRS)',
        author: 'Thomas H. Cormen',
        category: 'Computer Science',
        totalCopies: 5,
        availableCopies: 4,
        accessionCode: 'LIB-BLR-0001'
      }
    });
    await prisma.libraryBook.createMany({
      data: [
        {
          branchId: mainBranch.id,
          isbn: '978-81-7450-634-4',
          title: 'NCERT Mathematics Standard Grade 10',
          author: 'NCERT Editorial Board',
          category: 'Mathematics',
          totalCopies: 12,
          availableCopies: 12,
          accessionCode: 'LIB-BLR-0002'
        },
        {
          branchId: mainBranch.id,
          isbn: '978-0-321-57351-3',
          title: 'Concepts of Physics (Vol 1 & 2)',
          author: 'H.C. Verma',
          category: 'Science & Physics',
          totalCopies: 8,
          availableCopies: 8,
          accessionCode: 'LIB-BLR-0003'
        },
        {
          branchId: mainBranch.id,
          isbn: '978-0-14-342412-3',
          title: 'Wings of Fire: An Autobiography',
          author: 'A.P.J. Abdul Kalam',
          category: 'Biography & Literature',
          totalCopies: 6,
          availableCopies: 6,
          accessionCode: 'LIB-BLR-0004'
        }
      ]
    });
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10);
    await prisma.bookIssue.create({
      data: {
        branchId: mainBranch.id,
        bookId: book1.id,
        userId: studentUser1.id,
        dueDate,
        status: 'ISSUED'
      }
    });
  }

  // 7.6 Seed Transport Manager, Driver, Vehicles, Routes, Stops & Allocation
  await prisma.user.upsert({
    where: { email: 'transport.blr@skanda.edu.in' },
    update: {},
    create: {
      branchId: mainBranch.id,
      fullName: 'Ramesh Gowda (Transport Head)',
      email: 'transport.blr@skanda.edu.in',
      mobile: '9880011220',
      passwordHash,
      role: 'TRANSPORT_MANAGER',
      permissions: { transport: ['CREATE', 'READ', 'UPDATE', 'DELETE'] }
    }
  });
  await prisma.user.upsert({
    where: { email: 'driver.blr@skanda.edu.in' },
    update: {},
    create: {
      branchId: mainBranch.id,
      fullName: 'Mahesh Kumar (Bus Driver)',
      email: 'driver.blr@skanda.edu.in',
      mobile: '9880099881',
      passwordHash,
      role: 'DRIVER'
    }
  });

  const vehicleCount = await prisma.transportVehicle.count({ where: { branchId: mainBranch.id } });
  if (vehicleCount === 0) {
    const in180Days = new Date(Date.now() + 180 * 86400000);
    const in12Days = new Date(Date.now() + 12 * 86400000);
    const bus1 = await prisma.transportVehicle.create({
      data: {
        branchId: mainBranch.id,
        busNumber: 'BUS-BLR-01',
        registrationNo: 'KA-05-SK-2026',
        capacity: 40,
        insuranceExpiry: in180Days,
        fitnessExpiry: in180Days,
        driverName: 'Mahesh Kumar',
        driverPhone: '9880099881',
        driverLicenseExpiry: in180Days
      }
    });
    await prisma.transportVehicle.create({
      data: {
        branchId: mainBranch.id,
        busNumber: 'BUS-BLR-02',
        registrationNo: 'KA-05-SK-2027',
        capacity: 32,
        insuranceExpiry: in12Days,
        fitnessExpiry: in180Days,
        driverName: 'Suresh Naik',
        driverPhone: '9880099882',
        driverLicenseExpiry: in180Days
      }
    });

    const route1 = await prisma.transportRoute.create({
      data: {
        branchId: mainBranch.id,
        vehicleId: bus1.id,
        routeCode: 'RT-BLR-01',
        routeName: 'South Bengaluru — Kanakapura Express'
      }
    });

    const stop1 = await prisma.routeStop.create({
      data: { routeId: route1.id, sequenceOrder: 1, stopName: 'Jayanagar 4th Block', lat: 12.9250, lng: 77.5938, scheduledTime: '07:30' }
    });
    await prisma.routeStop.create({
      data: { routeId: route1.id, sequenceOrder: 2, stopName: 'JP Nagar 6th Phase', lat: 12.9063, lng: 77.5857, scheduledTime: '07:45' }
    });
    await prisma.routeStop.create({
      data: { routeId: route1.id, sequenceOrder: 3, stopName: 'Skanda Kanakapura Main Campus', lat: 12.8452, lng: 77.5186, scheduledTime: '08:10' }
    });

    await prisma.studentTransportAllocation.create({
      data: {
        branchId: mainBranch.id,
        studentId: student1.id,
        routeId: route1.id,
        stopId: stop1.id
      }
    });
  }

  // 7.7 Seed Hostel Warden, Blocks, Rooms, Mess Menu & Maintenance Ticket
  await prisma.user.upsert({
    where: { email: 'warden.blr@skanda.edu.in' },
    update: {},
    create: {
      branchId: mainBranch.id,
      fullName: 'Vikram Hegde (Hostel Warden)',
      email: 'warden.blr@skanda.edu.in',
      mobile: '9880055441',
      passwordHash,
      role: 'HOSTEL_WARDEN',
      permissions: { hostel: ['CREATE', 'READ', 'UPDATE', 'DELETE'] }
    }
  });

  const blockCount = await prisma.hostelBlock.count({ where: { branchId: mainBranch.id } });
  if (blockCount === 0) {
    const block1 = await prisma.hostelBlock.create({
      data: { branchId: mainBranch.id, blockName: 'Cauvery Residency Block A', genderType: 'BOYS' }
    });
    const room101 = await prisma.hostelRoom.create({
      data: { branchId: mainBranch.id, blockId: block1.id, roomNumber: 'A-101', floor: 1, capacity: 3 }
    });
    await prisma.hostelRoom.create({
      data: { branchId: mainBranch.id, blockId: block1.id, roomNumber: 'A-102', floor: 1, capacity: 3 }
    });
    await prisma.hostelBedAllocation.create({
      data: { branchId: mainBranch.id, roomId: room101.id, bedNumber: 1, studentId: student2.id, status: 'OCCUPIED' }
    });
    await prisma.messMenu.createMany({
      data: [
        {
          branchId: mainBranch.id,
          dayOfWeek: 'Monday',
          breakfast: 'Idli, Vada, Sambar & Fresh Fruit',
          lunch: 'Chapati, Paneer Butter Masala, Jeera Rice & Curd',
          snacks: 'Masala Sundal & Filter Milk',
          dinner: 'Phulka, Dal Tadka, Mixed Veg & Gulab Jamun'
        },
        {
          branchId: mainBranch.id,
          dayOfWeek: 'Tuesday',
          breakfast: 'Masala Dosa, Chutney & Boiled Eggs / Sprouts',
          lunch: 'Veg Pulao, Raita, Dal Fry & Papad',
          snacks: 'Banana Cake & Lemon Mint Cooler',
          dinner: 'Roti, Chana Masala, Steamed Rice & Rasam'
        }
      ]
    });
    await prisma.hostelMaintenanceTicket.create({
      data: {
        branchId: mainBranch.id,
        roomId: room101.id,
        studentId: student2.id,
        title: 'Study Desk Lamp Flickering',
        description: 'LED study lamp on Bed 1 desk needs ballast replacement.',
        status: 'OPEN',
        repairCost: 0
      }
    });
  }

  // 7.8 Seed DLT Templates & Sample PTM Event
  const dltCount = await prisma.dltTemplate.count({ where: { branchId: mainBranch.id } });
  if (dltCount === 0) {
    await prisma.dltTemplate.createMany({
      data: [
        {
          branchId: mainBranch.id,
          templateId: 'DLT-SKD-ABS-1001',
          senderId: 'SKANDA',
          channel: 'SMS',
          eventTrigger: 'ABSENCE',
          bodyWithPlaceholders: 'Dear Parent, your ward {{studentName}} was marked ABSENT on {{date}}. Contact Skanda International School.'
        },
        {
          branchId: mainBranch.id,
          templateId: 'DLT-SKD-FEE-1002',
          senderId: 'SKANDA',
          channel: 'WHATSAPP',
          eventTrigger: 'FEE_DUE',
          bodyWithPlaceholders: 'Hello {{parentName}}, fee invoice {{invoiceNo}} of Rs.{{amount}} is due on {{dueDate}}. Pay via Skanda Portal.'
        }
      ]
    });
  }

  const ptmCount = await prisma.pTMEvent.count({ where: { branchId: mainBranch.id } });
  if (ptmCount === 0) {
    const ptm = await prisma.pTMEvent.create({
      data: {
        branchId: mainBranch.id,
        teacherUserId: teacher1.id,
        title: 'Term 1 Mathematics Progress Review',
        eventDate: '2026-12-06',
        startTime: '09:00',
        endTime: '10:00',
        slotMinutes: 10,
        meetingMode: 'IN_PERSON'
      }
    });
    await prisma.pTMSlot.createMany({
      data: [
        { eventId: ptm.id, branchId: mainBranch.id, startTime: '09:00', endTime: '09:10', status: 'AVAILABLE' },
        { eventId: ptm.id, branchId: mainBranch.id, startTime: '09:10', endTime: '09:20', status: 'AVAILABLE' },
        { eventId: ptm.id, branchId: mainBranch.id, startTime: '09:20', endTime: '09:30', status: 'AVAILABLE' },
        { eventId: ptm.id, branchId: mainBranch.id, startTime: '09:30', endTime: '09:40', status: 'AVAILABLE' },
        { eventId: ptm.id, branchId: mainBranch.id, startTime: '09:40', endTime: '09:50', status: 'AVAILABLE' },
        { eventId: ptm.id, branchId: mainBranch.id, startTime: '09:50', endTime: '10:00', status: 'AVAILABLE' }
      ]
    });
  }

  // 7.9 Seed Sprint 7 Roles, Labs, Activities, Syllabus, College Academics & Placement
  const sprint7Users = [
    { email: 'lab.blr@skanda.edu.in', fullName: 'Dr. Kavita Rao (Lab Assistant)', role: 'LAB_ASSISTANT', mobile: '9880077001' },
    { email: 'activity.blr@skanda.edu.in', fullName: 'Arjun Menon (Activity Coordinator)', role: 'ACTIVITY_COORDINATOR', mobile: '9880077002' },
    { email: 'guard.blr@skanda.edu.in', fullName: 'Shankar Patil (Gate Security)', role: 'SECURITY_GUARD', mobile: '9880077003' },
    { email: 'placement.blr@skanda.edu.in', fullName: 'Neha Deshmukh (Placement Officer)', role: 'PLACEMENT_OFFICER', mobile: '9880077004' }
  ];
  for (const u of sprint7Users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { branchId: mainBranch.id, fullName: u.fullName, email: u.email, mobile: u.mobile, passwordHash, role: u.role }
    });
  }

  const labCount = await prisma.lab.count({ where: { branchId: mainBranch.id } });
  if (labCount === 0) {
    const chemLab = await prisma.lab.create({
      data: { branchId: mainBranch.id, name: 'Senior Chemistry & Titration Lab', labType: 'CHEMISTRY', roomNo: 'LAB-201', capacity: 30 }
    });
    await prisma.labBatch.create({
      data: { branchId: mainBranch.id, labId: chemLab.id, batchName: 'Grade 10 Batch A', classOrCourse: 'Grade 10', scheduleSlot: 'WED-11:00' }
    });
    await prisma.labExperiment.create({
      data: { branchId: mainBranch.id, labId: chemLab.id, title: 'Acid-Base Titration (NaOH vs HCl)', aim: 'Determine molarity of HCl using phenolphthalein indicator.', maxMarks: 25 }
    });
    await prisma.labEquipmentItem.createMany({
      data: [
        { branchId: mainBranch.id, labId: chemLab.id, name: 'Digital pH Meter', qrTag: 'LAB-EQ-BLR-001', category: 'APPARATUS', quantity: 10, minStockLevel: 3, calibrationStatus: 'CALIBRATION_DUE' },
        { branchId: mainBranch.id, labId: chemLab.id, name: 'Phenolphthalein Indicator (500ml)', qrTag: 'LAB-EQ-BLR-002', category: 'CHEMICAL', quantity: 2, minStockLevel: 5, expiryDate: new Date(Date.now() + 15 * 86400000) }
      ]
    });
  }

  const actCount = await prisma.activity.count({ where: { branchId: mainBranch.id } });
  if (actCount === 0) {
    await prisma.activity.createMany({
      data: [
        {
          branchId: mainBranch.id,
          name: 'Inter-School Robotics & Drone Club',
          category: 'ROBOTICS',
          venue: 'STEM Innovation Arena',
          scheduleSlot: 'SAT-10:00',
          eligibleGrades: 'Grade 8,Grade 9,Grade 10,B.Tech Computer Science',
          seatLimit: 25,
          feeAmount: 2500,
          withdrawalCutoffDate: new Date(Date.now() + 30 * 86400000)
        },
        {
          branchId: mainBranch.id,
          name: 'Classical Carnatic Vocal & Veena',
          category: 'MUSIC',
          venue: 'Auditorium Studio B',
          scheduleSlot: 'FRI-15:30',
          eligibleGrades: 'ALL',
          seatLimit: 20,
          feeAmount: 1500,
          withdrawalCutoffDate: new Date(Date.now() + 30 * 86400000)
        }
      ]
    });
  }

  const sylCount = await prisma.syllabusChapter.count({ where: { branchId: mainBranch.id } });
  if (sylCount === 0) {
    await prisma.syllabusChapter.createMany({
      data: [
        { branchId: mainBranch.id, classOrCourse: 'Grade 10', subject: 'Mathematics Standard', chapterNo: 1, title: 'Real Numbers & Euclid Lemma', isCompleted: true, completedAt: new Date(), teacherUserId: teacher1.id },
        { branchId: mainBranch.id, classOrCourse: 'Grade 10', subject: 'Mathematics Standard', chapterNo: 2, title: 'Polynomials & Quadratic Equations', isCompleted: false, teacherUserId: teacher1.id }
      ]
    });
  }

  const colRecCount = await prisma.collegeAcademicRecord.count({ where: { studentId: student2.id } });
  if (colRecCount === 0) {
    await prisma.collegeAcademicRecord.create({
      data: { branchId: mainBranch.id, studentId: student2.id, semester: 1, sgpa: 8.6, cgpa: 8.6, backlogs: 0 }
    });
  }

  const alumCount = await prisma.alumniProfile.count({ where: { branchId: mainBranch.id } });
  if (alumCount === 0) {
    const alum = await prisma.alumniProfile.create({
      data: { branchId: mainBranch.id, fullName: 'Rohan Kulkarni', email: 'rohan.alumni@skanda.edu.in', graduationYear: 2022, department: 'CSE', company: 'Google India', roleTitle: 'Software Engineer', status: 'VERIFIED' }
    });
    await prisma.placementDrive.create({
      data: { branchId: mainBranch.id, companyName: 'Infosys Finacle', jobTitle: 'Systems Engineer Trainee', packageLpa: 7.5, minCgpa: 7.0, maxBacklogs: 0, driveDate: '2027-01-15', isReferral: false, moderationStatus: 'APPROVED', postedByAlumniId: alum.id }
    });
  }

  // 8. Preserve Phase 1 Demo Applicant
  const demoApplicant = await prisma.applicantUser.upsert({
    where: { mobile: '9876543210' },
    update: {},
    create: {
      fullName: 'Aarav Sharma',
      mobile: '9876543210',
      email: 'applicant.demo@skandaschool.edu.in',
      passwordHash,
      isVerified: true
    }
  });

  const existingApp = await prisma.application.findFirst({ where: { applicantUserId: demoApplicant.id } });
  if (!existingApp) {
    await prisma.application.create({
      data: {
        applicationNo: 'SKD-2026-00001',
        applicantUserId: demoApplicant.id,
        branchId: mainBranch.id,
        academicYearId: ayMain.id,
        academicYear: '2026-2027',
        status: 'SUBMITTED',
        currentStep: 9,
        institutionType: 'SCHOOL',
        classOrCourse: 'Grade 10',
        board: 'CBSE',
        mode: 'Day Scholar',
        studentDetails: { firstName: 'Aarav', lastName: 'Sharma', fullName: 'Aarav Sharma', dob: '2011-05-15', gender: 'Male', category: 'General (GEN)', aadhaarNumber: '123456789012' },
        parentDetails: { fatherName: 'Rajesh Sharma', motherName: 'Sunita Sharma', mobile: '9876543210', email: 'parent.blr@skanda.edu.in', emergencyContact: '9876543210' },
        facilities: { hostel: { opted: false }, transport: { opted: true, pickupArea: 'Jayanagar' }, library: true }
      }
    });
  }

  console.log('✅ Phase 1 & Phase 2 seed completed successfully.');
  console.log(`   - Super Admin: ${superAdmin.email} / Password@123`);
  console.log(`   - Branch Admin: ${branchAdmin.email} / Password@123`);
  console.log(`   - Teacher: ${teacher1.email} / Password@123`);
  console.log(`   - Parent (2 children): ${parentUser.email} / Password@123`);
  console.log(`   - Student: ${studentUser1.email} / Password@123`);
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
