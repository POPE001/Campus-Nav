import React, { useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
  Alert,
  Share,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontSize } from '@/contexts/FontSizeContext';
import { Venue } from '@/constants/Venues';

interface VenueBottomSheetProps {
  venue: Venue | null;
  userLocation: any;
  onClose: () => void;
  onNavigate: (venue: Venue) => void;
  onToggleFavorite: (venueId: string) => void;
  isFavorite: boolean;
}

const VenueBottomSheet: React.FC<VenueBottomSheetProps> = ({
  venue,
  userLocation,
  onClose,
  onNavigate,
  onToggleFavorite,
  isFavorite,
}) => {
  const { isDark, theme } = useTheme();
  const { fontSizes } = useFontSize();
  
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (venue) {
      // Show animation
      Animated.parallel([
        Animated.spring(slideAnimation, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Hide animation
      Animated.parallel([
        Animated.spring(slideAnimation, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [venue]);

  if (!venue) return null;

  const getCategoryColor = (category: string): string => {
    const colors: { [key: string]: string } = {
      'Academic': '#007aff',
      'Administration': '#ff9500',
      'Student Services': '#34c759',
      'Health Services': '#ff3b30',
      'Sports': '#af52de',
      'Landmarks': '#5856d6',
      'Facilities': '#ff9500',
    };
    return colors[category] || '#007aff';
  };

  const getCategoryIcon = (category: string): string => {
    const icons: { [key: string]: string } = {
      'Academic': 'school',
      'Administration': 'business',
      'Student Services': 'people',
      'Health Services': 'medical',
      'Sports': 'fitness',
      'Landmarks': 'location',
      'Facilities': 'construct',
    };
    return icons[category] || 'location';
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getDistanceInfo = () => {
    if (!userLocation) return null;
    
    const distance = calculateDistance(
      userLocation.coords.latitude,
      userLocation.coords.longitude,
      venue.coordinates.latitude,
      venue.coordinates.longitude
    );
    
    const walkingTime = Math.round(distance * 12); // 12 minutes per km
    
    return {
      distance: distance.toFixed(2),
      walkingTime: walkingTime
    };
  };

  const handleShare = async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      await Share.share({
        message: `Check out ${venue.name} at OAU Campus!\n\n${venue.description}\n\nCategory: ${venue.category}\nLocation: ${venue.coordinates.latitude}, ${venue.coordinates.longitude}`,
        title: venue.name,
      });
    } catch (error) {
      console.error('Error sharing venue:', error);
    }
  };

  const handleFavorite = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onToggleFavorite(venue.id);
  };

  const handleNavigation = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onNavigate(venue);
  };

  const handleClose = () => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    onClose();
  };

  const distanceInfo = getDistanceInfo();

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropOpacity,
          }
        ]}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          onPress={handleClose}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.container,
          {
            transform: [{
              translateY: slideAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [400, 0],
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
            {/* Handle - Fixed at top, outside ScrollView */}
            <View style={[styles.handle, { backgroundColor: theme.border }]} />
            
            {/* Google Maps Style Content */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              bounces={true}
              style={styles.scrollContent}
              contentContainerStyle={styles.googleMapsContainer}
            >
              {/* Header with Close Button */}
              <View style={styles.gmapsHeader}>
                <TouchableOpacity
                  style={[styles.gmapsCloseButton, { backgroundColor: theme.surface }]}
                  onPress={handleClose}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close" size={24} color={theme.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.gmapsShareButton, { backgroundColor: theme.surface }]}
                  onPress={handleShare}
                  activeOpacity={0.8}
                >
                  <Ionicons name="share-outline" size={24} color={theme.text} />
                </TouchableOpacity>
              </View>

              {/* Venue Title */}
              <View style={styles.gmapsTitleSection}>
                <Text style={[styles.gmapsTitle, { color: theme.text, fontSize: fontSizes.h1 }]}>
                  {venue.name}
                </Text>
              </View>

              {/* Rating Section */}
              <View style={styles.gmapsRatingSection}>
                <View style={styles.gmapsRatingContainer}>
                  <Text style={[styles.gmapsRating, { color: theme.text, fontSize: fontSizes.medium }]}>
                    4.{Math.floor(Math.random() * 9) + 1}
                  </Text>
                  <View style={styles.gmapsStars}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name="star"
                        size={16}
                        color="#FFC107"
                        style={styles.gMapsStar}
                      />
                    ))}
                  </View>
                  <Text style={[styles.gmapsReviewCount, { color: theme.textSecondary, fontSize: fontSizes.medium }]}>
                    ({Math.floor(Math.random() * 200) + 10})
                  </Text>
                </View>
              </View>

              {/* Info Line */}
              <View style={styles.gmapsInfoLine}>
                <Text style={[styles.gmapsInfoText, { color: theme.textSecondary, fontSize: fontSizes.medium }]}>
                  {venue.category}
                </Text>
                <Text style={[styles.gmapsInfoDot, { color: theme.textSecondary }]}>•</Text>
                {distanceInfo && (
                  <>
                    <Text style={[styles.gmapsInfoText, { color: theme.textSecondary, fontSize: fontSizes.medium }]}>
                      {distanceInfo.walkingTime} min
                    </Text>
                    <Text style={[styles.gmapsInfoDot, { color: theme.textSecondary }]}>•</Text>
                  </>
                )}
                <Text style={[styles.gmapsInfoText, { color: theme.textSecondary, fontSize: fontSizes.medium }]}>
                  {venue.faculty || 'University'}
                </Text>
              </View>

              {/* Status Line */}
              <View style={styles.gmapsStatusLine}>
                <Text style={[styles.gmapsStatusOpen, { color: '#0F7B0F', fontSize: fontSizes.medium }]}>
                  Open
                </Text>
                <Text style={[styles.gmapsStatusDot, { color: theme.textSecondary }]}>•</Text>
                <Text style={[styles.gmapsStatusHours, { color: theme.textSecondary, fontSize: fontSizes.medium }]}>
                  Closes 19:00
                </Text>
              </View>

              {/* Single Navigation Button */}
              <View style={styles.gmapsActionContainer}>
                <TouchableOpacity
                  style={[styles.gmapsDirectionsButton, { backgroundColor: '#1A73E8' }]}
                  onPress={handleNavigation}
                  activeOpacity={0.9}
                >
                  <Ionicons name="navigate" size={20} color="#ffffff" />
                  <Text style={[styles.gmapsDirectionsText, { fontSize: fontSizes.medium }]}>
                    Directions
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Description */}
              {venue.description && (
                <View style={styles.gmapsDescriptionSection}>
                  <Text style={[styles.gmapsDescription, { color: theme.textSecondary, fontSize: fontSizes.medium }]}>
                    {venue.description}
                  </Text>
                </View>
              )}

              {/* Photos Section Placeholder */}
              <View style={styles.gmapsPhotosSection}>
                <View style={[styles.gmapsPhotoPlaceholder, { backgroundColor: theme.surface }]}>
                  <Ionicons name="image-outline" size={40} color={theme.textSecondary} />
                  <Text style={[styles.gmapsPhotoText, { color: theme.textSecondary, fontSize: fontSizes.small }]}>
                    {venue.category} Building
                  </Text>
                </View>
              </View>
            </ScrollView>
          </LinearGradient>
        </BlurView>
      </Animated.View>
    </>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    zIndex: 1000,
  },
  backdropTouchable: {
    flex: 1,
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1001,
    maxHeight: height * 0.75, // Increased from 0.6 to 0.75 for more content space
  },
  blurContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  gradient: {
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    flex: 1, // Added flex to gradient
  },
  scrollContent: {
    flex: 1,
    maxHeight: height * 0.6,
  },
  googleMapsContainer: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  // Google Maps Style Components
  gmapsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  gmapsCloseButton: {
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
  gmapsShareButton: {
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
  gmapsTitleSection: {
    marginBottom: 8,
  },
  gmapsTitle: {
    fontWeight: '700',
    lineHeight: 32,
  },
  gmapsRatingSection: {
    marginBottom: 4,
  },
  gmapsRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gmapsRating: {
    fontWeight: '600',
  },
  gmapsStars: {
    flexDirection: 'row',
    gap: 2,
  },
  gMapsStar: {
    // Individual star styling if needed
  },
  gmapsReviewCount: {
    fontWeight: '400',
  },
  gmapsInfoLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  gmapsInfoText: {
    fontWeight: '400',
  },
  gmapsInfoDot: {
    fontWeight: '400',
  },
  gmapsStatusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 6,
  },
  gmapsStatusOpen: {
    fontWeight: '600',
  },
  gmapsStatusDot: {
    fontWeight: '400',
  },
  gmapsStatusHours: {
    fontWeight: '400',
  },
  gmapsActionContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  gmapsDirectionsButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  gmapsDirectionsText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  gmapsDescriptionSection: {
    marginBottom: 20,
  },
  gmapsDescription: {
    lineHeight: 22,
  },
  gmapsPhotosSection: {
    marginBottom: 10,
  },
  gmapsPhotoPlaceholder: {
    height: 120,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  gmapsPhotoText: {
    fontWeight: '500',
  },
});

export default VenueBottomSheet;
