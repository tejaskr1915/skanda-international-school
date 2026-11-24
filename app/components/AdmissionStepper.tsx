import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { colors, borderRadius, spacing } from '../theme/theme';

interface StepperProps {
  currentStep: number;
  onSelectStep?: (step: number) => void;
  maxUnlockedStep?: number;
}

export const AdmissionStepper: React.FC<StepperProps> = ({
  currentStep,
  onSelectStep,
  maxUnlockedStep = 9
}) => {
  // 5 Global Stages matching UX spec
  const phases = [
    { id: 1, title: 'Verify', subSteps: [1] },
    { id: 2, title: 'Programme & Board', subSteps: [2, 3, 4] },
    { id: 3, title: 'Details', subSteps: [5, 6, 7] },
    { id: 4, title: 'Facilities & Documents', subSteps: [8] },
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

      {/* Substep breadcrumb info */}
      <View style={styles.substepBar}>
        <Text style={styles.substepInfo}>
          Step {currentStep} of 9:{' '}
          <Text style={styles.substepHighlight}>{getStepTitle(currentStep)}</Text>
        </Text>
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
  substepBar: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
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
