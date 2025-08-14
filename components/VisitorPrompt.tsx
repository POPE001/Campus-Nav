import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width } = Dimensions.get('window');

export function VisitorPrompt() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Ionicons name="person-add" size={80} color="white" />
          </View>
          
          <Text style={styles.title}>Welcome to Campus Nav!</Text>
          <Text style={styles.subtitle}>
            You're currently browsing as a visitor. Sign in to unlock personal features like schedules, saved locations, and more.
          </Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="calendar" size={24} color="rgba(255,255,255,0.8)" />
              <Text style={styles.featureText}>Personal Class Schedules</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="bookmark" size={24} color="rgba(255,255,255,0.8)" />
              <Text style={styles.featureText}>Save Favorite Locations</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="notifications" size={24} color="rgba(255,255,255,0.8)" />
              <Text style={styles.featureText}>Event Notifications</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="people" size={24} color="rgba(255,255,255,0.8)" />
              <Text style={styles.featureText}>Connect with Campus Community</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={() => router.push('/user-type')}
          >
            <Text style={styles.signInButtonText}>Sign In / Create Account</Text>
            <Ionicons name="arrow-forward" size={20} color="#667eea" />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.continueButton}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={styles.continueButtonText}>Continue as Visitor</Text>
          </TouchableOpacity>
          
          <Text style={styles.disclaimer}>
            As a visitor, you can still use the campus map and navigation features!
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  iconContainer: {
    marginBottom: 30,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 50,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  featuresList: {
    width: '100%',
    marginBottom: 40,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  featureText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 16,
    flex: 1,
  },
  signInButton: {
    backgroundColor: 'white',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  signInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    marginRight: 8,
  },
  continueButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 20,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
    textAlign: 'center',
  },
  disclaimer: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
