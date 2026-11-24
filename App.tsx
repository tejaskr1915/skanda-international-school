import React from 'react';
import { StyleSheet, View, SafeAreaView, StatusBar, Platform } from 'react-native';
import { AuthProvider, useAuth } from './app/context/AuthContext';
import { HomeScreen } from './app/screens/HomeScreen';
import { ApplyLandingScreen } from './app/screens/ApplyLandingScreen';
import { AdmissionWizardScreen } from './app/screens/AdmissionWizardScreen';
import { StudentDashboardScreen } from './app/screens/StudentDashboardScreen';
import { colors } from './app/theme/theme';

const MainNavigator: React.FC = () => {
  const { currentRoute, application, user } = useAuth();

  const renderCurrentScreen = () => {
    // 1. Home Page
    if (currentRoute === '/' || currentRoute === '') {
      return <HomeScreen />;
    }

    // 2. Apply Landing
    if (currentRoute === '/apply') {
      return <ApplyLandingScreen />;
    }

    // 3. Multi-Step Wizard (/apply/step/1 through /apply/step/9)
    if (currentRoute.startsWith('/apply/step/')) {
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

    // Default fallback to Home
    return <HomeScreen />;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={colors.brandDark} />
      <View style={styles.appContainer}>
        {renderCurrentScreen()}
      </View>
    </SafeAreaView>
  );
};

// Global responsive web styles to prevent horizontal overflow on mobile viewports
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
