import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Dimensions,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
  Alert,
  Animated,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontSize } from '@/contexts/FontSizeContext';
import { Venue } from '@/constants/Venues';
import { smartSearchService } from '@/lib/smartSearchService';
import { CampusLocation } from '@/lib/placesService';
import VenueBottomSheet from './VenueBottomSheet';
import MapPreloader from './MapPreloader';
import NavigationHeader from './NavigationHeader';
import navigationService from '@/lib/navigationService';

// Navigation camera modes
type NavigationCameraMode = 'overview' | 'following' | 'approach';

// Camera configuration for different phases
const CAMERA_CONFIG = {
  overview: {
    zoom: 0.01, // Show full route
    bearing: 0,
    pitch: 0,
  },
  following: {
    zoom: 0.005, // Close follow mode
    bearing: 'auto', // Follow user heading
    pitch: 45, // 3D perspective
  },
  approach: {
    zoom: 0.003, // Very close for turns
    bearing: 'auto',
    pitch: 60,
  },
};

interface NativeMapScreenProps {
  navigationParams?: any;
}

interface SearchResult extends CampusLocation {}

interface TransportMode {
  id: 'DRIVING' | 'WALKING' | 'TWOWHEELER';
  name: string;
  icon: string;
  color: string;
  mode: 'driving' | 'walking';
}

interface RouteInfo {
  distance: string;
  duration: string;
  coordinates: any[];
  traffic: 'light' | 'moderate' | 'heavy';
  trafficDescription: string;
}

interface MapState {
  userLocation: Location.LocationObject | null;
  searchQuery: string;
  searchResults: SearchResult[];
  showSearch: boolean;
  selectedVenue: Venue | null;
  mapReady: boolean;


  favorites: string[];
  recentSearches: string[];
  showQuickActions: boolean;
  isLocationLoading: boolean;
  searchInterfaceVisible: boolean;
  searchInterfaceExpanded: boolean;
  nearbyPlaces: CampusLocation[];
  loadingNearby: boolean;
  hasError: boolean;
  isNavigating: boolean;
  navigationDestination: Venue | null;
  routeCoordinates: any[];
  routeDistance: string;
  routeDuration: string;
  navigationProgress: number;
  currentInstruction: string;
  nextInstruction: string;
  remainingDistance: string;
  remainingTime: string;
  isOffRoute: boolean;
  recalculatingRoute: boolean;
  selectedTransportMode: TransportMode;
  transportRoutes: { [key: string]: RouteInfo };
  showRouteOptions: boolean;
  isCalculatingRoutes: boolean;
  lastRouteUpdate: number;
  // Enhanced navigation camera
  cameraMode: NavigationCameraMode;
  userHeading: number;
  isFollowingUser: boolean;
}

const VENUE_CATEGORIES = [
  { id: 'all', name: 'All', icon: 'grid-outline', color: '#007AFF' },
  { id: 'Academic', name: 'Academic', icon: 'school-outline', color: '#007AFF' },
  { id: 'Administration', name: 'Admin', icon: 'business-outline', color: '#FF9500' },
  { id: 'Student Services', name: 'Services', icon: 'people-outline', color: '#34C759' },
  { id: 'Health Services', name: 'Health', icon: 'medical-outline', color: '#FF3B30' },
  { id: 'Sports', name: 'Sports', icon: 'fitness-outline', color: '#AF52DE' },
  { id: 'Landmarks', name: 'Landmarks', icon: 'location-outline', color: '#5856D6' },
  { id: 'Facilities', name: 'Facilities', icon: 'construct-outline', color: '#FF9500' },
];

const TRANSPORT_MODES: TransportMode[] = [
  {
    id: 'DRIVING',
    name: 'Drive',
    icon: 'car',
    color: '#1A73E8',
    mode: 'driving'
  },
  {
    id: 'WALKING',
    name: 'Walk',
    icon: 'walk',
    color: '#34A853',
    mode: 'walking'
  },
  {
    id: 'TWOWHEELER',
    name: 'Scooter',
    icon: 'speedometer',
    color: '#FF5722',
    mode: 'driving'
  }
];

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBYI2ZiWhDcWPV1Bk1-flCIhBKrbVZbQ7w';

// Navigation utility functions
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

const findNearestPointOnRoute = (userLat: number, userLon: number, routeCoords: any[]): { index: number, distance: number } => {
  let minDistance = Infinity;
  let nearestIndex = 0;
  
  routeCoords.forEach((coord, index) => {
    const distance = calculateDistance(userLat, userLon, coord.latitude, coord.longitude);
    if (distance < minDistance) {
      minDistance = distance;
      nearestIndex = index;
    }
  });
  
  return { index: nearestIndex, distance: minDistance };
};

const generateTurnInstruction = (currentIndex: number, routeCoords: any[]): string => {
  if (currentIndex >= routeCoords.length - 1) return "You have arrived at your destination";
  
  const remainingDistance = routeCoords.length - currentIndex;
  
  if (remainingDistance <= 5) {
    return "Approaching destination";
  } else if (remainingDistance <= 20) {
    return "Continue straight ahead";
  } else {
    return "Follow the route";
  }
};

const calculateRemainingStats = (currentIndex: number, routeCoords: any[], totalDistance: number, totalDuration: number) => {
  const progress = Math.min(currentIndex / Math.max(routeCoords.length - 1, 1), 1);
  const remainingDistance = totalDistance * (1 - progress);
  const remainingTime = totalDuration * (1 - progress);
  
  return {
    progress: progress * 100,
    remainingDistance: remainingDistance > 1 ? `${remainingDistance.toFixed(1)} km` : `${(remainingDistance * 1000).toFixed(0)} m`,
    remainingTime: `${Math.round(remainingTime)} min`
  };
};

// Calculate route times for different transport modes
const calculateTransportTime = (distance: number, mode: TransportMode['mode'], isScooter: boolean = false): number => {
  const baseTimeMinutes = distance * 60; // Convert to minutes
  
  switch (mode) {
    case 'driving':
      if (isScooter) {
        // Scooters are faster than cars on campus - can weave through traffic, park closer
        const scooterMultiplier = 1 + (Math.random() * 0.15); // 0-15% delay (less than cars)
        return baseTimeMinutes / 40 * scooterMultiplier; // 40 km/h average for scooters
      } else {
        // Average 30 km/h on campus with traffic consideration
        const trafficMultiplier = 1 + (Math.random() * 0.3); // 0-30% traffic delay
        return baseTimeMinutes / 30 * trafficMultiplier;
      }
    case 'walking':
      // Average 5 km/h walking speed
      return baseTimeMinutes / 5;
    default:
      return baseTimeMinutes / 30;
  }
};

// Simulate traffic conditions
const getTrafficCondition = (): { traffic: 'light' | 'moderate' | 'heavy', description: string } => {
  const hour = new Date().getHours();
  const random = Math.random();
  
  // Peak hours logic
  const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
  
  if (isPeakHour) {
    if (random < 0.4) return { traffic: 'heavy', description: 'Heavy traffic due to peak hours' };
    if (random < 0.7) return { traffic: 'moderate', description: 'Moderate traffic' };
    return { traffic: 'light', description: 'Lighter traffic than usual' };
  } else {
    if (random < 0.1) return { traffic: 'moderate', description: 'Some congestion' };
    return { traffic: 'light', description: 'Light traffic' };
  }
};

// Update route times dynamically (simulate real-time updates)
const getUpdatedDuration = (baseDuration: number, mode: TransportMode['mode'], lastUpdate: number): string => {
  const timeSinceUpdate = Date.now() - lastUpdate;
  const shouldUpdate = timeSinceUpdate > 30000; // Update every 30 seconds
  
  if (!shouldUpdate) return `${Math.round(baseDuration)} min`;
  
  // Add small random variation to simulate traffic changes
  const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
  const adjustedDuration = baseDuration * (1 + variation);
  
  return `${Math.round(Math.max(1, adjustedDuration))} min`;
};

const NativeMapScreen: React.FC<NativeMapScreenProps> = ({ navigationParams }) => {
  const { isDark, theme } = useTheme();
  const { fontSizes } = useFontSize();
  const insets = useSafeAreaInsets();
  
  const mapRef = useRef<MapView>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(null);
  
  // Animations
  const mapScale = useRef(new Animated.Value(0.95)).current;
  const fabScale = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-100)).current;
  const spinAnimation = useRef(new Animated.Value(0)).current;
  const searchInterfaceHeight = useRef(new Animated.Value(1)).current;
  const categoryFiltersOpacity = useRef(new Animated.Value(1)).current;
  const topIndicatorsOpacity = useRef(new Animated.Value(0)).current;
  const collapsedStateScale = useRef(new Animated.Value(1)).current;
  const searchBoxFocus = useRef(new Animated.Value(0)).current;
  
  const [state, setState] = useState<MapState>({
    userLocation: null,
    searchQuery: '',
    searchResults: [],
    showSearch: false,
    selectedVenue: null,
    mapReady: false,

    favorites: [],
    recentSearches: [],
    showQuickActions: false,
    isLocationLoading: false,
    hasError: false,
    searchInterfaceVisible: true,
    searchInterfaceExpanded: true,
    nearbyPlaces: [],
    loadingNearby: false,
    isNavigating: false,
    navigationDestination: null,
    routeCoordinates: [],
    routeDistance: '',
    routeDuration: '',
    navigationProgress: 0,
    currentInstruction: '',
    nextInstruction: '',
    remainingDistance: '',
    remainingTime: '',
    isOffRoute: false,
    recalculatingRoute: false,
    selectedTransportMode: TRANSPORT_MODES[0], // Default to driving
    transportRoutes: {},
    showRouteOptions: false,
    isCalculatingRoutes: false,
    lastRouteUpdate: Date.now(),
    // Enhanced navigation camera
    cameraMode: 'overview',
    userHeading: 0,
    isFollowingUser: true,
  });

  const [searchLoading, setSearchLoading] = useState(false);

  // OAU starting coordinates (can navigate anywhere from here)
  const INITIAL_CENTER: Region = {
    latitude: 7.5181,
    longitude: 4.5284,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  };

  // Show search results and nearby places on map
  const mapMarkers = state.searchResults.length > 0 ? state.searchResults : state.nearbyPlaces;

  // Create responsive styles based on current dimensions and safe areas
  const responsiveStyles = useMemo(() => 
    createResponsiveStyles(insets, width, height), 
    [insets, width, height]
  );

  useEffect(() => {
    console.log('🗺️ GENERIC MAP - Component mounted (centered on OAU)');
    initializeMapScreen();
    startSpinAnimation();
    loadNearbyPlaces();
    
    // Cleanup function
    return () => {
      console.log('🗺️ NATIVE MAP - Component unmounting');
      stopLocationTracking();
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Send location to map when both location and map are ready
  useEffect(() => {
    if (state.userLocation && state.mapReady && mapRef.current) {
      console.log('🗺️ NATIVE MAP - Centering on user location');
      mapRef.current.animateToRegion({
        latitude: state.userLocation.coords.latitude,
        longitude: state.userLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    }
  }, [state.userLocation, state.mapReady]);

  // Dynamic time updates (only during active navigation, not route selection)
  useEffect(() => {
    // Only run updates when actively navigating, not when just viewing route options
    if (!state.isNavigating) return;
    
    const interval = setInterval(() => {
      setState(prev => {
        if (!prev.isNavigating || !prev.navigationDestination) return prev;
        
        const updatedRoutes = { ...prev.transportRoutes };
        let hasUpdates = false;
        
        // Only update the currently selected transport mode during navigation
        const currentModeId = prev.selectedTransportMode.id;
        const route = updatedRoutes[currentModeId];
        
        if (route) {
          const baseDuration = parseFloat(route.duration.replace(' min', ''));
          const mode = TRANSPORT_MODES.find(m => m.id === currentModeId)?.mode || 'driving';
          const updatedDuration = getUpdatedDuration(baseDuration, mode, prev.lastRouteUpdate);
          
          if (updatedDuration !== route.duration) {
            updatedRoutes[currentModeId] = { ...route, duration: updatedDuration };
            hasUpdates = true;
          }
        }
        
        if (hasUpdates) {
          console.log('🕒 NATIVE MAP - Updated current route time during navigation');
          return {
            ...prev,
            transportRoutes: updatedRoutes,
            lastRouteUpdate: Date.now(),
            routeDuration: updatedRoutes[currentModeId]?.duration || prev.routeDuration,
          };
        }
        
        return prev;
      });
    }, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [state.isNavigating, state.navigationDestination]);

  // Handle navigation parameters from timetable/external sources
  useEffect(() => {
    const processNavigationParams = async () => {
      // Check for URL parameters first
      let navParams = navigationParams;
      
      // If no URL parameters, check global state
      if (!navParams?.navigate && (global as any).pendingNavigation) {
        console.log('🗺️ NATIVE MAP - Found pending navigation in global state');
        navParams = (global as any).pendingNavigation;
        // Clear the global state after using it
        (global as any).pendingNavigation = null;
      }
      
      if (navParams?.navigate === 'true' && navParams?.venueId) {
        console.log('🗺️ NATIVE MAP - Processing navigation params:', navParams);
        
        try {
          // Create venue object from navigation parameters
          const targetVenue: Venue = {
            id: navParams.venueId as string,
            name: navParams.venueName as string || 'Unknown Location',
            building: navParams.venueName as string || 'Campus',
            type: 'facilities' as const,
            category: 'Campus Location',
            coordinates: {
              latitude: parseFloat(navParams.lat as string),
              longitude: parseFloat(navParams.lng as string),
            },
            description: `Navigate to ${navParams.venueName}`,
            keywords: [],
          };

          console.log('🗺️ NATIVE MAP - Auto-starting navigation to venue:', targetVenue.name);
          
          // Start navigation automatically (this will show the route options)
          await startNavigation(targetVenue);
          
        } catch (error) {
          console.error('🗺️ NATIVE MAP - Error processing navigation params:', error);
          Alert.alert('Navigation Error', 'Failed to start navigation from timetable.');
        }
      }
    };

    // Process navigation params when map is ready
    if (state.mapReady) {
      processNavigationParams();
    }
  }, [navigationParams, state.mapReady]);

  const loadNearbyPlaces = async () => {
    if (state.loadingNearby) return;
    
    setState(prev => ({ ...prev, loadingNearby: true }));
    
    try {
      console.log('🗺️ GENERIC MAP - Loading nearby places around OAU...');
      
      // Get essential campus locations as initial markers
      const searchResult = await smartSearchService.searchCampus('university');
      const results = searchResult.results;
      
      console.log('🗺️ GENERIC MAP - Loaded places:', results.length);
      
      setState(prev => ({ 
        ...prev, 
        nearbyPlaces: results,
        loadingNearby: false 
      }));
    } catch (error) {
      console.error('🗺️ GENERIC MAP - Error loading nearby places:', error);
      setState(prev => ({ ...prev, loadingNearby: false }));
    }
  };

  const initializeMapScreen = async () => {
    // Entrance animations
    Animated.parallel([
      Animated.spring(mapScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(headerSlide, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.stagger(200, [
        Animated.spring(fabScale, {
          toValue: 1,
          tension: 100,
          friction: 6,
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(topIndicatorsOpacity, {
        toValue: state.searchInterfaceVisible ? 0 : 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    await requestLocationPermission();
  };

  const requestLocationPermission = async (): Promise<Location.LocationObject | null> => {
    try {
      setState(prev => ({ ...prev, isLocationLoading: true }));
      console.log('🗺️ NATIVE MAP - Requesting location permission...');
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('🗺️ NATIVE MAP - Permission status:', status);
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        console.log('🗺️ NATIVE MAP - Got location:', {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
        
        setState(prev => ({ 
          ...prev, 
          userLocation: location,
          isLocationLoading: false 
        }));
        
        console.log('🗺️ NATIVE MAP - Centering on user location');
        if (mapRef.current) {
          mapRef.current.animateToRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        }

        return location;
      } else {
        setState(prev => ({
          ...prev,
          isLocationLoading: false,
          locationError: 'Location permission denied',
        }));
        Alert.alert(
          'Location Permission Required',
          'Please enable location access to get directions.',
          [{ text: 'OK' }]
        );
        return null;
      }
    } catch (error) {
      console.error('🗺️ NATIVE MAP - Error getting location:', error);
      setState(prev => ({
        ...prev,
        isLocationLoading: false,
        locationError: 'Failed to get location',
      }));
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please try again.',
        [{ text: 'OK' }]
      );
      return null;
    }
  };

  const startSpinAnimation = () => {
    Animated.loop(
      Animated.timing(spinAnimation, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  };

  const selectVenue = (venue: SearchResult) => {
    try {
      console.log('🎯 NATIVE MAP - Selecting venue:', venue.name);
      
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Convert SearchResult/CampusLocation to Venue format for compatibility
      const venueForSelection: Venue = {
        id: venue.id,
        name: venue.name,
        building: venue.building,
        type: venue.type,
        category: venue.category,
        coordinates: venue.coordinates,
        description: venue.description,
        keywords: venue.keywords || [],
      };

      console.log('🎯 NATIVE MAP - Converted venue for selection:', venueForSelection);

      // Animate to venue location
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: venue.coordinates.latitude,
          longitude: venue.coordinates.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, 1000);
      }

      setState(prev => ({
        ...prev,
        selectedVenue: venueForSelection,
        showSearch: false,
        searchQuery: venue.name,
      }));
    } catch (error) {
      console.error('🎯 NATIVE MAP - Error in selectVenue:', error);
      setState(prev => ({ ...prev, hasError: true }));
    }
  };

  const centerOnUserLocation = async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    console.log('🗺️ NATIVE MAP - Center button pressed, userLocation:', !!state.userLocation);
    
    if (state.userLocation && mapRef.current) {
      console.log('🗺️ NATIVE MAP - Centering on existing location');
      mapRef.current.animateToRegion({
        latitude: state.userLocation.coords.latitude,
        longitude: state.userLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 1000);
    } else {
      await requestLocationPermission();
    }
  };

  const startNavigation = async (venue: Venue) => {
    try {
      console.log('🧭 NATIVE MAP - Starting route calculation to:', venue.name);
      
      // Always show route options first (like Google Maps), even without location
      setState(prev => ({
        ...prev,
        navigationDestination: venue,
        selectedVenue: null, // Close venue bottom sheet
        showRouteOptions: true,
        isCalculatingRoutes: true,
      }));

      // Check for location after showing the modal
      let currentLocation = state.userLocation;
      if (!currentLocation) {
        console.log('🧭 NATIVE MAP - No user location, requesting permissions...');
        currentLocation = await requestLocationPermission();
        
        // If still no location after requesting, show placeholder routes
        if (!currentLocation) {
          console.log('🧭 NATIVE MAP - Still no location, showing placeholder routes');
          setState(prev => ({
            ...prev,
            isCalculatingRoutes: false,
            transportRoutes: {
              DRIVING: { distance: '--', duration: 'Location needed', traffic: 'light', trafficDescription: 'Enable location for routes', coordinates: [] },
              WALKING: { distance: '--', duration: 'Location needed', traffic: 'light', trafficDescription: 'Enable location for routes', coordinates: [] },
              TWOWHEELER: { distance: '--', duration: 'Location needed', traffic: 'light', trafficDescription: 'Enable location for routes', coordinates: [] },
            }
          }));
          return;
        }
      }

      // Calculate routes for all transport modes
      await calculateAllRoutes(venue);

      // Provide haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

    } catch (error) {
      console.error('🧭 NATIVE MAP - Error starting navigation:', error);
      Alert.alert('Navigation Error', 'Failed to start navigation. Please try again.');
    }
  };

  const calculateAllRoutes = async (venue: Venue) => {
    const routes: { [key: string]: RouteInfo } = {};
    
    if (!state.userLocation) {
      // Clear calculating state if no location
      setState(prev => ({ ...prev, isCalculatingRoutes: false }));
      return;
    }
    
    console.log('🗺️ NATIVE MAP - Calculating real Google Maps routes for all transport modes...');

    try {
      // Calculate routes for each transport mode using Google Maps API with timeout protection
      const routePromises = TRANSPORT_MODES.map(async (mode) => {
        try {
          console.log(`🗺️ NATIVE MAP - Starting route calculation for ${mode.name}...`);
          
          // Add timeout protection to each route calculation
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Route calculation timeout')), 10000); // 10 second timeout
          });
          
          const routePromise = calculateRealGoogleRoute(
            state.userLocation!.coords.latitude,
            state.userLocation!.coords.longitude,
            venue.coordinates.latitude,
            venue.coordinates.longitude,
            mode.mode,
            mode.id === 'TWOWHEELER' // Pass scooter flag
          );
          
          const realRouteData = await Promise.race([routePromise, timeoutPromise]) as any;
          
          routes[mode.id] = {
            distance: realRouteData.distance,
            duration: realRouteData.duration,
            coordinates: [], // Will be populated by MapViewDirections
            traffic: realRouteData.traffic,
            trafficDescription: realRouteData.trafficDescription,
          };
          
          console.log(`🚗 ${mode.name}: ${realRouteData.duration} (${realRouteData.distance}) - ${realRouteData.trafficDescription}`);
          
        } catch (error) {
          console.error(`🚫 Error calculating ${mode.name} route:`, error);
          
          // Fallback to basic calculation for any errors (including timeouts)
          const fallbackDistance = calculateDistance(
            state.userLocation!.coords.latitude,
            state.userLocation!.coords.longitude,
            venue.coordinates.latitude,
            venue.coordinates.longitude
          );
          
          const fallbackDuration = calculateTransportTime(fallbackDistance, mode.mode, mode.id === 'TWOWHEELER');
          
          const isTimeout = (error as Error).message?.includes('timeout');
          const isAPIError = (error as Error).message?.includes('ZERO_RESULTS') || 
                           (error as Error).message?.includes('API error');
          
          routes[mode.id] = {
            distance: fallbackDistance > 1 ? `${fallbackDistance.toFixed(1)} km` : `${(fallbackDistance * 1000).toFixed(0)} m`,
            duration: `${Math.round(fallbackDuration)} min`,
            coordinates: [],
            traffic: 'light',
            trafficDescription: isTimeout ? `${mode.name} route (estimated - slow connection)` : 
                              isAPIError ? `${mode.name} route (estimated - service unavailable)` :
                              `${mode.name} route (estimated)`,
          };
          
          console.log(`🚗 ${mode.name}: Using fallback calculation - ${routes[mode.id].duration} (${routes[mode.id].distance})`);
        }
      });

      // Wait for all route calculations to complete (with individual timeouts)
      await Promise.all(routePromises);
      
    } catch (error) {
      console.error('🚫 NATIVE MAP - Unexpected error in calculateAllRoutes:', error);
      
      // Ensure we have fallback routes for all transport modes
      TRANSPORT_MODES.forEach(mode => {
        if (!routes[mode.id]) {
          const fallbackDistance = calculateDistance(
            state.userLocation!.coords.latitude,
            state.userLocation!.coords.longitude,
            venue.coordinates.latitude,
            venue.coordinates.longitude
          );
          
          const fallbackDuration = calculateTransportTime(fallbackDistance, mode.mode, mode.id === 'TWOWHEELER');
          
          routes[mode.id] = {
            distance: fallbackDistance > 1 ? `${fallbackDistance.toFixed(1)} km` : `${(fallbackDistance * 1000).toFixed(0)} m`,
            duration: `${Math.round(fallbackDuration)} min`,
            coordinates: [],
            traffic: 'light',
            trafficDescription: `${mode.name} route (estimated)`,
          };
        }
      });
      
    } finally {
      // ALWAYS clear the calculating state, regardless of success or failure
      console.log('🗺️ NATIVE MAP - Route calculation completed, clearing loading state');
      setState(prev => ({
        ...prev,
        transportRoutes: routes,
        isCalculatingRoutes: false,
        lastRouteUpdate: Date.now(),
        // Auto-select driving if current mode is unavailable
        selectedTransportMode: routes[prev.selectedTransportMode.id]?.duration === 'Not available' 
          ? TRANSPORT_MODES[0] // Default to driving
          : prev.selectedTransportMode,
      }));
    }
  };

  // Calculate real route using Google Maps Directions API
  const calculateRealGoogleRoute = async (
    startLat: number, 
    startLng: number, 
    endLat: number, 
    endLng: number, 
    travelMode: string,
    isScooter: boolean = false
  ): Promise<{distance: string, duration: string, traffic: 'light' | 'moderate' | 'heavy', trafficDescription: string}> => {
    
    const modeMapping = {
      'driving': 'driving',
      'walking': 'walking'
    };
    
    const googleMode = modeMapping[travelMode as keyof typeof modeMapping] || 'driving';
    
    const url = `https://maps.googleapis.com/maps/api/directions/json?` +
      `origin=${startLat},${startLng}&` +
      `destination=${endLat},${endLng}&` +
      `mode=${googleMode}&` +
      `departure_time=now&` +
      `traffic_model=best_guess&` +
      `key=${GOOGLE_MAPS_API_KEY}`;
    
    try {
      // Add timeout protection to the fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout for individual API call
      
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const leg = route.legs[0];
        
        const distance = leg.distance.text;
        let duration = leg.duration.text;
        let trafficDescription = `${travelMode.charAt(0).toUpperCase() + travelMode.slice(1)} route`;
        let traffic: 'light' | 'moderate' | 'heavy' = 'light';
        
        // Use traffic-aware duration for driving
        if (travelMode === 'driving' && leg.duration_in_traffic) {
          const normalDuration = leg.duration.value; // seconds
          const trafficDuration = leg.duration_in_traffic.value; // seconds
          const delay = trafficDuration - normalDuration;
          
          if (isScooter) {
            // Scooters are faster than cars - reduce time by 25%
            const scooterDuration = Math.round(trafficDuration * 0.75);
            const scooterMinutes = Math.round(scooterDuration / 60);
            duration = `${scooterMinutes} min${scooterMinutes !== 1 ? 's' : ''}`;
            
            if (delay > 300) {
              traffic = 'moderate'; // Scooters handle heavy traffic better
              trafficDescription = 'Some congestion, scooter advantage';
            } else if (delay > 120) {
              traffic = 'light';
              trafficDescription = 'Light traffic for scooter';
            } else {
              traffic = 'light';
              trafficDescription = 'Clear scooter route';
            }
          } else {
            duration = leg.duration_in_traffic.text;
            
            if (delay > 300) { // 5+ minutes delay
              traffic = 'heavy';
              trafficDescription = 'Heavy traffic due to congestion';
            } else if (delay > 120) { // 2+ minutes delay
              traffic = 'moderate';
              trafficDescription = 'Moderate traffic';
            } else if (delay < -60) { // Better than usual
              traffic = 'light';
              trafficDescription = 'Lighter traffic than usual';
            } else {
              traffic = 'light';
              trafficDescription = 'Normal traffic conditions';
            }
          }
        } else if (travelMode === 'walking') {
          trafficDescription = 'Walking route';
        }
        
        return {
          distance,
          duration,
          traffic,
          trafficDescription
        };
        
      } else {
        console.error('🚫 Google Directions API error:', data.status, data.error_message);
        throw new Error(`Google Directions API error: ${data.status}`);
      }
      
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('🚫 Google Directions API request timed out:', error);
          throw new Error('Route calculation timeout - API request took too long');
        } else if (error.message.includes('HTTP error')) {
          console.error('🚫 Google Directions API HTTP error:', error);
          throw new Error(`Google Directions API HTTP error: ${error.message}`);
        } else {
          console.error('🚫 Network error calling Google Directions API:', error);
          throw new Error(`Network error: ${error.message}`);
        }
      } else {
        console.error('🚫 Unknown error calling Google Directions API:', error);
        throw new Error('Unknown error occurred during route calculation');
      }
    }
  };

  const selectTransportMode = async (mode: TransportMode) => {
    console.log('🚗 NATIVE MAP - Transport mode selected:', mode.name);
    
    // Show immediate navigation UI with loading state
    setState(prev => ({
      ...prev,
      selectedTransportMode: mode,
      isNavigating: true, // Show navigation header immediately
      isCalculatingRoutes: true, // Show loading state
      showRouteOptions: false, // Hide route options
      searchInterfaceVisible: false, // Hide search during navigation
      showSearch: false, // Hide search results
    }));
    
    // Provide haptic feedback
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }

    try {
      // Auto-start navigation immediately (like Google Maps)
      await startNavigationWithMode(mode);
    } catch (error) {
      console.error('🚗 NATIVE MAP - Error starting navigation:', error);
      Alert.alert(
        'Navigation Error', 
        'Unable to start navigation. Please check your connection and try again.',
        [{ text: 'OK', style: 'default' }]
      );
    } finally {
      // Clear loading state and ensure navigation state is correct
      setState(prev => ({
        ...prev,
        isCalculatingRoutes: false,
        // If navigation failed, reset to route options
        ...(prev.isNavigating ? {} : {
          showRouteOptions: true,
          searchInterfaceVisible: true
        })
      }));
    }
  };

  const startNavigationWithMode = async (selectedMode?: TransportMode) => {
    try {
      const mode = selectedMode || state.selectedTransportMode;
      console.log('🧭 NATIVE MAP - Starting navigation with mode:', mode.name);
      
      if (!state.navigationDestination) {
        console.error('🧭 NATIVE MAP - No navigation destination set');
        return;
      }

      // Convert Venue to CampusLocation format for navigationService
      const destination: CampusLocation = {
        id: state.navigationDestination.id,
        name: state.navigationDestination.name,
        description: state.navigationDestination.description || '',
        coordinates: state.navigationDestination.coordinates,
        category: state.navigationDestination.category,
        source: 'static',
        type: state.navigationDestination.type,
        building: state.navigationDestination.building,
        keywords: state.navigationDestination.keywords
      };

      // Map transport mode to navigation service travel mode
      const travelMode = mode.id === 'DRIVING' ? 'driving' : 
                        mode.id === 'WALKING' ? 'walking' : 'walking';

      // Start navigation using the navigation service
      const success = await navigationService.startNavigation(destination, travelMode, {
        onStatusChange: (status) => {
          console.log('🧭 Navigation status changed:', status);
        },
        onStepChange: (step, stepIndex) => {
          console.log('🧭 Navigation step changed:', step.instruction);
          setState(prev => ({
            ...prev,
            currentInstruction: step.instruction,
            remainingDistance: step.distance.text,
          }));
        },
        onDistanceUpdate: (distance, time) => {
          setState(prev => ({
            ...prev,
            remainingDistance: `${Math.round(distance)}m`,
            remainingTime: `${Math.round(time / 60)}min`,
          }));
        }
      });

      if (success) {
        setState(prev => ({
          ...prev,
          isNavigating: true,
          showRouteOptions: false,
          searchInterfaceVisible: false, // Hide search during navigation
          showSearch: false, // Hide search results
          selectedTransportMode: mode, // Ensure mode is set
          routeDistance: prev.transportRoutes[mode.id]?.distance || '',
          routeDuration: prev.transportRoutes[mode.id]?.duration || '',
          isCalculatingRoutes: false, // Clear loading state
        }));

        // Enhanced route focusing - Google Maps style
        await focusOnNavigationRoute('overview');

        // Provide haptic feedback
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } else {
        // Reset navigation state on failure
        setState(prev => ({
          ...prev,
          isNavigating: false,
          showRouteOptions: true,
          searchInterfaceVisible: true
        }));
        Alert.alert('Navigation Error', 'Failed to start navigation. Please try again.');
      }

    } catch (error) {
      console.error('🧭 NATIVE MAP - Error starting navigation:', error);
      // Reset navigation state on error
      setState(prev => ({
        ...prev,
        isNavigating: false,
        showRouteOptions: true,
        searchInterfaceVisible: true
      }));
      Alert.alert('Navigation Error', 'Failed to start navigation. Please try again.');
    }
  };



  const stopNavigation = () => {
    try {
      console.log('🧭 NATIVE MAP - Stopping navigation');
      
      // Stop navigation service
      navigationService.forceStopNavigation();
      
      // Stop location tracking
      stopLocationTracking();
      
      setState(prev => ({
        ...prev,
        isNavigating: false,
        navigationDestination: null,
        routeCoordinates: [],
        routeDistance: '',
        routeDuration: '',
        navigationProgress: 0,
        currentInstruction: '',
        nextInstruction: '',
        remainingDistance: '',
        remainingTime: '',
        isOffRoute: false,
        recalculatingRoute: false,
        showRouteOptions: false,
        transportRoutes: {},
        selectedTransportMode: TRANSPORT_MODES[0], // Reset to driving
        searchInterfaceVisible: true, // Restore search interface
      }));

      // Return map to normal view
      if (mapRef.current && state.userLocation) {
        mapRef.current.animateToRegion({
          latitude: state.userLocation.coords.latitude,
          longitude: state.userLocation.coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }

      // Provide haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

    } catch (error) {
      console.error('🧭 NATIVE MAP - Error stopping navigation:', error);
    }
  };

  // Google Maps-style route focusing
  const focusOnNavigationRoute = async (mode: NavigationCameraMode = 'overview') => {
    if (!mapRef.current || !state.userLocation || !state.navigationDestination) return;

    console.log('🗺️ NATIVE MAP - Focusing on route with mode:', mode);

    setState(prev => ({ ...prev, cameraMode: mode }));

    switch (mode) {
      case 'overview':
        // Show full route initially (like Google Maps route preview)
        mapRef.current.fitToCoordinates([
          {
            latitude: state.userLocation.coords.latitude,
            longitude: state.userLocation.coords.longitude,
          },
          {
            latitude: state.navigationDestination.coordinates.latitude,
            longitude: state.navigationDestination.coordinates.longitude,
          }
        ], {
          edgePadding: { top: 200, right: 80, bottom: 300, left: 80 },
          animated: true,
        });
        
        // Switch to following mode after 3 seconds
        setTimeout(() => {
          if (state.isNavigating) {
            focusOnNavigationRoute('following');
          }
        }, 3000);
        break;

      case 'following':
        // Google Maps style following - keep user centered with route ahead
        const bearing = state.userHeading || 0;
        const camera = {
          center: {
            latitude: state.userLocation.coords.latitude,
            longitude: state.userLocation.coords.longitude,
          },
          zoom: 17, // Close zoom for navigation
          heading: bearing, // Rotate map based on travel direction
          pitch: 45, // 3D perspective like Google Maps
        };
        
        mapRef.current.animateCamera(camera, { duration: 1000 });
        break;

      case 'approach':
        // Very close view for turns and complex maneuvers
        const approachCamera = {
          center: {
            latitude: state.userLocation.coords.latitude,
            longitude: state.userLocation.coords.longitude,
          },
          zoom: 19,
          heading: state.userHeading || 0,
          pitch: 60,
        };
        
        mapRef.current.animateCamera(approachCamera, { duration: 800 });
        break;
    }
  };

  // Start following user during navigation (like Google Maps)
  const startNavigationCameraFollowing = () => {
    if (!state.isNavigating) return;

    const followInterval = setInterval(() => {
      if (!state.isNavigating || !state.userLocation || !mapRef.current) {
        clearInterval(followInterval);
        return;
      }

      // Determine appropriate camera mode based on context
      const distanceToDestination = calculateDistance(
        state.userLocation.coords.latitude,
        state.userLocation.coords.longitude,
        state.navigationDestination?.coordinates.latitude || 0,
        state.navigationDestination?.coordinates.longitude || 0
      );

      let newMode: NavigationCameraMode = 'following';
      
      // Switch to approach mode when very close or for upcoming turns
      if (distanceToDestination < 0.1) { // < 100m
        newMode = 'approach';
      }

      // Only update if mode changed to avoid unnecessary camera moves
      if (state.cameraMode !== newMode) {
        focusOnNavigationRoute(newMode);
      } else if (state.isFollowingUser && state.cameraMode === 'following') {
        // Smooth following update (like Google Maps)
        const camera = {
          center: {
            latitude: state.userLocation.coords.latitude,
            longitude: state.userLocation.coords.longitude,
          },
          zoom: 17,
          heading: state.userHeading || 0,
          pitch: 45,
        };
        
        mapRef.current.animateCamera(camera, { duration: 500 });
      }
    }, 2000); // Update every 2 seconds

    // Store interval reference for cleanup
    setState(prev => ({ ...prev, navigationCameraInterval: followInterval }));
  };

  // Update user heading for map rotation
  const updateUserHeading = (location: Location.LocationObject) => {
    if (location.coords.heading !== null && location.coords.heading !== undefined) {
      setState(prev => ({ 
        ...prev, 
        userHeading: location.coords.heading || 0,
        userLocation: location 
      }));
    }
  };

  const handleDirectionsReady = (result: any) => {
    console.log('🧭 NATIVE MAP - Directions ready for', state.selectedTransportMode.name, ':', result);
    
    const totalDistance = result.distance;
    const totalDuration = result.duration;
    
    setState(prev => ({
      ...prev,
      routeDistance: totalDistance.toFixed(1) + ' km',
      routeDuration: Math.round(totalDuration) + ' min',
      routeCoordinates: result.coordinates,
      remainingDistance: totalDistance.toFixed(1) + ' km',
      remainingTime: Math.round(totalDuration) + ' min',
      currentInstruction: `${prev.selectedTransportMode.name} route ready - Follow the route`,
      nextInstruction: 'Real-time navigation active',
    }));

    console.log('🗺️ NATIVE MAP - Navigation route calculated successfully');
    console.log(`🚗 Mode: ${state.selectedTransportMode.name}`);
    console.log(`📏 Distance: ${totalDistance.toFixed(1)} km`);
    console.log(`⏰ Duration: ${Math.round(totalDuration)} min`);
  };

  // Real-time location tracking for turn-by-turn navigation
  const startLocationTracking = async () => {
    try {
      console.log('🧭 NATIVE MAP - Starting location tracking for navigation');
      
      // Stop any existing subscription
      stopLocationTracking();
      
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000, // Update every second
          distanceInterval: 5, // Update every 5 meters
        },
        (location) => {
          handleLocationUpdate(location);
        }
      );
      
      locationSubscriptionRef.current = subscription;
      console.log('🧭 NATIVE MAP - Location tracking started');
      
    } catch (error) {
      console.error('🧭 NATIVE MAP - Error starting location tracking:', error);
    }
  };

  const stopLocationTracking = () => {
    if (locationSubscriptionRef.current) {
      console.log('🧭 NATIVE MAP - Stopping location tracking');
      locationSubscriptionRef.current.remove();
      locationSubscriptionRef.current = null;
    }
  };

  const handleLocationUpdate = (location: Location.LocationObject) => {
    console.log('🧭 NATIVE MAP - Location update for navigation');
    
    // Update user location
    setState(prev => ({ ...prev, userLocation: location }));
    
    // Only process if we're navigating and have route coordinates
    if (!state.isNavigating || !state.routeCoordinates.length) return;
    
    const userLat = location.coords.latitude;
    const userLon = location.coords.longitude;
    
    // Find nearest point on route
    const { index: nearestIndex, distance: distanceFromRoute } = findNearestPointOnRoute(
      userLat, 
      userLon, 
      state.routeCoordinates
    );
    
    // Check if user is off route (more than 50 meters away)
    const isOffRoute = distanceFromRoute > 0.05; // 50 meters in km
    
    if (isOffRoute && !state.recalculatingRoute) {
      console.log('🧭 NATIVE MAP - User is off route, recalculating...');
      setState(prev => ({
        ...prev,
        isOffRoute: true,
        recalculatingRoute: true,
        currentInstruction: 'Recalculating route...',
      }));
      
      // Provide haptic feedback for off-route
      if (Platform.OS === 'ios') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
      
      // In a real app, you would recalculate the route here
      // For now, we'll simulate by clearing the off-route state after 3 seconds
      setTimeout(() => {
        setState(prev => ({
          ...prev,
          isOffRoute: false,
          recalculatingRoute: false,
        }));
      }, 3000);
      
    } else if (!isOffRoute) {
      // User is on route, update navigation progress
      const totalDistance = parseFloat(state.routeDistance.replace(' km', ''));
      const totalDuration = parseFloat(state.routeDuration.replace(' min', ''));
      
      const stats = calculateRemainingStats(nearestIndex, state.routeCoordinates, totalDistance, totalDuration);
      const instruction = generateTurnInstruction(nearestIndex, state.routeCoordinates);
      
      setState(prev => ({
        ...prev,
        navigationProgress: stats.progress,
        remainingDistance: stats.remainingDistance,
        remainingTime: stats.remainingTime,
        currentInstruction: instruction,
        isOffRoute: false,
        recalculatingRoute: false,
      }));
      
      // Check if destination reached (within 20 meters)
      if (state.navigationDestination && distanceFromRoute < 0.02) {
        const destDistance = calculateDistance(
          userLat,
          userLon,
          state.navigationDestination.coordinates.latitude,
          state.navigationDestination.coordinates.longitude
        );
        
        if (destDistance < 0.02) { // Within 20 meters of destination
          console.log('🧭 NATIVE MAP - Destination reached!');
          Alert.alert('Destination Reached', `You have arrived at ${state.navigationDestination.name}!`);
          stopNavigation();
          
          if (Platform.OS === 'ios') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      }
    }
  };

  const toggleFavorite = (venueId: string) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    setState(prev => ({
      ...prev,
      favorites: prev.favorites.includes(venueId) 
        ? prev.favorites.filter(id => id !== venueId)
        : [...prev.favorites, venueId]
    }));
  };

  // Search functionality
  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setState(prev => ({ ...prev, searchResults: [], showSearch: false }));
      return;
    }

    setSearchLoading(true);
    
    try {
      console.log('🔍 NATIVE MAP - Searching for:', query);
      
      const searchResult = await smartSearchService.searchCampus(query);
      const results = searchResult.results;
      
      setState(prev => ({ 
        ...prev, 
        searchResults: results,
        showSearch: true 
      }));
      
    } catch (error) {
      console.error('🔍 NATIVE MAP - Search error:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle search input changes
  const handleSearchChange = (text: string) => {
    setState(prev => ({ ...prev, searchQuery: text }));
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      performSearch(text);
    }, 300);
  };



  const toggleSearchInterface = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const newVisibility = !state.searchInterfaceVisible;
    
    setState(prev => ({ 
      ...prev, 
      searchInterfaceVisible: newVisibility,
      searchQuery: newVisibility ? prev.searchQuery : '',
      showSearch: newVisibility ? prev.showSearch : false,
    }));
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => {
    return (
      <TouchableOpacity
        style={[styles.searchResultItem, { backgroundColor: theme.card }]}
        onPress={() => selectVenue(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.resultIcon, { backgroundColor: getCategoryColor(item.category || 'Facilities') }]}>
          <Ionicons 
            name="location"
            size={18} 
            color="#ffffff" 
          />
        </View>
        <View style={styles.resultContent}>
          <Text style={[styles.resultName, { color: theme.text, fontSize: fontSizes.medium }]}>
            {item.name}
          </Text>
          <Text style={[styles.resultDescription, { color: theme.textSecondary, fontSize: fontSizes.small }]}>
            {item.description}
          </Text>
          <Text style={[styles.resultCategory, { color: getCategoryColor(item.category || 'Facilities'), fontSize: fontSizes.caption }]}>
            {item.category}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };



  const getCategoryColor = (category: string): string => {
    const categoryObj = VENUE_CATEGORIES.find(cat => cat.id === category);
    return categoryObj?.color || '#007AFF';
  };

  const getMarkerColor = (venue: CampusLocation): string => {
    if (venue === state.selectedVenue) return '#FF3B30'; // Red for selected
    return getCategoryColor(venue.category || 'Facilities');
  };

  // Error boundary
  if (state.hasError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#f8f9fa' }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Something went wrong with the map.</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => {
              setState(prev => ({
                ...prev,
                hasError: false,
                searchResults: [],
                selectedVenue: null,
                showSearch: false,
              }));
            }}
          >
            <Text style={styles.errorButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      
      {/* Native Map Container */}
      <Animated.View 
        style={[
          styles.mapContainer,
          {
            transform: [{ scale: mapScale }],
          }
        ]}
      >
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={INITIAL_CENTER}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsCompass={false}
          onMapReady={() => {
            console.log('🗺️ NATIVE MAP - Map ready');
            setState(prev => ({ ...prev, mapReady: true }));
          }}
          customMapStyle={isDark ? [
            { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
          ] : undefined}
        >
          {/* Location Markers */}
          {mapMarkers.map((venue) => (
            <Marker
              key={venue.id}
              coordinate={{
                latitude: venue.coordinates.latitude,
                longitude: venue.coordinates.longitude,
              }}
              title={venue.name}
              description={venue.description}
              pinColor={getMarkerColor(venue)}
              onPress={() => selectVenue(venue)}
            />
          ))}

          {/* Navigation Route */}
          {state.isNavigating && state.navigationDestination && state.userLocation && (
            <MapViewDirections
              origin={{
                latitude: state.userLocation.coords.latitude,
                longitude: state.userLocation.coords.longitude,
              }}
              destination={{
                latitude: state.navigationDestination.coordinates.latitude,
                longitude: state.navigationDestination.coordinates.longitude,
              }}
              apikey={GOOGLE_MAPS_API_KEY}
              strokeWidth={6} // Slightly thicker like Google Maps
              strokeColor="#1A73E8" // Google Maps blue
              mode={state.selectedTransportMode.mode.toUpperCase() as any}
              optimizeWaypoints={true}
              precision="high"
              timePrecision="now"
              onReady={handleDirectionsReady}
              lineCap="round" // Rounded line caps like Google Maps
              lineJoin="round" // Rounded line joins
              onError={(errorMessage) => {
                console.error('🧭 NATIVE MAP - Directions error:', errorMessage);
                Alert.alert('Navigation Error', 'Unable to calculate route. Please try again.');
              }}
            />
          )}
        </MapView>
      </Animated.View>

      {/* Search Interface */}
      {state.searchInterfaceVisible && (
        <Animated.View 
          style={[
            styles.searchHeader,
            { backgroundColor: theme.card + 'F8' }
          ]}
        >
          <BlurView intensity={80} style={styles.searchBlur}>
            <LinearGradient
              colors={[theme.card + 'F0', theme.card + 'E0']}
              style={styles.searchGradient}
            >
              {/* Search Box */}
              <View style={styles.searchContainer}>
                <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <Ionicons name="search" size={20} color={theme.textSecondary} />
                  <TextInput
                    style={[styles.searchInput, { color: theme.text, fontSize: fontSizes.medium }]}
                    placeholder="Search any location..."
                    placeholderTextColor={theme.textSecondary}
                    value={state.searchQuery}
                    onChangeText={handleSearchChange}
                    returnKeyType="search"
                  />
                  {state.searchQuery.length > 0 && (
                    <TouchableOpacity 
                      onPress={() => handleSearchChange('')}
                      style={styles.clearButton}
                    >
                      <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.collapseButton, { backgroundColor: theme.surface }]}
                  onPress={toggleSearchInterface}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chevron-up" size={20} color={theme.text} />
                </TouchableOpacity>
              </View>


            </LinearGradient>
          </BlurView>
        </Animated.View>
      )}

      {/* Search Results */}
      {state.showSearch && state.searchInterfaceVisible && (
        <Animated.View 
          style={[
            styles.searchResults, 
            { backgroundColor: theme.card + 'F8' }
          ]}
        >
          <BlurView intensity={100} style={styles.searchResultsBlur}>
            {/* Loading state */}
            {searchLoading && (
              <View style={[styles.loadingContainer, { backgroundColor: theme.card }]}>
                <ActivityIndicator size="small" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.text, fontSize: fontSizes.medium }]}>
                  Searching locations...
                </Text>
              </View>
            )}
            
            {/* Search results */}
            {!searchLoading && state.searchResults.length > 0 && (
              <FlatList
                data={state.searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                style={styles.resultsList}
              />
            )}
            
            {/* No results state */}
            {!searchLoading && state.searchQuery.length > 2 && state.searchResults.length === 0 && (
              <View style={[styles.noResultsContainer, { backgroundColor: theme.card }]}>
                <Ionicons name="search-outline" size={24} color={theme.textSecondary} />
                <Text style={[styles.noResultsText, { color: theme.textSecondary, fontSize: fontSizes.medium }]}>
                  No results for "{state.searchQuery}"
                </Text>
                <Text style={[styles.noResultsSubtext, { color: theme.textSecondary, fontSize: fontSizes.small }]}>
                  Try: "restaurant", "hospital", "university", or any location name
                </Text>
              </View>
            )}
          </BlurView>
        </Animated.View>
      )}

      {/* Floating Search Button - Hidden during navigation */}
      {!state.searchInterfaceVisible && !state.isNavigating && (
        <Animated.View 
          style={[
            styles.floatingSearchButton,
            { backgroundColor: theme.primary }
          ]}
        >
          <TouchableOpacity
            onPress={toggleSearchInterface}
            style={styles.floatingSearchButtonInner}
            activeOpacity={0.8}
          >
            <Ionicons name="search" size={20} color="#ffffff" />
            <Text style={[styles.searchButtonText, { fontSize: fontSizes.medium }]}>Search</Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Turn-by-Turn Navigation Header */}
      {state.isNavigating && state.navigationDestination && (
        <Animated.View 
          style={[
            styles.navigationHeader,
            { backgroundColor: theme.card + 'F8' }
          ]}
        >
          <BlurView intensity={95} style={styles.navigationBlur}>
            <View style={styles.navigationHeaderContent}>
              {/* Current Instruction */}
              <View style={styles.instructionSection}>
                <View style={styles.instructionRow}>
                  <Ionicons 
                    name={state.isOffRoute ? "warning" : "navigate"} 
                    size={20} 
                    color={state.isOffRoute ? "#FF9500" : "#1A73E8"} 
                  />
                  <Text style={[
                    styles.currentInstruction, 
                    { 
                      color: state.isOffRoute ? "#FF9500" : theme.text, 
                      fontSize: fontSizes.medium,
                      fontWeight: '600'
                    }
                  ]} numberOfLines={1}>
                    {state.currentInstruction || 'Follow the route'}
                  </Text>
                </View>
                
                {/* Progress indicator */}
                <View style={styles.progressContainer}>
                  <View style={[styles.progressBar, { backgroundColor: theme.border }]}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: `${state.navigationProgress}%`,
                          backgroundColor: state.isOffRoute ? "#FF9500" : "#1A73E8"
                        }
                      ]} 
                    />
                  </View>
                </View>
              </View>
              
              {/* Remaining Stats */}
              <View style={styles.navStatsSection}>
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.text, fontSize: fontSizes.medium }]}>
                    {state.remainingDistance || state.routeDistance}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary, fontSize: fontSizes.small }]}>
                    remaining
                  </Text>
                </View>
                
                <View style={styles.statDivider} />
                
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: theme.text, fontSize: fontSizes.medium }]}>
                    {state.remainingTime || state.routeDuration}
                  </Text>
                  <Text style={[styles.statLabel, { color: theme.textSecondary, fontSize: fontSizes.small }]}>
                    ETA
                  </Text>
                </View>
              </View>
            </View>
          </BlurView>
        </Animated.View>
      )}

      {/* Floating Action Buttons */}
      <Animated.View 
        style={[
          styles.floatingButtons,
          {
            transform: [{ scale: fabScale }],
          }
        ]}
      >
        <TouchableOpacity 
          style={[styles.fab, styles.locationFab, { backgroundColor: theme.primary }]} 
          onPress={centerOnUserLocation}
          activeOpacity={0.8}
        >
          {state.isLocationLoading ? (
            <Animated.View 
              style={[
                styles.fabSpinner, 
                { 
                  borderColor: '#ffffff',
                  transform: [{
                    rotate: spinAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg'],
                    })
                  }]
                }
              ]} 
            />
          ) : (
            <Ionicons name="locate" size={24} color="#ffffff" />
          )}
        </TouchableOpacity>


      </Animated.View>

      {/* Enhanced Loading Preloader */}
      <MapPreloader 
        isVisible={!state.mapReady} 
        onComplete={() => console.log('🗺️ Native map preloader animation completed')}
      />

      {/* Enhanced Navigation Header */}
      <NavigationHeader
        isVisible={state.isNavigating}
        onClose={() => {
          stopNavigation();
        }}
      />

      {/* Venue Bottom Sheet */}
      <VenueBottomSheet
        venue={state.selectedVenue}
        userLocation={state.userLocation}
        onClose={() => setState(prev => ({ ...prev, selectedVenue: null }))}
        onNavigate={startNavigation}
        onToggleFavorite={toggleFavorite}
        isFavorite={state.selectedVenue ? state.favorites.includes(state.selectedVenue.id) : false}
      />

      {/* Route Options Bottom Sheet (Google Maps Style) */}
      {state.showRouteOptions && state.navigationDestination && (
        <Animated.View style={{
          backgroundColor: '#ffffff',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60%',
          zIndex: 1000,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 10,
        }}>
          <View style={{ flex: 1, backgroundColor: 'transparent' }}>
            <ScrollView 
              style={{ flex: 1 }}
              contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
              showsVerticalScrollIndicator={true}
              scrollIndicatorInsets={{ right: 1 }}
              bounces={true}
              alwaysBounceVertical={false}
            >
              {/* Destination Header */}
              <View style={[styles.destinationHeader, { backgroundColor: '#f8f9fa', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 }]}>
                <TouchableOpacity
                  onPress={() => setState(prev => ({ ...prev, showRouteOptions: false }))}
                  style={[styles.closeButton, { backgroundColor: '#6c757d', padding: 8, borderRadius: 20 }]}
                >
                  <Ionicons name="close" size={20} color="#fff" />
                </TouchableOpacity>
                
                <View style={[styles.destinationInfo, { backgroundColor: 'transparent', paddingLeft: 10 }]}>
                  <Text style={[styles.destinationName, { color: '#212529', fontSize: fontSizes.large, fontWeight: '600' }]} numberOfLines={1}>
                    {state.navigationDestination.name}
                  </Text>
                  <Text style={[styles.destinationCategory, { color: '#6c757d', fontSize: fontSizes.small }]}>
                    {state.navigationDestination.category}
                  </Text>
                </View>
              </View>

              {/* Transport Mode Selection */}
              <View style={[styles.transportModes, { backgroundColor: '#ffffff', padding: 20 }]}>
                {TRANSPORT_MODES.map((mode) => {
                  const route = state.transportRoutes[mode.id];
                  const isSelected = state.selectedTransportMode.id === mode.id;
                  const isLoading = state.isCalculatingRoutes;
                  const isUnavailable = route?.duration === 'Not available';
                  
                  return (
                    <TouchableOpacity
                      key={mode.id}
                                              style={[
                        styles.transportModeButton,
                        {
                          backgroundColor: isSelected ? mode.color + '15' : '#f8f9fa',
                          borderColor: isSelected ? mode.color : '#dee2e6',
                          borderWidth: 2,
                          opacity: isUnavailable ? 0.5 : 1,
                          padding: 16,
                          margin: 8,
                          borderRadius: 12,
                        }
                      ]}
                      onPress={() => !isUnavailable && !isLoading && selectTransportMode(mode)}
                      disabled={isLoading || isUnavailable}
                    >
                      <View style={styles.transportModeContent}>
                        {isLoading && isSelected ? (
                          <ActivityIndicator 
                            size="small" 
                            color={mode.color} 
                            style={{ width: 20, height: 20 }}
                          />
                        ) : (
                          <Ionicons 
                            name={mode.icon as any} 
                            size={20} 
                            color={isSelected ? mode.color : theme.textSecondary} 
                          />
                        )}
                        <Text style={[
                          styles.transportModeName,
                          { 
                            color: isSelected ? mode.color : '#495057',
                            fontSize: fontSizes.small,
                            fontWeight: isSelected ? '600' : '500'
                          }
                        ]}>
                          {isLoading && isSelected ? 'Calculating...' : mode.name}
                        </Text>
                      </View>
                      
                      <View style={styles.routeStats}>
                        {isLoading ? (
                          <View style={styles.loadingStatsContainer}>
                            <ActivityIndicator size="small" color={mode.color} />
                            <Text style={[
                              styles.loadingStatsText,
                              { 
                                color: mode.color,
                                fontSize: fontSizes.caption,
                                marginTop: 4
                              }
                            ]}>
                              Calculating...
                            </Text>
                          </View>
                        ) : route ? (
                          <>
                            <Text style={[
                              styles.routeDuration,
                              { 
                                color: isSelected ? mode.color : '#212529',
                                fontSize: fontSizes.medium,
                                fontWeight: '700'
                              }
                            ]}>
                              {route.duration}
                            </Text>
                            <Text style={[
                              styles.routeDistance,
                              { 
                                color: '#6c757d',
                                fontSize: fontSizes.small
                              }
                            ]}>
                              {route.distance}
                            </Text>
                            {(mode.mode === 'driving') && (
                              <Text style={[
                                styles.trafficInfo,
                                { 
                                  color: route.traffic === 'heavy' ? '#FF9500' : '#34A853',
                                  fontSize: fontSizes.caption
                                }
                              ]}>
                                {route.trafficDescription}
                              </Text>
                            )}
                          </>
                        ) : (
                          <Text style={[styles.routeUnavailable, { color: theme.textSecondary, fontSize: fontSizes.small }]}>
                            --
                          </Text>
                        )}
                      </View>
                      
                      {/* Navigation indicator */}
                      {!isLoading && !isUnavailable && (
                        <View style={styles.navigationIndicator}>
                          <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Selected Route Details */}
              {!state.isCalculatingRoutes && state.transportRoutes[state.selectedTransportMode.id] && (
                <View style={[styles.selectedRouteDetails, { backgroundColor: theme.background }]}>
                  <Text style={[
                    styles.selectedRouteTitle,
                    { 
                      color: state.selectedTransportMode.color,
                      fontSize: fontSizes.medium,
                      fontWeight: '700'
                    }
                  ]}>
                    {state.transportRoutes[state.selectedTransportMode.id].duration} 
                    <Text style={[{ color: theme.text, fontWeight: '500' }]}>
                      {' '}({state.transportRoutes[state.selectedTransportMode.id].distance})
                    </Text>
                  </Text>
                  <Text style={[
                    styles.selectedRouteDescription,
                    { 
                      color: theme.textSecondary,
                      fontSize: fontSizes.small
                    }
                  ]}>
                    {state.transportRoutes[state.selectedTransportMode.id].trafficDescription}
                  </Text>
                </View>
              )}

              {/* Instructions */}
              <View style={styles.instructionsContainer}>
                <View style={styles.instructionHelpRow}>
                  <Ionicons name="information-circle" size={16} color={theme.textSecondary} />
                  <Text style={[
                    styles.instructionText,
                    { 
                      color: theme.textSecondary,
                      fontSize: fontSizes.small
                    }
                  ]}>
                    Tap any option above to start navigation
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const { width, height } = Dimensions.get('window');

// Responsive route options styles
const createResponsiveStyles = (insets: any, screenWidth: number, screenHeight: number) => {
  const isTablet = screenWidth > 768;
  const isLandscape = screenWidth > screenHeight;
  const bottomSafeArea = Math.max(insets.bottom, 16); // Ensure minimum bottom padding
  const tabBarHeight = 70; // Approximate tab bar height
  const totalBottomPadding = bottomSafeArea + tabBarHeight + 32; // Extra padding for scrolling comfort
  
  // Increase modal height - 80% in landscape, 75% in portrait
  const maxModalHeight = screenHeight * (isLandscape ? 0.8 : 0.75); 
  
  return StyleSheet.create({
    routeOptionsContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: maxModalHeight, // Changed from maxHeight to height for consistent sizing
      borderTopLeftRadius: isTablet ? 24 : 20,
      borderTopRightRadius: isTablet ? 24 : 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 15,
      overflow: 'hidden',
    },
    routeOptionsScrollView: {
      flex: 1,
      borderTopLeftRadius: isTablet ? 24 : 20,
      borderTopRightRadius: isTablet ? 24 : 20,
    },
    routeOptionsContent: {
      paddingHorizontal: isTablet ? 32 : 20,
      paddingTop: isTablet ? 28 : 20,
      paddingBottom: totalBottomPadding,
      flexGrow: 1, // Ensure content can grow and scroll
    },
  });
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    borderRadius: 0,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
    width,
    height,
  },
  searchHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  searchBlur: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  searchGradient: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
  },
  collapseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  searchResults: {
    position: 'absolute',
    top: 180,
    left: 20,
    right: 20,
    maxHeight: height * 0.4,
    borderRadius: 16,
    zIndex: 999,
  },
  searchResultsBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 12,
  },
  loadingText: {
    fontWeight: '500',
  },
  resultsList: {
    maxHeight: height * 0.3,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultContent: {
    flex: 1,
  },
  resultName: {
    fontWeight: '600',
    marginBottom: 2,
  },
  resultDescription: {
    marginBottom: 4,
  },
  resultCategory: {
    fontWeight: '500',
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  noResultsText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  noResultsSubtext: {
    textAlign: 'center',
    opacity: 0.8,
  },
  floatingSearchButton: {
    position: 'absolute',
    top: 80,
    left: 20,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingSearchButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  searchButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  navigationHeader: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  navigationBlur: {
    borderRadius: 20,
  },
  navigationHeaderContent: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  instructionSection: {
    gap: 8,
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  currentInstruction: {
    flex: 1,
    fontWeight: '600',
  },
  progressContainer: {
    marginLeft: 32,
  },
  progressBar: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  navStatsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 32,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontWeight: '700',
    fontSize: 16,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  navigationRoute: {
    flex: 1,
    gap: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeLine: {
    width: 2,
    height: 12,
    backgroundColor: '#E0E0E0',
    marginLeft: 7,
  },
  locationText: {
    fontWeight: '500',
    flex: 1,
  },
  routeInfo: {
    alignItems: 'flex-end',
  },
  floatingButtons: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    gap: 12,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  locationFab: {
    // Location button specific styles
  },
  stopFab: {
    // Stop navigation button specific styles
  },
  fabSpinner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderTopColor: 'transparent',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Route Options Bottom Sheet Styles
  routeOptionsBlur: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  destinationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
  },
  destinationInfo: {
    flex: 1,
  },
  destinationName: {
    fontWeight: '700',
    marginBottom: 2,
  },
  destinationCategory: {
    opacity: 0.8,
  },
  transportModes: {
    gap: 12,
    marginBottom: 20,
  },
  transportModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  transportModeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  transportModeName: {
    fontWeight: '500',
  },
  routeStats: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  loadingStatsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  loadingStatsText: {
    textAlign: 'center',
    fontWeight: '500',
  },
  routeDuration: {
    fontWeight: '700',
    marginBottom: 2,
  },
  routeDistance: {
    marginBottom: 1,
  },
  trafficInfo: {
    fontWeight: '500',
  },
  routeUnavailable: {
    fontStyle: 'italic',
  },
  navigationIndicator: {
    marginLeft: 8,
  },
  selectedRouteDetails: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  selectedRouteTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  selectedRouteDescription: {
    lineHeight: 18,
  },
  instructionsContainer: {
    paddingTop: 16,
    paddingBottom: 8,
    alignItems: 'center',
  },
  instructionHelpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  instructionText: {
    fontStyle: 'italic',
    textAlign: 'center',
  },
});

export default NativeMapScreen;
