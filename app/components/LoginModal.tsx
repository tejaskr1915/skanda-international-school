import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, ActivityIndicator, Alert, Platform } from 'react-native';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, borderRadius, spacing, shadows } from '../theme/theme';

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
  defaultMobile?: string;
}

export const LoginModal: React.FC<LoginModalProps> = ({ visible, onClose, defaultMobile = '' }) => {
  const { setAuthSession, navigateTo } = useAuth();
  const [activeTab, setActiveTab] = useState<'otp' | 'password'>('otp');
  const [mobile, setMobile] = useState(defaultMobile);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpPreview, setOtpPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSendOtp = async () => {
    setErrorMessage('');
    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit registered mobile number.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.sendOtp(cleanMobile);
      if (res.success) {
        setOtpSent(true);
        if (res.otpPreview) {
          setOtpPreview(res.otpPreview);
          setOtp(res.otpPreview); // Auto-fill for seamless instant review testing!
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send OTP. Please ensure this number is registered.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setErrorMessage('');
    const cleanMobile = mobile.replace(/\D/g, '');
    if (!otp || otp.trim().length < 4) {
      setErrorMessage('Please enter the 6-digit OTP.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.verifyOtp(cleanMobile, otp.trim());
      if (res.success) {
        onClose();
        setAuthSession(res.token, res.user, res.application);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid OTP code. Please try again or use 123456 in dev mode.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async () => {
    setErrorMessage('');
    const cleanMobile = mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.loginPassword(cleanMobile, password);
      if (res.success) {
        onClose();
        setAuthSession(res.token, res.user, res.application);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid mobile number or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>Student Portal Login</Text>
              <Text style={styles.subtitle}>Resume your application or access student dashboard</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Mode Switcher Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'otp' && styles.tabActive]}
              onPress={() => {
                setActiveTab('otp');
                setErrorMessage('');
              }}
            >
              <Text style={[styles.tabText, activeTab === 'otp' && styles.tabTextActive]}>
                📱 Mobile OTP
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'password' && styles.tabActive]}
              onPress={() => {
                setActiveTab('password');
                setErrorMessage('');
              }}
            >
              <Text style={[styles.tabText, activeTab === 'password' && styles.tabTextActive]}>
                🔑 Password Login
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {!!errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
            </View>
          )}

          {/* Mobile Field (Common) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Registered Mobile Number</Text>
            <View style={styles.phoneInputRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>+91</Text>
              </View>
              <TextInput
                style={styles.phoneInput}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                maxLength={10}
                value={mobile}
                onChangeText={(val) => {
                  setMobile(val);
                  setOtpSent(false);
                  setOtpPreview(null);
                }}
              />
            </View>
          </View>

          {/* TAB 1: OTP FLOW */}
          {activeTab === 'otp' && (
            <View>
              {!otpSent ? (
                <TouchableOpacity
                  style={[styles.primaryBtn, loading && styles.disabledBtn]}
                  onPress={handleSendOtp}
                  disabled={loading}
                  activeOpacity={0.85}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.textInverse} />
                  ) : (
                    <Text style={styles.primaryBtnText}>Send 6-Digit OTP ➜</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <View>
                  {otpPreview && (
                    <View style={styles.otpNotice}>
                      <Text style={styles.otpNoticeText}>
                        🔐 Dev OTP Code: <Text style={styles.otpCodeHighlight}>{otpPreview}</Text>
                      </Text>
                      <Text style={styles.otpNoticeSubtext}>(Auto-populated for instant testing)</Text>
                    </View>
                  )}

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Enter 6-Digit Verification Code</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 543210"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      maxLength={6}
                      value={otp}
                      onChangeText={setOtp}
                    />
                  </View>

                  <TouchableOpacity
                    style={[styles.primaryBtn, loading && styles.disabledBtn]}
                    onPress={handleVerifyOtp}
                    disabled={loading}
                    activeOpacity={0.85}
                  >
                    {loading ? (
                      <ActivityIndicator color={colors.textInverse} />
                    ) : (
                      <Text style={styles.primaryBtnText}>Verify OTP & Resume Application ➜</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity onPress={handleSendOtp} style={styles.resendBtn}>
                    <Text style={styles.resendText}>Didn't receive? Resend OTP</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* TAB 2: PASSWORD FLOW */}
          {activeTab === 'password' && (
            <View>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Your Password</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter your account password"
                    placeholderTextColor={colors.textMuted}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={setPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                  >
                    <Text style={styles.eyeText}>{showPassword ? '👁️' : '🙈'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.disabledBtn]}
                onPress={handlePasswordLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color={colors.textInverse} />
                ) : (
                  <Text style={styles.primaryBtnText}>Log In & Continue ➜</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Bottom link to new registration */}
          <View style={styles.footerNote}>
            <Text style={styles.footerNoteText}>New to Skanda International?</Text>
            <TouchableOpacity
              onPress={() => {
                onClose();
                navigateTo('/apply/step/1');
              }}
            >
              <Text style={styles.registerLink}> Start New Application</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    ...shadows.modal
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.brandDark,
    letterSpacing: -0.5
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.bgPage,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.lg
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: borderRadius.sm
  },
  tabActive: {
    backgroundColor: colors.bgSurface,
    ...shadows.card
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary
  },
  tabTextActive: {
    color: colors.brandPrimary,
    fontWeight: '700'
  },
  errorBox: {
    backgroundColor: colors.statusDangerBg,
    padding: 10,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md
  },
  errorText: {
    fontSize: 12,
    color: colors.statusDanger,
    fontWeight: '600'
  },
  inputGroup: {
    marginBottom: spacing.md
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgSurface,
    overflow: 'hidden'
  },
  countryCode: {
    backgroundColor: colors.bgPage,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRightWidth: 1,
    borderRightColor: colors.borderDefault
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.textPrimary,
    outlineWidth: 0 as any
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: colors.bgSurface,
    outlineWidth: 0 as any
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgSurface
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    color: colors.textPrimary,
    outlineWidth: 0 as any
  },
  eyeBtn: {
    paddingHorizontal: 12
  },
  eyeText: {
    fontSize: 16
  },
  primaryBtn: {
    backgroundColor: colors.brandPrimary,
    borderRadius: borderRadius.md,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    shadowColor: colors.brandPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 3
  },
  primaryBtnText: {
    color: colors.textInverse,
    fontSize: 14,
    fontWeight: '700'
  },
  disabledBtn: {
    opacity: 0.6
  },
  otpNotice: {
    backgroundColor: colors.brandLight,
    padding: 10,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  otpNoticeText: {
    fontSize: 13,
    color: colors.brandDark,
    fontWeight: '600'
  },
  otpCodeHighlight: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.brandPrimary
  },
  otpNoticeSubtext: {
    fontSize: 11,
    color: colors.brandPrimary,
    marginTop: 2
  },
  resendBtn: {
    alignSelf: 'center',
    marginTop: 12
  },
  resendText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brandPrimary
  },
  footerNote: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderDefault
  },
  footerNoteText: {
    fontSize: 13,
    color: colors.textSecondary
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brandPrimary
  }
});
