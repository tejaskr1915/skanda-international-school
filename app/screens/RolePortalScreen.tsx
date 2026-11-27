import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform
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

export const RolePortalScreen: React.FC = () => {
  const { portalUser, portalLogout, activeChildId, switchChild } = useAuth();
  const isTeacher = portalUser?.role === 'TEACHER';
  const isParent = portalUser?.role === 'PARENT';

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  // Student / Parent View Data
  const [studentData, setStudentData] = useState<any>(null);
  const [homeworkInputs, setHomeworkInputs] = useState<Record<string, string>>({});

  // Teacher View Data
  const [teacherData, setTeacherData] = useState<any>(null);
  const [offlineQueue, setOfflineQueue] = useState<Record<string, 'PRESENT' | 'ABSENT' | 'LATE'>>({});
  const [hwTitle, setHwTitle] = useState('');
  const [hwSubject, setHwSubject] = useState('Mathematics Standard');
  const [hwDesc, setHwDesc] = useState('');
  const [markStudentId, setMarkStudentId] = useState('');
  const [markScore, setMarkScore] = useState('');

  // Leave Form
  const [leaveFrom, setLeaveFrom] = useState('2026-12-01');
  const [leaveTo, setLeaveTo] = useState('2026-12-02');
  const [leaveReason, setLeaveReason] = useState('');

  const loadPortal = async (childIdOverride?: string) => {
    setLoading(true);
    try {
      if (isTeacher) {
        const res = await api.getTeacherPortalView();
        setTeacherData(res);
        if (res.students?.length > 0 && !markStudentId) {
          setMarkStudentId(res.students[0].id);
        }
        // Load any offline-cached attendance from localStorage
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          const cached = window.localStorage.getItem('skanda_offline_attendance');
          if (cached) {
            setOfflineQueue(JSON.parse(cached));
          }
        }
      } else {
        const targetChild = childIdOverride || activeChildId || undefined;
        const res = await api.getStudentPortalView(targetChild);
        setStudentData(res);
      }
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPortal();
  }, [activeChildId, portalUser?.role]);

  const handleStageAttendance = (studentId: string, status: 'PRESENT' | 'ABSENT' | 'LATE') => {
    const updated = { ...offlineQueue, [studentId]: status };
    setOfflineQueue(updated);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem('skanda_offline_attendance', JSON.stringify(updated));
    }
  };

  const handleSyncOfflineAttendance = async () => {
    const entries = Object.entries(offlineQueue).map(([studentId, status]) => ({
      studentId,
      status,
      date: new Date().toISOString().split('T')[0],
      offlineCapturedAt: new Date().toISOString()
    }));
    if (entries.length === 0) {
      setNotice('⚠️ Mark at least one student before syncing.');
      return;
    }
    try {
      const res = await api.syncTeacherAttendance(entries);
      setOfflineQueue({});
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.localStorage.removeItem('skanda_offline_attendance');
      }
      setNotice(`✅ Synced ${res.syncedCount} offline-cached attendance records to MySQL!`);
    } catch (e: any) {
      setNotice(`⚠️ Offline cache retained (sync failed): ${e.message}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar with Multi-Child Switcher for Parents */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <SchoolLogoBadge size={38} />
          <View>
            <Text style={styles.brandTitle}>
              {isTeacher ? 'Skanda Faculty Portal' : isParent ? 'Skanda Parent Portal' : 'Skanda Student Portal'}
            </Text>
            <Text style={styles.brandSub}>
              {portalUser?.fullName} • {portalUser?.branch?.name || 'Bengaluru Campus'}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          {isParent && portalUser?.children && portalUser.children.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {portalUser.children.map((child: any) => {
                const isSelected = (activeChildId || portalUser.children?.[0]?.studentId) === child.studentId;
                return (
                  <TouchableOpacity
                    key={child.studentId}
                    style={[styles.childPill, isSelected && styles.childPillActive]}
                    onPress={() => {
                      switchChild(child.studentId);
                      loadPortal(child.studentId);
                    }}
                  >
                    <Text style={[styles.childPillText, isSelected && styles.childPillTextActive]}>
                      👧 {child.fullName} ({child.classOrCourse})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <TouchableOpacity style={styles.logoutBtn} onPress={portalLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

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
            {/* ============================================================== */}
            {/* TEACHER PORTAL VIEW */}
            {/* ============================================================== */}
            {isTeacher && teacherData && (
              <>
                {/* Offline-Cached Attendance Card */}
                <View style={styles.card}>
                  <View style={styles.cardHeaderRow}>
                    <View>
                      <Text style={styles.cardTitle}>📶 Offline-Cached Class Attendance</Text>
                      <Text style={styles.cardMeta}>
                        Staged offline queue: {Object.keys(offlineQueue).length} student(s) ready to sync
                      </Text>
                    </View>
                    <AnimatedButton style={styles.primaryBtn} onPress={handleSyncOfflineAttendance}>
                      <Text style={styles.primaryBtnText}>Sync Queue to Server ➜</Text>
                    </AnimatedButton>
                  </View>

                  {teacherData.students.map((st: any) => {
                    const staged = offlineQueue[st.id];
                    return (
                      <View key={st.id} style={styles.rowCard}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.rowTitle}>
                            {st.fullName} ({st.rollNumber})
                          </Text>
                          <Text style={styles.rowMeta}>
                            {st.classOrCourse} • Section {st.section}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                          {(['PRESENT', 'ABSENT', 'LATE'] as const).map((status) => (
                            <TouchableOpacity
                              key={status}
                              style={[styles.statusChip, staged === status && styles.statusChipActive]}
                              onPress={() => handleStageAttendance(st.id, status)}
                            >
                              <Text style={[styles.statusChipText, staged === status && styles.statusChipTextActive]}>
                                {status}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                    );
                  })}
                </View>

                {/* Timetable & Homework Posting */}
                <View style={styles.gridRow}>
                  <View style={styles.halfCard}>
                    <Text style={styles.cardTitle}>🕒 My Teaching Timetable</Text>
                    {teacherData.timetable.map((slot: any) => (
                      <Text key={slot.id} style={styles.listItem}>
                        • {slot.dayOfWeek} P{slot.periodNo} ({slot.timeRange}): {slot.subject} ({slot.classOrCourse})
                      </Text>
                    ))}
                  </View>

                  <View style={styles.halfCard}>
                    <Text style={styles.cardTitle}>📝 Post Homework Assignment</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Assignment Title"
                      value={hwTitle}
                      onChangeText={setHwTitle}
                    />
                    <TextInput
                      style={[styles.input, { marginTop: 8 }]}
                      placeholder="Subject"
                      value={hwSubject}
                      onChangeText={setHwSubject}
                    />
                    <TextInput
                      style={[styles.input, { marginTop: 8 }]}
                      placeholder="Instructions..."
                      value={hwDesc}
                      onChangeText={setHwDesc}
                    />
                    <AnimatedButton
                      style={[styles.primaryBtn, { alignSelf: 'flex-start', marginTop: 10 }]}
                      onPress={async () => {
                        if (!hwTitle.trim()) return;
                        await api.createTeacherAssignment({
                          classOrCourse: 'Grade 10',
                          subject: hwSubject,
                          title: hwTitle,
                          description: hwDesc
                        });
                        setHwTitle('');
                        setHwDesc('');
                        setNotice('✅ Homework assignment posted.');
                        loadPortal();
                      }}
                    >
                      <Text style={styles.primaryBtnText}>Publish Homework</Text>
                    </AnimatedButton>
                  </View>
                </View>

                {/* Exam Marks Entry */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>📊 Quick Exam Marks Entry</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                    <TextInput
                      style={[styles.input, { minWidth: 140 }]}
                      placeholder="Marks (0-100)"
                      keyboardType="numeric"
                      value={markScore}
                      onChangeText={setMarkScore}
                    />
                    <AnimatedButton
                      style={styles.primaryBtn}
                      onPress={async () => {
                        if (!teacherData.exams?.[0] || !markStudentId || !markScore) return;
                        await api.enterExamMarks({
                          examId: teacherData.exams[0].id,
                          studentId: markStudentId,
                          subject: 'Mathematics Standard',
                          marksObtained: Number(markScore)
                        });
                        setMarkScore('');
                        setNotice('✅ Exam marks saved.');
                      }}
                    >
                      <Text style={styles.primaryBtnText}>Save Marks for Selected Exam</Text>
                    </AnimatedButton>
                  </View>
                </View>
              </>
            )}

            {/* ============================================================== */}
            {/* STUDENT & PARENT PORTAL VIEW */}
            {/* ============================================================== */}
            {!isTeacher && studentData && (
              <>
                {/* 75% College Attendance Shortage Alert */}
                {studentData.attendance.isShortageAlert && (
                  <View style={styles.alertBanner}>
                    <Text style={styles.alertBannerText}>
                      ⚠️ COLLEGE ATTENDANCE SHORTAGE ALERT: Current attendance is {studentData.attendance.attendancePct}% (minimum 75% required for semester exams).
                    </Text>
                  </View>
                )}

                {/* Student Summary KPI Cards */}
                <View style={styles.kpiGrid}>
                  <AnimatedHoverCard style={styles.kpiCard}>
                    <Text style={styles.kpiValue}>{studentData.attendance.attendancePct}%</Text>
                    <Text style={styles.kpiLabel}>
                      Attendance ({studentData.attendance.presentCount}/{studentData.attendance.totalClasses} classes)
                    </Text>
                  </AnimatedHoverCard>
                  <AnimatedHoverCard style={styles.kpiCard}>
                    <Text style={styles.kpiValue}>{studentData.student.rollNumber}</Text>
                    <Text style={styles.kpiLabel}>
                      {studentData.student.classOrCourse} • Sec {studentData.student.section}
                    </Text>
                  </AnimatedHoverCard>
                  <AnimatedHoverCard style={styles.kpiCard}>
                    <Text style={styles.kpiValue}>{studentData.assignments.length}</Text>
                    <Text style={styles.kpiLabel}>Active Homework Tasks</Text>
                  </AnimatedHoverCard>
                </View>

                {/* Timetable & Campus Announcements */}
                <View style={styles.gridRow}>
                  <View style={styles.halfCard}>
                    <Text style={styles.cardTitle}>🕒 Class Timetable</Text>
                    {studentData.timetable.map((slot: any) => (
                      <Text key={slot.id} style={styles.listItem}>
                        • {slot.dayOfWeek} ({slot.timeRange}): {slot.subject}
                      </Text>
                    ))}
                  </View>
                  <View style={styles.halfCard}>
                    <Text style={styles.cardTitle}>📢 Campus Announcements</Text>
                    {studentData.cms.map((c: any) => (
                      <View key={c.id} style={{ marginBottom: 8 }}>
                        <Text style={styles.rowTitle}>{c.title}</Text>
                        <Text style={styles.rowMeta}>{c.body}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Homework & Online Submission */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>📚 Homework & Submissions</Text>
                  {studentData.assignments.map((a: any) => (
                    <View key={a.id} style={styles.rowCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>
                          {a.title} ({a.subject})
                        </Text>
                        <Text style={styles.rowMeta}>
                          Due: {a.dueDate} • {a.description}
                        </Text>
                      </View>
                      {a.submission ? (
                        <View style={styles.submittedPill}>
                          <Text style={styles.submittedText}>
                            ✓ Submitted {a.submission.marks !== null ? `• Marks: ${a.submission.marks}` : ''}
                          </Text>
                        </View>
                      ) : !isParent ? (
                        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                          <TextInput
                            style={[styles.input, { minWidth: 160 }]}
                            placeholder="Enter answer/link..."
                            value={homeworkInputs[a.id] || ''}
                            onChangeText={(v) => setHomeworkInputs({ ...homeworkInputs, [a.id]: v })}
                          />
                          <AnimatedButton
                            style={styles.primaryBtn}
                            onPress={async () => {
                              const content = homeworkInputs[a.id];
                              if (!content) return;
                              await api.submitAssignment(a.id, content);
                              setNotice(`✅ Submitted ${a.title}`);
                              loadPortal();
                            }}
                          >
                            <Text style={styles.primaryBtnText}>Submit</Text>
                          </AnimatedButton>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>

                {/* Published Exam Results & QR Hall Tickets */}
                <View style={styles.gridRow}>
                  <View style={styles.halfCard}>
                    <Text style={styles.cardTitle}>🏆 Published Exam Results</Text>
                    {studentData.examMarks.length === 0 ? (
                      <Text style={styles.rowMeta}>No published results yet.</Text>
                    ) : (
                      studentData.examMarks.map((m: any) => (
                        <Text key={m.id} style={styles.listItem}>
                          • {m.subject}: {m.marksObtained}/{m.maxMarks} (Grade {m.grade})
                        </Text>
                      ))
                    )}
                  </View>

                  <View style={styles.halfCard}>
                    <Text style={styles.cardTitle}>🎟️ Digital QR Hall Tickets</Text>
                    {studentData.hallTickets.length === 0 ? (
                      <Text style={styles.rowMeta}>No hall tickets issued yet.</Text>
                    ) : (
                      studentData.hallTickets.map((ht: any) => (
                        <View key={ht.id} style={styles.qrBox}>
                          <Text style={styles.rowTitle}>{ht.exam?.name}</Text>
                          <Text style={styles.rowMeta}>Seat: {ht.seatNumber}</Text>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: '#1D4ED8', marginTop: 4 }}>
                            QR Token: {ht.qrToken}
                          </Text>
                        </View>
                      ))
                    )}
                  </View>
                </View>

                {/* Fee Invoices & Priority Online Payment */}
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>💳 Fee Invoices (Priority Allocation: Fines ➜ Tuition ➜ Transport)</Text>
                  {studentData.invoices.map((inv: any) => (
                    <View key={inv.id} style={styles.rowCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>
                          {inv.invoiceNo} ({inv.status})
                        </Text>
                        <Text style={styles.rowMeta}>
                          Fines: ₹{inv.finesDue} | Tuition: ₹{inv.tuitionDue} | Transport: ₹{inv.transportDue} | Paid: ₹{inv.totalPaid}
                        </Text>
                      </View>
                      {inv.status !== 'PAID' && (
                        <AnimatedButton
                          style={styles.primaryBtn}
                          onPress={async () => {
                            const res = await api.payPortalFee(inv.id, 10000);
                            setNotice(
                              `✅ Paid ₹10,000 (Allocated -> Fines: ₹${res.transaction.allocatedToFines}, Tuition: ₹${res.transaction.allocatedToTuition}, Transport: ₹${res.transaction.allocatedToTransport})`
                            );
                            loadPortal();
                          }}
                        >
                          <Text style={styles.primaryBtnText}>Pay ₹10,000 Online ➜</Text>
                        </AnimatedButton>
                      )}
                    </View>
                  ))}
                </View>
              </>
            )}

            {/* Library Catalog, Reservations & Due-Date Countdowns (All Portal Roles) */}
            <LibraryWorkspace mode="member" studentId={activeChildId || undefined} />

            {/* Live School Bus Tracker & Stop-by-Stop ETA */}
            <TransportWorkspace mode="member" studentId={activeChildId || undefined} />

            {/* Hostel Out-Passes, Mess Menu & 4-Department No-Dues Tracker */}
            {!isTeacher && (
              <HostelWorkspace mode="member" isParent={isParent} studentId={activeChildId || undefined} />
            )}

            {/* Smart PTM Slot Booker & WhatsApp Parent Assistant */}
            {(isTeacher || isParent) && (
              <CommsPtmWorkspace
                mode={isTeacher ? 'teacher' : 'parent'}
                studentId={activeChildId || undefined}
              />
            )}

            {/* Sprint 7: Labs, Activities, Syllabus, Document Requests & Placement */}
            <Sprint7Workspace mode="member" studentId={activeChildId || undefined} />

            {/* Leave Request Box (All Roles) */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🗓️ Submit Leave Request</Text>
              <View style={styles.gridRow}>
                <TextInput style={styles.input} placeholder="From (YYYY-MM-DD)" value={leaveFrom} onChangeText={setLeaveFrom} />
                <TextInput style={styles.input} placeholder="To (YYYY-MM-DD)" value={leaveTo} onChangeText={setLeaveTo} />
              </View>
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                placeholder="Reason for leave..."
                value={leaveReason}
                onChangeText={setLeaveReason}
              />
              <AnimatedButton
                style={[styles.primaryBtn, { alignSelf: 'flex-start', marginTop: 10 }]}
                onPress={async () => {
                  if (!leaveReason.trim()) return;
                  await api.submitLeaveRequest({ fromDate: leaveFrom, toDate: leaveTo, reason: leaveReason });
                  setLeaveReason('');
                  setNotice('✅ Leave request submitted for approval.');
                  loadPortal();
                }}
              >
                <Text style={styles.primaryBtnText}>Submit Leave Request</Text>
              </AnimatedButton>
            </View>
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
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  brandSub: { fontSize: 12, color: '#1D4ED8', fontWeight: '600' },
  childPill: { backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#CBD5E1' },
  childPillActive: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  childPillText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  childPillTextActive: { color: '#FFFFFF' },
  logoutBtn: { backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  logoutText: { color: '#DC2626', fontSize: 13, fontWeight: '700' },
  noticeBar: { backgroundColor: '#DBEAFE', padding: 10, paddingHorizontal: spacing.lg },
  noticeText: { color: '#1E3A8A', fontSize: 13, fontWeight: '700' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body: { flex: 1, padding: spacing.lg },
  contentWrap: { maxWidth: 1200, width: '100%', alignSelf: 'center', gap: 16 },
  alertBanner: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', padding: 14, borderRadius: 12 },
  alertBannerText: { color: '#991B1B', fontSize: 13, fontWeight: '800' },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  kpiCard: { flex: 1, minWidth: 200, backgroundColor: '#FFFFFF', borderRadius: borderRadius.lg, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', ...shadows.card },
  kpiValue: { fontSize: 26, fontWeight: '900', color: '#1D4ED8', marginBottom: 4 },
  kpiLabel: { fontSize: 13, fontWeight: '600', color: '#475569' },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  halfCard: { flex: 1, minWidth: 300, backgroundColor: '#FFFFFF', borderRadius: borderRadius.lg, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', ...shadows.card },
  card: { backgroundColor: '#FFFFFF', borderRadius: borderRadius.lg, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', ...shadows.card },
  cardHeaderRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 12 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  cardMeta: { fontSize: 12, color: '#475569' },
  listItem: { fontSize: 13, color: '#1E293B', marginBottom: 6 },
  rowCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  rowMeta: { fontSize: 12, color: '#475569', marginTop: 2 },
  primaryBtn: { backgroundColor: '#1D4ED8', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  statusChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' },
  statusChipActive: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  statusChipText: { fontSize: 11, fontWeight: '700', color: '#334155' },
  statusChipTextActive: { color: '#FFFFFF' },
  submittedPill: { backgroundColor: '#DCFCE7', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  submittedText: { color: '#166534', fontSize: 12, fontWeight: '700' },
  qrBox: { backgroundColor: '#EFF6FF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#BFDBFE' },
  input: { flex: 1, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 13, backgroundColor: '#FFFFFF' }
});
