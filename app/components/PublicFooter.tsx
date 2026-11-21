import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { colors, spacing, borderRadius } from '../theme/theme';

export const PublicFooter: React.FC = () => {
  const { navigateTo } = useAuth();

  return (
    <View style={styles.footerContainer} nativeID="contact" {...({ id: 'contact' } as any)}>
      <View style={styles.footerContent}>
        {/* Col 1: About */}
        <View style={styles.footerCol}>
          <Text style={styles.colTitle}>About Skanda</Text>
          <TouchableOpacity onPress={() => navigateTo('/')} style={styles.linkItem}>
            <Text style={styles.linkText}>Our Heritage & Vision</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigateTo('/')} style={styles.linkItem}>
            <Text style={styles.linkText}>Board of Management</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigateTo('/')} style={styles.linkItem}>
            <Text style={styles.linkText}>Academic Excellence</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigateTo('/')} style={styles.linkItem}>
            <Text style={styles.linkText}>Accreditations & Awards</Text>
          </TouchableOpacity>
        </View>

        {/* Col 2: Admissions */}
        <View style={styles.footerCol}>
          <Text style={styles.colTitle}>Admissions 2026</Text>
          <TouchableOpacity onPress={() => navigateTo('/apply')} style={styles.linkItem}>
            <Text style={styles.linkText}>Admission Overview</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigateTo('/apply/step/1')} style={styles.linkItem}>
            <Text style={styles.linkText}>Start Online Application</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigateTo('/apply')} style={styles.linkItem}>
            <Text style={styles.linkText}>Check Application Status</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigateTo('/apply')} style={styles.linkItem}>
            <Text style={styles.linkText}>Scholarships & Fee Plans</Text>
          </TouchableOpacity>
        </View>

        {/* Col 3: Disclosures */}
        <View style={styles.footerCol}>
          <Text style={styles.colTitle}>Mandatory Disclosures</Text>
          <TouchableOpacity onPress={() => navigateTo('/')} style={styles.linkItem}>
            <Text style={styles.linkText}>CBSE & Council Affiliations</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigateTo('/')} style={styles.linkItem}>
            <Text style={styles.linkText}>Anti-Ragging Committee</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigateTo('/')} style={styles.linkItem}>
            <Text style={styles.linkText}>Student Safety & POCSO Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigateTo('/')} style={styles.linkItem}>
            <Text style={styles.linkText}>Privacy Policy & Terms</Text>
          </TouchableOpacity>
        </View>

        {/* Col 4: Contact */}
        <View style={styles.footerCol}>
          <Text style={styles.colTitle}>Contact Campuses</Text>
          <Text style={styles.contactText}>📍 Skanda International School Campus</Text>
          <Text style={styles.contactText}>Kanakapura Main Road, Bengaluru - 560082</Text>
          <Text style={styles.contactText}>📞 Admissions Desk: +91 80 2843 9000</Text>
          <Text style={styles.contactText}>✉️ admissions@skandainternational.edu.in</Text>
          <View style={styles.hoursBadge}>
            <Text style={styles.hoursText}>Office Hours: Mon - Sat 8:30 AM to 5:00 PM</Text>
          </View>
        </View>
      </View>

      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <Text style={styles.bottomText}>
          © 2026 Skanda International School Education Society. All rights reserved.
        </Text>
        <Text style={styles.bottomSubtext}>
          Designed for Web, iOS, and Android • Powered by Node.js & React Native
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  footerContainer: {
    backgroundColor: colors.brandDark, // Deep Navy
    paddingTop: spacing.xxl,
    paddingBottom: spacing.lg,
    marginTop: spacing.xxl
  },
  footerContent: {
    maxWidth: 1300,
    width: '100%',
    alignSelf: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    gap: 32
  },
  footerCol: {
    flex: 1,
    minWidth: 220
  },
  colTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textInverse,
    marginBottom: spacing.md,
    letterSpacing: 0.5
  },
  linkItem: {
    paddingVertical: 5
  },
  linkText: {
    fontSize: 13,
    color: '#93C5FD',
    lineHeight: 20
  },
  contactText: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 22,
    marginBottom: 4
  },
  hoursBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    marginTop: 8
  },
  hoursText: {
    fontSize: 11,
    color: '#DBEAFE',
    fontWeight: '500'
  },
  bottomBar: {
    maxWidth: 1300,
    width: '100%',
    alignSelf: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    marginTop: spacing.xl,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  bottomText: {
    fontSize: 12,
    color: '#94A3B8'
  },
  bottomSubtext: {
    fontSize: 11,
    color: '#64748B'
  }
});
