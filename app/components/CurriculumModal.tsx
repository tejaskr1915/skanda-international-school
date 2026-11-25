import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import { colors, borderRadius, spacing, shadows } from '../theme/theme';

interface CurriculumModalProps {
  visible: boolean;
  onClose: () => void;
  boardKey: 'CBSE' | 'ICSE_ISC' | 'STATE' | null;
  boardData?: any;
}

export const CurriculumModal: React.FC<CurriculumModalProps> = ({
  visible,
  onClose,
  boardKey,
  boardData
}) => {
  if (!boardKey || !boardData) return null;

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View
        style={styles.overlay}
        {...(Platform.OS === 'web' ? ({ className: 'skanda-modal-backdrop' } as any) : {})}
      >
        <View
          style={styles.modalCard}
          {...(Platform.OS === 'web' ? ({ className: 'skanda-modal-card' } as any) : {})}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.boardBadge}>
                <Text style={styles.boardBadgeText}>{boardKey.replace('_', ' / ')}</Text>
              </View>
              <Text style={styles.title}>{boardData.name}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.bodyScroll} showsVerticalScrollIndicator={false}>
            {/* Quick Specs */}
            <View style={styles.specsGrid}>
              <View style={styles.specCard}>
                <Text style={styles.specLabel}>Classes Offered</Text>
                <Text style={styles.specValue}>{boardData.classesOffered}</Text>
              </View>
              <View style={styles.specCard}>
                <Text style={styles.specLabel}>Medium of Instruction</Text>
                <Text style={styles.specValue}>{boardData.medium}</Text>
              </View>
              <View style={styles.specCard}>
                <Text style={styles.specLabel}>Annual Tuition Fee</Text>
                <Text style={styles.specValue}>₹{boardData.annualFee?.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.specCard}>
                <Text style={styles.specLabel}>Current Seat Status</Text>
                <Text style={[styles.specValue, { color: boardData.seatsLeft > 0 ? colors.statusSuccess : colors.statusWarning }]}>
                  {boardData.seatsLeft > 0 ? `${boardData.seatsLeft} Seats Available` : 'Waitlist Only'}
                </Text>
              </View>
            </View>

            {/* Overview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Curriculum Philosophy & Framework</Text>
              <Text style={styles.sectionBody}>{boardData.curriculumOverview}</Text>
            </View>

            {/* Textbook List */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Prescribed Textbooks & Reference Materials</Text>
              {boardData.textbookList?.map((book: string, i: number) => (
                <View key={i} style={styles.bookRow}>
                  <Text style={styles.bookBullet}>📘</Text>
                  <Text style={styles.bookText}>{book}</Text>
                </View>
              ))}
            </View>

            {/* Assessment Structure */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Continuous Evaluation & Examination Pattern</Text>
              <Text style={styles.sectionBody}>
                Evaluation includes 2 Periodic Assessments (20 marks each), Term I Summative Review (80 marks), Subject Enrichment STEM Lab Practical (20 marks), and Portfolio Notebook Submission.
              </Text>
            </View>
          </ScrollView>

          {/* Action */}
          <TouchableOpacity style={styles.closeActionBtn} onPress={onClose}>
            <Text style={styles.closeActionText}>Close Curriculum Preview</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md
  },
  modalCard: {
    width: '100%',
    maxWidth: 640,
    maxHeight: '90%',
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.modal
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md
  },
  boardBadge: {
    backgroundColor: colors.brandLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: 6
  },
  boardBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.brandPrimary
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.brandDark,
    lineHeight: 24
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
  bodyScroll: {
    marginVertical: spacing.md
  },
  specsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.lg
  },
  specCard: {
    flex: 1,
    minWidth: 130,
    backgroundColor: colors.bgPage,
    borderRadius: borderRadius.md,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.borderDefault
  },
  specLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500'
  },
  specValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: 2
  },
  section: {
    marginBottom: spacing.lg
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brandDark,
    marginBottom: 8
  },
  sectionBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20
  },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4
  },
  bookBullet: {
    fontSize: 13
  },
  bookText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500'
  },
  closeActionBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm
  },
  closeActionText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700'
  }
});
