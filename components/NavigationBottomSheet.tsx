import React, { useRef, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontSize } from '@/contexts/FontSizeContext';
import { Venue } from '@/constants/Venues';

interface NavigationBottomSheetProps {
  isVisible: boolean;
  destination: Venue | null;
  route: {
    distance: string;
    duration: string;
    steps: number;
  } | null;
  onClose: () => void;
  onStart: () => void;
  onSave?: () => void;
}

interface TransportMode {
  id: string;
  name: string;
  icon: string;
  duration: string;
  active: boolean;
}

const NavigationBottomSheet: React.FC<NavigationBottomSheetProps> = ({
  isVisible,
  destination,
  route,
  onClose,
  onStart,
  onSave,
}) => {
  const { isDark, theme } = useTheme();
  const { fontSizes } = useFontSize();
  
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const [selectedTransport, setSelectedTransport] = useState('walking');

  const transportModes: TransportMode[] = [
    {
      id: 'driving',
      name: 'Drive',
      icon: 'car',
      duration: route?.duration ? `${Math.floor(parseInt(route.duration.split(' ')[0]) * 0.4)} min` : '8 min',
      active: selectedTransport === 'driving',
    },
    {
      id: 'motorcycle',
      name: 'Motorcycle',
      icon: 'bicycle', // Using bicycle as closest to motorcycle
      duration: route?.duration ? `${Math.floor(parseInt(route.duration.split(' ')[0]) * 0.6)} min` : '10 min',
      active: selectedTransport === 'motorcycle',
    },
    {
      id: 'transit',
      name: 'Transit',
      icon: 'bus',
      duration: '—',
      active: selectedTransport === 'transit',
    },
    {
      id: 'walking',
      name: 'Walk',
      icon: 'walk',
      duration: route?.duration || '11 min',
      active: selectedTransport === 'walking',
    },
  ];

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnimation, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(slideAnimation, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  const handleTransportSelect = (transportId: string) => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    setSelectedTransport(transportId);
  };

  const handleStart = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onStart();
  };

  const handleClose = () => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    onClose();
  };

  const getRouteDescription = () => {
    const descriptions = [
      'Fastest route, lighter traffic than usual',
      'Recommended route for walking',
      'Scenic campus route',
      'Direct route via main roads',
      'Shortest walking distance',
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  };

  const getRouteMeta = () => {
    if (!route) return '11 min (1.2 km)';
    
    const duration = route.duration.replace(' min', '');
    const distance = route.distance;
    return `${duration} min (${distance})`;
  };

  if (!isVisible || !destination) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{
            translateY: slideAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [300, 0],
            })
          }]
        }
      ]}
    >
      <BlurView intensity={100} style={styles.blurContainer}>
        <LinearGradient
          colors={[theme.card + 'F8', theme.card + 'E8']}
          style={styles.gradient}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          
          <ScrollView 
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Header with Close */}
            <View style={styles.header}>
              <Text style={[styles.headerTitle, { color: theme.text, fontSize: fontSizes.h2 }]}>
                Drive
              </Text>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.surface }]}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Transport Mode Selection */}
            <View style={styles.transportContainer}>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.transportScroll}
              >
                {transportModes.map((mode) => (
                  <TouchableOpacity
                    key={mode.id}
                    style={[
                      styles.transportMode,
                      mode.active && [styles.transportModeActive, { backgroundColor: theme.primary }],
                      !mode.active && { backgroundColor: theme.surface, borderColor: theme.border },
                    ]}
                    onPress={() => handleTransportSelect(mode.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={mode.icon as any}
                      size={24}
                      color={mode.active ? '#ffffff' : theme.text}
                    />
                    <Text
                      style={[
                        styles.transportDuration,
                        { 
                          color: mode.active ? '#ffffff' : theme.text,
                          fontSize: fontSizes.small 
                        }
                      ]}
                    >
                      {mode.duration}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Route Information */}
            <View style={styles.routeInfo}>
              <Text style={[styles.routeMeta, { color: '#FF8C00', fontSize: fontSizes.h2 }]}>
                {getRouteMeta()}
              </Text>
              <Text style={[styles.routeDescription, { color: theme.textSecondary, fontSize: fontSizes.medium }]}>
                {getRouteDescription()}
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={[styles.startButton, { backgroundColor: '#00695C' }]}
                onPress={handleStart}
                activeOpacity={0.9}
              >
                <Text style={[styles.startButtonText, { fontSize: fontSizes.medium }]}>
                  Start
                </Text>
              </TouchableOpacity>

              {onSave && (
                <TouchableOpacity
                  style={[styles.saveButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                  onPress={onSave}
                  activeOpacity={0.8}
                >
                  <Ionicons name="bookmark-outline" size={18} color={theme.text} />
                  <Text style={[styles.saveButtonText, { color: theme.text, fontSize: fontSizes.medium }]}>
                    Save
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </LinearGradient>
      </BlurView>
    </Animated.View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1001,
    maxHeight: height * 0.45,
  },
  blurContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  gradient: {
    paddingTop: 16,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontWeight: '700',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transportContainer: {
    marginBottom: 24,
  },
  transportScroll: {
    paddingHorizontal: 4,
    gap: 12,
  },
  transportMode: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 80,
    gap: 4,
  },
  transportModeActive: {
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  transportDuration: {
    fontWeight: '600',
  },
  routeInfo: {
    marginBottom: 24,
  },
  routeMeta: {
    fontWeight: '700',
    marginBottom: 4,
  },
  routeDescription: {
    fontWeight: '400',
    lineHeight: 20,
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  startButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 25,
    shadowColor: '#00695C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    gap: 6,
  },
  saveButtonText: {
    fontWeight: '500',
  },
});

export default NavigationBottomSheet;
