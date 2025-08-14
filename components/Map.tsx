import React, { useState, useEffect } from 'react';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import { StyleSheet, View, Dimensions, Text, Platform } from 'react-native';
import * as Location from 'expo-location';

const Map = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission to access location was denied');
          return;
        }

        let location = await Location.getCurrentPositionAsync({});
        setLocation(location);
      } catch (error) {
        console.log('Location error:', error);
        setErrorMsg('Could not fetch location');
      }
    })();
  }, []);

  // Don't block the map from showing just because of location errors
  // The map should still render even without location access

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_DEFAULT}
        style={styles.map}
        initialRegion={{
          latitude: 7.5181,
          longitude: 4.5284,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={location ? true : false}
        showsMyLocationButton={true}
        showsCompass={true}
        showsScale={true}
        showsBuildings={true}
        showsIndoors={true}
        showsPointsOfInterest={true}
        showsTraffic={false}
        onMapReady={() => {
          console.log('Map is ready!');
          setMapReady(true);
        }}
        onRegionChange={(region) => {
          console.log('Map region changed:', region);
        }}
        onMapLoaded={() => {
          console.log('Map tiles loaded!');
        }}
        mapType="standard"
        pitchEnabled={true}
        rotateEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
        loadingEnabled={true}
        loadingIndicatorColor="#667eea"
        loadingBackgroundColor="#ffffff"
      >
        <Marker
          coordinate={{ latitude: 7.5181, longitude: 4.5284 }}
          title="Obafemi Awolowo University"
          description="Main Campus"
          pinColor="red"
        />
        {mapReady && location && (
          <Marker
            coordinate={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            }}
            title="Your Location"
            pinColor="blue"
          />
        )}
      </MapView>
      {!mapReady && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}
      {errorMsg && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>{errorMsg}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 10,
  },
  subText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  loadingText: {
    fontSize: 16,
    color: '#333',
  },
  errorBanner: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(211, 47, 47, 0.9)',
    padding: 10,
    borderRadius: 8,
  },
  errorBannerText: {
    color: 'white',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default Map;
