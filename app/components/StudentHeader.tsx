import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, shadows, borderRadius, spacing } from '../theme/theme';

export const StudentHeader: React.FC = () => {
  const { user, application, logout, navigateTo, language, setLanguage } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  const studentName = application?.studentDetails?.fullName || user?.fullName || 'Student Applicant';
  const appNo = application?.applicationNo || 'SIS-2026-XXXX';

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerContent}>
        {/* Left Brand */}
        <TouchableOpacity
          style={styles.logoRow}
          onPress={() => {
            if (application?.status === 'SUBMITTED') {
              navigateTo('/student/dashboard');
            } else {
              navigateTo(`/apply/step/${application?.currentStep || 1}`);
            }
          }}
          activeOpacity={0.8}
        >
          <View style={styles.logoBadge}>
            <Text style={styles.logoLetter}>S</Text>
          </View>
          <View>
            <Text style={styles.brandTitle}>Skanda</Text>
            <Text style={styles.brandSubtitle}>Student Portal</Text>
          </View>
        </TouchableOpacity>

        {/* Center Search Input */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search admission steps, curriculum, documents..."
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Right Controls */}
        <View style={styles.rightControls}>
          {/* Language Selector */}
          <TouchableOpacity
            style={styles.controlPill}
            onPress={() => setLangModalVisible(true)}
          >
            <Text style={styles.controlText}>🌐 {language.split(' ')[0]}</Text>
          </TouchableOpacity>

          {/* Notifications Bell */}
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => setShowNotificationModal(true)}
          >
            <Text style={styles.bellIcon}>🔔</Text>
            <View style={styles.badgeDot}>
              <Text style={styles.badgeCount}>1</Text>
            </View>
          </TouchableOpacity>

          {/* User Profile Pill & Dropdown */}
          <TouchableOpacity
            style={styles.userProfilePill}
            onPress={() => setProfileMenuOpen(!profileMenuOpen)}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {studentName.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.userMeta}>
              <Text style={styles.userName} numberOfLines={1}>{studentName}</Text>
              <Text style={styles.userRole}>{appNo}</Text>
            </View>
            <Text style={styles.chevron}>▾</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Notifications Modal */}
      <Modal
        visible={showNotificationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNotificationModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowNotificationModal(false)}
        >
          <View style={styles.notifContent}>
            <View style={styles.notifHeader}>
              <Text style={styles.notifTitle}>Admissions Notifications</Text>
              <TouchableOpacity onPress={() => setShowNotificationModal(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.notifItem}>
              <Text style={styles.notifDot}>●</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.notifText}>
                  Academic Year 2026-2027 Admissions session is currently active.
                </Text>
                <Text style={styles.notifTime}>Application ID: {appNo}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Profile Menu Dropdown */}
      {profileMenuOpen && (
        <View style={styles.dropdownMenu}>
          <View style={styles.dropdownHeader}>
            <Text style={styles.dropdownName}>{studentName}</Text>
            <Text style={styles.dropdownMobile}>+91 {user?.mobile}</Text>
            <Text style={styles.dropdownStatus}>
              Status: <Text style={{ fontWeight: '700', color: application?.status === 'SUBMITTED' ? colors.statusSuccess : colors.statusWarning }}>
                {application?.status || 'DRAFT'}
              </Text>
            </Text>
          </View>
          <View style={styles.divider} />
          {application?.status === 'SUBMITTED' ? (
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setProfileMenuOpen(false);
                navigateTo('/student/dashboard');
              }}
            >
              <Text style={styles.dropdownItemText}>👤 Student Dashboard</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => {
                setProfileMenuOpen(false);
                navigateTo(`/apply/step/${application?.currentStep || 1}`);
              }}
            >
              <Text style={styles.dropdownItemText}>✏️ Continue Application (Step {application?.currentStep || 1})</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.dropdownItem}
            onPress={() => {
              setProfileMenuOpen(false);
              navigateTo('/');
            }}
          >
            <Text style={styles.dropdownItemText}>🏫 Visit Public Website</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.dropdownItemDanger}
            onPress={() => {
              setProfileMenuOpen(false);
              logout();
            }}
          >
            <Text style={styles.dropdownItemDangerText}>🚪 Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Language Modal */}
      <Modal
        visible={langModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLangModalVisible(false)}
        >
          <View style={styles.langModalContent}>
            <Text style={styles.notifTitle}>Select Portal Language</Text>
            {['English', 'ಕನ್ನಡ (Kannada)', 'हिन्दी (Hindi)'].map((l, i) => (
              <TouchableOpacity
                key={i}
                style={[styles.langOption, language === l && styles.langOptionActive]}
                onPress={() => {
                  setLanguage(l);
                  setLangModalVisible(false);
                }}
              >
                <Text style={{ fontWeight: language === l ? '700' : '500', color: language === l ? colors.brandPrimary : colors.textPrimary }}>
                  {l}
                </Text>
                {language === l && <Text style={{ color: colors.brandPrimary }}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.bgSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault,
    zIndex: 200,
    ...shadows.card
  },
  headerContent: {
    maxWidth: 1300,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: colors.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logoLetter: {
    color: colors.textInverse,
    fontSize: 20,
    fontWeight: '800'
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.brandDark,
    letterSpacing: -0.5
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brandPrimary,
    textTransform: 'uppercase'
  },
  searchContainer: {
    flex: 1,
    maxWidth: 420,
    marginHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgPage,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 6 : 4
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.textPrimary,
    outlineWidth: 0 as any
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  controlPill: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgPage
  },
  controlText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary
  },
  bellButton: {
    position: 'relative',
    padding: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.bgPage
  },
  bellIcon: {
    fontSize: 16
  },
  badgeDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.brandPrimary,
    borderRadius: 8,
    width: 14,
    height: 14,
    alignItems: 'center',
    justifyContent: 'center'
  },
  badgeCount: {
    color: colors.textInverse,
    fontSize: 9,
    fontWeight: '800'
  },
  userProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.bgPage
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700'
  },
  userMeta: {
    maxWidth: 110
  },
  userName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textPrimary
  },
  userRole: {
    fontSize: 10,
    color: colors.textSecondary
  },
  chevron: {
    fontSize: 12,
    color: colors.textSecondary
  },
  dropdownMenu: {
    position: 'absolute',
    top: 60,
    right: 24,
    width: 260,
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.sm,
    ...shadows.modal,
    zIndex: 999
  },
  dropdownHeader: {
    padding: spacing.sm
  },
  dropdownName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary
  },
  dropdownMobile: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  dropdownStatus: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderDefault,
    marginVertical: 4
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm
  },
  dropdownItemText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '500'
  },
  dropdownItemDanger: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm
  },
  dropdownItemDangerText: {
    fontSize: 13,
    color: colors.statusDanger,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  notifContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.modal
  },
  notifHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md
  },
  notifTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary
  },
  closeBtn: {
    fontSize: 16,
    color: colors.textSecondary
  },
  notifItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault
  },
  notifDot: {
    color: colors.brandPrimary,
    fontSize: 12,
    marginTop: 2
  },
  notifText: {
    fontSize: 13,
    color: colors.textPrimary
  },
  notifTime: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4
  },
  langModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.modal
  },
  langOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    marginBottom: 6
  },
  langOptionActive: {
    backgroundColor: colors.brandLight
  }
});
