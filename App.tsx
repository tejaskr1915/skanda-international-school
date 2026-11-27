import React from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, Platform } from 'react-native';
import { AuthProvider, useAuth } from './app/context/AuthContext';
import { HomeScreen } from './app/screens/HomeScreen';
import { GalleryScreen } from './app/screens/GalleryScreen';
import { ApplyLandingScreen } from './app/screens/ApplyLandingScreen';
import { AdmissionWizardScreen } from './app/screens/AdmissionWizardScreen';
import { StudentDashboardScreen } from './app/screens/StudentDashboardScreen';
import { SuperAdminScreen } from './app/screens/SuperAdminScreen';
import { BranchAdminScreen } from './app/screens/BranchAdminScreen';
import { RolePortalScreen } from './app/screens/RolePortalScreen';
import { GateKioskScreen } from './app/screens/GateKioskScreen';
import { colors } from './app/theme/theme';

const MainNavigator: React.FC = () => {
  const { currentRoute, application, user, portalUser } = useAuth();

  const renderCurrentScreen = () => {
    // 1. Home Page
    if (currentRoute === '/' || currentRoute === '') {
      return <HomeScreen />;
    }

    // 1.5 Gallery Page
    if (currentRoute === '/gallery') {
      return <GalleryScreen />;
    }

    // 2. Apply Landing
    if (currentRoute === '/apply') {
      if (user && application && application.status !== 'DRAFT') {
        return <StudentDashboardScreen lockNotice="Your application has already been submitted and locked for review" />;
      }
      return <ApplyLandingScreen />;
    }

    // 3. Multi-Step Wizard (/apply/step/1 through /apply/step/9)
    if (currentRoute.startsWith('/apply/step/')) {
      if (user && application && application.status !== 'DRAFT') {
        return <StudentDashboardScreen lockNotice="Your application has already been submitted and locked for review" />;
      }
      const stepParam = parseInt(currentRoute.replace('/apply/step/', ''), 10);
      const stepNumber = !isNaN(stepParam) && stepParam >= 1 && stepParam <= 9 ? stepParam : 1;
      return <AdmissionWizardScreen initialStep={stepNumber} />;
    }

    // 4. Student Dashboard (/student/dashboard)
    if (currentRoute === '/student/dashboard') {
      // Allow dashboard access if submitted, accepted, under review, or enrolled (anything not DRAFT)
      if (application && application.status !== 'DRAFT') {
        return <StudentDashboardScreen />;
      }
      // If draft or unauthenticated, redirect to wizard step
      const step = application?.currentStep || 1;
      return <AdmissionWizardScreen initialStep={step} />;
    }

    // 5. Phase 2 Super Admin Portal (/super-admin)
    if (currentRoute === '/super-admin') {
      if (portalUser?.role === 'SUPER_ADMIN') {
        return <SuperAdminScreen />;
      }
      return <HomeScreen />;
    }

    // 6. Phase 2 Branch Admin / Principal / Sub-Admin Portal (/branch-admin)
    if (currentRoute === '/branch-admin') {
      if (
        portalUser &&
        ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT', 'ADMISSION_OFFICER', 'EXAM_CONTROLLER', 'LIBRARIAN', 'TRANSPORT_MANAGER', 'DRIVER', 'HOSTEL_WARDEN', 'LAB_ASSISTANT', 'ACTIVITY_COORDINATOR', 'PLACEMENT_OFFICER'].includes(
          portalUser.role
        )
      ) {
        return <BranchAdminScreen />;
      }
      return <HomeScreen />;
    }

    // 7. Phase 2 Student / Parent / Teacher Portal (/portal)
    if (currentRoute === '/portal') {
      if (portalUser && ['STUDENT', 'PARENT', 'TEACHER'].includes(portalUser.role)) {
        return <RolePortalScreen />;
      }
      return <HomeScreen />;
    }

    // 8. Phase 2 Smart Gate & Visitor Kiosk (/kiosk/gate)
    if (currentRoute === '/kiosk/gate') {
      return <GateKioskScreen />;
    }

    // Default fallback to Home
    return <HomeScreen />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brandDark} />
      <View
        key={currentRoute}
        style={styles.appContainer}
        {...(Platform.OS === 'web' ? ({ className: 'skanda-fade-up' } as any) : {})}
      >
        {renderCurrentScreen()}
      </View>
    </SafeAreaView>
  );
};

// Global responsive web styles & lightweight animations
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const styleId = 'skanda-global-responsive-styles';
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement('style');
    styleEl.id = styleId;
    styleEl.innerHTML = `
      html, body, #root {
        overflow-x: hidden !important;
        max-width: 100vw !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      *, *::before, *::after {
        box-sizing: border-box !important;
      }

      @keyframes skandaFadeUp {
        from {
          opacity: 0;
          transform: translateY(12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      .skanda-fade-up {
        animation: skandaFadeUp 250ms cubic-bezier(0.16, 1, 0.3, 1) both;
      }

      @keyframes skandaBackdropFade {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes skandaScaleIn {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      .skanda-modal-backdrop {
        animation: skandaBackdropFade 200ms ease-out both;
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
      }
      .skanda-modal-card {
        animation: skandaScaleIn 200ms ease-out both;
      }

      .skanda-gallery-card {
        transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease !important;
      }
      .skanda-gallery-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 24px -6px rgba(29, 78, 216, 0.16) !important;
        border-color: #93C5FD !important;
      }
      .skanda-gallery-card img {
        transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1) !important;
      }
      .skanda-gallery-card:hover img {
        transform: scale(1.05);
      }
      .skanda-zoom-pill {
        transition: transform 200ms ease, box-shadow 200ms ease !important;
      }
      .skanda-gallery-card:hover .skanda-zoom-pill {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(29, 78, 216, 0.35);
      }

      .skanda-kpi-card {
        transition: transform 200ms ease, box-shadow 200ms ease !important;
      }
      .skanda-kpi-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 10px 20px -5px rgba(15, 23, 42, 0.12) !important;
      }

      .skanda-campus-card {
        transition: transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease !important;
      }
      .skanda-campus-card:hover {
        border-color: #1D4ED8 !important;
        box-shadow: 0 8px 16px -4px rgba(29, 78, 216, 0.12) !important;
      }

      .skanda-btn-primary {
        transition: transform 150ms ease, background-color 150ms ease, box-shadow 150ms ease !important;
      }
      .skanda-btn-primary:active {
        transform: scale(0.98) !important;
      }
    `;
    document.head.appendChild(styleEl);
  }
}

export default function App() {
  return (
    <AuthProvider>
      <MainNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgPage,
    width: '100%',
    maxWidth: '100vw' as any,
    overflow: 'hidden'
  },
  appContainer: {
    flex: 1,
    backgroundColor: colors.bgPage,
    minHeight: Platform.OS === 'web' ? ('100vh' as any) : undefined,
    width: '100%',
    maxWidth: '100vw' as any,
    overflow: 'hidden'
  }
});
