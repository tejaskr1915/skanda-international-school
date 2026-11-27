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

interface CommsPtmWorkspaceProps {
  mode: 'admin' | 'teacher' | 'parent';
  studentId?: string;
  parentPhone?: string;
}

type AdminSubTab = 'ptm' | 'campaigns' | 'whatsapp';

export const CommsPtmWorkspace: React.FC<CommsPtmWorkspaceProps> = ({ mode, studentId, parentPhone }) => {
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [subTab, setSubTab] = useState<AdminSubTab>('ptm');

  // PTM State
  const [events, setEvents] = useState<any[]>([]);
  const [ptmTitle, setPtmTitle] = useState('');
  const [ptmDate, setPtmDate] = useState('2026-12-10');
  const [ptmStart, setPtmStart] = useState('10:00');
  const [ptmEnd, setPtmEnd] = useState('11:00');

  // DLT Campaigns State
  const [templates, setTemplates] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [selectedTplId, setSelectedTplId] = useState('');
  const [varInputs, setVarInputs] = useState<Record<string, string>>({});
  const [newTplId, setNewTplId] = useState('');
  const [newSenderId, setNewSenderId] = useState('SKANDA');
  const [newChannel, setNewChannel] = useState<'SMS' | 'WHATSAPP'>('SMS');
  const [newTrigger, setNewTrigger] = useState('ABSENCE');
  const [newBody, setNewBody] = useState('');

  // WhatsApp Simulator State
  const [waPhone, setWaPhone] = useState(parentPhone || '9876543210');
  const [waInput, setWaInput] = useState('');
  const [waMessages, setWaMessages] = useState<{ from: 'user' | 'bot'; text: string }[]>([
    { from: 'bot', text: '👋 Welcome to the Skanda WhatsApp Parent Bot Simulator! Send "menu" or tap a quick command below.' }
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const evRes = await api.getPtmEvents();
      setEvents(evRes.events || []);

      if (mode === 'admin') {
        const [tplRes, logRes] = await Promise.allSettled([api.getDltTemplates(), api.getCampaignLogs()]);
        if (tplRes.status === 'fulfilled') {
          const tList = tplRes.value.templates || [];
          setTemplates(tList);
          if (tList.length > 0 && !selectedTplId) setSelectedTplId(tList[0].id);
        }
        if (logRes.status === 'fulfilled') setLogs(logRes.value.logs || []);
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

  const handleCreatePtm = async () => {
    if (!ptmTitle.trim() || !ptmDate.trim() || !ptmStart.trim() || !ptmEnd.trim()) {
      setNotice('⚠️ Enter PTM title, date, start time, and end time.');
      return;
    }
    try {
      await api.createPtmEvent({
        title: ptmTitle.trim(),
        eventDate: ptmDate.trim(),
        startTime: ptmStart.trim(),
        endTime: ptmEnd.trim(),
        slotMinutes: 10,
        meetingMode: 'IN_PERSON'
      });
      setNotice('✅ PTM Event created & 10-minute non-overlapping slots generated.');
      setPtmTitle('');
      loadData();
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    }
  };

  const handleBookSlot = async (slotId: string) => {
    try {
      await api.bookPtmSlot(slotId, { studentId });
      setNotice('✅ 10-minute PTM slot booked!');
      loadData();
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    }
  };

  const activeTemplate = templates.find((t) => t.id === selectedTplId);
  const templatePlaceholders: string[] = activeTemplate
    ? Array.from(new Set((String(activeTemplate.bodyWithPlaceholders).match(/\{\{(\w+)\}\}/g) || []).map((m) => m.replace(/\{\{|\}\}/g, ''))))
    : [];

  const handleSendWa = async (textOverride?: string) => {
    const msg = (textOverride !== undefined ? textOverride : waInput).trim();
    if (!msg) return;
    setWaMessages((prev) => [...prev, { from: 'user', text: msg }]);
    if (textOverride === undefined) setWaInput('');
    try {
      const res = await api.sendWhatsAppBotMessage(waPhone, msg);
      setWaMessages((prev) => [...prev, { from: 'bot', text: res.reply || 'No reply.' }]);
    } catch (e: any) {
      setWaMessages((prev) => [...prev, { from: 'bot', text: `⚠️ ${e.message}` }]);
    }
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
        <Text style={styles.heroTitle}>💬 Smart PTM Booker, DLT Campaigns & WhatsApp Parent Bot</Text>
        <Text style={styles.heroSub}>
          {mode === 'admin'
            ? 'Manage 10-minute atomic PTM slots, DLT-validated SMS/WhatsApp campaigns & test the conversational Parent Bot.'
            : mode === 'teacher'
              ? 'Publish availability windows to auto-generate non-overlapping 10-minute PTM slots.'
              : 'Book 10-minute PTM slots with your child’s teachers or chat with the WhatsApp Parent Assistant.'}
        </Text>
      </AnimatedHoverCard>

      {mode === 'admin' && (
        <View style={styles.subTabRow}>
          {(
            [
              { id: 'ptm', label: `🗓️ PTM Booker (${events.length})` },
              { id: 'campaigns', label: `📢 DLT SMS/WhatsApp (${templates.length})` },
              { id: 'whatsapp', label: '🤖 WhatsApp Bot Simulator' }
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

      {/* PTM BOOKER SECTION */}
      {(mode !== 'admin' || subTab === 'ptm') && (
        <View style={styles.sectionStack}>
          {(mode === 'admin' || mode === 'teacher') && (
            <AnimatedHoverCard style={styles.card}>
              <Text style={styles.cardTitle}>Publish PTM Availability Window (Auto-Generates 10-Min Slots)</Text>
              <View style={styles.formGrid}>
                <TextInput style={styles.input} placeholder="PTM Title (e.g. Science Review)" value={ptmTitle} onChangeText={setPtmTitle} />
                <TextInput style={styles.input} placeholder="Date (YYYY-MM-DD)" value={ptmDate} onChangeText={setPtmDate} />
                <TextInput style={styles.input} placeholder="Start (HH:MM)" value={ptmStart} onChangeText={setPtmStart} />
                <TextInput style={styles.input} placeholder="End (HH:MM)" value={ptmEnd} onChangeText={setPtmEnd} />
              </View>
              <AnimatedButton style={styles.primaryBtn} onPress={handleCreatePtm}>
                <Text style={styles.primaryBtnText}>Publish & Generate 10-Min Slots</Text>
              </AnimatedButton>
            </AnimatedHoverCard>
          )}

          <AnimatedHoverCard style={styles.card}>
            <Text style={styles.cardTitle}>Available & Booked 10-Minute PTM Slots</Text>
            {events.map((ev) => (
              <View key={ev.id} style={styles.eventBlock}>
                <Text style={styles.itemTitle}>
                  {ev.title} — {ev.eventDate} ({ev.startTime} - {ev.endTime})
                </Text>
                <Text style={styles.itemSub}>
                  Teacher: {ev.teacher?.fullName || 'Faculty'} • Mode: {ev.meetingMode}
                </Text>
                <View style={styles.slotsGrid}>
                  {(ev.slots || []).map((s: any) => {
                    const isBooked = s.status === 'BOOKED';
                    return (
                      <TouchableOpacity
                        key={s.id}
                        disabled={isBooked && mode === 'parent'}
                        style={[styles.slotChip, isBooked ? styles.slotBooked : styles.slotAvail]}
                        onPress={() => {
                          if (!isBooked && (mode === 'parent' || mode === 'admin')) {
                            handleBookSlot(s.id);
                          }
                        }}
                      >
                        <Text style={isBooked ? styles.slotBookedText : styles.slotAvailText}>
                          {s.startTime}–{s.endTime} {isBooked ? '• Booked' : '• Book'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </AnimatedHoverCard>
        </View>
      )}

      {/* ADMIN: DLT CAMPAIGNS */}
      {mode === 'admin' && subTab === 'campaigns' && (
        <View style={styles.sectionStack}>
          <AnimatedHoverCard style={styles.card}>
            <Text style={styles.cardTitle}>Send DLT-Validated Bulk SMS / WhatsApp Campaign</Text>
            <View style={styles.chipRow}>
              {templates.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.chip, selectedTplId === t.id && styles.chipActive]}
                  onPress={() => {
                    setSelectedTplId(t.id);
                    setVarInputs({});
                  }}
                >
                  <Text style={[styles.chipText, selectedTplId === t.id && styles.chipTextActive]}>
                    {t.templateId} ({t.channel} • {t.eventTrigger})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {activeTemplate && (
              <>
                <Text style={styles.templatePreview}>{activeTemplate.bodyWithPlaceholders}</Text>
                <View style={styles.formGrid}>
                  {templatePlaceholders.map((ph) => (
                    <TextInput
                      key={ph}
                      style={styles.input}
                      placeholder={`Value for {{${ph}}}`}
                      value={varInputs[ph] || ''}
                      onChangeText={(val) => setVarInputs((prev) => ({ ...prev, [ph]: val }))}
                    />
                  ))}
                </View>
                <AnimatedButton
                  style={styles.primaryBtn}
                  onPress={async () => {
                    try {
                      const res = await api.sendDltCampaign({
                        templateId: activeTemplate.id,
                        targetAudience: 'ALL_PARENTS',
                        variables: varInputs
                      });
                      setNotice(`✅ DLT Validated & Dispatched to ${res.dispatchedCount} parent(s)!`);
                      loadData();
                    } catch (e: any) {
                      setNotice(`⚠️ ${e.message}`);
                    }
                  }}
                >
                  <Text style={styles.primaryBtnText}>Validate DLT & Dispatch to Parents</Text>
                </AnimatedButton>
              </>
            )}
          </AnimatedHoverCard>

          <AnimatedHoverCard style={styles.card}>
            <Text style={styles.cardTitle}>Register New DLT Template</Text>
            <View style={styles.formGrid}>
              <TextInput style={styles.input} placeholder="DLT Template ID (e.g. DLT-SKD-1003)" value={newTplId} onChangeText={setNewTplId} />
              <TextInput style={styles.input} placeholder="Sender ID (e.g. SKANDA)" value={newSenderId} onChangeText={setNewSenderId} />
              <TextInput style={styles.input} placeholder="Trigger (ABSENCE / FEE_DUE / BUS_DELAY)" value={newTrigger} onChangeText={setNewTrigger} />
            </View>
            <TextInput
              style={styles.input}
              placeholder="Body with {{placeholders}}"
              value={newBody}
              onChangeText={setNewBody}
            />
            <AnimatedButton
              style={styles.primaryBtn}
              onPress={async () => {
                if (!newTplId.trim() || !newBody.trim()) return;
                await api.createDltTemplate({
                  templateId: newTplId,
                  senderId: newSenderId,
                  channel: newChannel,
                  eventTrigger: newTrigger,
                  bodyWithPlaceholders: newBody
                });
                setNewTplId('');
                setNewBody('');
                setNotice('✅ DLT Template registered.');
                loadData();
              }}
            >
              <Text style={styles.primaryBtnText}>Save DLT Template</Text>
            </AnimatedButton>
          </AnimatedHoverCard>

          {logs.length > 0 && (
            <AnimatedHoverCard style={styles.card}>
              <Text style={styles.cardTitle}>Recent Campaign Delivery Logs ({logs.length})</Text>
              {logs.slice(0, 8).map((l) => (
                <View key={l.id} style={styles.listRow}>
                  <Text style={styles.itemTitle}>
                    [{l.channel}] {l.recipientPhone} — {l.templateId} ({l.status})
                  </Text>
                  <Text style={styles.itemSub}>{l.renderedBody}</Text>
                </View>
              ))}
            </AnimatedHoverCard>
          )}
        </View>
      )}

      {/* WHATSAPP BOT SIMULATOR (ADMIN & PARENT) */}
      {(mode === 'parent' || (mode === 'admin' && subTab === 'whatsapp')) && (
        <AnimatedHoverCard style={styles.card}>
          <Text style={styles.cardTitle}>🤖 Interactive WhatsApp Parent Bot Simulator</Text>
          <TextInput
            style={styles.input}
            placeholder="Registered Parent Mobile (e.g. 9876543210)"
            value={waPhone}
            onChangeText={setWaPhone}
          />
          <View style={styles.chipRow}>
            {[
              { label: 'Menu', cmd: 'menu' },
              { label: '1. Attendance', cmd: '1' },
              { label: '2. Fee & UPI', cmd: '2' },
              { label: '3. Fee Receipt', cmd: '3' },
              { label: '4. Apply Leave', cmd: '4' }
            ].map((q) => (
              <TouchableOpacity key={q.cmd} style={styles.chip} onPress={() => handleSendWa(q.cmd)}>
                <Text style={styles.chipText}>{q.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.chatBox}>
            {waMessages.map((m, idx) => (
              <View key={idx} style={[styles.chatBubble, m.from === 'user' ? styles.chatUser : styles.chatBot]}>
                <Text style={m.from === 'user' ? styles.chatUserText : styles.chatBotText}>{m.text}</Text>
              </View>
            ))}
          </View>
          <View style={styles.chatInputRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0 }]}
              placeholder="Type a message (e.g. 1, 2, or 2026-12-05 | Fever)..."
              value={waInput}
              onChangeText={setWaInput}
            />
            <AnimatedButton style={styles.primaryBtn} onPress={() => handleSendWa()}>
              <Text style={styles.primaryBtnText}>Send</Text>
            </AnimatedButton>
          </View>
        </AnimatedHoverCard>
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
  primaryBtn: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    alignSelf: 'flex-start'
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  eventBlock: { paddingTop: spacing.sm, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  slotChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: borderRadius.md, borderWidth: 1 },
  slotAvail: { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' },
  slotBooked: { backgroundColor: '#F1F5F9', borderColor: '#CBD5E1' },
  slotAvailText: { color: '#1D4ED8', fontWeight: '700', fontSize: 12 },
  slotBookedText: { color: '#64748B', fontWeight: '600', fontSize: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1' },
  chipActive: { backgroundColor: '#1D4ED8', borderColor: '#1D4ED8' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  chipTextActive: { color: '#FFFFFF' },
  templatePreview: {
    backgroundColor: '#F8FAFC',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    fontSize: 13,
    color: '#1E293B',
    marginBottom: spacing.sm
  },
  listRow: { paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  itemSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  chatBox: { backgroundColor: '#F1F5F9', borderRadius: borderRadius.md, padding: spacing.md, gap: 8, marginBottom: spacing.sm },
  chatBubble: { maxWidth: '85%', padding: 10, borderRadius: borderRadius.md },
  chatUser: { alignSelf: 'flex-end', backgroundColor: '#1D4ED8' },
  chatBot: { alignSelf: 'flex-start', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0' },
  chatUserText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  chatBotText: { color: '#0F172A', fontSize: 13 },
  chatInputRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' }
});
