import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { colors, borderRadius, spacing, shadows } from '../theme/theme';
import { SchoolLogoBadge } from '../components/SchoolLogoBadge';
import { AnimatedHoverCard, AnimatedButton } from '../components/AnimatedUI';

const SUB_ADMIN_ROLES = [
  'ADMIN',
  'ACCOUNTANT',
  'ADMISSION_OFFICER',
  'EXAM_CONTROLLER',
  'LIBRARIAN',
  'TRANSPORT_MANAGER',
  'HOSTEL_WARDEN',
  'TEACHER'
];

export const SuperAdminScreen: React.FC = () => {
  const { portalUser, portalLogout, activeBranchId, switchBranch } = useAuth();
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(activeBranchId || '');
  const [branchConfig, setBranchConfig] = useState<any>(null);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [activeSection, setActiveSection] = useState<'studio' | 'staff'>('studio');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<string>('');

  // Create Branch Modal
  const [newBranchModal, setNewBranchModal] = useState(false);
  const [nbCode, setNbCode] = useState('');
  const [nbName, setNbName] = useState('');
  const [nbCity, setNbCity] = useState('');
  const [nbMode, setNbMode] = useState<'SCHOOL' | 'COLLEGE' | 'BOTH'>('BOTH');

  // Config Studio Quick-Add States
  const [newSyllabus, setNewSyllabus] = useState('');
  const [newGrade, setNewGrade] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newFeeGrade, setNewFeeGrade] = useState('');
  const [newTuitionFee, setNewTuitionFee] = useState('90000');

  // Provision Staff Form
  const [stName, setStName] = useState('');
  const [stEmail, setStEmail] = useState('');
  const [stRole, setStRole] = useState('ACCOUNTANT');
  const [stPermFees, setStPermFees] = useState(true);
  const [stPermAdmissions, setStPermAdmissions] = useState(false);
  const [stPermExams, setStPermExams] = useState(false);

  const loadAll = async (branchIdToUse?: string) => {
    setLoading(true);
    try {
      const bRes = await api.getBranches();
      const list = bRes.branches || [];
      setBranches(list);
      const targetId = branchIdToUse || selectedBranchId || (list[0]?.id ?? '');
      if (targetId) {
        setSelectedBranchId(targetId);
        switchBranch(targetId);
        const [cfgRes, usrRes] = await Promise.all([
          api.getBranchConfig(targetId),
          api.getStaffUsers(targetId)
        ]);
        setBranchConfig(cfgRes.config);
        setStaffUsers(usrRes.users || []);
      }
    } catch (e: any) {
      setNotice(e.message || 'Failed to load Super Admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleSelectBranch = (id: string) => {
    setSelectedBranchId(id);
    switchBranch(id);
    loadAll(id);
  };

  const handleCreateBranch = async () => {
    if (!nbCode.trim() || !nbName.trim() || !nbCity.trim()) return;
    try {
      const res = await api.createBranch({
        code: nbCode.trim(),
        name: nbName.trim(),
        city: nbCity.trim(),
        institutionMode: nbMode
      });
      setNewBranchModal(false);
      setNbCode('');
      setNbName('');
      setNbCity('');
      setNotice(`✅ Created branch ${res.branch.name} (${res.branch.code})`);
      await loadAll(res.branch.id);
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    }
  };

  const handleProvisionStaff = async () => {
    if (!stName.trim() || !stEmail.trim() || !selectedBranchId) return;
    const permissions: Record<string, string[]> = {};
    if (stPermFees) permissions.fees = ['create', 'read', 'update'];
    if (stPermAdmissions) permissions.admissions = ['create', 'read', 'update'];
    if (stPermExams) permissions.exams = ['create', 'read', 'update'];
    try {
      await api.provisionStaffUser({
        branchId: selectedBranchId,
        fullName: stName.trim(),
        email: stEmail.trim(),
        role: stRole,
        permissions
      });
      setStName('');
      setStEmail('');
      setNotice(`✅ Provisioned ${stRole} account successfully.`);
      loadAll(selectedBranchId);
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar with Branch Switcher */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <SchoolLogoBadge size={38} />
          <View>
            <Text style={styles.brandTitle}>Skanda Global Super Admin</Text>
            <Text style={styles.brandSub}>{portalUser?.fullName}</Text>
          </View>
        </View>

        <View style={styles.topActions}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {branches.map((b) => {
              const active = b.id === selectedBranchId;
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.branchPill, active && styles.branchPillActive]}
                  onPress={() => handleSelectBranch(b.id)}
                >
                  <Text style={[styles.branchPillText, active && styles.branchPillTextActive]}>
                    🏫 {b.code} • {b.city}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <AnimatedButton style={styles.newBranchBtn} onPress={() => setNewBranchModal(true)}>
            <Text style={styles.newBranchBtnText}>+ Create New Branch</Text>
          </AnimatedButton>

          <TouchableOpacity style={styles.logoutBtn} onPress={portalLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Sub-navigation Tabs */}
      <View style={styles.subNav}>
        <TouchableOpacity
          style={[styles.subTab, activeSection === 'studio' && styles.subTabActive]}
          onPress={() => setActiveSection('studio')}
        >
          <Text style={[styles.subTabText, activeSection === 'studio' && styles.subTabTextActive]}>
            ⚙️ Branch Configuration Studio
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTab, activeSection === 'staff' && styles.subTabActive]}
          onPress={() => setActiveSection('staff')}
        >
          <Text style={[styles.subTabText, activeSection === 'staff' && styles.subTabTextActive]}>
            🛡️ Admin & Sub-Admin RBAC Provisioning
          </Text>
        </TouchableOpacity>
      </View>

      {!!notice && (
        <View style={styles.noticeBar}>
          <Text style={styles.noticeText}>{notice}</Text>
        </View>
      )}

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={colors.brandPrimary} />
        </View>
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={{ paddingBottom: 48 }}>
          {activeSection === 'studio' && branchConfig && (
            <View style={styles.contentWrap}>
              {/* Branch Profile Card */}
              <AnimatedHoverCard style={styles.card}>
                <Text style={styles.cardTitle}>
                  🏫 {branchConfig.branch.name} ({branchConfig.branch.code})
                </Text>
                <Text style={styles.cardMeta}>
                  City: {branchConfig.branch.city} • Mode: {branchConfig.branch.institutionMode} • Active Session: 2026-2027
                </Text>
                <View style={styles.modeRow}>
                  {(['SCHOOL', 'COLLEGE', 'BOTH'] as const).map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.modeChip,
                        branchConfig.branch.institutionMode === m && styles.modeChipActive
                      ]}
                      onPress={async () => {
                        await api.updateBranch(selectedBranchId, { institutionMode: m });
                        setNotice(`✅ Updated branch mode to ${m}`);
                        loadAll(selectedBranchId);
                      }}
                    >
                      <Text
                        style={[
                          styles.modeChipText,
                          branchConfig.branch.institutionMode === m && styles.modeChipTextActive
                        ]}
                      >
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </AnimatedHoverCard>

              {/* Syllabi / Departments & Grades / Courses */}
              <View style={styles.gridRow}>
                <View style={styles.halfCard}>
                  <Text style={styles.cardTitle}>📚 Enabled Syllabi / Departments</Text>
                  {branchConfig.syllabi.map((s: any) => (
                    <Text key={s.id} style={styles.listItem}>
                      • {s.name} ({s.institutionType})
                    </Text>
                  ))}
                  <View style={styles.inlineForm}>
                    <TextInput
                      style={styles.input}
                      placeholder="Add Board or College Dept..."
                      value={newSyllabus}
                      onChangeText={setNewSyllabus}
                    />
                    <AnimatedButton
                      style={styles.addBtn}
                      onPress={async () => {
                        if (!newSyllabus.trim()) return;
                        await api.addBranchSyllabus(selectedBranchId, { name: newSyllabus.trim() });
                        setNewSyllabus('');
                        loadAll(selectedBranchId);
                      }}
                    >
                      <Text style={styles.addBtnText}>Add</Text>
                    </AnimatedButton>
                  </View>
                </View>

                <View style={styles.halfCard}>
                  <Text style={styles.cardTitle}>🎓 Dynamic Classes / Courses</Text>
                  {branchConfig.gradesOrCourses.map((g: any) => (
                    <Text key={g.id} style={styles.listItem}>
                      • {g.name} (Capacity: {g.seatCapacity})
                    </Text>
                  ))}
                  <View style={styles.inlineForm}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Grade 12 or BBA"
                      value={newGrade}
                      onChangeText={setNewGrade}
                    />
                    <AnimatedButton
                      style={styles.addBtn}
                      onPress={async () => {
                        if (!newGrade.trim()) return;
                        await api.addBranchGrade(selectedBranchId, { name: newGrade.trim(), seatCapacity: 40 });
                        setNewGrade('');
                        loadAll(selectedBranchId);
                      }}
                    >
                      <Text style={styles.addBtnText}>Add</Text>
                    </AnimatedButton>
                  </View>
                </View>
              </View>

              {/* Subjects & Fee Structures */}
              <View style={styles.gridRow}>
                <View style={styles.halfCard}>
                  <Text style={styles.cardTitle}>📖 Compulsory & Elective Subjects</Text>
                  {branchConfig.subjects.map((sub: any) => (
                    <Text key={sub.id} style={styles.listItem}>
                      • {sub.gradeOrCourse}: {sub.name} ({sub.isCompulsory ? 'Compulsory' : 'Elective'})
                    </Text>
                  ))}
                  <View style={styles.inlineForm}>
                    <TextInput
                      style={styles.input}
                      placeholder="Add Subject for Grade 10..."
                      value={newSubject}
                      onChangeText={setNewSubject}
                    />
                    <AnimatedButton
                      style={styles.addBtn}
                      onPress={async () => {
                        if (!newSubject.trim()) return;
                        await api.addBranchSubject(selectedBranchId, {
                          gradeOrCourse: 'Grade 10',
                          name: newSubject.trim(),
                          isCompulsory: true
                        });
                        setNewSubject('');
                        loadAll(selectedBranchId);
                      }}
                    >
                      <Text style={styles.addBtnText}>Add</Text>
                    </AnimatedButton>
                  </View>
                </View>

                <View style={styles.halfCard}>
                  <Text style={styles.cardTitle}>💳 Branch Fee Structures</Text>
                  {branchConfig.feeStructures.map((f: any) => (
                    <Text key={f.id} style={styles.listItem}>
                      • {f.gradeOrCourse}: Tuition ₹{f.tuitionFee} | Transport ₹{f.transportFee}
                    </Text>
                  ))}
                  <View style={styles.inlineForm}>
                    <TextInput
                      style={styles.input}
                      placeholder="Class/Course"
                      value={newFeeGrade}
                      onChangeText={setNewFeeGrade}
                    />
                    <TextInput
                      style={[styles.input, { maxWidth: 100 }]}
                      placeholder="Tuition"
                      keyboardType="numeric"
                      value={newTuitionFee}
                      onChangeText={setNewTuitionFee}
                    />
                    <AnimatedButton
                      style={styles.addBtn}
                      onPress={async () => {
                        if (!newFeeGrade.trim()) return;
                        await api.addBranchFeeStructure(selectedBranchId, {
                          gradeOrCourse: newFeeGrade.trim(),
                          tuitionFee: Number(newTuitionFee) || 90000
                        });
                        setNewFeeGrade('');
                        loadAll(selectedBranchId);
                      }}
                    >
                      <Text style={styles.addBtnText}>Save</Text>
                    </AnimatedButton>
                  </View>
                </View>
              </View>
            </View>
          )}

          {activeSection === 'staff' && (
            <View style={styles.contentWrap}>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>➕ Provision Branch Admin / Scoped Sub-Admin</Text>
                <View style={styles.gridRow}>
                  <TextInput style={styles.input} placeholder="Full Name" value={stName} onChangeText={setStName} />
                  <TextInput
                    style={styles.input}
                    placeholder="Official Email"
                    autoCapitalize="none"
                    value={stEmail}
                    onChangeText={setStEmail}
                  />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, marginVertical: 10 }}>
                  {SUB_ADMIN_ROLES.map((r) => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.modeChip, stRole === r && styles.modeChipActive]}
                      onPress={() => setStRole(r)}
                    >
                      <Text style={[styles.modeChipText, stRole === r && styles.modeChipTextActive]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <Text style={styles.cardMeta}>Granular Module CRUD Permissions:</Text>
                <View style={styles.modeRow}>
                  <TouchableOpacity
                    style={[styles.modeChip, stPermFees && styles.modeChipActive]}
                    onPress={() => setStPermFees(!stPermFees)}
                  >
                    <Text style={[styles.modeChipText, stPermFees && styles.modeChipTextActive]}>
                      {stPermFees ? '✓ ' : ''}Fees Module
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeChip, stPermAdmissions && styles.modeChipActive]}
                    onPress={() => setStPermAdmissions(!stPermAdmissions)}
                  >
                    <Text style={[styles.modeChipText, stPermAdmissions && styles.modeChipTextActive]}>
                      {stPermAdmissions ? '✓ ' : ''}Admissions CRM
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modeChip, stPermExams && styles.modeChipActive]}
                    onPress={() => setStPermExams(!stPermExams)}
                  >
                    <Text style={[styles.modeChipText, stPermExams && styles.modeChipTextActive]}>
                      {stPermExams ? '✓ ' : ''}Exams & Results
                    </Text>
                  </TouchableOpacity>
                </View>
                <AnimatedButton style={[styles.newBranchBtn, { alignSelf: 'flex-start', marginTop: 12 }]} onPress={handleProvisionStaff}>
                  <Text style={styles.newBranchBtnText}>Provision Account ➜</Text>
                </AnimatedButton>
              </View>

              <View style={styles.card}>
                <Text style={styles.cardTitle}>👥 Provisioned Branch Admins & Sub-Admins</Text>
                {staffUsers.map((u) => (
                  <View key={u.id} style={styles.staffRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.staffName}>{u.fullName}</Text>
                      <Text style={styles.cardMeta}>
                        {u.email} • Role: <Text style={{ fontWeight: '700', color: '#1D4ED8' }}>{u.role}</Text>
                      </Text>
                    </View>
                    <View style={styles.permBadge}>
                      <Text style={styles.permBadgeText}>
                        {Object.keys(u.permissions || {}).join(', ') || 'Role Default'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Create New Branch Modal */}
      <Modal visible={newBranchModal} transparent animationType="fade" onRequestClose={() => setNewBranchModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>🏫 Create New Campus Branch</Text>
            <TextInput style={styles.input} placeholder="Branch Code (e.g. MYS-01)" value={nbCode} onChangeText={setNbCode} />
            <TextInput style={[styles.input, { marginTop: 10 }]} placeholder="Branch Name" value={nbName} onChangeText={setNbName} />
            <TextInput style={[styles.input, { marginTop: 10 }]} placeholder="City" value={nbCity} onChangeText={setNbCity} />
            <View style={[styles.modeRow, { marginTop: 10 }]}>
              {(['SCHOOL', 'COLLEGE', 'BOTH'] as const).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeChip, nbMode === m && styles.modeChipActive]}
                  onPress={() => setNbMode(m)}
                >
                  <Text style={[styles.modeChipText, nbMode === m && styles.modeChipTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <AnimatedButton style={styles.newBranchBtn} onPress={handleCreateBranch}>
                <Text style={styles.newBranchBtnText}>Create Branch</Text>
              </AnimatedButton>
              <TouchableOpacity style={styles.logoutBtn} onPress={() => setNewBranchModal(false)}>
                <Text style={styles.logoutText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    gap: 12
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A' },
  brandSub: { fontSize: 12, color: '#1D4ED8', fontWeight: '600' },
  topActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  branchPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  branchPillActive: { backgroundColor: '#EFF6FF', borderColor: '#1D4ED8' },
  branchPillText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  branchPillTextActive: { color: '#1D4ED8', fontWeight: '800' },
  newBranchBtn: { backgroundColor: '#1D4ED8', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  newBranchBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  logoutBtn: { backgroundColor: '#FEE2E2', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  logoutText: { color: '#DC2626', fontSize: 13, fontWeight: '700' },
  subNav: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0'
  },
  subTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F8FAFC' },
  subTabActive: { backgroundColor: '#1D4ED8' },
  subTabText: { fontSize: 13, fontWeight: '700', color: '#475569' },
  subTabTextActive: { color: '#FFFFFF' },
  noticeBar: { backgroundColor: '#DBEAFE', padding: 10, paddingHorizontal: spacing.lg },
  noticeText: { color: '#1E3A8A', fontSize: 13, fontWeight: '700' },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  body: { flex: 1, padding: spacing.lg },
  contentWrap: { maxWidth: 1200, width: '100%', alignSelf: 'center', gap: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card
  },
  gridRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  halfCard: {
    flex: 1,
    minWidth: 300,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card
  },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  cardMeta: { fontSize: 13, color: '#475569', marginBottom: 8 },
  listItem: { fontSize: 13, color: '#1E293B', marginBottom: 4 },
  modeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  modeChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC' },
  modeChipActive: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  modeChipText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  modeChipTextActive: { color: '#FFFFFF', fontWeight: '700' },
  inlineForm: { flexDirection: 'row', gap: 8, marginTop: 12 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    backgroundColor: '#FFFFFF'
  },
  addBtn: { backgroundColor: '#1D4ED8', paddingHorizontal: 14, justifyContent: 'center', borderRadius: 8 },
  addBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  staffName: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  permBadge: { backgroundColor: '#EFF6FF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  permBadgeText: { fontSize: 11, fontWeight: '700', color: '#1D4ED8' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalCard: { width: '100%', maxWidth: 460, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20 }
});
