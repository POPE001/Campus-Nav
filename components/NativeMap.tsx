import React, { useState, useEffect, useRef } from 'react';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT, Region, LatLng } from 'react-native-maps';
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
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { Venue } from '@/constants/Venues';
import { smartSearchService } from '@/lib/smartSearchService';
import { CampusLocation } from '@/lib/placesService';
import { navigationService, NavigationRoute, TravelMode } from '@/lib/navigationService';
import NavigationOverlay from './NavigationOverlay';
import RoutePolyline from './RoutePolyline';

interface NativeMapProps {
  navigationParams?: any;
}

// Using the enhanced search result interface
interface SearchResult extends CampusLocation {}

const NativeMap: React.FC<NativeMapProps> = ({ navigationParams }) => {
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<CampusLocation[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentRoute, setCurrentRoute] = useState<NavigationRoute | null>(null);
  const [navigationDestination, setNavigationDestination] = useState<CampusLocation | null>(null);
  const [hasError, setHasError] = useState(false);
  const [region, setRegion] = useState<Region>({
    latitude: 7.5181,
    longitude: 4.5284,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });

  // Debug logging  
  console.log('🗺️ MAP DEBUG - Native Map Info:', {
    provider: 'GOOGLE',
    mapReady,
    region: `${region.latitude.toFixed(4)}, ${region.longitude.toFixed(4)}`
  });

  const mapRef = useRef<MapView>(null);
  const searchOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    requestLocationPermission();
    loadNearbyPlaces(); // Load nearby places when map initializes
  }, []);

  const loadNearbyPlaces = async () => {
    if (loadingNearby) return;
    
    setLoadingNearby(true);
    try {
      console.log('🗺️ NATIVE MAP - Loading nearby campus places...');
      
      // Search for general campus locations
      const campusResult = await smartSearchService.searchCampus('OAU campus university', {
        maxResults: 20,
      });
      
      console.log('🗺️ NATIVE MAP - Search completed:', {
        resultsFound: campusResult.results.length,
        searchTime: campusResult.searchTime,
        source: campusResult.source
      });
      
      if (campusResult.results.length > 0) {
        console.log('🗺️ NATIVE MAP - First few results:', campusResult.results.slice(0, 3).map(r => r.name));
      }
      
      // Add a test venue if no results found
      let finalResults = campusResult.results;
      if (finalResults.length === 0) {
        console.log('🗺️ NATIVE MAP - No results from API, adding test venue');
        const testVenue = {
          id: 'test-oau-main',
          name: 'OAU Main Campus (Test)',
          building: 'Test Location',
          type: 'landmarks' as const,
          category: 'Landmarks',
          coordinates: { latitude: 7.5181, longitude: 4.5284 },
          description: 'Test venue for debugging',
          keywords: ['test', 'oau'],
          source: 'static' as const,
        };
        finalResults = [testVenue];
      }
      
      setNearbyPlaces(finalResults);
      console.log('🗺️ NATIVE MAP - Loaded', finalResults.length, 'nearby places successfully');
    } catch (error) {
      console.error('🗺️ NATIVE MAP - Error loading nearby places:', error);
      console.error('🗺️ NATIVE MAP - Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack
      });
      setNearbyPlaces([]);
    } finally {
      setLoadingNearby(false);
      console.log('🗺️ NATIVE MAP - Finished loading nearby places');
    }
  };

  useEffect(() => {
    try {
      if (searchQuery && searchQuery.length > 1) {
        console.log('🔍 NATIVE MAP - Search query changed:', searchQuery);
        handleSearch();
        setShowSearch(true);
        Animated.timing(searchOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }).start();
      } else {
        setShowSearch(false);
        setSearchResults([]); // Clear results when search is cleared
        Animated.timing(searchOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      console.error('🔍 NATIVE MAP - Search useEffect error:', error);
      setHasError(true);
    }
  }, [searchQuery]);

  const requestLocationPermission = async () => {
    try {
      console.log('🗺️ LOCATION - Requesting permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('🗺️ LOCATION - Permission status:', status);
      
      if (status === 'granted') {
        console.log('🗺️ LOCATION - Getting current position...');
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeout: 15000,
        });
        console.log('🗺️ LOCATION - Got location successfully:', {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          timestamp: new Date(location.timestamp).toLocaleTimeString(),
        });
        setUserLocation(location);
        
        // Show success feedback
        console.log('🗺️ LOCATION - User location set, navigation should now work!');
      } else {
        console.log('🗺️ LOCATION - Permission denied:', status);
        Alert.alert(
          'Location Permission Required',
          'This app needs location access to provide directions. Please go to Settings and enable location permissions.',
          [
            { text: 'OK', style: 'default' },
            {
              text: 'Open Settings',
              onPress: () => {
                import('expo-linking').then(Linking => {
                  Linking.default.openSettings();
                });
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('🗺️ LOCATION ERROR - Full error:', error);
      Alert.alert(
        'Location Error',
        'Could not get your location. Please check that location services are enabled and try again.\n\nError: ' + (error as Error).message,
        [
          { text: 'OK', style: 'default' },
          {
            text: 'Retry',
            onPress: () => requestLocationPermission()
          }
        ]
      );
    }
  };

  const handleSearch = async () => {
    if (searchQuery.trim().length === 0) {
      setSearchResults([]);
      return;
    }

    try {
      console.log('🔍 NATIVE MAP - Searching for:', searchQuery);
      const searchResult = await smartSearchService.searchCampus(searchQuery, {
        maxResults: 8,
      });
      
      console.log('🔍 NATIVE MAP - Found results:', searchResult.results.length, 'from', searchResult.source);
      
      // Safely set search results with validation
      if (searchResult && searchResult.results && Array.isArray(searchResult.results)) {
        const validResults = searchResult.results.filter(result => 
          result && 
          result.id && 
          result.name && 
          result.coordinates &&
          typeof result.coordinates.latitude === 'number' &&
          typeof result.coordinates.longitude === 'number'
        );
        
        console.log('🔍 NATIVE MAP - Valid results after filtering:', validResults.length);
        setSearchResults(validResults.slice(0, 6));
      } else {
        console.warn('🔍 NATIVE MAP - Invalid search result structure');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('🔍 NATIVE MAP - Search error:', error);
      console.error('🔍 NATIVE MAP - Error details:', {
        message: (error as Error).message,
        stack: (error as Error).stack?.split('\n').slice(0, 5).join('\n')
      });
      setSearchResults([]);
    }
  };

  const selectVenue = (venue: any) => {
    setSelectedVenue(venue);
    setSearchQuery(venue.name);
    setShowSearch(false);
    
    // Animate to venue location
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: venue.coordinates.latitude,
        longitude: venue.coordinates.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    }
  };

  const centerOnUserLocation = async () => {
    console.log('🗺️ LOCATION - Center button pressed, userLocation:', !!userLocation);
    
    if (userLocation && mapRef.current) {
      console.log('🗺️ LOCATION - Centering on existing location');
      mapRef.current.animateToRegion({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      }, 1000);
    } else {
      console.log('🗺️ LOCATION - No location available, requesting fresh location');
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        console.log('🗺️ LOCATION - Fresh permission status:', status);
        
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
            timeout: 15000,
          });
          console.log('🗺️ LOCATION - Got fresh location');
          setUserLocation(location);
          
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }, 1000);
          }
        } else {
          Alert.alert('Location Permission Required', 'Please enable location services in your device settings to use this feature.');
        }
      } catch (error) {
        console.error('🗺️ LOCATION - Fresh location error:', error);
        Alert.alert('Location Error', 'Could not get your current location. Please try again.');
      }
    }
  };

  const getVenueNavigation = (venue: any) => {
    console.log('🧭 NATIVE MAP - Get Directions clicked for:', venue?.name);
    console.log('🧭 NATIVE MAP - User location available:', !!userLocation);
    
    if (!venue) {
      console.error('🧭 NATIVE MAP - No venue provided');
      Alert.alert('Error', 'No destination selected.');
      return;
    }

    if (!userLocation) {
      console.warn('🧭 NATIVE MAP - No user location available');
      Alert.alert(
        'Location Required', 
        'Please enable location services to get directions.\n\nMake sure location permissions are granted.',
        [
          { text: 'OK', style: 'default' },
          { 
            text: 'Try Again', 
            onPress: () => {
              console.log('🧭 NATIVE MAP - Retrying location request...');
              requestLocationPermission().then(() => {
                if (userLocation) {
                  getVenueNavigation(venue);
                }
              });
            }
          }
        ]
      );
      return;
    }

    try {
      const userLat = userLocation.coords.latitude;
      const userLng = userLocation.coords.longitude;
      const venueLat = venue.coordinates.latitude;
      const venueLng = venue.coordinates.longitude;

      console.log('🧭 NATIVE MAP - User location:', userLat, userLng);
      console.log('🧭 NATIVE MAP - Venue location:', venueLat, venueLng);

      // Calculate distance (simple Haversine formula approximation)
      const distance = calculateDistance(userLat, userLng, venueLat, venueLng);
      const walkingTime = Math.round(distance * 12); // Rough estimate: 12 minutes per km

      console.log('🧭 NATIVE MAP - Distance calculated:', distance, 'km, Walking time:', walkingTime, 'min');

      Alert.alert(
        `Navigate to ${venue.name}`,
        `Distance: ${distance.toFixed(2)} km\nEstimated walking time: ${walkingTime} minutes\n\nChoose navigation option:`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Campus Navigation', 
            onPress: () => {
              console.log('🧭 NATIVE MAP - Starting campus navigation');
              startCampusNavigation(venue, 'walking');
            }
          },
          { 
            text: 'External Maps', 
            onPress: () => {
              console.log('🧭 NATIVE MAP - Opening external maps');
              openExternalMap(venue);
            }
          }
        ]
      );
    } catch (error) {
      console.error('🧭 NATIVE MAP - Error in getVenueNavigation:', error);
      Alert.alert('Error', 'Failed to calculate directions. Please try again.');
    }
  };

  const startCampusNavigation = (destination: CampusLocation, mode: TravelMode = 'walking') => {
    console.log('🧭 NATIVE MAP - Starting campus navigation to:', destination.name);
    
    setNavigationDestination(destination);
    setIsNavigating(true);
    setSelectedVenue(null); // Close venue panel
  };

  const stopCampusNavigation = () => {
    console.log('🧭 NATIVE MAP - Stopping campus navigation');
    
    setIsNavigating(false);
    setCurrentRoute(null);
    setNavigationDestination(null);
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
      console.log('🧭 NATIVE MAP - Opening external map for:', venue.name);
      
      const scheme = Platform.select({
        ios: 'maps:0,0?q=',
        android: 'geo:0,0?q=',
      });
      const latLng = `${venue.coordinates.latitude},${venue.coordinates.longitude}`;
      const label = encodeURIComponent(venue.name);
      const url = Platform.select({
        ios: `${scheme}${label}@${latLng}`,
        android: `${scheme}${latLng}(${label})`,
      });

      console.log('🧭 NATIVE MAP - Generated URL:', url);

      if (url) {
        import('expo-linking')
          .then(Linking => {
            console.log('🧭 NATIVE MAP - Opening URL with Linking...');
            return Linking.default.openURL(url);
          })
          .then(() => {
            console.log('🧭 NATIVE MAP - Successfully opened external map');
          })
          .catch(error => {
            console.error('🧭 NATIVE MAP - Error opening external map:', error);
            Alert.alert('Error', 'Could not open maps application. Please try again.');
          });
      } else {
        console.warn('🧭 NATIVE MAP - No URL generated for external map');
        Alert.alert('Error', 'Unable to generate map URL.');
      }
    } catch (error) {
      console.error('🧭 NATIVE MAP - Error in openExternalMap:', error);
      Alert.alert('Error', 'Failed to open external maps.');
    }
  };

  const getCategoryIcon = (category: string): string => {
    const icons: { [key: string]: string } = {
      'Academic': 'school',
      'Administration': 'business',
      'Student Services': 'people',
      'Health Services': 'medical',
      'Sports': 'fitness',
      'Landmarks': 'location',
      'Facilities': 'building',
    };
    return icons[category] || 'location';
  };

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

  const renderSearchResult = ({ item }: { item: SearchResult }) => {
    try {
      console.log('🔍 NATIVE MAP - Rendering search result:', item?.name);
      
      // Validate item data to prevent crashes
      if (!item || !item.name || !item.category) {
        console.warn('🔍 NATIVE MAP - Invalid search result item:', item);
        return null;
      }

      return (
        <TouchableOpacity
          style={styles.searchResultItem}
          onPress={() => {
            console.log('🔍 NATIVE MAP - Search result selected:', item.name);
            try {
              selectVenue(item);
            } catch (error) {
              console.error('🔍 NATIVE MAP - Error selecting venue:', error);
            }
          }}
        >
          <View style={[styles.resultIcon, { backgroundColor: getCategoryColor(item.category || 'Facilities') }]}>
            <Ionicons 
              name={getCategoryIcon(item.category || 'Facilities') as any} 
              size={16} 
              color="#ffffff" 
            />
          </View>
          <View style={styles.resultContent}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultName}>{item.name || 'Unknown Location'}</Text>
              {item.source === 'places_api' && (
                <View style={styles.sourceIndicator}>
                  <Text style={styles.sourceText}>📍</Text>
                </View>
              )}
            </View>
            <Text style={styles.resultDescription}>{item.description || 'No description available'}</Text>
            {item.source === 'places_api' && item.address && (
              <Text style={styles.resultAddress}>{item.address}</Text>
            )}
            {item.rating && typeof item.rating === 'number' && (
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingText}>⭐ {item.rating.toFixed(1)}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    } catch (error) {
      console.error('🔍 NATIVE MAP - Error rendering search result:', error);
      return (
        <View style={styles.searchResultItem}>
          <Text style={styles.resultName}>Error loading result</Text>
        </View>
      );
    }
  };

  // Error boundary
  if (hasError) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Something went wrong with the map.</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => {
              setHasError(false);
              setSearchResults([]);
              setSelectedVenue(null);
              setShowSearch(false);
            }}
          >
            <Text style={styles.errorButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  try {
    return (
      <View style={styles.container}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        showsUserLocation={!!userLocation}
        showsMyLocationButton={false}
        showsBuildings={true}
        showsPointsOfInterest={true}
        mapType="standard"
        onMapReady={() => {
          console.log('🗺️ MAP DEBUG - Map is ready!');
          setMapReady(true);
        }}
        onError={(error) => {
          console.error('🗺️ MAP ERROR - Full details:', JSON.stringify(error, null, 2));
          console.error('🗺️ MAP ERROR - Error type:', typeof error);
          console.error('🗺️ MAP ERROR - Error message:', error?.message || 'No message');
        }}
        onPress={(event) => {
          console.log('🗺️ MAP DEBUG - Map pressed:', event.nativeEvent);
        }}
        onMapLoaded={() => {
          console.log('🗺️ MAP DEBUG - Map tiles loaded! 🎉');
        }}
        onLoadingStatusChange={(loading) => {
          console.log('🗺️ MAP DEBUG - Loading status changed:', loading);
        }}
        onRegionChangeComplete={setRegion}
      >
        {/* Dynamic campus venue markers */}
        {nearbyPlaces.map((place) => (
          <Marker
            key={place.id}
            coordinate={place.coordinates}
            title={place.name}
            description={place.description}
            pinColor={getCategoryColor(place.category)}
            onPress={() => {
              console.log('🗺️ MARKER PRESSED - Venue selected:', place.name);
              setSelectedVenue(place);
            }}
          />
        ))}
        
        {/* Debug: Show total markers count */}
        {nearbyPlaces.length === 0 && (
          <View style={styles.debugOverlay}>
            <Text style={styles.debugOverlayText}>No markers loaded yet...</Text>
            <Text style={styles.debugOverlayText}>Loading: {loadingNearby ? 'Yes' : 'No'}</Text>
          </View>
        )}
        
        {/* Selected venue marker (larger) */}
        {selectedVenue && !isNavigating && (
          <Marker
            coordinate={selectedVenue.coordinates}
            title={selectedVenue.name}
            description={selectedVenue.description}
          >
            <View style={[styles.selectedMarker, { backgroundColor: getCategoryColor(selectedVenue.category) }]}>
              <Ionicons 
                name={getCategoryIcon(selectedVenue.category) as any} 
                size={20} 
                color="#ffffff" 
              />
            </View>
          </Marker>
        )}

        {/* Navigation Route Polyline */}
        <RoutePolyline 
          route={currentRoute} 
          color="#007AFF" 
          width={5} 
        />

        {/* Navigation Destination Marker */}
        {isNavigating && navigationDestination && (
          <Marker
            coordinate={navigationDestination.coordinates}
            title={navigationDestination.name}
            description="Destination"
          >
            <View style={styles.destinationMarker}>
              <Ionicons name="flag" size={24} color="#FF3B30" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={20} color="#86868b" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search campus locations..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#86868b" />
            </TouchableOpacity>
          )}
        </View>
        
        {/* Search Results */}
        {showSearch && (
          <Animated.View style={[styles.searchResults, { opacity: searchOpacity }]}>
            <FlatList
              data={searchResults || []}
              renderItem={renderSearchResult}
              keyExtractor={(item, index) => {
                try {
                  return item?.id || `result-${index}`;
                } catch (error) {
                  console.error('🔍 NATIVE MAP - Key extraction error:', error);
                  return `error-${index}`;
                }
              }}
              showsVerticalScrollIndicator={false}
              style={styles.resultsList}
              onError={(error) => {
                console.error('🔍 NATIVE MAP - FlatList error:', error);
              }}
              removeClippedSubviews={false}
              initialNumToRender={6}
              maxToRenderPerBatch={6}
              windowSize={10}
            />
          </Animated.View>
        )}
      </View>

      {/* Status Badge */}
      <View style={styles.statusBadge}>
        <Ionicons 
          name="location" 
          size={14} 
          color="#30d158" 
        />
        <Text style={[styles.statusText, { color: "#30d158" }]}>
          OAU Campus
        </Text>
      </View>

      {/* Floating Action Buttons */}
      <View style={styles.floatingButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={centerOnUserLocation}>
          <Ionicons name="locate" size={22} color="#007aff" />
        </TouchableOpacity>
      </View>

      {/* Debug info - Always visible */}
      <View style={styles.debugInfo}>
        <Text style={styles.debugInfoText}>
          📍 Markers: {nearbyPlaces.length} | Selected: {selectedVenue ? selectedVenue.name : 'None'} | Loading: {loadingNearby ? 'Yes' : 'No'}
        </Text>
      </View>

      {/* Venue Info Panel */}
      {selectedVenue && (
        <View style={styles.venuePanel}>
          <View style={styles.venuePanelHeader}>
            <View>
              <Text style={styles.venueTitle}>{selectedVenue.name}</Text>
              <Text style={styles.venueDescription}>{selectedVenue.description}</Text>
              <Text style={styles.venueCategory}>{selectedVenue.category}</Text>
              {/* Debug info */}
              <Text style={styles.debugText}>
                Location: {userLocation ? '✅ Available' : '❌ Not available'}
              </Text>
            </View>
            <TouchableOpacity 
              onPress={() => setSelectedVenue(null)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color="#86868b" />
            </TouchableOpacity>
          </View>
          
          {/* Test button to verify Alert works */}
          <TouchableOpacity
            style={[styles.navigateButton, { backgroundColor: '#FF9500', marginBottom: 8 }]}
            onPress={() => {
              console.log('🧭 NATIVE MAP - Test button pressed!');
              Alert.alert('Test Alert', 'If you can see this, Alert is working correctly!', [
                { text: 'Great!', onPress: () => console.log('Test alert confirmed working') }
              ]);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark" size={18} color="#ffffff" />
            <Text style={styles.navigateButtonText}>Test Alert</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navigateButton}
            onPress={() => {
              console.log('🧭 NATIVE MAP - Get Directions button pressed!');
              console.log('🧭 NATIVE MAP - Selected venue:', selectedVenue?.name);
              getVenueNavigation(selectedVenue);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="navigate" size={18} color="#ffffff" />
            <Text style={styles.navigateButtonText}>Get Directions</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading Indicator */}
      {!mapReady && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading map...</Text>
          <Text style={[styles.loadingText, { fontSize: 12, marginTop: 8 }]}>
            Google Maps Native
          </Text>
        </View>
      )}

      {/* Navigation Overlay */}
      <NavigationOverlay
        isVisible={isNavigating}
        onClose={stopCampusNavigation}
        destination={navigationDestination || undefined}
        travelMode="walking"
      />
    </View>
    );
  } catch (error) {
    console.error('🧭 NATIVE MAP - Render error:', error);
    setHasError(true);
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Map crashed. Tap to reload.</Text>
          <TouchableOpacity 
            style={styles.errorButton}
            onPress={() => setHasError(false)}
          >
            <Text style={styles.errorButtonText}>Reload Map</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
    width,
    height,
  },
  searchContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 16,
    right: 16,
    zIndex: 1001,
    maxWidth: 400,
    alignSelf: 'center',
  },
  searchBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1d1d1f',
    fontWeight: '400',
  },
  clearButton: {
    marginLeft: 8,
  },
  searchResults: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 16,
    marginTop: 8,
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  resultsList: {
    maxHeight: 300,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  resultIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  resultContent: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1d1d1f',
    flex: 1,
  },
  sourceIndicator: {
    marginLeft: 6,
  },
  sourceText: {
    fontSize: 12,
  },
  resultDescription: {
    fontSize: 13,
    color: '#86868b',
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: 12,
    color: '#86868b',
    marginBottom: 4,
    fontStyle: 'italic',
  },
  ratingContainer: {
    marginTop: 2,
  },
  ratingText: {
    fontSize: 12,
    color: '#FF9500',
    fontWeight: '600',
  },
  statusBadge: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#30d158',
    marginLeft: 6,
  },
  floatingButtons: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 120 : 100,
    right: 16,
    gap: 12,
  },
  actionButton: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  selectedMarker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  venuePanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  venuePanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  venueTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1d1d1f',
    marginBottom: 4,
  },
  venueDescription: {
    fontSize: 16,
    color: '#86868b',
    marginBottom: 2,
  },
  venueCategory: {
    fontSize: 14,
    color: '#007aff',
    fontWeight: '500',
  },
  debugText: {
    fontSize: 12,
    color: '#86868b',
    fontWeight: '500',
    marginTop: 4,
  },
  debugOverlay: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 149, 0, 0.9)',
    padding: 12,
    borderRadius: 8,
    zIndex: 1000,
  },
  debugOverlayText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  debugInfo: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 6,
    zIndex: 999,
  },
  debugInfoText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
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
  closeButton: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(142, 142, 147, 0.12)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigateButton: {
    backgroundColor: '#007aff',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  navigateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  loadingText: {
    fontSize: 16,
    color: '#86868b',
    fontWeight: '500',
  },
  destinationMarker: {
    width: 40,
    height: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FF3B30',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default NativeMap;
