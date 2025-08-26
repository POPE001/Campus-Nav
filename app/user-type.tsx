import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  StatusBar,
  Animated,
  Dimensions,
  ScrollView,
  SafeAreaView,
  Image
} from 'react-native';
import React, { useRef, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const UserTypeSelection = () => {
  const router = useRouter();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleUserTypeSelection = (userType: 'student' | 'staff' | 'visitor') => {
    console.log('User type selected:', userType);
    try {
      if (userType === 'visitor') {
        console.log('Navigating to tabs for visitor');
        router.push('/(tabs)');
      } else if (userType === 'student') {
        console.log('Navigating to student signup');
        router.push('/student-signup');
      } else if (userType === 'staff') {
        console.log('Navigating to staff signup');
        router.push('/staff-signup');
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };

  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            <Animated.View
              style={[
                styles.content,
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY: slideAnim },
                    { scale: scaleAnim }
                  ],
                },
              ]}
            >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Image 
                  source={require('../assets/images/oau_logo.png')}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            </View>
            <Text style={styles.title}>Welcome to My OAU</Text>
            <Text style={styles.subtitle}>
              Your ultimate guide to navigating{'\n'}Obafemi Awolowo University
            </Text>
          </View>

          {/* Prominent Sign In Section for Returning Users */}
          <TouchableOpacity 
            style={styles.prominentSignInButton}
            onPress={() => router.push('/login')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(255, 255, 255, 0.25)', 'rgba(255, 255, 255, 0.15)']}
              style={styles.signInGradient}
            >
              <View style={styles.signInContent}>
                <LinearGradient
                  colors={['#667eea', '#764ba2']}
                  style={styles.signInIcon}
                >
                  <Ionicons name="log-in" size={24} color="white" />
                </LinearGradient>
                <View style={styles.signInTextContainer}>
                  <Text style={styles.signInTitle}>Already have an account?</Text>
                  <Text style={styles.signInSubtitle}>Quick access to your personalized campus hub</Text>
                </View>
                <View style={styles.signInArrow}>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or create a new account</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* User Type Cards */}
          <View style={styles.cardsContainer}>
            {/* Student Card */}
            <TouchableOpacity 
              style={styles.userTypeCard}
              onPress={() => handleUserTypeSelection('student')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                style={styles.cardGradient}
              >
                <View style={styles.cardIconContainer}>
                  <Ionicons name="school" size={height < 700 ? 30 : 35} color="white" />
                </View>
                <Text style={styles.cardTitle}>Student</Text>
                <Text style={styles.cardDescription}>
                  Access your timetable, find classrooms, and navigate campus as a student
                </Text>
                <View style={styles.cardFeatures}>
                  <View style={styles.feature}>
                    <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
                    <Text style={styles.featureText}>Personal timetable</Text>
                  </View>
                  <View style={styles.feature}>
                    <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
                    <Text style={styles.featureText}>Campus navigation</Text>
                  </View>
                  <View style={styles.feature}>
                    <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
                    <Text style={styles.featureText}>Class reminders</Text>
                  </View>
                </View>
                <View style={styles.cardCta}>
                  <Text style={styles.ctaText}>Create Student Account</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Staff Card */}
            <TouchableOpacity 
              style={styles.userTypeCard}
              onPress={() => handleUserTypeSelection('staff')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                style={styles.cardGradient}
              >
                <View style={styles.cardIconContainer}>
                  <Ionicons name="briefcase" size={height < 700 ? 30 : 35} color="white" />
                </View>
                <Text style={styles.cardTitle}>Staff</Text>
                <Text style={styles.cardDescription}>
                  Manage your schedule, find offices, and navigate campus as staff
                </Text>
                <View style={styles.cardFeatures}>
                  <View style={styles.feature}>
                    <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
                    <Text style={styles.featureText}>Work schedule</Text>
                  </View>
                  <View style={styles.feature}>
                    <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
                    <Text style={styles.featureText}>Office locations</Text>
                  </View>
                  <View style={styles.feature}>
                    <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
                    <Text style={styles.featureText}>Meeting rooms</Text>
                  </View>
                </View>
                <View style={styles.cardCta}>
                  <Text style={styles.ctaText}>Create Staff Account</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Visitor Card */}
            <TouchableOpacity 
              style={styles.userTypeCard}
              onPress={() => handleUserTypeSelection('visitor')}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.15)', 'rgba(255, 255, 255, 0.05)']}
                style={styles.cardGradient}
              >
                <View style={styles.cardIconContainer}>
                  <Ionicons name="map-outline" size={height < 700 ? 30 : 35} color="white" />
                </View>
                <Text style={styles.cardTitle}>Visitor</Text>
                <Text style={styles.cardDescription}>
                  Explore the campus without an account. Basic navigation features only
                </Text>
                <View style={styles.cardFeatures}>
                  <View style={styles.feature}>
                    <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
                    <Text style={styles.featureText}>Campus map</Text>
                  </View>
                  <View style={styles.feature}>
                    <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
                    <Text style={styles.featureText}>Basic navigation</Text>
                  </View>
                  <View style={styles.feature}>
                    <Ionicons name="checkmark-circle" size={16} color="#4ade80" />
                    <Text style={styles.featureText}>Location search</Text>
                  </View>
                </View>
                <View style={styles.cardCta}>
                  <Text style={styles.ctaText}>Continue as Visitor</Text>
                  <Ionicons name="arrow-forward" size={20} color="white" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>



              {/* Decorative Elements */}
              <View style={styles.decorativeContainer}>
                <View style={styles.decorativeDot1} />
                <View style={styles.decorativeDot2} />
                <View style={styles.decorativeDot3} />
              </View>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 50,
    minHeight: height - 100, // Ensure minimum height but allow scrolling
  },
  header: {
    alignItems: 'center',
    marginBottom: height < 700 ? 20 : 30, // Responsive margin based on screen height
  },
  logoContainer: {
    marginBottom: height < 700 ? 20 : 25,
  },
  logoCircle: {
    width: height < 700 ? 80 : 100, // Smaller logo on smaller screens
    height: height < 700 ? 80 : 100,
    borderRadius: height < 700 ? 40 : 50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logoImage: {
    width: height < 700 ? 60 : 70,
    height: height < 700 ? 60 : 70,
  },
  title: {
    fontSize: height < 700 ? 28 : 32, // Responsive font size
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: height < 700 ? 14 : 16, // Responsive font size
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: height < 700 ? 20 : 24,
    fontWeight: '500',
    paddingHorizontal: 10,
  },
  cardsContainer: {
    gap: height < 700 ? 12 : 16, // Smaller gap on small screens
    marginBottom: 20,
    marginTop: 10,
  },
  userTypeCard: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: height < 700 ? 16 : 20, // Responsive padding
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardIconContainer: {
    width: height < 700 ? 60 : 70, // Responsive icon size
    height: height < 700 ? 60 : 70,
    borderRadius: height < 700 ? 30 : 35,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: height < 700 ? 12 : 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cardTitle: {
    fontSize: height < 700 ? 18 : 20, // Responsive title size
    fontWeight: 'bold',
    color: 'white',
    marginBottom: height < 700 ? 8 : 10,
  },
  cardDescription: {
    fontSize: height < 700 ? 13 : 14, // Responsive description size
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: height < 700 ? 12 : 16,
    lineHeight: height < 700 ? 18 : 20,
  },
  cardFeatures: {
    marginBottom: height < 700 ? 16 : 20,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height < 700 ? 4 : 6,
  },
  featureText: {
    fontSize: height < 700 ? 12 : 13, // Responsive feature text
    color: 'rgba(255, 255, 255, 0.9)',
    marginLeft: 8,
    fontWeight: '500',
  },
  cardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: height < 700 ? 12 : 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  ctaText: {
    fontSize: height < 700 ? 14 : 16, // Responsive CTA text
    fontWeight: 'bold',
    color: 'white',
  },
  // Prominent Sign In Button Styles
  prominentSignInButton: {
    marginBottom: height < 700 ? 20 : 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  signInGradient: {
    padding: height < 700 ? 18 : 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
  },
  signInContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  signInIcon: {
    width: height < 700 ? 52 : 58,
    height: height < 700 ? 52 : 58,
    borderRadius: height < 700 ? 26 : 29,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInTextContainer: {
    flex: 1,
    marginLeft: 18,
    marginRight: 12,
  },
  signInTitle: {
    fontSize: height < 700 ? 17 : 19,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  signInSubtitle: {
    fontSize: height < 700 ? 13 : 14,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: height < 700 ? 18 : 20,
    fontWeight: '500',
  },
  signInArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  // Divider Styles
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: height < 700 ? 16 : 20,
    paddingHorizontal: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    fontSize: height < 700 ? 12 : 14,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
    marginHorizontal: 16,
    textAlign: 'center',
  },
  decorativeContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  decorativeDot1: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    top: '15%',
    left: '10%',
  },
  decorativeDot2: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    top: '30%',
    right: '15%',
  },
  decorativeDot3: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    bottom: '25%',
    left: '20%',
  },
});

export default UserTypeSelection;