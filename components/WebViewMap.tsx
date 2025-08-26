import React, { useState, useEffect, useRef } from 'react';
import { WebView } from 'react-native-webview';
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
import { OAU_VENUES, Venue, searchVenues } from '@/constants/Venues';
import * as Linking from 'expo-linking';

interface WebViewMapProps {
  navigationParams?: any;
}

interface SearchResult extends Venue {}

const WebViewMap: React.FC<WebViewMapProps> = ({ navigationParams }) => {
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [mapReady, setMapReady] = useState(false);
  
  const webViewRef = useRef<WebView>(null);
  const searchOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    console.log('🗺️ WEBVIEW MAP - Component mounted');
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
      console.log('🗺️ WEBVIEW MAP - Requesting location permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('🗺️ WEBVIEW MAP - Permission status:', status);
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,

        });
        console.log('🗺️ WEBVIEW MAP - Got location:', {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
        setUserLocation(location);
        
        // Send location to WebView
        if (webViewRef.current && mapReady) {
          webViewRef.current.postMessage(JSON.stringify({
            type: 'UPDATE_USER_LOCATION',
            location: {
              lat: location.coords.latitude,
              lng: location.coords.longitude,
            }
          }));
        }
      }
    } catch (error) {
      console.error('🗺️ WEBVIEW MAP - Location error:', error);
    }
  };

  const handleSearch = () => {
    const results = searchVenues(searchQuery).slice(0, 6);
    setSearchResults(results);
  };

  const selectVenue = (venue: Venue) => {
    setSelectedVenue(venue);
    setSearchQuery(venue.name);
    setShowSearch(false);
    
    // Send venue selection to WebView
    if (webViewRef.current) {
      webViewRef.current.postMessage(JSON.stringify({
        type: 'SELECT_VENUE',
        venue: venue
      }));
    }
  };

  const centerOnUserLocation = async () => {
    console.log('🗺️ WEBVIEW MAP - Center button pressed, userLocation:', !!userLocation);
    
    if (userLocation && webViewRef.current) {
      console.log('🗺️ WEBVIEW MAP - Centering on existing location');
      webViewRef.current.postMessage(JSON.stringify({
        type: 'CENTER_ON_USER',
        location: {
          lat: userLocation.coords.latitude,
          lng: userLocation.coords.longitude,
        }
      }));
    } else {
      await requestLocationPermission();
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('🗺️ WEBVIEW MAP - Received message:', message);
      
      switch (message.type) {
        case 'MAP_READY':
          console.log('🗺️ WEBVIEW MAP - Map is ready!');
          setMapReady(true);
          break;
        case 'MAP_LOADED':
          console.log('🗺️ WEBVIEW MAP - Map tiles loaded! 🎉');
          break;
        case 'VENUE_SELECTED':
          console.log('🗺️ WEBVIEW MAP - Venue selected:', message.venue);
          setSelectedVenue(message.venue);
          break;
        case 'MAP_ERROR':
          console.error('🗺️ WEBVIEW MAP - Error:', message.error);
          break;
        default:
          console.log('🗺️ WEBVIEW MAP - Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('🗺️ WEBVIEW MAP - Failed to parse message:', error);
    }
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

  const getVenueNavigation = (venue: Venue) => {
    if (!userLocation) {
      Alert.alert('Location Required', 'Please enable location services to get directions.');
      return;
    }

    const userLat = userLocation.coords.latitude;
    const userLng = userLocation.coords.longitude;
    const venueLat = venue.coordinates.latitude;
    const venueLng = venue.coordinates.longitude;

    // Calculate distance and estimated walking time
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

  const openExternalMap = (venue: Venue) => {
    if (!userLocation) {
      Alert.alert('Location Required', 'Please enable location services first.');
      return;
    }

    const userLat = userLocation.coords.latitude;
    const userLng = userLocation.coords.longitude;
    const venueLat = venue.coordinates.latitude;
    const venueLng = venue.coordinates.longitude;

    // Create URLs for different map apps with directions from current location to venue
    const googleMapsUrl = `https://www.google.com/maps/dir/${userLat},${userLng}/${venueLat},${venueLng}`;
    
    const appleMapsUrl = Platform.select({
      ios: `http://maps.apple.com/?saddr=${userLat},${userLng}&daddr=${venueLat},${venueLng}&dirflg=w`,
      android: googleMapsUrl,
    });

    const url = Platform.OS === 'ios' ? appleMapsUrl : googleMapsUrl;

    if (url) {
      Linking.openURL(url).catch((err) => {
        console.error('Failed to open map:', err);
        Alert.alert('Error', 'Unable to open maps application.');
      });
    }
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

  // Create map HTML with proper API key handling
  const createMapHTML = () => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
    console.log('🗺️ WEBVIEW MAP - Using API key:', apiKey?.substring(0, 20) + '...');
    
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
                background: #ffffff;
                overflow: hidden;
            }
            #map {
                height: 100vh;
                width: 100vw;
            }
        </style>
    </head>
    <body>
        <div id="map"></div>
        <script>
            let map;
            let userMarker;
            let selectedMarker;
            let venues = ${JSON.stringify(OAU_VENUES)};
            let userLocation = null;
            
            function initMap() {
                console.log('🗺️ WEBVIEW - Initializing Google Maps...');
                
                map = new google.maps.Map(document.getElementById("map"), {
                    zoom: 16,
                    center: { lat: 7.5181, lng: 4.5284 },
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false,
                    zoomControl: true,
                    gestureHandling: 'auto',
                });
                
                // Add campus venue markers
                venues.forEach(venue => {
                    const marker = new google.maps.Marker({
                        position: { 
                            lat: venue.coordinates.latitude, 
                            lng: venue.coordinates.longitude 
                        },
                        map: map,
                        title: venue.name,
                        icon: {
                            url: 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><circle cx="14" cy="14" r="12" fill="%23007aff" stroke="%23ffffff" stroke-width="2"/><circle cx="14" cy="14" r="6" fill="%23ffffff"/></svg>',
                            scaledSize: new google.maps.Size(28, 28),
                            anchor: new google.maps.Point(14, 14)
                        }
                    });
                    
                    const infoWindow = new google.maps.InfoWindow({
                        content: '<div style="padding: 12px; text-align: center;"><strong>' + venue.name + '</strong><br>' + venue.description + '<br><small>' + venue.category + '</small></div>'
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
                        url: 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="%23007aff" stroke="%23ffffff" stroke-width="3"/><circle cx="12" cy="12" r="4" fill="%23ffffff"/></svg>',
                        scaledSize: new google.maps.Size(24, 24),
                        anchor: new google.maps.Point(12, 12)
                    }
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
                    
                    selectedMarker = new google.maps.Marker({
                        position: { 
                            lat: venue.coordinates.latitude, 
                            lng: venue.coordinates.longitude 
                        },
                        map: map,
                        title: venue.name,
                        icon: {
                            url: 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36"><circle cx="18" cy="18" r="16" fill="%23ff3b30" stroke="%23ffffff" stroke-width="3"/><circle cx="18" cy="18" r="8" fill="%23ffffff"/></svg>',
                            scaledSize: new google.maps.Size(36, 36),
                            anchor: new google.maps.Point(18, 18)
                        }
                    });
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

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: createMapHTML() }}
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
          console.error('🗺️ WEBVIEW MAP - WebView error:', nativeEvent);
        }}
        onHttpError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('🗺️ WEBVIEW MAP - WebView HTTP error:', nativeEvent);
        }}
      />

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
        <Ionicons name="globe" size={14} color="#30d158" />
        <Text style={styles.statusText}>WebView Maps</Text>
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
            <View style={styles.venueInfo}>
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
          
          {/* Navigation Button */}
          <TouchableOpacity 
            style={styles.navigationButton}
            onPress={() => getVenueNavigation(selectedVenue)}
          >
            <Ionicons name="navigate" size={20} color="#ffffff" />
            <Text style={styles.navigationButtonText}>Get Directions</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Loading Indicator */}
      {!mapReady && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading WebView Map...</Text>
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
  webview: {
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
  venuePanel: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 130 : 120, // Raised higher to clear tab bar
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 24, // Full border radius since it's not touching edges
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
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
  venueInfo: {
    flex: 1,
    marginRight: 12,
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
  navigationButton: {
    backgroundColor: '#007aff',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  navigationButtonText: {
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

export default WebViewMap;
