import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, borderRadius, spacing, shadows } from '../theme/theme';
import { PublicHeader } from '../components/PublicHeader';
import { PublicFooter } from '../components/PublicFooter';
import { LoginModal } from '../components/LoginModal';
import { StatusModal } from '../components/StatusModal';

export const HomeScreen: React.FC = () => {
  const { navigateTo } = useAuth();
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  // Filter state for Find a school/college
  const [selectedState, setSelectedState] = useState('Karnataka');
  const [selectedCity, setSelectedCity] = useState('Bengaluru');
  const [selectedProgram, setSelectedProgram] = useState('All Programmes');
  const [activePin, setActivePin] = useState<number>(0);

  const campuses = [
    {
      id: 0,
      name: 'Skanda International Public School',
      location: 'Bengaluru — Kanakapura Rd',
      board: 'CBSE, Grades 1–12',
      seats: 'Admissions Open',
      x: 35,
      y: 60
    },
    {
      id: 1,
      name: 'Skanda World School (ICSE Campus)',
      location: 'Bengaluru — Whitefield',
      board: 'ICSE / ISC, Grades 1–12',
      seats: 'Limited Seats',
      x: 65,
      y: 35
    },
    {
      id: 2,
      name: 'Skanda Institute of Technology',
      location: 'Mysuru — Hunsur Rd',
      board: 'B.Tech / M.Tech AICTE',
      seats: 'Merit Applications Open',
      x: 25,
      y: 40
    },
    {
      id: 3,
      name: 'Skanda College of Commerce & Management',
      location: 'Mangaluru — Hampankatta',
      board: 'B.Com / BBA / MBA',
      seats: 'Scholarship Available',
      x: 50,
      y: 75
    }
  ];

  return (
    <View style={styles.container}>
      <PublicHeader onOpenLogin={() => setLoginModalVisible(true)} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* HERO BANNER SECTION (Royal Blue Gradient) */}
        <View style={styles.heroBanner}>
          <View style={styles.heroContent}>
            <View style={styles.heroTextCol}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>🎓 ADMISSIONS OPEN FOR 2026-2027</Text>
              </View>
              <Text style={styles.heroTitle}>
                Learning that opens every door
              </Text>
              <Text style={styles.heroSubtitle}>
                Welcome to Skanda International School: holistic quality education across CBSE, ICSE, and College disciplines that empowers students to excel in knowledge, leadership, and lifelong character.
              </Text>

              <View style={styles.heroBtnRow}>
                <TouchableOpacity
                  style={styles.heroPrimaryBtn}
                  onPress={() => navigateTo('/apply')}
                  activeOpacity={0.88}
                >
                  <Text style={styles.heroPrimaryBtnText}>Apply Online ➜</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.heroSecondaryBtn}
                  onPress={() => setStatusModalVisible(true)}
                  activeOpacity={0.88}
                >
                  <Text style={styles.heroSecondaryBtnText}>Track Application Status</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Campus Architectural Illustration Graphic */}
            <View style={styles.heroIllustrationContainer}>
              <View style={styles.buildingSilhouette}>
                <View style={styles.pedimentTriangle} />
                <View style={styles.buildingPillarsRow}>
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <View key={i} style={styles.pillar} />
                  ))}
                </View>
                <View style={styles.buildingBase} />
                <View style={styles.portalArch}>
                  <Text style={styles.archEmblem}>SIS</Text>
                </View>
              </View>
              <View style={styles.lawnStrip} />
            </View>
          </View>
        </View>

        {/* LATEST ANNOUNCEMENT TICKER */}
        <View style={styles.tickerBar}>
          <View style={styles.tickerInner}>
            <View style={styles.tickerTag}>
              <Text style={styles.tickerTagText}>Latest</Text>
            </View>
            <Text style={styles.tickerText}>
              • Admissions 2026–2028 are now open for Nursery to Grade 12 & Undergraduate courses
              • Campus Open Day & Interactive Orientation this Saturday
              • Merit Scholarships up to 50% available
            </Text>
          </View>
        </View>

        {/* 5 INSTITUTIONAL STATISTICS CARDS */}
        <View style={styles.statsSection}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>25,000+</Text>
              <Text style={styles.statLabel}>Students Enrolled</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>40</Text>
              <Text style={styles.statLabel}>Schools Nationwide</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>18</Text>
              <Text style={styles.statLabel}>Colleges & Branches</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>1,200+</Text>
              <Text style={styles.statLabel}>Expert Faculty</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>15</Text>
              <Text style={styles.statLabel}>Cities Across India</Text>
            </View>
          </View>
        </View>

        {/* FIND A SCHOOL OR COLLEGE SECTION */}
        <View style={styles.findCampusSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeading}>Find a school or college</Text>
            <Text style={styles.sectionSubheading}>
              Choose your state, city and programme to see campuses near you.
            </Text>
          </View>

          {/* Filter Bar */}
          <View style={styles.filterBar}>
            <View style={styles.filterPill}>
              <Text style={styles.filterLabel}>State: </Text>
              <Text style={styles.filterValue}>{selectedState}</Text>
            </View>
            <View style={styles.filterPill}>
              <Text style={styles.filterLabel}>City: </Text>
              <Text style={styles.filterValue}>{selectedCity}</Text>
            </View>
            <View style={styles.filterPill}>
              <Text style={styles.filterLabel}>Programme: </Text>
              <Text style={styles.filterValue}>{selectedProgram}</Text>
            </View>
            <TouchableOpacity style={styles.searchPillBtn}>
              <Text style={styles.searchPillText}>Search Campuses</Text>
            </TouchableOpacity>
          </View>

          {/* Interactive Map & Campus Cards Grid */}
          <View style={styles.campusExplorer}>
            {/* Interactive Campus Map Canvas */}
            <View style={styles.mapCanvas}>
              <Text style={styles.mapTitle}>🗺️ Interactive Campus Geo-Locator</Text>
              <View style={styles.mapGridLines}>
                {[1, 2, 3, 4].map(line => (
                  <View key={line} style={[styles.mapGridLine, { top: `${line * 20}%` }]} />
                ))}
              </View>

              {/* Interactive Campus Pins */}
              {campuses.map(campus => (
                <TouchableOpacity
                  key={campus.id}
                  style={[
                    styles.mapPin,
                    { left: `${campus.x}%`, top: `${campus.y}%` },
                    activePin === campus.id && styles.mapPinActive
                  ]}
                  onPress={() => setActivePin(campus.id)}
                >
                  <View style={[styles.pinDot, activePin === campus.id && styles.pinDotActive]} />
                  <Text style={styles.pinName} numberOfLines={1}>{campus.name.split(' ')[1] || 'Campus'}</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.mapHint}>Map shows campus pins • Click to highlight details</Text>
            </View>

            {/* Campus Cards List */}
            <View style={styles.campusCardsCol}>
              {campuses.map(campus => {
                const isSelected = activePin === campus.id;
                return (
                  <TouchableOpacity
                    key={campus.id}
                    style={[styles.campusCard, isSelected && styles.campusCardSelected]}
                    onPress={() => setActivePin(campus.id)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.campusIconBox}>
                      <Text style={styles.campusIcon}>🏫</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.campusName}>{campus.name}</Text>
                      <Text style={styles.campusLoc}>{campus.location} • {campus.board}</Text>
                      <View style={styles.seatsBadge}>
                        <Text style={styles.seatsText}>● {campus.seats}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.viewDetailBtn}
                      onPress={() => navigateTo('/apply')}
                    >
                      <Text style={styles.viewDetailText}>Apply ➜</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* 4 QUICK-LINK CARDS */}
        <View style={styles.quickLinksSection}>
          <View style={styles.quickGrid}>
            <TouchableOpacity
              style={styles.quickCard}
              onPress={() => navigateTo('/apply')}
              activeOpacity={0.88}
            >
              <View style={[styles.quickIconCircle, { backgroundColor: '#EFF6FF' }]}>
                <Text style={styles.quickIcon}>📝</Text>
              </View>
              <Text style={styles.quickTitle}>Admissions</Text>
              <Text style={styles.quickDesc}>Inquiry, eligibility and online multi-step admission wizard.</Text>
              <View style={styles.quickActionPill}>
                <Text style={styles.quickActionText}>Apply Now ➜</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickCard} onPress={() => navigateTo('/')} activeOpacity={0.88}>
              <View style={[styles.quickIconCircle, { backgroundColor: '#F0FDF4' }]}>
                <Text style={styles.quickIcon}>⚽</Text>
              </View>
              <Text style={styles.quickTitle}>Student Life</Text>
              <Text style={styles.quickDesc}>Robotics, olympics-grade sports, clubs, events and creative arts.</Text>
              <View style={styles.quickActionPill}>
                <Text style={styles.quickActionText}>Explore Life ➜</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickCard} onPress={() => navigateTo('/')} activeOpacity={0.88}>
              <View style={[styles.quickIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.quickIcon}>🏆</Text>
              </View>
              <Text style={styles.quickTitle}>Achievements</Text>
              <Text style={styles.quickDesc}>National toppers, Olympiad medalists, science innovation awards.</Text>
              <View style={styles.quickActionPill}>
                <Text style={styles.quickActionText}>View Honors ➜</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickCard} onPress={() => navigateTo('/')} activeOpacity={0.88}>
              <View style={[styles.quickIconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Text style={styles.quickIcon}>💼</Text>
              </View>
              <Text style={styles.quickTitle}>Careers</Text>
              <Text style={styles.quickDesc}>Join our passionate team of 1,200+ inspiring educators and staff.</Text>
              <View style={styles.quickActionPill}>
                <Text style={styles.quickActionText}>Openings ➜</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* NEWS AND EVENTS 3-CARD GRID */}
        <View style={styles.newsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeading}>News and events</Text>
            <Text style={styles.sectionSubheading}>What is happening across our school and college campuses.</Text>
          </View>

          <View style={styles.newsGrid}>
            <View style={styles.newsCard}>
              <View style={[styles.newsHeaderBox, { backgroundColor: '#DBEAFE' }]}>
                <Text style={styles.newsIcon}>🎓</Text>
              </View>
              <View style={styles.newsContent}>
                <Text style={styles.newsDate}>12 Nov 2026 • Academic Achievements</Text>
                <Text style={styles.newsTitle}>Class of 2026 records 98% distinction rate in national board exams</Text>
                <Text style={styles.newsSnippet}>
                  SIS students demonstrated extraordinary academic mastery with over 45 students scoring 99+ percentile in STEM and Humanities.
                </Text>
              </View>
            </View>

            <View style={styles.newsCard}>
              <View style={[styles.newsHeaderBox, { backgroundColor: '#E0F2FE' }]}>
                <Text style={styles.newsIcon}>🔬</Text>
              </View>
              <View style={styles.newsContent}>
                <Text style={styles.newsDate}>08 Nov 2026 • Innovation & Science</Text>
                <Text style={styles.newsTitle}>Inter-campus science & robotics expo draws 3,000 visitors</Text>
                <Text style={styles.newsSnippet}>
                  Students showcased 200+ working prototypes including AI-powered agriculture sensors, smart solar grids, and biomimetic robotics.
                </Text>
              </View>
            </View>

            <View style={styles.newsCard}>
              <View style={[styles.newsHeaderBox, { backgroundColor: '#FEF3C7' }]}>
                <Text style={styles.newsIcon}>📢</Text>
              </View>
              <View style={styles.newsContent}>
                <Text style={styles.newsDate}>28 Oct 2026 • Admissions Alert</Text>
                <Text style={styles.newsTitle}>Merit and sports scholarship applications open for 2026–2027</Text>
                <Text style={styles.newsSnippet}>
                  Financial grants and merit concessions available for exceptional academic and state/national level sports achievers.
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* WHY FAMILIES CHOOSE SKANDA */}
        <View style={styles.whySection}>
          <View style={styles.whyContentRow}>
            <View style={styles.whyGraphicBox}>
              <View style={styles.whyGraphicBackdrop}>
                <Text style={styles.whyEmoji}>🏛️</Text>
                <Text style={styles.whyGraphicText}>Excellence in Education since 1996</Text>
              </View>
            </View>

            <View style={styles.whyTextCol}>
              <Text style={styles.whyTitle}>Why families choose Skanda International</Text>
              <Text style={styles.whyDesc}>
                For three decades, Skanda International School has nurtured resilient, confident learners ready to lead in a dynamic global world.
              </Text>

              <View style={styles.whyPoints}>
                <View style={styles.pointRow}>
                  <View style={styles.checkBubble}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pointTitle}>Experienced & Caring Faculty</Text>
                    <Text style={styles.pointBody}>
                      Over 1,200 trained mentors, Cambridge & NCERT certified teachers dedicated to individual student growth.
                    </Text>
                  </View>
                </View>

                <View style={styles.pointRow}>
                  <View style={styles.checkBubble}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pointTitle}>World-Class Modern Campuses</Text>
                    <Text style={styles.pointBody}>
                      Smart interactive digital classrooms, advanced STEM & language labs, Olympic swimming pools, and Wi-Fi enabled boarding facilities.
                    </Text>
                  </View>
                </View>

                <View style={styles.pointRow}>
                  <View style={styles.checkBubble}>
                    <Text style={styles.checkText}>✓</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pointTitle}>Consistent Board & Career Results</Text>
                    <Text style={styles.pointBody}>
                      100% board pass track record, premier IIT-JEE, NEET, CLAT coaching integrations, and top global university admissions.
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* BOTTOM CTA BANNER */}
        <View style={styles.bottomCtaWrapper}>
          <View style={styles.bottomCtaBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaTitle}>Ready to join Skanda International School?</Text>
              <Text style={styles.ctaSub}>
                Start your online admission application in minutes with our auto-saving multi-step wizard.
              </Text>
            </View>
            <View style={styles.ctaActionRow}>
              <TouchableOpacity
                style={styles.ctaPrimaryBtn}
                onPress={() => navigateTo('/apply')}
              >
                <Text style={styles.ctaPrimaryText}>Apply Online ➜</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ctaSecondaryBtn}
                onPress={() => setLoginModalVisible(true)}
              >
                <Text style={styles.ctaSecondaryText}>Resume Saved Application</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* DEEP NAVY FOOTER */}
        <PublicFooter />
      </ScrollView>

      {/* MODALS */}
      <LoginModal visible={loginModalVisible} onClose={() => setLoginModalVisible(false)} />
      <StatusModal
        visible={statusModalVisible}
        onClose={() => setStatusModalVisible(false)}
        onOpenLogin={() => {
          setStatusModalVisible(false);
          setLoginModalVisible(true);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgPage
  },
  scroll: {
    flex: 1
  },
  heroBanner: {
    backgroundColor: colors.brandDark,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.section,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: borderRadius.xl,
    borderBottomRightRadius: borderRadius.xl
  },
  heroContent: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 40
  },
  heroTextCol: {
    flex: 1,
    minWidth: 320
  },
  heroBadge: {
    backgroundColor: 'rgba(219, 234, 254, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(219, 234, 254, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: spacing.md
  },
  heroBadgeText: {
    color: '#93C5FD',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  heroTitle: {
    fontSize: Platform.OS === 'web' ? 44 : 32,
    fontWeight: '900',
    color: colors.textInverse,
    lineHeight: Platform.OS === 'web' ? 52 : 38,
    letterSpacing: -1,
    marginBottom: spacing.md
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#DBEAFE',
    lineHeight: 24,
    marginBottom: spacing.xl,
    maxWidth: 580
  },
  heroBtnRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  heroPrimaryBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    ...shadows.hover
  },
  heroPrimaryBtnText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '700'
  },
  heroSecondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: borderRadius.md
  },
  heroSecondaryBtnText: {
    color: colors.textInverse,
    fontSize: 15,
    fontWeight: '600'
  },
  heroIllustrationContainer: {
    width: 320,
    height: 220,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)'
  },
  buildingSilhouette: {
    alignItems: 'center',
    width: '100%'
  },
  pedimentTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 110,
    borderRightWidth: 110,
    borderBottomWidth: 35,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#DBEAFE'
  },
  buildingPillarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: 200,
    height: 70,
    backgroundColor: '#BFDBFE',
    paddingHorizontal: 12
  },
  pillar: {
    width: 14,
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2
  },
  buildingBase: {
    width: 230,
    height: 14,
    backgroundColor: '#93C5FD',
    borderRadius: 3
  },
  portalArch: {
    position: 'absolute',
    bottom: 14,
    backgroundColor: colors.brandDark,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.sm
  },
  archEmblem: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900'
  },
  lawnStrip: {
    width: '100%',
    height: 6,
    backgroundColor: colors.brandPrimary,
    marginTop: 10,
    borderRadius: 3
  },
  tickerBar: {
    backgroundColor: colors.brandLight,
    borderBottomWidth: 1,
    borderBottomColor: '#BFDBFE',
    paddingVertical: 10,
    paddingHorizontal: spacing.lg
  },
  tickerInner: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  tickerTag: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm
  },
  tickerTagText: {
    color: colors.textInverse,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase'
  },
  tickerText: {
    fontSize: 13,
    color: colors.brandDark,
    fontWeight: '600',
    flex: 1
  },
  statsSection: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: -28,
    zIndex: 10
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  statCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderDefault,
    ...shadows.card
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: colors.brandPrimary
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 4
  },
  findCampusSection: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl
  },
  sectionHeader: {
    marginBottom: spacing.lg
  },
  sectionHeading: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5
  },
  sectionSubheading: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4
  },
  filterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    marginBottom: spacing.lg,
    ...shadows.card
  },
  filterPill: {
    flexDirection: 'row',
    backgroundColor: colors.bgPage,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.md
  },
  filterLabel: {
    fontSize: 13,
    color: colors.textSecondary
  },
  filterValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brandPrimary
  },
  searchPillBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: borderRadius.md
  },
  searchPillText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 13
  },
  campusExplorer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 20
  },
  mapCanvas: {
    flex: 1,
    minWidth: 320,
    height: 380,
    backgroundColor: colors.brandLight,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#BFDBFE',
    position: 'relative',
    overflow: 'hidden'
  },
  mapTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brandDark
  },
  mapGridLines: {
    ...StyleSheet.absoluteFillObject
  },
  mapGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(29, 78, 216, 0.08)'
  },
  mapPin: {
    position: 'absolute',
    alignItems: 'center'
  },
  mapPinActive: {
    transform: [{ scale: 1.15 }]
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.brandPrimary,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    ...shadows.card
  },
  pinDotActive: {
    backgroundColor: colors.statusDanger,
    width: 20,
    height: 20,
    borderRadius: 10
  },
  pinName: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brandDark,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 2
  },
  mapHint: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    fontSize: 11,
    color: colors.brandDark,
    fontWeight: '500'
  },
  campusCardsCol: {
    flex: 1,
    minWidth: 320,
    gap: 12
  },
  campusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: 14,
    ...shadows.card
  },
  campusCardSelected: {
    borderColor: colors.brandPrimary,
    backgroundColor: '#F8FAFF'
  },
  campusIconBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: colors.brandLight,
    alignItems: 'center',
    justifyContent: 'center'
  },
  campusIcon: {
    fontSize: 22
  },
  campusName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary
  },
  campusLoc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2
  },
  seatsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: 4
  },
  seatsText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.statusSuccess
  },
  viewDetailBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgPage,
    borderWidth: 1,
    borderColor: colors.borderDefault
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brandPrimary
  },
  quickLinksSection: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  quickCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    ...shadows.card
  },
  quickIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md
  },
  quickIcon: {
    fontSize: 24
  },
  quickTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 6
  },
  quickDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginBottom: spacing.md
  },
  quickActionPill: {
    alignSelf: 'flex-start'
  },
  quickActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brandPrimary
  },
  newsSection: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl
  },
  newsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  newsCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    overflow: 'hidden',
    ...shadows.card
  },
  newsHeaderBox: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center'
  },
  newsIcon: {
    fontSize: 48
  },
  newsContent: {
    padding: spacing.md
  },
  newsDate: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.brandPrimary,
    textTransform: 'uppercase',
    marginBottom: 4
  },
  newsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: 6
  },
  newsSnippet: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18
  },
  whySection: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl
  },
  whyContentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 32,
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    ...shadows.card
  },
  whyGraphicBox: {
    flex: 1,
    minWidth: 280,
    height: 240,
    backgroundColor: colors.brandLight,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  whyGraphicBackdrop: {
    alignItems: 'center'
  },
  whyEmoji: {
    fontSize: 54,
    marginBottom: 10
  },
  whyGraphicText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brandDark
  },
  whyTextCol: {
    flex: 1.4,
    minWidth: 320
  },
  whyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    marginBottom: 8
  },
  whyDesc: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.lg
  },
  whyPoints: {
    gap: 16
  },
  pointRow: {
    flexDirection: 'row',
    gap: 12
  },
  checkBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2
  },
  checkText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.statusSuccess
  },
  pointTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textPrimary
  },
  pointBody: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
    marginTop: 2
  },
  bottomCtaWrapper: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl
  },
  bottomCtaBanner: {
    backgroundColor: colors.brandPrimary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 24,
    ...shadows.hover
  },
  ctaTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.textInverse,
    marginBottom: 6
  },
  ctaSub: {
    fontSize: 14,
    color: '#DBEAFE',
    lineHeight: 20,
    maxWidth: 600
  },
  ctaActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  ctaPrimaryBtn: {
    backgroundColor: colors.bgSurface,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: borderRadius.md
  },
  ctaPrimaryText: {
    color: colors.brandPrimary,
    fontWeight: '800',
    fontSize: 14
  },
  ctaSecondaryBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: borderRadius.md
  },
  ctaSecondaryText: {
    color: colors.textInverse,
    fontWeight: '600',
    fontSize: 14
  }
});
