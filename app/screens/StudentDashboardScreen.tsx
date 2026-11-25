import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { colors, borderRadius, spacing, shadows } from '../theme/theme';
import { StudentHeader } from '../components/StudentHeader';
import { StudentFooter } from '../components/StudentFooter';
import { generateApplicationPdf } from '../utils/pdfGenerator';

interface StudentDashboardProps {
  lockNotice?: string;
}

export const StudentDashboardScreen: React.FC<StudentDashboardProps> = ({ lockNotice }) => {
  const { user, application, navigateTo } = useAuth();
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [pdfDownloading, setPdfDownloading] = useState(false);

  const studentName = application?.studentDetails?.fullName || user?.fullName || 'Student Applicant';
  const appNo = application?.applicationNo || 'SIS-2026-0001';
  const status = application?.status || 'SUBMITTED';

  // RBAC Gating: Full student sidebar unlocked ONLY when status === 'ACCEPTED' or 'ENROLLED'
  const isEnrolled = status === 'ACCEPTED' || status === 'ENROLLED';

  const sidebarLinks = isEnrolled
    ? [
        { id: 'Dashboard', icon: '🏠', label: 'Dashboard' },
        { id: 'Attendance', icon: '📅', label: 'Attendance' },
        { id: 'Timetable', icon: '🕒', label: 'Timetable' },
        { id: 'Homework', icon: '📝', label: 'Homework' },
        { id: 'Exams', icon: '📊', label: 'Exams & Results' },
        { id: 'Study', icon: '📖', label: 'Study Material' },
        { id: 'Notices', icon: '📢', label: 'Notices' },
        { id: 'Documents', icon: '📑', label: 'Documents' },
        { id: 'Profile', icon: '👤', label: 'My Profile' }
      ]
    : [
        { id: 'Dashboard', icon: '🏠', label: 'Application Summary' },
        { id: 'Documents', icon: '📑', label: 'Uploaded Documents' },
        { id: 'Profile', icon: '👤', label: 'My Profile' }
      ];

  const trackerSteps = [
    { title: 'Submitted', done: true, current: status === 'SUBMITTED', date: application?.submittedAt ? new Date(application.submittedAt).toLocaleDateString() : 'Today' },
    { title: 'Under Review', done: ['UNDER_REVIEW', 'ACCEPTED', 'SHORTLISTED', 'ENROLLED'].includes(status), current: status === 'UNDER_REVIEW', date: 'In Progress' },
    { title: 'Shortlisted', done: ['ACCEPTED', 'SHORTLISTED', 'ENROLLED'].includes(status), current: status === 'SHORTLISTED', date: 'Expected 3-5 days' },
    { title: 'Accepted & Enrolled', done: isEnrolled, current: isEnrolled, date: isEnrolled ? 'Enrolled' : 'Final Decision' }
  ];

  const handleDownloadPdf = () => {
    if (!application) {
      Alert.alert('Error', 'No application data found to download.');
      return;
    }
    setPdfDownloading(true);
    try {
      generateApplicationPdf(application);
    } catch (e: any) {
      console.warn('Client PDF generation error, trying fallback:', e);
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.open(`${api.getBaseUrl()}/applications/${appNo}/pdf`, '_blank');
      }
    } finally {
      setPdfDownloading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StudentHeader />

      <View style={styles.layoutBody}>
        {/* SIDEBAR NAVIGATION (Desktop) */}
        <View style={styles.sidebar}>
          <View style={styles.sidebarBrand}>
            <Text style={styles.sidebarBrandTitle}>Portal Navigation</Text>
            <View style={[styles.statusBadgeSm, { backgroundColor: isEnrolled ? colors.statusSuccessBg : colors.brandLight }]}>
              <Text style={[styles.statusBadgeSmText, { color: isEnrolled ? colors.statusSuccess : colors.brandPrimary }]}>
                {status}
              </Text>
            </View>
          </View>

          {sidebarLinks.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                testID={`sidebar-${item.id.toLowerCase()}`}
                style={[styles.sidebarItem, isActive && styles.sidebarItemActive]}
                onPress={() => setActiveTab(item.id)}
              >
                <Text style={styles.sidebarIcon}>{item.icon}</Text>
                <Text style={[styles.sidebarText, isActive && styles.sidebarTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* Locked Notice for Pre-Enrollment Applicants */}
          {!isEnrolled && (
            <View style={styles.sidebarLockCard}>
              <Text style={styles.lockIcon}>🔒</Text>
              <Text style={styles.lockTitle}>Post-Enrollment Portal</Text>
              <Text style={styles.lockDesc}>
                Attendance, Timetable, Homework, and Exams modules will activate upon admission acceptance and fee clearance.
              </Text>
            </View>
          )}
        </View>

        {/* MAIN DASHBOARD CONTENT */}
        <ScrollView style={styles.mainScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.contentCanvas}>
            {/* READ-ONLY LOCKED NOTICE */}
            {(lockNotice || (application && application.status !== 'DRAFT')) && (
              <View style={styles.lockNoticeBanner}>
                <Text style={styles.lockNoticeIcon}>🔒</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lockNoticeTitle}>Application Locked for Review</Text>
                  <Text style={styles.lockNoticeText}>
                    {lockNotice || 'Your application has already been submitted and locked for review.'}
                  </Text>
                </View>
              </View>
            )}

            {/* TOP NOTICE: SUBMITTED CONFIRMATION BANNER */}
            <View style={styles.statusBanner}>
              <View style={styles.statusLeft}>
                <View style={styles.successDot}>
                  <Text style={styles.successDotText}>✓</Text>
                </View>
                <View>
                  <Text style={styles.statusTitle}>Official Application File: {appNo}</Text>
                  <Text style={styles.statusSubtitle}>
                    Status: <Text style={styles.statusHighlight}>{status}</Text> • Academic Session 2026–2027
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                testID="download-pdf-btn"
                style={styles.downloadPdfBtn}
                onPress={handleDownloadPdf}
                activeOpacity={0.85}
              >
                <Text style={styles.downloadPdfText}>
                  {pdfDownloading ? '⏳ Generating PDF...' : '📥 Download Application PDF'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* LIVE APPLICATION STATUS TRACKER */}
            <View style={styles.cardSection}>
              <Text style={styles.cardSectionTitle}>Application Lifecycle Tracker</Text>
              <View style={styles.trackerRow}>
                {trackerSteps.map((step, idx) => (
                  <View key={idx} style={styles.trackerNode}>
                    <View
                      style={[
                        styles.trackerCircle,
                        step.done && styles.trackerCircleDone,
                        step.current && styles.trackerCircleCurrent
                      ]}
                    >
                      <Text style={[styles.trackerCircleText, step.done && styles.trackerCircleTextDone]}>
                        {step.done ? '✓' : idx + 1}
                      </Text>
                    </View>
                    <Text style={[styles.trackerStepTitle, step.done && styles.trackerStepTitleDone]}>
                      {step.title}
                    </Text>
                    <Text style={styles.trackerDate}>{step.date}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* STUDENT PROFILE CARD */}
            {(activeTab === 'Dashboard' || activeTab === 'Profile') && (
              <View style={styles.profileHeroCard}>
                <View style={styles.profileAvatarBox}>
                  <Text style={styles.profileAvatarIcon}>🎓</Text>
                </View>
                <View style={styles.profileDetailsCol}>
                  <View style={styles.profileBadgeRow}>
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedText}>✓ Mobile Verified Applicant</Text>
                    </View>
                    <View style={styles.classBadge}>
                      <Text style={styles.classBadgeText}>{application?.classOrCourse || 'Grade 6'}</Text>
                    </View>
                  </View>
                  <Text style={styles.profileName}>{studentName}</Text>
                  <Text style={styles.profileMeta}>
                    Student ID: {appNo} • Board: {application?.board || 'CBSE'} • Mode: {application?.mode || 'Day Scholar'}
                  </Text>
                  <Text style={styles.profileContact}>
                    📱 +91 {user?.mobile} • ✉️ {user?.email}
                  </Text>
                </View>
              </View>
            )}

            {/* ORGANIZED APPLICATION SUMMARY CARDS */}
            <View style={styles.cardsGrid}>
              {/* Card 1: Programme & Board */}
              {(activeTab === 'Dashboard') && (
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <Text style={styles.summaryCardTitle}>🏫 Programme & Board</Text>
                  </View>
                  <View style={styles.summaryCardBody}>
                    <Text style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Institution Type: </Text>
                      {application?.institutionType || 'SCHOOL'}
                    </Text>
                    <Text style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Admitted Class: </Text>
                      {application?.classOrCourse || 'Grade 6'}
                    </Text>
                    <Text style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Board: </Text>
                      {application?.board?.replace('_', ' / ') || 'CBSE'}
                    </Text>
                    <Text style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Academic Year: </Text>
                      {application?.academicYear || '2026-2027'}
                    </Text>
                    <Text style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Attendance Mode: </Text>
                      {application?.mode || 'Day Scholar'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Card 2: Selected Subjects */}
              {(activeTab === 'Dashboard') && (
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <Text style={styles.summaryCardTitle}>📚 Selected Subjects & Languages</Text>
                  </View>
                  <View style={styles.summaryCardBody}>
                    <Text style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Core Curriculum: </Text>
                      English, Mathematics, Science, Social Studies, ICT
                    </Text>
                    <Text style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Language Choice: </Text>
                      {application?.selectedSubjects?.secondLanguage || 'Hindi Course-A'}
                    </Text>
                    <Text style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Syllabus Aligned: </Text>
                      NCERT & Council Standard 2026
                    </Text>
                  </View>
                </View>
              )}

              {/* Card 3: Personal & Demographic Details */}
              {(activeTab === 'Dashboard' || activeTab === 'Profile') && (
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <Text style={styles.summaryCardTitle}>👤 Personal Details</Text>
                  </View>
                  <View style={styles.summaryCardBody}>
                    <Text style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Full Name: </Text>
                      {studentName}
                    </Text>
                    <Text style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Date of Birth: </Text>
                      {application?.studentDetails?.dob || '2014-04-15'}
                    </Text>
                    <Text style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Gender: </Text>
                      {application?.studentDetails?.gender || 'Male'} • Blood Group: {application?.studentDetails?.bloodGroup || 'O+'}
                    </Text>
                    <Text style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Nationality: </Text>
                      {application?.studentDetails?.nationality || 'Indian'}
                    </Text>
                    <Text style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Residential Address: </Text>
                      {application?.studentDetails?.address?.street || 'Bengaluru, Karnataka'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Card 4: Parent / Guardian Details */}
              {(activeTab === 'Dashboard' || activeTab === 'Profile') && (
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <Text style={styles.summaryCardTitle}>👨‍👩‍👦 Parent / Guardian Details</Text>
                  </View>
                  <View style={styles.summaryCardBody}>
                    <Text style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Father Name: </Text>
                      {application?.parentDetails?.fatherName || 'Not specified'} ({application?.parentDetails?.fatherOccupation || 'Professional'})
                    </Text>
                    <Text style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Mother Name: </Text>
                      {application?.parentDetails?.motherName || 'Not specified'} ({application?.parentDetails?.motherOccupation || 'Professional'})
                    </Text>
                    <Text style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Emergency Mobile: </Text>
                      +91 {application?.parentDetails?.mobile || user?.mobile}
                    </Text>
                    <Text style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Parent Email: </Text>
                      {application?.parentDetails?.email || user?.email}
                    </Text>
                  </View>
                </View>
              )}

              {/* Card 5: Opted Campus Facilities */}
              {(activeTab === 'Dashboard') && (
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <Text style={styles.summaryCardTitle}>🏨 Opted Campus Facilities</Text>
                  </View>
                  <View style={styles.summaryCardBody}>
                    <Text style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Hostel Accommodation: </Text>
                      {application?.facilities?.hostel?.opted
                        ? `Opted (${application.facilities.hostel.roomType})`
                        : 'Not Opted'}
                    </Text>
                    <Text style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>School Transport: </Text>
                      {application?.facilities?.transport?.opted
                        ? `Opted (Pickup: ${application.facilities.transport.pickupArea})`
                        : 'Not Opted'}
                    </Text>
                    <Text style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Library Membership: </Text>
                      {application?.facilities?.library !== false ? 'Active & Included' : 'No'}
                    </Text>
                  </View>
                </View>
              )}

              {/* Card 6: Uploaded Documents */}
              {(activeTab === 'Dashboard' || activeTab === 'Documents') && (
                <View style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <Text style={styles.summaryCardTitle}>📑 Uploaded Documents</Text>
                  </View>
                  <View style={styles.summaryCardBody}>
                    <Text style={styles.summaryRow}>• Student Photo: ✓ Verified Upload</Text>
                    <Text style={styles.summaryRow}>• Government ID Proof: ✓ Aadhaar Certificate Attached</Text>
                    <Text style={styles.summaryRow}>• Previous Marksheet: ✓ Progress Card Attached</Text>
                    <Text style={styles.summaryRow}>• Transfer Certificate: ✓ School TC Verified</Text>
                  </View>
                </View>
              )}
            </View>

            {/* UPCOMING DEADLINES / NEXT STEPS */}
            <View style={styles.deadlinesCard}>
              <Text style={styles.cardSectionTitle}>Upcoming Admissions Milestones</Text>
              <View style={styles.deadlinesGrid}>
                <View style={styles.deadlineItem}>
                  <View style={styles.deadlineIconBox}>
                    <Text style={styles.deadlineIcon}>📅</Text>
                  </View>
                  <View>
                    <Text style={styles.deadlineTitle}>Document Verification</Text>
                    <Text style={styles.deadlineDate}>Scheduled: 15–20 Dec 2026</Text>
                  </View>
                </View>

                <View style={styles.deadlineItem}>
                  <View style={styles.deadlineIconBox}>
                    <Text style={styles.deadlineIcon}>💳</Text>
                  </View>
                  <View>
                    <Text style={styles.deadlineTitle}>Next Fee Payment</Text>
                    <Text style={styles.deadlineDate}>Term 1 Due: 10 Jan 2027</Text>
                  </View>
                </View>

                <View style={styles.deadlineItem}>
                  <View style={styles.deadlineIconBox}>
                    <Text style={styles.deadlineIcon}>🏫</Text>
                  </View>
                  <View>
                    <Text style={styles.deadlineTitle}>Student Orientation Day</Text>
                    <Text style={styles.deadlineDate}>Campus Welcome: 25 May 2027</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          <StudentFooter />
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage
  },
  layoutBody: {
    flex: 1,
    flexDirection: 'row'
  },
  sidebar: {
    width: 250,
    backgroundColor: colors.bgSurface,
    borderRightWidth: 1,
    borderRightColor: colors.borderDefault,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    display: Platform.OS === 'web' ? ('flex' as any) : 'none'
  },
  sidebarBrand: {
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sidebarBrandTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  statusBadgeSm: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm
  },
  statusBadgeSmText: {
    fontSize: 10,
    fontWeight: '800'
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    marginBottom: 4,
    gap: 12
  },
  sidebarItemActive: {
    backgroundColor: colors.brandLight
  },
  sidebarIcon: {
    fontSize: 16
  },
  sidebarText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary
  },
  sidebarTextActive: {
    color: colors.brandPrimary,
    fontWeight: '800'
  },
  sidebarLockCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderDefault
  },
  lockIcon: {
    fontSize: 16,
    marginBottom: 4
  },
  lockTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brandDark,
    marginBottom: 4
  },
  lockDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16
  },
  mainScroll: {
    flex: 1
  },
  contentCanvas: {
    maxWidth: 1060,
    width: '100%',
    alignSelf: 'center',
    padding: spacing.lg
  },
  statusBanner: {
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: 12,
    ...shadows.card
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  successDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center'
  },
  successDotText: {
    color: colors.statusSuccess,
    fontSize: 16,
    fontWeight: '900'
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.brandDark
  },
  statusSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  statusHighlight: {
    color: colors.statusSuccess,
    fontWeight: '800'
  },
  downloadPdfBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: borderRadius.md,
    ...shadows.hover
  },
  downloadPdfText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '700'
  },
  cardSection: {
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginBottom: spacing.lg,
    ...shadows.card
  },
  cardSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.brandDark,
    marginBottom: spacing.md
  },
  trackerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  trackerNode: {
    flex: 1,
    alignItems: 'center'
  },
  trackerCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  },
  trackerCircleDone: {
    backgroundColor: colors.brandPrimary
  },
  trackerCircleCurrent: {
    borderWidth: 3,
    borderColor: '#93C5FD'
  },
  trackerCircleText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary
  },
  trackerCircleTextDone: {
    color: colors.textInverse
  },
  trackerStepTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center'
  },
  trackerStepTitleDone: {
    color: colors.brandDark,
    fontWeight: '700'
  },
  trackerDate: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2
  },
  profileHeroCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 20,
    marginBottom: spacing.lg,
    ...shadows.card
  },
  profileAvatarBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#BFDBFE'
  },
  profileAvatarIcon: {
    fontSize: 40
  },
  profileDetailsCol: {
    flex: 1,
    minWidth: 260
  },
  profileBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6
  },
  verifiedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.statusSuccess
  },
  classBadge: {
    backgroundColor: colors.brandLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm
  },
  classBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brandPrimary
  },
  profileName: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.textPrimary
  },
  profileMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2
  },
  profileContact: {
    fontSize: 12,
    color: colors.brandPrimary,
    fontWeight: '600',
    marginTop: 4
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: spacing.lg
  },
  summaryCard: {
    flex: 1,
    minWidth: 300,
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
    ...shadows.card
  },
  summaryCardHeader: {
    backgroundColor: colors.bgPage,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault
  },
  summaryCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brandDark
  },
  summaryCardBody: {
    padding: spacing.md
  },
  summaryRow: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 4
  },
  summaryLabel: {
    fontWeight: '700',
    color: colors.textPrimary
  },
  deadlinesCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    ...shadows.card
  },
  deadlinesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  deadlineItem: {
    flex: 1,
    minWidth: 200,
    backgroundColor: colors.bgPage,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.borderDefault
  },
  deadlineIconBox: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center'
  },
  deadlineIcon: {
    fontSize: 18
  },
  deadlineTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary
  },
  deadlineDate: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2
  },
  lockNoticeBanner: {
    backgroundColor: '#EFF6FF',
    borderColor: '#3B82F6',
    borderWidth: 1.5,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.md
  },
  lockNoticeIcon: {
    fontSize: 22
  },
  lockNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D4ED8'
  },
  lockNoticeText: {
    fontSize: 13,
    color: '#1E3A8A',
    marginTop: 2
  }
});
