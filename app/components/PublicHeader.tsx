import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, shadows, borderRadius, spacing } from '../theme/theme';

interface PublicHeaderProps {
  onOpenLogin: () => void;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({ onOpenLogin }) => {
  const { navigateTo, user, application, logout, language, setLanguage } = useAuth();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const languages = ['English', 'ಕನ್ನಡ (Kannada)', 'हिन्दी (Hindi)'];

  // Only keep functional links that scroll to existing sections or active Phase 1 routes
  const menuItems = [
    { label: 'About', target: 'about' },
    { label: 'Campuses', target: 'campus-finder' },
    { label: 'Admissions', route: '/apply' },
    { label: 'News', target: 'news' },
    { label: 'Contact', target: 'contact' }
  ];

  const handleNavClick = (item: { label: string; route?: string; target?: string }) => {
    if (item.route) {
      navigateTo(item.route);
      return;
    }
    if (item.target) {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const scrollToSection = () => {
          const el = document.getElementById(item.target!);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        };

        if (window.location.pathname !== '/') {
          navigateTo('/');
          setTimeout(scrollToSection, 200);
        } else {
          scrollToSection();
        }
      }
    }
  };

  return (
    <View style={styles.headerContainer}>
      <View style={styles.headerContent}>
        {/* Brand Logo & Name */}
        <TouchableOpacity
          style={styles.logoRow}
          onPress={() => navigateTo('/')}
          activeOpacity={0.8}
        >
          <View style={styles.logoBadge}>
            <Text style={styles.logoLetter}>S</Text>
          </View>
          <View style={styles.brandTextContainer}>
            <Text style={styles.brandTitle}>Skanda</Text>
            <Text style={styles.brandSubtitle}>International School</Text>
          </View>
        </TouchableOpacity>

        {/* Desktop Nav Links */}
        <View style={styles.desktopNav}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.navLink}
              onPress={() => handleNavClick(item)}
            >
              <Text style={styles.navLinkText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Right CTA Actions */}
        <View style={styles.actionsRow}>
          {/* Language Selector */}
          <TouchableOpacity
            style={styles.langButton}
            onPress={() => setLangModalVisible(true)}
          >
            <Text style={styles.langButtonText}>🌐 {language.split(' ')[0]} ▾</Text>
          </TouchableOpacity>

          {user ? (
            <View style={styles.userControls}>
              <TouchableOpacity
                style={styles.portalPill}
                onPress={() => {
                  if (application?.status === 'SUBMITTED') {
                    navigateTo('/student/dashboard');
                  } else {
                    navigateTo(`/apply/step/${application?.currentStep || 1}`);
                  }
                }}
              >
                <Text style={styles.portalPillText}>
                  {application?.status === 'SUBMITTED' ? 'Dashboard ➜' : `Resume Step ${application?.currentStep || 1} ➜`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                <Text style={styles.logoutBtnText}>Logout</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.loginButton}
              onPress={onOpenLogin}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          )}

          {/* Royal Blue Apply Now Button */}
          <TouchableOpacity
            nativeID="apply-now-btn"
            testID="apply-now-btn"
            style={styles.applyNowButton}
            onPress={() => navigateTo('/apply')}
            activeOpacity={0.85}
          >
            <Text style={styles.applyNowText}>Apply Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Language Selector Modal */}
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
            <Text style={styles.langModalHeader}>Select Portal Language</Text>
            {languages.map((lang, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.langOption,
                  language === lang && styles.langOptionActive
                ]}
                onPress={() => {
                  setLanguage(lang);
                  setLangModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.langOptionText,
                    language === lang && styles.langOptionTextActive
                  ]}
                >
                  {lang}
                </Text>
                {language === lang && <Text style={styles.checkmark}>✓</Text>}
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
    zIndex: 100,
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
    paddingVertical: spacing.md
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brandPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3
  },
  logoLetter: {
    color: colors.textInverse,
    fontSize: 24,
    fontWeight: '800'
  },
  brandTextContainer: {
    justifyContent: 'center'
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.brandDark,
    letterSpacing: -0.5
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brandPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  desktopNav: {
    display: Platform.OS === 'web' ? ('flex' as any) : 'none',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16
  },
  navLink: {
    paddingVertical: 6,
    paddingHorizontal: 4
  },
  navLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0
  },
  langButton: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgPage
  },
  langButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary
  },
  loginButton: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgSurface
  },
  loginButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary
  },
  applyNowButton: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    shadowColor: colors.brandPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2
  },
  applyNowText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textInverse
  },
  userControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0
  },
  portalPill: {
    backgroundColor: colors.brandLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  portalPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brandPrimary
  },
  logoutBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.statusDanger
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  langModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.modal
  },
  langModalHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md
  },
  langOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  langOptionActive: {
    backgroundColor: colors.brandLight,
    borderColor: '#93C5FD'
  },
  langOptionText: {
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '500'
  },
  langOptionTextActive: {
    fontWeight: '700',
    color: colors.brandPrimary
  },
  checkmark: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brandPrimary
  }
});
