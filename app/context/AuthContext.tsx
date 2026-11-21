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

interface AuthContextType {
  user: ApplicantUser | null;
  application: ApplicationData | null;
  token: string | null;
  isLoading: boolean;
  currentRoute: string;
  navigateTo: (route: string) => void;
  setAuthSession: (token: string, user: ApplicantUser, application: ApplicationData) => void;
  logout: () => void;
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [language, setLanguage] = useState<string>('English');
  const [currentRoute, setCurrentRoute] = useState<string>('/');

  // Synchronize route with browser URL if on Web
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const path = window.location.pathname || '/';
      setCurrentRoute(path);

      const handlePopState = () => {
        setCurrentRoute(window.location.pathname || '/');
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  const navigateTo = (route: string) => {
    // CRITICAL NAVIGATION GUARD:
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
      window.history.pushState({}, '', route);
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
        isLoading,
        currentRoute,
        navigateTo,
        setAuthSession,
        logout,
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
