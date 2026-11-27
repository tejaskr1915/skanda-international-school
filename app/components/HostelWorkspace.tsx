import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import api from '../services/api';
import { borderRadius, spacing, shadows } from '../theme/theme';
import { AnimatedHoverCard, AnimatedButton } from './AnimatedUI';

interface HostelWorkspaceProps {
  mode: 'admin' | 'member';
  isParent?: boolean;
  studentId?: string;
}

type AdminSubTab = 'occupancy' | 'mess' | 'tickets' | 'outpasses' | 'nodues';

export const HostelWorkspace: React.FC<HostelWorkspaceProps> = ({ mode, isParent, studentId }) => {
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [subTab, setSubTab] = useState<AdminSubTab>('occupancy');

  // Admin State
  const [blocks, setBlocks] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [menus, setMenus] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [gatePasses, setGatePasses] = useState<any[]>([]);

  // Occupancy Forms
  const [blockName, setBlockName] = useState('');
  const [genderType, setGenderType] = useState('BOYS');
  const [roomBlockId, setRoomBlockId] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [roomCapacity, setRoomCapacity] = useState('3');
  const [allocRoomId, setAllocRoomId] = useState('');
  const [allocBedNo, setAllocBedNo] = useState('1');
  const [allocStudentEmail, setAllocStudentEmail] = useState('');

  // Mess Menu Form
  const [messDay, setMessDay] = useState('Wednesday');
  const [breakfast, setBreakfast] = useState('');
  const [lunch, setLunch] = useState('');
  const [snacks, setSnacks] = useState('');
  const [dinner, setDinner] = useState('');

  // No-Dues State
  const [noDuesStudentId, setNoDuesStudentId] = useState('');
  const [noDuesData, setNoDuesData] = useState<any>(null);

  // Member State
  const [myAllocation, setMyAllocation] = useState<any>(null);
  const [myPasses, setMyPasses] = useState<any[]>([]);
  const [passType, setPassType] = useState<'HOSTEL_OUTPASS' | 'EARLY_PICKUP'>('HOSTEL_OUTPASS');
  const [passReason, setPassReason] = useState('');
  const [passDest, setPassDest] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      if (mode === 'admin') {
        const [occRes, mRes, tRes, gpRes] = await Promise.allSettled([
          api.getHostelOccupancy(),
          api.getMessMenu(),
          api.getHostelTickets(),
          api.getHostelGatePasses()
        ]);
        if (occRes.status === 'fulfilled') {
          const bList = occRes.value.blocks || [];
          const sList = occRes.value.students || [];
          setBlocks(bList);
          setStudents(sList);
          if (bList.length > 0 && !roomBlockId) setRoomBlockId(bList[0].id);
          if (bList[0]?.rooms?.length > 0 && !allocRoomId) setAllocRoomId(bList[0].rooms[0].id);
          if (sList.length > 0 && !noDuesStudentId) {
            setNoDuesStudentId(sList[0].id);
            const nd = await api.getNoDues(sList[0].id);
            setNoDuesData(nd);
          } else if (noDuesStudentId) {
            const nd = await api.getNoDues(noDuesStudentId);
            setNoDuesData(nd);
          }
        }
        if (mRes.status === 'fulfilled') setMenus(mRes.value.menus || []);
        if (tRes.status === 'fulfilled') setTickets(tRes.value.tickets || []);
        if (gpRes.status === 'fulfilled') setGatePasses(gpRes.value.passes || []);
      } else {
        const res = await api.getMyGatePasses(studentId);
        setMyPasses(res.passes || []);
        setMyAllocation(res.hostelAllocation || null);
        setMenus(res.messMenus || []);
        const targetId = studentId || 'me';
        const ndRes = await api.getNoDues(targetId).catch(() => null);
        if (ndRes?.success) setNoDuesData(ndRes);
      }
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [mode, studentId]);

  const handleSelectNoDuesStudent = async (sid: string) => {
    setNoDuesStudentId(sid);
    try {
      const nd = await api.getNoDues(sid);
      setNoDuesData(nd);
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    }
  };

  const renderNoDuesGrid = (nd: any) => {
    if (!nd?.departments) return null;
    const items = [
      {
        key: 'accounts',
        title: '1. Accounts & Fee Ledger',
        cleared: nd.departments.accounts.cleared,
        detail: nd.departments.accounts.cleared
          ? 'Zero pending fee balance'
          : `Pending balance: ₹${nd.departments.accounts.pendingBalance}`
      },
      {
        key: 'library',
        title: '2. Central Library',
        cleared: nd.departments.library.cleared,
        detail: nd.departments.library.cleared
          ? 'All books returned & zero fines'
          : `${nd.departments.library.unreturnedBooks} unreturned book(s), ₹${nd.departments.library.pendingFines} fine(s)`
      },
      {
        key: 'hostel',
        title: '3. Hostel & Maintenance',
        cleared: nd.departments.hostel.cleared,
        detail: nd.departments.hostel.cleared
          ? 'Bed vacated & zero maintenance dues'
          : `${nd.departments.hostel.occupiedBeds} active bed(s), ₹${nd.departments.hostel.maintenanceDue} due`
      },
      {
        key: 'labs',
        title: '4. Science & Computer Labs',
        cleared: nd.departments.labs.cleared,
        detail: nd.departments.labs.cleared ? 'Lab equipment cleared' : 'Pending lab clearance'
      }
    ];

    return (
      <View style={styles.noDuesGrid}>
        {items.map((it) => (
          <View key={it.key} style={[styles.noDuesCard, it.cleared ? styles.noDuesOk : styles.noDuesPending]}>
            <View style={styles.noDuesHeader}>
              <Text style={styles.itemTitle}>{it.title}</Text>
              <View style={[styles.badge, it.cleared ? styles.badgeOk : styles.badgeWarn]}>
                <Text style={it.cleared ? styles.badgeOkText : styles.badgeWarnText}>
                  {it.cleared ? '✓ CLEARED' : '✕ PENDING'}
                </Text>
              </View>
            </View>
            <Text style={styles.itemSub}>{it.detail}</Text>
          </View>
        ))}
      </View>
    );
  };

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

      <AnimatedHoverCard style={styles.heroBanner}>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>
            {mode === 'admin'
              ? '🏠 Hostel Residency, QR Gate Passes & Digital No-Dues'
              : '🏠 Hostel, QR Out-Passes & 4-Department No-Dues'}
          </Text>
          <Text style={styles.heroSub}>
            {mode === 'admin'
              ? 'Manage block/room/bed occupancy, weekly mess menu, maintenance tickets, out-pass approvals & TC clearance.'
              : 'Request hostel out-passes or early pickups, view weekly mess menu & track 4-department No-Dues clearance.'}
          </Text>
        </View>
      </AnimatedHoverCard>

      {mode === 'admin' && (
        <View style={styles.subTabRow}>
          {(
            [
              { id: 'occupancy', label: `🛏️ Occupancy Grid (${blocks.length})` },
              { id: 'mess', label: '🍽️ Mess Menu' },
              { id: 'tickets', label: `🔧 Maintenance (${tickets.filter((t) => t.status !== 'RESOLVED').length})` },
              { id: 'outpasses', label: `🎟️ Out-Pass Queue (${gatePasses.filter((g) => g.status === 'PENDING_WARDEN').length})` },
              { id: 'nodues', label: '📋 No-Dues & TC' }
            ] as { id: AdminSubTab; label: string }[]
          ).map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.subTabPill, subTab === t.id && styles.subTabPillActive]}
              onPress={() => setSubTab(t.id)}
            >
              <Text style={[styles.subTabText, subTab === t.id && styles.subTabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading && <ActivityIndicator size="large" color="#1D4ED8" style={{ marginVertical: 20 }} />}

      {/* ADMIN: OCCUPANCY GRID */}
      {mode === 'admin' && subTab === 'occupancy' && (
        <View style={styles.sectionStack}>
          <AnimatedHoverCard style={styles.card}>
            <Text style={styles.cardTitle}>Allocate Hostel Bed</Text>
            <View style={styles.formGrid}>
              <TextInput
                style={styles.input}
                placeholder="Student Email or Admission No"
                value={allocStudentEmail}
                onChangeText={setAllocStudentEmail}
              />
              <TextInput
                style={styles.input}
                placeholder="Bed Number (1, 2, 3)"
                value={allocBedNo}
                onChangeText={setAllocBedNo}
                keyboardType="numeric"
              />
            </View>
            <AnimatedButton
              style={styles.primaryBtn}
              onPress={async () => {
                if (!allocRoomId || !allocStudentEmail.trim()) return;
                try {
                  await api.allocateHostelBed({
                    roomId: allocRoomId,
                    bedNumber: Number(allocBedNo) || 1,
                    emailOrAdmission: allocStudentEmail.trim()
                  });
                  setNotice('✅ Bed allocated to student.');
                  setAllocStudentEmail('');
                  loadData();
                } catch (e: any) {
                  setNotice(`⚠️ ${e.message}`);
                }
              }}
            >
              <Text style={styles.primaryBtnText}>Assign Bed</Text>
            </AnimatedButton>
          </AnimatedHoverCard>

          <AnimatedHoverCard style={styles.card}>
            <Text style={styles.cardTitle}>Visual Block / Room / Bed Occupancy Grid</Text>
            {blocks.map((b) => (
              <View key={b.id} style={styles.blockSection}>
                <Text style={styles.blockTitle}>
                  🏢 {b.blockName} ({b.genderType})
                </Text>
                <View style={styles.roomsGrid}>
                  {(b.rooms || []).map((r: any) => (
                    <TouchableOpacity
                      key={r.id}
                      style={[styles.roomCard, allocRoomId === r.id && styles.roomCardSelected]}
                      onPress={() => setAllocRoomId(r.id)}
                    >
                      <Text style={styles.roomHeader}>
                        Room {r.roomNumber} (Cap: {r.capacity})
                      </Text>
                      <View style={styles.bedsRow}>
                        {Array.from({ length: r.capacity }).map((_, idx) => {
                          const bedNo = idx + 1;
                          const occ = (r.beds || []).find((bed: any) => bed.bedNumber === bedNo);
                          return (
                            <View key={bedNo} style={[styles.bedTile, occ ? styles.bedOccupied : styles.bedFree]}>
                              <Text style={occ ? styles.bedOccupiedText : styles.bedFreeText}>
                                Bed {bedNo}: {occ ? occ.student?.user?.fullName?.split(' ')[0] : 'Free'}
                              </Text>
                              {occ && (
                                <TouchableOpacity
                                  onPress={async () => {
                                    await api.vacateHostelBed(occ.id);
                                    setNotice(`✅ Vacated Bed ${bedNo} in Room ${r.roomNumber}.`);
                                    loadData();
                                  }}
                                >
                                  <Text style={styles.vacateLink}>Vacate</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}

            <View style={styles.divider} />
            <Text style={styles.fieldLabel}>Quick Add Block / Room:</Text>
            <View style={styles.formGrid}>
              <TextInput style={styles.input} placeholder="New Block Name" value={blockName} onChangeText={setBlockName} />
              <AnimatedButton
                style={styles.primaryBtn}
                onPress={async () => {
                  if (!blockName.trim()) return;
                  await api.createHostelBlock({ blockName, genderType });
                  setBlockName('');
                  loadData();
                }}
              >
                <Text style={styles.primaryBtnText}>Add Block</Text>
              </AnimatedButton>
            </View>
            <View style={styles.formGrid}>
              <TextInput style={styles.input} placeholder="Room No (e.g. A-103)" value={roomNumber} onChangeText={setRoomNumber} />
              <TextInput style={styles.input} placeholder="Capacity" value={roomCapacity} onChangeText={setRoomCapacity} keyboardType="numeric" />
              <AnimatedButton
                style={styles.primaryBtn}
                onPress={async () => {
                  if (!roomBlockId || !roomNumber.trim()) return;
                  await api.createHostelRoom({ blockId: roomBlockId, roomNumber, floor: 1, capacity: Number(roomCapacity) || 3 });
                  setRoomNumber('');
                  loadData();
                }}
              >
                <Text style={styles.primaryBtnText}>Add Room</Text>
              </AnimatedButton>
            </View>
          </AnimatedHoverCard>
        </View>
      )}

      {/* ADMIN: MESS MENU PUBLISHER */}
      {mode === 'admin' && subTab === 'mess' && (
        <AnimatedHoverCard style={styles.card}>
          <Text style={styles.cardTitle}>Weekly Mess Menu Publisher</Text>
          <View style={styles.formGrid}>
            <TextInput style={styles.input} placeholder="Day (e.g. Wednesday)" value={messDay} onChangeText={setMessDay} />
            <TextInput style={styles.input} placeholder="Breakfast" value={breakfast} onChangeText={setBreakfast} />
            <TextInput style={styles.input} placeholder="Lunch" value={lunch} onChangeText={setLunch} />
            <TextInput style={styles.input} placeholder="Snacks" value={snacks} onChangeText={setSnacks} />
            <TextInput style={styles.input} placeholder="Dinner" value={dinner} onChangeText={setDinner} />
          </View>
          <AnimatedButton
            style={styles.primaryBtn}
            onPress={async () => {
              if (!messDay || !breakfast || !lunch || !snacks || !dinner) return;
              await api.upsertMessMenu({ dayOfWeek: messDay, breakfast, lunch, snacks, dinner });
              setNotice(`✅ Published mess menu for ${messDay}.`);
              loadData();
            }}
          >
            <Text style={styles.primaryBtnText}>Publish Day Menu</Text>
          </AnimatedButton>
          {menus.map((m) => (
            <View key={m.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{m.dayOfWeek}</Text>
                <Text style={styles.itemSub}>
                  🍳 {m.breakfast} | 🍛 {m.lunch} | ☕ {m.snacks} | 🍽️ {m.dinner}
                </Text>
              </View>
            </View>
          ))}
        </AnimatedHoverCard>
      )}

      {/* ADMIN: MAINTENANCE TICKETS */}
      {mode === 'admin' && subTab === 'tickets' && (
        <AnimatedHoverCard style={styles.card}>
          <Text style={styles.cardTitle}>Hostel Maintenance Ticket Tracker</Text>
          {tickets.map((t) => (
            <View key={t.id} style={styles.listRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>
                  {t.title} — Room {t.room?.roomNumber} ({t.status})
                </Text>
                <Text style={styles.itemSub}>{t.description}</Text>
              </View>
              {t.status !== 'RESOLVED' && (
                <AnimatedButton
                  style={styles.primaryBtn}
                  onPress={async () => {
                    await api.updateHostelTicket(t.id, { status: 'RESOLVED' });
                    setNotice('✅ Ticket marked resolved.');
                    loadData();
                  }}
                >
                  <Text style={styles.primaryBtnText}>Resolve</Text>
                </AnimatedButton>
              )}
            </View>
          ))}
        </AnimatedHoverCard>
      )}

      {/* ADMIN: OUT-PASS APPROVAL QUEUE */}
      {mode === 'admin' && subTab === 'outpasses' && (
        <AnimatedHoverCard style={styles.card}>
          <Text style={styles.cardTitle}>Hostel Out-Pass & Early Pickup Approval Queue</Text>
          {gatePasses.length === 0 ? (
            <Text style={styles.emptyText}>No gate pass requests yet.</Text>
          ) : (
            gatePasses.map((gp) => (
              <View key={gp.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {gp.student?.user?.fullName || 'Visitor'} — {gp.passType} ({gp.status})
                  </Text>
                  <Text style={styles.itemSub}>
                    Reason: {gp.reason} {gp.destination ? `• Dest: ${gp.destination}` : ''}
                  </Text>
                  <Text style={styles.qrText}>QR Payload: {gp.qrPayload}</Text>
                </View>
                {(gp.status === 'PENDING_PARENT' || gp.status === 'PENDING_WARDEN') && (
                  <View style={styles.rightControls}>
                    <AnimatedButton
                      style={styles.primaryBtn}
                      onPress={async () => {
                        await api.wardenApproveGatePass(gp.id);
                        setNotice('✅ Gate pass approved & QR activated.');
                        loadData();
                      }}
                    >
                      <Text style={styles.primaryBtnText}>Approve</Text>
                    </AnimatedButton>
                    <TouchableOpacity
                      style={styles.dangerBtn}
                      onPress={async () => {
                        await api.rejectGatePass(gp.id);
                        loadData();
                      }}
                    >
                      <Text style={styles.dangerBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))
          )}
        </AnimatedHoverCard>
      )}

      {/* ADMIN: 4-DEPARTMENT NO-DUES & TC CLEARANCE */}
      {mode === 'admin' && subTab === 'nodues' && (
        <AnimatedHoverCard style={styles.card}>
          <Text style={styles.cardTitle}>Digital 4-Department No-Dues Clearance & TC Gate</Text>
          <View style={styles.chipRow}>
            {students.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[styles.chip, noDuesStudentId === s.id && styles.chipActive]}
                onPress={() => handleSelectNoDuesStudent(s.id)}
              >
                <Text style={[styles.chipText, noDuesStudentId === s.id && styles.chipTextActive]}>
                  {s.user?.fullName} ({s.admissionNo})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {renderNoDuesGrid(noDuesData)}
          {noDuesData && (
            <View style={[styles.rightControls, { marginTop: 14 }]}>
              <TouchableOpacity
                style={styles.outlineBtn}
                onPress={async () => {
                  await api.toggleLabClearance(noDuesData.student.id, !noDuesData.departments.labs.cleared);
                  handleSelectNoDuesStudent(noDuesData.student.id);
                }}
              >
                <Text style={styles.outlineBtnText}>
                  {noDuesData.departments.labs.cleared ? 'Revoke Lab Clearance' : 'Clear Lab Dues'}
                </Text>
              </TouchableOpacity>
              <AnimatedButton
                style={styles.primaryBtn}
                onPress={async () => {
                  try {
                    const tc = await api.generateTransferCertificate(noDuesData.student.id);
                    setNotice(`✅ Transfer Certificate Issued: ${tc.tcNumber}`);
                  } catch (e: any) {
                    setNotice(`⚠️ ${e.message}`);
                  }
                }}
              >
                <Text style={styles.primaryBtnText}>Generate Transfer Certificate (TC)</Text>
              </AnimatedButton>
            </View>
          )}
        </AnimatedHoverCard>
      )}

      {/* MEMBER VIEW (STUDENT / PARENT) */}
      {mode === 'member' && (
        <View style={styles.sectionStack}>
          {myAllocation && (
            <AnimatedHoverCard style={styles.card}>
              <Text style={styles.cardTitle}>My Hostel Residency</Text>
              <Text style={styles.itemTitle}>
                {myAllocation.room?.block?.blockName} • Room {myAllocation.room?.roomNumber} • Bed #{myAllocation.bedNumber}
              </Text>
              {menus.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  {menus.slice(0, 2).map((m) => (
                    <Text key={m.id} style={styles.itemSub}>
                      {m.dayOfWeek}: {m.breakfast} | {m.lunch} | {m.dinner}
                    </Text>
                  ))}
                </View>
              )}
            </AnimatedHoverCard>
          )}

          {/* Request & Approve QR Out-Pass / Early Pickup */}
          <AnimatedHoverCard style={styles.card}>
            <Text style={styles.cardTitle}>🎟️ QR Gate Out-Pass & Early Student Pickup</Text>
            <View style={styles.chipRow}>
              {(['HOSTEL_OUTPASS', 'EARLY_PICKUP'] as const).map((pt) => (
                <TouchableOpacity
                  key={pt}
                  style={[styles.chip, passType === pt && styles.chipActive]}
                  onPress={() => setPassType(pt)}
                >
                  <Text style={[styles.chipText, passType === pt && styles.chipTextActive]}>
                    {pt === 'HOSTEL_OUTPASS' ? 'Hostel Out-Pass' : 'Early Student Pickup'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.formGrid}>
              <TextInput style={styles.input} placeholder="Reason (e.g. Medical Appointment)" value={passReason} onChangeText={setPassReason} />
              <TextInput style={styles.input} placeholder="Destination (optional)" value={passDest} onChangeText={setPassDest} />
            </View>
            <AnimatedButton
              style={styles.primaryBtn}
              onPress={async () => {
                if (!passReason.trim()) return;
                await api.requestGatePass({ passType, reason: passReason, destination: passDest, studentId });
                setNotice('✅ Gate pass request submitted.');
                setPassReason('');
                setPassDest('');
                loadData();
              }}
            >
              <Text style={styles.primaryBtnText}>Request QR Pass</Text>
            </AnimatedButton>

            {myPasses.map((gp) => (
              <View key={gp.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {gp.passType} — {gp.status}
                  </Text>
                  <Text style={styles.itemSub}>
                    {gp.reason} {gp.destination ? `• ${gp.destination}` : ''}
                  </Text>
                  <Text style={styles.qrText}>QR Token: {gp.qrPayload}</Text>
                </View>
                {isParent && gp.status === 'PENDING_PARENT' && (
                  <View style={styles.rightControls}>
                    <AnimatedButton
                      style={styles.primaryBtn}
                      onPress={async () => {
                        await api.parentApproveGatePass(gp.id);
                        setNotice('✅ Parent approval recorded!');
                        loadData();
                      }}
                    >
                      <Text style={styles.primaryBtnText}>1-Tap Approve</Text>
                    </AnimatedButton>
                    <TouchableOpacity
                      style={styles.dangerBtn}
                      onPress={async () => {
                        await api.rejectGatePass(gp.id);
                        loadData();
                      }}
                    >
                      <Text style={styles.dangerBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </AnimatedHoverCard>

          {/* 4-Department No-Dues Clearance Tracker */}
          {noDuesData && (
            <AnimatedHoverCard style={styles.card}>
              <Text style={styles.cardTitle}>
                📋 4-Department No-Dues Clearance Tracker ({noDuesData.allCleared ? 'ALL CLEARED' : 'IN PROGRESS'})
              </Text>
              {renderNoDuesGrid(noDuesData)}
            </AnimatedHoverCard>
          )}
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
  heroBanner: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.sm
  },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  heroSub: { fontSize: 13, color: '#64748B', marginTop: 4 },
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
    minWidth: 180,
    flex: 1,
    marginBottom: spacing.xs
  },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' },
  chipActive: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  chipTextActive: { color: '#FFFFFF' },
  primaryBtn: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start'
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: borderRadius.md
  },
  outlineBtnText: { color: '#334155', fontWeight: '700', fontSize: 13 },
  blockSection: { marginTop: spacing.sm, marginBottom: spacing.md },
  blockTitle: { fontSize: 15, fontWeight: '800', color: '#1E3A8A', marginBottom: spacing.sm },
  roomsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  roomCard: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minWidth: 230,
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  roomCardSelected: { borderColor: '#1D4ED8', borderWidth: 2, backgroundColor: '#EFF6FF' },
  roomHeader: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  bedsRow: { gap: 6 },
  bedTile: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm
  },
  bedOccupied: { backgroundColor: '#DBEAFE' },
  bedFree: { backgroundColor: '#DCFCE7' },
  bedOccupiedText: { fontSize: 12, fontWeight: '700', color: '#1E40AF' },
  bedFreeText: { fontSize: 12, fontWeight: '600', color: '#166534' },
  vacateLink: { fontSize: 11, fontWeight: '800', color: '#B91C1C' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: spacing.md },
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
  qrText: { fontSize: 11, fontWeight: '800', color: '#1D4ED8', marginTop: 4 },
  rightControls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  dangerBtn: { backgroundColor: '#FEE2E2', paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.sm },
  dangerBtnText: { color: '#B91C1C', fontSize: 12, fontWeight: '700' },
  noDuesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  noDuesCard: {
    flex: 1,
    minWidth: 220,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1
  },
  noDuesOk: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  noDuesPending: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  noDuesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, gap: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeOk: { backgroundColor: '#DCFCE7' },
  badgeWarn: { backgroundColor: '#FEE2E2' },
  badgeOkText: { color: '#166534', fontSize: 11, fontWeight: '800' },
  badgeWarnText: { color: '#991B1B', fontSize: 11, fontWeight: '800' },
  emptyText: { color: '#64748B', fontSize: 13, fontStyle: 'italic' }
});
