import NativeMapScreen from '@/components/NativeMapScreen';
import { LocationTester } from '@/components/LocationTester';
import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontSize } from '@/contexts/FontSizeContext';

export default function TabOneScreen() {
  const params = useLocalSearchParams();
  const [showLocationTester, setShowLocationTester] = useState(false);
  const { theme } = useTheme();
  const { fontSizes } = useFontSize();
  
  useEffect(() => {
    console.log('🗺️ MAP SCREEN - Native maps version mounted/rendered');
    
    // Check if navigation parameters are provided
    if (params.navigate && params.venueId) {
      console.log('🗺️ MAP SCREEN - Navigation requested to:', {
        venueId: params.venueId,
        venueName: params.venueName,
        lat: params.lat,
        lng: params.lng,
      });
    }
  }, [params]);

  console.log('🗺️ MAP SCREEN - Native maps render called');
  
  if (showLocationTester) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={[styles.header, { backgroundColor: theme.card }]}>
          <TouchableOpacity 
            style={[styles.backButton, { backgroundColor: theme.primary }]} 
            onPress={() => setShowLocationTester(false)}
          >
            <Text style={[styles.backButtonText, { fontSize: fontSizes.medium }]}>← Back to Map</Text>
          </TouchableOpacity>
        </View>
        <LocationTester />
      </View>
    );
  }
  
  return <NativeMapScreen navigationParams={params} />;
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
