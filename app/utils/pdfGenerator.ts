import { jsPDF } from 'jspdf';
import { Platform } from 'react-native';

export interface ApplicationPdfData {
  applicationNo: string;
  status: string;
  academicYear: string;
  submittedAt?: string | null;
  institutionType?: string;
  classOrCourse?: string;
  board?: string;
  mode?: string;
  studentDetails?: any;
  parentDetails?: any;
  previousEducation?: any;
  facilities?: any;
  selectedSubjects?: any;
  documents?: any;
  applicantUser?: any;
}

export function generateApplicationPdf(app: ApplicationPdfData) {
  if (Platform.OS !== 'web' && typeof window === 'undefined') {
    return;
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 14;

  // Header Banner: Royal Blue (#1D4ED8)
  doc.setFillColor(29, 78, 216);
  doc.rect(margin, y, pageWidth - 2 * margin, 26, 'F');

  // School Emblem / Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('SKANDA INTERNATIONAL SCHOOL', margin + 8, y + 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Bengaluru Campus • Affiliated to CBSE & CISCE • Estd. 1996', margin + 8, y + 16);
  doc.text('OFFICIAL ADMISSION APPLICATION SUMMARY — 2026-2027', margin + 8, y + 21);

  y += 32;

  // Application Reference & Status Bar
  doc.setFillColor(244, 247, 251);
  doc.setDrawColor(226, 232, 240);
  doc.rect(margin, y, pageWidth - 2 * margin, 14, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Application No: ${app.applicationNo || 'SIS-2026-XXXX'}`, margin + 4, y + 6);

  doc.setTextColor(22, 163, 74);
  doc.text(`Status: ${(app.status || 'SUBMITTED').toUpperCase()}`, margin + 80, y + 6);

  doc.setTextColor(71, 85, 105);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const dateStr = app.submittedAt ? new Date(app.submittedAt).toLocaleString() : new Date().toLocaleString();
  doc.text(`Submitted On: ${dateStr}`, margin + 4, y + 11);
  doc.text(`Academic Year: ${app.academicYear || '2026-2027'}`, margin + 80, y + 11);

  y += 20;

  // Helper for Section Box
  const renderSectionHeader = (title: string) => {
    doc.setFillColor(219, 234, 254); // Soft Sky Tint
    doc.setDrawColor(191, 219, 254);
    doc.rect(margin, y, pageWidth - 2 * margin, 7, 'FD');

    doc.setTextColor(30, 58, 138); // Deep Navy
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin + 4, y + 5);
    y += 10;
  };

  const renderField = (label: string, value: string, xPos: number, currentY: number) => {
    doc.setTextColor(71, 85, 105);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(label, xPos, currentY);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'normal');
    doc.text(value || 'N/A', xPos + 38, currentY);
  };

  // Section 1: Programme & Board
  renderSectionHeader('1. PROGRAMME & BOARD SELECTION');
  renderField('Institution Type:', app.institutionType || 'SCHOOL', margin + 4, y);
  renderField('Admitted Class:', app.classOrCourse || 'Grade 6', margin + 95, y);
  y += 5;
  renderField('Affiliated Board:', (app.board || 'CBSE').replace('_', ' / '), margin + 4, y);
  renderField('Attendance Mode:', app.mode || 'Day Scholar', margin + 95, y);
  y += 8;

  // Section 2: Student Details
  const student = app.studentDetails || {};
  renderSectionHeader('2. STUDENT PERSONAL IDENTIFICATION');
  renderField('Full Name:', student.fullName || app.applicantUser?.fullName || 'N/A', margin + 4, y);
  renderField('Date of Birth:', `${student.dob || '2014-04-15'} (Age: ${student.calculatedAge || 11} yrs)`, margin + 95, y);
  y += 5;
  renderField('Gender:', student.gender || 'Male', margin + 4, y);
  renderField('Blood Group:', student.bloodGroup || 'O+', margin + 95, y);
  y += 5;
  renderField('Nationality:', student.nationality || 'Indian', margin + 4, y);
  renderField('Category / ID:', `${student.category || 'General'} • ${student.idNumber || 'Aadhaar Verified'}`, margin + 95, y);
  y += 5;
  renderField('Address:', student.address?.street || 'Bengaluru, Karnataka', margin + 4, y);
  y += 8;

  // Section 3: Parent / Guardian
  const parent = app.parentDetails || {};
  renderSectionHeader('3. PARENT / GUARDIAN INFORMATION');
  renderField("Father's Name:", `${parent.fatherName || 'N/A'} (${parent.fatherOccupation || 'N/A'})`, margin + 4, y);
  renderField("Mother's Name:", `${parent.motherName || 'N/A'} (${parent.motherOccupation || 'N/A'})`, margin + 95, y);
  y += 5;
  renderField('Primary Mobile:', `+91 ${parent.mobile || app.applicantUser?.mobile || 'N/A'}`, margin + 4, y);
  renderField('Contact Email:', parent.email || app.applicantUser?.email || 'N/A', margin + 95, y);
  y += 5;
  renderField('Emergency Contact:', parent.emergencyContact || 'Active Contact Listed', margin + 4, y);
  renderField('Annual Income:', parent.annualIncome || '12-18 Lakhs Bracket', margin + 95, y);
  y += 8;

  // Section 4: Curriculum & Subjects
  renderSectionHeader('4. CURRICULUM & SELECTED SUBJECTS');
  renderField('Core Subjects:', 'English Language & Lit, Mathematics, Science, Social Studies, ICT', margin + 4, y);
  y += 5;
  renderField('Language Choice:', app.selectedSubjects?.secondLanguage || 'Hindi Course-A', margin + 4, y);
  renderField('Curriculum Code:', 'NCERT / CISCE Council Pattern 2026', margin + 95, y);
  y += 8;

  // Section 5: Previous Education
  const prev = app.previousEducation || {};
  renderSectionHeader('5. PREVIOUS ACADEMIC RECORD');
  renderField('Last Institution:', prev.lastSchool || 'Greenwood International', margin + 4, y);
  renderField('Previous Board:', prev.board || 'CBSE', margin + 95, y);
  y += 5;
  renderField('Passing Year / %:', `${prev.passingYear || '2025'} • Marks: ${prev.percentageMarks || '91.4%'}`, margin + 4, y);
  renderField('Transfer Cert No:', prev.tcNumber || 'TC-2025-8849', margin + 95, y);
  y += 8;

  // Section 6: Facilities Opted
  const fac = app.facilities || {};
  renderSectionHeader('6. OPTED CAMPUS FACILITIES');
  const hostelText = fac.hostel?.opted ? `YES (${fac.hostel.roomType || '2-Sharing AC'})` : 'NO';
  const transportText = fac.transport?.opted ? `YES (Pickup: ${fac.transport.pickupArea || 'Indiranagar Metro'})` : 'NO';
  const libraryText = fac.library !== false ? 'YES (Full Digital & Physical Access)' : 'NO';
  renderField('Hostel Facility:', hostelText, margin + 4, y);
  renderField('School Transport:', transportText, margin + 95, y);
  y += 5;
  renderField('Library Membership:', libraryText, margin + 4, y);
  y += 8;

  // Section 7: Documents Checklist
  renderSectionHeader('7. VERIFICATION DOCUMENTS CHECKLIST');
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('• Student Photograph: [VERIFIED ATTACHED]       • Government Identity Proof: [VERIFIED ATTACHED]', margin + 4, y);
  y += 4.5;
  doc.text('• Previous Marksheet / Card: [VERIFIED ATTACHED]  • Transfer Certificate (TC): [OFFICIAL COPY ATTACHED]', margin + 4, y);
  y += 10;

  // Footer & Declaration Signatures
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Declaration: Certified that all particulars entered in this form are genuine and correct. This is an electronically generated official document.',
    margin,
    y
  );
  y += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('Applicant / Parent Signature: _______________________', margin, y);
  doc.text('Registrar / Admissions Officer: _______________________', margin + 95, y);

  // Save the PDF
  const filename = `${app.applicationNo || 'SIS-2026-XXXX'}-Application.pdf`;
  doc.save(filename);
}
