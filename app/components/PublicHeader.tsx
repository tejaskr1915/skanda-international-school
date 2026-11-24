import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, useWindowDimensions } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, shadows, borderRadius, spacing } from '../theme/theme';

interface PublicHeaderProps {
  onOpenLogin: () => void;
}

export const PublicHeader: React.FC<PublicHeaderProps> = ({ onOpenLogin }) => {
  const { navigateTo, user, application, logout } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<string>('Admissions');

  // Only keep functional links that scroll to existing sections or active Phase 1 routes
  const menuItems = [
    { label: 'Admissions', route: '/apply' },
    { label: 'Campuses', target: 'campus-finder' },
    { label: 'News', target: 'news' },
    { label: 'About', target: 'about' },
    { label: 'Contact', target: 'contact' }
  ];

  const handleNavClick = (item: { label: string; route?: string; target?: string }) => {
    setActiveNav(item.label);
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

        {/* Desktop Nav Links (Hidden on < 768px Mobile) */}
        {!isMobile && (
          <View style={styles.desktopNav}>
            {menuItems.map((item, index) => {
              const isActive = activeNav === item.label;
              const isHovered = hoveredNav === item.label;
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.navLink,
                    (isActive || isHovered) && styles.navLinkHovered,
                    isActive && styles.navLinkActive
                  ]}
                  onPress={() => handleNavClick(item)}
                  {...(Platform.OS === 'web'
                    ? ({
                        onMouseEnter: () => setHoveredNav(item.label),
                        onMouseLeave: () => setHoveredNav(null)
                      } as any)
                    : {})}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.navLinkText,
                      (isActive || isHovered) && styles.navLinkTextActive
                    ]}
                  >
                    {item.label}
                  </Text>
                  {isActive && <View style={styles.activeAccentBar} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Right CTA Actions & Mobile Hamburger */}
        <View style={styles.actionsRow}>
          {user ? (
            <View style={styles.userControls}>
              <TouchableOpacity
                style={styles.portalPill}
                onPress={() => {
                  if (application?.status === 'SUBMITTED' || application?.status === 'ACCEPTED' || application?.status === 'ENROLLED') {
                    navigateTo('/student/dashboard');
                  } else {
                    navigateTo(`/apply/step/${application?.currentStep || 1}`);
                  }
                }}
              >
                <Text style={styles.portalPillText}>
                  {application?.status === 'SUBMITTED' || application?.status === 'ACCEPTED' || application?.status === 'ENROLLED'
                    ? 'Dashboard ➜'
                    : `Resume Step ${application?.currentStep || 1} ➜`}
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
              activeOpacity={0.88}
            >
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
          )}

          {/* Mobile Hamburger Button (< 768px) */}
          {isMobile && (
            <TouchableOpacity
              style={[styles.hamburgerBtn, mobileMenuOpen && styles.hamburgerBtnOpen]}
              onPress={() => setMobileMenuOpen(!mobileMenuOpen)}
              accessibilityLabel="Toggle navigation menu"
              activeOpacity={0.85}
            >
              <Text style={styles.hamburgerIcon}>{mobileMenuOpen ? '✕' : '☰'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Full-Width Mobile Slide-Down Menu Drawer (< 768px) */}
      {isMobile && mobileMenuOpen && (
        <View style={styles.mobileDrawer}>
          <View style={styles.mobileNavList}>
            {menuItems.map((item, index) => {
              const isActive = activeNav === item.label;
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.mobileNavItem, isActive && styles.mobileNavItemActive]}
                  onPress={() => {
                    setMobileMenuOpen(false);
                    handleNavClick(item);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.mobileNavText, isActive && styles.mobileNavTextActive]}>
                    {item.label}
                  </Text>
                  <Text style={[styles.mobileNavChevron, isActive && styles.mobileNavChevronActive]}>➜</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.mobileDrawerFooter}>
            {user ? (
              <View style={styles.mobileUserControls}>
                <TouchableOpacity
                  style={styles.mobilePortalBtn}
                  onPress={() => {
                    setMobileMenuOpen(false);
                    if (application?.status === 'SUBMITTED' || application?.status === 'ACCEPTED' || application?.status === 'ENROLLED') {
                      navigateTo('/student/dashboard');
                    } else {
                      navigateTo(`/apply/step/${application?.currentStep || 1}`);
                    }
                  }}
                >
                  <Text style={styles.mobilePortalBtnText}>
                    {application?.status === 'SUBMITTED' || application?.status === 'ACCEPTED' || application?.status === 'ENROLLED'
                      ? 'Student Dashboard ➜'
                      : `Resume Application Step ${application?.currentStep || 1} ➜`}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.mobileLogoutBtn}
                  onPress={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                >
                  <Text style={styles.mobileLogoutBtnText}>Logout</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.mobileLoginFullBtn}
                onPress={() => {
                  setMobileMenuOpen(false);
                  onOpenLogin();
                }}
              >
                <Text style={styles.mobileLoginFullText}>Student / Parent Login ➜</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 100,
    width: '100%',
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
    paddingVertical: 12
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  logoBadge: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: colors.brandPrimary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.brandPrimary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3
  },
  logoLetter: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900'
  },
  brandTextContainer: {
    justifyContent: 'center'
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.brandDark,
    letterSpacing: -0.5
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brandPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.8
  },
  desktopNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  navLink: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    position: 'relative'
  },
  navLinkHovered: {
    backgroundColor: 'rgba(239, 246, 255, 0.85)'
  },
  navLinkActive: {
    backgroundColor: '#EFF6FF'
  },
  navLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155',
    letterSpacing: -0.2
  },
  navLinkTextActive: {
    color: '#1D4ED8',
    fontWeight: '700'
  },
  activeAccentBar: {
    position: 'absolute',
    bottom: -2,
    left: 14,
    right: 14,
    height: 2.5,
    backgroundColor: '#1D4ED8',
    borderRadius: 2
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0
  },
  loginButton: {
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#EFF6FF'
  },
  loginButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D4ED8'
  },
  userControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0
  },
  portalPill: {
    backgroundColor: colors.brandLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  logoutBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626'
  },
  hamburgerBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  hamburgerBtnOpen: {
    backgroundColor: '#DBEAFE',
    borderColor: '#1D4ED8'
  },
  hamburgerIcon: {
    fontSize: 20,
    color: '#1D4ED8',
    fontWeight: '700',
    lineHeight: 22
  },
  mobileDrawer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingHorizontal: 16,
    paddingVertical: 14,
    width: '100%',
    ...shadows.modal
  },
  mobileNavList: {
    gap: 4
  },
  mobileNavItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#F8FAFC'
  },
  mobileNavItemActive: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  mobileNavText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#334155'
  },
  mobileNavTextActive: {
    fontWeight: '700',
    color: '#1D4ED8'
  },
  mobileNavChevron: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700'
  },
  mobileNavChevronActive: {
    color: '#1D4ED8'
  },
  mobileDrawerFooter: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9'
  },
  mobileUserControls: {
    gap: 8
  },
  mobilePortalBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center'
  },
  mobilePortalBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  mobileLogoutBtn: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center'
  },
  mobileLogoutBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700'
  },
  mobileLoginFullBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center'
  },
  mobileLoginFullText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  }
});
