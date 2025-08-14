import { Linking, Alert, Platform } from 'react-native';
import { Venue } from '@/constants/Venues';
import { router } from 'expo-router';

// Global navigation modal state
let globalNavigationHandler: ((venueId: string) => void) | null = null;

export const setGlobalNavigationHandler = (handler: (venueId: string) => void) => {
  globalNavigationHandler = handler;
};

export interface NavigationOptions {
  venue: Venue;
  showAlert?: boolean;
  preferCampusMap?: boolean;
}

/**
 * Navigate to a venue using the campus map
 */
export const navigateToVenue = async (options: NavigationOptions): Promise<void> => {
  const { venue, showAlert = true, preferCampusMap = true } = options;

  try {
    if (preferCampusMap) {
      // Try to navigate using the campus map first
      await navigateWithCampusMap(venue);
    } else {
      // Use external map applications
      await navigateWithExternalMap(venue);
    }
  } catch (error) {
    console.error('Navigation error:', error);
    if (showAlert) {
      Alert.alert(
        'Navigation Error',
        'Unable to start navigation. Please try again or use an external map app.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Use External Map', onPress: () => navigateWithExternalMap(venue) },
        ]
      );
    }
  }
};

/**
 * Navigate using the campus map (preferred method)
 */
const navigateWithCampusMap = async (venue: Venue): Promise<void> => {
  // Navigate to the Map tab and trigger navigation to the venue
  router.push({
    pathname: '/(tabs)/index',
    params: {
      navigate: 'true',
      venueId: venue.id,
      venueName: venue.name,
      lat: venue.coordinates.latitude.toString(),
      lng: venue.coordinates.longitude.toString(),
    },
  });
};

/**
 * Navigate using external map applications
 */
const navigateWithExternalMap = async (venue: Venue): Promise<void> => {
  const { latitude, longitude } = venue.coordinates;
  const label = encodeURIComponent(venue.name);

  let mapUrl: string;

  if (Platform.OS === 'ios') {
    // Try Apple Maps first on iOS
    mapUrl = `http://maps.apple.com/?daddr=${latitude},${longitude}&q=${label}`;
    
    const canOpen = await Linking.canOpenURL(mapUrl);
    if (canOpen) {
      await Linking.openURL(mapUrl);
      return;
    }
  }

  // Fallback to Google Maps (works on both platforms)
  mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&destination_place_id=${label}`;
  
  const canOpenGoogle = await Linking.canOpenURL(mapUrl);
  if (canOpenGoogle) {
    await Linking.openURL(mapUrl);
  } else {
    throw new Error('No map application available');
  }
};

/**
 * Show navigation options to the user
 */
export const showNavigationOptions = (venue: Venue): void => {
  Alert.alert(
    `Navigate to ${venue.name}?`,
    `Get directions to ${venue.description}`,
    [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Campus Navigation', 
        onPress: () => startCampusNavigation(venue) 
      },
      { 
        text: 'External Map', 
        onPress: () => navigateToVenue({ venue, preferCampusMap: false }) 
      },
    ]
  );
};

/**
 * Start campus navigation using the dedicated navigation screen
 */
export const startCampusNavigation = (venue: Venue): void => {
  if (globalNavigationHandler) {
    globalNavigationHandler(venue.id);
  } else {
    // Fallback to basic map navigation
    navigateToVenue({ venue, preferCampusMap: true });
  }
};

/**
 * Get estimated walking time to venue (simplified calculation)
 */
export const getEstimatedWalkingTime = (distanceInMeters: number): string => {
  // Average walking speed: 5 km/h = 1.39 m/s
  const walkingSpeedMPS = 1.39;
  const timeInSeconds = distanceInMeters / walkingSpeedMPS;
  const timeInMinutes = Math.round(timeInSeconds / 60);
  
  if (timeInMinutes < 1) return '< 1 min';
  if (timeInMinutes < 60) return `${timeInMinutes} min`;
  
  const hours = Math.floor(timeInMinutes / 60);
  const minutes = timeInMinutes % 60;
  return `${hours}h ${minutes}m`;
};

/**
 * Get directions text based on distance
 */
export const getDirectionsText = (distanceInMeters: number): string => {
  if (distanceInMeters < 100) return 'Very close';
  if (distanceInMeters < 500) return 'Short walk';
  if (distanceInMeters < 1000) return 'Medium walk';
  return 'Long walk';
};

/**
 * Get mock distance to venue (this would be replaced with actual location calculation)
 */
export const getDistanceToVenue = (venue: Venue): number => {
  // Mock distance calculation - in a real app you'd use actual user location
  // This returns a random distance between 200-800 meters for demo purposes
  return Math.floor(Math.random() * 600) + 200;
};
