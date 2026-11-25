import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { colors, borderRadius, spacing, shadows } from '../theme/theme';
import { PublicHeader } from '../components/PublicHeader';
import { StudentHeader } from '../components/StudentHeader';
import { PublicFooter } from '../components/PublicFooter';
import { StudentFooter } from '../components/StudentFooter';
import { AdmissionStepper } from '../components/AdmissionStepper';
import { CurriculumModal } from '../components/CurriculumModal';
import { LoginModal } from '../components/LoginModal';
import { generateApplicationPdf } from '../utils/pdfGenerator';

interface WizardProps {
  initialStep?: number;
}

export const AdmissionWizardScreen: React.FC<WizardProps> = ({ initialStep = 1 }) => {
  const {
    user,
    application,
    setAuthSession,
    refreshApplication,
    updateApplicationLocally,
    navigateTo
  } = useAuth();

  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [loading, setLoading] = useState<boolean>(false);
  const [savingDraft, setSavingDraft] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modals
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [curriculumModalOpen, setCurriculumModalOpen] = useState(false);
  const [previewBoardKey, setPreviewBoardKey] = useState<'CBSE' | 'ICSE_ISC' | 'STATE' | null>(null);

  // Academic metadata
  const [boardMetadata, setBoardMetadata] = useState<any>(null);
  const [classOptions, setClassOptions] = useState<any[]>([]);

  // -------------------------------------------------------------
  // FORM STATES PER STEP
  // -------------------------------------------------------------
  // Step 1: Verify & Register
  const [s1FullName, setS1FullName] = useState(user?.fullName || '');
  const [s1Mobile, setS1Mobile] = useState(user?.mobile || '');
  const [s1Email, setS1Email] = useState(user?.email || '');
  const [s1Password, setS1Password] = useState('');
  const [s1ConfirmPassword, setS1ConfirmPassword] = useState('');
  const [s1ShowPassword, setS1ShowPassword] = useState(false);
  const [s1OtpNotice, setS1OtpNotice] = useState<string | null>(null);
  const [s1OtpStepActive, setS1OtpStepActive] = useState<boolean>(false);
  const [s1OtpInput, setS1OtpInput] = useState<string>('');
  const [s3WaitlistConfirmed, setS3WaitlistConfirmed] = useState<boolean>(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const clearError = (field: string) => {
    setErrors(prev => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Step 2: Programme
  const [s2Type, setS2Type] = useState<'SCHOOL' | 'COLLEGE'>(application?.institutionType || 'SCHOOL');
  const [s2Class, setS2Class] = useState(application?.classOrCourse || '');
  const [s2AcademicYear, setS2AcademicYear] = useState(application?.academicYear || '2026-2027');
  const [s2Mode, setS2Mode] = useState(application?.mode === 'Residential' ? 'Day Scholar' : (application?.mode || ''));
  const [s2Specialization, setS2Specialization] = useState(application?.specializationOrStream || '');

  // Board / Specialization options based on Institution Type
  const schoolSpecializationOptions = [
    'CBSE',
    'ICSE / ISC',
    'State Board (Karnataka)'
  ];

  const collegeSpecializationOptions = [
    'Computer Science & Engineering (CSE)',
    'Electronics & Communication (ECE)',
    'Commerce & Management (B.Com / BBA)',
    'Pure Sciences (B.Sc)',
    'Arts & Humanities (BA)'
  ];

  const specializationOptions = s2Type === 'SCHOOL' ? schoolSpecializationOptions : collegeSpecializationOptions;

  // Step 3: Board Selection
  const [s3Board, setS3Board] = useState<'CBSE' | 'ICSE_ISC' | 'STATE' | ''>(application?.board || '');

  // Step 4: Curriculum & Subjects
  const [s4SubjectsData, setS4SubjectsData] = useState<any>(null);
  const [s4SelectedLanguage, setS4SelectedLanguage] = useState<string>(application?.selectedSubjects?.secondLanguage || '');
  const [s4SelectedStream, setS4SelectedStream] = useState<string>(application?.selectedSubjects?.stream || '');

  // Step 5: Student Details
  const [s5FullName, setS5FullName] = useState(application?.studentDetails?.fullName || user?.fullName || '');
  const [s5Dob, setS5Dob] = useState(application?.studentDetails?.dob || '');
  const [s5Gender, setS5Gender] = useState(application?.studentDetails?.gender || '');
  const [s5BloodGroup, setS5BloodGroup] = useState(application?.studentDetails?.bloodGroup || '');
  const [s5Nationality, setS5Nationality] = useState(application?.studentDetails?.nationality || '');
  const [s5Category, setS5Category] = useState(application?.studentDetails?.category || '');
  const [s5IdNumber, setS5IdNumber] = useState(application?.studentDetails?.idNumber || '');
  const [s5Address, setS5Address] = useState(application?.studentDetails?.address?.street || '');
  const [s5AgeValidation, setS5AgeValidation] = useState<{ valid: boolean; age?: number; message?: string }>({ valid: true });

  // Step 6: Parent Details
  const [s6FatherName, setS6FatherName] = useState(application?.parentDetails?.fatherName || '');
  const [s6MotherName, setS6MotherName] = useState(application?.parentDetails?.motherName || '');
  const [s6GuardianName, setS6GuardianName] = useState(application?.parentDetails?.guardianName || '');
  const [s6FatherOccupation, setS6FatherOccupation] = useState(application?.parentDetails?.fatherOccupation || '');
  const [s6MotherOccupation, setS6MotherOccupation] = useState(application?.parentDetails?.motherOccupation || '');
  const [s6ParentMobile, setS6ParentMobile] = useState(application?.parentDetails?.mobile || user?.mobile || '');
  const [s6ParentEmail, setS6ParentEmail] = useState(application?.parentDetails?.email || user?.email || '');
  const [s6EmergencyContact, setS6EmergencyContact] = useState(application?.parentDetails?.emergencyContact || '');
  const [s6AnnualIncome, setS6AnnualIncome] = useState(application?.parentDetails?.annualIncome || '');

  // Step 7: Previous Education
  const isNurseryAdmission = ['Nursery', 'Pre-KG', 'LKG', 'UKG', 'Kindergarten', 'Pre-Primary'].includes(s2Class);
  const [s7SkippedForNursery, setS7SkippedForNursery] = useState<boolean>(
    isNurseryAdmission || !!application?.previousEducation?.skippedForNursery
  );
  const [s7LastSchool, setS7LastSchool] = useState(application?.previousEducation?.lastSchool || '');
  const [s7Board, setS7Board] = useState(application?.previousEducation?.board || '');
  const [s7PassingYear, setS7PassingYear] = useState(application?.previousEducation?.passingYear || '');
  const [s7Marks, setS7Marks] = useState(application?.previousEducation?.percentageMarks || '');
  const [s7Medium, setS7Medium] = useState(application?.previousEducation?.medium || '');
  const [s7Reason, setS7Reason] = useState(application?.previousEducation?.reasonForLeaving || '');
  const [s7TcDetails, setS7TcDetails] = useState(application?.previousEducation?.tcNumber || '');

  // Step 8: Facilities (Conditional enforcement)
  const [s8HostelOpted, setS8HostelOpted] = useState<boolean>(!!application?.facilities?.hostel?.opted);
  const [s8RoomType, setS8RoomType] = useState<string>(application?.facilities?.hostel?.roomType || '');
  const [s8TransportOpted, setS8TransportOpted] = useState<boolean>(!!application?.facilities?.transport?.opted);
  const [s8PickupArea, setS8PickupArea] = useState<string>(application?.facilities?.transport?.pickupArea || '');
  const [s8LibraryOpted, setS8LibraryOpted] = useState<boolean>(
    application?.facilities?.library !== undefined ? !!application.facilities.library : false
  );

  // Step 9: Documents & Final Review
  const [s9PhotoUploaded, setS9PhotoUploaded] = useState<boolean>(!!application?.documents?.photo);
  const [s9IdUploaded, setS9IdUploaded] = useState<boolean>(!!application?.documents?.idProof);
  const [s9MarksheetUploaded, setS9MarksheetUploaded] = useState<boolean>(!!application?.documents?.marksheet);
  const [s9TcUploaded, setS9TcUploaded] = useState<boolean>(!!application?.documents?.tc);
  const [s9Declaration, setS9Declaration] = useState<boolean>(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<boolean>(false);

  // Load initial academic metadata
  useEffect(() => {
    async function loadMeta() {
      try {
        const meta = await api.getAcademicMetadata();
        if (meta.success) {
          setBoardMetadata(meta.boards);
          setClassOptions(meta.classes || []);
        }
      } catch (e) {
        console.warn('Failed to load metadata:', e);
      }
    }
    loadMeta();
  }, []);

  // Submitted Route Guard: If application is already submitted, lock access and redirect to dashboard
  useEffect(() => {
    if (application && application.status !== 'DRAFT') {
      navigateTo('/student/dashboard', { replace: true });
    }
  }, [application]);

  // Sync Nursery admission with previous education skip state
  useEffect(() => {
    if (isNurseryAdmission) {
      setS7SkippedForNursery(true);
    }
  }, [s2Class]);

  // Sync state if application updates
  useEffect(() => {
    if (application) {
      if (application.currentStep && application.currentStep > 1 && currentStep === 1) {
        setCurrentStep(application.currentStep);
      }
      if (application.institutionType) setS2Type(application.institutionType);
      if (application.classOrCourse) setS2Class(application.classOrCourse);
      if (application.academicYear) setS2AcademicYear(application.academicYear);
      if (application.mode) setS2Mode(application.mode === 'Residential' ? 'Day Scholar' : application.mode);
      if (application.specializationOrStream) setS2Specialization(application.specializationOrStream);
      if (application.board) setS3Board(application.board);
      if (application.selectedSubjects) {
        if (application.selectedSubjects.secondLanguage) setS4SelectedLanguage(application.selectedSubjects.secondLanguage);
        if (application.selectedSubjects.stream) setS4SelectedStream(application.selectedSubjects.stream);
      }
      if (application.studentDetails) {
        if (application.studentDetails.fullName) setS5FullName(application.studentDetails.fullName);
        if (application.studentDetails.dob) setS5Dob(application.studentDetails.dob);
        if (application.studentDetails.gender) setS5Gender(application.studentDetails.gender);
        if (application.studentDetails.bloodGroup) setS5BloodGroup(application.studentDetails.bloodGroup);
        if (application.studentDetails.nationality) setS5Nationality(application.studentDetails.nationality);
        if (application.studentDetails.category) setS5Category(application.studentDetails.category);
        if (application.studentDetails.idNumber) setS5IdNumber(application.studentDetails.idNumber);
        if (application.studentDetails.address?.street) setS5Address(application.studentDetails.address.street);
      }
      if (application.parentDetails) {
        if (application.parentDetails.fatherName) setS6FatherName(application.parentDetails.fatherName);
        if (application.parentDetails.motherName) setS6MotherName(application.parentDetails.motherName);
        if (application.parentDetails.guardianName) setS6GuardianName(application.parentDetails.guardianName);
        if (application.parentDetails.fatherOccupation) setS6FatherOccupation(application.parentDetails.fatherOccupation);
        if (application.parentDetails.motherOccupation) setS6MotherOccupation(application.parentDetails.motherOccupation);
        if (application.parentDetails.mobile) setS6ParentMobile(application.parentDetails.mobile);
        if (application.parentDetails.email) setS6ParentEmail(application.parentDetails.email);
        if (application.parentDetails.emergencyContact) setS6EmergencyContact(application.parentDetails.emergencyContact);
        if (application.parentDetails.annualIncome) setS6AnnualIncome(application.parentDetails.annualIncome);
      }
      if (application.previousEducation) {
        if (application.previousEducation.skippedForNursery !== undefined) {
          setS7SkippedForNursery(!!application.previousEducation.skippedForNursery);
        }
        if (application.previousEducation.lastSchool) setS7LastSchool(application.previousEducation.lastSchool);
        if (application.previousEducation.board) setS7Board(application.previousEducation.board);
        if (application.previousEducation.passingYear) setS7PassingYear(application.previousEducation.passingYear);
        if (application.previousEducation.percentageMarks) setS7Marks(application.previousEducation.percentageMarks);
        if (application.previousEducation.medium) setS7Medium(application.previousEducation.medium);
        if (application.previousEducation.reasonForLeaving) setS7Reason(application.previousEducation.reasonForLeaving);
        if (application.previousEducation.tcNumber) setS7TcDetails(application.previousEducation.tcNumber);
      }
      if (application.facilities) {
        setS8HostelOpted(!!application.facilities.hostel?.opted);
        if (application.facilities.hostel?.roomType) setS8RoomType(application.facilities.hostel.roomType);
        setS8TransportOpted(!!application.facilities.transport?.opted);
        if (application.facilities.transport?.pickupArea) setS8PickupArea(application.facilities.transport.pickupArea);
        if (application.facilities.library !== undefined) setS8LibraryOpted(!!application.facilities.library);
      }
      if (application.documents) {
        if (application.documents.photo) setS9PhotoUploaded(true);
        if (application.documents.idProof) setS9IdUploaded(true);
        if (application.documents.marksheet) setS9MarksheetUploaded(true);
        if (application.documents.tc) setS9TcUploaded(true);
      }
    }
  }, [application]);

  // Load subjects dynamically when class or board changes
  useEffect(() => {
    async function loadSubjects() {
      if (!s2Class) return;
      try {
        const res = await api.getAcademicSubjects(s2Class, s3Board);
        if (res.success) {
          setS4SubjectsData(res.subjectsData);
        }
      } catch (err) {
        console.warn('Error loading subjects:', err);
      }
    }
    loadSubjects();
  }, [s2Class, s3Board]);

  // Live age eligibility validation
  useEffect(() => {
    if (s5Dob && s2Class) {
      const birthDate = new Date(s5Dob);
      if (!isNaN(birthDate.getTime())) {
        const targetDate = new Date('2026-06-01');
        let age = targetDate.getFullYear() - birthDate.getFullYear();
        const m = targetDate.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && targetDate.getDate() < birthDate.getDate())) {
          age--;
        }

        const classMeta = classOptions.find(c => c.value === s2Class);
        if (classMeta) {
          if (age < classMeta.minAge) {
            setS5AgeValidation({
              valid: false,
              age,
              message: `Applicant is ${age} years old by June 1, 2026. Minimum age for ${s2Class} is ${classMeta.minAge} years.`
            });
            return;
          }
        }
        setS5AgeValidation({ valid: true, age });
      }
    }
  }, [s5Dob, s2Class, classOptions]);

  // -------------------------------------------------------------
  // COMPREHENSIVE INLINE FORM VALIDATION FUNCTIONS (STEPS 1-9)
  // -------------------------------------------------------------
  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!s1FullName.trim()) {
      errs.s1FullName = 'Full name is required.';
    } else if (!/^[A-Za-z\s.]{2,}$/.test(s1FullName.trim())) {
      errs.s1FullName = 'Please enter a valid name (at least 2 alphabetic characters).';
    }

    const cleanMobile = s1Mobile.replace(/\D/g, '');
    if (!cleanMobile) {
      errs.s1Mobile = '10-digit mobile number is required.';
    } else if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
      errs.s1Mobile = 'Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.';
    }

    if (!s1Email.trim()) {
      errs.s1Email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s1Email.trim())) {
      errs.s1Email = 'Please enter a valid email address (e.g. name@domain.com).';
    }

    const pwdRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!s1Password) {
      errs.s1Password = 'Password is required.';
    } else if (!pwdRegex.test(s1Password)) {
      errs.s1Password = 'Password must be min. 8 characters with at least 1 letter and 1 number.';
    }

    if (!s1ConfirmPassword) {
      errs.s1ConfirmPassword = 'Confirm password is required.';
    } else if (s1Password !== s1ConfirmPassword) {
      errs.s1ConfirmPassword = 'Passwords do not match.';
    }

    return errs;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!s2Type) errs.s2Type = 'Please select institution type (School or College).';
    if (!s2Class) errs.s2Class = 'Please select a Class or Course.';
    if (!s2AcademicYear) errs.s2AcademicYear = 'Academic year is required.';
    if (!s2Mode || s2Mode === 'Residential') errs.s2Mode = 'Please select Mode of Attendance (Day Scholar, Day Boarding, or Regular Full-Time).';
    return errs;
  };

  const validateStep3 = () => {
    const errs: Record<string, string> = {};
    if (!s3Board) {
      errs.s3Board = 'Please select an Affiliated Board (CBSE, ICSE, or State).';
    } else if (s3Board === 'STATE' && !s3WaitlistConfirmed) {
      errs.s3Waitlist = 'State Board is currently on Waitlist. Please confirm waitlist opt-in to proceed.';
    }
    return errs;
  };

  const validateStep4 = () => {
    const errs: Record<string, string> = {};
    if (s4SubjectsData?.languageChoices && s4SubjectsData.languageChoices.length > 0) {
      if (!s4SelectedLanguage) {
        errs.s4SelectedLanguage = 'Please select your mandatory Second Language choice.';
      }
    }
    if (s4SubjectsData?.streams && s4SubjectsData.streams.length > 0) {
      if (!s4SelectedStream) {
        errs.s4SelectedStream = 'Please select a Senior Secondary Stream & Electives combination.';
      }
    }
    return errs;
  };

  const validateStep5 = () => {
    const errs: Record<string, string> = {};
    if (!s5FullName.trim()) {
      errs.s5FullName = 'Student full name is required.';
    } else if (!/^[A-Za-z\s.]{2,}$/.test(s5FullName.trim())) {
      errs.s5FullName = 'Name must contain at least 2 alphabetic characters.';
    }
    if (!s5Gender) {
      errs.s5Gender = 'Please select student gender.';
    }
    if (!s5BloodGroup.trim()) {
      errs.s5BloodGroup = 'Blood group is required (e.g. O+, A+, B+).';
    }
    if (!s5Dob.trim()) {
      errs.s5Dob = 'Date of birth is required.';
    } else if (isNaN(new Date(s5Dob).getTime())) {
      errs.s5Dob = 'Please select a valid date of birth.';
    } else if (!s5AgeValidation.valid) {
      errs.s5Dob = s5AgeValidation.message || 'Age requirement not met for the selected class.';
    }
    if (!s5Nationality.trim()) {
      errs.s5Nationality = 'Nationality is required.';
    }
    if (!s5Address.trim()) {
      errs.s5Address = 'Residential address is required.';
    } else if (s5Address.trim().length < 10) {
      errs.s5Address = 'Residential address must be at least 10 characters.';
    }
    return errs;
  };

  const validateStep6 = () => {
    const errs: Record<string, string> = {};
    if (!s6FatherName.trim() && !s6MotherName.trim() && !s6GuardianName.trim()) {
      errs.s6ParentName = 'At least one Parent or Guardian name is required.';
    }
    if (!s6FatherOccupation.trim() && !s6MotherOccupation.trim()) {
      errs.s6ParentOccupation = 'Parent or Guardian occupation is required.';
    }
    const cleanPhone = s6ParentMobile.replace(/\D/g, '');
    if (!cleanPhone) {
      errs.s6ParentMobile = 'Parent mobile number is required.';
    } else if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      errs.s6ParentMobile = 'Please enter a valid 10-digit Indian mobile number (starting with 6-9).';
    }
    if (!s6ParentEmail.trim()) {
      errs.s6ParentEmail = 'Parent email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s6ParentEmail.trim())) {
      errs.s6ParentEmail = 'Please enter a valid email address.';
    }

    // Emergency Contact: Strictly 10 digits
    const cleanEmergency = s6EmergencyContact.replace(/\D/g, '');
    if (!cleanEmergency || cleanEmergency.length !== 10) {
      errs.s6EmergencyContact = 'Emergency contact must be exactly 10 digits.';
    }
    return errs;
  };

  const validateStep7 = () => {
    const errs: Record<string, string> = {};
    const isNursery = isNurseryAdmission || s7SkippedForNursery;
    if (isNursery) {
      return errs; // Bypass all previous school/marksheet/TC validation rules
    }
    const isGrade2OrHigher = !['Nursery', 'LKG', 'UKG', 'Grade 1'].includes(s2Class);
    if (isGrade2OrHigher) {
      if (!s7LastSchool.trim()) {
        errs.s7LastSchool = 'Previous school or college name is required.';
      }
      if (!s7Board.trim()) {
        errs.s7Board = 'Previous affiliated board / university is required.';
      }
      if (!s7PassingYear.trim()) {
        errs.s7PassingYear = 'Passing year is required.';
      } else if (!/^\d{4}$/.test(s7PassingYear.trim()) || parseInt(s7PassingYear) < 2000 || parseInt(s7PassingYear) > 2026) {
        errs.s7PassingYear = 'Please enter a valid 4-digit passing year (e.g. 2025).';
      }
      if (!s7Marks.trim()) {
        errs.s7Marks = 'Marks percentage or CGPA is required.';
      }
    }
    return errs;
  };

  const validateStep8 = () => {
    const errs: Record<string, string> = {};
    if (s8HostelOpted && (!s8RoomType || !s8RoomType.trim())) {
      errs.s8RoomType = 'Please select a Room Type when hostel accommodation is opted.';
    }
    if (s8TransportOpted && (!s8PickupArea || s8PickupArea.trim().length < 3)) {
      errs.s8PickupArea = 'Please specify your Preferred Pickup Area (minimum 3 characters).';
    }
    return errs;
  };

  const validateStep9 = () => {
    const errs: Record<string, string> = {};
    const isNursery = isNurseryAdmission || s7SkippedForNursery;
    const isGrade2OrHigher = !isNursery && !['Nursery', 'LKG', 'UKG', 'Grade 1'].includes(s2Class);
    if (!s9PhotoUploaded) {
      errs.s9Photo = 'Student passport photograph is mandatory (max 5MB, JPG/PNG).';
    }
    if (!s9IdUploaded) {
      errs.s9Id = 'Identity proof / Birth certificate is mandatory (max 5MB, PDF/JPG/PNG).';
    }
    if (isGrade2OrHigher && !s9MarksheetUploaded) {
      errs.s9Marksheet = 'Previous marksheet / report card is mandatory for Grade 2 and higher.';
    }
    if (!s9Declaration) {
      errs.s9Declaration = 'You must check the declaration box before submitting.';
    }
    return errs;
  };

  // -------------------------------------------------------------
  // STEP ACTION HANDLERS
  // -------------------------------------------------------------

  // STEP 1: Verify & Register
  const handleStep1Submit = async () => {
    setStatusMessage(null);
    const errs = validateStep1();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setStatusMessage({ text: 'Please resolve the highlighted errors to proceed.', type: 'error' });
      return;
    }
    setErrors({});

    const cleanMobile = s1Mobile.replace(/\D/g, '');
    setLoading(true);
    try {
      const res = await api.registerStep1({
        fullName: s1FullName.trim(),
        mobile: cleanMobile,
        email: s1Email.trim(),
        password: s1Password
      });

      if (res.success) {
        setAuthSession(res.token, res.user, res.application);
        if (res.otpPreview) {
          setS1OtpNotice(res.otpPreview);
        }
        setS1OtpStepActive(true);
        setStatusMessage({
          text: `Account created! Verification OTP sent to +91 ${cleanMobile}. Please verify OTP to proceed.`,
          type: 'info'
        });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Registration failed. Try logging in if already registered.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // STEP 1: OTP Verify
  const handleStep1OtpVerify = async () => {
    setStatusMessage(null);
    const cleanMobile = s1Mobile.replace(/\D/g, '');
    const trimmedOtp = s1OtpInput.trim();
    if (!trimmedOtp || trimmedOtp.length < 6) {
      setErrors({ s1Otp: 'Please enter the complete 6-digit OTP code.' });
      return;
    }
    clearError('s1Otp');

    setLoading(true);
    try {
      const res = await api.verifyOtp(cleanMobile, trimmedOtp);
      if (res.success) {
        setAuthSession(res.token, res.user, res.application);
        setStatusMessage({ text: 'Mobile OTP verified successfully! Proceeding to Step 2.', type: 'success' });
        setCurrentStep(2);
      }
    } catch (err: any) {
      setErrors({ s1Otp: err.message || 'Invalid or expired OTP. Please try again.' });
      setStatusMessage({ text: err.message || 'Invalid OTP.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Generic Save Step
  const handleSaveStep = async (stepNum: number, payload: any, advanceToNext: boolean = true) => {
    setStatusMessage(null);
    if (!user) {
      setStatusMessage({ text: 'Please verify account in Step 1 first.', type: 'error' });
      return;
    }

    if (advanceToNext) setLoading(true);
    else setSavingDraft(true);

    try {
      const res = await api.saveStep(stepNum, payload);
      if (res.success) {
        updateApplicationLocally(res.application);
        setStatusMessage({ text: `Step ${stepNum} auto-saved successfully.`, type: 'success' });
        if (advanceToNext) {
          setCurrentStep(Math.min(9, stepNum + 1));
        }
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || `Failed to save Step ${stepNum}.`, type: 'error' });
    } finally {
      setLoading(false);
      setSavingDraft(false);
    }
  };

  // STEP 2: Programme
  const handleStep2Submit = () => {
    const errs = validateStep2();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setStatusMessage({ text: 'Please resolve the highlighted errors in Step 2.', type: 'error' });
      return;
    }
    setErrors({});
    handleSaveStep(2, {
      institutionType: s2Type,
      classOrCourse: s2Class,
      academicYear: s2AcademicYear,
      mode: s2Mode || 'Day Scholar',
      specializationOrStream: s2Specialization
    });
  };

  // STEP 3: Board
  const handleStep3Submit = () => {
    const errs = validateStep3();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setStatusMessage({ text: 'Please select an affiliated board and confirm waitlist if applicable.', type: 'error' });
      return;
    }
    setErrors({});
    handleSaveStep(3, {
      board: s3Board,
      classOrCourse: s2Class
    });
  };

  // STEP 4: Curriculum
  const handleStep4Submit = () => {
    const errs = validateStep4();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setStatusMessage({ text: 'Please select your language or stream choices.', type: 'error' });
      return;
    }
    setErrors({});
    handleSaveStep(4, {
      selectedSubjects: {
        compulsory: s4SubjectsData?.compulsory || [],
        secondLanguage: s4SelectedLanguage,
        stream: s4SelectedStream
      }
    });
  };

  // STEP 5: Student Details
  const handleStep5Submit = () => {
    const errs = validateStep5();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setStatusMessage({ text: 'Please complete all required student fields.', type: 'error' });
      return;
    }
    setErrors({});
    handleSaveStep(5, {
      fullName: s5FullName.trim(),
      dob: s5Dob.trim(),
      gender: s5Gender,
      bloodGroup: s5BloodGroup.trim(),
      nationality: s5Nationality.trim(),
      category: s5Category.trim(),
      idNumber: s5IdNumber.trim(),
      address: { street: s5Address.trim() }
    });
  };

  // STEP 6: Parent Details
  const handleStep6Submit = () => {
    const errs = validateStep6();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setStatusMessage({ text: 'Please complete all required parent/guardian fields.', type: 'error' });
      return;
    }
    setErrors({});
    const cleanPhone = s6ParentMobile.replace(/\D/g, '').slice(0, 10);
    const cleanEmergency = s6EmergencyContact.replace(/\D/g, '').slice(0, 10);
    handleSaveStep(6, {
      fatherName: s6FatherName.trim(),
      motherName: s6MotherName.trim(),
      guardianName: s6GuardianName.trim(),
      fatherOccupation: s6FatherOccupation.trim(),
      motherOccupation: s6MotherOccupation.trim(),
      mobile: cleanPhone,
      email: s6ParentEmail.trim(),
      emergencyContact: cleanEmergency,
      annualIncome: s6AnnualIncome.trim()
    });
  };

  // STEP 7: Previous Education
  const handleStep7Submit = () => {
    const isNursery = isNurseryAdmission || s7SkippedForNursery;
    const errs = validateStep7();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setStatusMessage({ text: 'Please provide valid previous education details.', type: 'error' });
      return;
    }
    setErrors({});
    handleSaveStep(7, {
      skippedForNursery: isNursery,
      lastSchool: isNursery ? 'N/A (First-Time Nursery Admission)' : s7LastSchool.trim(),
      board: isNursery ? 'N/A' : s7Board.trim(),
      passingYear: isNursery ? '' : s7PassingYear.trim(),
      percentageMarks: isNursery ? '' : s7Marks.trim(),
      medium: isNursery ? '' : s7Medium.trim(),
      reasonForLeaving: isNursery ? '' : s7Reason.trim(),
      tcNumber: isNursery ? '' : s7TcDetails.trim()
    });
  };

  // STEP 8: Facilities (Strict Conditional Enforcement)
  const handleStep8Submit = () => {
    const errs = validateStep8();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setStatusMessage({ text: 'Please provide required details for selected amenities.', type: 'error' });
      return;
    }
    setErrors({});
    handleSaveStep(8, {
      hostel: {
        opted: s8HostelOpted,
        roomType: s8HostelOpted ? s8RoomType : null
      },
      transport: {
        opted: s8TransportOpted,
        pickupArea: s8TransportOpted ? s8PickupArea.trim() : null
      },
      library: s8LibraryOpted
    });
  };

  // STEP 9: Final Submit
  const handleFinalSubmit = async () => {
    setStatusMessage(null);
    const errs = validateStep9();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setStatusMessage({ text: 'Please upload mandatory documents and accept declaration before submitting.', type: 'error' });
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      // First save step 9 documents metadata
      await api.saveStep(9, {
        documents: {
          photo: s9PhotoUploaded ? 'student-photo-2026.jpg' : null,
          idProof: s9IdUploaded ? 'student-aadhaar-doc.pdf' : null,
          marksheet: s9MarksheetUploaded ? 'previous-marksheet.pdf' : null,
          tc: s9TcUploaded ? 'transfer-certificate.pdf' : null
        }
      });

      // Submit application
      const res = await api.submitApplication();
      if (res.success) {
        updateApplicationLocally(res.application);
        setSubmissionSuccess(true);
        setStatusMessage({ text: '🎉 Application submitted successfully! Welcome to Skanda International School.', type: 'success' });
        // Lock Back-Navigation: replace history so back gesture / back button cannot return to form steps
        navigateTo('/student/dashboard', { replace: true });
      }
    } catch (err: any) {
      setStatusMessage({ text: err.message || 'Submission failed. Please check all fields.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {user ? <StudentHeader /> : <PublicHeader onOpenLogin={() => setLoginModalOpen(true)} />}

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.wizardCanvas}>
          {/* Top Horizontal Stepper */}
          <AdmissionStepper
            currentStep={currentStep}
            onSelectStep={(targetStep) => {
              if (user || targetStep === 1) {
                setCurrentStep(targetStep);
                setStatusMessage(null);
              }
            }}
            maxUnlockedStep={user ? Math.max(currentStep, application?.currentStep || 1) : 1}
          />

          {/* Status / Alert Banner */}
          {statusMessage && (
            <View
              style={[
                styles.alertBox,
                statusMessage.type === 'error' && styles.alertError,
                statusMessage.type === 'success' && styles.alertSuccess
              ]}
            >
              <Text
                style={[
                  styles.alertText,
                  statusMessage.type === 'error' && styles.alertTextError,
                  statusMessage.type === 'success' && styles.alertTextSuccess
                ]}
              >
                {statusMessage.type === 'error' ? '⚠️ ' : '✅ '}
                {statusMessage.text}
              </Text>
            </View>
          )}

          <View
            key={currentStep}
            {...(Platform.OS === 'web' ? ({ className: 'skanda-fade-up' } as any) : {})}
          >
          {/* ========================================================================= */}
          {/* STEP 1: VERIFY & REGISTER ACCOUNT */}
          {/* ========================================================================= */}
          {currentStep === 1 && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>Apply Step 1: Verify</Text>
                <Text style={styles.stepSubtitle}>
                  Create your admissions account to generate your SIS application number and auto-save your progress.
                </Text>
              </View>

              {user && (
                <View style={styles.infoBanner}>
                  <Text style={styles.infoBannerText}>
                    ✅ You are logged in as <Text style={{ fontWeight: '700' }}>{user.fullName}</Text> (+91 {user.mobile}).
                    Application No: <Text style={{ fontWeight: '700' }}>{application?.applicationNo || 'SIS-2026-XXXX'}</Text>
                  </Text>
                  <TouchableOpacity
                    style={styles.inlineActionBtn}
                    onPress={() => setCurrentStep(2)}
                  >
                    <Text style={styles.inlineActionText}>Continue to Step 2 ➜</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.formGrid}>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>Applicant Full Name *</Text>
                  <TextInput
                    style={[styles.textInput, errors.s1FullName && styles.inputError]}
                    placeholder="e.g. Jane Doe"
                    placeholderTextColor={colors.textMuted}
                    value={s1FullName}
                    onChangeText={(val) => {
                      setS1FullName(val);
                      clearError('s1FullName');
                    }}
                  />
                  {errors.s1FullName && (
                    <Text style={styles.inlineErrorText}>⚠️ {errors.s1FullName}</Text>
                  )}
                </View>

                <View style={styles.colHalf}>
                  <Text style={styles.label}>10-Digit Mobile Number *</Text>
                  <TextInput
                    style={[styles.textInput, errors.s1Mobile && styles.inputError]}
                    placeholder="e.g. 9876543210"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    maxLength={10}
                    value={s1Mobile}
                    onChangeText={(val) => {
                      setS1Mobile(val);
                      clearError('s1Mobile');
                    }}
                  />
                  {errors.s1Mobile && (
                    <Text style={styles.inlineErrorText}>⚠️ {errors.s1Mobile}</Text>
                  )}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email Address *</Text>
                <TextInput
                  style={[styles.textInput, errors.s1Email && styles.inputError]}
                  placeholder="e.g. jane.doe@example.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={s1Email}
                  onChangeText={(val) => {
                    setS1Email(val);
                    clearError('s1Email');
                  }}
                />
                {errors.s1Email && (
                  <Text style={styles.inlineErrorText}>⚠️ {errors.s1Email}</Text>
                )}
              </View>

              <View style={styles.formGrid}>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>Create Password *</Text>
                  <View style={[styles.passwordRow, errors.s1Password && styles.inputError]}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Min. 8 chars, 1 letter, 1 number"
                      placeholderTextColor={colors.textMuted}
                      secureTextEntry={!s1ShowPassword}
                      value={s1Password}
                      onChangeText={(val) => {
                        setS1Password(val);
                        clearError('s1Password');
                      }}
                    />
                    <TouchableOpacity
                      onPress={() => setS1ShowPassword(!s1ShowPassword)}
                      style={styles.eyeBtn}
                    >
                      <Text style={styles.eyeText}>{s1ShowPassword ? '👁️' : '🙈'}</Text>
                    </TouchableOpacity>
                  </View>
                  {errors.s1Password && (
                    <Text style={styles.inlineErrorText}>⚠️ {errors.s1Password}</Text>
                  )}
                </View>

                <View style={styles.colHalf}>
                  <Text style={styles.label}>Confirm Password *</Text>
                  <TextInput
                    style={[styles.textInput, errors.s1ConfirmPassword && styles.inputError]}
                    placeholder="Re-enter chosen password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!s1ShowPassword}
                    value={s1ConfirmPassword}
                    onChangeText={(val) => {
                      setS1ConfirmPassword(val);
                      clearError('s1ConfirmPassword');
                    }}
                  />
                  {errors.s1ConfirmPassword && (
                    <Text style={styles.inlineErrorText}>⚠️ {errors.s1ConfirmPassword}</Text>
                  )}
                </View>
              </View>

              <Text style={styles.fieldHint}>
                Minimum 8 characters with a letter and a number, with a show/hide icon. This password is used to log in, resume a saved application and track status.
              </Text>

              {!!s1OtpNotice && (
                <View style={styles.otpDevBox}>
                  <Text style={styles.otpDevText}>
                    🔐 Registration OTP Generated: <Text style={{ fontWeight: '800' }}>{s1OtpNotice}</Text>
                  </Text>
                </View>
              )}

              {/* OTP Verification Prompt */}
              {s1OtpStepActive && (
                <View style={styles.otpVerificationBox}>
                  <Text style={styles.label}>Enter 6-Digit OTP sent to +91 {s1Mobile} *</Text>
                  <TextInput
                    style={[styles.textInput, errors.s1Otp && styles.inputError, { fontSize: 18, letterSpacing: 4, textAlign: 'center' }]}
                    placeholder="• • • • • •"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    maxLength={6}
                    value={s1OtpInput}
                    onChangeText={(val) => {
                      setS1OtpInput(val);
                      clearError('s1Otp');
                    }}
                  />
                  {errors.s1Otp && (
                    <Text style={styles.inlineErrorText}>⚠️ {errors.s1Otp}</Text>
                  )}
                  <TouchableOpacity
                    style={[styles.primaryBtn, { marginTop: 10 }, loading && styles.disabledBtn]}
                    onPress={handleStep1OtpVerify}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.textInverse} />
                    ) : (
                      <Text style={styles.primaryBtnText}>Verify OTP & Proceed ➜ Programme</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.btnRow}>
                {!s1OtpStepActive && (
                  <TouchableOpacity
                    style={[styles.primaryBtn, loading && styles.disabledBtn]}
                    onPress={handleStep1Submit}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.textInverse} />
                    ) : (
                      <Text style={styles.primaryBtnText}>Create Account & Verify OTP ➜</Text>
                    )}
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => navigateTo('/apply')}
                >
                  <Text style={styles.secondaryBtnText}>← Back to Overview</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => setLoginModalOpen(true)}
                >
                  <Text style={styles.secondaryBtnText}>Already have an account? Login</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: PROGRAMME */}
          {/* ========================================================================= */}
          {currentStep === 2 && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>Apply Step 2: Programme</Text>
                <Text style={styles.stepSubtitle}>
                  Choose whether you are enrolling in School (Nursery to Grade 12) or College undergraduate courses.
                </Text>
              </View>

              {/* School / College Selector Cards */}
              <View style={styles.cardSelectorRow}>
                <TouchableOpacity
                  style={[styles.typeCard, s2Type === 'SCHOOL' && styles.typeCardActive, errors.s2Type && styles.inputError]}
                  onPress={() => {
                    setS2Type('SCHOOL');
                    if (!schoolSpecializationOptions.includes(s2Specialization)) {
                      setS2Specialization('');
                    }
                    clearError('s2Type');
                  }}
                >
                  <Text style={styles.typeIcon}>🏫</Text>
                  <Text style={[styles.typeTitle, s2Type === 'SCHOOL' && styles.typeTitleActive]}>
                    School Education
                  </Text>
                  <Text style={styles.typeSub}>Nursery to Grade 12 (CBSE / ICSE / State)</Text>
                  {s2Type === 'SCHOOL' && <View style={styles.typeCheck}><Text style={styles.typeCheckText}>✓ Selected</Text></View>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.typeCard, s2Type === 'COLLEGE' && styles.typeCardActive, errors.s2Type && styles.inputError]}
                  onPress={() => {
                    setS2Type('COLLEGE');
                    if (!collegeSpecializationOptions.includes(s2Specialization)) {
                      setS2Specialization('');
                    }
                    clearError('s2Type');
                  }}
                >
                  <Text style={styles.typeIcon}>🎓</Text>
                  <Text style={[styles.typeTitle, s2Type === 'COLLEGE' && styles.typeTitleActive]}>
                    College & University
                  </Text>
                  <Text style={styles.typeSub}>Undergraduate Degree Programmes</Text>
                  {s2Type === 'COLLEGE' && <View style={styles.typeCheck}><Text style={styles.typeCheckText}>✓ Selected</Text></View>}
                </TouchableOpacity>
              </View>
              {errors.s2Type && (
                <Text style={[styles.inlineErrorText, { marginBottom: 10 }]}>⚠️ {errors.s2Type}</Text>
              )}

              <View style={styles.formGrid}>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>Class / Course *</Text>
                  <View style={[styles.pickerBox, errors.s2Class && styles.inputError]}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                      {(s2Type === 'SCHOOL'
                        ? ['Nursery', 'LKG', 'UKG', 'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12']
                        : ['B.Tech Computer Science', 'B.Sc Biotechnology', 'B.Com Honors', 'BBA']
                      ).map((item) => (
                        <TouchableOpacity
                          key={item}
                          style={[styles.chip, s2Class === item && styles.chipActive]}
                          onPress={() => {
                            setS2Class(item);
                            clearError('s2Class');
                          }}
                        >
                          <Text style={[styles.chipText, s2Class === item && styles.chipTextActive]}>
                            {item}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                  {errors.s2Class && (
                    <Text style={styles.inlineErrorText}>⚠️ {errors.s2Class}</Text>
                  )}
                </View>

                <View style={styles.colHalf}>
                  <Text style={styles.label}>Academic Year</Text>
                  <TextInput
                    style={[styles.textInput, styles.readOnlyInput]}
                    value={s2AcademicYear}
                    editable={false}
                  />
                </View>
              </View>

              <View style={styles.formGrid}>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>Mode of Attendance *</Text>
                  <View style={styles.radioGroup}>
                    {['Day Scholar', 'Day Boarding', 'Regular Full-Time'].map((mode) => (
                      <TouchableOpacity
                        key={mode}
                        style={[styles.radioPill, s2Mode === mode && styles.radioPillActive, errors.s2Mode && styles.inputError]}
                        onPress={() => {
                          setS2Mode(mode);
                          clearError('s2Mode');
                        }}
                      >
                        <Text style={[styles.radioText, s2Mode === mode && styles.radioTextActive]}>
                          {mode}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {errors.s2Mode && (
                    <Text style={styles.inlineErrorText}>⚠️ {errors.s2Mode}</Text>
                  )}
                </View>

                <View style={styles.colHalf}>
                  <Text style={styles.label}>Board / Specialization Focus *</Text>
                  {Platform.OS === 'web' ? (
                    <View style={[styles.selectWrapper, errors.s2Specialization && styles.inputError]}>
                      <select
                        id="s2Specialization-select"
                        value={s2Specialization}
                        onChange={(e: any) => {
                          setS2Specialization(e.target.value);
                          clearError('s2Specialization');
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 14px',
                          fontSize: '14px',
                          color: s2Specialization ? colors.textPrimary : colors.textMuted,
                          backgroundColor: colors.bgSurface,
                          border: 'none',
                          outline: 'none',
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                          borderRadius: borderRadius.md
                        }}
                      >
                        <option value="">Select Board / Specialization...</option>
                        {specializationOptions.map((opt) => (
                          <option key={opt} value={opt} style={{ color: colors.textPrimary }}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </View>
                  ) : (
                    <View style={[styles.pickerBox, errors.s2Specialization && styles.inputError]}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                        {specializationOptions.map((opt) => (
                          <TouchableOpacity
                            key={opt}
                            style={[styles.chip, s2Specialization === opt && styles.chipActive]}
                            onPress={() => {
                              setS2Specialization(opt);
                              clearError('s2Specialization');
                            }}
                          >
                            <Text style={[styles.chipText, s2Specialization === opt && styles.chipTextActive]}>
                              {opt}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                  {errors.s2Specialization && (
                    <Text style={styles.inlineErrorText}>⚠️ {errors.s2Specialization}</Text>
                  )}
                </View>
              </View>

              {/* Seats, eligibility and fee info banner */}
              <View style={styles.bannerInfoBox}>
                <Text style={styles.bannerInfoTitle}>📊 Live Seats, Eligibility & Fee Indicator</Text>
                <Text style={styles.bannerInfoText}>
                  {s2Class ? (
                    <>Selected: <Text style={{ fontWeight: '700' }}>{s2Class}</Text> ({s2Type}) • Status: <Text style={{ color: colors.statusSuccess, fontWeight: '700' }}>34 Seats Available</Text> • Tuition Base: ₹85,000 / year • Age Cutoff: Min. 6 yrs by June 2026.</>
                  ) : (
                    'Please select a Class / Course above to view available seats, fees, and age criteria.'
                  )}
                </Text>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.disabledBtn]}
                  onPress={handleStep2Submit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Next ➜ Board Selection</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCurrentStep(1)}>
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: BOARD SELECTION */}
          {/* ========================================================================= */}
          {currentStep === 3 && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>Apply Step 3: Board Selection</Text>
                <Text style={styles.stepSubtitle}>
                  Choose your affiliated board. Cards show only boards enabled for your chosen class ({s2Class}).
                </Text>
              </View>

              {/* 3 Board Cards */}
              <View style={styles.boardCardsGrid}>
                {/* CBSE */}
                <TouchableOpacity
                  style={[styles.boardCard, s3Board === 'CBSE' && styles.boardCardActive, errors.s3Board && styles.inputError]}
                  onPress={() => {
                    setS3Board('CBSE');
                    clearError('s3Board');
                    clearError('s3Waitlist');
                  }}
                  activeOpacity={0.9}
                >
                  <View style={styles.boardTopRow}>
                    <Text style={styles.boardPill}>CBSE</Text>
                    <View style={styles.seatBadgeGreen}>
                      <Text style={styles.seatBadgeTextGreen}>34 Seats Left</Text>
                    </View>
                  </View>
                  <Text style={styles.boardName}>Central Board of Secondary Education</Text>
                  <Text style={styles.boardSpecs}>• Classes: Nursery to Grade 12</Text>
                  <Text style={styles.boardSpecs}>• Medium: English</Text>
                  <Text style={styles.boardSpecs}>• Annual Fee: ₹85,000</Text>
                  <TouchableOpacity
                    style={styles.viewCurriculumBtn}
                    onPress={() => {
                      setPreviewBoardKey('CBSE');
                      setCurriculumModalOpen(true);
                    }}
                  >
                    <Text style={styles.viewCurriculumText}>📖 View CBSE Curriculum & Books ➜</Text>
                  </TouchableOpacity>
                </TouchableOpacity>

                {/* ICSE / ISC */}
                <TouchableOpacity
                  style={[styles.boardCard, s3Board === 'ICSE_ISC' && styles.boardCardActive, errors.s3Board && styles.inputError]}
                  onPress={() => {
                    setS3Board('ICSE_ISC');
                    clearError('s3Board');
                    clearError('s3Waitlist');
                  }}
                  activeOpacity={0.9}
                >
                  <View style={styles.boardTopRow}>
                    <Text style={styles.boardPill}>ICSE / ISC</Text>
                    <View style={styles.seatBadgeAmber}>
                      <Text style={styles.seatBadgeTextAmber}>8 Seats Left</Text>
                    </View>
                  </View>
                  <Text style={styles.boardName}>Council for Indian School Certificate</Text>
                  <Text style={styles.boardSpecs}>• Classes: Grade 1 to 12</Text>
                  <Text style={styles.boardSpecs}>• Medium: English</Text>
                  <Text style={styles.boardSpecs}>• Annual Fee: ₹1,10,000</Text>
                  <TouchableOpacity
                    style={styles.viewCurriculumBtn}
                    onPress={() => {
                      setPreviewBoardKey('ICSE_ISC');
                      setCurriculumModalOpen(true);
                    }}
                  >
                    <Text style={styles.viewCurriculumText}>📖 View ICSE Curriculum & Books ➜</Text>
                  </TouchableOpacity>
                </TouchableOpacity>

                {/* State Board */}
                <TouchableOpacity
                  style={[styles.boardCard, s3Board === 'STATE' && styles.boardCardActive, errors.s3Board && styles.inputError]}
                  onPress={() => {
                    setS3Board('STATE');
                    clearError('s3Board');
                  }}
                  activeOpacity={0.9}
                >
                  <View style={styles.boardTopRow}>
                    <Text style={styles.boardPill}>State Board</Text>
                    <View style={styles.seatBadgeRed}>
                      <Text style={styles.seatBadgeTextRed}>Waitlist Only</Text>
                    </View>
                  </View>
                  <Text style={styles.boardName}>Karnataka State Education Board</Text>
                  <Text style={styles.boardSpecs}>• Classes: Grade 1 to 10</Text>
                  <Text style={styles.boardSpecs}>• Medium: English / Kannada</Text>
                  <Text style={styles.boardSpecs}>• Annual Fee: ₹48,000</Text>
                  <TouchableOpacity
                    style={styles.viewCurriculumBtn}
                    onPress={() => {
                      setPreviewBoardKey('STATE');
                      setCurriculumModalOpen(true);
                    }}
                  >
                    <Text style={styles.viewCurriculumText}>📖 View State Curriculum & Books ➜</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>

              {errors.s3Board && (
                <Text style={[styles.inlineErrorText, { marginBottom: 10 }]}>⚠️ {errors.s3Board}</Text>
              )}

              {/* State Board Waitlist Confirmation Checkbox */}
              {s3Board === 'STATE' && (
                <View style={styles.waitlistBox}>
                  <TouchableOpacity
                    style={styles.waitlistRow}
                    onPress={() => {
                      setS3WaitlistConfirmed(!s3WaitlistConfirmed);
                      clearError('s3Waitlist');
                    }}
                  >
                    <View style={[styles.checkboxBox, s3WaitlistConfirmed && styles.checkboxBoxChecked]}>
                      {s3WaitlistConfirmed && <Text style={styles.checkboxCheck}>✓</Text>}
                    </View>
                    <Text style={styles.waitlistLabel}>
                      I understand that State Board admission for 2026–2027 is subject to waitlist clearance, and I confirm waitlist opt-in to proceed.
                    </Text>
                  </TouchableOpacity>
                  {errors.s3Waitlist && (
                    <Text style={[styles.inlineErrorText, { marginTop: 8 }]}>⚠️ {errors.s3Waitlist}</Text>
                  )}
                </View>
              )}

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.disabledBtn]}
                  onPress={handleStep3Submit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Next ➜ Curriculum & Subjects</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCurrentStep(2)}>
                  <Text style={styles.secondaryBtnText}>Back ➜ Programme</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: CURRICULUM & SUBJECTS */}
          {/* ========================================================================= */}
          {currentStep === 4 && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>Apply Step 4: Curriculum & Subjects</Text>
                <Text style={styles.stepSubtitle}>
                  Subjects dynamically loaded for {s2Class} under {s3Board.replace('_', ' / ')}.
                </Text>
              </View>

              {/* Compulsory subjects */}
              <View style={styles.subjectBox}>
                <Text style={styles.subjectBoxTitle}>📚 Core Compulsory Subjects</Text>
                <View style={styles.subjectChipsRow}>
                  {(s4SubjectsData?.compulsory || [
                    'English Language & Literature',
                    'Mathematics Standard',
                    'Science (Physics, Chemistry, Biology)',
                    'Social Science',
                    'Information Technology & AI'
                  ]).map((subj: string, i: number) => (
                    <View key={i} style={styles.subjectBadge}>
                      <Text style={styles.subjectBadgeText}>✓ {subj}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* Language Choice (Classes 6 to 10) */}
              {s4SubjectsData?.languageChoices && (
                <View style={styles.subjectBox}>
                  <Text style={styles.subjectBoxTitle}>🌐 Select Second Language Choice *</Text>
                  <View style={styles.radioGroup}>
                    {s4SubjectsData.languageChoices.map((lang: string) => (
                      <TouchableOpacity
                        key={lang}
                        style={[styles.radioPill, s4SelectedLanguage === lang && styles.radioPillActive, errors.s4SelectedLanguage && styles.inputError]}
                        onPress={() => {
                          setS4SelectedLanguage(lang);
                          clearError('s4SelectedLanguage');
                        }}
                      >
                        <Text style={[styles.radioText, s4SelectedLanguage === lang && styles.radioTextActive]}>
                          {lang}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {errors.s4SelectedLanguage && (
                    <Text style={styles.inlineErrorText}>⚠️ {errors.s4SelectedLanguage}</Text>
                  )}
                </View>
              )}

              {/* Stream combinations (Classes 11 & 12) */}
              {s4SubjectsData?.streams && (
                <View style={styles.subjectBox}>
                  <Text style={styles.subjectBoxTitle}>🔬 Select Senior Secondary Stream & Electives *</Text>
                  {s4SubjectsData.streams.map((stream: any) => (
                    <TouchableOpacity
                      key={stream.id}
                      style={[styles.streamCard, s4SelectedStream === stream.id && styles.streamCardActive, errors.s4SelectedStream && styles.inputError]}
                      onPress={() => {
                        setS4SelectedStream(stream.id);
                        clearError('s4SelectedStream');
                      }}
                    >
                      <Text style={styles.streamName}>{stream.name}</Text>
                      <Text style={styles.streamSubjects}>{stream.compulsory.join(' • ')}</Text>
                    </TouchableOpacity>
                  ))}
                  {errors.s4SelectedStream && (
                    <Text style={styles.inlineErrorText}>⚠️ {errors.s4SelectedStream}</Text>
                  )}
                </View>
              )}

              {/* Action buttons */}
              <View style={styles.syllabusActionRow}>
                <TouchableOpacity
                  style={styles.downloadSyllabusBtn}
                  onPress={() => Alert.alert('Download Syllabus', 'Syllabus PDF downloaded successfully (2026 Edition).')}
                >
                  <Text style={styles.downloadSyllabusText}>📥 Download Syllabus PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.downloadSyllabusBtn}
                  onPress={() => Alert.alert('Prescribed Textbooks', 'NCERT & Council authorized booklist saved to device.')}
                >
                  <Text style={styles.downloadSyllabusText}>📚 Prescribed Textbook List</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.disabledBtn]}
                  onPress={handleStep4Submit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Next ➜ Student Details</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCurrentStep(3)}>
                  <Text style={styles.secondaryBtnText}>Back ➜ Board Selection</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: STUDENT DETAILS */}
          {/* ========================================================================= */}
          {currentStep === 5 && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>Apply Step 5: Student Details</Text>
                <Text style={styles.stepSubtitle}>
                  Enter the student's personal identification, demographic and residential details.
                </Text>
              </View>

              <View style={styles.formGrid}>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>Student Full Name *</Text>
                  <TextInput
                    style={[styles.textInput, errors.s5FullName && styles.inputError]}
                    placeholder="Enter student's official name"
                    placeholderTextColor={colors.textMuted}
                    value={s5FullName}
                    onChangeText={(val) => {
                      setS5FullName(val);
                      clearError('s5FullName');
                    }}
                  />
                  {errors.s5FullName && (
                    <Text style={styles.inlineErrorText}>⚠️ {errors.s5FullName}</Text>
                  )}
                </View>

                <View style={styles.colHalf}>
                  <Text style={styles.label}>Date of Birth *</Text>
                  {Platform.OS === 'web' ? (
                    <View
                      style={[
                        styles.datePickerWrapper,
                        (errors.s5Dob || !s5AgeValidation.valid) && styles.inputError
                      ]}
                    >
                      <Text style={styles.datePickerIcon}>📅</Text>
                      <input
                        type="date"
                        id="s5Dob-picker"
                        name="dateOfBirth"
                        max={new Date().toISOString().split('T')[0]}
                        value={s5Dob}
                        onChange={(e: any) => {
                          const val = e.target.value;
                          setS5Dob(val);
                          clearError('s5Dob');
                        }}
                        style={{
                          flex: 1,
                          border: 'none',
                          outline: 'none',
                          fontSize: '14px',
                          color: s5Dob ? colors.textPrimary : colors.textMuted,
                          backgroundColor: 'transparent',
                          fontFamily: 'inherit',
                          cursor: 'pointer',
                          padding: '3px 0'
                        }}
                      />
                    </View>
                  ) : (
                    <TextInput
                      style={[
                        styles.textInput,
                        (errors.s5Dob || !s5AgeValidation.valid) && styles.inputError
                      ]}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={colors.textMuted}
                      value={s5Dob}
                      onChangeText={(val) => {
                        setS5Dob(val);
                        clearError('s5Dob');
                      }}
                    />
                  )}
                  {errors.s5Dob ? (
                    <Text style={styles.inlineErrorText}>⚠️ {errors.s5Dob}</Text>
                  ) : s5Dob ? (
                    s5AgeValidation.valid ? (
                      <Text style={styles.validationSuccess}>
                        ✓ Age eligible: Calculated {s5AgeValidation.age} years as of June 1, 2026.
                      </Text>
                    ) : (
                      <Text style={styles.validationError}>
                        ⚠️ {s5AgeValidation.message}
                      </Text>
                    )
                  ) : (
                    <Text style={styles.fieldHint}>Select Date of Birth via calendar picker</Text>
                  )}
                </View>
              </View>

              <View style={styles.formGrid}>
                <View style={styles.colThird}>
                  <Text style={styles.label}>Gender *</Text>
                  <View style={styles.radioGroup}>
                    {['Male', 'Female', 'Other'].map(g => (
                      <TouchableOpacity
                        key={g}
                        style={[styles.radioPill, s5Gender === g && styles.radioPillActive, errors.s5Gender && styles.inputError]}
                        onPress={() => {
                          setS5Gender(g);
                          clearError('s5Gender');
                        }}
                      >
                        <Text style={[styles.radioText, s5Gender === g && styles.radioTextActive]}>{g}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {errors.s5Gender && (
                    <Text style={styles.inlineErrorText}>⚠️ {errors.s5Gender}</Text>
                  )}
                </View>

                <View style={styles.colThird}>
                  <Text style={styles.label}>Blood Group *</Text>
                  <TextInput
                    style={[styles.textInput, errors.s5BloodGroup && styles.inputError]}
                    placeholder="e.g. O+, A+, B+"
                    placeholderTextColor={colors.textMuted}
                    value={s5BloodGroup}
                    onChangeText={(val) => {
                      setS5BloodGroup(val);
                      clearError('s5BloodGroup');
                    }}
                  />
                  {errors.s5BloodGroup && (
                    <Text style={styles.inlineErrorText}>⚠️ {errors.s5BloodGroup}</Text>
                  )}
                </View>

                <View style={styles.colThird}>
                  <Text style={styles.label}>Nationality *</Text>
                  <TextInput
                    style={[styles.textInput, errors.s5Nationality && styles.inputError]}
                    placeholder="e.g. Indian"
                    placeholderTextColor={colors.textMuted}
                    value={s5Nationality}
                    onChangeText={(val) => {
                      setS5Nationality(val);
                      clearError('s5Nationality');
                    }}
                  />
                  {errors.s5Nationality && (
                    <Text style={styles.inlineErrorText}>⚠️ {errors.s5Nationality}</Text>
                  )}
                </View>
              </View>

              <View style={styles.formGrid}>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>Category</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="General / OBC / SC / ST"
                    placeholderTextColor={colors.textMuted}
                    value={s5Category}
                    onChangeText={setS5Category}
                  />
                </View>

                <View style={styles.colHalf}>
                  <Text style={styles.label}>Aadhaar / National ID Number</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="xxxx xxxx xxxx"
                    placeholderTextColor={colors.textMuted}
                    value={s5IdNumber}
                    onChangeText={setS5IdNumber}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Residential Address *</Text>
                <TextInput
                  style={[styles.textInput, { height: 70 }, errors.s5Address && styles.inputError]}
                  placeholder="Door No, Street Name, City, State, Pincode"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  value={s5Address}
                  onChangeText={(val) => {
                    setS5Address(val);
                    clearError('s5Address');
                  }}
                />
                {errors.s5Address && (
                  <Text style={styles.inlineErrorText}>⚠️ {errors.s5Address}</Text>
                )}
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.disabledBtn]}
                  onPress={handleStep5Submit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Next ➜ Parent / Guardian</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => handleSaveStep(5, { fullName: s5FullName, dob: s5Dob }, false)}
                >
                  <Text style={styles.secondaryBtnText}>
                    {savingDraft ? 'Saving Draft...' : 'Save Draft'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCurrentStep(4)}>
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* STEP 6: PARENT / GUARDIAN */}
          {/* ========================================================================= */}
          {currentStep === 6 && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>Apply Step 6: Parent / Guardian</Text>
                <Text style={styles.stepSubtitle}>
                  Provide details of father, mother, or legal guardian for official communication and verification.
                </Text>
              </View>

              <View style={styles.formGrid}>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>Father's Full Name</Text>
                  <TextInput
                    style={[styles.textInput, errors.s6ParentName && styles.inputError]}
                    placeholder="Father Name"
                    placeholderTextColor={colors.textMuted}
                    value={s6FatherName}
                    onChangeText={(val) => {
                      setS6FatherName(val);
                      clearError('s6ParentName');
                    }}
                  />
                </View>

                <View style={styles.colHalf}>
                  <Text style={styles.label}>Father's Occupation</Text>
                  <TextInput
                    style={[styles.textInput, errors.s6ParentOccupation && styles.inputError]}
                    placeholder="e.g. Software Architect / Business"
                    placeholderTextColor={colors.textMuted}
                    value={s6FatherOccupation}
                    onChangeText={(val) => {
                      setS6FatherOccupation(val);
                      clearError('s6ParentOccupation');
                    }}
                  />
                </View>
              </View>

              <View style={styles.formGrid}>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>Mother's Full Name</Text>
                  <TextInput
                    style={[styles.textInput, errors.s6ParentName && styles.inputError]}
                    placeholder="Mother Name"
                    placeholderTextColor={colors.textMuted}
                    value={s6MotherName}
                    onChangeText={(val) => {
                      setS6MotherName(val);
                      clearError('s6ParentName');
                    }}
                  />
                </View>

                <View style={styles.colHalf}>
                  <Text style={styles.label}>Mother's Occupation</Text>
                  <TextInput
                    style={[styles.textInput, errors.s6ParentOccupation && styles.inputError]}
                    placeholder="e.g. Professor / Banking"
                    placeholderTextColor={colors.textMuted}
                    value={s6MotherOccupation}
                    onChangeText={(val) => {
                      setS6MotherOccupation(val);
                      clearError('s6ParentOccupation');
                    }}
                  />
                </View>
              </View>

              <View style={styles.formGrid}>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>Guardian Name (If applicable)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Legal guardian name"
                    placeholderTextColor={colors.textMuted}
                    value={s6GuardianName}
                    onChangeText={(val) => {
                      setS6GuardianName(val);
                      clearError('s6ParentName');
                    }}
                  />
                </View>

                <View style={styles.colHalf}>
                  <Text style={styles.label}>Annual Household Income</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. 15-20 Lakhs"
                    placeholderTextColor={colors.textMuted}
                    value={s6AnnualIncome}
                    onChangeText={setS6AnnualIncome}
                  />
                </View>
              </View>

              {errors.s6ParentName && (
                <Text style={[styles.inlineErrorText, { marginBottom: 10 }]}>⚠️ {errors.s6ParentName}</Text>
              )}
              {errors.s6ParentOccupation && (
                <Text style={[styles.inlineErrorText, { marginBottom: 10 }]}>⚠️ {errors.s6ParentOccupation}</Text>
              )}

              <View style={styles.formGrid}>
                <View style={styles.colThird}>
                  <Text style={styles.label}>Parent Mobile Number *</Text>
                  <TextInput
                    style={[styles.textInput, errors.s6ParentMobile && styles.inputError]}
                    placeholder="10-digit mobile"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    maxLength={10}
                    value={s6ParentMobile}
                    onChangeText={(val) => {
                      const clean = val.replace(/\D/g, '').slice(0, 10);
                      setS6ParentMobile(clean);
                      clearError('s6ParentMobile');
                    }}
                  />
                  {errors.s6ParentMobile && (
                    <Text style={styles.inlineErrorText}>⚠️ {errors.s6ParentMobile}</Text>
                  )}
                </View>

                <View style={styles.colThird}>
                  <Text style={styles.label}>Parent Email Address *</Text>
                  <TextInput
                    style={[styles.textInput, errors.s6ParentEmail && styles.inputError]}
                    placeholder="parent@example.com"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="email-address"
                    value={s6ParentEmail}
                    onChangeText={(val) => {
                      setS6ParentEmail(val);
                      clearError('s6ParentEmail');
                    }}
                  />
                  {errors.s6ParentEmail && (
                    <Text style={styles.inlineErrorText}>⚠️ {errors.s6ParentEmail}</Text>
                  )}
                </View>

                <View style={styles.colThird}>
                  <Text style={styles.label}>Emergency Contact *</Text>
                  <TextInput
                    nativeID="emergency-contact-input"
                    testID="emergency-contact-input"
                    style={[styles.textInput, errors.s6EmergencyContact && styles.inputError]}
                    placeholder="10-digit emergency number"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    inputMode="numeric"
                    maxLength={10}
                    value={s6EmergencyContact}
                    onChangeText={(val) => {
                      const clean = val.replace(/\D/g, '').slice(0, 10);
                      setS6EmergencyContact(clean);
                      clearError('s6EmergencyContact');
                    }}
                  />
                  {errors.s6EmergencyContact && (
                    <Text style={styles.inlineErrorText}>⚠️ {errors.s6EmergencyContact}</Text>
                  )}
                </View>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.disabledBtn]}
                  onPress={handleStep6Submit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Next ➜ Previous Education</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => handleSaveStep(6, { fatherName: s6FatherName }, false)}
                >
                  <Text style={styles.secondaryBtnText}>
                    {savingDraft ? 'Saving Draft...' : 'Save Draft'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCurrentStep(5)}>
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* STEP 7: PREVIOUS EDUCATION */}
          {/* ========================================================================= */}
          {currentStep === 7 && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>Apply Step 7: Previous Education</Text>
                <Text style={styles.stepSubtitle}>
                  Academic performance and transfer certificate details from your previous school or college.
                </Text>
              </View>

              {/* NURSERY ADMISSION SKIP BANNER / TOGGLE */}
              <View style={[styles.nurserySkipCard, (isNurseryAdmission || s7SkippedForNursery) && styles.nurserySkipCardActive]}>
                <View style={styles.nurserySkipHeader}>
                  <View style={{ flex: 1, minWidth: 220 }}>
                    <Text style={styles.nurserySkipTitle}>
                      🌱 First-Time Nursery / Pre-Primary Admission
                    </Text>
                    <Text style={styles.nurserySkipSubtitle}>
                      {isNurseryAdmission
                        ? 'Nursery / Pre-Primary class detected. Previous school history, marksheet, and TC are not required.'
                        : 'If enrolling for early childhood / first-time schooling without previous institution history, you can skip this step.'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    testID="skip-nursery-toggle"
                    style={[
                      styles.nurseryToggleBtn,
                      s7SkippedForNursery && styles.nurseryToggleBtnActive
                    ]}
                    onPress={() => {
                      setS7SkippedForNursery(!s7SkippedForNursery);
                      clearError('s7LastSchool');
                      clearError('s7Board');
                      clearError('s7PassingYear');
                      clearError('s7Marks');
                    }}
                  >
                    <Text
                      style={[
                        styles.nurseryToggleBtnText,
                        s7SkippedForNursery && styles.nurseryToggleBtnTextActive
                      ]}
                    >
                      {s7SkippedForNursery ? '✓ Skipped for Nursery' : 'Skip for Nursery Admissions'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {s7SkippedForNursery && (
                  <View style={styles.nurserySkipActionRow}>
                    <Text style={styles.nurserySkipBadge}>
                      ✓ Previous school & TC validation rules bypassed
                    </Text>
                    <TouchableOpacity
                      testID="skip-to-facilities-btn"
                      style={styles.nurserySkipNextBtn}
                      onPress={handleStep7Submit}
                    >
                      <Text style={styles.nurserySkipNextBtnText}>
                        Advance to Step 8 (Facilities) ➜
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.formGrid}>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>Last School / College Name</Text>
                  <TextInput
                    style={[styles.textInput, errors.s7LastSchool && styles.inputError]}
                    placeholder="e.g. Greenwood International High School"
                    placeholderTextColor={colors.textMuted}
                    value={s7LastSchool}
                    onChangeText={(val) => {
                      setS7LastSchool(val);
                      clearError('s7LastSchool');
                    }}
                  />
                  {errors.s7LastSchool && (
                    <Text style={styles.inlineErrorText}>⚠️ {errors.s7LastSchool}</Text>
                  )}
                </View>

                <View style={styles.colHalf}>
                  <Text style={styles.label}>Affiliated Board / University</Text>
                  <TextInput
                    style={[styles.textInput, errors.s7Board && styles.inputError]}
                    placeholder="CBSE / ICSE / State / Other"
                    placeholderTextColor={colors.textMuted}
                    value={s7Board}
                    onChangeText={(val) => {
                      setS7Board(val);
                      clearError('s7Board');
                    }}
                  />
                  {errors.s7Board && (
                    <Text style={styles.inlineErrorText}>⚠️ {errors.s7Board}</Text>
                  )}
                </View>
              </View>

              <View style={styles.formGrid}>
                <View style={styles.colThird}>
                  <Text style={styles.label}>Passing Year</Text>
                  <TextInput
                    style={[styles.textInput, errors.s7PassingYear && styles.inputError]}
                    placeholder="e.g. 2025"
                    placeholderTextColor={colors.textMuted}
                    value={s7PassingYear}
                    onChangeText={(val) => {
                      setS7PassingYear(val);
                      clearError('s7PassingYear');
                    }}
                  />
                  {errors.s7PassingYear && (
                    <Text style={styles.inlineErrorText}>⚠️ {errors.s7PassingYear}</Text>
                  )}
                </View>

                <View style={styles.colThird}>
                  <Text style={styles.label}>Marks Percentage / CGPA</Text>
                  <TextInput
                    style={[styles.textInput, errors.s7Marks && styles.inputError]}
                    placeholder="e.g. 91.4% or 9.4 CGPA"
                    placeholderTextColor={colors.textMuted}
                    value={s7Marks}
                    onChangeText={(val) => {
                      setS7Marks(val);
                      clearError('s7Marks');
                    }}
                  />
                  {errors.s7Marks && (
                    <Text style={styles.inlineErrorText}>⚠️ {errors.s7Marks}</Text>
                  )}
                </View>

                <View style={styles.colThird}>
                  <Text style={styles.label}>Medium of Instruction</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. English"
                    placeholderTextColor={colors.textMuted}
                    value={s7Medium}
                    onChangeText={setS7Medium}
                  />
                </View>
              </View>

              <View style={styles.formGrid}>
                <View style={styles.colHalf}>
                  <Text style={styles.label}>Reason for Leaving / Transfer</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Relocation / Better academic opportunities"
                    placeholderTextColor={colors.textMuted}
                    value={s7Reason}
                    onChangeText={setS7Reason}
                  />
                </View>

                <View style={styles.colHalf}>
                  <Text style={styles.label}>Transfer Certificate (TC) Number</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="e.g. TC-2025-8849"
                    placeholderTextColor={colors.textMuted}
                    value={s7TcDetails}
                    onChangeText={setS7TcDetails}
                  />
                </View>
              </View>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.disabledBtn]}
                  onPress={handleStep7Submit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Next ➜ Campus Facilities</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => handleSaveStep(7, { lastSchool: s7LastSchool }, false)}
                >
                  <Text style={styles.secondaryBtnText}>
                    {savingDraft ? 'Saving Draft...' : 'Save Draft'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCurrentStep(6)}>
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* STEP 8: FACILITIES (Strict Conditional Enforcement) */}
          {/* ========================================================================= */}
          {currentStep === 8 && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>Apply Step 8: Facilities</Text>
                <Text style={styles.stepSubtitle}>
                  Choose optional campus amenities. Conditional inputs are strictly required when selected.
                </Text>
              </View>

              <View style={styles.facilitiesGrid}>
                {/* 1. Hostel Card */}
                <View style={[styles.facilityCard, s8HostelOpted && styles.facilityCardActive]}>
                  <TouchableOpacity
                    style={styles.facilityCheckboxRow}
                    onPress={() => {
                      setS8HostelOpted(!s8HostelOpted);
                      clearError('s8RoomType');
                    }}
                  >
                    <View style={[styles.checkboxBox, s8HostelOpted && styles.checkboxBoxChecked]}>
                      {s8HostelOpted && <Text style={styles.checkboxCheck}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.facilityTitle}>🏨 Hostel Accommodation</Text>
                      <Text style={styles.facilitySub}>
                        Tick if the student needs on-campus hostel accommodation with 24/7 warden support and nutritious dining.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* CONDITIONAL REQUIRED FIELD */}
                  {s8HostelOpted && (
                    <View style={styles.conditionalFieldBox}>
                      <Text style={styles.conditionalLabel}>Select Required Room Type *</Text>
                      <View style={styles.radioGroup}>
                        {['Single AC', '2-Sharing AC', '3-Sharing Standard', '4-Bed Dormitory'].map((room) => (
                          <TouchableOpacity
                            key={room}
                            style={[styles.radioPill, s8RoomType === room && styles.radioPillActive, errors.s8RoomType && styles.inputError]}
                            onPress={() => {
                              setS8RoomType(room);
                              clearError('s8RoomType');
                            }}
                          >
                            <Text style={[styles.radioText, s8RoomType === room && styles.radioTextActive]}>
                              {room}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {errors.s8RoomType && (
                        <Text style={[styles.inlineErrorText, { marginTop: 6 }]}>⚠️ {errors.s8RoomType}</Text>
                      )}
                    </View>
                  )}
                </View>

                {/* 2. Transport Card */}
                <View style={[styles.facilityCard, s8TransportOpted && styles.facilityCardActive]}>
                  <TouchableOpacity
                    style={styles.facilityCheckboxRow}
                    onPress={() => {
                      setS8TransportOpted(!s8TransportOpted);
                      clearError('s8PickupArea');
                    }}
                  >
                    <View style={[styles.checkboxBox, s8TransportOpted && styles.checkboxBoxChecked]}>
                      {s8TransportOpted && <Text style={styles.checkboxCheck}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.facilityTitle}>🚌 School Transport Bus</Text>
                      <Text style={styles.facilitySub}>
                        Tick if the student needs GPS-monitored air-conditioned bus transportation with speed governors and female attendants.
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* CONDITIONAL REQUIRED FIELD */}
                  {s8TransportOpted && (
                    <View style={styles.conditionalFieldBox}>
                      <Text style={styles.conditionalLabel}>Enter Preferred Pickup Area / Landmark *</Text>
                      <TextInput
                        style={[styles.textInput, errors.s8PickupArea && styles.inputError]}
                        placeholder="e.g. Indiranagar Metro, Whitefield, Koramangala 4th Block"
                        placeholderTextColor={colors.textMuted}
                        value={s8PickupArea}
                        onChangeText={(val) => {
                          setS8PickupArea(val);
                          clearError('s8PickupArea');
                        }}
                      />
                      {errors.s8PickupArea && (
                        <Text style={[styles.inlineErrorText, { marginTop: 6 }]}>⚠️ {errors.s8PickupArea}</Text>
                      )}
                    </View>
                  )}
                </View>

                {/* 3. Library Membership */}
                <View style={[styles.facilityCard, s8LibraryOpted && styles.facilityCardActive]}>
                  <TouchableOpacity
                    style={styles.facilityCheckboxRow}
                    onPress={() => setS8LibraryOpted(!s8LibraryOpted)}
                  >
                    <View style={[styles.checkboxBox, s8LibraryOpted && styles.checkboxBoxChecked]}>
                      {s8LibraryOpted && <Text style={styles.checkboxCheck}>✓</Text>}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.facilityTitle}>📚 Digital & Physical Library Membership</Text>
                      <Text style={styles.facilitySub}>
                        Tick to opt-in to 50,000+ volumes, JSTOR & IEEE digital journals access, and Kindle reading lounges.
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.facilityFootnote}>
                All three are optional and can be ticked in any combination. Hostel and Transport requests go to Admin for seat allocation, and fees are added only upon confirmation.
              </Text>

              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.disabledBtn]}
                  onPress={handleStep8Submit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Next ➜ Documents & Review</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCurrentStep(7)}>
                  <Text style={styles.secondaryBtnText}>Back</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ========================================================================= */}
          {/* STEP 9: DOCUMENTS, REVIEW SUMMARY & SUBMIT */}
          {/* ========================================================================= */}
          {currentStep === 9 && (
            <View style={styles.stepCard}>
              <View style={styles.stepHeader}>
                <Text style={styles.stepTitle}>Apply Step 9: Documents, Review & Submit</Text>
                <Text style={styles.stepSubtitle}>
                  Upload digital verification documents, preview your entire application, and make your final submission.
                </Text>
              </View>

              {/* DOCUMENT UPLOAD SLOTS */}
              <View style={styles.docUploadSection}>
                <Text style={styles.sectionHeadingSm}>📑 Document Upload Slots</Text>
                <View style={styles.uploadGrid}>
                  {/* Photo Slot */}
                  <View style={styles.uploadSlot}>
                    <Text style={styles.uploadSlotTitle}>Student Photo *</Text>
                    <Text style={styles.uploadSlotDesc}>Passport size JPG/PNG (max 5MB)</Text>
                    <TouchableOpacity
                      style={[styles.uploadSlotBtn, s9PhotoUploaded && styles.uploadSlotBtnActive, errors.s9Photo && styles.inputError]}
                      onPress={() => {
                        setS9PhotoUploaded(!s9PhotoUploaded);
                        clearError('s9Photo');
                      }}
                    >
                      <Text style={styles.uploadSlotBtnText}>
                        {s9PhotoUploaded ? '✓ photo-uploaded.jpg (Replace)' : '⬆ Upload Student Photo'}
                      </Text>
                    </TouchableOpacity>
                    {errors.s9Photo && (
                      <Text style={styles.inlineErrorText}>⚠️ {errors.s9Photo}</Text>
                    )}
                  </View>

                  {/* ID Proof Slot */}
                  <View style={styles.uploadSlot}>
                    <Text style={styles.uploadSlotTitle}>Identity Proof *</Text>
                    <Text style={styles.uploadSlotDesc}>Aadhaar card or Birth Certificate</Text>
                    <TouchableOpacity
                      style={[styles.uploadSlotBtn, s9IdUploaded && styles.uploadSlotBtnActive, errors.s9Id && styles.inputError]}
                      onPress={() => {
                        setS9IdUploaded(!s9IdUploaded);
                        clearError('s9Id');
                      }}
                    >
                      <Text style={styles.uploadSlotBtnText}>
                        {s9IdUploaded ? '✓ aadhaar-doc.pdf (Replace)' : '⬆ Upload ID Proof'}
                      </Text>
                    </TouchableOpacity>
                    {errors.s9Id && (
                      <Text style={styles.inlineErrorText}>⚠️ {errors.s9Id}</Text>
                    )}
                  </View>

                  {/* Previous Marksheet */}
                  <View style={styles.uploadSlot}>
                    <Text style={styles.uploadSlotTitle}>Previous Marksheet</Text>
                    <Text style={styles.uploadSlotDesc}>Last academic session report card</Text>
                    <TouchableOpacity
                      style={[styles.uploadSlotBtn, s9MarksheetUploaded && styles.uploadSlotBtnActive, errors.s9Marksheet && styles.inputError]}
                      onPress={() => {
                        setS9MarksheetUploaded(!s9MarksheetUploaded);
                        clearError('s9Marksheet');
                      }}
                    >
                      <Text style={styles.uploadSlotBtnText}>
                        {s9MarksheetUploaded ? '✓ marksheet-2025.pdf (Replace)' : '⬆ Upload Marksheet'}
                      </Text>
                    </TouchableOpacity>
                    {errors.s9Marksheet && (
                      <Text style={styles.inlineErrorText}>⚠️ {errors.s9Marksheet}</Text>
                    )}
                  </View>

                  {/* Transfer Certificate */}
                  <View style={styles.uploadSlot}>
                    <Text style={styles.uploadSlotTitle}>Transfer Certificate (TC)</Text>
                    <Text style={styles.uploadSlotDesc}>School leaving certificate with seal</Text>
                    <TouchableOpacity
                      style={[styles.uploadSlotBtn, s9TcUploaded && styles.uploadSlotBtnActive]}
                      onPress={() => setS9TcUploaded(!s9TcUploaded)}
                    >
                      <Text style={styles.uploadSlotBtnText}>
                        {s9TcUploaded ? '✓ tc-signed.pdf (Replace)' : '⬆ Upload TC Document'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* READ-ONLY REVIEW SUMMARY */}
              <View style={styles.reviewSummarySection}>
                <Text style={styles.sectionHeadingSm}>📋 Complete Application Review Summary</Text>

                {/* Section A: Programme & Board */}
                <View style={styles.reviewBlock}>
                  <View style={styles.reviewBlockHeader}>
                    <Text style={styles.reviewBlockTitle}>1. Programme & Board Selection</Text>
                    <TouchableOpacity onPress={() => setCurrentStep(2)}>
                      <Text style={styles.editLink}>Edit Step 2 ✎</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.reviewItem}>• Institution Type: {s2Type}</Text>
                  <Text style={styles.reviewItem}>• Target Class: {s2Class} ({s2Mode})</Text>
                  <Text style={styles.reviewItem}>• Affiliated Board: {s3Board.replace('_', ' / ')}</Text>
                  <Text style={styles.reviewItem}>• Academic Year: {s2AcademicYear}</Text>
                </View>

                {/* Section B: Curriculum & Subjects */}
                <View style={styles.reviewBlock}>
                  <View style={styles.reviewBlockHeader}>
                    <Text style={styles.reviewBlockTitle}>2. Selected Subjects & Languages</Text>
                    <TouchableOpacity onPress={() => setCurrentStep(4)}>
                      <Text style={styles.editLink}>Edit Step 4 ✎</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.reviewItem}>• Core Subjects: English, Mathematics, Science, Social Studies, ICT</Text>
                  <Text style={styles.reviewItem}>• Second Language Choice: {s4SelectedLanguage}</Text>
                </View>

                {/* Section C: Student Details */}
                <View style={styles.reviewBlock}>
                  <View style={styles.reviewBlockHeader}>
                    <Text style={styles.reviewBlockTitle}>3. Student Personal Details</Text>
                    <TouchableOpacity onPress={() => setCurrentStep(5)}>
                      <Text style={styles.editLink}>Edit Step 5 ✎</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.reviewItem}>• Full Name: {s5FullName}</Text>
                  <Text style={styles.reviewItem}>• Date of Birth: {s5Dob} (Calculated Age: {s5AgeValidation.age || 11} yrs)</Text>
                  <Text style={styles.reviewItem}>• Gender: {s5Gender} • Blood Group: {s5BloodGroup} • Nationality: {s5Nationality}</Text>
                  <Text style={styles.reviewItem}>• Residential Address: {s5Address}</Text>
                </View>

                {/* Section D: Parent Details */}
                <View style={styles.reviewBlock}>
                  <View style={styles.reviewBlockHeader}>
                    <Text style={styles.reviewBlockTitle}>4. Parent / Guardian Details</Text>
                    <TouchableOpacity onPress={() => setCurrentStep(6)}>
                      <Text style={styles.editLink}>Edit Step 6 ✎</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.reviewItem}>• Father: {s6FatherName || 'N/A'} ({s6FatherOccupation || 'N/A'})</Text>
                  <Text style={styles.reviewItem}>• Mother: {s6MotherName || 'N/A'} ({s6MotherOccupation || 'N/A'})</Text>
                  <Text style={styles.reviewItem}>• Primary Mobile: +91 {s6ParentMobile} • Email: {s6ParentEmail}</Text>
                </View>

                {/* Section E: Facilities */}
                <View style={styles.reviewBlock}>
                  <View style={styles.reviewBlockHeader}>
                    <Text style={styles.reviewBlockTitle}>5. Opted Campus Amenities</Text>
                    <TouchableOpacity onPress={() => setCurrentStep(8)}>
                      <Text style={styles.editLink}>Edit Step 8 ✎</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.reviewItem}>
                    • Hostel Accommodation: {s8HostelOpted ? `Opted (${s8RoomType})` : 'Not Opted'}
                  </Text>
                  <Text style={styles.reviewItem}>
                    • School Bus Transport: {s8TransportOpted ? `Opted (Pickup: ${s8PickupArea})` : 'Not Opted'}
                  </Text>
                  <Text style={styles.reviewItem}>
                    • Library Access: {s8LibraryOpted ? 'Opted (Included)' : 'Not Opted'}
                  </Text>
                </View>
              </View>

              {/* DECLARATION CHECKBOX */}
              <TouchableOpacity
                style={[styles.declarationRow, errors.s9Declaration && styles.inputError]}
                onPress={() => {
                  setS9Declaration(!s9Declaration);
                  clearError('s9Declaration');
                }}
              >
                <View style={[styles.checkboxBox, s9Declaration && styles.checkboxBoxChecked]}>
                  {s9Declaration && <Text style={styles.checkboxCheck}>✓</Text>}
                </View>
                <Text style={styles.declarationText}>
                  I hereby solemnly declare that all statements made in this admission application are true, complete and correct to the best of my knowledge and belief. I understand that any false declaration will lead to cancellation of admission.
                </Text>
              </TouchableOpacity>
              {errors.s9Declaration && (
                <Text style={[styles.inlineErrorText, { marginBottom: 12 }]}>⚠️ {errors.s9Declaration}</Text>
              )}

              {/* SUBMIT BUTTONS */}
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.submitFinalBtn, (!s9Declaration || loading) && styles.disabledBtn]}
                  onPress={handleFinalSubmit}
                  disabled={!s9Declaration || loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <Text style={styles.submitFinalText}>Submit Application ➜ Confirmation</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setCurrentStep(8)}>
                  <Text style={styles.secondaryBtnText}>Back ➜ Facilities</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          </View>
        </View>

        {user ? <StudentFooter /> : <PublicFooter />}
      </ScrollView>

      {/* CONFIRMATION MODAL UPON SUCCESSFUL SUBMISSION */}
      {submissionSuccess && (
        <View
          style={styles.overlay}
          {...(Platform.OS === 'web' ? ({ className: 'skanda-modal-backdrop' } as any) : {})}
        >
          <View
            style={styles.confirmModalCard}
            {...(Platform.OS === 'web' ? ({ className: 'skanda-modal-card' } as any) : {})}
          >
            <View style={styles.confirmBadge}>
              <Text style={styles.confirmBadgeIcon}>🎉</Text>
            </View>
            <Text style={styles.confirmTitle}>Application Submitted Successfully!</Text>
            <Text style={styles.confirmSub}>
              Thank you for applying to Skanda International School for Academic Year {application?.academicYear || '2026-2027'}.
            </Text>

            <View style={styles.confirmDetailsBox}>
              <Text style={styles.confirmAppNoLabel}>Application Reference Number</Text>
              <Text style={styles.confirmAppNoValue}>{application?.applicationNo || 'SIS-2026-0001'}</Text>
              <Text style={styles.confirmDispatchNote}>
                📨 An official confirmation receipt has been dispatched to +91 {user?.mobile} and {user?.email}.
              </Text>
            </View>

            <View style={styles.confirmActionRow}>
              <TouchableOpacity
                style={styles.confirmPrimaryBtn}
                onPress={() => {
                  setSubmissionSuccess(false);
                  navigateTo('/student/dashboard');
                }}
              >
                <Text style={styles.confirmPrimaryText}>Go to Student Dashboard ➜</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmSecondaryBtn}
                onPress={() => {
                  if (application) {
                    generateApplicationPdf(application);
                  }
                }}
              >
                <Text style={styles.confirmSecondaryText}>📥 Download Application PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Curriculum Modal */}
      <CurriculumModal
        visible={curriculumModalOpen}
        onClose={() => setCurriculumModalOpen(false)}
        boardKey={previewBoardKey}
        boardData={previewBoardKey ? boardMetadata?.[previewBoardKey] : null}
      />

      {/* Login Modal */}
      <LoginModal visible={loginModalOpen} onClose={() => setLoginModalOpen(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage
  },
  scroll: {
    flex: 1
  },
  wizardCanvas: {
    maxWidth: 960,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl
  },
  alertBox: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1
  },
  alertError: {
    backgroundColor: colors.statusDangerBg,
    borderColor: '#FCA5A5'
  },
  alertSuccess: {
    backgroundColor: colors.statusSuccessBg,
    borderColor: '#86EFAC'
  },
  alertText: {
    fontSize: 13,
    fontWeight: '600'
  },
  alertTextError: {
    color: colors.statusDanger
  },
  alertTextSuccess: {
    color: colors.statusSuccess
  },
  stepCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    ...shadows.card
  },
  stepHeader: {
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    paddingBottom: spacing.md
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.brandDark,
    letterSpacing: -0.5
  },
  stepSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4
  },
  infoBanner: {
    backgroundColor: colors.brandLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8
  },
  infoBannerText: {
    fontSize: 13,
    color: colors.brandDark
  },
  inlineActionBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm
  },
  inlineActionText: {
    color: colors.textInverse,
    fontSize: 12,
    fontWeight: '700'
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: spacing.md
  },
  colHalf: {
    flex: 1,
    minWidth: 260
  },
  colThird: {
    flex: 1,
    minWidth: 180
  },
  inputGroup: {
    marginBottom: spacing.md
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.bgSurface,
    outlineWidth: 0 as any
  },
  inputError: {
    borderColor: colors.statusDanger,
    backgroundColor: '#FFF5F5'
  },
  inlineErrorText: {
    color: colors.statusDanger,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    lineHeight: 16
  },
  otpVerificationBox: {
    backgroundColor: '#EFF6FF',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: colors.brandPrimary,
    marginVertical: spacing.md
  },
  waitlistBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm
  },
  waitlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  waitlistLabel: {
    flex: 1,
    fontSize: 13,
    color: '#991B1B',
    fontWeight: '600',
    lineHeight: 18
  },
  readOnlyInput: {
    backgroundColor: colors.bgPage,
    color: colors.textSecondary
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgSurface
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    outlineWidth: 0 as any
  },
  eyeBtn: {
    paddingHorizontal: 10
  },
  eyeText: {
    fontSize: 15
  },
  fieldHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 18
  },
  otpDevBox: {
    backgroundColor: '#FEF3C7',
    padding: 10,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FCD34D'
  },
  otpDevText: {
    fontSize: 13,
    color: '#92400E'
  },
  btnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault
  },
  primaryBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.hover
  },
  primaryBtnText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700'
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgPage,
    alignItems: 'center',
    justifyContent: 'center'
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600'
  },
  submitFinalBtn: {
    backgroundColor: colors.statusSuccess,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.hover
  },
  submitFinalText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '800'
  },
  disabledBtn: {
    opacity: 0.5
  },
  cardSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: spacing.lg
  },
  typeCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: colors.bgPage,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.borderDefault
  },
  typeCardActive: {
    backgroundColor: colors.brandLight,
    borderColor: colors.brandPrimary
  },
  typeIcon: {
    fontSize: 32,
    marginBottom: 6
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary
  },
  typeTitleActive: {
    color: colors.brandDark,
    fontWeight: '800'
  },
  typeSub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  typeCheck: {
    marginTop: 8
  },
  typeCheckText: {
    color: colors.brandPrimary,
    fontSize: 12,
    fontWeight: '700'
  },
  pickerBox: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: borderRadius.md,
    padding: 6,
    backgroundColor: colors.bgSurface
  },
  chipScroll: {
    flexDirection: 'row'
  },
  chip: {
    backgroundColor: colors.bgPage,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    marginRight: 6,
    borderWidth: 1,
    borderColor: colors.borderDefault
  },
  chipActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary
  },
  chipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600'
  },
  chipTextActive: {
    color: colors.textInverse
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  radioPill: {
    backgroundColor: colors.bgPage,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault
  },
  radioPillActive: {
    backgroundColor: colors.brandLight,
    borderColor: colors.brandPrimary
  },
  radioText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary
  },
  radioTextActive: {
    color: colors.brandPrimary,
    fontWeight: '700'
  },
  bannerInfoBox: {
    backgroundColor: colors.brandLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  bannerInfoTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brandDark,
    marginBottom: 4
  },
  bannerInfoText: {
    fontSize: 12,
    color: colors.brandDark,
    lineHeight: 18
  },
  boardCardsGrid: {
    gap: 16,
    marginVertical: spacing.sm
  },
  boardCard: {
    backgroundColor: colors.bgPage,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.borderDefault
  },
  boardCardActive: {
    backgroundColor: '#F8FAFF',
    borderColor: colors.brandPrimary
  },
  boardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  boardPill: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.brandDark
  },
  seatBadgeGreen: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full
  },
  seatBadgeTextGreen: {
    color: colors.statusSuccess,
    fontSize: 11,
    fontWeight: '700'
  },
  seatBadgeAmber: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full
  },
  seatBadgeTextAmber: {
    color: colors.statusWarning,
    fontSize: 11,
    fontWeight: '700'
  },
  seatBadgeRed: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full
  },
  seatBadgeTextRed: {
    color: colors.statusDanger,
    fontSize: 11,
    fontWeight: '700'
  },
  boardName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 6
  },
  boardSpecs: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20
  },
  viewCurriculumBtn: {
    marginTop: spacing.md,
    alignSelf: 'flex-start'
  },
  viewCurriculumText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brandPrimary
  },
  subjectBox: {
    marginBottom: spacing.lg,
    backgroundColor: colors.bgPage,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault
  },
  subjectBoxTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brandDark,
    marginBottom: spacing.sm
  },
  subjectChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  subjectBadge: {
    backgroundColor: colors.bgSurface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.borderDefault
  },
  subjectBadgeText: {
    fontSize: 12,
    color: colors.textPrimary,
    fontWeight: '500'
  },
  streamCard: {
    backgroundColor: colors.bgSurface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginBottom: 8
  },
  streamCardActive: {
    borderColor: colors.brandPrimary,
    backgroundColor: colors.brandLight
  },
  streamName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary
  },
  streamSubjects: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4
  },
  syllabusActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: spacing.md
  },
  downloadSyllabusBtn: {
    backgroundColor: colors.bgPage,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.md
  },
  downloadSyllabusText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brandPrimary
  },
  validationSuccess: {
    fontSize: 11,
    color: colors.statusSuccess,
    fontWeight: '600',
    marginTop: 4
  },
  validationError: {
    fontSize: 11,
    color: colors.statusDanger,
    fontWeight: '600',
    marginTop: 4
  },
  facilitiesGrid: {
    gap: 16
  },
  facilityCard: {
    backgroundColor: colors.brandLight, // soft sky blue tint
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  facilityCardActive: {
    borderColor: colors.brandPrimary
  },
  facilityCheckboxRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start'
  },
  checkboxBox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.brandPrimary,
    backgroundColor: colors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  },
  checkboxBoxChecked: {
    backgroundColor: colors.brandPrimary
  },
  checkboxCheck: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '900'
  },
  facilityTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.brandDark
  },
  facilitySub: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18
  },
  conditionalFieldBox: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#BFDBFE'
  },
  conditionalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brandDark,
    marginBottom: 6
  },
  facilityFootnote: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.md,
    lineHeight: 18
  },
  docUploadSection: {
    marginBottom: spacing.xl
  },
  sectionHeadingSm: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.brandDark,
    marginBottom: spacing.md
  },
  uploadGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  uploadSlot: {
    flex: 1,
    minWidth: 240,
    backgroundColor: colors.bgPage,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault
  },
  uploadSlotTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary
  },
  uploadSlotDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8
  },
  uploadSlotBtn: {
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.brandPrimary,
    borderRadius: borderRadius.sm,
    paddingVertical: 8,
    alignItems: 'center'
  },
  uploadSlotBtnActive: {
    backgroundColor: '#DCFCE7',
    borderColor: colors.statusSuccess
  },
  uploadSlotBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brandPrimary
  },
  reviewSummarySection: {
    backgroundColor: colors.bgPage,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginBottom: spacing.lg
  },
  reviewBlock: {
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault
  },
  reviewBlockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  reviewBlockTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brandDark
  },
  editLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brandPrimary
  },
  reviewItem: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18
  },
  declarationRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FCD34D',
    marginBottom: spacing.lg
  },
  declarationText: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
    flex: 1
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
    zIndex: 999
  },
  confirmModalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.modal
  },
  confirmBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md
  },
  confirmBadgeIcon: {
    fontSize: 32
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.brandDark,
    textAlign: 'center'
  },
  confirmSub: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20
  },
  confirmDetailsBox: {
    width: '100%',
    backgroundColor: colors.bgPage,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginVertical: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderDefault
  },
  confirmAppNoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase'
  },
  confirmAppNoValue: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.brandPrimary,
    marginTop: 2
  },
  confirmDispatchNote: {
    fontSize: 12,
    color: colors.brandDark,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 18
  },
  confirmActionRow: {
    width: '100%',
    gap: 10
  },
  confirmPrimaryBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    alignItems: 'center'
  },
  confirmPrimaryText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700'
  },
  confirmSecondaryBtn: {
    backgroundColor: colors.bgPage,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center'
  },
  confirmSecondaryText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600'
  },
  selectWrapper: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgSurface,
    overflow: 'hidden'
  },
  datePickerWrapper: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgSurface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  datePickerIcon: {
    fontSize: 16
  },
  fieldHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4
  },
  nurserySkipCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg
  },
  nurserySkipCardActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6'
  },
  nurserySkipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12
  },
  nurserySkipTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary
  },
  nurserySkipSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4
  },
  nurseryToggleBtn: {
    borderWidth: 1.5,
    borderColor: colors.brandPrimary,
    borderRadius: borderRadius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.bgSurface
  },
  nurseryToggleBtnActive: {
    backgroundColor: colors.brandPrimary
  },
  nurseryToggleBtnText: {
    color: colors.brandPrimary,
    fontWeight: '700',
    fontSize: 13
  },
  nurseryToggleBtnTextActive: {
    color: colors.textInverse
  },
  nurserySkipActionRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10
  },
  nurserySkipBadge: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '600'
  },
  nurserySkipNextBtn: {
    backgroundColor: colors.brandPrimary,
    borderRadius: borderRadius.md,
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  nurserySkipNextBtnText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 13
  }
});
