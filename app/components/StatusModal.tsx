import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import api from '../services/api';
import { colors, borderRadius, spacing, shadows } from '../theme/theme';

interface StatusModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenLogin: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({ visible, onClose, onOpenLogin }) => {
  const [appNo, setAppNo] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [resultApp, setResultApp] = useState<any>(null);

  const handleLookup = async () => {
    setErrorMsg('');
    setResultApp(null);

    if (!appNo.trim()) {
      setErrorMsg('Please enter your Application Number (e.g. SIS-2026-0001).');
      return;
    }

    setLoading(true);
    try {
      const res = await api.statusLookup(appNo.trim(), mobile.trim());
      if (res.success && res.application) {
        setResultApp(res.application);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Application not found. Please verify the application number.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusStepIndex = (status: string) => {
    switch (status) {
      case 'DRAFT': return 0;
      case 'SUBMITTED': return 1;
      case 'UNDER_REVIEW': return 2;
      case 'SHORTLISTED': return 3;
      case 'ACCEPTED': return 4;
      default: return 1;
    }
  };

  const timelineSteps = ['Draft Created', 'Submitted', 'Under Review', 'Shortlisted', 'Admission Accepted'];

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Track Application Status</Text>
              <Text style={styles.subtitle}>Enter your SIS application reference number</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {!!errorMsg && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
            </View>
          )}

          {!resultApp ? (
            <View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Application Number *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. SIS-2026-0001"
                  placeholderTextColor={colors.textMuted}
                  value={appNo}
                  onChangeText={setAppNo}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Registered Mobile Number (Optional)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="10-digit mobile number"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  maxLength={10}
                  value={mobile}
                  onChangeText={setMobile}
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.disabledBtn]}
                onPress={handleLookup}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <Text style={styles.primaryBtnText}>Track Application Status ➜</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {/* Status Header Badge */}
              <View style={styles.resultBanner}>
                <View>
                  <Text style={styles.resultAppNo}>{resultApp.applicationNo}</Text>
                  <Text style={styles.resultStudent}>
                    {resultApp.studentDetails?.fullName || resultApp.applicantUser?.fullName || 'Applicant'}
                  </Text>
                  <Text style={styles.resultMeta}>
                    {resultApp.classOrCourse} • {resultApp.board || 'School'} • {resultApp.academicYear}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor:
                        resultApp.status === 'ACCEPTED'
                          ? colors.statusSuccessBg
                          : resultApp.status === 'SUBMITTED'
                          ? colors.brandLight
                          : '#FEF3C7'
                    }
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      {
                        color:
                          resultApp.status === 'ACCEPTED'
                            ? colors.statusSuccess
                            : resultApp.status === 'SUBMITTED'
                            ? colors.brandPrimary
                            : colors.statusWarning
                      }
                    ]}
                  >
                    ● {resultApp.status}
                  </Text>
                </View>
              </View>

              {/* Timeline Progress */}
              <View style={styles.timelineBox}>
                <Text style={styles.timelineTitle}>Application Lifecycle Progress</Text>
                <View style={styles.timelineRow}>
                  {timelineSteps.map((stepName, i) => {
                    const currentIndex = getStatusStepIndex(resultApp.status);
                    const isDone = i <= currentIndex;
                    const isCurrent = i === currentIndex;
                    return (
                      <View key={i} style={styles.timelineItem}>
                        <View
                          style={[
                            styles.timelineNode,
                            isDone && styles.timelineNodeDone,
                            isCurrent && styles.timelineNodeCurrent
                          ]}
                        >
                          <Text style={[styles.timelineNodeText, isDone && styles.timelineNodeTextDone]}>
                            {isDone ? '✓' : i + 1}
                          </Text>
                        </View>
                        <Text style={[styles.timelineLabel, isCurrent && styles.timelineLabelCurrent]}>
                          {stepName}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => setResultApp(null)}
                >
                  <Text style={styles.secondaryBtnText}>Lookup Another</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => {
                    onClose();
                    onOpenLogin();
                  }}
                >
                  <Text style={styles.primaryBtnText}>Log In to View Full File ➜</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.modal
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.brandDark,
    letterSpacing: -0.5
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4
  },
  closeBtn: {
    padding: 6,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgPage
  },
  closeBtnText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600'
  },
  errorBox: {
    backgroundColor: colors.statusDangerBg,
    padding: 10,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md
  },
  errorText: {
    fontSize: 12,
    color: colors.statusDanger,
    fontWeight: '600'
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
    paddingVertical: 11,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.bgSurface,
    outlineWidth: 0 as any
  },
  primaryBtn: {
    backgroundColor: colors.brandPrimary,
    borderRadius: borderRadius.md,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    flex: 1
  },
  primaryBtnText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700'
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: borderRadius.md,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    backgroundColor: colors.bgPage
  },
  secondaryBtnText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600'
  },
  disabledBtn: {
    opacity: 0.6
  },
  resultBanner: {
    backgroundColor: colors.bgPage,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg
  },
  resultAppNo: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.brandPrimary
  },
  resultStudent: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2
  },
  resultMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700'
  },
  timelineBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault
  },
  timelineTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  timelineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  timelineItem: {
    alignItems: 'center',
    flex: 1
  },
  timelineNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6
  },
  timelineNodeDone: {
    backgroundColor: colors.brandPrimary
  },
  timelineNodeCurrent: {
    backgroundColor: colors.brandPrimary,
    borderWidth: 3,
    borderColor: '#BFDBFE'
  },
  timelineNodeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '700'
  },
  timelineNodeTextDone: {
    color: colors.textInverse
  },
  timelineLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '500'
  },
  timelineLabelCurrent: {
    color: colors.brandPrimary,
    fontWeight: '700'
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12
  }
});
