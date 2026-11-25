import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Image,
  ImageBackground,
  useWindowDimensions
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, borderRadius, spacing, shadows } from '../theme/theme';
import { PublicHeader } from '../components/PublicHeader';
import { PublicFooter } from '../components/PublicFooter';
import { GallerySection } from '../components/GallerySection';
import { LoginModal } from '../components/LoginModal';
import { StatusModal } from '../components/StatusModal';
import { IMAGES } from '../assets/images';

// 4-Slide Auto-Rotating Royal Blue Hero Carousel (Changes Every 4000ms)
const HERO_SLIDES = [
  {
    id: 0,
    badge: '🎓 Admissions Open 2026–2027',
    title: 'Learning That Opens\nEvery Door',
    subtitle: 'Welcome to Skanda International School: quality holistic education across CBSE, ICSE, and College disciplines empowering students to grow in knowledge, character and confidence.',
    image: IMAGES.gallery.smartClassroom,
    primaryBtn: 'Apply Online ➜',
    secondaryBtn: 'Track Application Status'
  },
  {
    id: 1,
    badge: '📚 Central School Library',
    title: 'Shaping Future\nLeaders Today',
    subtitle: 'Inspiring young minds through collaborative reading spaces, expansive research archives, and future-ready experiential curricula.',
    image: IMAGES.gallery.schoolLibrary,
    primaryBtn: 'Apply Online ➜',
    secondaryBtn: 'Track Application Status'
  },
  {
    id: 2,
    badge: '🏆 Annual Sports Meet',
    title: 'Teamwork, Grit &\nAthletic Excellence',
    subtitle: 'Olympic-grade athletic tracks, inter-house championship relays, and dynamic physical education empowering all-round student development.',
    image: IMAGES.gallery.sportsMeetRelay,
    primaryBtn: 'Apply Online ➜',
    secondaryBtn: 'Track Application Status'
  },
  {
    id: 3,
    badge: '🎭 Skanda Annual Cultural Gala',
    title: 'Holistic Growth Across\nArts & Academics',
    subtitle: 'Vibrant performing arts stages, classical ensembles, and creative showcases celebrating culture, heritage, and student talent.',
    image: IMAGES.gallery.annualGalaFinale,
    primaryBtn: 'Apply Online ➜',
    secondaryBtn: 'Track Application Status'
  }
];

export const HomeScreen: React.FC = () => {
  const { navigateTo } = useAuth();
  const { width } = useWindowDimensions();
  const isMobile = width < 640;
  const isTablet = width < 960;
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  // Hero Carousel State
  const [activeSlide, setActiveSlide] = useState(0);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);

  // Auto-rotate hero slides every 4 seconds (pause on hover)
  useEffect(() => {
    if (isCarouselHovered) return;
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [isCarouselHovered]);

  // Filter & Search state for Find a school/college
  const [selectedState, setSelectedState] = useState('All States');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedProgram, setSelectedProgram] = useState('All Programmes');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCampusSearchFocused, setIsCampusSearchFocused] = useState(false);

  // Realistic Map View State
  const [activePin, setActivePin] = useState<number>(0);
  const [showMapInfoCard, setShowMapInfoCard] = useState<boolean>(true);
  const [mapZoom, setMapZoom] = useState<number>(1);

  const campuses = [
    {
      id: 0,
      name: 'Skanda International Public School',
      location: 'Bengaluru — Kanakapura Rd',
      address: 'Kanakapura Main Road, South Bengaluru, Karnataka 560062',
      city: 'Bengaluru',
      state: 'Karnataka',
      board: 'CBSE, Grades 1–12',
      seats: 'Admissions Open (34 Seats)',
      image: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?auto=format&fit=crop&w=600&q=80',
      imageSource: IMAGES.campuses.kanakapura,
      x: 68,
      y: 56
    },
    {
      id: 1,
      name: 'Skanda World School (ICSE Campus)',
      location: 'Bengaluru — Whitefield',
      address: 'ITPL Main Rd, Whitefield, Bengaluru, Karnataka 560066',
      city: 'Bengaluru',
      state: 'Karnataka',
      board: 'ICSE / ISC, Grades 1–12',
      seats: 'Limited Seats (8 Seats)',
      image: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=600&q=80',
      imageSource: IMAGES.campuses.whitefield,
      x: 78,
      y: 46
    },
    {
      id: 2,
      name: 'Skanda Institute of Technology',
      location: 'Mysuru — Hunsur Rd',
      address: 'Hunsur Highway, Jayalakshmipuram, Mysuru, Karnataka 570012',
      city: 'Mysuru',
      state: 'Karnataka',
      board: 'B.Tech / M.Tech AICTE',
      seats: 'Merit Applications Open',
      image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
      imageSource: IMAGES.campuses.mysuru,
      x: 48,
      y: 74
    },
    {
      id: 3,
      name: 'Skanda College of Commerce & Management',
      location: 'Mangaluru — Hampankatta',
      address: 'K.S. Rao Road, Hampankatta, Mangaluru, Karnataka 575001',
      city: 'Mangaluru',
      state: 'Karnataka',
      board: 'B.Com / BBA / MBA',
      seats: 'Scholarship Available',
      image: 'https://images.unsplash.com/photo-1525921429624-479b6a26d84d?auto=format&fit=crop&w=600&q=80',
      imageSource: IMAGES.campuses.mangaluru,
      x: 18,
      y: 62
    }
  ];

  // Active selected campus for the floating map info card
  const activeCampus = campuses.find((c) => c.id === activePin) || campuses[0];

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
        {/* HERO BANNER SECTION (Fixed-Height 4-Slide Auto-Rotating Royal Blue Carousel) */}
        <View
          nativeID="hero-section"
          testID="hero-section"
          style={[styles.heroBanner, { height: isMobile ? 460 : 560 }]}
          {...({
            onMouseEnter: () => setIsCarouselHovered(true),
            onMouseLeave: () => setIsCarouselHovered(false)
          } as any)}
        >
          <Image
            key={activeSlide}
            source={HERO_SLIDES[activeSlide].image}
            defaultSource={IMAGES.fallback}
            style={styles.heroBackgroundImageAbsolute as any}
            resizeMode="cover"
          />
          <View style={[styles.heroGradientOverlay, isMobile && styles.heroGradientOverlayMobile]}>
            <View style={styles.heroContent}>
              <View style={styles.heroTextCol}>
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>{HERO_SLIDES[activeSlide].badge}</Text>
                </View>
                <Text style={[styles.heroTitle, isMobile && styles.heroTitleMobile]} numberOfLines={2}>
                  {HERO_SLIDES[activeSlide].title}
                </Text>
                <Text style={[styles.heroSubtitle, isMobile && styles.heroSubtitleMobile]} numberOfLines={3}>
                  {HERO_SLIDES[activeSlide].subtitle}
                </Text>

                <View style={styles.heroBtnRow}>
                  <TouchableOpacity
                    nativeID="apply-now-btn"
                    testID="apply-now-btn"
                    style={styles.heroPrimaryBtn}
                    onPress={() => navigateTo('/apply')}
                    activeOpacity={0.88}
                    {...(Platform.OS === 'web' ? ({ className: 'skanda-btn-primary' } as any) : {})}
                  >
                    <Text style={styles.heroPrimaryBtnText}>{HERO_SLIDES[activeSlide].primaryBtn}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.heroSecondaryBtn}
                    onPress={() => setStatusModalVisible(true)}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.heroSecondaryBtnText}>{HERO_SLIDES[activeSlide].secondaryBtn}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Right Hero Spacer for photography clarity on desktop */}
              {!isMobile && <View style={styles.heroPhotoSpacer} />}
            </View>

            {/* 4-SLIDE CAROUSEL INDICATOR DOTS & ARROWS */}
            <View style={styles.carouselNavRow}>
              <TouchableOpacity
                style={styles.carouselArrowBtn}
                onPress={() => setActiveSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
                accessibilityLabel="Previous Hero Slide"
              >
                <Text style={styles.carouselArrowText}>‹</Text>
              </TouchableOpacity>

              <View style={styles.carouselDotsRow}>
                {HERO_SLIDES.map((slide, index) => (
                  <TouchableOpacity
                    key={slide.id}
                    style={[
                      styles.carouselDot,
                      activeSlide === index && styles.carouselDotActive
                    ]}
                    onPress={() => setActiveSlide(index)}
                    accessibilityLabel={`Slide ${index + 1}`}
                  />
                ))}
              </View>

              <TouchableOpacity
                style={styles.carouselArrowBtn}
                onPress={() => setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length)}
                accessibilityLabel="Next Hero Slide"
              >
                <Text style={styles.carouselArrowText}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
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

        {/* 4-FEATURE HIGHLIGHTS DEDICATED SECTION (Below Hero & Announcement Ticker) */}
        <View style={styles.featuresSection}>
          <View style={styles.featuresCard}>
            <View style={[styles.featuresGrid, isMobile && styles.featuresGridMobile]}>
              <View style={[styles.featureCardItem, isMobile && styles.featureCardItemMobile]}>
                <View style={styles.featureIconBadge}>
                  <Text style={styles.featureIconText}>🎓</Text>
                </View>
                <View style={styles.featureCardTextCol}>
                  <Text style={styles.featureCardTitle}>Experienced Faculty</Text>
                  <Text style={styles.featureCardDesc}>Dedicated and qualified teachers</Text>
                </View>
              </View>

              <View style={[styles.featureCardItem, isMobile && styles.featureCardItemMobile]}>
                <View style={styles.featureIconBadge}>
                  <Text style={styles.featureIconText}>🏫</Text>
                </View>
                <View style={styles.featureCardTextCol}>
                  <Text style={styles.featureCardTitle}>Modern Facilities</Text>
                  <Text style={styles.featureCardDesc}>Smart classrooms, labs & libraries</Text>
                </View>
              </View>

              <View style={[styles.featureCardItem, isMobile && styles.featureCardItemMobile]}>
                <View style={styles.featureIconBadge}>
                  <Text style={styles.featureIconText}>🌱</Text>
                </View>
                <View style={styles.featureCardTextCol}>
                  <Text style={styles.featureCardTitle}>Holistic Development</Text>
                  <Text style={styles.featureCardDesc}>Focus on academics, sports & values</Text>
                </View>
              </View>

              <View style={[styles.featureCardItem, isMobile && styles.featureCardItemMobile]}>
                <View style={styles.featureIconBadge}>
                  <Text style={styles.featureIconText}>🛡️</Text>
                </View>
                <View style={styles.featureCardTextCol}>
                  <Text style={styles.featureCardTitle}>Safe Environment</Text>
                  <Text style={styles.featureCardDesc}>A secure and nurturing campus</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 5 INSTITUTIONAL STATISTICS CARDS */}
        <View style={styles.statsSection}>
          <View nativeID="stats-grid" testID="stats-grid" style={styles.statsGrid}>
            <View style={styles.statCard} {...(Platform.OS === 'web' ? ({ className: 'skanda-kpi-card' } as any) : {})}>
              <Text style={styles.statNumber}>25,000+</Text>
              <Text style={styles.statLabel}>Students Enrolled</Text>
            </View>
            <View style={styles.statCard} {...(Platform.OS === 'web' ? ({ className: 'skanda-kpi-card' } as any) : {})}>
              <Text style={styles.statNumber}>40</Text>
              <Text style={styles.statLabel}>Schools Nationwide</Text>
            </View>
            <View style={styles.statCard} {...(Platform.OS === 'web' ? ({ className: 'skanda-kpi-card' } as any) : {})}>
              <Text style={styles.statNumber}>18</Text>
              <Text style={styles.statLabel}>Colleges & Branches</Text>
            </View>
            <View style={styles.statCard} {...(Platform.OS === 'web' ? ({ className: 'skanda-kpi-card' } as any) : {})}>
              <Text style={styles.statNumber}>1,200+</Text>
              <Text style={styles.statLabel}>Expert Faculty</Text>
            </View>
            <View style={styles.statCard} {...(Platform.OS === 'web' ? ({ className: 'skanda-kpi-card' } as any) : {})}>
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

          {/* UPGRADED FILTER & SEARCH BAR WITH LIVE SUGGESTIONS */}
          <View style={styles.campusFilterContainer}>
            {/* Real-Time Text Search Input with Suggestions Dropdown */}
            <View style={[styles.searchRow, isMobile && { flexDirection: 'column', alignItems: 'stretch' }]}>
              <View style={[
                styles.searchInputWrapper,
                isCampusSearchFocused && styles.searchInputWrapperFocused,
                isMobile && { minWidth: 0, width: '100%' }
              ]}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  nativeID="campus-search-input"
                  style={[
                    styles.searchInput,
                    {
                      borderWidth: 0,
                      outlineStyle: 'none' as any,
                      outlineWidth: 0 as any,
                      boxShadow: 'none' as any,
                      backgroundColor: 'transparent'
                    }
                  ]}
                  placeholder="Search school name, address, or city..."
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={(val) => {
                    setSearchQuery(val);
                    setIsCampusSearchFocused(true);
                  }}
                  onFocus={() => setIsCampusSearchFocused(true)}
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity
                    onPress={() => {
                      setSearchQuery('');
                      setIsCampusSearchFocused(false);
                    }}
                    style={styles.clearSearchBtn}
                  >
                    <Text style={styles.clearSearchText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[styles.searchSubmitBtn, isMobile && { width: '100%' }]}
                onPress={() => setIsCampusSearchFocused(false)}
                activeOpacity={0.88}
              >
                <Text style={styles.searchSubmitBtnText}>Search Campuses</Text>
              </TouchableOpacity>
            </View>

            {/* LIVE SEARCH AUTOCOMPLETE SUGGESTIONS DROPDOWN */}
            {isCampusSearchFocused && (
              <View style={styles.campusSearchDropdown}>
                <View style={styles.dropdownHeaderRow}>
                  <Text style={styles.dropdownHeaderTitle}>
                    {searchQuery.trim().length > 0
                      ? `Matching Campuses (${filteredCampuses.length})`
                      : '⚡ Quick Campus & City Suggestions'}
                  </Text>
                  <TouchableOpacity onPress={() => setIsCampusSearchFocused(false)}>
                    <Text style={styles.dropdownCloseText}>Close ✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Quick City Chips when query is empty */}
                {searchQuery.trim().length === 0 && (
                  <View style={styles.quickSuggestionsRow}>
                    <Text style={styles.quickSuggestionsLabel}>Popular Cities:</Text>
                    {['Bengaluru', 'Mysuru', 'Mangaluru'].map((city) => (
                      <TouchableOpacity
                        key={city}
                        style={styles.quickSuggestionPill}
                        onPress={() => {
                          setSelectedCity(city);
                          setIsCampusSearchFocused(false);
                        }}
                      >
                        <Text style={styles.quickSuggestionText}>📍 {city}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* Filtered Campuses Suggestions List */}
                <ScrollView style={styles.dropdownScroll} keyboardShouldPersistTaps="handled">
                  {filteredCampuses.length > 0 ? (
                    filteredCampuses.map((campus) => (
                      <TouchableOpacity
                        key={campus.id}
                        style={[
                          styles.dropdownItemRow,
                          activePin === campus.id && styles.dropdownItemRowActive
                        ]}
                        onPress={() => {
                          setSearchQuery(campus.name);
                          setActivePin(campus.id);
                          setShowMapInfoCard(true);
                          setIsCampusSearchFocused(false);
                        }}
                      >
                        <View style={styles.dropdownItemIconCircle}>
                          <Text style={{ fontSize: 16 }}>🏫</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={styles.dropdownItemName}>{campus.name}</Text>
                            <View style={styles.dropdownBoardBadge}>
                              <Text style={styles.dropdownBoardText}>{campus.board.split(',')[0]}</Text>
                            </View>
                          </View>
                          <Text style={styles.dropdownItemLoc}>📍 {campus.location} • {campus.state}</Text>
                        </View>
                        <View style={styles.dropdownSeatsBadge}>
                          <Text style={styles.dropdownSeatsText}>{campus.seats.split('(')[0].trim()}</Text>
                        </View>
                        <Text style={styles.dropdownSelectArrow}>➜</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.dropdownEmpty}>
                      <Text style={styles.dropdownEmptyText}>
                        No campuses match "{searchQuery}". Try selecting from popular cities above.
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}

            {/* RESTYLED ROYAL BLUE FILTER DROPDOWNS */}
            <View style={[styles.dropdownsRow, isMobile && { flexDirection: 'column', alignItems: 'stretch', gap: 10 }]}>
              <View style={[styles.selectWrapper, isMobile && { flexDirection: 'column', alignItems: 'stretch', width: '100%', gap: 4 }]}>
                <Text style={styles.selectLabel}>State:</Text>
                {Platform.OS === 'web' ? (
                  <select
                    value={selectedState}
                    onChange={(e: any) => setSelectedState(e.target.value)}
                    style={{
                      ...webRoyalSelectStyle,
                      width: isMobile ? '100%' : 'auto',
                      minWidth: 0,
                      maxWidth: '100%',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="All States">All States (India)</option>
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

              <View style={[styles.selectWrapper, isMobile && { flexDirection: 'column', alignItems: 'stretch', width: '100%', gap: 4 }]}>
                <Text style={styles.selectLabel}>City:</Text>
                {Platform.OS === 'web' ? (
                  <select
                    value={selectedCity}
                    onChange={(e: any) => setSelectedCity(e.target.value)}
                    style={{
                      ...webRoyalSelectStyle,
                      width: isMobile ? '100%' : 'auto',
                      minWidth: 0,
                      maxWidth: '100%',
                      boxSizing: 'border-box'
                    }}
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

              <View style={[styles.selectWrapper, isMobile && { flexDirection: 'column', alignItems: 'stretch', width: '100%', gap: 4 }]}>
                <Text style={styles.selectLabel}>Programme:</Text>
                {Platform.OS === 'web' ? (
                  <select
                    value={selectedProgram}
                    onChange={(e: any) => setSelectedProgram(e.target.value)}
                    style={{
                      ...webRoyalSelectStyle,
                      width: isMobile ? '100%' : 'auto',
                      minWidth: 0,
                      maxWidth: '100%',
                      boxSizing: 'border-box'
                    }}
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
                  style={[styles.resetFiltersBtn, isMobile && { width: '100%', alignItems: 'center' }]}
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

          {/* REALISTIC INTERACTIVE CAMPUS GEO-LOCATOR MAP & CAMPUS CARDS */}
          <View style={[styles.campusExplorer, (isMobile || isTablet) && { flexDirection: 'column' }]}>
            {/* Realistic Topographic & Geographic Vector Map */}
            <View style={[styles.mapCanvas, (isMobile || isTablet) && { width: '100%', minWidth: 0, height: isMobile ? 320 : 420 }]}>
              {/* Map Canvas Header with Status and Zoom Controls */}
              <View style={styles.mapCanvasHeader}>
                <View style={styles.mapHeaderLeft}>
                  <Text style={styles.mapTitle}>🗺️ Interactive Campus Geo-Locator</Text>
                  <View style={styles.mapRegionBadge}>
                    <Text style={styles.mapRegionText}>📍 Karnataka Region</Text>
                  </View>
                </View>

                {/* Map Zoom Controls */}
                <View style={styles.mapZoomControls}>
                  <TouchableOpacity
                    style={styles.zoomBtn}
                    onPress={() => setMapZoom((z) => Math.min(1.4, Number((z + 0.15).toFixed(2))))}
                    accessibilityLabel="Zoom In"
                  >
                    <Text style={styles.zoomBtnText}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.zoomBtn}
                    onPress={() => setMapZoom((z) => Math.max(0.85, Number((z - 0.15).toFixed(2))))}
                    accessibilityLabel="Zoom Out"
                  >
                    <Text style={styles.zoomBtnText}>−</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.zoomResetBtn}
                    onPress={() => {
                      setMapZoom(1);
                      setActivePin(0);
                      setShowMapInfoCard(true);
                    }}
                    accessibilityLabel="Reset View"
                  >
                    <Text style={styles.zoomResetText}>⟲ Reset</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Realistic Geographic Canvas (Terrain, Coastline, Rivers, Highways, and Pins) */}
              <View style={styles.mapViewport}>
                <View
                  style={[
                    styles.mapScalableCanvas,
                    { transform: [{ scale: mapZoom }] }
                  ]}
                >
                  {/* Geographic SVG Topography Background */}
                  {Platform.OS === 'web' && (
                    <svg
                      viewBox="0 0 600 360"
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none'
                      }}
                    >
                      <defs>
                        <linearGradient id="seaGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#BAE6FD" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#E0F2FE" stopOpacity="0.4" />
                        </linearGradient>
                        <linearGradient id="landGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#F8FAFC" />
                          <stop offset="100%" stopColor="#EFF6FF" />
                        </linearGradient>
                      </defs>

                      {/* Arabian Sea on West */}
                      <path d="M 0 0 L 110 0 Q 125 100 115 180 Q 105 260 120 360 L 0 360 Z" fill="url(#seaGradient)" />
                      <path d="M 110 0 Q 125 100 115 180 Q 105 260 120 360" stroke="#93C5FD" strokeWidth="2.5" fill="none" />

                      {/* Karnataka Region Territory Fill */}
                      <path
                        d="M 110 20 Q 220 10 380 30 Q 520 60 560 180 Q 520 310 400 340 Q 220 350 120 340 Z"
                        fill="url(#landGradient)"
                        stroke="#BFDBFE"
                        strokeWidth="1.5"
                        strokeDasharray="4,4"
                      />

                      {/* Major Geographic Rivers */}
                      {/* Cauvery River */}
                      <path d="M 190 280 Q 280 270 380 290 Q 480 300 580 330" fill="none" stroke="#60A5FA" strokeWidth="2.5" opacity="0.85" />
                      <text x="360" y="278" fill="#3B82F6" fontSize="9" fontWeight="600" opacity="0.8">Cauvery River</text>

                      {/* Tungabhadra River */}
                      <path d="M 180 150 Q 280 130 400 120 Q 500 115 580 130" fill="none" stroke="#60A5FA" strokeWidth="2" opacity="0.75" />
                      <text x="320" y="118" fill="#3B82F6" fontSize="8" fontWeight="600" opacity="0.75">Tungabhadra</text>

                      {/* Netravati River to Mangaluru */}
                      <path d="M 120 220 Q 160 215 200 225" fill="none" stroke="#38BDF8" strokeWidth="2" opacity="0.85" />
                      <text x="135" y="210" fill="#0284C7" fontSize="8" fontWeight="600">Netravati</text>

                      {/* Major Highway Corridors */}
                      {/* NH-48 Expressway: Bengaluru to Hubballi / Pune */}
                      <path d="M 460 210 L 370 150 L 260 90 L 180 50" fill="none" stroke="#CBD5E1" strokeWidth="3" strokeDasharray="6,4" />
                      <text x="280" y="140" fill="#64748B" fontSize="8" fontWeight="600">NH-48</text>

                      {/* NH-75: Bengaluru to Mangaluru */}
                      <path d="M 460 210 L 340 215 L 230 220 L 120 225" fill="none" stroke="#CBD5E1" strokeWidth="3" strokeDasharray="6,4" />
                      <text x="260" y="210" fill="#64748B" fontSize="8" fontWeight="600">NH-75</text>

                      {/* NH-275: Bengaluru to Mysuru Expressway */}
                      <path d="M 460 210 Q 390 240 310 270" fill="none" stroke="#93C5FD" strokeWidth="3.5" />
                      <text x="385" y="245" fill="#1D4ED8" fontSize="8" fontWeight="700">NH-275 Expressway</text>

                      {/* Regional City Hub Reference Labels */}
                      <circle cx="260" cy="90" r="3.5" fill="#94A3B8" />
                      <text x="268" y="93" fill="#64748B" fontSize="9" fontWeight="600">Hubballi</text>

                      <circle cx="180" cy="50" r="3.5" fill="#94A3B8" />
                      <text x="188" y="53" fill="#64748B" fontSize="9" fontWeight="600">Belagavi</text>

                      <circle cx="250" cy="170" r="3.5" fill="#94A3B8" />
                      <text x="258" y="173" fill="#64748B" fontSize="9" fontWeight="600">Shivamogga</text>

                      {/* Compass Rose */}
                      <g transform="translate(540, 35)">
                        <circle cx="0" cy="0" r="14" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
                        <path d="M 0 -11 L 3 -2 L 0 0 L -3 -2 Z" fill="#DC2626" />
                        <path d="M 0 11 L 3 2 L 0 0 L -3 2 Z" fill="#1D4ED8" />
                        <text x="-4" y="-13" fill="#DC2626" fontSize="8" fontWeight="800">N</text>
                      </g>

                      {/* Map Scale Indicator */}
                      <g transform="translate(480, 335)">
                        <rect x="0" y="0" width="80" height="4" fill="#94A3B8" />
                        <rect x="0" y="0" width="40" height="4" fill="#1D4ED8" />
                        <text x="18" y="-4" fill="#64748B" fontSize="8" fontWeight="600">50 km</text>
                      </g>
                    </svg>
                  )}

                  {/* Interactive Royal Blue & Crimson Map Markers */}
                  {filteredCampuses.map((campus) => {
                    const isActive = activePin === campus.id;
                    return (
                      <TouchableOpacity
                        key={campus.id}
                        style={[
                          styles.mapPin,
                          { left: `${campus.x}%`, top: `${campus.y}%` },
                          isActive && styles.mapPinActive
                        ]}
                        onPress={() => {
                          setActivePin(campus.id);
                          setShowMapInfoCard(true);
                        }}
                        activeOpacity={0.88}
                      >
                        {/* Animated pulsing wave ring on active pin */}
                        {isActive && <View style={styles.pinRadarPulse} />}

                        <View style={[styles.pinHead, isActive && styles.pinHeadActive]}>
                          <Text style={styles.pinIcon}>{isActive ? '★' : '🏫'}</Text>
                        </View>
                        <View style={[styles.pinStem, isActive && styles.pinStemActive]} />

                        {/* Campus Label Pill */}
                        <View style={[styles.pinBadge, isActive && styles.pinBadgeActive]}>
                          <Text style={[styles.pinBadgeText, isActive && styles.pinBadgeTextActive]} numberOfLines={1}>
                            {campus.name.replace('Skanda ', '')}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Floating Campus Info Card over Map */}
                {showMapInfoCard && activeCampus && (
                  <View style={styles.floatingInfoCard}>
                    <TouchableOpacity
                      style={styles.floatingCardClose}
                      onPress={() => setShowMapInfoCard(false)}
                      accessibilityLabel="Close Card"
                    >
                      <Text style={styles.floatingCardCloseText}>✕</Text>
                    </TouchableOpacity>

                    <View style={styles.floatingCardHeader}>
                      <Image
                        source={activeCampus.imageSource || { uri: activeCampus.image }}
                        defaultSource={IMAGES.fallback}
                        style={styles.floatingCardPhoto}
                        resizeMode="cover"
                      />
                      <View style={{ flex: 1 }}>
                        <View style={styles.floatingBoardPill}>
                          <Text style={styles.floatingBoardText}>{activeCampus.board.split(',')[0]}</Text>
                        </View>
                        <Text style={styles.floatingCardTitle} numberOfLines={2}>
                          {activeCampus.name}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.floatingCardAddress}>
                      📍 {activeCampus.address}
                    </Text>

                    <View style={styles.floatingCardFooter}>
                      <View style={styles.floatingSeatsTag}>
                        <Text style={styles.floatingSeatsText}>● {activeCampus.seats}</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.floatingApplyBtn}
                        onPress={() => navigateTo('/apply')}
                        activeOpacity={0.88}
                      >
                        <Text style={styles.floatingApplyText}>Apply Now ➜</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <Text style={styles.mapHint}>
                  💡 Click any pin to open live campus summary • Zoom controls available in top-right
                </Text>
              </View>
            </View>

            {/* Campus Cards List with Real Photography & Bi-Directional Highlight */}
            <View style={[styles.campusCardsCol, (isMobile || isTablet) && { width: '100%', minWidth: 0 }]}>
              {filteredCampuses.length > 0 ? (
                filteredCampuses.map((campus) => {
                  const isSelected = activePin === campus.id;
                  return (
                    <TouchableOpacity
                      key={campus.id}
                      style={[styles.campusCard, isSelected && styles.campusCardSelected]}
                      onPress={() => {
                        setActivePin(campus.id);
                        setShowMapInfoCard(true);
                      }}
                      activeOpacity={0.9}
                      {...(Platform.OS === 'web' ? ({ className: 'skanda-campus-card' } as any) : {})}
                    >
                      <Image
                        source={campus.imageSource || { uri: campus.image }}
                        defaultSource={IMAGES.fallback}
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
                        style={[styles.viewDetailBtn, isSelected && styles.viewDetailBtnActive]}
                        onPress={() => navigateTo('/apply')}
                      >
                        <Text style={[styles.viewDetailText, isSelected && styles.viewDetailTextActive]}>
                          Apply ➜
                        </Text>
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
                source={IMAGES.news.achievement}
                defaultSource={IMAGES.fallback}
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
                source={IMAGES.news.robotics}
                defaultSource={IMAGES.fallback}
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
                source={IMAGES.news.scholarship}
                defaultSource={IMAGES.fallback}
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

        {/* CAMPUS LIFE & GALLERY SECTION */}
        <GallerySection />

        {/* WHY FAMILIES CHOOSE SKANDA (Real School Photography) */}
        <View style={styles.whySection} nativeID="about" {...({ id: 'about' } as any)}>
          <View style={styles.whyContentRow}>
            <View style={styles.whyImageBox}>
              <Image
                source={IMAGES.about}
                defaultSource={IMAGES.fallback}
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
  padding: '10px 34px 10px 14px',
  borderRadius: 10,
  border: '1.5px solid #BFDBFE',
  backgroundColor: '#EFF6FF',
  color: '#1E3A8A',
  fontSize: 13,
  fontWeight: '600',
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml;utf8,<svg fill='%231D4ED8' height='20' viewBox='0 0 24 24' width='20' xmlns='http://www.w3.org/2000/svg'><path d='M7 10l5 5 5-5z'/></svg>")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 10px center',
  backgroundSize: '16px',
  transition: 'all 0.2s ease',
  boxShadow: '0 1px 2px rgba(29, 78, 216, 0.05)'
};

const webRoyalSelectStyle: any = webSelectStyle;

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
    position: 'relative',
    backgroundColor: '#0F172A',
    overflow: 'hidden'
  },
  heroBackgroundImageAbsolute: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 1,
    ...(Platform.OS === 'web'
      ? ({
          objectFit: 'cover',
          objectPosition: 'center center'
        } as any)
      : {})
  },
  heroGradientOverlay: {
    position: 'relative',
    width: '100%',
    height: '100%',
    flexDirection: 'column',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: spacing.lg,
    backgroundColor: Platform.OS === 'web' ? 'transparent' : 'rgba(15, 23, 42, 0.55)',
    ...(Platform.OS === 'web'
      ? ({
          backgroundImage:
            'linear-gradient(90deg, rgba(15, 23, 42, 0.78) 0%, rgba(30, 58, 138, 0.45) 45%, rgba(29, 78, 216, 0.12) 100%)'
        } as any)
      : {})
  },
  heroGradientOverlayMobile: {
    paddingTop: 28,
    paddingBottom: 16,
    paddingHorizontal: spacing.md
  },
  heroContent: {
    flex: 1,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 32
  },
  heroTextCol: {
    flex: 1.2,
    minWidth: 280,
    paddingVertical: spacing.sm
  },
  heroPhotoSpacer: {
    flex: 0.8,
    minWidth: 260,
    minHeight: 280
  },
  heroBadge: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    // @ts-ignore
    boxShadow: 'none',
    padding: 0,
    alignSelf: 'flex-start',
    marginBottom: spacing.sm,
    // @ts-ignore
    cursor: 'default'
  },
  heroBadgeText: {
    color: '#BFDBFE',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.2
  },
  heroTitle: {
    fontSize: Platform.OS === 'web' ? 44 : 32,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: Platform.OS === 'web' ? 52 : 38,
    minHeight: Platform.OS === 'web' ? 104 : 76,
    letterSpacing: -1,
    marginBottom: spacing.md
  },
  heroTitleMobile: {
    fontSize: 30,
    lineHeight: 36,
    minHeight: 72,
    marginBottom: spacing.sm
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#E0E7FF',
    lineHeight: 24,
    minHeight: 72,
    marginBottom: spacing.lg,
    maxWidth: 540
  },
  heroSubtitleMobile: {
    fontSize: 14,
    lineHeight: 20,
    minHeight: 60,
    marginBottom: spacing.md
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
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    ...shadows.card
  },
  heroSecondaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600'
  },
  carouselNavRow: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 18,
    marginBottom: 8,
    zIndex: 10
  },
  carouselArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)'
  },
  carouselArrowText: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '700'
  },
  carouselDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  carouselDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
    transition: 'all 0.3s ease' as any
  },
  carouselDotActive: {
    width: 28,
    backgroundColor: colors.brandPrimary,
    borderColor: '#FFFFFF',
    borderWidth: 1
  },
  featuresSection: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: 28,
    marginBottom: 8,
    zIndex: 1
  },
  featuresCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 18,
    paddingHorizontal: 20,
    ...shadows.card
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    justifyContent: 'space-between'
  },
  featuresGridMobile: {
    flexDirection: 'column',
    gap: 12
  },
  featureCardItem: {
    flex: 1,
    minWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4
  },
  featureCardItemMobile: {
    minWidth: '100%',
    width: '100%'
  },
  featureIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  featureIconText: {
    fontSize: 22
  },
  featureCardTextCol: {
    flex: 1
  },
  featureCardTitle: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 2
  },
  featureCardDesc: {
    color: '#64748B',
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
    marginTop: 28,
    marginBottom: 44,
    zIndex: 1
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  statCard: {
    flex: 1,
    minWidth: 140,
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
    marginTop: spacing.xxl,
    overflow: 'hidden'
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
    width: '100%',
    overflow: 'hidden',
    ...shadows.card
  },
  searchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    alignItems: 'center',
    width: '100%'
  },
  searchInputWrapper: {
    flex: 1,
    minWidth: 200,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    paddingHorizontal: 16,
    height: 48,
    position: 'relative'
  },
  searchInputWrapperFocused: {
    borderColor: colors.brandPrimary,
    backgroundColor: '#FFFFFF',
    shadowColor: colors.brandPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    backgroundColor: 'transparent',
    borderWidth: 0,
    // @ts-ignore
    outlineStyle: 'none',
    // @ts-ignore
    outlineWidth: 0,
    // @ts-ignore
    boxShadow: 'none'
  },
  clearSearchBtn: {
    padding: 6
  },
  clearSearchText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700'
  },
  searchSubmitBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 22,
    height: 48,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card
  },
  searchSubmitBtnText: {
    color: colors.textInverse,
    fontWeight: '700',
    fontSize: 14
  },
  campusSearchDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    padding: 14,
    marginTop: 6,
    marginBottom: 8,
    maxHeight: 340,
    ...shadows.modal,
    zIndex: 99
  },
  dropdownHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 10
  },
  dropdownHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.brandDark
  },
  dropdownCloseText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary
  },
  quickSuggestionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8
  },
  quickSuggestionsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary
  },
  quickSuggestionPill: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20
  },
  quickSuggestionText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.brandPrimary
  },
  dropdownScroll: {
    maxHeight: 220
  },
  dropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC'
  },
  dropdownItemRowActive: {
    backgroundColor: '#EFF6FF'
  },
  dropdownItemIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  dropdownItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textPrimary
  },
  dropdownBoardBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6
  },
  dropdownBoardText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.brandPrimary
  },
  dropdownItemLoc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2
  },
  dropdownSeatsBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  dropdownSeatsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D'
  },
  dropdownSelectArrow: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.brandPrimary
  },
  dropdownEmpty: {
    padding: 16,
    alignItems: 'center'
  },
  dropdownEmptyText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center'
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
    gap: 20,
    width: '100%'
  },
  mapCanvas: {
    flex: 1,
    minWidth: 280,
    maxWidth: '100%',
    height: 440,
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    position: 'relative',
    overflow: 'hidden',
    ...shadows.card
  },
  mapCanvasHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    zIndex: 10
  },
  mapHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap'
  },
  mapTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.brandDark
  },
  mapRegionBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12
  },
  mapRegionText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brandPrimary
  },
  mapZoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  zoomBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  zoomBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brandPrimary,
    lineHeight: 18
  },
  zoomResetBtn: {
    paddingHorizontal: 8,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    alignItems: 'center',
    justifyContent: 'center'
  },
  zoomResetText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.brandPrimary
  },
  mapViewport: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden'
  },
  mapScalableCanvas: {
    width: '100%',
    height: '100%',
    position: 'relative'
  },
  mapPin: {
    position: 'absolute',
    alignItems: 'center',
    transform: [{ translateX: -18 }, { translateY: -36 }],
    zIndex: 20
  },
  mapPinActive: {
    zIndex: 30,
    transform: [{ translateX: -20 }, { translateY: -40 }, { scale: 1.1 }]
  },
  pinRadarPulse: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(220, 38, 38, 0.25)',
    top: -4,
    left: 2
  },
  pinHead: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.brandPrimary,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.card
  },
  pinHeadActive: {
    backgroundColor: '#DC2626',
    width: 32,
    height: 32,
    borderRadius: 16
  },
  pinIcon: {
    fontSize: 13,
    color: '#FFFFFF'
  },
  pinStem: {
    width: 3,
    height: 8,
    backgroundColor: colors.brandPrimary,
    marginTop: -1
  },
  pinStemActive: {
    backgroundColor: '#DC2626',
    height: 10
  },
  pinBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
    maxWidth: 120,
    ...shadows.card
  },
  pinBadgeActive: {
    backgroundColor: colors.brandDark,
    borderColor: colors.brandDark
  },
  pinBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.brandDark
  },
  pinBadgeTextActive: {
    color: '#FFFFFF'
  },
  floatingInfoCard: {
    position: 'absolute',
    bottom: 34,
    left: 14,
    right: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#BFDBFE',
    ...shadows.modal,
    zIndex: 40
  },
  floatingCardClose: {
    position: 'absolute',
    top: 8,
    right: 10,
    zIndex: 10,
    padding: 4
  },
  floatingCardCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary
  },
  floatingCardHeader: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: 6
  },
  floatingCardPhoto: {
    width: 50,
    height: 42,
    borderRadius: 8
  },
  floatingBoardPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
    marginBottom: 2
  },
  floatingBoardText: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.brandPrimary
  },
  floatingCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textPrimary
  },
  floatingCardAddress: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 8
  },
  floatingCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  floatingSeatsTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  floatingSeatsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#15803D'
  },
  floatingApplyBtn: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8
  },
  floatingApplyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  mapHint: {
    position: 'absolute',
    bottom: 8,
    left: 14,
    right: 14,
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600'
  },
  campusCardsCol: {
    flex: 1,
    minWidth: 280,
    maxWidth: '100%',
    gap: 12
  },
  campusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    gap: 12,
    width: '100%',
    minWidth: 0,
    maxWidth: '100%',
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
  viewDetailBtnActive: {
    backgroundColor: colors.brandPrimary,
    borderColor: colors.brandPrimary
  },
  viewDetailText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brandPrimary
  },
  viewDetailTextActive: {
    color: '#FFFFFF'
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
    marginTop: spacing.xxl,
    overflow: 'hidden'
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  quickCard: {
    flex: 1,
    minWidth: 220,
    maxWidth: '100%',
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
    marginTop: spacing.xxl,
    overflow: 'hidden'
  },
  newsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16
  },
  newsCard: {
    flex: 1,
    minWidth: 260,
    maxWidth: '100%',
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
    marginTop: spacing.xxl,
    overflow: 'hidden'
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
    overflow: 'hidden',
    ...shadows.card
  },
  whyImageBox: {
    flex: 1,
    minWidth: 260,
    maxWidth: '100%',
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
    minWidth: 260,
    maxWidth: '100%'
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
