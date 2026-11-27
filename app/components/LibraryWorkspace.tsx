import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Platform
} from 'react-native';
import api from '../services/api';
import { borderRadius, spacing, shadows } from '../theme/theme';
import { AnimatedHoverCard, AnimatedButton } from './AnimatedUI';

interface LibraryWorkspaceProps {
  mode: 'admin' | 'member';
  studentId?: string;
}

type AdminSubTab = 'catalog' | 'circulation' | 'reservations' | 'overdue';

export const LibraryWorkspace: React.FC<LibraryWorkspaceProps> = ({ mode, studentId }) => {
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [subTab, setSubTab] = useState<AdminSubTab>('catalog');

  // Shared Catalog State
  const [books, setBooks] = useState<any[]>([]);
  const [branchLimits, setBranchLimits] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Admin State
  const [issues, setIssues] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [isbn, setIsbn] = useState('');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('STEM');
  const [totalCopies, setTotalCopies] = useState('3');
  const [editingBookId, setEditingBookId] = useState<string | null>(null);

  // Quick Issue Form
  const [issueAccession, setIssueAccession] = useState('');
  const [issueEmail, setIssueEmail] = useState('');
  const [issueDueDate, setIssueDueDate] = useState('');

  // Barcode / QR Print Modal
  const [labelBook, setLabelBook] = useState<any>(null);

  // Member State
  const [myIssues, setMyIssues] = useState<any[]>([]);
  const [myReservations, setMyReservations] = useState<any[]>([]);
  const [syncedFinesDue, setSyncedFinesDue] = useState<number>(0);

  const loadData = async (searchOverride?: string, catOverride?: string) => {
    setLoading(true);
    try {
      const q = searchOverride !== undefined ? searchOverride : search;
      const c = catOverride !== undefined ? catOverride : categoryFilter;
      const catRes = await api.getLibraryBooks(q, c);
      setBooks(catRes.books || []);
      if (catRes.branchLimits) setBranchLimits(catRes.branchLimits);

      if (mode === 'admin') {
        const [issRes, resvRes] = await Promise.allSettled([
          api.getLibraryIssues(),
          api.getLibraryReservations()
        ]);
        if (issRes.status === 'fulfilled') setIssues(issRes.value.issues || []);
        if (resvRes.status === 'fulfilled') setReservations(resvRes.value.reservations || []);
      } else {
        const myRes = await api.getMyLibrary(studentId);
        setMyIssues(myRes.issues || []);
        setMyReservations(myRes.reservations || []);
        setSyncedFinesDue(myRes.syncedFinesDue || 0);
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

  const handleSaveBook = async () => {
    if (!isbn.trim() || !title.trim() || !author.trim()) {
      setNotice('⚠️ Please provide ISBN, Title, and Author.');
      return;
    }
    try {
      if (editingBookId) {
        await api.updateLibraryBook(editingBookId, {
          title: title.trim(),
          author: author.trim(),
          category: category.trim(),
          totalCopies: Number(totalCopies) || 1
        });
        setNotice('✅ Book updated successfully.');
      } else {
        await api.createLibraryBook({
          isbn: isbn.trim(),
          title: title.trim(),
          author: author.trim(),
          category: category.trim(),
          totalCopies: Number(totalCopies) || 1
        });
        setNotice('✅ Book added to branch library catalog.');
      }
      setIsbn('');
      setTitle('');
      setAuthor('');
      setCategory('STEM');
      setTotalCopies('3');
      setEditingBookId(null);
      loadData();
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    }
  };

  const handleEditBook = (b: any) => {
    setEditingBookId(b.id);
    setIsbn(b.isbn);
    setTitle(b.title);
    setAuthor(b.author);
    setCategory(b.category);
    setTotalCopies(String(b.totalCopies));
  };

  const handleDeleteBook = async (id: string) => {
    try {
      await api.deleteLibraryBook(id);
      setNotice('✅ Book removed from catalog.');
      loadData();
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    }
  };

  const handleIssueBook = async () => {
    if (!issueAccession.trim() || !issueEmail.trim()) {
      setNotice('⚠️ Enter both Accession Code (or Book ID) and Borrower Email.');
      return;
    }
    try {
      const res = await api.issueLibraryBook({
        accessionCode: issueAccession.trim(),
        email: issueEmail.trim(),
        dueDate: issueDueDate.trim() || undefined
      });
      setNotice(`✅ Issued "${res.issue?.book?.title || issueAccession}" to ${issueEmail.trim()}.`);
      setIssueAccession('');
      setIssueEmail('');
      setIssueDueDate('');
      loadData();
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    }
  };

  const handleReturnBook = async (issueId: string) => {
    try {
      const res = await api.returnLibraryBook(issueId);
      const fineMsg =
        res.fineAmount > 0
          ? ` | Overdue (${res.daysLate}d): ₹${res.fineAmount} synced to Fee Ledger.`
          : ' | Returned on time.';
      setNotice(`✅ Book returned${fineMsg}`);
      loadData();
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    }
  };

  const handleSyncOverdue = async () => {
    try {
      const res = await api.syncOverdueLibraryFines();
      setNotice(
        `✅ Daily Overdue Sync complete: ${res.overdueCount} overdue issue(s) processed, ₹${res.totalFineAdded} synced to Fee Ledger.`
      );
      loadData();
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    }
  };

  const handleReserve = async (bookId: string) => {
    try {
      await api.reserveLibraryBook(bookId);
      setNotice('✅ Book reserved! Pick up from the library desk once notified.');
      loadData();
    } catch (e: any) {
      setNotice(`⚠️ ${e.message}`);
    }
  };

  const overdueIssues = issues.filter(
    (iss) => iss.status === 'OVERDUE' || iss.fineAmount > 0 || (iss.status === 'ISSUED' && new Date(iss.dueDate) < new Date())
  );

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

      {/* Header Banner */}
      <AnimatedHoverCard style={styles.heroBanner}>
        <View style={styles.heroLeft}>
          <Text style={styles.heroTitle}>📚 Central Branch Library</Text>
          <Text style={styles.heroSub}>
            {mode === 'admin'
              ? `Catalog, Circulation, Reservations & Automated Fee Ledger Sync (Limits: ${branchLimits?.maxStudentBookLimit || 3} Student / ${branchLimits?.maxFacultyBookLimit || 5} Faculty • Fine: ₹${branchLimits?.libraryFinePerDay || 10}/day)`
              : 'Search branch books, place instant reservations, track due dates & synced library fines.'}
          </Text>
        </View>
        {mode === 'member' && (
          <View style={[styles.finePill, syncedFinesDue > 0 ? styles.finePillWarn : styles.finePillOk]}>
            <Text style={[styles.finePillText, syncedFinesDue > 0 ? styles.finePillTextWarn : styles.finePillTextOk]}>
              {syncedFinesDue > 0 ? `Synced Fines Due: ₹${syncedFinesDue}` : 'No Pending Library Fines'}
            </Text>
          </View>
        )}
      </AnimatedHoverCard>

      {/* Admin Sub-tabs */}
      {mode === 'admin' && (
        <View style={styles.subTabRow}>
          {(
            [
              { id: 'catalog', label: `📖 Catalog (${books.length})` },
              { id: 'circulation', label: `🔄 Issue / Return (${issues.filter((i) => i.status !== 'RETURNED').length})` },
              { id: 'reservations', label: `🔖 Reservations (${reservations.length})` },
              { id: 'overdue', label: `⚠️ Overdue & Fines (${overdueIssues.length})` }
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

      {loading ? (
        <ActivityIndicator size="large" color="#1D4ED8" style={{ marginVertical: 30 }} />
      ) : null}

      {/* ADMIN: CATALOG */}
      {mode === 'admin' && subTab === 'catalog' && (
        <View style={styles.sectionStack}>
          <AnimatedHoverCard style={styles.card}>
            <Text style={styles.cardTitle}>{editingBookId ? 'Edit Library Book' : 'Add New Book to Catalog'}</Text>
            <View style={styles.formGrid}>
              <TextInput
                style={styles.input}
                placeholder="ISBN (e.g. 978-0134685991)"
                value={isbn}
                onChangeText={setIsbn}
                editable={!editingBookId}
              />
              <TextInput style={styles.input} placeholder="Book Title" value={title} onChangeText={setTitle} />
              <TextInput style={styles.input} placeholder="Author Name" value={author} onChangeText={setAuthor} />
              <TextInput style={styles.input} placeholder="Category (STEM, Literature...)" value={category} onChangeText={setCategory} />
              <TextInput
                style={styles.input}
                placeholder="Total Copies"
                value={totalCopies}
                onChangeText={setTotalCopies}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.rowActions}>
              <AnimatedButton style={styles.primaryBtn} onPress={handleSaveBook}>
                <Text style={styles.primaryBtnText}>{editingBookId ? 'Update Book' : 'Add Book'}</Text>
              </AnimatedButton>
              {editingBookId && (
                <TouchableOpacity
                  style={styles.outlineBtn}
                  onPress={() => {
                    setEditingBookId(null);
                    setIsbn('');
                    setTitle('');
                    setAuthor('');
                    setTotalCopies('3');
                  }}
                >
                  <Text style={styles.outlineBtnText}>Cancel Edit</Text>
                </TouchableOpacity>
              )}
            </View>
          </AnimatedHoverCard>

          <AnimatedHoverCard style={styles.card}>
            <View style={styles.searchRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Search by Title, Author, ISBN, or Accession Code..."
                value={search}
                onChangeText={setSearch}
              />
              <AnimatedButton style={styles.primaryBtn} onPress={() => loadData(search, categoryFilter)}>
                <Text style={styles.primaryBtnText}>Search</Text>
              </AnimatedButton>
            </View>

            {books.map((b) => (
              <View key={b.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{b.title}</Text>
                  <Text style={styles.itemSub}>
                    {b.author} • ISBN: {b.isbn} • {b.category}
                  </Text>
                  <Text style={styles.accessionBadge}>Accession: {b.accessionCode}</Text>
                </View>
                <View style={styles.rightControls}>
                  <View style={[styles.availPill, b.availableCopies > 0 ? styles.availOk : styles.availEmpty]}>
                    <Text style={b.availableCopies > 0 ? styles.availOkText : styles.availEmptyText}>
                      {b.availableCopies} / {b.totalCopies} Avail
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.smallBtn} onPress={() => setLabelBook(b)}>
                    <Text style={styles.smallBtnText}>🏷️ Label</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.smallBtn} onPress={() => handleEditBook(b)}>
                    <Text style={styles.smallBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.smallBtn, styles.dangerBtn]} onPress={() => handleDeleteBook(b.id)}>
                    <Text style={styles.dangerBtnText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </AnimatedHoverCard>
        </View>
      )}

      {/* ADMIN: CIRCULATION (ISSUE / RETURN) */}
      {mode === 'admin' && subTab === 'circulation' && (
        <View style={styles.sectionStack}>
          <AnimatedHoverCard style={styles.card}>
            <Text style={styles.cardTitle}>Quick Issue Book</Text>
            <View style={styles.formGrid}>
              <TextInput
                style={styles.input}
                placeholder="Accession Code (e.g. LIB-BLR-0001)"
                value={issueAccession}
                onChangeText={setIssueAccession}
              />
              <TextInput
                style={styles.input}
                placeholder="Borrower Email (e.g. student1.blr@skanda.edu.in)"
                value={issueEmail}
                onChangeText={setIssueEmail}
              />
              <TextInput
                style={styles.input}
                placeholder="Due Date YYYY-MM-DD (optional, default +14d)"
                value={issueDueDate}
                onChangeText={setIssueDueDate}
              />
            </View>
            <AnimatedButton style={styles.primaryBtn} onPress={handleIssueBook}>
              <Text style={styles.primaryBtnText}>Issue Book</Text>
            </AnimatedButton>
          </AnimatedHoverCard>

          <AnimatedHoverCard style={styles.card}>
            <Text style={styles.cardTitle}>Active & Recent Issues</Text>
            {issues.map((iss) => (
              <View key={iss.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {iss.book?.title} ({iss.book?.accessionCode})
                  </Text>
                  <Text style={styles.itemSub}>
                    Borrower: {iss.user?.fullName} ({iss.user?.email} • {iss.user?.role})
                  </Text>
                  <Text style={styles.itemSub}>
                    Due: {new Date(iss.dueDate).toLocaleDateString()} • Status: {iss.status}
                    {iss.fineAmount > 0 ? ` • Fine: ₹${iss.fineAmount}` : ''}
                  </Text>
                </View>
                {iss.status !== 'RETURNED' ? (
                  <AnimatedButton style={styles.primaryBtn} onPress={() => handleReturnBook(iss.id)}>
                    <Text style={styles.primaryBtnText}>Return Book</Text>
                  </AnimatedButton>
                ) : (
                  <View style={styles.returnedBadge}>
                    <Text style={styles.returnedBadgeText}>Returned</Text>
                  </View>
                )}
              </View>
            ))}
          </AnimatedHoverCard>
        </View>
      )}

      {/* ADMIN: RESERVATIONS */}
      {mode === 'admin' && subTab === 'reservations' && (
        <AnimatedHoverCard style={styles.card}>
          <Text style={styles.cardTitle}>Branch Reservation Queue</Text>
          {reservations.length === 0 ? (
            <Text style={styles.emptyText}>No active reservations.</Text>
          ) : (
            reservations.map((r) => (
              <View key={r.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>
                    {r.book?.title} ({r.book?.accessionCode})
                  </Text>
                  <Text style={styles.itemSub}>
                    Requested by: {r.user?.fullName} ({r.user?.email}) • Status: {r.status}
                  </Text>
                </View>
                <AnimatedButton
                  style={styles.primaryBtn}
                  onPress={() => {
                    setIssueAccession(r.book?.accessionCode || '');
                    setIssueEmail(r.user?.email || '');
                    setSubTab('circulation');
                  }}
                >
                  <Text style={styles.primaryBtnText}>Load to Issue</Text>
                </AnimatedButton>
              </View>
            ))
          )}
        </AnimatedHoverCard>
      )}

      {/* ADMIN: OVERDUE & DAILY FEE SYNC */}
      {mode === 'admin' && subTab === 'overdue' && (
        <AnimatedHoverCard style={styles.card}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Overdue Books & Automated Fee Ledger Sync</Text>
              <Text style={styles.itemSub}>
                Calculates overdue fines (₹{branchLimits?.libraryFinePerDay || 10}/day) and posts directly to student FeeInvoice.finesDue.
              </Text>
            </View>
            <AnimatedButton style={styles.primaryBtn} onPress={handleSyncOverdue}>
              <Text style={styles.primaryBtnText}>Run Daily Overdue Sync</Text>
            </AnimatedButton>
          </View>
          {overdueIssues.length === 0 ? (
            <Text style={styles.emptyText}>All borrowed books are currently within due dates.</Text>
          ) : (
            overdueIssues.map((iss) => (
              <View key={iss.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{iss.book?.title}</Text>
                  <Text style={styles.itemSub}>
                    {iss.user?.fullName} ({iss.user?.email}) • Due: {new Date(iss.dueDate).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.fineBadge}>
                  <Text style={styles.fineBadgeText}>
                    ₹{iss.fineAmount} {iss.fineSyncedToInvoice ? '(Synced)' : '(Pending)'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </AnimatedHoverCard>
      )}

      {/* MEMBER VIEW (STUDENT / PARENT / TEACHER) */}
      {mode === 'member' && (
        <View style={styles.sectionStack}>
          {/* My Borrowed Books */}
          <AnimatedHoverCard style={styles.card}>
            <Text style={styles.cardTitle}>My Borrowed Books & Due-Date Countdowns</Text>
            {myIssues.length === 0 ? (
              <Text style={styles.emptyText}>No books currently borrowed.</Text>
            ) : (
              myIssues.map((iss) => (
                <View key={iss.id} style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>
                      {iss.book?.title} ({iss.book?.accessionCode})
                    </Text>
                    <Text style={styles.itemSub}>
                      Author: {iss.book?.author} • Due: {new Date(iss.dueDate).toLocaleDateString()}
                    </Text>
                  </View>
                  {iss.status === 'RETURNED' ? (
                    <View style={styles.returnedBadge}>
                      <Text style={styles.returnedBadgeText}>
                        Returned {iss.fineAmount > 0 ? `(Fine ₹${iss.fineAmount})` : ''}
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.availPill,
                        iss.daysRemaining < 0 ? styles.availEmpty : styles.availOk
                      ]}
                    >
                      <Text style={iss.daysRemaining < 0 ? styles.availEmptyText : styles.availOkText}>
                        {iss.daysRemaining < 0
                          ? `Overdue by ${Math.abs(iss.daysRemaining)}d`
                          : `Due in ${iss.daysRemaining}d`}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </AnimatedHoverCard>

          {/* My Reservations */}
          {myReservations.length > 0 && (
            <AnimatedHoverCard style={styles.card}>
              <Text style={styles.cardTitle}>My Book Reservations</Text>
              {myReservations.map((r) => (
                <View key={r.id} style={styles.listRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{r.book?.title}</Text>
                    <Text style={styles.itemSub}>
                      Accession: {r.book?.accessionCode} • Status: {r.status}
                    </Text>
                  </View>
                </View>
              ))}
            </AnimatedHoverCard>
          )}

          {/* Searchable Catalog */}
          <AnimatedHoverCard style={styles.card}>
            <Text style={styles.cardTitle}>Search Branch Library Catalog</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Search books by title, author, or ISBN..."
                value={search}
                onChangeText={setSearch}
              />
              <AnimatedButton style={styles.primaryBtn} onPress={() => loadData(search, categoryFilter)}>
                <Text style={styles.primaryBtnText}>Search</Text>
              </AnimatedButton>
            </View>
            {books.map((b) => (
              <View key={b.id} style={styles.listRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{b.title}</Text>
                  <Text style={styles.itemSub}>
                    {b.author} • {b.category} • Accession: {b.accessionCode}
                  </Text>
                </View>
                <View style={styles.rightControls}>
                  <View style={[styles.availPill, b.availableCopies > 0 ? styles.availOk : styles.availEmpty]}>
                    <Text style={b.availableCopies > 0 ? styles.availOkText : styles.availEmptyText}>
                      {b.availableCopies > 0 ? `${b.availableCopies} Available` : 'Checked Out'}
                    </Text>
                  </View>
                  <AnimatedButton style={styles.primaryBtn} onPress={() => handleReserve(b.id)}>
                    <Text style={styles.primaryBtnText}>Reserve</Text>
                  </AnimatedButton>
                </View>
              </View>
            ))}
          </AnimatedHoverCard>
        </View>
      )}

      {/* Printable Barcode / QR Accession Label Modal */}
      <Modal visible={Boolean(labelBook)} transparent animationType="fade" onRequestClose={() => setLabelBook(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Printable Accession Label</Text>
            {labelBook && (
              <View style={styles.labelSheet}>
                <Text style={styles.labelSchool}>SKANDA INTERNATIONAL SCHOOL LIBRARY</Text>
                <Text style={styles.labelBookTitle}>{labelBook.title}</Text>
                <Text style={styles.labelMeta}>
                  {labelBook.author} • ISBN {labelBook.isbn}
                </Text>
                {/* Simulated Barcode */}
                <View style={styles.barcodeRow}>
                  {Array.from({ length: 28 }).map((_, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.barcodeBar,
                        { width: idx % 3 === 0 ? 4 : idx % 2 === 0 ? 2 : 1, marginRight: idx % 4 === 0 ? 3 : 1 }
                      ]}
                    />
                  ))}
                </View>
                <Text style={styles.labelCode}>{labelBook.accessionCode}</Text>
                <View style={styles.qrBadge}>
                  <Text style={styles.qrBadgeText}>QR: {labelBook.accessionCode}</Text>
                </View>
              </View>
            )}
            <View style={styles.rowActions}>
              {Platform.OS === 'web' && (
                <AnimatedButton
                  style={styles.primaryBtn}
                  onPress={() => {
                    if (typeof window !== 'undefined') window.print();
                  }}
                >
                  <Text style={styles.primaryBtnText}>Print Label</Text>
                </AnimatedButton>
              )}
              <TouchableOpacity style={styles.outlineBtn} onPress={() => setLabelBook(null)}>
                <Text style={styles.outlineBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.sm
  },
  heroLeft: { flex: 1, minWidth: 260 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  heroSub: { fontSize: 13, color: '#64748B', marginTop: 4 },
  finePill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  finePillOk: { backgroundColor: '#DCFCE7' },
  finePillWarn: { backgroundColor: '#FEE2E2' },
  finePillText: { fontSize: 13, fontWeight: '700' },
  finePillTextOk: { color: '#166534' },
  finePillTextWarn: { color: '#991B1B' },
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
  headerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: '#F8FAFC',
    minWidth: 200,
    flex: 1,
    marginBottom: spacing.xs
  },
  searchRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginBottom: spacing.md },
  rowActions: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: spacing.xs },
  primaryBtn: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  outlineBtn: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.md
  },
  outlineBtnText: { color: '#334155', fontWeight: '700', fontSize: 13 },
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
  accessionBadge: { fontSize: 11, fontWeight: '700', color: '#1D4ED8', marginTop: 4 },
  rightControls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs },
  availPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  availOk: { backgroundColor: '#DBEAFE' },
  availEmpty: { backgroundColor: '#FEE2E2' },
  availOkText: { color: '#1E40AF', fontSize: 12, fontWeight: '700' },
  availEmptyText: { color: '#991B1B', fontSize: 12, fontWeight: '700' },
  smallBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm
  },
  smallBtnText: { fontSize: 12, fontWeight: '600', color: '#334155' },
  dangerBtn: { backgroundColor: '#FEE2E2' },
  dangerBtnText: { fontSize: 12, fontWeight: '600', color: '#B91C1C' },
  returnedBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  returnedBadgeText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  fineBadge: { backgroundColor: '#FEF2F2', paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.md, borderWidth: 1, borderColor: '#FECACA' },
  fineBadgeText: { color: '#991B1B', fontWeight: '700', fontSize: 12 },
  emptyText: { color: '#64748B', fontSize: 13, fontStyle: 'italic', paddingVertical: spacing.sm },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 420,
    ...shadows.md
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: '#0F172A', marginBottom: spacing.md },
  labelSheet: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#1D4ED8',
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    marginBottom: spacing.md
  },
  labelSchool: { fontSize: 10, fontWeight: '800', color: '#1D4ED8', letterSpacing: 0.8 },
  labelBookTitle: { fontSize: 15, fontWeight: '800', color: '#0F172A', marginTop: 6, textAlign: 'center' },
  labelMeta: { fontSize: 11, color: '#64748B', marginTop: 2, marginBottom: 12 },
  barcodeRow: { flexDirection: 'row', alignItems: 'center', height: 42, marginBottom: 6 },
  barcodeBar: { height: 42, backgroundColor: '#0F172A' },
  labelCode: { fontSize: 14, fontWeight: '800', letterSpacing: 1.5, color: '#0F172A' },
  qrBadge: {
    marginTop: 8,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: '#BFDBFE'
  },
  qrBadgeText: { fontSize: 11, fontWeight: '700', color: '#1D4ED8' }
});
