import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Platform,
  useWindowDimensions,
  ScrollView
} from 'react-native';
import { IMAGES } from '../assets/images';
import { colors, borderRadius, spacing, shadows } from '../theme/theme';
import { AnimatedHoverCard } from './AnimatedUI';

export type GalleryCategory =
  | 'All'
  | 'Academics & Smart Classrooms'
  | 'Early Years & Play'
  | 'Sports & Athletics'
  | 'Cultural Gala & Events';

export interface GalleryItem {
  id: string;
  title: string;
  subtitle: string;
  category: Exclude<GalleryCategory, 'All'>;
  image: any;
}

export const GALLERY_CATEGORIES: GalleryCategory[] = [
  'All',
  'Academics & Smart Classrooms',
  'Early Years & Play',
  'Sports & Athletics',
  'Cultural Gala & Events'
];

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: 'smart-classroom',
    title: 'Smart Interactive Classrooms',
    subtitle: 'Smart Digital Board Geography Session',
    category: 'Academics & Smart Classrooms',
    image: IMAGES.gallery.smartClassroom
  },
  {
    id: 'school-library',
    title: 'Central School Library',
    subtitle: 'Collaborative Reading & Research',
    category: 'Academics & Smart Classrooms',
    image: IMAGES.gallery.schoolLibrary
  },
  {
    id: 'montessori-clay',
    title: 'Montessori & Creative Arts',
    subtitle: 'Hands-On Clay Modeling Activity',
    category: 'Early Years & Play',
    image: IMAGES.gallery.montessoriClay
  },
  {
    id: 'outdoor-play',
    title: 'Outdoor Play & Teamwork',
    subtitle: 'Pre-Primary Hula-Hoop & Motor Skills',
    category: 'Early Years & Play',
    image: IMAGES.gallery.outdoorPlay
  },
  {
    id: 'sports-meet',
    title: 'Annual Sports Meet',
    subtitle: 'Inter-House 4x100m Relay Race',
    category: 'Sports & Athletics',
    image: IMAGES.gallery.sportsMeetRelay
  },
  {
    id: 'annual-gala-classical',
    title: 'Skanda Annual Gala — Classical Ensemble',
    subtitle: 'Traditional Classical Dance Performance',
    category: 'Cultural Gala & Events',
    image: IMAGES.gallery.annualGalaClassical
  },
  {
    id: 'annual-gala-finale',
    title: 'Skanda Annual Gala — Grand Finale',
    subtitle: 'Student Cultural Showcase on Stage',
    category: 'Cultural Gala & Events',
    image: IMAGES.gallery.annualGalaFinale
  }
];

interface GallerySectionProps {
  isStandalonePage?: boolean;
}

export const GallerySection: React.FC<GallerySectionProps> = ({ isStandalonePage = false }) => {
  const { width, height } = useWindowDimensions();
  const isMobile = width < 640;
  const isTablet = width >= 640 && width < 1024;

  const [selectedCategory, setSelectedCategory] = useState<GalleryCategory>('All');
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const filteredItems =
    selectedCategory === 'All'
      ? GALLERY_ITEMS
      : GALLERY_ITEMS.filter((item) => item.category === selectedCategory);

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(null);
  };

  const handlePrev = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex - 1 + filteredItems.length) % filteredItems.length);
  };

  const handleNext = () => {
    if (lightboxIndex === null) return;
    setLightboxIndex((lightboxIndex + 1) % filteredItems.length);
  };

  const activeLightboxItem = lightboxIndex !== null ? filteredItems[lightboxIndex] : null;

  return (
    <View
      style={[styles.sectionWrapper, isStandalonePage && styles.standaloneWrapper]}
      nativeID="gallery"
      {...({ id: 'gallery' } as any)}
    >
      <View style={styles.sectionContainer}>
        {/* Section Header */}
        <View style={styles.headerBlock}>
          <View style={styles.badgePill}>
            <Text style={styles.badgeText}>📸 CAMPUS LIFE & GALLERY</Text>
          </View>
          <Text style={styles.sectionTitle}>Life at Skanda International School</Text>
          <Text style={styles.sectionSubtitle}>
            Explore our vibrant smart classrooms, Montessori creative studios, championship sports meets, and annual cultural showcases.
          </Text>
        </View>

        {/* Category Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsContainer}
          style={styles.filterTabsScroll}
        >
          {GALLERY_CATEGORIES.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <TouchableOpacity
                key={category}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => {
                  setSelectedCategory(category);
                  setLightboxIndex(null);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Responsive Photo Grid */}
        <View
          key={selectedCategory}
          style={styles.grid}
          {...(Platform.OS === 'web' ? ({ className: 'skanda-fade-up' } as any) : {})}
        >
          {filteredItems.map((item, index) => (
            <AnimatedHoverCard
              key={item.id}
              style={[
                styles.card,
                isMobile ? styles.cardMobile : isTablet ? styles.cardTablet : styles.cardDesktop
              ]}
              onPress={() => openLightbox(index)}
              className="skanda-gallery-card"
            >
              {({ hovered }) => (
                <>
                  <View style={styles.imageWrapper}>
                    <Image
                      source={item.image}
                      defaultSource={IMAGES.fallback}
                      style={[
                        styles.cardImage,
                        Platform.OS === 'web' && hovered
                          ? ({ transform: 'scale(1.05)', transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)' } as any)
                          : Platform.OS === 'web'
                          ? ({ transition: 'transform 300ms cubic-bezier(0.16, 1, 0.3, 1)' } as any)
                          : undefined
                      ]}
                      resizeMode="cover"
                    />
                    <View style={styles.categoryBadgeOverlay}>
                      <Text style={styles.categoryBadgeText}>{item.category}</Text>
                    </View>
                    <View
                      style={[
                        styles.zoomHintPill,
                        Platform.OS === 'web' && hovered
                          ? ({ transform: 'translateY(-2px)', boxShadow: '0 4px 12px rgba(29, 78, 216, 0.35)' } as any)
                          : undefined
                      ]}
                      {...(Platform.OS === 'web' ? ({ className: 'skanda-zoom-pill' } as any) : {})}
                    >
                      <Text style={styles.zoomHintText}>🔍 View</Text>
                    </View>
                  </View>

                  <View style={styles.cardBody}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.cardSubtitle} numberOfLines={2}>
                      {item.subtitle}
                    </Text>
                  </View>
                </>
              )}
            </AnimatedHoverCard>
          ))}
        </View>
      </View>

      {/* Interactive Full-Screen Lightbox Modal */}
      <Modal
        visible={lightboxIndex !== null && activeLightboxItem !== null}
        transparent
        animationType="fade"
        onRequestClose={closeLightbox}
      >
        <View
          style={styles.lightboxOverlay}
          {...(Platform.OS === 'web' ? ({ className: 'skanda-modal-backdrop' } as any) : {})}
        >
          {/* Top Bar */}
          <View style={styles.lightboxTopBar}>
            <View style={styles.lightboxCounterBadge}>
              <Text style={styles.lightboxCounterText}>
                {lightboxIndex !== null ? lightboxIndex + 1 : 0} / {filteredItems.length}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.lightboxCloseBtn}
              onPress={closeLightbox}
              accessibilityLabel="Close Lightbox"
              activeOpacity={0.8}
            >
              <Text style={styles.lightboxCloseText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          {/* Main Image & Navigation Arrows */}
          {activeLightboxItem && (
            <View style={styles.lightboxContent}>
              {filteredItems.length > 1 && (
                <TouchableOpacity
                  style={[styles.lightboxArrowBtn, styles.lightboxPrevBtn]}
                  onPress={handlePrev}
                  accessibilityLabel="Previous Photo"
                  activeOpacity={0.85}
                >
                  <Text style={styles.lightboxArrowText}>‹</Text>
                </TouchableOpacity>
              )}

              <View
                key={activeLightboxItem.id}
                style={[styles.lightboxImageContainer, { maxHeight: height * 0.68 }]}
                {...(Platform.OS === 'web' ? ({ className: 'skanda-modal-card' } as any) : {})}
              >
                <Image
                  source={activeLightboxItem.image}
                  defaultSource={IMAGES.fallback}
                  style={styles.lightboxImage}
                  resizeMode="contain"
                />
              </View>

              {filteredItems.length > 1 && (
                <TouchableOpacity
                  style={[styles.lightboxArrowBtn, styles.lightboxNextBtn]}
                  onPress={handleNext}
                  accessibilityLabel="Next Photo"
                  activeOpacity={0.85}
                >
                  <Text style={styles.lightboxArrowText}>›</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Bottom Caption Card */}
          {activeLightboxItem && (
            <View style={styles.lightboxFooter}>
              <View style={styles.lightboxCategoryPill}>
                <Text style={styles.lightboxCategoryText}>{activeLightboxItem.category}</Text>
              </View>
              <Text style={styles.lightboxTitle}>{activeLightboxItem.title}</Text>
              <Text style={styles.lightboxSubtitle}>{activeLightboxItem.subtitle}</Text>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionWrapper: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    paddingVertical: 64,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0'
  },
  standaloneWrapper: {
    minHeight: 700,
    paddingVertical: 48
  },
  sectionContainer: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center'
  },
  headerBlock: {
    alignItems: 'center',
    marginBottom: 32
  },
  badgePill: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12
  },
  badgeText: {
    color: '#1D4ED8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10
  },
  sectionSubtitle: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    maxWidth: 680,
    lineHeight: 24
  },
  filterTabsScroll: {
    marginBottom: 32,
    alignSelf: 'center',
    maxWidth: '100%'
  },
  filterTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 4
  },
  filterTab: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1'
  },
  filterTabActive: {
    backgroundColor: '#1D4ED8',
    borderColor: '#1D4ED8',
    ...shadows.card
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155'
  },
  filterTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700'
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    justifyContent: 'flex-start'
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...shadows.card
  },
  cardDesktop: {
    width: '31.5%',
    minWidth: 300
  },
  cardTablet: {
    width: '48%',
    minWidth: 260
  },
  cardMobile: {
    width: '100%'
  },
  imageWrapper: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: '#E2E8F0',
    position: 'relative',
    overflow: 'hidden'
  },
  cardImage: {
    width: '100%',
    height: '100%'
  },
  categoryBadgeOverlay: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.80)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700'
  },
  zoomHintPill: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(29, 78, 216, 0.90)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999
  },
  zoomHintText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700'
  },
  cardBody: {
    padding: 16
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20
  },
  // Lightbox Modal Styles
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    justifyContent: 'space-between',
    padding: 20
  },
  lightboxTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingTop: Platform.OS === 'web' ? 10 : 30
  },
  lightboxCounterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999
  },
  lightboxCounterText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  lightboxCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)'
  },
  lightboxCloseText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  lightboxContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    marginVertical: 16
  },
  lightboxImageContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  lightboxImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12
  },
  lightboxArrowBtn: {
    position: 'absolute',
    zIndex: 10,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(29, 78, 216, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)'
  },
  lightboxPrevBtn: {
    left: 12
  },
  lightboxNextBtn: {
    right: 12
  },
  lightboxArrowText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '600',
    lineHeight: 30
  },
  lightboxFooter: {
    alignItems: 'center',
    maxWidth: 800,
    alignSelf: 'center',
    paddingBottom: 16
  },
  lightboxCategoryPill: {
    backgroundColor: '#1D4ED8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8
  },
  lightboxCategoryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700'
  },
  lightboxTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4
  },
  lightboxSubtitle: {
    color: '#CBD5E1',
    fontSize: 14,
    textAlign: 'center'
  }
});
