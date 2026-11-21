import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, shadows, borderRadius, spacing } from '../theme/theme';
import { generateApplicationPdf } from '../utils/pdfGenerator';

interface SearchItem {
  id: string;
  category: 'Step' | 'Curriculum' | 'Facility' | 'Document' | 'Summary';
  title: string;
  subtitle: string;
  route?: string;
  action?: 'pdf';
}

const SEARCH_ITEMS: SearchItem[] = [
  // Steps
  { id: 'step-1', category: 'Step', title: 'Step 1: Verify & Mobile OTP', subtitle: 'Account registration and phone verification', route: '/apply/step/1' },
  { id: 'step-2', category: 'Step', title: 'Step 2: Programme & Course', subtitle: 'School vs College, Grade/Course, Academic Year', route: '/apply/step/2' },
  { id: 'step-3', category: 'Step', title: 'Step 3: Board Selection', subtitle: 'CBSE, ICSE / ISC, and State Board comparison', route: '/apply/step/3' },
  { id: 'step-4', category: 'Step', title: 'Step 4: Curriculum & Subjects', subtitle: 'Core subjects, second language, syllabus & textbooks', route: '/apply/step/4' },
  { id: 'step-5', category: 'Step', title: 'Step 5: Student Personal Details', subtitle: 'Full name, DOB, age eligibility, address, photo', route: '/apply/step/5' },
  { id: 'step-6', category: 'Step', title: 'Step 6: Parent & Guardian Details', subtitle: 'Father, mother, contact numbers, emergency phone', route: '/apply/step/6' },
  { id: 'step-7', category: 'Step', title: 'Step 7: Previous Education', subtitle: 'Last school, passing marks, transfer certificate (TC)', route: '/apply/step/7' },
  { id: 'step-8', category: 'Step', title: 'Step 8: Campus Facilities', subtitle: 'Hostel AC rooms, School bus transport, Library', route: '/apply/step/8' },
  { id: 'step-9', category: 'Step', title: 'Step 9: Documents & Review Summary', subtitle: 'Upload certificate proofs, declaration and submit', route: '/apply/step/9' },

  // Curriculum & Subjects
  { id: 'curr-cbse', category: 'Curriculum', title: 'CBSE Curriculum Standard', subtitle: 'NCERT aligned STEM and national syllabus', route: '/apply/step/4' },
  { id: 'curr-icse', category: 'Curriculum', title: 'ICSE / ISC Board Curriculum', subtitle: 'CISCE Council pattern with laboratory practicals', route: '/apply/step/4' },
  { id: 'curr-math', category: 'Curriculum', title: 'Mathematics Standard & Applied', subtitle: 'Core STEM quantitative curriculum', route: '/apply/step/4' },
  { id: 'curr-sci', category: 'Curriculum', title: 'Science (Physics, Chemistry, Biology)', subtitle: 'Lab-oriented experimental curriculum', route: '/apply/step/4' },
  { id: 'curr-lang', category: 'Curriculum', title: 'Second Language (Hindi, Sanskrit, Kannada, French)', subtitle: 'Elective regional & foreign language options', route: '/apply/step/4' },

  // Facilities
  { id: 'fac-hostel', category: 'Facility', title: 'Hostel Accommodation', subtitle: 'Single AC, 2-Sharing AC, 3-Sharing room options', route: '/apply/step/8' },
  { id: 'fac-trans', category: 'Facility', title: 'School Bus Transport', subtitle: 'GPS tracked air-conditioned transport routes', route: '/apply/step/8' },
  { id: 'fac-lib', category: 'Facility', title: 'Central & Digital Library', subtitle: '50,000+ volumes, Kindle lounges, JSTOR access', route: '/apply/step/8' },

  // Documents
  { id: 'doc-photo', category: 'Document', title: 'Student Passport Photo', subtitle: 'Digital photo upload specification (max 5MB)', route: '/apply/step/9' },
  { id: 'doc-id', category: 'Document', title: 'Identity Proof (Aadhaar / Passport)', subtitle: 'Government recognized identity documentation', route: '/apply/step/9' },
  { id: 'doc-marks', category: 'Document', title: 'Previous School Marksheet', subtitle: 'Prior academic year progress report card', route: '/apply/step/9' },
  { id: 'doc-tc', category: 'Document', title: 'Transfer Certificate (TC)', subtitle: 'Signed school transfer clearance certificate', route: '/apply/step/9' },

  // Application
  { id: 'app-dash', category: 'Summary', title: 'Student Application Dashboard', subtitle: 'View full submitted admission file and timeline tracker', route: '/student/dashboard' },
  { id: 'app-pdf', category: 'Summary', title: 'Download Official Application PDF', subtitle: 'Generate official printable PDF admission summary', action: 'pdf' }
];

export const StudentHeader: React.FC = () => {
  const { user, application, logout, navigateTo, language, setLanguage } = useAuth();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Search input state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const studentName = application?.studentDetails?.fullName || user?.fullName || 'Student Applicant';
  const appNo = application?.applicationNo || 'SIS-2026-XXXX';

  const filteredSearchResults = searchQuery.trim().length > 0
    ? SEARCH_ITEMS.filter(item => {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.subtitle.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      })
    : [];

  const handleSearchResultClick = (item: SearchItem) => {
    setSearchQuery('');
    setIsSearchFocused(false);

    if (item.action === 'pdf') {
      if (application) {
        generateApplicationPdf(application);
      }
      return;
    }

    if (item.route) {
      navigateTo(item.route);
    }
  };

  const getCategoryBadgeColor = (cat: string) => {
    switch (cat) {
      case 'Step': return { bg: '#DBEAFE', text: '#1D4ED8' };
      case 'Curriculum': return { bg: '#DCFCE7', text: '#16A34A' };
      case 'Facility': return { bg: '#F3E8FF', text: '#7E22CE' };
      case 'Document': return { bg: '#FEF3C7', text: '#D97706' };
      case 'Summary': return { bg: '#FEE2E2', text: '#DC2626' };
      default: return { bg: '#F1F5F9', text: '#475569' };
    }
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerContent}>
        {/* Left Brand */}
        <TouchableOpacity
          style={styles.logoRow}
          onPress={() => {
            if (application?.status === 'SUBMITTED' || application?.status === 'ACCEPTED' || application?.status === 'ENROLLED') {
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

        {/* Center Search Input with Real-Time Command Palette */}
        <View style={styles.searchWrapper}>
          <View style={[styles.searchContainer, isSearchFocused && styles.searchContainerFocused]}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              nativeID="student-search-input"
              testID="student-search-input"
              style={styles.searchInput}
              placeholder="Search admission steps, curriculum, documents..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setIsSearchFocused(true)}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchBtn}
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Search Results Dropdown Popover */}
          {isSearchFocused && searchQuery.trim().length > 0 && (
            <View style={styles.searchResultsDropdown}>
              <View style={styles.searchDropdownHeader}>
                <Text style={styles.searchDropdownHeaderText}>
                  Search Results ({filteredSearchResults.length})
                </Text>
                <TouchableOpacity onPress={() => setIsSearchFocused(false)}>
                  <Text style={styles.closeSearchDropdown}>Close ✕</Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.searchResultsScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {filteredSearchResults.length > 0 ? (
                  filteredSearchResults.map((item) => {
                    const badge = getCategoryBadgeColor(item.category);
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.searchResultRow}
                        onPress={() => handleSearchResultClick(item)}
                      >
                        <View style={[styles.resultCategoryBadge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.resultCategoryText, { color: badge.text }]}>
                            {item.category}
                          </Text>
                        </View>
                        <View style={styles.resultTextCol}>
                          <Text style={styles.resultTitle}>{item.title}</Text>
                          <Text style={styles.resultSubtitle} numberOfLines={1}>
                            {item.subtitle}
                          </Text>
                        </View>
                        <Text style={styles.resultArrow}>➜</Text>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptySearchResult}>
                    <Text style={styles.emptySearchText}>
                      No matching steps, curriculum, or documents found for "{searchQuery}".
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          )}
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
              Status: <Text style={{ fontWeight: '700', color: application?.status === 'ACCEPTED' ? colors.statusSuccess : colors.statusWarning }}>
                {application?.status || 'DRAFT'}
              </Text>
            </Text>
          </View>
          <View style={styles.divider} />
          {application?.status === 'SUBMITTED' || application?.status === 'ACCEPTED' || application?.status === 'ENROLLED' ? (
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
  searchWrapper: {
    flex: 1,
    maxWidth: 440,
    marginHorizontal: spacing.md,
    position: 'relative',
    zIndex: 999
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgPage,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 7 : 5
  },
  searchContainerFocused: {
    borderColor: colors.brandPrimary,
    backgroundColor: '#FFFFFF',
    shadowColor: colors.brandPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3
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
  clearSearchBtn: {
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  clearSearchText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '700'
  },
  searchResultsDropdown: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    maxHeight: 340,
    ...shadows.modal,
    zIndex: 9999,
    overflow: 'hidden'
  },
  searchDropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.bgPage,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDefault
  },
  searchDropdownHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  closeSearchDropdown: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brandPrimary
  },
  searchResultsScroll: {
    maxHeight: 290
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10
  },
  resultCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm
  },
  resultCategoryText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  resultTextCol: {
    flex: 1
  },
  resultTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary
  },
  resultSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2
  },
  resultArrow: {
    fontSize: 12,
    color: colors.textMuted
  },
  emptySearchResult: {
    padding: spacing.md,
    alignItems: 'center'
  },
  emptySearchText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center'
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
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
    fontSize: 15
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
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    color: colors.textInverse,
    fontSize: 13,
    fontWeight: '700'
  },
  userMeta: {
    maxWidth: 90
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
    fontSize: 11,
    color: colors.textSecondary
  },
  dropdownMenu: {
    position: 'absolute',
    top: 56,
    right: 24,
    width: 260,
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.sm,
    ...shadows.modal,
    zIndex: 9999
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
