import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { borderRadius, spacing, shadows } from '../theme/theme';
import { SchoolLogoBadge } from '../components/SchoolLogoBadge';
import { AnimatedHoverCard, AnimatedButton } from '../components/AnimatedUI';

export const GateKioskScreen: React.FC = () => {
  const { navigateTo } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [visitors, setVisitors] = useState<any[]>([]);
  const [notice, setNotice] = useState('');

  // Visitor OTP Check-In
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [purpose, setPurpose] = useState('');
  const [hostAdmissionNo, setHostAdmissionNo] = useState('');
  const [pendingVisitorId, setPendingVisitorId] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState('');

  // QR Scanner
  const [qrInput, setQrInput] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);

  const loadKiosk = async (branchIdOverride?: string) => {
    try {
      const bRes = await api.getKioskBranches();
      const bList = bRes.branches || [];
      setBranches(bList);
      const bId = branchIdOverride || selectedBranchId || bList[0]?.id || '';
      if (bId && !selectedBranchId) setSelectedBranchId(bId);
      const vRes = await api.getKioskVisitors(bId);
      setVisitors(vRes.visitors || []);
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    }
  };

  useEffect(() => {
    loadKiosk();
  }, []);

  const handleRequestOtp = async () => {
    if (!visitorName.trim() || !visitorPhone.trim() || !purpose.trim()) {
      setNotice('⚠️ Enter Visitor Name, Phone, and Purpose.');
      return;
    }
    try {
      const res = await api.requestVisitorOtp({
        branchId: selectedBranchId,
        visitorName,
        visitorPhone,
        purpose,
        hostStudentAdmissionNo: hostAdmissionNo || undefined
      });
      setPendingVisitorId(res.visitorLog.id);
      setNotice(`🔐 Gate OTP sent to ${visitorPhone} (Demo OTP: ${res.devOtp})`);
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    }
  };

  const handleVerifyOtp = async () => {
    if (!pendingVisitorId || !otpInput.trim()) return;
    try {
      const res = await api.verifyVisitorOtp({ visitorLogId: pendingVisitorId, otpCode: otpInput.trim() });
      setNotice(`✅ Visitor Checked In! Pass QR: ${res.visitorPass?.qrPayload}`);
      setPendingVisitorId(null);
      setOtpInput('');
      setVisitorName('');
      setVisitorPhone('');
      setPurpose('');
      setHostAdmissionNo('');
      loadKiosk(selectedBranchId);
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    }
  };

  const handleScanQr = async () => {
    if (!qrInput.trim()) return;
    try {
      const res = await api.scanGatePassQr(qrInput.trim());
      setScanResult(res);
      setNotice(`✅ ${res.action}: ${res.pass?.student?.user?.fullName || res.pass?.reason}`);
      setQrInput('');
    } catch (e: any) {
      setScanResult({ success: false, message: e.message });
      setNotice(`⚠️ ${e.message}`);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <SchoolLogoBadge size={40} />
          <View>
            <Text style={styles.brandTitle}>Smart Campus Gate & Visitor Kiosk</Text>
            <Text style={styles.brandSub}>Skanda International School • Security Tablet Mode (/kiosk/gate)</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigateTo('/')}>
          <Text style={styles.backBtnText}>← Back to Home</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 48 }}>
        <View style={styles.contentWrap}>
          {/* Branch Selector */}
          <View style={styles.chipRow}>
            {branches.map((b) => (
              <TouchableOpacity
                key={b.id}
                style={[styles.chip, selectedBranchId === b.id && styles.chipActive]}
                onPress={() => {
                  setSelectedBranchId(b.id);
                  loadKiosk(b.id);
                }}
              >
                <Text style={[styles.chipText, selectedBranchId === b.id && styles.chipTextActive]}>{b.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {notice ? (
            <View style={styles.noticeBanner}>
              <Text style={styles.noticeText}>{notice}</Text>
              <TouchableOpacity onPress={() => setNotice('')}>
                <Text style={styles.dismissText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.twoColGrid}>
            {/* QR Gate-Pass Scanner */}
            <AnimatedHoverCard style={styles.colCard}>
              <Text style={styles.cardTitle}>📷 Cryptographic QR Gate-Pass Scanner</Text>
              <Text style={styles.itemSub}>
                Scan or paste student Out-Pass, Early Pickup, or Visitor QR token to log Exit / Entry timestamps.
              </Text>
              <TextInput
                style={[styles.input, { marginTop: 12 }]}
                placeholder="Paste QR Payload (e.g. SKD-GP:...)"
                value={qrInput}
                onChangeText={setQrInput}
              />
              <AnimatedButton style={styles.primaryBtn} onPress={handleScanQr}>
                <Text style={styles.primaryBtnText}>Verify & Log Gate Scan</Text>
              </AnimatedButton>

              {scanResult && (
                <View style={[styles.scanBox, scanResult.success ? styles.scanOk : styles.scanErr]}>
                  <Text style={styles.itemTitle}>
                    {scanResult.success ? `✅ ${scanResult.action}` : `❌ Scan Rejected`}
                  </Text>
                  {scanResult.pass ? (
                    <>
                      <Text style={styles.itemSub}>
                        Pass Type: {scanResult.pass.passType} • Status: {scanResult.pass.status}
                      </Text>
                      <Text style={styles.itemSub}>
                        Exit: {scanResult.pass.exitScannedAt ? new Date(scanResult.pass.exitScannedAt).toLocaleTimeString() : '—'} | Entry:{' '}
                        {scanResult.pass.entryScannedAt ? new Date(scanResult.pass.entryScannedAt).toLocaleTimeString() : '—'}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.itemSub}>{scanResult.message}</Text>
                  )}
                </View>
              )}
            </AnimatedHoverCard>

            {/* OTP-Verified Visitor Check-In */}
            <AnimatedHoverCard style={styles.colCard}>
              <Text style={styles.cardTitle}>🪪 OTP-Verified Visitor Check-In</Text>
              {!pendingVisitorId ? (
                <>
                  <TextInput style={styles.input} placeholder="Visitor Full Name" value={visitorName} onChangeText={setVisitorName} />
                  <TextInput style={styles.input} placeholder="Mobile Number" value={visitorPhone} onChangeText={setVisitorPhone} keyboardType="phone-pad" />
                  <TextInput style={styles.input} placeholder="Purpose of Visit" value={purpose} onChangeText={setPurpose} />
                  <TextInput style={styles.input} placeholder="Host Student Admission No (optional)" value={hostAdmissionNo} onChangeText={setHostAdmissionNo} />
                  <AnimatedButton style={styles.primaryBtn} onPress={handleRequestOtp}>
                    <Text style={styles.primaryBtnText}>Send Gate OTP</Text>
                  </AnimatedButton>
                </>
              ) : (
                <>
                  <Text style={styles.itemSub}>Enter 6-digit OTP to verify visitor & issue gate pass:</Text>
                  <TextInput style={[styles.input, { marginTop: 8 }]} placeholder="6-Digit OTP" value={otpInput} onChangeText={setOtpInput} keyboardType="numeric" />
                  <View style={styles.rowActions}>
                    <AnimatedButton style={styles.primaryBtn} onPress={handleVerifyOtp}>
                      <Text style={styles.primaryBtnText}>Verify OTP & Check In</Text>
                    </AnimatedButton>
                    <TouchableOpacity style={styles.outlineBtn} onPress={() => setPendingVisitorId(null)}>
                      <Text style={styles.outlineBtnText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </AnimatedHoverCard>
          </View>

          {/* Recent Visitor Logs */}
          <AnimatedHoverCard style={styles.card}>
            <Text style={styles.cardTitle}>Recent Gate Visitor Logs ({visitors.length})</Text>
            {visitors.map((v) => (
              <View key={v.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {v.visitorName} ({v.visitorPhone}) — {v.purpose}
                  </Text>
                  <Text style={styles.itemSub}>
                    OTP: {v.otpVerified ? 'Verified' : 'Pending'} • In:{' '}
                    {v.checkedInAt ? new Date(v.checkedInAt).toLocaleTimeString() : '—'} • Out:{' '}
                    {v.checkedOutAt ? new Date(v.checkedOutAt).toLocaleTimeString() : 'Active'}
                  </Text>
                </View>
                {v.otpVerified && !v.checkedOutAt && (
                  <AnimatedButton
                    style={styles.outlineBtn}
                    onPress={async () => {
                      await api.checkoutVisitor(v.id);
                      loadKiosk(selectedBranchId);
                    }}
                  >
                    <Text style={styles.outlineBtnText}>Check Out</Text>
                  </AnimatedButton>
                )}
              </View>
            ))}
          </AnimatedHoverCard>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  topBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  brandSub: { fontSize: 12, color: '#64748B' },
  backBtn: { borderWidth: 1, borderColor: '#CBD5E1', paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.md },
  backBtnText: { fontWeight: '700', color: '#334155', fontSize: 13 },
  body: { flex: 1 },
  contentWrap: { width: '100%', maxWidth: 1120, alignSelf: 'center', padding: spacing.lg, gap: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1' },
  chipActive: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  chipText: { fontSize: 13, fontWeight: '700', color: '#334155' },
  chipTextActive: { color: '#FFFFFF' },
  noticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    padding: spacing.md,
    borderRadius: borderRadius.md
  },
  noticeText: { color: '#1E3A8A', fontWeight: '700', flex: 1 },
  dismissText: { color: '#1D4ED8', fontWeight: '800', fontSize: 16, paddingLeft: 12 },
  twoColGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  colCard: {
    flex: 1,
    minWidth: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#F8FAFC',
    marginBottom: spacing.sm
  },
  primaryBtn: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    alignSelf: 'flex-start'
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  outlineBtn: { borderWidth: 1, borderColor: '#CBD5E1', paddingHorizontal: 14, paddingVertical: 9, borderRadius: borderRadius.md },
  outlineBtnText: { color: '#334155', fontWeight: '700', fontSize: 13 },
  rowActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  scanBox: { marginTop: spacing.md, padding: spacing.md, borderRadius: borderRadius.md, borderWidth: 1 },
  scanOk: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  scanErr: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  listRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: spacing.sm
  },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  itemSub: { fontSize: 12, color: '#64748B', marginTop: 2 }
});
