import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ImageViewer from 'react-native-image-zoom-viewer';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontSize } from '@/contexts/FontSizeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FullScreenImageViewerProps {
  visible: boolean;
  onClose: () => void;
  imageUri: string;
  title?: string;
}

export default function FullScreenImageViewer({
  visible,
  onClose,
  imageUri,
  title = 'Profile Picture',
}: FullScreenImageViewerProps) {
  const { theme, isDark } = useTheme();
  const { fontSizes } = useFontSize();

  // Prepare images array for ImageViewer
  const images = [
    {
      url: imageUri,
      props: {
        source: { uri: imageUri },
      },
    },
  ];

  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Ionicons name="close" size={28} color="white" />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { fontSize: fontSizes.h3 }]}>
        {title}
      </Text>
      <View style={styles.headerSpacer} />
    </View>
  );

  const renderFooter = () => (
    <View style={[styles.footer, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
      <Text style={[styles.footerText, { fontSize: fontSizes.caption }]}>
        Pinch to zoom • Drag to pan • Double tap to zoom
      </Text>
    </View>
  );

  const renderIndicator = () => null; // Hide default indicator since we only have one image

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.primary} />
      <Text style={[styles.loadingText, { color: 'white', fontSize: fontSizes.medium }]}>
        Loading image...
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar 
        barStyle="light-content"
        backgroundColor="#000000" 
        translucent 
      />
      
      <View style={styles.container}>
        <ImageViewer
          imageUrls={images}
          index={0}
          enableSwipeDown={true}
          onSwipeDown={onClose}
          onCancel={onClose}
          backgroundColor="#000000"
          renderHeader={renderHeader}
          renderFooter={renderFooter}
          renderIndicator={renderIndicator}
          renderLoading={renderLoading}
          saveToLocalByLongPress={false}
          menuContext={{ saveToLocal: 'Save to Photos', cancel: 'Cancel' }}
          enableImageZoom={true}
          enablePreload={true}
          failImageSource={{
            url: '',
            width: screenWidth,
            height: screenHeight,
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: 'white',
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 20,
  },
  headerSpacer: {
    width: 44,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
    color: 'white',
  },
  footer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    paddingBottom: 30,
    zIndex: 10,
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
