import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import api from '../services/api';
import { borderRadius, spacing, shadows } from '../theme/theme';
import { AnimatedHoverCard, AnimatedButton } from './AnimatedUI';

interface Sprint7WorkspaceProps {
  mode: 'admin' | 'member';
  defaultSection?: 'labs' | 'activities' | 'rollover' | 'academics' | 'finance' | 'placement';
  studentId?: string;
}

export const Sprint7Workspace: React.FC<Sprint7WorkspaceProps> = ({ mode, defaultSection = 'labs', studentId }) => {
  const [section, setSection] = useState(defaultSection);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const [labs, setLabs] = useState<any[]>([]);
  const [journals, setJournals] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [years, setYears] = useState<any[]>([]);
  const [rolloverPreviews, setRolloverPreviews] = useState<any[]>([]);
  const [toYearName, setToYearName] = useState('2027-2028');
  const [rolloverStep, setRolloverStep] = useState(1);

  const [syllabus, setSyllabus] = useState<any[]>([]);
  const [syllabusSummary, setSyllabusSummary] = useState<Record<string, any>>({});
  const [collegeRecords, setCollegeRecords] = useState<any[]>([]);
  const [docRequests, setDocRequests] = useState<any[]>([]);
  const [alumni, setAlumni] = useState<any[]>([]);
  const [drives, setDrives] = useState<any[]>([]);

  // Quick Form States
  const [docType, setDocType] = useState('BONAFIDE');
  const [docReason, setDocReason] = useState('');
  const [actName, setActName] = useState('');
  const [actVenue, setActVenue] = useState('');
  const [actSlot, setActSlot] = useState('');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [lRes, jRes, aRes, sRes, cRes, dRes, alRes, drRes] = await Promise.allSettled([
        api.getLabs(),
        api.getLabJournals(),
        api.getActivities(),
        api.getSyllabus(),
        api.getCollegeRecords(studentId),
        api.getDocumentRequests(),
        api.getAlumni(),
        api.getPlacementDrives()
      ]);
      if (lRes.status === 'fulfilled') setLabs(lRes.value.labs || []);
      if (jRes.status === 'fulfilled') setJournals(jRes.value.journals || []);
      if (aRes.status === 'fulfilled') setActivities(aRes.value.activities || []);
      if (sRes.status === 'fulfilled') {
        setSyllabus(sRes.value.chapters || []);
        setSyllabusSummary(sRes.value.summary || {});
      }
      if (cRes.status === 'fulfilled') setCollegeRecords(cRes.value.records || []);
      if (dRes.status === 'fulfilled') setDocRequests(dRes.value.requests || []);
      if (alRes.status === 'fulfilled') setAlumni(alRes.value.alumni || []);
      if (drRes.status === 'fulfilled') setDrives(drRes.value.drives || []);

      if (mode === 'admin') {
        const yRes = await api.getRolloverYears().catch(() => null);
        if (yRes?.years) setYears(yRes.years);
      }
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [mode, studentId]);

  const sections =
    mode === 'admin'
      ? [
          { id: 'labs', label: '🔬 Labs & Journals' },
          { id: 'activities', label: '🎭 Activities' },
          { id: 'rollover', label: '🎓 Year Rollover' },
          { id: 'academics', label: '📖 Syllabus & College' },
          { id: 'finance', label: '📄 Docs & Recon' },
          { id: 'placement', label: '💼 Alumni & Placement' }
        ]
      : [
          { id: 'labs', label: '🔬 Lab Journals' },
          { id: 'activities', label: '🎭 Activities' },
          { id: 'academics', label: '📖 Syllabus & CGPA' },
          { id: 'finance', label: '📄 Document Requests' },
          { id: 'placement', label: '💼 Placement Drives' }
        ];

  return (
    <View style={styles.wrapper}>
      {notice ? (
        <View style={styles.noticeBanner}>
          <Text style={styles.noticeText}>{notice}</Text>
          <TouchableOpacity onPress={() => setNotice('')}>
            <Text style={styles.dismissText}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.subTabRow}>
        {sections.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={[styles.subTabPill, section === s.id && styles.subTabPillActive]}
            onPress={() => setSection(s.id as any)}
          >
            <Text style={[styles.subTabText, section === s.id && styles.subTabTextActive]}>{s.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && <ActivityIndicator size="large" color="#1D4ED8" style={{ marginVertical: 20 }} />}

      {/* 1. LABS & JOURNALS */}
      {section === 'labs' && (
        <View style={styles.sectionStack}>
          {labs.map((lab) => (
            <AnimatedHoverCard key={lab.id} style={styles.card}>
              <Text style={styles.cardTitle}>
                🔬 {lab.name} ({lab.labType} • Room {lab.roomNo})
              </Text>
              {(lab.equipment || []).map((eq: any) => (
                <View key={eq.id} style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>
                      {eq.name} [{eq.qrTag}]
                    </Text>
                    <Text style={styles.itemSub}>
                      Qty: {eq.quantity} • Calibration: {eq.calibrationStatus}
                    </Text>
                  </View>
                  {(eq.lowStockAlert || eq.expiryAlert) && (
                    <View style={styles.warnBadge}>
                      <Text style={styles.warnBadgeText}>
                        {eq.lowStockAlert ? 'Low Stock' : 'Expiring <30d'}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </AnimatedHoverCard>
          ))}

          <AnimatedHoverCard style={styles.card}>
            <Text style={styles.cardTitle}>Lab Journals & Practical Sign-Off ({journals.length})</Text>
            {journals.map((j) => (
              <View key={j.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{j.experiment?.title}</Text>
                  <Text style={styles.itemSub}>
                    {j.submissionNotes} • Marks: {j.totalMarks}/{j.experiment?.maxMarks || 25} ({j.status})
                  </Text>
                </View>
                {mode === 'admin' && j.status !== 'GRADED_SIGNED' && (
                  <AnimatedButton
                    style={styles.primaryBtn}
                    onPress={async () => {
                      await api.gradeLabJournal(j.id, { observationMarks: 9, recordMarks: 8, vivaMarks: 6 });
                      setNotice('✅ Graded & digitally signed off into practical marks.');
                      loadAll();
                    }}
                  >
                    <Text style={styles.primaryBtnText}>Sign Off (23/25)</Text>
                  </AnimatedButton>
                )}
              </View>
            ))}
          </AnimatedHoverCard>
        </View>
      )}

      {/* 2. EXTRACURRICULAR ACTIVITIES */}
      {section === 'activities' && (
        <View style={styles.sectionStack}>
          {mode === 'admin' && (
            <AnimatedHoverCard style={styles.card}>
              <Text style={styles.cardTitle}>Create Activity (Venue/Timetable Clash Checked)</Text>
              <View style={styles.formGrid}>
                <TextInput style={styles.input} placeholder="Activity Name" value={actName} onChangeText={setActName} />
                <TextInput style={styles.input} placeholder="Venue (e.g. STEM Arena)" value={actVenue} onChangeText={setActVenue} />
                <TextInput style={styles.input} placeholder="Slot (e.g. SAT-10:00)" value={actSlot} onChangeText={setActSlot} />
              </View>
              <AnimatedButton
                style={styles.primaryBtn}
                onPress={async () => {
                  try {
                    await api.createActivity({ name: actName, venue: actVenue, scheduleSlot: actSlot, eligibleGrades: 'ALL' });
                    setNotice('✅ Activity created.');
                    setActName('');
                    loadAll();
                  } catch (e: any) {
                    setNotice(`⚠️ ${e.message}`);
                  }
                }}
              >
                <Text style={styles.primaryBtnText}>Create Activity</Text>
              </AnimatedButton>
            </AnimatedHoverCard>
          )}
          <AnimatedHoverCard style={styles.card}>
            <Text style={styles.cardTitle}>Extracurricular Activities Catalog</Text>
            {activities.map((a) => (
              <View key={a.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {a.name} ({a.category})
                  </Text>
                  <Text style={styles.itemSub}>
                    {a.venue} • {a.scheduleSlot} • Seats: {a.enrollments?.length || 0}/{a.seatLimit} • Fee: ₹{a.feeAmount}
                  </Text>
                </View>
                {mode === 'member' && (
                  <AnimatedButton
                    style={styles.primaryBtn}
                    onPress={async () => {
                      try {
                        const res = await api.enrollActivity(a.id, studentId);
                        setNotice(`✅ Enrolled (${res.enrollment.status}).`);
                        loadAll();
                      } catch (e: any) {
                        setNotice(`⚠️ ${e.message}`);
                      }
                    }}
                  >
                    <Text style={styles.primaryBtnText}>Enroll</Text>
                  </AnimatedButton>
                )}
              </View>
            ))}
          </AnimatedHoverCard>
        </View>
      )}

      {/* 3. 5-STEP ACADEMIC YEAR ROLLOVER WIZARD */}
      {section === 'rollover' && mode === 'admin' && (
        <AnimatedHoverCard style={styles.card}>
          <Text style={styles.cardTitle}>🎓 5-Step Academic Year Rollover & Promotion Wizard (Step {rolloverStep}/5)</Text>
          <Text style={styles.itemSub}>
            Preview class-to-next-class promotions, unpaid fees, open library books, and lock closed academic years as read-only.
          </Text>
          <View style={[styles.formGrid, { marginTop: 10 }]}>
            <TextInput style={styles.input} placeholder="Target Academic Year (e.g. 2027-2028)" value={toYearName} onChangeText={setToYearName} />
            <AnimatedButton
              style={styles.primaryBtn}
              onPress={async () => {
                const current = years.find((y) => y.isCurrent && !y.isLocked) || years[0];
                if (!current) return;
                const res = await api.previewRollover(current.id);
                setRolloverPreviews(res.previews || []);
                setRolloverStep(3);
              }}
            >
              <Text style={styles.primaryBtnText}>Preview Promotion Batch</Text>
            </AnimatedButton>
          </View>
          {rolloverPreviews.map((p) => (
            <View key={p.studentId} style={styles.listRow}>
              <Text style={styles.itemTitle}>
                {p.fullName} ({p.currentClass} ➜ {p.suggestedNextClass})
              </Text>
              <Text style={styles.itemSub}>
                Unpaid Fees: ₹{p.unpaidFees} • Open Books: {p.openBooks}
              </Text>
            </View>
          ))}
          {rolloverPreviews.length > 0 && (
            <AnimatedButton
              style={[styles.primaryBtn, { marginTop: 12 }]}
              onPress={async () => {
                const current = years.find((y) => y.isCurrent && !y.isLocked) || years[0];
                if (!current) return;
                const res = await api.executeRollover({ fromYearId: current.id, toYearName });
                setRolloverStep(5);
                setNotice(`✅ Rollover complete! Locked ${res.lockedYear}, Active ${res.activeYear}.`);
                loadAll();
              }}
            >
              <Text style={styles.primaryBtnText}>Execute Rollover & Lock Closed Year</Text>
            </AnimatedButton>
          )}
        </AnimatedHoverCard>
      )}

      {/* 4. SYLLABUS & COLLEGE ACADEMICS */}
      {section === 'academics' && (
        <View style={styles.sectionStack}>
          <AnimatedHoverCard style={styles.card}>
            <Text style={styles.cardTitle}>Chapter-Wise Syllabus Completion Tracker</Text>
            {Object.entries(syllabusSummary).map(([k, v]: any) => (
              <Text key={k} style={styles.itemTitle}>
                {k}: {v.pct}% Covered ({v.completed}/{v.total} chapters)
              </Text>
            ))}
            {syllabus.map((ch) => (
              <View key={ch.id} style={styles.listRow}>
                <Text style={styles.itemSub}>
                  Ch {ch.chapterNo}: {ch.title} ({ch.isCompleted ? '✅ Completed' : '⏳ Pending'})
                </Text>
                {mode === 'admin' && (
                  <TouchableOpacity
                    onPress={async () => {
                      await api.toggleSyllabusChapter(ch.id);
                      loadAll();
                    }}
                  >
                    <Text style={{ color: '#1D4ED8', fontWeight: '700', fontSize: 12 }}>Toggle</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </AnimatedHoverCard>

          {collegeRecords.length > 0 && (
            <AnimatedHoverCard style={styles.card}>
              <Text style={styles.cardTitle}>College SGPA / CGPA & Backlogs</Text>
              {collegeRecords.map((r) => (
                <View key={r.id} style={styles.listRow}>
                  <Text style={styles.itemTitle}>
                    Semester {r.semester}: SGPA {r.sgpa} | CGPA {r.cgpa} | Backlogs: {r.backlogs}
                  </Text>
                  <Text style={styles.itemSub}>Revaluation: {r.revaluationStatus}</Text>
                </View>
              ))}
            </AnimatedHoverCard>
          )}
        </View>
      )}

      {/* 5. DOCUMENT REQUESTS */}
      {section === 'finance' && (
        <AnimatedHoverCard style={styles.card}>
          <Text style={styles.cardTitle}>Student Document Requests (Bonafide, TC, ID Card)</Text>
          {mode === 'member' && (
            <View style={styles.formGrid}>
              <TextInput style={styles.input} placeholder="Type (BONAFIDE / TC / ID_CARD)" value={docType} onChangeText={setDocType} />
              <TextInput style={styles.input} placeholder="Reason" value={docReason} onChangeText={setDocReason} />
              <AnimatedButton
                style={styles.primaryBtn}
                onPress={async () => {
                  await api.requestDocument({ docType, reason: docReason || 'Official', studentId });
                  setNotice('✅ Document request submitted.');
                  setDocReason('');
                  loadAll();
                }}
              >
                <Text style={styles.primaryBtnText}>Request Document</Text>
              </AnimatedButton>
            </View>
          )}
          {docRequests.map((d) => (
            <View key={d.id} style={styles.listRow}>
              <Text style={styles.itemTitle}>
                {d.docType} — {d.status} {d.issuedRef ? `(${d.issuedRef})` : ''}
              </Text>
              {mode === 'admin' && d.status === 'PENDING' && (
                <AnimatedButton
                  style={styles.primaryBtn}
                  onPress={async () => {
                    await api.decideDocumentRequest(d.id, 'ISSUED');
                    loadAll();
                  }}
                >
                  <Text style={styles.primaryBtnText}>Issue</Text>
                </AnimatedButton>
              )}
            </View>
          ))}
        </AnimatedHoverCard>
      )}

      {/* 6. ALUMNI & PLACEMENT BRIDGE */}
      {section === 'placement' && (
        <View style={styles.sectionStack}>
          {mode === 'admin' && (
            <AnimatedHoverCard style={styles.card}>
              <Text style={styles.cardTitle}>Alumni Verification Queue ({alumni.length})</Text>
              {alumni.map((al) => (
                <View key={al.id} style={styles.listRow}>
                  <Text style={styles.itemTitle}>
                    {al.fullName} ({al.graduationYear} • {al.company}) — {al.status}
                  </Text>
                  {al.status === 'PENDING' && (
                    <AnimatedButton
                      style={styles.primaryBtn}
                      onPress={async () => {
                        await api.verifyAlumni(al.id);
                        loadAll();
                      }}
                    >
                      <Text style={styles.primaryBtnText}>Verify Alumni</Text>
                    </AnimatedButton>
                  )}
                </View>
              ))}
            </AnimatedHoverCard>
          )}

          <AnimatedHoverCard style={styles.card}>
            <Text style={styles.cardTitle}>College Placement Drives & Referrals</Text>
            {drives.map((dr) => (
              <View key={dr.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {dr.companyName} — {dr.jobTitle} ({dr.packageLpa} LPA)
                  </Text>
                  <Text style={styles.itemSub}>
                    Min CGPA: {dr.minCgpa} • Max Backlogs: {dr.maxBacklogs} • Date: {dr.driveDate}
                  </Text>
                </View>
                {mode === 'member' && (
                  <AnimatedButton
                    style={styles.primaryBtn}
                    onPress={async () => {
                      try {
                        await api.applyPlacementDrive(dr.id, studentId);
                        setNotice('✅ Applied to placement drive!');
                        loadAll();
                      } catch (e: any) {
                        setNotice(`⚠️ ${e.message}`);
                      }
                    }}
                  >
                    <Text style={styles.primaryBtnText}>Apply</Text>
                  </AnimatedButton>
                )}
              </View>
            ))}
          </AnimatedHoverCard>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: { gap: spacing.md },
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
  noticeText: { color: '#1E3A8A', fontWeight: '600', flex: 1 },
  dismissText: { color: '#1D4ED8', fontWeight: '800', fontSize: 16, paddingLeft: 12 },
  subTabRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  subTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  subTabPillActive: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  subTabText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  subTabTextActive: { color: '#FFFFFF' },
  sectionStack: { gap: spacing.md },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: spacing.sm },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#F8FAFC',
    minWidth: 170,
    flex: 1
  },
  primaryBtn: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    alignSelf: 'flex-start'
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
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
  itemSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  warnBadge: { backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  warnBadgeText: { color: '#991B1B', fontSize: 11, fontWeight: '800' }
});
