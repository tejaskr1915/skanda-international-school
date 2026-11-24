import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, borderRadius, spacing, shadows } from '../theme/theme';
import { PublicHeader } from '../components/PublicHeader';
import { PublicFooter } from '../components/PublicFooter';
import { LoginModal } from '../components/LoginModal';
import { StatusModal } from '../components/StatusModal';

export const ApplyLandingScreen: React.FC = () => {
  const { navigateTo } = useAuth();
  const [loginVisible, setLoginVisible] = useState(false);
  const [statusVisible, setStatusVisible] = useState(false);

  return (
    <View style={styles.container}>
      <PublicHeader onOpenLogin={() => setLoginVisible(true)} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.contentWrapper}>
          {/* Top Bar with Back Button & Session Badge */}
          <View style={styles.topNavRow}>
            <TouchableOpacity
              style={styles.backHomeBtn}
              onPress={() => navigateTo('/')}
              activeOpacity={0.88}
            >
              <Text style={styles.backHomeBtnText}>← Back to Home</Text>
            </TouchableOpacity>

            <View style={styles.sessionPill}>
              <Text style={styles.sessionText}>Active Session: 2026–2027</Text>
            </View>
          </View>

          {/* Main Title & Top CTA Header */}
          <View style={styles.titleRow}>
            <View style={styles.titleCol}>
              <Text style={styles.pageTitle}>Admissions 2026–2027</Text>
              <Text style={styles.pageSubtitle}>
                Begin your journey with Skanda International School. Complete your application online in simple steps.
              </Text>
            </View>

            {/* Prominent Primary CTA placed in Top Header */}
            <TouchableOpacity
              style={styles.primaryActionBtnTop}
              onPress={() => navigateTo('/apply/step/1')}
              activeOpacity={0.88}
            >
              <Text style={styles.primaryActionText}>Start New Application ➜ Verify</Text>
            </TouchableOpacity>
          </View>

          {/* CARD 1: Intro, dates, eligibility, documents checklist */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderIcon}>📋</Text>
              <Text style={styles.cardTitle}>Admission Guidelines & Overview</Text>
            </View>

            <View style={styles.guidelinesGrid}>
              {/* Important Dates */}
              <View style={styles.guideBox}>
                <Text style={styles.guideBoxTitle}>📅 Important Dates</Text>
                <Text style={styles.guideItem}>• Application Opening: 1st October 2025</Text>
                <Text style={styles.guideItem}>• Early Decision Cut-off: 15th January 2026</Text>
                <Text style={styles.guideItem}>• Regular Phase 1 Deadline: 31st March 2026</Text>
                <Text style={styles.guideItem}>• Session Commencement: 1st June 2026</Text>
              </View>

              {/* Eligibility Criteria */}
              <View style={styles.guideBox}>
                <Text style={styles.guideBoxTitle}>🎯 Age & Eligibility</Text>
                <Text style={styles.guideItem}>• Nursery: 3+ years as of 1st June 2026</Text>
                <Text style={styles.guideItem}>• Grade 1: 6+ years completed</Text>
                <Text style={styles.guideItem}>• Grades 2–10: Valid previous marksheet & TC</Text>
                <Text style={styles.guideItem}>• Grades 11–12: 10th Board minimum 60% in STEM/Arts</Text>
              </View>

              {/* Documents Checklist */}
              <View style={styles.guideBox}>
                <Text style={styles.guideBoxTitle}>📑 Required Documents</Text>
                <Text style={styles.guideItem}>• Recent Passport-size student photo (JPG/PNG)</Text>
                <Text style={styles.guideItem}>• Government ID Proof (Aadhaar / Passport / Birth Cert)</Text>
                <Text style={styles.guideItem}>• Previous School Marksheet / Progress Card</Text>
                <Text style={styles.guideItem}>• Original Transfer Certificate (TC) & Parent ID</Text>
              </View>
            </View>
          </View>

          {/* CARD 2: Fee Summary */}
          <View style={styles.infoCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardHeaderIcon}>💳</Text>
              <Text style={styles.cardTitle}>Fee Summary & Payment Installments</Text>
            </View>

            <View style={styles.feeGrid}>
              <View style={styles.feeBox}>
                <Text style={styles.feeBoard}>CBSE Affiliated</Text>
                <Text style={styles.feeAmount}>₹85,000 <Text style={styles.feePer}>/ year</Text></Text>
                <Text style={styles.feeDesc}>Classes Nursery to Grade 12. Paid in 3 quarterly terms or single advance with 5% discount.</Text>
              </View>

              <View style={styles.feeBox}>
                <Text style={styles.feeBoard}>ICSE / ISC Affiliated</Text>
                <Text style={styles.feeAmount}>₹1,10,000 <Text style={styles.feePer}>/ year</Text></Text>
                <Text style={styles.feeDesc}>Classes 1 to 12. Includes laboratory charges, council registration and activities.</Text>
              </View>

              <View style={styles.feeBox}>
                <Text style={styles.feeBoard}>State Board</Text>
                <Text style={styles.feeAmount}>₹48,000 <Text style={styles.feePer}>/ year</Text></Text>
                <Text style={styles.feeDesc}>Subsidized state curricula with textbooks and digital learning kits included.</Text>
              </View>
            </View>

            <View style={styles.feeNoteBox}>
              <Text style={styles.feeNoteText}>
                💡 Note: Application processing registration is 100% free of charge. Optional amenities (Hostel, Transport, Library) are calculated during Step 8.
              </Text>
            </View>
          </View>

          {/* TWO ACTION BUTTONS BELOW FEE SUMMARY */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() => setLoginVisible(true)}
              activeOpacity={0.88}
            >
              <Text style={styles.secondaryActionText}>👤 Continue Saved Application ➜ Resume</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={() => setStatusVisible(true)}
              activeOpacity={0.88}
            >
              <Text style={styles.secondaryActionText}>🔍 Check Status ➜ Status</Text>
            </TouchableOpacity>
          </View>
        </View>

        <PublicFooter />
      </ScrollView>

      {/* Modals */}
      <LoginModal visible={loginVisible} onClose={() => setLoginVisible(false)} />
      <StatusModal
        visible={statusVisible}
        onClose={() => setStatusVisible(false)}
        onOpenLogin={() => {
          setStatusVisible(false);
          setLoginVisible(true);
        }}
      />
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
  contentWrapper: {
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl
  },
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.md
  },
  backHomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    ...shadows.card
  },
  backHomeBtnText: {
    color: '#0F172A',
    fontSize: 13,
    fontWeight: '600'
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: 12
  },
  titleCol: {
    flex: 1,
    minWidth: 280
  },
  primaryActionBtnTop: {
    backgroundColor: '#1D4ED8',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5
  },
  pageSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4
  },
  sessionPill: {
    backgroundColor: colors.brandLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  sessionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brandPrimary
  },
  infoCard: {
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.card
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    paddingBottom: spacing.sm
  },
  cardHeaderIcon: {
    fontSize: 22
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.brandDark
  },
  guidelinesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  guideBox: {
    flex: 1,
    minWidth: 260,
    backgroundColor: colors.bgPage,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault
  },
  guideBoxTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brandPrimary,
    marginBottom: 8
  },
  guideItem: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 20
  },
  feeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  feeBox: {
    flex: 1,
    minWidth: 240,
    backgroundColor: colors.bgPage,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault
  },
  feeBoard: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary
  },
  feeAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.brandPrimary,
    marginVertical: 4
  },
  feePer: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary
  },
  feeDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16
  },
  feeNoteBox: {
    backgroundColor: colors.brandLight,
    padding: 12,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  feeNoteText: {
    fontSize: 12,
    color: colors.brandDark,
    lineHeight: 18
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: spacing.sm
  },
  primaryActionBtn: {
    flex: 1.2,
    minWidth: 260,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.hover
  },
  primaryActionText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700'
  },
  secondaryActionBtn: {
    flex: 1,
    minWidth: 220,
    backgroundColor: colors.bgSurface,
    borderWidth: 1.5,
    borderColor: colors.borderDefault,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  secondaryActionText: {
    color: colors.brandPrimary,
    fontSize: 13,
    fontWeight: '700'
  }
});
