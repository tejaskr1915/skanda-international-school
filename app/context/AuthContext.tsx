import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import api from '../services/api';

export interface ApplicantUser {
  id: string;
  fullName: string;
  mobile: string;
  email: string;
  isVerified: boolean;
}

export interface ApplicationData {
  id: string;
  applicationNo: string;
  applicantUserId: string;
  academicYear: string;
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED';
  currentStep: number;
  institutionType?: 'SCHOOL' | 'COLLEGE';
  classOrCourse?: string;
  board?: 'CBSE' | 'ICSE_ISC' | 'STATE';
  specializationOrStream?: string;
  mode?: string;
  selectedSubjects?: any;
  studentDetails?: any;
  parentDetails?: any;
  previousEducation?: any;
  facilities?: {
    hostel?: { opted: boolean; roomType?: string | null };
    transport?: { opted: boolean; pickupArea?: string | null };
    library?: boolean;
  };
  documents?: any;
  submittedAt?: string | null;
  updatedAt?: string;
  createdAt?: string;
  applicantUser?: ApplicantUser;
}

export interface PortalUser {
  id: string;
  fullName: string;
  email: string;
  mobile?: string;
  role: string;
  branchId?: string | null;
  branch?: { id: string; code: string; name: string; city: string; institutionMode: string } | null;
  permissions?: Record<string, string[]>;
  department?: string | null;
  children?: any[];
  studentProfile?: any;
}

interface AuthContextType {
  user: ApplicantUser | null;
  application: ApplicationData | null;
  token: string | null;
  portalUser: PortalUser | null;
  portalToken: string | null;
  activeBranchId: string | null;
  activeChildId: string | null;
  isLoading: boolean;
  currentRoute: string;
  navigateTo: (route: string, options?: { replace?: boolean }) => void;
  setAuthSession: (token: string, user: ApplicantUser, application: ApplicationData) => void;
  logout: () => void;
  portalLogin: (email: string, password: string) => Promise<PortalUser>;
  portalLogout: () => void;
  switchBranch: (branchId: string) => void;
  switchChild: (studentId: string) => void;
  refreshApplication: () => Promise<ApplicationData | null>;
  updateApplicationLocally: (application: ApplicationData) => void;
  language: string;
  setLanguage: (lang: string) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ApplicantUser | null>(null);
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [portalUser, setPortalUser] = useState<PortalUser | null>(null);
  const [portalToken, setPortalToken] = useState<string | null>(api.getPortalToken());
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [language, setLanguage] = useState<string>('English');
  const [currentRoute, setCurrentRoute] = useState<string>('/');

  // Synchronize route with browser URL if on Web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const path = window.location.pathname || '/';
      // If submitted, block initial landing on apply wizard
      if (application && application.status !== 'DRAFT' && (path.startsWith('/apply') || path === '/apply')) {
        window.history.replaceState({}, '', '/student/dashboard');
        setCurrentRoute('/student/dashboard');
      } else {
        setCurrentRoute(path);
      }

      const handlePopState = () => {
        const currentPath = window.location.pathname || '/';
        // Submitted Route Guard on Browser Back navigation
        if (application && application.status !== 'DRAFT' && (currentPath.startsWith('/apply') || currentPath === '/apply')) {
          window.history.replaceState({}, '', '/student/dashboard');
          setCurrentRoute('/student/dashboard');
          return;
        }
        setCurrentRoute(currentPath);
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, [application]);

  const navigateTo = (route: string, options?: { replace?: boolean }) => {
    // CRITICAL NAVIGATION GUARD:
    // If application is already SUBMITTED / not DRAFT, block navigating to /apply or wizard steps
    if (user && application && application.status !== 'DRAFT') {
      if (route === '/apply' || route.startsWith('/apply/step/')) {
        route = '/student/dashboard';
        options = { ...options, replace: true };
      }
    }

    // If attempting to go to /student/dashboard while application is DRAFT, redirect to current step
    if (route === '/student/dashboard') {
      if (!user) {
        route = '/apply';
      } else if (application && application.status === 'DRAFT') {
        const step = application.currentStep || 1;
        route = `/apply/step/${step}`;
      }
    }

    setCurrentRoute(route);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      if (options?.replace) {
        window.history.replaceState({}, '', route);
      } else {
        window.history.pushState({}, '', route);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Initial load
  useEffect(() => {
    async function initAuth() {
      try {
        const existingToken = api.getToken();
        if (existingToken) {
          const res = await api.getMe();
          if (res.success && res.application) {
            setUser(res.application.applicantUser || null);
            setApplication(res.application);
            setToken(existingToken);

            // Guard check on initial page load if user landed directly on /student/dashboard
            if (Platform.OS === 'web' && typeof window !== 'undefined') {
              const currentPath = window.location.pathname;
              if (currentPath === '/student/dashboard' && res.application.status === 'DRAFT') {
                const targetStep = `/apply/step/${res.application.currentStep || 1}`;
                setCurrentRoute(targetStep);
                window.history.replaceState({}, '', targetStep);
              }
            }
          }
        }
      } catch (e) {
        console.warn('Session expired or error loading profile:', e);
        api.setToken(null);
        setToken(null);
        setUser(null);
        setApplication(null);
      } finally {
        // Hydrate Phase 2 Portal session if present
        const savedPortalToken = api.getPortalToken();
        if (savedPortalToken) {
          try {
            const pRes = await api.getPortalMe();
            if (pRes.success && pRes.user) {
              setPortalUser(pRes.user);
              if (pRes.user.branchId) {
                setActiveBranchId(pRes.user.branchId);
                api.setActiveBranchId(pRes.user.branchId);
              }
              if (pRes.user.children && pRes.user.children.length > 0) {
                setActiveChildId(pRes.user.children[0].studentId);
              }
            }
          } catch (_) {
            api.setPortalToken(null);
            setPortalToken(null);
          }
        }
        setIsLoading(false);
      }
    }

    initAuth();
  }, []);

  const setAuthSession = (newToken: string, newUser: ApplicantUser, newApp: ApplicationData) => {
    api.setToken(newToken);
    setToken(newToken);
    setUser(newUser);
    setApplication(newApp);

    // Apply strict navigation guard rule:
    // If status !== 'SUBMITTED', automatically redirect to resume at current step!
    if (newApp.status !== 'SUBMITTED') {
      const step = newApp.currentStep || 1;
      navigateTo(`/apply/step/${step}`);
    } else {
      navigateTo('/student/dashboard');
    }
  };

  const logout = () => {
    api.setToken(null);
    setToken(null);
    setUser(null);
    setApplication(null);
    navigateTo('/');
  };

  const portalLogin = async (email: string, password: string): Promise<PortalUser> => {
    const res = await api.portalLogin(email, password);
    api.setPortalToken(res.token);
    setPortalToken(res.token);
    setPortalUser(res.user);
    if (res.user.branchId) {
      setActiveBranchId(res.user.branchId);
      api.setActiveBranchId(res.user.branchId);
    }
    if (res.user.children && res.user.children.length > 0) {
      setActiveChildId(res.user.children[0].studentId);
    }
    if (res.user.role === 'SUPER_ADMIN') {
      navigateTo('/super-admin');
    } else if (res.user.role === 'SECURITY_GUARD') {
      navigateTo('/kiosk/gate');
    } else if (
      [
        'ADMIN',
        'ACCOUNTANT',
        'ADMISSION_OFFICER',
        'EXAM_CONTROLLER',
        'LIBRARIAN',
        'TRANSPORT_MANAGER',
        'DRIVER',
        'HOSTEL_WARDEN',
        'LAB_ASSISTANT',
        'ACTIVITY_COORDINATOR',
        'PLACEMENT_OFFICER'
      ].includes(res.user.role)
    ) {
      navigateTo('/branch-admin');
    } else {
      navigateTo('/portal');
    }
    return res.user;
  };

  // 30-minute inactivity timeout for authenticated portal sessions
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || !portalUser) return;
    let timer: any = null;
    const resetTimer = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        portalLogout();
      }, 30 * 60 * 1000);
    };
    resetTimer();
    const events = ['mousemove', 'keydown', 'click', 'touchstart'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer, { passive: true }));
    return () => {
      if (timer) clearTimeout(timer);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [portalUser?.id]);

  const portalLogout = () => {
    api.setPortalToken(null);
    api.setActiveBranchId(null);
    setPortalToken(null);
    setPortalUser(null);
    setActiveBranchId(null);
    setActiveChildId(null);
    navigateTo('/');
  };

  const switchBranch = (branchId: string) => {
    setActiveBranchId(branchId);
    api.setActiveBranchId(branchId);
  };

  const switchChild = (studentId: string) => {
    setActiveChildId(studentId);
  };

  const refreshApplication = async (): Promise<ApplicationData | null> => {
    try {
      const res = await api.getMe();
      if (res.success && res.application) {
        setApplication(res.application);
        if (res.application.applicantUser) {
          setUser(res.application.applicantUser);
        }
        return res.application;
      }
    } catch (err) {
      console.warn('Error refreshing application:', err);
    }
    return null;
  };

  const updateApplicationLocally = (newApp: ApplicationData) => {
    setApplication(newApp);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        application,
        token,
        portalUser,
        portalToken,
        activeBranchId,
        activeChildId,
        isLoading,
        currentRoute,
        navigateTo,
        setAuthSession,
        logout,
        portalLogin,
        portalLogout,
        switchBranch,
        switchChild,
        refreshApplication,
        updateApplicationLocally,
        language,
        setLanguage
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
export default AuthContext;
