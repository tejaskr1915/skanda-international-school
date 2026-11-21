import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../theme/theme';

export const StudentFooter: React.FC = () => {
  return (
    <View style={styles.footerContainer}>
      <View style={styles.footerContent}>
        <Text style={styles.footerText}>
          Skanda International School Admissions Portal • Academic Year 2026-2027
        </Text>
        <Text style={styles.supportText}>
          Need assistance? Call Admissions Desk: +91 80 2843 9000 or email admissions@skanda.edu.in
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footerContainer: {
    backgroundColor: colors.bgSurface,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault,
    paddingVertical: spacing.md,
    marginTop: spacing.xl
  },
  footerContent: {
    maxWidth: 1300,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8
  },
  footerText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary
  },
  supportText: {
    fontSize: 12,
    color: colors.textMuted
  }
});
