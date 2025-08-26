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
  Modal,
  ActivityIndicator,
} from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Linking from 'expo-linking';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontSize } from '@/contexts/FontSizeContext';
import { Venue } from '@/constants/Venues';
import { smartSearchService } from '@/lib/smartSearchService';
import { CampusLocation } from '@/lib/placesService';
import VenueBottomSheet from './VenueBottomSheet';
import MapPreloader from './MapPreloader';
import NavigationBottomSheet from './NavigationBottomSheet';
import NavigationHeader from './NavigationHeader';
import navigationService from '@/lib/navigationService';

interface EnhancedMapScreenProps {
  navigationParams?: any;
}

interface SearchResult extends CampusLocation {}

interface MapState {
  userLocation: Location.LocationObject | null;
  searchQuery: string;
  searchResults: SearchResult[];
  showSearch: boolean;
  selectedVenue: Venue | null;
  mapReady: boolean;
  showFilters: boolean;
  selectedCategory: string | null;
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
  navigationRoute: {
    distance: string;
    duration: string;
    steps: number;
  } | null;
  showNavigationSheet: boolean;
  navigationDestination: Venue | null;
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

const EnhancedMapScreen: React.FC<EnhancedMapScreenProps> = ({ navigationParams }) => {
  const { isDark, theme } = useTheme();
  const { fontSizes } = useFontSize();
  const webViewRef = useRef<WebView>(null);
  
  // Animated values
  const searchOpacity = useRef(new Animated.Value(0)).current;
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
    showFilters: false,
    selectedCategory: null,
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
    navigationRoute: null,
    showNavigationSheet: false,
    navigationDestination: null,
  });

  // Filtered venues based on category
  const filteredVenues = useMemo(() => {
    if (!state.selectedCategory || state.selectedCategory === 'all') {
      return state.nearbyPlaces;
    }
    return state.nearbyPlaces.filter(venue => venue.category === state.selectedCategory);
  }, [state.selectedCategory, state.nearbyPlaces]);

  useEffect(() => {
    console.log('🗺️ ENHANCED MAP - Component mounted');
    initializeMapScreen();
    startSpinAnimation();
    loadNearbyPlaces();
  }, []);

  // Send location to WebView when both location and map are ready
  useEffect(() => {
    if (state.userLocation && state.mapReady && webViewRef.current) {
      console.log('🗺️ ENHANCED MAP - Sending location to WebView');
      webViewRef.current.postMessage(JSON.stringify({
        type: 'UPDATE_USER_LOCATION',
        location: {
          lat: state.userLocation.coords.latitude,
          lng: state.userLocation.coords.longitude,
        }
      }));
    }
  }, [state.userLocation, state.mapReady]);

  const loadNearbyPlaces = async () => {
    if (state.loadingNearby) return;
    
    setState(prev => ({ ...prev, loadingNearby: true }));
    try {
      console.log('🗺️ ENHANCED MAP - Loading nearby campus places...');
      
      // Search for general campus locations
      const campusResult = await smartSearchService.searchCampus('OAU campus university', {
        maxResults: 25,
      });
      
      setState(prev => ({ 
        ...prev, 
        nearbyPlaces: campusResult.results,
        loadingNearby: false 
      }));
      console.log('🗺️ ENHANCED MAP - Loaded', campusResult.results.length, 'nearby places');
    } catch (error) {
      console.error('🗺️ ENHANCED MAP - Error loading nearby places:', error);
      setState(prev => ({ 
        ...prev, 
        nearbyPlaces: [],
        loadingNearby: false 
      }));
    }
  };

  const startSpinAnimation = () => {
    Animated.loop(
      Animated.timing(spinAnimation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  };

  // Debounced search for fluid, real-time results  
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSearchRef = useRef<string>('');

  useEffect(() => {
    const query = state.searchQuery.trim();
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length === 0) {
      console.log('🔍 ENHANCED MAP - Clearing search, resetting all states');
      setState(prev => ({ ...prev, showSearch: false, searchResults: [] }));
      setSearchLoading(false);
      lastSearchRef.current = '';
      Animated.parallel([
        Animated.timing(searchOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(categoryFiltersOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (query.length >= 1) {
      // Show search interface immediately for instant feedback
      setState(prev => ({ ...prev, showSearch: true }));
      Animated.parallel([
        Animated.timing(searchOpacity, {
          toValue: 1,
          duration: 150, // Faster animation for responsiveness
          useNativeDriver: true,
        }),
        Animated.timing(categoryFiltersOpacity, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();

      // Always show instant suggestions first for immediate feedback
      performInstantSearch(query);

      // API search enhancement for longer queries
      if (query.length > 2) {
        // Reset loading state and start fresh
        setSearchLoading(true);
        
        const debounceDelay = 150;
        
        searchTimeoutRef.current = setTimeout(() => {
          // Double-check the query is still current and valid
          if (query.length > 2 && state.searchQuery === query) {
            console.log('🔍 ENHANCED MAP - Starting API enhancement for:', query);
            handleFluidSearchEnhancement(query);
          } else {
            console.log('🔍 ENHANCED MAP - Skipping stale search for:', query);
            setSearchLoading(false); // Clear loading for stale searches
          }
          lastSearchRef.current = query;
        }, debounceDelay);
      } else {
        // For short queries, make sure loading is off
        setSearchLoading(false);
      }
    }

    return () => {
      // Cleanup: Clear timeout and reset loading state
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = undefined;
      }
      // Reset loading state if component unmounts or search changes
      setSearchLoading(false);
    };
  }, [state.searchQuery]);

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
      // Initialize top indicators opacity based on search interface visibility
      Animated.timing(topIndicatorsOpacity, {
        toValue: state.searchInterfaceVisible ? 0 : 1,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    await requestLocationPermission();
  };

  const requestLocationPermission = async () => {
    try {
      setState(prev => ({ ...prev, isLocationLoading: true }));
      console.log('🗺️ ENHANCED MAP - Requesting location permission...');
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('🗺️ ENHANCED MAP - Permission status:', status);
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 15000,
        });
        
        console.log('🗺️ ENHANCED MAP - Got location:', {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
        
        setState(prev => ({ 
          ...prev, 
          userLocation: location,
          isLocationLoading: false 
        }));
      } else {
        setState(prev => ({ ...prev, isLocationLoading: false }));
      }
    } catch (error) {
      console.error('🗺️ ENHANCED MAP - Location error:', error);
      setState(prev => ({ ...prev, isLocationLoading: false }));
    }
  };

  // Instant search for immediate feedback (all query lengths)
  const performInstantSearch = async (query: string) => {
    try {
      console.log('⚡ ENHANCED MAP - Instant search for:', query);
      
      // Get smart suggestions first for immediate response
      const suggestions = smartSearchService.getSearchSuggestions(query);
      
      // Create instant results from suggestions
      const instantResults = suggestions
        .map((suggestion, index) => ({
          id: `suggestion-${Date.now()}-${index}`, // Unique IDs to avoid conflicts
          name: suggestion,
          building: 'Campus location',
          category: 'Suggestion',
          coordinates: { latitude: 7.5181, longitude: 4.5284 }, // Default campus center
          source: 'suggestion' as const,
        }));

      setState(prev => ({ ...prev, searchResults: instantResults }));
      console.log('⚡ ENHANCED MAP - Instant suggestions:', instantResults.map(r => r.name).join(', '));
      
    } catch (error) {
      console.error('⚡ ENHANCED MAP - Instant search error:', error);
    }
  };

  // Enhanced search that merges instant suggestions with API results
  const handleFluidSearchEnhancement = async (query: string) => {
    const currentQuery = query.trim();
    
    try {
      // Early validation
      if (!currentQuery || currentQuery.length === 0) {
        console.log('🔍 ENHANCED MAP - Empty query, clearing results');
        setState(prev => ({ ...prev, searchResults: [] }));
        setSearchLoading(false);
        return;
      }

      // Check if this search is still relevant
      if (state.searchQuery !== currentQuery) {
        console.log('🔍 ENHANCED MAP - Search query changed, aborting stale search:', currentQuery, '→', state.searchQuery);
        setSearchLoading(false);
        return;
      }

      console.log('🔍 ENHANCED MAP - API enhancement search starting for:', currentQuery);
      
      const searchResult = await smartSearchService.searchCampus(currentQuery, {
        maxResults: 15,
        includeEssential: true,
      });
      
      // Check again if search is still relevant after async operation
      if (state.searchQuery !== currentQuery) {
        console.log('🔍 ENHANCED MAP - Search changed during API call, discarding results');
        setSearchLoading(false);
        return;
      }
      
      console.log('🔍 ENHANCED MAP - API results received:', searchResult.results?.length || 0, 'from', searchResult.source);
      
      // Enhanced validation
      const validAPIResults = searchResult.results?.filter(venue => {
        const isValid = venue && 
          venue.name && 
          typeof venue.name === 'string' &&
          venue.name.trim().length > 0 &&
          venue.coordinates &&
          typeof venue.coordinates.latitude === 'number' &&
          typeof venue.coordinates.longitude === 'number';
        
        if (!isValid) {
          console.warn('🔍 ENHANCED MAP - Invalid API result filtered:', venue?.name || 'unnamed');
        }
        return isValid;
      }) || [];
      
      // Get current instant suggestions to preserve good ones
      const currentResults = state.searchResults || [];
      const instantSuggestions = currentResults.filter(result => result.source === 'suggestion');
      
      // Smart merge: Keep instant suggestions that are still relevant, enhance with API results
      const mergedResults = [];
      
      // Add API results first (higher quality)
      const filteredAPIResults = validAPIResults
        .filter(venue => !state.selectedCategory || state.selectedCategory === 'all' || venue.category === state.selectedCategory)
        .slice(0, 8);
      
      mergedResults.push(...filteredAPIResults);
      
      // Add relevant instant suggestions that don't conflict with API results
      const lowerQuery = currentQuery.toLowerCase();
      const relevantSuggestions = instantSuggestions
        .filter(suggestion => {
          const suggestionName = suggestion.name.toLowerCase();
          // Only keep suggestions that are still relevant and not duplicated by API
          return suggestionName.includes(lowerQuery) && 
                 !mergedResults.some(result => 
                   result.name.toLowerCase().includes(suggestionName.toLowerCase())
                 );
        })
        .slice(0, 4); // Limit suggestions to avoid clutter
        
      mergedResults.push(...relevantSuggestions);
      
      console.log('🔍 ENHANCED MAP - Smart merge completed:', filteredAPIResults.length, 'API +', relevantSuggestions.length, 'suggestions =', mergedResults.length, 'total');
      
      // Final check before updating state
      if (state.searchQuery === currentQuery) {
        setState(prev => ({ ...prev, searchResults: mergedResults }));
        console.log('🔍 ENHANCED MAP - Results updated successfully');
      } else {
        console.log('🔍 ENHANCED MAP - Search changed before state update, skipping');
      }
      
    } catch (error) {
      console.error('🔍 ENHANCED MAP - API enhancement error:', error);
      console.error('🔍 ENHANCED MAP - Error details:', {
        message: (error as Error)?.message || 'Unknown error',
        query: currentQuery,
        searchQuery: state.searchQuery
      });
    } finally {
      // ALWAYS clear loading state, regardless of success/failure/cancellation
      setSearchLoading(false);
      console.log('🔍 ENHANCED MAP - Loading state cleared for query:', currentQuery);
    }
  };

  // Legacy function kept for backward compatibility
  const handleFluidSearch = (query: string) => handleFluidSearchEnhancement(query);

  // Legacy function kept for backward compatibility
  const handleSearch = () => handleFluidSearch(state.searchQuery);

  const selectVenue = (venue: Venue) => {
    try {
      console.log('🎯 ENHANCED MAP - Venue selected:', venue?.name);
      console.log('🎯 ENHANCED MAP - Venue coordinates:', venue?.coordinates);
      
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    
      console.log('🎯 ENHANCED MAP - Setting selectedVenue state...');
    setState(prev => ({ 
      ...prev, 
      selectedVenue: venue,
        searchQuery: venue.name || '',
      showSearch: false,
      recentSearches: [venue.name, ...prev.recentSearches.filter(s => s !== venue.name)].slice(0, 5)
    }));
      console.log('🎯 ENHANCED MAP - selectedVenue state set successfully');
    
    // Send venue selection to WebView
      console.log('🎯 ENHANCED MAP - Sending venue to WebView...');
      if (webViewRef.current && venue) {
        const venueData = {
        type: 'SELECT_VENUE',
          venue: {
            id: venue.id,
            name: venue.name,
            coordinates: venue.coordinates,
            category: venue.category,
            description: venue.description,
          }
        };
        webViewRef.current.postMessage(JSON.stringify(venueData));
        console.log('🎯 ENHANCED MAP - Venue data sent to WebView:', venueData);
      } else {
        console.warn('🎯 ENHANCED MAP - WebView ref is null or venue is invalid');
      }
      
      console.log('🎯 ENHANCED MAP - selectVenue completed successfully');
    } catch (error) {
      console.error('🎯 ENHANCED MAP - Error in selectVenue:', error);
      setState(prev => ({ ...prev, hasError: true }));
    }
  };

  const centerOnUserLocation = async () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    
    console.log('🗺️ ENHANCED MAP - Center button pressed, userLocation:', !!state.userLocation);
    
    if (state.userLocation && webViewRef.current) {
      console.log('🗺️ ENHANCED MAP - Centering on existing location');
      webViewRef.current.postMessage(JSON.stringify({
        type: 'CENTER_ON_USER',
        location: {
          lat: state.userLocation.coords.latitude,
          lng: state.userLocation.coords.longitude,
        }
      }));
    } else {
      await requestLocationPermission();
    }
  };

  const toggleCategory = (categoryId: string) => {
    if (Platform.OS === 'ios') {
      Haptics.selectionAsync();
    }
    
    setState(prev => ({ 
      ...prev, 
      selectedCategory: prev.selectedCategory === categoryId ? null : categoryId 
    }));
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

  const toggleSearchInterface = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const newVisibility = !state.searchInterfaceVisible;
    
    setState(prev => ({ 
      ...prev, 
      searchInterfaceVisible: newVisibility,
      searchQuery: newVisibility ? prev.searchQuery : '', // Clear search when hiding
      showSearch: newVisibility ? prev.showSearch : false,
    }));

    Animated.parallel([
      Animated.timing(searchInterfaceHeight, {
        toValue: newVisibility ? 1 : 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(headerSlide, {
        toValue: newVisibility ? 0 : -200,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(topIndicatorsOpacity, {
        toValue: newVisibility ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const collapseSearchInterface = () => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    const newExpanded = !state.searchInterfaceExpanded;
    
    setState(prev => ({ 
      ...prev, 
      searchInterfaceExpanded: newExpanded,
      searchQuery: newExpanded ? prev.searchQuery : '', // Clear search when collapsing
      showSearch: newExpanded ? prev.showSearch : false,
    }));

    Animated.parallel([
      Animated.timing(searchInterfaceHeight, {
        toValue: newExpanded ? 1 : 0.7,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(collapsedStateScale, {
        toValue: newExpanded ? 1 : 0.98,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const onGestureEvent = (event: any) => {
    if (event.nativeEvent.translationY > 50 && state.searchInterfaceVisible) {
      toggleSearchInterface();
    }
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      if (event.nativeEvent.translationY > 80 && state.searchInterfaceVisible) {
        toggleSearchInterface();
      }
    }
  };

  const getVenueNavigation = (venue: Venue) => {
    try {
      console.log('🧭 ENHANCED MAP - Get Directions button pressed!');
      console.log('🧭 ENHANCED MAP - Selected venue:', venue?.name);
      console.log('🧭 ENHANCED MAP - User location:', !!state.userLocation);

      if (!state.userLocation) {
        console.log('🧭 ENHANCED MAP - No user location, showing alert');
        Alert.alert('Location Required', 'Please enable location services to get directions.');
        return;
      }

      const userLat = state.userLocation.coords.latitude;
      const userLng = state.userLocation.coords.longitude;
      const venueLat = venue.coordinates.latitude;
      const venueLng = venue.coordinates.longitude;

      console.log('🧭 ENHANCED MAP - Calculating distance...');
      // Calculate distance and estimated walking time
      const distance = calculateDistance(userLat, userLng, venueLat, venueLng);
      const walkingTime = Math.round(distance * 12); // Rough estimate: 12 minutes per km
      
      console.log('🧭 ENHANCED MAP - Distance calculated:', distance.toFixed(2), 'km');
      console.log('🧭 ENHANCED MAP - Starting in-app navigation...');

      // Start in-app navigation directly
      startCampusNavigation(venue);
      
      console.log('🧭 ENHANCED MAP - getVenueNavigation completed');
    } catch (error) {
      console.error('🧭 ENHANCED MAP - Error in getVenueNavigation:', error);
      setState(prev => ({ ...prev, hasError: true }));
    }
  };

  const startCampusNavigation = async (venue: Venue) => {
    try {
      console.log('🧭 ENHANCED MAP - Starting native navigation to:', venue.name);
      
      if (!state.userLocation) {
        Alert.alert('Location Required', 'Please enable location services for navigation.');
        return;
      }

      // Convert Venue to CampusLocation format for navigationService
      const destination: CampusLocation = {
        id: venue.id,
        name: venue.name,
        description: venue.description,
        coordinates: venue.coordinates,
        category: venue.category,
        source: 'static',
        type: venue.type,
        building: venue.building,
        keywords: venue.keywords
      };

      // Start navigation using the navigation service
      const success = await navigationService.startNavigation(destination, 'walking', {
        onStatusChange: (status) => {
          console.log('🧭 Navigation status changed:', status);
        },
        onStepChange: (step, stepIndex) => {
          console.log('🧭 Navigation step changed:', step.instruction);
        },
        onDistanceUpdate: (distance, time) => {
          console.log('🧭 Distance update:', distance, time);
        }
      });

      if (success) {
        setState(prev => ({
          ...prev,
          isNavigating: true,
          navigationDestination: venue,
        }));

        // Send navigation start message to WebView
        if (webViewRef.current) {
          const webViewDestination = {
            lat: venue.coordinates.latitude,
            lng: venue.coordinates.longitude,
          };

          webViewRef.current.postMessage(JSON.stringify({
            type: 'START_NAVIGATION',
            destination: webViewDestination,
          }));

          console.log('🧭 ENHANCED MAP - Starting native Google Maps navigation');
        }

        // Provide haptic feedback
        if (Platform.OS === 'ios') {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } else {
        Alert.alert('Navigation Error', 'Failed to start navigation. Please try again.');
      }

    } catch (error) {
      console.error('🧭 ENHANCED MAP - Error starting navigation:', error);
      Alert.alert('Navigation Error', 'Failed to start navigation. Please try again.');
    }
  };

  const stopNavigation = () => {
    try {
      console.log('🧭 ENHANCED MAP - Stopping native navigation');
      
      // Stop navigation service
      navigationService.forceStopNavigation();
      
      // Send stop message to WebView
      if (webViewRef.current) {
        webViewRef.current.postMessage(JSON.stringify({
          type: 'STOP_NAVIGATION',
        }));
      }

      setState(prev => ({
        ...prev,
        isNavigating: false,
        navigationDestination: null,
        showNavigationSheet: false,
      }));

      // Provide haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

    } catch (error) {
      console.error('🧭 ENHANCED MAP - Error stopping navigation:', error);
    }
  };

  const handleNavigationStart = () => {
    try {
      console.log('🧭 ENHANCED MAP - Starting turn-by-turn navigation');
      
      // Close the navigation sheet and start actual navigation
      setState(prev => ({ 
        ...prev, 
        showNavigationSheet: false 
      }));

      // Here you could add actual turn-by-turn navigation logic
      // For now, we'll keep the route visible and show a simple indicator
      Alert.alert(
        'Navigation Started',
        'Turn-by-turn navigation would start here. Route remains visible on map.',
        [{ text: 'OK' }]
      );

      // Provide haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

    } catch (error) {
      console.error('🧭 ENHANCED MAP - Error starting navigation:', error);
    }
  };

  const handleNavigationClose = () => {
    try {
      console.log('🧭 ENHANCED MAP - Closing navigation bottom sheet');
      
      // Close navigation sheet but keep route visible
      setState(prev => ({ 
        ...prev, 
        showNavigationSheet: false 
      }));

      // Provide haptic feedback
      if (Platform.OS === 'ios') {
        Haptics.selectionAsync();
      }

    } catch (error) {
      console.error('🧭 ENHANCED MAP - Error closing navigation sheet:', error);
    }
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

  const openExternalMap = (venue: Venue) => {
    try {
      console.log('🧭 ENHANCED MAP - Opening external map for:', venue?.name);
      
    if (!state.userLocation) {
        console.log('🧭 ENHANCED MAP - No user location for external map');
      Alert.alert('Location Required', 'Please enable location services first.');
      return;
    }

    const userLat = state.userLocation.coords.latitude;
    const userLng = state.userLocation.coords.longitude;
    const venueLat = venue.coordinates.latitude;
    const venueLng = venue.coordinates.longitude;

      console.log('🧭 ENHANCED MAP - User location:', `${userLat}, ${userLng}`);
      console.log('🧭 ENHANCED MAP - Venue location:', `${venueLat}, ${venueLng}`);

    // Create URLs for different map apps with directions from current location to venue
    const googleMapsUrl = `https://www.google.com/maps/dir/${userLat},${userLng}/${venueLat},${venueLng}`;
    
    const appleMapsUrl = Platform.select({
      ios: `http://maps.apple.com/?saddr=${userLat},${userLng}&daddr=${venueLat},${venueLng}&dirflg=w`,
      android: googleMapsUrl,
    });

    const url = Platform.OS === 'ios' ? appleMapsUrl : googleMapsUrl;

      console.log('🧭 ENHANCED MAP - Generated URL:', url);

    if (url) {
        console.log('🧭 ENHANCED MAP - Opening URL with Linking...');
        Linking.openURL(url)
          .then(() => {
            console.log('🧭 ENHANCED MAP - Successfully opened external map');
          })
          .catch((err) => {
            console.error('🧭 ENHANCED MAP - Failed to open map:', err);
          Alert.alert('Error', 'Unable to open maps application.');
        });
      } else {
        console.warn('🧭 ENHANCED MAP - No URL generated for external map');
      }
      
      console.log('🧭 ENHANCED MAP - openExternalMap completed');
    } catch (error) {
      console.error('🧭 ENHANCED MAP - Error in openExternalMap:', error);
      Alert.alert('Error', 'Failed to open external maps.');
      setState(prev => ({ ...prev, hasError: true }));
    }
  };



  const handleWebViewMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('🗺️ ENHANCED MAP - Received message:', message);
      
      switch (message.type) {
        case 'MAP_READY':
          console.log('🗺️ ENHANCED MAP - Map is ready!');
          setState(prev => ({ ...prev, mapReady: true }));
          break;
        case 'MAP_LOADED':
          console.log('🗺️ ENHANCED MAP - Map tiles loaded! 🎉');
          break;
        case 'VENUE_SELECTED':
          console.log('🗺️ ENHANCED MAP - Venue selected:', message.venue);
          setState(prev => ({ ...prev, selectedVenue: message.venue }));
          break;
        case 'MAP_ERROR':
          console.error('🗺️ ENHANCED MAP - Error:', message.error);
          break;
        
        // Native navigation message handlers
        case 'NAVIGATION_STARTED':
          console.log('🧭 ENHANCED MAP - Native navigation started:', message.route);
          setState(prev => ({ 
            ...prev, 
            isNavigating: true,
            navigationRoute: message.route,
            showNavigationSheet: true,
            navigationDestination: prev.selectedVenue, // Store destination
            selectedVenue: null // Close venue bottom sheet
          }));
          break;
        case 'NAVIGATION_STOPPED':
          console.log('🧭 ENHANCED MAP - Navigation stopped');
          setState(prev => ({ 
            ...prev, 
            isNavigating: false,
            navigationRoute: null,
            showNavigationSheet: false,
            navigationDestination: null
          }));
          break;
        case 'NAVIGATION_ERROR':
          console.error('🧭 ENHANCED MAP - Navigation error:', message.error);
          Alert.alert('Navigation Error', message.error);
          setState(prev => ({ 
            ...prev, 
            isNavigating: false,
            navigationRoute: null,
            showNavigationSheet: false,
            navigationDestination: null
          }));
          break;
        case 'LOCATION_ERROR':
          console.error('🧭 ENHANCED MAP - Location error:', message.error);
          Alert.alert('Location Error', 'Unable to get your location. Please check location permissions and try again.');
          break;
      }
    } catch (error) {
      console.error('🗺️ ENHANCED MAP - Failed to parse message:', error);
    }
  };

  const getCategoryColor = (category: string): string => {
    const categoryObj = VENUE_CATEGORIES.find(cat => cat.id === category);
    return categoryObj?.color || '#007AFF';
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

  const createEnhancedMapHTML = () => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
            * { 
                box-sizing: border-box; 
                margin: 0; 
                padding: 0; 
            }
            body, html {
                height: 100%;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: ${isDark ? '#1c1c1e' : '#ffffff'};
                overflow: hidden;
            }
            #map {
                height: 100vh;
                width: 100vw;
                border-radius: 0;
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            let map;
            let userMarker;
            let selectedMarker;
            let venues = ${JSON.stringify(filteredVenues)};
            let userLocation = null;
            let isDarkMode = ${isDark};
            
            // Navigation variables
            let directionsService;
            let directionsRenderer;
            let isNavigating = false;
            let currentRoute = null;
            let routeSteps = [];
            let currentStepIndex = 0;
            let watchPositionId = null;
            
            function initMap() {
                console.log('🗺️ ENHANCED WEBVIEW - Initializing Google Maps...');
                
                const mapStyles = isDarkMode ? [
                    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                    {
                        featureType: "administrative.locality",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#d59563" }],
                    },
                    {
                        featureType: "poi",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#d59563" }],
                    },
                    {
                        featureType: "poi.park",
                        elementType: "geometry",
                        stylers: [{ color: "#263c3f" }],
                    },
                    {
                        featureType: "poi.park",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#6b9a76" }],
                    },
                    {
                        featureType: "road",
                        elementType: "geometry",
                        stylers: [{ color: "#38414e" }],
                    },
                    {
                        featureType: "road",
                        elementType: "geometry.stroke",
                        stylers: [{ color: "#212a37" }],
                    },
                    {
                        featureType: "road",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#9ca5b3" }],
                    },
                    {
                        featureType: "road.highway",
                        elementType: "geometry",
                        stylers: [{ color: "#746855" }],
                    },
                    {
                        featureType: "road.highway",
                        elementType: "geometry.stroke",
                        stylers: [{ color: "#1f2835" }],
                    },
                    {
                        featureType: "road.highway",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#f3d19c" }],
                    },
                    {
                        featureType: "transit",
                        elementType: "geometry",
                        stylers: [{ color: "#2f3948" }],
                    },
                    {
                        featureType: "transit.station",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#d59563" }],
                    },
                    {
                        featureType: "water",
                        elementType: "geometry",
                        stylers: [{ color: "#17263c" }],
                    },
                    {
                        featureType: "water",
                        elementType: "labels.text.fill",
                        stylers: [{ color: "#515c6d" }],
                    },
                    {
                        featureType: "water",
                        elementType: "labels.text.stroke",
                        stylers: [{ color: "#17263c" }],
                    },
                ] : [];
                
                map = new google.maps.Map(document.getElementById("map"), {
                    zoom: 16,
                    center: { lat: 7.5181, lng: 4.5284 },
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                    zoomControl: true,
                    gestureHandling: 'auto',
                    styles: mapStyles,
                    mapTypeId: 'roadmap',
                });
                
                // Initialize directions service for navigation
                directionsService = new google.maps.DirectionsService();
                directionsRenderer = new google.maps.DirectionsRenderer({
                    suppressMarkers: false,
                    suppressInfoWindows: false,
                    polylineOptions: {
                        strokeColor: '#4285f4',
                        strokeOpacity: 0.9,
                        strokeWeight: 5,
                        geodesic: true
                    }
                });
                directionsRenderer.setMap(map);
                
                // Add enhanced venue markers
                venues.forEach(venue => {
                    const categoryColors = {
                        'Academic': '#007aff',
                        'Administration': '#ff9500',
                        'Student Services': '#34c759',
                        'Health Services': '#ff3b30',
                        'Sports': '#af52de',
                        'Landmarks': '#5856d6',
                        'Facilities': '#ff9500',
                    };
                    
                    const color = categoryColors[venue.category] || '#007aff';
                    
                    const marker = new google.maps.Marker({
                        position: { 
                            lat: venue.coordinates.latitude, 
                            lng: venue.coordinates.longitude 
                        },
                        map: map,
                        title: venue.name,
                        icon: {
                            url: \`data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="\${color}" stroke="#ffffff" stroke-width="3"/><circle cx="16" cy="16" r="7" fill="#ffffff"/></svg>\`,
                            scaledSize: new google.maps.Size(32, 32),
                            anchor: new google.maps.Point(16, 16)
                        },
                        animation: google.maps.Animation.DROP
                    });
                    
                    const infoWindow = new google.maps.InfoWindow({
                        content: \`
                            <div style="padding: 16px; text-align: center; min-width: 200px;">
                                <h3 style="margin: 0 0 8px 0; color: #1d1d1f; font-size: 16px; font-weight: 600;">\${venue.name}</h3>
                                <p style="margin: 0 0 8px 0; color: #86868b; font-size: 14px;">\${venue.description}</p>
                                <span style="background: \${color}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">\${venue.category}</span>
                            </div>
                        \`
                    });
                    
                    marker.addListener("click", () => {
                        infoWindow.open(map, marker);
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'VENUE_SELECTED',
                            venue: venue
                        }));
                    });
                });
                
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'MAP_READY'
                }));
                
                google.maps.event.addListenerOnce(map, 'tilesloaded', function() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'MAP_LOADED'
                    }));
                });
            }
            
            // Handle messages from React Native
            document.addEventListener('message', function(event) {
                const message = JSON.parse(event.data);
                handleMessage(message);
            });
            
            window.addEventListener('message', function(event) {
                const message = JSON.parse(event.data);
                handleMessage(message);
            });
            
            function handleMessage(message) {
                switch (message.type) {
                    case 'UPDATE_USER_LOCATION':
                        updateUserLocation(message.location);
                        break;
                    case 'CENTER_ON_USER':
                        centerOnUser(message.location);
                        break;
                    case 'SELECT_VENUE':
                        selectVenue(message.venue);
                        break;
                    case 'START_NAVIGATION':
                        startNavigation(message.destination);
                        break;
                    case 'STOP_NAVIGATION':
                        stopNavigation();
                        break;
                }
            }
            
            function updateUserLocation(location) {
                userLocation = location;
                
                if (userMarker) {
                    userMarker.setMap(null);
                }
                
                userMarker = new google.maps.Marker({
                    position: { lat: location.lat, lng: location.lng },
                    map: map,
                    title: "Your Location",
                    icon: {
                        url: 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="#007aff" stroke="#ffffff" stroke-width="4"/><circle cx="14" cy="14" r="5" fill="#ffffff"/></svg>',
                        scaledSize: new google.maps.Size(28, 28),
                        anchor: new google.maps.Point(14, 14)
                    },
                    zIndex: 1000
                });
            }
            
            function centerOnUser(location) {
                if (map && location) {
                    map.setCenter({ lat: location.lat, lng: location.lng });
                    map.setZoom(18);
                }
            }
            
            function selectVenue(venue) {
                if (map && venue) {
                    map.setCenter({ 
                        lat: venue.coordinates.latitude, 
                        lng: venue.coordinates.longitude 
                    });
                    map.setZoom(17);
                    
                    if (selectedMarker) {
                        selectedMarker.setMap(null);
                    }
                    
                    const color = venue.category === 'Academic' ? '#007aff' : 
                                 venue.category === 'Administration' ? '#ff9500' :
                                 venue.category === 'Student Services' ? '#34c759' :
                                 venue.category === 'Health Services' ? '#ff3b30' :
                                 venue.category === 'Sports' ? '#af52de' :
                                 venue.category === 'Landmarks' ? '#5856d6' : '#ff9500';
                    
                    selectedMarker = new google.maps.Marker({
                        position: { 
                            lat: venue.coordinates.latitude, 
                            lng: venue.coordinates.longitude 
                        },
                        map: map,
                        title: venue.name,
                        icon: {
                            url: \`data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44"><circle cx="22" cy="22" r="20" fill="\${color}" stroke="#ffffff" stroke-width="4"/><circle cx="22" cy="22" r="10" fill="#ffffff"/></svg>\`,
                            scaledSize: new google.maps.Size(44, 44),
                            anchor: new google.maps.Point(22, 22)
                        },
                        animation: google.maps.Animation.BOUNCE,
                        zIndex: 999
                    });
                    
                    setTimeout(() => {
                        if (selectedMarker) {
                            selectedMarker.setAnimation(null);
                        }
                    }, 2000);
                }
            }

            // Handle messages from React Native
            document.addEventListener('message', function(e) {
                try {
                    const data = JSON.parse(e.data);
                    console.log('🗺️ ENHANCED WEBVIEW - Received message:', data.type);
                    
                    switch (data.type) {
                        case 'SELECT_VENUE':
                            selectVenue(data.venue);
                            break;
                    }
                } catch (error) {
                    console.error('🗺️ ENHANCED WEBVIEW - Error handling message:', error);
                }
            });
            
            // Native Google Maps Navigation
            function startNavigation(destination) {
                console.log('🧭 Starting native navigation to:', destination);
                
                if (!userLocation) {
                    console.log('🧭 No user location available, requesting location first...');
                    
                    // Try to get location first
                    if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition(
                            (position) => {
                                console.log('🧭 Got location, starting navigation...');
                                const location = {
                                    lat: position.coords.latitude,
                                    lng: position.coords.longitude
                                };
                                updateUserLocation(location);
                                
                                // Now start navigation with the location
                                startNavigationWithLocation(destination, location);
                            },
                            (error) => {
                                console.error('🧭 Failed to get location for navigation:', error);
                                window.ReactNativeWebView.postMessage(JSON.stringify({
                                    type: 'NAVIGATION_ERROR',
                                    error: 'Unable to get your location. Please enable location services and try again.'
                                }));
                            },
                            {
                                enableHighAccuracy: true,
                                timeout: 10000,
                                maximumAge: 60000
                            }
                        );
                    } else {
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'NAVIGATION_ERROR',
                            error: 'Location services not available'
                        }));
                    }
                    return;
                }
                
                // Use existing location
                startNavigationWithLocation(destination, userLocation);
            }
            
            function startNavigationWithLocation(destination, location) {
                console.log('🧭 Starting navigation with location:', location);
                
                isNavigating = true;
                
                const request = {
                    origin: { lat: location.lat, lng: location.lng },
                    destination: { lat: destination.lat, lng: destination.lng },
                    travelMode: google.maps.TravelMode.WALKING,
                    unitSystem: google.maps.UnitSystem.METRIC
                };
                
                directionsService.route(request, (result, status) => {
                    if (status === 'OK') {
                        console.log('🧭 Route calculated, showing native directions');
                        
                        // Display route on map with Google's native styling
                        directionsRenderer.setDirections(result);
                        
                        // Focus on the route
                        const bounds = result.routes[0].bounds;
                        map.fitBounds(bounds);
                        
                        // Notify React Native that navigation started
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'NAVIGATION_STARTED',
                            route: {
                                distance: result.routes[0].legs[0].distance.text,
                                duration: result.routes[0].legs[0].duration.text,
                                steps: result.routes[0].legs[0].steps.length
                            }
                        }));
                        
                    } else {
                        console.error('🧭 Navigation failed:', status);
                        isNavigating = false;
                        window.ReactNativeWebView.postMessage(JSON.stringify({
                            type: 'NAVIGATION_ERROR',
                            error: 'Failed to calculate route: ' + status
                        }));
                    }
                });
            }
            
            function stopNavigation() {
                console.log('🧭 Stopping navigation');
                
                isNavigating = false;
                
                // Clear the route display
                directionsRenderer.setDirections({routes: []});
                
                // Reset map view
                if (userLocation) {
                    map.setCenter({ lat: userLocation.lat, lng: userLocation.lng });
                    map.setZoom(16);
                }
                
                // Notify React Native
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'NAVIGATION_STOPPED'
                }));
            }
            
            // Automatically request user location
            function requestUserLocation() {
                console.log('🧭 Requesting user location...');
                
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            console.log('🧭 Got user location:', position.coords.latitude, position.coords.longitude);
                            const location = {
                                lat: position.coords.latitude,
                                lng: position.coords.longitude
                            };
                            updateUserLocation(location);
                            
                            // Center map on user location
                            map.setCenter(location);
                            map.setZoom(16);
                        },
                        (error) => {
                            console.error('🧭 Location request failed:', error);
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'LOCATION_ERROR',
                                error: 'Failed to get location: ' + error.message
                            }));
                        },
                        {
                            enableHighAccuracy: true,
                            timeout: 10000,
                            maximumAge: 60000
                        }
                    );
                } else {
                    console.error('🧭 Geolocation not supported');
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                        type: 'LOCATION_ERROR',
                        error: 'Geolocation not supported by this browser'
                    }));
                }
            }

            window.onerror = function(msg, url, lineNo, columnNo, error) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'MAP_ERROR',
                    error: msg + ' at ' + url + ':' + lineNo + ':' + columnNo
                }));
                return false;
            };
        </script>
        <script async defer
            src="https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap">
        </script>
    </body>
    </html>
    `;
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => {
    try {
      console.log('🔍 ENHANCED MAP - Rendering search result:', item?.name);
      
      // Validate item data to prevent crashes
      if (!item || !item.name || !item.category) {
        console.warn('🔍 ENHANCED MAP - Invalid search result item:', item);
        return null;
      }

      return (
    <TouchableOpacity
      style={[
        styles.searchResultItem, 
            { backgroundColor: '#FFFFFF' } // Use solid color to avoid theme crashes
          ]}
          onPress={() => {
            console.log('🔍 ENHANCED MAP - Search result selected:', item.name);
            try {
              selectVenue(item);
            } catch (error) {
              console.error('🔍 ENHANCED MAP - Error selecting venue:', error);
            }
          }}
      activeOpacity={0.7}
    >
          <View style={[styles.resultIcon, { backgroundColor: getCategoryColor(item.category || 'Facilities') }]}>
        <Ionicons 
              name={getCategoryIcon(item.category || 'Facilities') as any} 
          size={18} 
          color="#ffffff" 
        />
      </View>
      <View style={styles.resultContent}>
            <Text style={[styles.resultName, { color: '#000000' }]}>
              {item.name || 'Unknown Location'}
        </Text>
            <Text style={[styles.resultDescription, { color: '#666666' }]}>
              {item.description || 'No description available'}
        </Text>
        <View style={styles.resultMeta}>
              <Text style={[styles.resultCategory, { color: getCategoryColor(item.category || 'Facilities') }]}>
                {item.category || 'Unknown'}
          </Text>
              {item.source === 'places_api' && (
                <Text style={styles.sourceIndicator}>📍 Google</Text>
              )}
              {item.rating && typeof item.rating === 'number' && (
                <Text style={styles.ratingIndicator}>⭐ {item.rating.toFixed(1)}</Text>
              )}
        </View>
            {item.source === 'places_api' && item.address && (
              <Text style={[styles.resultAddress, { color: '#666666' }]}>
                {item.address}
              </Text>
            )}
      </View>
      <TouchableOpacity
            style={[styles.favoriteButton, { backgroundColor: '#f0f0f0' }]}
            onPress={() => {
              try {
                toggleFavorite(item.id);
              } catch (error) {
                console.error('🔍 ENHANCED MAP - Error toggling favorite:', error);
              }
            }}
        activeOpacity={0.7}
      >
        <Ionicons
          name={state.favorites.includes(item.id) ? 'heart' : 'heart-outline'}
          size={16}
              color={state.favorites.includes(item.id) ? '#FF3B30' : '#666666'}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
    } catch (error) {
      console.error('🔍 ENHANCED MAP - Error rendering search result:', error);
      return (
        <View style={styles.searchResultItem}>
          <Text style={styles.resultName}>Error loading result</Text>
        </View>
      );
    }
  };

  const renderCategoryFilter = ({ item }: { item: typeof VENUE_CATEGORIES[0] }) => (
    <TouchableOpacity
      style={[
        styles.categoryChip,
        {
          backgroundColor: state.selectedCategory === item.id ? item.color : theme.card,
          borderColor: item.color,
        }
      ]}
      onPress={() => toggleCategory(item.id)}
      activeOpacity={0.7}
    >
      <Ionicons
        name={item.icon as any}
        size={16}
        color={state.selectedCategory === item.id ? '#ffffff' : item.color}
      />
      <Text
        style={[
          styles.categoryChipText,
          {
            color: state.selectedCategory === item.id ? '#ffffff' : item.color,
            fontSize: fontSizes.caption,
          }
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

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

  try {
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />
      
      {/* Map Container */}
      <Animated.View 
        style={[
          styles.mapContainer,
          {
            transform: [{ scale: mapScale }],
          }
        ]}
      >
        <WebView
          ref={webViewRef}
          source={{ html: createEnhancedMapHTML() }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          geolocationEnabled={true}
          allowsInlineMediaPlayback={true}
          mediaPlaybackRequiresUserAction={false}
          originWhitelist={['*']}
          mixedContentMode="compatibility"
          onMessage={handleWebViewMessage}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('🗺️ ENHANCED MAP - WebView error:', nativeEvent);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('🗺️ ENHANCED MAP - WebView HTTP error:', nativeEvent);
          }}
        />
      </Animated.View>

      {/* Header with Search */}
      {state.searchInterfaceVisible && (
        <PanGestureHandler
          onGestureEvent={onGestureEvent}
          onHandlerStateChange={onHandlerStateChange}
          minDeltaY={20}
        >
          <Animated.View 
            style={[
              styles.header,
              {
                transform: [
                  { translateY: headerSlide },
                  { 
                    scaleY: searchInterfaceHeight.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    })
                  }
                ],
                backgroundColor: theme.card,
              }
            ]}
          >
          <BlurView intensity={80} style={styles.headerBlur}>
            <LinearGradient
              colors={[theme.card + 'F0', theme.card + 'E0']}
              style={styles.headerGradient}
            >
              {/* Enhanced Header Controls */}
              <View style={styles.headerControls}>
                <View style={styles.headerTitle}>
                  <Text style={[styles.headerTitleText, { color: theme.text }]}>
                    Campus Map
                  </Text>
                  <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                    {filteredVenues.length} locations • {state.selectedCategory || 'All categories'}
                  </Text>
                </View>
                
                <View style={styles.headerActionButtons}>
                  <TouchableOpacity
                    style={[styles.collapseButton, { backgroundColor: theme.surface }]}
                    onPress={collapseSearchInterface}
                    activeOpacity={0.7}
                  >
                    <Ionicons 
                      name={state.searchInterfaceExpanded ? "chevron-up" : "chevron-down"} 
                      size={18} 
                      color={theme.textSecondary} 
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.hideButton, { backgroundColor: theme.surface }]}
                    onPress={toggleSearchInterface}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={18} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Search Interface Content */}
              {state.searchInterfaceExpanded ? (
                <Animated.View style={[styles.searchContainer, { opacity: searchInterfaceHeight }]}>
                  <Animated.View style={[
                    styles.searchBox, 
                    { 
                      backgroundColor: theme.surface, 
                      borderWidth: 0,
                      borderColor: 'transparent',
                      shadowColor: isDark ? '#000' : '#000',
                      transform: [{
                        scale: searchBoxFocus.interpolate({
                          inputRange: [0, 1],
                          outputRange: [1, 1.02],
                        })
                      }]
                    }
                  ]}>
                    <Ionicons name="search" size={22} color={theme.textSecondary} style={styles.searchIcon} />
                    <TextInput
                      style={[styles.searchInput, { color: theme.text, fontSize: 16 }]}
                      placeholder="Search campus locations..."
                      placeholderTextColor="#666666"
                      value={state.searchQuery}
                      onChangeText={(text) => setState(prev => ({ ...prev, searchQuery: text }))}
                      autoCorrect={false}
                      autoCapitalize="none"
                      selectionColor={theme.primary}
                      returnKeyType="search"
                      onFocus={() => {
                        if (Platform.OS === 'ios') {
                          Haptics.selectionAsync();
                        }
                        Animated.timing(searchBoxFocus, {
                          toValue: 1,
                          duration: 200,
                          useNativeDriver: false,
                        }).start();
                      }}
                      onBlur={() => {
                        Animated.timing(searchBoxFocus, {
                          toValue: 0,
                          duration: 200,
                          useNativeDriver: false,
                        }).start();
                      }}
                    />
                    {state.searchQuery.length > 0 && (
                      <TouchableOpacity 
                        onPress={() => setState(prev => ({ ...prev, searchQuery: '' }))} 
                        style={[styles.clearButton, { backgroundColor: theme.textSecondary + '20' }]}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </Animated.View>

                  {/* Category Filters - Only show when no search results */}
                  {!state.showSearch && (
                    <Animated.View style={{ opacity: categoryFiltersOpacity }}>
                      <FlatList
                        data={VENUE_CATEGORIES}
                        renderItem={renderCategoryFilter}
                        keyExtractor={(item) => item.id}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.categoryFilter}
                        contentContainerStyle={styles.categoryFilterContent}
                      />
                    </Animated.View>
                  )}
                </Animated.View>
              ) : (
                // Collapsed state - elegant minimal interface
                <Animated.View 
                  style={[
                    styles.collapsedContainer,
                    {
                      transform: [{ scale: collapsedStateScale }],
                    }
                  ]}
                >
                  <TouchableOpacity 
                    style={[
                      styles.collapsedSearchBox, 
                      { 
                        backgroundColor: theme.surface,
                        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                      }
                    ]}
                    onPress={collapseSearchInterface}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.collapsedSearchIcon, { backgroundColor: theme.primary + '20' }]}>
                      <Ionicons name="search" size={16} color={theme.primary} />
                    </View>
                    <View style={styles.collapsedContent}>
                      <Text style={[styles.collapsedTitle, { color: theme.text, fontSize: fontSizes.medium }]}>
                        Search Campus
                      </Text>
                      <Text style={[styles.collapsedSubtitle, { color: theme.textSecondary, fontSize: fontSizes.small }]}>
                        Tap to explore {filteredVenues.length} locations
                      </Text>
                    </View>
                    <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
                  </TouchableOpacity>
                  
                  {/* Quick category access in collapsed state */}
                  <View style={styles.collapsedCategories}>
                    {VENUE_CATEGORIES.slice(1, 5).map((category) => (
                      <TouchableOpacity
                        key={category.id}
                        style={[
                          styles.collapsedCategoryChip,
                          {
                            backgroundColor: state.selectedCategory === category.id 
                              ? category.color + '20' 
                              : theme.surface,
                            borderColor: state.selectedCategory === category.id 
                              ? category.color 
                              : theme.border,
                          }
                        ]}
                        onPress={() => toggleCategory(category.id)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={category.icon as any}
                          size={14}
                          color={state.selectedCategory === category.id ? category.color : theme.textSecondary}
                        />
                        <Text
                          style={[
                            styles.collapsedCategoryText,
                            {
                              color: state.selectedCategory === category.id ? category.color : theme.textSecondary,
                              fontSize: fontSizes.caption,
                            }
                          ]}
                        >
                          {category.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Animated.View>
              )}
            </LinearGradient>
          </BlurView>
          </Animated.View>
        </PanGestureHandler>
      )}

      {/* Enhanced Floating Search Button - Only show when search interface is hidden */}
      {!state.searchInterfaceVisible && (
        <Animated.View 
          style={[
            styles.floatingSearchButton,
            {
              backgroundColor: theme.primary,
              transform: [{ scale: fabScale }],
            }
          ]}
        >
          <TouchableOpacity
            onPress={toggleSearchInterface}
            style={styles.floatingSearchButtonInner}
            activeOpacity={0.8}
          >
            <View style={styles.searchButtonContent}>
              <Ionicons name="search" size={20} color="#ffffff" />
              <Text style={styles.searchButtonText}>Search</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Search Results */}
      {state.showSearch && state.searchInterfaceVisible && state.searchInterfaceExpanded && (
        <Animated.View 
          style={[
            styles.searchResults, 
            { 
              opacity: searchOpacity,
              backgroundColor: theme.card + 'F8',
              top: Platform.OS === 'ios' ? 240 : 210, // More space to prevent overlap
              marginTop: 10, // Additional spacing buffer
            }
          ]}
        >
          <BlurView intensity={100} style={styles.searchResultsBlur}>
            {/* Loading state for fluid feedback */}
            {searchLoading && (
              <View style={[styles.loadingContainer, { backgroundColor: theme.card }]}>
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.loadingText, { color: theme.text }]}>
                    Searching campus...
                  </Text>
                </View>
              </View>
            )}
            
            {/* Search results */}
            {!searchLoading && (state.searchResults || []).length > 0 && (
              <FlatList
                data={state.searchResults || []}
                renderItem={renderSearchResult}
                keyExtractor={(item, index) => {
                  try {
                    return item?.id || `result-${index}`;
                  } catch (error) {
                    console.error('🔍 ENHANCED MAP - Key extraction error:', error);
                    return `error-${index}`;
                  }
                }}
                showsVerticalScrollIndicator={false}
                style={styles.resultsList}
                onError={(error) => {
                  console.error('🔍 ENHANCED MAP - FlatList error:', error);
                }}
                removeClippedSubviews={false}
                initialNumToRender={8}
                maxToRenderPerBatch={8}
                windowSize={10}
              />
            )}
            
            {/* No results state */}
            {!searchLoading && state.searchQuery.length > 2 && (state.searchResults || []).length === 0 && (
              <View style={[styles.noResultsContainer, { backgroundColor: theme.card }]}>
                <Ionicons name="search-outline" size={24} color={theme.textSecondary} />
                <Text style={[styles.noResultsText, { color: theme.textSecondary }]}>
                  No results for "{state.searchQuery}"
                </Text>
                <Text style={[styles.noResultsSubtext, { color: theme.textSecondary }]}>
                  Try different keywords
                </Text>
              </View>
            )}
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

        <TouchableOpacity 
          style={[styles.fab, styles.filterFab, { backgroundColor: theme.card }]} 
          onPress={() => setState(prev => ({ ...prev, showFilters: !prev.showFilters }))}
          activeOpacity={0.8}
        >
          <Ionicons name="options" size={24} color={theme.primary} />
        </TouchableOpacity>
      </Animated.View>

      {/* Enhanced Status Indicators */}
      {!state.searchInterfaceVisible && (
        <Animated.View 
          style={[
            styles.topIndicators,
            {
              opacity: topIndicatorsOpacity,
            }
          ]}
        >
          <TouchableOpacity 
            style={[styles.statusBadge, { backgroundColor: theme.card + 'F0' }]}
            onPress={() => {
              if (Platform.OS === 'ios') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              console.log('🗺️ Enhanced Map Status - Map ready:', state.mapReady, 'Venues loaded:', filteredVenues.length);
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={14} color="#30D158" />
            <Text style={[styles.statusText, { fontSize: fontSizes.caption }]}>
              {filteredVenues.length} venues
            </Text>
          </TouchableOpacity>

          {state.selectedCategory && (
            <TouchableOpacity 
              style={[styles.categoryBadge, { backgroundColor: getCategoryColor(state.selectedCategory) + '20' }]}
              onPress={() => setState(prev => ({ ...prev, selectedCategory: null }))}
              activeOpacity={0.8}
            >
              <Text style={[styles.categoryBadgeText, { color: getCategoryColor(state.selectedCategory), fontSize: fontSizes.caption }]}>
                {state.selectedCategory}
              </Text>
              <Ionicons name="close" size={12} color={getCategoryColor(state.selectedCategory)} />
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {/* Enhanced Loading Preloader */}
      <MapPreloader 
        isVisible={!state.mapReady} 
        onComplete={() => console.log('🗺️ Map preloader animation completed')}
      />

      {/* Enhanced Navigation Header - Google Maps Style */}
      <NavigationHeader
        isVisible={state.isNavigating && !state.showNavigationSheet}
        onClose={() => {
          stopNavigation();
        }}
      />



      {/* Venue Bottom Sheet */}
      <VenueBottomSheet
        venue={state.selectedVenue}
        userLocation={state.userLocation}
        onClose={() => setState(prev => ({ ...prev, selectedVenue: null }))}
        onNavigate={getVenueNavigation}
        onToggleFavorite={toggleFavorite}
        isFavorite={state.selectedVenue ? state.favorites.includes(state.selectedVenue.id) : false}
      />

      {/* Navigation Bottom Sheet */}
      <NavigationBottomSheet
        isVisible={state.showNavigationSheet}
        destination={state.navigationDestination}
        route={state.navigationRoute}
        onClose={handleNavigationClose}
        onStart={handleNavigationStart}
        onSave={() => {
          // Handle save route functionality
          console.log('🔖 ENHANCED MAP - Save route requested');
        }}
      />
    </SafeAreaView>
  );
  } catch (error) {
    console.error('🔍 ENHANCED MAP - Render error:', error);
    setState(prev => ({ ...prev, hasError: true }));
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: '#f8f9fa' }]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Map crashed. Tap to reload.</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => setState(prev => ({ ...prev, hasError: false }))}
          >
            <Text style={styles.errorButtonText}>Reload Map</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    borderRadius: 0,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    width,
    height,
  },
  header: {
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
  headerBlur: {
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    overflow: 'hidden',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    flex: 1,
  },
  headerTitleText: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.7,
  },
  headerActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  collapseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hideButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flex: 1,
    paddingHorizontal: 2, // Slight container padding for better visual balance
  },
  searchBox: {
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 0,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 54,
  },
  collapsedContainer: {
    gap: 14,
  },
  collapsedSearchBox: {
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
    gap: 14,
    borderWidth: 1,
  },
  collapsedSearchIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedContent: {
    flex: 1,
  },
  collapsedTitle: {
    fontWeight: '600',
    marginBottom: 2,
  },
  collapsedSubtitle: {
    fontWeight: '500',
    opacity: 0.8,
  },
  collapsedCategories: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  collapsedCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 6,
    minWidth: 70,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  collapsedCategoryText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  searchIcon: {
    marginRight: 14,
  },
  searchInput: {
    flex: 1,
    fontWeight: '400',
    fontSize: 16,
    paddingVertical: 6,
    borderWidth: 0,
    outline: 'none', // For web platforms
    lineHeight: 20,
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  categoryFilter: {
    height: 44,
    marginTop: 4,
  },
  categoryFilterContent: {
    paddingRight: 20,
    paddingLeft: 4,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1.5,
  },
  categoryChipText: {
    marginLeft: 6,
    fontWeight: '600',
  },
  searchResults: {
    position: 'absolute',
    left: 20,
    right: 20,
    maxHeight: height * 0.35,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 998,
  },
  searchResultsBlur: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  resultsList: {
    padding: 8,
    paddingTop: 12, // Extra top padding for visual separation
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginVertical: 2,
  },
  resultIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultName: {
    fontWeight: '600',
    marginBottom: 2,
    fontSize: 16,
  },
  resultDescription: {
    marginBottom: 4,
    fontSize: 14,
    lineHeight: 18,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  resultCategory: {
    fontWeight: '600',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  sourceIndicator: {
    fontSize: 10,
    color: '#007AFF',
    fontWeight: '500',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingIndicator: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: '600',
  },
  resultAddress: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
    lineHeight: 14,
  },
  favoriteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  floatingButtons: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 140 : 120,
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
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  locationFab: {},
  filterFab: {},
  topIndicators: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 999,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontWeight: '600',
    color: '#30D158',
    marginLeft: 6,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  categoryBadgeText: {
    fontWeight: '600',
  },
  floatingSearchButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    height: 48,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 999,
  },
  floatingSearchButtonInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    paddingHorizontal: 16,
  },
  searchButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  fabSpinner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderTopColor: 'transparent',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  errorText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Fluid search states
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  navigationHeader: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 80,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  navigationHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
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
  navigationOptions: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationStopButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  stopButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 6,
  },
  stopButtonText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  noResultsContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 120,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  noResultsSubtext: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default EnhancedMapScreen;
