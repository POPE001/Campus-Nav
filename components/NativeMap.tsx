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
import { OAU_VENUES, Venue, searchVenues, getVenueById } from '@/constants/Venues';

interface NativeMapProps {
  navigationParams?: any;
}

// Using the existing Venue interface from constants
interface SearchResult extends Venue {}

const NativeMap: React.FC<NativeMapProps> = ({ navigationParams }) => {
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const [mapReady, setMapReady] = useState(false);
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
  }, []);

  useEffect(() => {
    if (searchQuery.length > 1) {
      handleSearch();
      setShowSearch(true);
      Animated.timing(searchOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      setShowSearch(false);
      Animated.timing(searchOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
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
          timeout: 10000,
        });
        console.log('🗺️ LOCATION - Got location:', {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
        setUserLocation(location);
      } else {
        console.log('🗺️ LOCATION - Permission denied:', status);
      }
    } catch (error) {
      console.error('🗺️ LOCATION ERROR:', error);
    }
  };

  const handleSearch = () => {
    const results = searchVenues(searchQuery).slice(0, 6);
    setSearchResults(results);
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
    if (!userLocation) {
      Alert.alert('Location Required', 'Please enable location services to get directions.');
      return;
    }

    const userLat = userLocation.coords.latitude;
    const userLng = userLocation.coords.longitude;
    const venueLat = venue.coordinates.latitude;
    const venueLng = venue.coordinates.longitude;

    // Calculate distance (simple Haversine formula approximation)
    const distance = calculateDistance(userLat, userLng, venueLat, venueLng);
    const walkingTime = Math.round(distance * 12); // Rough estimate: 12 minutes per km

    Alert.alert(
      `Navigate to ${venue.name}`,
      `Distance: ${distance.toFixed(2)} km\nEstimated walking time: ${walkingTime} minutes\n\nWould you like to get directions?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Get Directions', 
          onPress: () => openExternalMap(venue) 
        }
      ]
    );
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
    const scheme = Platform.select({
      ios: 'maps:0,0?q=',
      android: 'geo:0,0?q=',
    });
    const latLng = `${venue.coordinates.latitude},${venue.coordinates.longitude}`;
    const label = venue.name;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });

    if (url) {
      import('expo-linking').then(Linking => {
        Linking.openURL(url);
      });
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

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity
      style={styles.searchResultItem}
      onPress={() => selectVenue(item)}
    >
      <View style={[styles.resultIcon, { backgroundColor: getCategoryColor(item.category) }]}>
        <Ionicons 
          name={getCategoryIcon(item.category) as any} 
          size={16} 
          color="#ffffff" 
        />
      </View>
      <View style={styles.resultContent}>
        <Text style={styles.resultName}>{item.name}</Text>
        <Text style={styles.resultDescription}>{item.description}</Text>
      </View>
    </TouchableOpacity>
  );

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
          console.error('🗺️ MAP ERROR:', error);
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
        {/* Campus venue markers */}
        {OAU_VENUES.map((venue) => (
          <Marker
            key={venue.id}
            coordinate={venue.coordinates}
            title={venue.name}
            description={venue.description}
            pinColor={getCategoryColor(venue.category)}
            onPress={() => setSelectedVenue(venue)}
          />
        ))}
        
        {/* Selected venue marker (larger) */}
        {selectedVenue && (
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
              data={searchResults}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              style={styles.resultsList}
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

      {/* Venue Info Panel */}
      {selectedVenue && (
        <View style={styles.venuePanel}>
          <View style={styles.venuePanelHeader}>
            <View>
              <Text style={styles.venueTitle}>{selectedVenue.name}</Text>
              <Text style={styles.venueDescription}>{selectedVenue.description}</Text>
              <Text style={styles.venueCategory}>{selectedVenue.category}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setSelectedVenue(null)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={20} color="#86868b" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={() => getVenueNavigation(selectedVenue)}
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
    </View>
  );
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
  resultName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1d1d1f',
    marginBottom: 2,
  },
  resultDescription: {
    fontSize: 13,
    color: '#86868b',
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
});

export default NativeMap;
