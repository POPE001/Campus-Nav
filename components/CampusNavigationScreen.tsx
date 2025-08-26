import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { LinearGradient } from 'expo-linear-gradient';
import { Venue, getVenueById } from '@/constants/Venues';
import NavigationHeader from './NavigationHeader';
import navigationService from '@/lib/navigationService';
import { CampusLocation } from '@/lib/placesService';

interface CampusNavigationScreenProps {
  targetVenueId: string;
  onClose: () => void;
}

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface NavigationStep {
  instruction: string;
  distance: number;
  duration: number;
  direction: 'straight' | 'left' | 'right' | 'slight_left' | 'slight_right';
}

const { width, height } = Dimensions.get('window');

export const CampusNavigationScreen: React.FC<CampusNavigationScreenProps> = ({
  targetVenueId,
  onClose,
}) => {
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [targetVenue, setTargetVenue] = useState<Venue | null>(null);
  const [distance, setDistance] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentStep, setCurrentStep] = useState<NavigationStep | null>(null);
  const [heading, setHeading] = useState<number>(0);
  const [steps, setSteps] = useState<NavigationStep[]>([]);
  const [locationPermission, setLocationPermission] = useState<boolean>(false);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    console.log('🚀 NAVIGATION SCREEN - Component mounted, setting up...');
    setupLocationTracking();
    setupTarget();
    startPulseAnimation();
    
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, []);

  useEffect(() => {
    if (currentLocation && targetVenue) {
      updateNavigationData();
    }
  }, [currentLocation, targetVenue]);

  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const setupLocationTracking = async () => {
    try {
      // Check if location services are enabled
      const isLocationServicesEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationServicesEnabled) {
        Alert.alert(
          'Location Services Disabled',
          'Please enable location services in your device settings to use navigation.',
          [
            { text: 'Cancel', onPress: onClose },
            { text: 'Open Settings', onPress: () => Location.enableNetworkProviderAsync() }
          ]
        );
        return;
      }

      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Campus navigation requires location access to show your position and provide directions.',
          [
            { text: 'Cancel', onPress: onClose },
            { text: 'Grant Permission', onPress: setupLocationTracking }
          ]
        );
        return;
      }

      setLocationPermission(true);
      console.log('📍 LOCATION - Permission granted, getting current position...');

      // Try different accuracy levels if high accuracy fails
      let location;
      try {
        console.log('📍 LOCATION - Trying high accuracy GPS...');
        location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
          timeoutMs: 10000,
          maximumAge: 5000,
        });
      } catch (highAccuracyError) {
        console.log('📍 LOCATION - High accuracy failed, trying balanced...');
        try {
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            timeoutMs: 8000,
            maximumAge: 10000,
          });
        } catch (balancedError) {
          console.log('📍 LOCATION - Balanced failed, trying low accuracy...');
          location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low,
            timeoutMs: 5000,
            maximumAge: 30000,
          });
        }
      }

      console.log('📍 LOCATION - Got initial position:', {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy
      });

      setCurrentLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      // Start watching location with optimized settings
      console.log('📍 LOCATION - Starting location tracking...');
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000, // Update every 2 seconds
          distanceInterval: 5, // Update every 5 meters
        },
        (newLocation) => {
          console.log('📍 LOCATION - Position update:', {
            lat: newLocation.coords.latitude,
            lng: newLocation.coords.longitude,
            accuracy: newLocation.coords.accuracy
          });
          
          setCurrentLocation({
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
          });
          setHeading(newLocation.coords.heading || 0);
        }
      );

      console.log('📍 LOCATION - Location tracking started successfully');
    } catch (error) {
      console.error('📍 LOCATION ERROR:', error);
      
      Alert.alert(
        'GPS Unavailable',
        'Unable to get your exact location. This often happens:\n\n' +
        '• When testing indoors\n' +
        '• On simulators without mock location\n' +
        '• In areas with poor GPS signal\n\n' +
        'Would you like to test with a sample campus location?',
        [
          { text: 'Cancel', onPress: onClose },
          { text: 'Retry GPS', onPress: setupLocationTracking },
          { 
            text: 'Use Test Location', 
            onPress: () => {
              console.log('📍 LOCATION - Using test location for demo');
              setLocationPermission(true);
              setCurrentLocation({
                latitude: 7.5181, // OAU campus center
                longitude: 4.5284,
              });
            }
          }
        ]
      );
    }
  };

  const setupTarget = () => {
    const venue = getVenueById(targetVenueId);
    if (venue) {
      setTargetVenue(venue);
    } else {
      Alert.alert('Error', 'Target venue not found.');
    }
  };

  const calculateDistance = (from: LocationCoords, to: LocationCoords): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = from.latitude * Math.PI / 180;
    const φ2 = to.latitude * Math.PI / 180;
    const Δφ = (to.latitude - from.latitude) * Math.PI / 180;
    const Δλ = (to.longitude - from.longitude) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  const calculateBearing = (from: LocationCoords, to: LocationCoords): number => {
    const φ1 = from.latitude * Math.PI / 180;
    const φ2 = to.latitude * Math.PI / 180;
    const Δλ = (to.longitude - from.longitude) * Math.PI / 180;

    const x = Math.sin(Δλ) * Math.cos(φ2);
    const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

    const θ = Math.atan2(x, y);
    return (θ * 180 / Math.PI + 360) % 360; // Bearing in degrees
  };

  const updateNavigationData = () => {
    if (!currentLocation || !targetVenue) return;

    const dist = calculateDistance(currentLocation, targetVenue.coordinates);
    const walkingSpeed = 1.4; // Average walking speed in m/s
    const estimatedDuration = dist / walkingSpeed;

    setDistance(dist);
    setDuration(estimatedDuration);

    // Generate simple navigation steps
    generateNavigationSteps(currentLocation, targetVenue);
  };

  const generateNavigationSteps = (from: LocationCoords, venue: Venue) => {
    const bearing = calculateBearing(from, venue.coordinates);
    const dist = calculateDistance(from, venue.coordinates);
    
    // Simple step generation - in a real app, this would use routing APIs
    const steps: NavigationStep[] = [];
    
    if (dist > 50) {
      let direction: NavigationStep['direction'] = 'straight';
      
      // Determine direction based on bearing
      if (bearing >= 315 || bearing < 45) direction = 'straight';
      else if (bearing >= 45 && bearing < 135) direction = 'right';
      else if (bearing >= 135 && bearing < 225) direction = 'straight';
      else if (bearing >= 225 && bearing < 315) direction = 'left';

      steps.push({
        instruction: `Head ${getDirectionText(direction)} towards ${venue.name}`,
        distance: dist,
        duration: dist / 1.4,
        direction,
      });
    }

    steps.push({
      instruction: `Arrive at ${venue.name}`,
      distance: 0,
      duration: 0,
      direction: 'straight',
    });

    setSteps(steps);
    setCurrentStep(steps[0] || null);
  };

  const getDirectionText = (direction: NavigationStep['direction']): string => {
    switch (direction) {
      case 'left': return 'left';
      case 'right': return 'right';
      case 'slight_left': return 'slightly left';
      case 'slight_right': return 'slightly right';
      default: return 'straight';
    }
  };

  const getDirectionIcon = (direction: NavigationStep['direction']): string => {
    switch (direction) {
      case 'left': return 'arrow-back';
      case 'right': return 'arrow-forward';
      case 'slight_left': return 'trending-up';
      case 'slight_right': return 'trending-down';
      default: return 'arrow-up';
    }
  };

  const formatDistance = (meters: number): string => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.round(seconds / 60);
    if (minutes < 1) return '< 1 min';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const startNavigation = async () => {
    if (!currentLocation || !targetVenue) {
      Alert.alert('Error', 'Location or destination not available.');
      return;
    }

    try {
      // Convert Venue to CampusLocation format for navigationService
      const destination: CampusLocation = {
        id: targetVenue.id,
        name: targetVenue.name,
        description: targetVenue.description,
        coordinates: targetVenue.coordinates,
        category: targetVenue.category,
        source: 'static',
        type: targetVenue.type,
        building: targetVenue.building,
        keywords: targetVenue.keywords
      };

      // Start navigation using the navigation service
      const success = await navigationService.startNavigation(destination, 'walking', {
        onStatusChange: (status) => {
          console.log('🧭 Campus Navigation status changed:', status);
        },
        onStepChange: (step, stepIndex) => {
          console.log('🧭 Campus Navigation step changed:', step.instruction);
          setCurrentStep({
            instruction: step.instruction,
            distance: step.distance.value,
            duration: step.duration.value,
            direction: 'straight' // Default direction
          });
        },
        onDistanceUpdate: (distance, time) => {
          setDistance(distance);
          setDuration(time);
        }
      });

      if (success) {
        setIsNavigating(true);
      } else {
        Alert.alert('Navigation Error', 'Failed to start navigation. Please try again.');
      }
    } catch (error) {
      console.error('🧭 Campus Navigation - Error starting navigation:', error);
      Alert.alert('Navigation Error', 'Failed to start navigation. Please try again.');
    }
  };

  const stopNavigation = () => {
    // Stop navigation service
    navigationService.forceStopNavigation();
    setIsNavigating(false);
    onClose();
  };

  if (!locationPermission) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.permissionContainer}>
          <Ionicons name="location" size={80} color="white" />
          <Text style={styles.permissionTitle}>Location Access Required</Text>
          <Text style={styles.permissionText}>
            Campus navigation needs your location to provide real-time directions and distance tracking.
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={() => {
            console.log('🔑 PERMISSION - User tapped grant permission button');
            setupLocationTracking();
          }}>
            <Text style={styles.permissionButtonText}>Enable Location Services</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  if (!currentLocation || !targetVenue) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.loadingContainer}>
          <Animated.View style={[styles.loadingDot, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="location" size={40} color="white" />
          </Animated.View>
          <Text style={styles.loadingText}>Finding your location...</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Enhanced Navigation Header */}
      <NavigationHeader
        isVisible={isNavigating}
        onClose={stopNavigation}
      />

      {/* Legacy Header - Only shown when not navigating */}
      {!isNavigating && (
        <LinearGradient colors={['#667eea', '#764ba2']} style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.closeButton} onPress={stopNavigation}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Campus Navigation</Text>
            <View style={styles.placeholder} />
          </View>
          
          <View style={styles.destinationInfo}>
            <Text style={styles.destinationName}>{targetVenue.name}</Text>
            <Text style={styles.destinationDesc}>{targetVenue.description}</Text>
          </View>
        </LinearGradient>
      )}

      {/* Navigation Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatDistance(distance)}</Text>
          <Text style={styles.statLabel}>Distance</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{formatDuration(duration)}</Text>
          <Text style={styles.statLabel}>Est. Time</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>Walking</Text>
          <Text style={styles.statLabel}>Mode</Text>
        </View>
      </View>

      {/* Current Navigation Step */}
      {currentStep && (
        <View style={styles.navigationStep}>
          <View style={styles.stepIcon}>
            <Ionicons 
              name={getDirectionIcon(currentStep.direction)} 
              size={32} 
              color="#667eea" 
            />
          </View>
          <View style={styles.stepInfo}>
            <Text style={styles.stepInstruction}>{currentStep.instruction}</Text>
            {currentStep.distance > 0 && (
              <Text style={styles.stepDistance}>
                in {formatDistance(currentStep.distance)}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Compass/Direction Indicator */}
      <View style={styles.compassContainer}>
        <View style={styles.compass}>
          <Animated.View 
            style={[
              styles.compassNeedle, 
              { 
                transform: [
                  { rotate: `${heading}deg` },
                  { scale: pulseAnim }
                ] 
              }
            ]}
          >
            <Ionicons name="navigate" size={30} color="#667eea" />
          </Animated.View>
          <Text style={styles.compassLabel}>You are here</Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        {!isNavigating ? (
          <TouchableOpacity style={styles.startButton} onPress={startNavigation}>
            <Ionicons name="play" size={24} color="white" />
            <Text style={styles.startButtonText}>Start Navigation</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.navigationControls}>
            <TouchableOpacity style={styles.controlButton} onPress={() => Alert.alert('Info', 'Recalculating route...')}>
              <Ionicons name="refresh" size={24} color="#667eea" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.stopButton} onPress={stopNavigation}>
              <Ionicons name="stop" size={24} color="white" />
              <Text style={styles.stopButtonText}>End Navigation</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusItem}>
          <Ionicons name="location" size={16} color="#28a745" />
          <Text style={styles.statusText}>GPS: Active</Text>
        </View>
        <View style={styles.statusItem}>
          <Ionicons name="wifi" size={16} color="#28a745" />
          <Text style={styles.statusText}>Online</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 20,
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'white',
  },
  permissionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  cancelButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  cancelButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingDot: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  loadingText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '500',
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  destinationInfo: {
    alignItems: 'center',
  },
  destinationName: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  destinationDesc: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e9ecef',
    marginHorizontal: 20,
  },
  navigationStep: {
    flexDirection: 'row',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stepIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepInfo: {
    flex: 1,
  },
  stepInstruction: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  stepDistance: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  compassContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  compass: {
    alignItems: 'center',
  },
  compassNeedle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  compassLabel: {
    fontSize: 16,
    color: '#7f8c8d',
    fontWeight: '500',
  },
  actionContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  startButton: {
    backgroundColor: '#28a745',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  navigationControls: {
    flexDirection: 'row',
    gap: 12,
  },
  controlButton: {
    backgroundColor: 'white',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stopButton: {
    backgroundColor: '#dc3545',
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stopButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'white',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    color: '#28a745',
    marginLeft: 4,
    fontWeight: '500',
  },
});
