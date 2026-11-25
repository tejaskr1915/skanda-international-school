import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { PublicHeader } from '../components/PublicHeader';
import { PublicFooter } from '../components/PublicFooter';
import { GallerySection } from '../components/GallerySection';
import { LoginModal } from '../components/LoginModal';

export const GalleryScreen: React.FC = () => {
  const [loginModalVisible, setLoginModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      <PublicHeader onOpenLogin={() => setLoginModalVisible(true)} activeRoute="Gallery" />
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <GallerySection isStandalonePage />
        <PublicFooter />
      </ScrollView>
      <LoginModal visible={loginModalVisible} onClose={() => setLoginModalVisible(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC'
  },
  scroll: {
    flex: 1
  }
});
