import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { borderRadius, spacing, shadows } from '../theme/theme';
import { SchoolLogoBadge } from '../components/SchoolLogoBadge';
import { AnimatedHoverCard, AnimatedButton } from '../components/AnimatedUI';
import { LibraryWorkspace } from '../components/LibraryWorkspace';
import { TransportWorkspace } from '../components/TransportWorkspace';
import { HostelWorkspace } from '../components/HostelWorkspace';
import { CommsPtmWorkspace } from '../components/CommsPtmWorkspace';
import { Sprint7Workspace } from '../components/Sprint7Workspace';

type AdminTab = 'kpis' | 'admissions' | 'attendance' | 'leaves' | 'exams' | 'fees' | 'cms' | 'library' | 'transport' | 'hostel' | 'comms' | 'campus_ops';

export const BranchAdminScreen: React.FC = () => {
  const { portalUser, portalLogout, navigateTo } = useAuth();
  const [lang, setLang] = useState<'EN' | 'HI' | 'KN'>('EN');
  const [activeTab, setActiveTab] = useState<AdminTab>(
    portalUser?.role === 'LIBRARIAN'
      ? 'library'
      : portalUser?.role === 'TRANSPORT_MANAGER' || portalUser?.role === 'DRIVER'
        ? 'transport'
        : portalUser?.role === 'HOSTEL_WARDEN'
          ? 'hostel'
          : ['LAB_ASSISTANT', 'ACTIVITY_COORDINATOR', 'PLACEMENT_OFFICER'].includes(portalUser?.role || '')
            ? 'campus_ops'
            : 'kpis'
  );
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const [branchInfo, setBranchInfo] = useState<any>(null);
  const [kpis, setKpis] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [subRecs, setSubRecs] = useState<{ leaveId: string; teachers: any[] } | null>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [cmsList, setCmsList] = useState<any[]>([]);
  const [cmsTitle, setCmsTitle] = useState('');
  const [cmsBody, setCmsBody] = useState('');

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const kpiRes = await api.getBranchKpis();
      setBranchInfo(kpiRes.branch);
      setKpis(kpiRes.kpis);

      const results = await Promise.allSettled([
        api.getBranchApplications(),
        api.getBranchAttendance(),
        api.getBranchLeaves(),
        api.getBranchExams(),
        api.getBranchFees(),
        api.getBranchCms()
      ]);

      if (results[0].status === 'fulfilled') setApplications(results[0].value.applications || []);
      if (results[1].status === 'fulfilled') setAttendanceRecords(results[1].value.records || []);
      if (results[2].status === 'fulfilled') setLeaves(results[2].value.leaves || []);
      if (results[3].status === 'fulfilled') setExams(results[3].value.exams || []);
      if (results[4].status === 'fulfilled') setInvoices(results[4].value.invoices || []);
      if (results[5].status === 'fulfilled') setCmsList(results[5].value.contents || []);
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleConvert = async (appId: string) => {
    try {
      const res = await api.convertApplicationToStudent(appId, 'A');
      setNotice(
        `✅ ${res.message} | Student: ${res.provisioned.studentEmail} | Parent: ${res.provisioned.parentEmail} (Pwd: Password@123)`
      );
      loadDashboard();
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <SchoolLogoBadge size={38} />
          <View>
            <Text style={styles.brandTitle}>{branchInfo?.name || 'Branch Admin Portal'}</Text>
            <Text style={styles.brandSub}>
              {portalUser?.fullName} • Role: {portalUser?.role}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={[styles.logoutBtn, { borderColor: '#E2E8F0' }]}
            onPress={() => setLang(lang === 'EN' ? 'HI' : lang === 'HI' ? 'KN' : 'EN')}
          >
            <Text style={styles.logoutText}>🌐 {lang}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.logoutBtn, { borderColor: '#BFDBFE' }]} onPress={() => navigateTo('/kiosk/gate')}>
            <Text style={[styles.logoutText, { color: '#1D4ED8' }]}>Gate Kiosk ↗</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={portalLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsBar}
        contentContainerStyle={{ gap: 8, paddingHorizontal: spacing.lg, paddingVertical: 10 }}
      >
        {[
          { id: 'kpis', label: '📊 Executive KPIs' },
          { id: 'admissions', label: '📝 Admissions CRM' },
          { id: 'attendance', label: '📅 Attendance' },
          { id: 'leaves', label: '🗓️ Leaves & Auto-Sub' },
          { id: 'exams', label: '🎓 Exams & QR Tickets' },
          { id: 'fees', label: '💳 Fees & Scholarships' },
          { id: 'cms', label: '📢 Campus CMS' },
          { id: 'library', label: '📚 Library' },
          { id: 'transport', label: '🚌 Transport' },
          { id: 'hostel', label: '🏠 Hostel & No-Dues' },
          { id: 'comms', label: '💬 PTM & Comms' },
          { id: 'campus_ops', label: '🔬 Labs, Rollover & Placement' }
        ].map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabPill, activeTab === t.id && styles.tabPillActive]}
            onPress={() => setActiveTab(t.id as AdminTab)}
          >
            <Text style={[styles.tabText, activeTab === t.id && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {!!notice && (
        <View style={styles.noticeBar}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#1D4ED8" />
        </View>
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 48 }}>
          <View style={styles.contentWrap}>
            {activeTab === 'kpis' && kpis && (
              <View style={styles.kpiGrid}>
                <AnimatedHoverCard style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>{kpis.totalStudents}</Text>
                  <Text style={styles.kpiLabel}>Total Enrolled Students</Text>
                </AnimatedHoverCard>
                <AnimatedHoverCard style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>{kpis.attendancePct}%</Text>
                  <Text style={styles.kpiLabel}>Campus Attendance Rate</Text>
                </AnimatedHoverCard>
                <AnimatedHoverCard style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>{kpis.pendingApplications}</Text>
                  <Text style={styles.kpiLabel}>Pending Applications</Text>
                </AnimatedHoverCard>
                <AnimatedHoverCard style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>₹{kpis.feeCollected.toLocaleString()}</Text>
                  <Text style={styles.kpiLabel}>Fees Collected (Dues: ₹{kpis.feeDues.toLocaleString()})</Text>
                </AnimatedHoverCard>
                <AnimatedHoverCard style={styles.kpiCard}>
                  <Text style={styles.kpiValue}>{kpis.pendingTeacherLeaves}</Text>
                  <Text style={styles.kpiLabel}>Pending Teacher Leaves</Text>
                </AnimatedHoverCard>
              </View>
            )}

            {activeTab === 'admissions' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📝 Branch Admissions CRM & One-Click Conversion</Text>
                {applications.map((app) => (
                  <View key={app.id} style={styles.rowCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>
                        {app.applicationNo} — {app.studentDetails?.firstName
                          ? `${app.studentDetails.firstName} ${app.studentDetails.lastName}`
                          : app.studentDetails?.fullName || app.applicantUser?.fullName}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {app.classOrCourse} ({app.institutionType}) • Status: <Text style={{ fontWeight: '800', color: '#1D4ED8' }}>{app.status}</Text>
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {app.status !== 'ENROLLED' && (
                        <>
                          <TouchableOpacity
                            style={styles.smallOutlineBtn}
                            onPress={async () => {
                              await api.updateBranchApplicationStatus(app.id, 'SHORTLISTED');
                              setNotice(`✅ Marked ${app.applicationNo} as SHORTLISTED`);
                              loadDashboard();
                            }}
                          >
                            <Text style={styles.smallOutlineText}>Shortlist</Text>
                          </TouchableOpacity>
                          <AnimatedButton style={styles.convertBtn} onPress={() => handleConvert(app.id)}>
                            <Text style={styles.convertBtnText}>⚡ Convert to Student</Text>
                          </AnimatedButton>
                        </>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'attendance' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📅 Attendance Monitor & Principal Override</Text>
                {attendanceRecords.map((rec) => (
                  <View key={rec.id} style={styles.rowCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>
                        {rec.studentName} ({rec.rollNumber})
                      </Text>
                      <Text style={styles.rowMeta}>
                        {rec.date} • {rec.classOrCourse} • Current: <Text style={{ fontWeight: '800' }}>{rec.status}</Text>
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.smallOutlineBtn}
                      onPress={async () => {
                        const next = rec.status === 'PRESENT' ? 'ABSENT' : 'PRESENT';
                        await api.overrideAttendance(rec.id, next);
                        setNotice(`✅ Overrode ${rec.studentName} to ${next}`);
                        loadDashboard();
                      }}
                    >
                      <Text style={styles.smallOutlineText}>Toggle Present/Absent</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'leaves' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🗓️ Teacher & Student Leave Requests + Auto-Substitution</Text>
                {leaves.map((l) => (
                  <View key={l.id} style={styles.rowCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>
                        {l.requesterName} ({l.requesterType}) — {l.status}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {l.fromDate} to {l.toDate} • {l.reason}
                      </Text>
                    </View>
                    {l.status === 'PENDING' && (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {l.requesterType === 'TEACHER' && (
                          <TouchableOpacity
                            style={styles.smallOutlineBtn}
                            onPress={async () => {
                              const recRes = await api.getLeaveSubstituteRecommendations(l.id);
                              setSubRecs({ leaveId: l.id, teachers: recRes.recommendedTeachers || [] });
                            }}
                          >
                            <Text style={styles.smallOutlineText}>Find Substitute</Text>
                          </TouchableOpacity>
                        )}
                        <AnimatedButton
                          style={styles.convertBtn}
                          onPress={async () => {
                            await api.approveLeaveRequest(l.id, { status: 'APPROVED' });
                            setNotice('✅ Leave approved.');
                            loadDashboard();
                          }}
                        >
                          <Text style={styles.convertBtnText}>Approve</Text>
                        </AnimatedButton>
                      </View>
                    )}
                  </View>
                ))}

                {subRecs && (
                  <View style={styles.subBox}>
                    <Text style={styles.rowTitle}>⚡ Auto-Substitution Recommendations:</Text>
                    {subRecs.teachers.map((t) => (
                      <View key={t.id} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                        <Text style={styles.rowMeta}>{t.fullName} ({t.department})</Text>
                        <AnimatedButton
                          style={styles.convertBtn}
                          onPress={async () => {
                            await api.approveLeaveRequest(subRecs.leaveId, {
                              status: 'APPROVED',
                              substituteTeacherId: t.id
                            });
                            setSubRecs(null);
                            setNotice(`✅ Approved leave & assigned substitute: ${t.fullName}`);
                            loadDashboard();
                          }}
                        >
                          <Text style={styles.convertBtnText}>Assign & Approve</Text>
                        </AnimatedButton>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {activeTab === 'exams' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>🎓 Exam Results Lock/Publish & QR Hall Tickets</Text>
                {exams.map((ex) => (
                  <View key={ex.id} style={styles.rowCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{ex.name}</Text>
                      <Text style={styles.rowMeta}>
                        {ex.classOrCourse} • Date: {ex.examDate} • Published: {ex.isPublished ? 'YES' : 'NO'} • Hall Tickets: {ex._count?.hallTickets || 0}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={styles.smallOutlineBtn}
                        onPress={async () => {
                          const r = await api.issueExamHallTickets(ex.id);
                          setNotice(`✅ Issued ${r.issuedCount} encrypted QR Hall Tickets.`);
                          loadDashboard();
                        }}
                      >
                        <Text style={styles.smallOutlineText}>Issue QR Hall Tickets</Text>
                      </TouchableOpacity>
                      <AnimatedButton
                        style={styles.convertBtn}
                        onPress={async () => {
                          await api.publishExamResults(ex.id);
                          setNotice(`✅ Locked & published results for ${ex.name}`);
                          loadDashboard();
                        }}
                      >
                        <Text style={styles.convertBtnText}>Lock & Publish</Text>
                      </AnimatedButton>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'fees' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>💳 Fee Invoices, Scholarships & Priority Allocation (Fines ➜ Tuition ➜ Transport)</Text>
                {invoices.map((inv) => (
                  <View key={inv.id} style={styles.rowCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>
                        {inv.invoiceNo} — {inv.studentName} ({inv.rollNumber})
                      </Text>
                      <Text style={styles.rowMeta}>
                        Fines: ₹{inv.finesDue} | Tuition: ₹{inv.tuitionDue} | Transport: ₹{inv.transportDue} | Paid: ₹{inv.totalPaid} ({inv.status})
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <TouchableOpacity
                        style={styles.smallOutlineBtn}
                        onPress={async () => {
                          await api.applyScholarship(inv.id, 10000);
                          setNotice(`✅ Applied ₹10,000 Merit Scholarship to ${inv.invoiceNo}`);
                          loadDashboard();
                        }}
                      >
                        <Text style={styles.smallOutlineText}>+₹10k Scholarship</Text>
                      </TouchableOpacity>
                      {inv.status !== 'PAID' && (
                        <AnimatedButton
                          style={styles.convertBtn}
                          onPress={async () => {
                            const res = await api.recordBranchFeePayment(inv.id, 15000);
                            setNotice(
                              `✅ Paid ₹15,000 (Allocated -> Fines: ₹${res.transaction.allocatedToFines}, Tuition: ₹${res.transaction.allocatedToTuition}, Transport: ₹${res.transaction.allocatedToTransport})`
                            );
                            loadDashboard();
                          }}
                        >
                          <Text style={styles.convertBtnText}>Record ₹15,000</Text>
                        </AnimatedButton>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'cms' && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>📢 Branch Announcements & CMS Banners</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Announcement Title..."
                  value={cmsTitle}
                  onChangeText={setCmsTitle}
                />
                <TextInput
                  style={[styles.input, { marginTop: 8, height: 70 }]}
                  placeholder="Announcement Details..."
                  multiline
                  value={cmsBody}
                  onChangeText={setCmsBody}
                />
                <AnimatedButton
                  style={[styles.convertBtn, { alignSelf: 'flex-start', marginTop: 10, marginBottom: 16 }]}
                  onPress={async () => {
                    if (!cmsTitle.trim() || !cmsBody.trim()) return;
                    await api.createBranchCms({ title: cmsTitle, body: cmsBody, category: 'ANNOUNCEMENT' });
                    setCmsTitle('');
                    setCmsBody('');
                    setNotice('✅ Published branch announcement.');
                    loadDashboard();
                  }}
                >
                  <Text style={styles.convertBtnText}>Publish Announcement ➜</Text>
                </AnimatedButton>

                {cmsList.map((c) => (
                  <View key={c.id} style={styles.rowCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{c.title}</Text>
                      <Text style={styles.rowMeta}>{c.body}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {activeTab === 'library' && <LibraryWorkspace mode="admin" />}

            {activeTab === 'transport' && (
              <TransportWorkspace mode={portalUser?.role === 'DRIVER' ? 'driver' : 'admin'} />
            )}

            {activeTab === 'hostel' && <HostelWorkspace mode="admin" />}

            {activeTab === 'comms' && <CommsPtmWorkspace mode="admin" />}

            {activeTab === 'campus_ops' && (
              <Sprint7Workspace
                mode="admin"
                defaultSection={
                  portalUser?.role === 'ACTIVITY_COORDINATOR'
                    ? 'activities'
                    : portalUser?.role === 'PLACEMENT_OFFICER'
                      ? 'placement'
                      : 'labs'
                }
              />
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  topBar: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  brandSub: { fontSize: 12, color: '#1D4ED8', fontWeight: '600' },
  logoutBtn: { backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  logoutText: { color: '#DC2626', fontSize: 13, fontWeight: '700' },
  tabsBar: { backgroundColor: '#FFFFFF', maxHeight: 58, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tabPill: { backgroundColor: '#F8FAFC', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#E2E8F0' },
  tabPillActive: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  tabTextActive: { color: '#FFFFFF' },
  noticeBar: { backgroundColor: '#DBEAFE', padding: 10, paddingHorizontal: spacing.lg },
  noticeText: { color: '#1E3A8A', fontSize: 13, fontWeight: '700' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body: { flex: 1, padding: spacing.lg },
  contentWrap: { maxWidth: 1200, width: '100%', alignSelf: 'center', gap: 16 },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  kpiCard: {
    flex: 1,
    minWidth: 210,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card
  },
  kpiValue: { fontSize: 28, fontWeight: '900', color: '#1D4ED8', marginBottom: 4 },
  kpiLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card
  },
  cardTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: 12 },
  rowCard: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  rowMeta: { fontSize: 13, color: '#475569', marginTop: 2 },
  smallOutlineBtn: { borderWidth: 1, borderColor: '#1D4ED8', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  smallOutlineText: { color: '#1D4ED8', fontSize: 12, fontWeight: '700' },
  convertBtn: { backgroundColor: '#1D4ED8', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 6 },
  convertBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  subBox: { marginTop: 14, padding: 14, backgroundColor: '#EFF6FF', borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, backgroundColor: '#FFFFFF' }
});
