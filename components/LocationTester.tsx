import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number | null;
  heading: number | null;
  speed: number | null;
  timestamp: number;
}

export const LocationTester: React.FC = () => {
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [locationHistory, setLocationHistory] = useState<LocationData[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);
      console.log('🔍 LOCATION TESTER - Permission status:', status);
    } catch (error) {
      console.error('🔍 LOCATION TESTER - Permission check error:', error);
    }
  };

  const requestPermission = async () => {
    try {
      console.log('🔑 LOCATION TESTER - Requesting permission...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);
      console.log('🔑 LOCATION TESTER - Permission result:', status);
      
      if (status === 'granted') {
        Alert.alert('Success', 'Location permission granted!');
      } else {
        Alert.alert('Permission Denied', 'Location access was denied.');
      }
    } catch (error) {
      console.error('🔑 LOCATION TESTER - Permission request error:', error);
      Alert.alert('Error', 'Failed to request location permission: ' + error.message);
    }
  };

  const getCurrentLocation = async () => {
    try {
      console.log('📍 LOCATION TESTER - Getting current position...');
      
      // Check if location services are enabled
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      console.log('📍 LOCATION TESTER - Services enabled:', servicesEnabled);
      
      if (!servicesEnabled) {
        Alert.alert('Location Services Disabled', 'Please enable location services in device settings.');
        return;
      }

      // Try multiple accuracy levels
      const accuracyLevels = [
        { name: 'High', level: Location.Accuracy.High, timeout: 10000 },
        { name: 'Balanced', level: Location.Accuracy.Balanced, timeout: 8000 },
        { name: 'Low', level: Location.Accuracy.Low, timeout: 5000 },
      ];

      for (const accuracy of accuracyLevels) {
        try {
          console.log(`📍 LOCATION TESTER - Trying ${accuracy.name} accuracy...`);
          
          const location = await Location.getCurrentPositionAsync({
            accuracy: accuracy.level,
            timeoutMs: accuracy.timeout,
            maximumAge: 10000,
          });

          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || 0,
            altitude: location.coords.altitude,
            heading: location.coords.heading,
            speed: location.coords.speed,
            timestamp: location.timestamp,
          };

          setCurrentLocation(locationData);
          setLocationHistory(prev => [locationData, ...prev].slice(0, 10)); // Keep last 10

          console.log('📍 LOCATION TESTER - SUCCESS with', accuracy.name, 'accuracy:');
          console.log('📍 LATITUDE:', locationData.latitude);
          console.log('📍 LONGITUDE:', locationData.longitude);
          console.log('📍 ACCURACY:', locationData.accuracy, 'meters');
          console.log('📍 FULL DATA:', locationData);

          Alert.alert(
            'Location Found!',
            `Latitude: ${locationData.latitude.toFixed(6)}\n` +
            `Longitude: ${locationData.longitude.toFixed(6)}\n` +
            `Accuracy: ${locationData.accuracy?.toFixed(1)}m\n` +
            `Method: ${accuracy.name}`
          );

          return; // Success, exit the loop
        } catch (accuracyError) {
          console.log(`📍 LOCATION TESTER - ${accuracy.name} accuracy failed:`, accuracyError.message);
        }
      }

      // If all methods failed
      throw new Error('All GPS accuracy methods failed');

    } catch (error) {
      console.error('📍 LOCATION TESTER - Failed to get location:', error);
      Alert.alert(
        'Location Error',
        `Could not get your location:\n\n${error.message}\n\nTry:\n• Going outside\n• Enabling high accuracy GPS\n• Restarting the app`
      );
    }
  };

  const startLocationTracking = async () => {
    try {
      console.log('🔄 LOCATION TESTER - Starting continuous tracking...');
      setIsTracking(true);

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 2000,
          distanceInterval: 5,
        },
        (location) => {
          const locationData: LocationData = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || 0,
            altitude: location.coords.altitude,
            heading: location.coords.heading,
            speed: location.coords.speed,
            timestamp: location.timestamp,
          };

          setCurrentLocation(locationData);
          setLocationHistory(prev => [locationData, ...prev].slice(0, 10));

          console.log('🔄 LOCATION UPDATE:', {
            lat: locationData.latitude,
            lng: locationData.longitude,
            accuracy: locationData.accuracy
          });
        }
      );

      // Stop tracking after 30 seconds for testing
      setTimeout(() => {
        subscription.remove();
        setIsTracking(false);
        console.log('🔄 LOCATION TESTER - Stopped tracking');
        Alert.alert('Tracking Stopped', 'Location tracking stopped after 30 seconds.');
      }, 30000);

    } catch (error) {
      console.error('🔄 LOCATION TESTER - Tracking error:', error);
      setIsTracking(false);
      Alert.alert('Tracking Error', 'Failed to start location tracking: ' + error.message);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="location" size={32} color="#667eea" />
        <Text style={styles.title}>Location Tester</Text>
      </View>

      {/* Permission Status */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Permission Status</Text>
        <Text style={[styles.status, { color: permissionStatus === 'granted' ? '#28a745' : '#dc3545' }]}>
          {permissionStatus.toUpperCase()}
        </Text>
        {permissionStatus !== 'granted' && (
          <TouchableOpacity style={styles.button} onPress={requestPermission}>
            <Text style={styles.buttonText}>Request Permission</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Current Location */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current Location</Text>
        {currentLocation ? (
          <View>
            <Text style={styles.coordinate}>📍 Latitude: {currentLocation.latitude.toFixed(6)}</Text>
            <Text style={styles.coordinate}>📍 Longitude: {currentLocation.longitude.toFixed(6)}</Text>
            <Text style={styles.detail}>🎯 Accuracy: {currentLocation.accuracy?.toFixed(1)}m</Text>
            <Text style={styles.detail}>⏰ Time: {formatTimestamp(currentLocation.timestamp)}</Text>
            {currentLocation.altitude && (
              <Text style={styles.detail}>⛰️ Altitude: {currentLocation.altitude.toFixed(1)}m</Text>
            )}
            {currentLocation.speed && (
              <Text style={styles.detail}>🏃 Speed: {(currentLocation.speed * 3.6).toFixed(1)} km/h</Text>
            )}
          </View>
        ) : (
          <Text style={styles.noData}>No location data yet</Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={getCurrentLocation}
          disabled={permissionStatus !== 'granted'}
        >
          <Ionicons name="locate" size={20} color="white" />
          <Text style={styles.buttonText}>Get Current Location</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, isTracking ? styles.dangerButton : styles.successButton]} 
          onPress={startLocationTracking}
          disabled={permissionStatus !== 'granted' || isTracking}
        >
          <Ionicons name={isTracking ? "stop" : "play"} size={20} color="white" />
          <Text style={styles.buttonText}>
            {isTracking ? 'Tracking...' : 'Start Tracking (30s)'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: '#ff9800' }]} 
          onPress={() => {
            const mockLocation: LocationData = {
              latitude: 7.5181,
              longitude: 4.5284,
              accuracy: 5,
              altitude: 276,
              heading: null,
              speed: null,
              timestamp: Date.now(),
            };
            
            setCurrentLocation(mockLocation);
            setLocationHistory(prev => [mockLocation, ...prev].slice(0, 10));
            
            console.log('🎯 MOCK LOCATION SET:');
            console.log('📍 LATITUDE:', mockLocation.latitude);
            console.log('📍 LONGITUDE:', mockLocation.longitude);
            console.log('📍 LOCATION: OAU Campus Center (Mock)');
            
            Alert.alert(
              'Mock Location Set!',
              `Using OAU Campus Center:\nLat: ${mockLocation.latitude}\nLng: ${mockLocation.longitude}\n\nThis simulates being at the campus center.`
            );
          }}
        >
          <Ionicons name="location-sharp" size={20} color="white" />
          <Text style={styles.buttonText}>Use OAU Campus Location</Text>
        </TouchableOpacity>
      </View>

      {/* Location History */}
      {locationHistory.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Recent Locations</Text>
          {locationHistory.map((loc, index) => (
            <View key={index} style={styles.historyItem}>
              <Text style={styles.historyText}>
                {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
              </Text>
              <Text style={styles.historyTime}>{formatTimestamp(loc.timestamp)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginLeft: 12,
    color: '#2c3e50',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 12,
  },
  status: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  coordinate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
    fontFamily: 'monospace',
  },
  detail: {
    fontSize: 14,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  noData: {
    fontSize: 14,
    color: '#7f8c8d',
    fontStyle: 'italic',
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#667eea',
  },
  successButton: {
    backgroundColor: '#28a745',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f5',
  },
  historyText: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#2c3e50',
  },
  historyTime: {
    fontSize: 12,
    color: '#7f8c8d',
  },
});
