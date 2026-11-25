import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { colors, borderRadius, spacing } from '../theme/theme';

interface StepperProps {
  currentStep: number;
  onSelectStep?: (step: number) => void;
  maxUnlockedStep?: number;
  institutionType?: 'SCHOOL' | 'COLLEGE';
}

const getSubStepMetadata = (institutionType: 'SCHOOL' | 'COLLEGE' = 'SCHOOL'): Record<number, { step: number; label: string; short: string }> => ({
  1: { step: 1, label: 'Verify Account & Mobile', short: 'Step 1: Account Verification' },
  2: { step: 2, label: 'Programme & Class Selection', short: 'Step 2: Programme & Class' },
  3: institutionType === 'COLLEGE'
    ? { step: 3, label: 'Department Selection', short: 'Step 3: College Department' }
    : { step: 3, label: 'Affiliated Board Selection', short: 'Step 3: Board Selection' },
  4: institutionType === 'COLLEGE'
    ? { step: 4, label: 'Course & Electives', short: 'Step 4: Course & Electives' }
    : { step: 4, label: 'Curriculum & Subjects', short: 'Step 4: Curriculum & Subjects' },
  5: { step: 5, label: 'Student Personal Details', short: 'Step 5: Student Personal Details' },
  6: { step: 6, label: 'Parent & Guardian Information', short: 'Step 6: Parent / Guardian Details' },
  7: { step: 7, label: 'Previous Education', short: 'Step 7: Previous Education' },
  8: { step: 8, label: 'Campus Facilities', short: 'Step 8: Facilities' },
  9: { step: 9, label: 'Documents & Final Submit', short: 'Step 9: Documents & Review' }
});

export const AdmissionStepper: React.FC<StepperProps> = ({
  currentStep,
  onSelectStep,
  maxUnlockedStep = 9,
  institutionType = 'SCHOOL'
}) => {
  const SUB_STEP_METADATA = getSubStepMetadata(institutionType);

  // 5 Global Stages matching UX spec
  const phases = [
    { id: 1, title: 'Verify', subSteps: [1] },
    { id: 2, title: institutionType === 'COLLEGE' ? 'Programme & Department' : 'Programme & Board', subSteps: [2, 3, 4] },
    { id: 3, title: 'Details', subSteps: [5, 6, 7] },
    { id: 4, title: 'Facilities & Documents', subSteps: [8, 9] },
    { id: 5, title: 'Review & Submit', subSteps: [9] }
  ];

  const getPhaseStatus = (phaseId: number) => {
    if (phaseId === 1) {
      if (currentStep === 1) return { isCurrent: true, isPassed: false, fill: 100 };
      return { isCurrent: false, isPassed: true, fill: 100 };
    }
    if (phaseId === 2) {
      if (currentStep < 2) return { isCurrent: false, isPassed: false, fill: 0 };
      if (currentStep === 2) return { isCurrent: true, isPassed: false, fill: 33.33 };
      if (currentStep === 3) return { isCurrent: true, isPassed: false, fill: 66.66 };
      if (currentStep === 4) return { isCurrent: true, isPassed: false, fill: 100 };
      return { isCurrent: false, isPassed: true, fill: 100 };
    }
    if (phaseId === 3) {
      if (currentStep < 5) return { isCurrent: false, isPassed: false, fill: 0 };
      if (currentStep === 5) return { isCurrent: true, isPassed: false, fill: 33.33 };
      if (currentStep === 6) return { isCurrent: true, isPassed: false, fill: 66.66 };
      if (currentStep === 7) return { isCurrent: true, isPassed: false, fill: 100 };
      return { isCurrent: false, isPassed: true, fill: 100 };
    }
    if (phaseId === 4) {
      if (currentStep < 8) return { isCurrent: false, isPassed: false, fill: 0 };
      if (currentStep === 8) return { isCurrent: true, isPassed: false, fill: 50 };
      return { isCurrent: false, isPassed: true, fill: 100 };
    }
    // phaseId === 5
    if (currentStep < 9) return { isCurrent: false, isPassed: false, fill: 0 };
    return { isCurrent: true, isPassed: false, fill: 100 };
  };

  // Determine active stage and its sub-steps
  const activeStageId =
    currentStep === 1 ? 1 : currentStep <= 4 ? 2 : currentStep <= 7 ? 3 : currentStep === 8 ? 4 : 5;
  const activeSubSteps =
    activeStageId === 1 ? [1] : activeStageId === 2 ? [2, 3, 4] : activeStageId === 3 ? [5, 6, 7] : [8, 9];

  return (
    <View style={styles.stepperContainer}>
      {/* 5-Phase Horizontal Tabs */}
      <View style={styles.phasesRow}>
        {phases.map((phase) => {
          const status = getPhaseStatus(phase.id);
          const firstSubStep = phase.subSteps[0];
          const canClick = onSelectStep && firstSubStep <= maxUnlockedStep;

          return (
            <TouchableOpacity
              key={phase.id}
              style={[
                styles.phaseTab,
                status.isCurrent && styles.phaseTabActive,
                status.isPassed && styles.phaseTabPassed
              ]}
              disabled={!canClick}
              onPress={() => onSelectStep && onSelectStep(firstSubStep)}
              activeOpacity={0.8}
            >
              <View style={styles.phaseIndicatorRow}>
                <View
                  style={[
                    styles.phaseBadge,
                    status.isCurrent && styles.phaseBadgeActive,
                    status.isPassed && styles.phaseBadgePassed
                  ]}
                >
                  <Text
                    style={[
                      styles.phaseBadgeText,
                      status.isCurrent && styles.phaseBadgeTextActive,
                      status.isPassed && styles.phaseBadgeTextPassed
                    ]}
                  >
                    {status.isPassed ? '✓' : phase.id}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.phaseTitle,
                    status.isCurrent && styles.phaseTitleActive,
                    status.isPassed && styles.phaseTitlePassed
                  ]}
                  numberOfLines={1}
                >
                  {phase.title}
                </Text>
              </View>

              {/* Proportional Tube Progress Track and Fill */}
              <View style={styles.tubeTrack}>
                <View
                  style={[
                    styles.tubeFill,
                    {
                      width: `${status.fill}%`,
                      backgroundColor: status.isPassed
                        ? colors.statusSuccess
                        : status.isCurrent
                        ? colors.brandPrimary
                        : 'transparent'
                    }
                  ]}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Sub-Step Navigation Bar Below the 5 Cards */}
      <View style={styles.subStepNavBar}>
        <View style={styles.subStepPillsRow}>
          {activeSubSteps.map((stepNum, idx) => {
            const isCompleted = stepNum < currentStep;
            const isActive = stepNum === currentStep;
            const isUpcoming = stepNum > currentStep;
            const meta = SUB_STEP_METADATA[stepNum];
            const canClick = onSelectStep && stepNum <= maxUnlockedStep;

            return (
              <React.Fragment key={stepNum}>
                {idx > 0 && <Text style={styles.subStepArrow}>➜</Text>}
                <TouchableOpacity
                  style={[
                    styles.subStepPill,
                    isActive && styles.subStepPillActive,
                    isCompleted && styles.subStepPillCompleted,
                    isUpcoming && styles.subStepPillUpcoming
                  ]}
                  disabled={!canClick}
                  onPress={() => onSelectStep && onSelectStep(stepNum)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.subStepPillIcon,
                      isActive && styles.subStepPillIconActive,
                      isCompleted && styles.subStepPillIconCompleted,
                      isUpcoming && styles.subStepPillIconUpcoming
                    ]}
                  >
                    {isCompleted ? '✓' : isActive ? '●' : '○'}
                  </Text>
                  <Text
                    style={[
                      styles.subStepPillText,
                      isActive && styles.subStepPillTextActive,
                      isCompleted && styles.subStepPillTextCompleted,
                      isUpcoming && styles.subStepPillTextUpcoming
                    ]}
                  >
                    {meta.short}
                  </Text>
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>

        {/* Substep breadcrumb info label */}
        <View style={styles.substepLabelRow}>
          <Text style={styles.substepInfo}>
            Step {currentStep} of 9:{' '}
            <Text style={styles.substepHighlight}>{getStepTitle(currentStep)}</Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

function getStepTitle(step: number): string {
  switch (step) {
    case 1:
      return 'Verify Account & Mobile';
    case 2:
      return 'Programme & Class Selection';
    case 3:
      return 'Affiliated Board Selection (CBSE / ICSE / State)';
    case 4:
      return 'Curriculum, Subjects & Syllabus';
    case 5:
      return 'Student Personal Details';
    case 6:
      return 'Parent & Guardian Information';
    case 7:
      return 'Previous Education & Academic Record';
    case 8:
      return 'Campus Facilities (Hostel, Transport, Library)';
    case 9:
      return 'Documents Upload, Review Summary & Final Submit';
    default:
      return 'Admission Details';
  }
}

const styles = StyleSheet.create({
  stepperContainer: {
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    marginBottom: spacing.lg
  },
  phasesRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    flexWrap: Platform.OS === 'web' ? 'nowrap' : 'wrap'
  },
  phaseTab: {
    flex: 1,
    minWidth: 130,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: borderRadius.md,
    backgroundColor: '#F8FAFC'
  },
  phaseTabActive: {
    backgroundColor: '#EFF6FF'
  },
  phaseTabPassed: {
    backgroundColor: '#F0FDF4'
  },
  phaseIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8
  },
  phaseBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  phaseBadgeActive: {
    backgroundColor: colors.brandPrimary
  },
  phaseBadgePassed: {
    backgroundColor: colors.statusSuccess
  },
  phaseBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary
  },
  phaseBadgeTextActive: {
    color: colors.textInverse
  },
  phaseBadgeTextPassed: {
    color: colors.textInverse
  },
  phaseTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    flex: 1
  },
  phaseTitleActive: {
    color: colors.brandPrimary,
    fontWeight: '800'
  },
  phaseTitlePassed: {
    color: colors.statusSuccess,
    fontWeight: '700'
  },
  tubeTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
    width: '100%'
  },
  tubeFill: {
    height: '100%',
    borderRadius: 3
  },
  subStepNavBar: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    gap: 10
  },
  subStepPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8
  },
  subStepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    gap: 6
  },
  subStepPillActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary
  },
  subStepPillCompleted: {
    backgroundColor: '#DCFCE7',
    borderColor: '#86EFAC'
  },
  subStepPillUpcoming: {
    backgroundColor: '#F1F5F9',
    borderColor: '#E2E8F0'
  },
  subStepPillIcon: {
    fontSize: 11
  },
  subStepPillIconActive: {
    color: colors.textInverse
  },
  subStepPillIconCompleted: {
    color: colors.statusSuccess,
    fontWeight: '700'
  },
  subStepPillIconUpcoming: {
    color: colors.textSecondary
  },
  subStepPillText: {
    fontSize: 12,
    fontWeight: '600'
  },
  subStepPillTextActive: {
    color: colors.textInverse,
    fontWeight: '700'
  },
  subStepPillTextCompleted: {
    color: colors.statusSuccess,
    fontWeight: '600'
  },
  subStepPillTextUpcoming: {
    color: colors.textSecondary
  },
  subStepArrow: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700'
  },
  substepLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2
  },
  substepInfo: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500'
  },
  substepHighlight: {
    fontWeight: '700',
    color: colors.brandPrimary
  }
});
