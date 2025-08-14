import NativeMap from '@/components/NativeMap';
import { LocationTester } from '@/components/LocationTester';
import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function TabOneScreen() {
  const params = useLocalSearchParams();
  const [showLocationTester, setShowLocationTester] = useState(false);
  
  useEffect(() => {
    console.log('🗺️ MAP SCREEN - Component mounted/rendered');
    
    // Check if navigation parameters are provided
    if (params.navigate && params.venueId) {
      console.log('🗺️ MAP SCREEN - Navigation requested to:', {
        venueId: params.venueId,
        venueName: params.venueName,
        lat: params.lat,
        lng: params.lng,
      });
      
      // Here you could trigger navigation in the map
      // For now, we'll let the SimpleMap handle this through URL parameters
    }
  }, [params]);

  console.log('🗺️ MAP SCREEN - Render called');
  
  if (showLocationTester) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => setShowLocationTester(false)}
          >
            <Text style={styles.backButtonText}>← Back to Map</Text>
          </TouchableOpacity>
        </View>
        <LocationTester />
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <NativeMap navigationParams={params} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: 'white',
  },
  backButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: 'white',
    fontWeight: '600',
  },

  testButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: '#28a745',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  testButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
});
