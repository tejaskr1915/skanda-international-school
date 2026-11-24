import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Image,
  ImageBackground
} from 'react-native';
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
  const [selectedState, setSelectedState] = useState('All States');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedProgram, setSelectedProgram] = useState('All Programmes');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePin, setActivePin] = useState<number>(0);

  const campuses = [
    {
      id: 0,
      name: 'Skanda International Public School',
      location: 'Bengaluru — Kanakapura Rd',
      city: 'Bengaluru',
      state: 'Karnataka',
      board: 'CBSE, Grades 1–12',
      seats: 'Admissions Open',
      image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=600&q=80',
      x: 35,
      y: 60
    },
    {
      id: 1,
      name: 'Skanda World School (ICSE Campus)',
      location: 'Bengaluru — Whitefield',
      city: 'Bengaluru',
      state: 'Karnataka',
      board: 'ICSE / ISC, Grades 1–12',
      seats: 'Limited Seats',
      image: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=600&q=80',
      x: 65,
      y: 35
    },
    {
      id: 2,
      name: 'Skanda Institute of Technology',
      location: 'Mysuru — Hunsur Rd',
      city: 'Mysuru',
      state: 'Karnataka',
      board: 'B.Tech / M.Tech AICTE',
      seats: 'Merit Applications Open',
      image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
      x: 25,
      y: 40
    },
    {
      id: 3,
      name: 'Skanda College of Commerce & Management',
      location: 'Mangaluru — Hampankatta',
      city: 'Mangaluru',
      state: 'Karnataka',
      board: 'B.Com / BBA / MBA',
      seats: 'Scholarship Available',
      image: 'https://images.unsplash.com/photo-1525921429624-479b6a26d84d?auto=format&fit=crop&w=600&q=80',
      x: 50,
      y: 75
    }
  ];

  // Dynamic filter logic
  const filteredCampuses = campuses.filter((campus) => {
    if (selectedState !== 'All States' && campus.state !== selectedState) return false;
    if (selectedCity !== 'All Cities' && campus.city !== selectedCity) return false;
    if (selectedProgram !== 'All Programmes') {
      if (selectedProgram === 'CBSE' && !campus.board.includes('CBSE')) return false;
      if (selectedProgram === 'ICSE' && !campus.board.includes('ICSE')) return false;
      if (selectedProgram === 'College' && !campus.board.includes('Tech') && !campus.board.includes('Com')) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = campus.name.toLowerCase().includes(q);
      const matchLoc = campus.location.toLowerCase().includes(q);
      const matchCity = campus.city.toLowerCase().includes(q);
      const matchBoard = campus.board.toLowerCase().includes(q);
      if (!matchName && !matchLoc && !matchCity && !matchBoard) return false;
    }
    return true;
  });

  return (
    <View style={styles.container}>
      <PublicHeader onOpenLogin={() => setLoginModalVisible(true)} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* HERO BANNER SECTION (Photo + Responsive Soft Gradient Overlay) */}
        <View nativeID="hero-section" testID="hero-section" style={styles.heroBanner}>
          <ImageBackground
            source={{ uri: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80' }}
            style={styles.heroBackground}
            resizeMode="cover"
          >
            <View style={styles.heroGradientOverlay}>
              <View style={styles.heroContent}>
                <View style={styles.heroTextCol}>
                  <View style={styles.heroBadge}>
                    <Text style={styles.heroBadgeText}>🎓 Shaping Future</Text>
                  </View>
                  <Text style={styles.heroTitle}>
                    Leaders Today{'\n'}for a Better Tomorrow
                  </Text>
                  <Text style={styles.heroSubtitle}>
                    We provide quality education that inspires, empowers, and prepares students for success across CBSE, ICSE, and College disciplines.
                  </Text>

                  <View style={styles.heroBtnRow}>
                    <TouchableOpacity
                      nativeID="apply-now-btn"
                      testID="apply-now-btn"
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

                {/* Right Hero Spacer for photography clarity on desktop */}
                <View style={styles.heroPhotoSpacer} />
              </View>

              {/* 4-COLUMN FEATURE HIGHLIGHT STRIP */}
              <View style={styles.heroFeatureStrip}>
                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>🎓</Text>
                  <View style={styles.featureTextCol}>
                    <Text style={styles.featureTitle}>Experienced Faculty</Text>
                    <Text style={styles.featureDesc}>Dedicated and qualified teachers</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>🏫</Text>
                  <View style={styles.featureTextCol}>
                    <Text style={styles.featureTitle}>Modern Facilities</Text>
                    <Text style={styles.featureDesc}>Smart classrooms, labs & libraries</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>🌱</Text>
                  <View style={styles.featureTextCol}>
                    <Text style={styles.featureTitle}>Holistic Development</Text>
                    <Text style={styles.featureDesc}>Focus on academics, sports & values</Text>
                  </View>
                </View>

                <View style={styles.featureItem}>
                  <Text style={styles.featureIcon}>🛡️</Text>
                  <View style={styles.featureTextCol}>
                    <Text style={styles.featureTitle}>Safe Environment</Text>
                    <Text style={styles.featureDesc}>A secure and nurturing campus</Text>
                  </View>
                </View>
              </View>
            </View>
          </ImageBackground>
        </View>

        {/* LATEST ANNOUNCEMENT TICKER */}
        <View nativeID="ticker-bar" testID="ticker-bar" style={styles.tickerBar}>
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
          <View nativeID="stats-grid" testID="stats-grid" style={styles.statsGrid}>
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
        <View style={styles.findCampusSection} nativeID="campus-finder" {...({ id: 'campus-finder' } as any)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeading}>Find a school or college</Text>
            <Text style={styles.sectionSubheading}>
              Choose your state, city and programme to see campuses near you.
            </Text>
          </View>

          {/* UPGRADED FILTER & SEARCH BAR */}
          <View style={styles.campusFilterContainer}>
            {/* Real-Time Text Search Input */}
            <View style={styles.searchRow}>
              <View style={styles.searchInputWrapper}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search school name, address, or city..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                    <Text style={styles.clearSearchText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={styles.searchSubmitBtn}
                onPress={() => {}}
                activeOpacity={0.88}
              >
                <Text style={styles.searchSubmitBtnText}>Search Campuses</Text>
              </TouchableOpacity>
            </View>

            {/* Interactive Select Dropdowns */}
            <View style={styles.dropdownsRow}>
              <View style={styles.selectWrapper}>
                <Text style={styles.selectLabel}>State:</Text>
                {Platform.OS === 'web' ? (
                  <select
                    value={selectedState}
                    onChange={(e: any) => setSelectedState(e.target.value)}
                    style={webSelectStyle}
                  >
                    <option value="All States">All States</option>
                    <option value="Karnataka">Karnataka</option>
                    <option value="Maharashtra">Maharashtra</option>
                    <option value="Tamil Nadu">Tamil Nadu</option>
                  </select>
                ) : (
                  <TouchableOpacity style={styles.nativeSelectBtn}>
                    <Text style={styles.nativeSelectText}>{selectedState}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.selectWrapper}>
                <Text style={styles.selectLabel}>City:</Text>
                {Platform.OS === 'web' ? (
                  <select
                    value={selectedCity}
                    onChange={(e: any) => setSelectedCity(e.target.value)}
                    style={webSelectStyle}
                  >
                    <option value="All Cities">All Cities</option>
                    <option value="Bengaluru">Bengaluru</option>
                    <option value="Mysuru">Mysuru</option>
                    <option value="Mangaluru">Mangaluru</option>
                    <option value="Pune">Pune</option>
                    <option value="Chennai">Chennai</option>
                  </select>
                ) : (
                  <TouchableOpacity style={styles.nativeSelectBtn}>
                    <Text style={styles.nativeSelectText}>{selectedCity}</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.selectWrapper}>
                <Text style={styles.selectLabel}>Programme:</Text>
                {Platform.OS === 'web' ? (
                  <select
                    value={selectedProgram}
                    onChange={(e: any) => setSelectedProgram(e.target.value)}
                    style={webSelectStyle}
                  >
                    <option value="All Programmes">All Programmes</option>
                    <option value="CBSE">CBSE (Grades 1–12)</option>
                    <option value="ICSE">ICSE / ISC (Grades 1–12)</option>
                    <option value="College">Collegiate (B.Tech / B.Com / MBA)</option>
                  </select>
                ) : (
                  <TouchableOpacity style={styles.nativeSelectBtn}>
                    <Text style={styles.nativeSelectText}>{selectedProgram}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {(selectedState !== 'All States' || selectedCity !== 'All Cities' || selectedProgram !== 'All Programmes' || searchQuery) && (
                <TouchableOpacity
                  style={styles.resetFiltersBtn}
                  onPress={() => {
                    setSelectedState('All States');
                    setSelectedCity('All Cities');
                    setSelectedProgram('All Programmes');
                    setSearchQuery('');
                  }}
                >
                  <Text style={styles.resetFiltersText}>Reset Filters ✕</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Interactive Map & Campus Cards Grid */}
          <View style={styles.campusExplorer}>
            {/* Interactive Campus Map Canvas */}
            <View style={styles.mapCanvas}>
              <Text style={styles.mapTitle}>🗺️ Interactive Campus Geo-Locator</Text>
              <View style={styles.mapGridLines}>
                {[1, 2, 3, 4].map((line) => (
                  <View key={line} style={[styles.mapGridLine, { top: `${line * 20}%` }]} />
                ))}
              </View>

              {/* Interactive Campus Pins */}
              {filteredCampuses.map((campus) => (
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
                  <Text style={styles.pinName} numberOfLines={1}>
                    {campus.name.split(' ')[1] || 'Campus'}
                  </Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.mapHint}>Map shows campus pins • Click to highlight details</Text>
            </View>

            {/* Campus Cards List with Real Photography */}
            <View style={styles.campusCardsCol}>
              {filteredCampuses.length > 0 ? (
                filteredCampuses.map((campus) => {
                  const isSelected = activePin === campus.id;
                  return (
                    <TouchableOpacity
                      key={campus.id}
                      style={[styles.campusCard, isSelected && styles.campusCardSelected]}
                      onPress={() => setActivePin(campus.id)}
                      activeOpacity={0.9}
                    >
                      <Image
                        source={{ uri: campus.image }}
                        style={styles.campusThumbnail}
                        resizeMode="cover"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.campusName}>{campus.name}</Text>
                        <Text style={styles.campusLoc}>
                          {campus.location} • {campus.board}
                        </Text>
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
                })
              ) : (
                <View style={styles.emptyStateBox}>
                  <Text style={styles.emptyStateIcon}>🏫</Text>
                  <Text style={styles.emptyStateTitle}>No Campuses Found</Text>
                  <Text style={styles.emptyStateText}>
                    No campuses match your current search and filter criteria. Try resetting filters.
                  </Text>
                </View>
              )}
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

        {/* NEWS AND EVENTS WITH REAL PHOTOGRAPHY */}
        <View style={styles.newsSection} nativeID="news" {...({ id: 'news' } as any)}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeading}>News and events</Text>
            <Text style={styles.sectionSubheading}>What is happening across our school and college campuses.</Text>
          </View>

          <View style={styles.newsGrid}>
            <View style={styles.newsCard}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80' }}
                style={styles.newsImage}
                resizeMode="cover"
              />
              <View style={styles.newsContent}>
                <Text style={styles.newsDate}>12 Nov 2026 • Academic Achievements</Text>
                <Text style={styles.newsTitle}>Class of 2026 records 98% distinction rate in national board exams</Text>
                <Text style={styles.newsSnippet}>
                  SIS students demonstrated extraordinary academic mastery with over 45 students scoring 99+ percentile in STEM and Humanities.
                </Text>
              </View>
            </View>

            <View style={styles.newsCard}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=800&q=80' }}
                style={styles.newsImage}
                resizeMode="cover"
              />
              <View style={styles.newsContent}>
                <Text style={styles.newsDate}>08 Nov 2026 • Innovation & Science</Text>
                <Text style={styles.newsTitle}>Inter-campus science & robotics expo draws 3,000 visitors</Text>
                <Text style={styles.newsSnippet}>
                  Students showcased 200+ working prototypes including AI-powered agriculture sensors, smart solar grids, and biomimetic robotics.
                </Text>
              </View>
            </View>

            <View style={styles.newsCard}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80' }}
                style={styles.newsImage}
                resizeMode="cover"
              />
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

        {/* WHY FAMILIES CHOOSE SKANDA (Real School Photography) */}
        <View style={styles.whySection} nativeID="about" {...({ id: 'about' } as any)}>
          <View style={styles.whyContentRow}>
            <View style={styles.whyImageBox}>
              <Image
                source={{ uri: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1000&q=80' }}
                style={styles.whyPhoto}
                resizeMode="cover"
              />
              <View style={styles.whyPhotoBadge}>
                <Text style={styles.whyBadgeText}>🏆 30 Years of Educational Excellence</Text>
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

const webSelectStyle: any = {
  padding: '8px 12px',
  borderRadius: 8,
  border: '1px solid #CBD5E1',
  backgroundColor: '#FFFFFF',
  color: '#0F172A',
  fontSize: 14,
  fontWeight: '500',
  outline: 'none',
  cursor: 'pointer'
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
    width: '100%',
    backgroundColor: '#F8FAFC',
    overflow: 'hidden'
  },
  heroBackground: {
    width: '100%'
  },
  heroGradientOverlay: {
    width: '100%',
    backgroundColor: 'rgba(248, 250, 252, 0.92)',
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: spacing.lg
  },
  heroContent: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 32
  },
  heroTextCol: {
    flex: 1.2,
    minWidth: 320,
    paddingVertical: spacing.md
  },
  heroPhotoSpacer: {
    flex: 0.8,
    minWidth: 260,
    minHeight: 280
  },
  heroBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginBottom: spacing.md
  },
  heroBadgeText: {
    color: '#1D4ED8',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5
  },
  heroTitle: {
    fontSize: Platform.OS === 'web' ? 44 : 32,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: Platform.OS === 'web' ? 52 : 38,
    letterSpacing: -1,
    marginBottom: spacing.md
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#334155',
    lineHeight: 24,
    marginBottom: spacing.xl,
    maxWidth: 540
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    ...shadows.card
  },
  heroSecondaryBtnText: {
    color: '#1E293B',
    fontSize: 15,
    fontWeight: '600'
  },
  heroFeatureStrip: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    backgroundColor: '#0F2756',
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 24,
    marginTop: 36,
    marginBottom: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5
  },
  featureItem: {
    flex: 1,
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  featureIcon: {
    fontSize: 26
  },
  featureTextCol: {
    flex: 1
  },
  featureTitle: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 2
  },
  featureDesc: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 16
  },
  tickerBar: {
    backgroundColor: '#EFF6FF',
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
    borderBottomWidth: 1,
    borderBottomColor: '#DBEAFE',
    paddingVertical: 12,
    paddingHorizontal: 24
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
    marginTop: 40,
    marginBottom: 48,
    zIndex: 1
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
  campusFilterContainer: {
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: 12,
    ...shadows.card
  },
  searchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center'
  },
  searchInputWrapper: {
    flex: 1,
    minWidth: 260,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgPage,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    paddingHorizontal: 12,
    height: 42
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    outline: 'none'
  },
  clearSearchBtn: {
    padding: 4
  },
  clearSearchText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700'
  },
  searchSubmitBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 20,
    height: 42,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center'
  },
  searchSubmitBtnText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 14
  },
  dropdownsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center'
  },
  selectWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  selectLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary
  },
  nativeSelectBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.bgSurface
  },
  nativeSelectText: {
    fontSize: 13,
    color: colors.textPrimary,
    fontWeight: '600'
  },
  resetFiltersBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA'
  },
  resetFiltersText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626'
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
  campusThumbnail: {
    width: 80,
    height: 70,
    borderRadius: borderRadius.md
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
  emptyStateBox: {
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center'
  },
  emptyStateIcon: {
    fontSize: 36,
    marginBottom: 8
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4
  },
  emptyStateText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center'
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
  newsImage: {
    width: '100%',
    height: 160
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
  whyImageBox: {
    flex: 1,
    minWidth: 280,
    height: 280,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    position: 'relative'
  },
  whyPhoto: {
    width: '100%',
    height: '100%'
  },
  whyPhotoBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(15, 39, 86, 0.9)',
    borderRadius: borderRadius.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center'
  },
  whyBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12
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
    color: colors.statusSuccess,
    fontWeight: '900',
    fontSize: 13
  },
  pointTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 2
  },
  pointBody: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18
  },
  bottomCtaWrapper: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xxl,
    marginBottom: spacing.xxl
  },
  bottomCtaBanner: {
    backgroundColor: colors.brandPrimary,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    alignItems: 'center',
    justifyContent: 'space-between',
    ...shadows.card
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textInverse,
    marginBottom: 6
  },
  ctaSub: {
    fontSize: 14,
    color: '#DBEAFE',
    lineHeight: 20
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
