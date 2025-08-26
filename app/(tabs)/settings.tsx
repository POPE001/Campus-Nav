import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useScreenStyles } from '@/hooks/useScreenStyles';
import { ScreenContainer } from '@/components/ScreenContainer';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Section } from '@/components/Section';
import { ListItem } from '@/components/ListItem';
import { useTheme } from '@/contexts/ThemeContext';
import { useFontSize } from '@/contexts/FontSizeContext';

// FontSizeSelector component (keeping this as it's specific to this screen)

const FontSizeSelector: React.FC<{
  currentSize: number;
  onSizeChange: (size: number) => void;
}> = ({ currentSize, onSizeChange }) => {
  const { styles, theme } = useScreenStyles();
  const sizes = [
    { label: 'Small', value: 14 },
    { label: 'Medium', value: 16 },
    { label: 'Large', value: 18 },
    { label: 'Extra Large', value: 20 },
  ];

  return (
    <View style={styles.fontSizeContainer}>
      {sizes.map((size) => (
        <TouchableOpacity
          key={size.value}
          style={[
            styles.fontSizeOption,
            currentSize === size.value && styles.fontSizeOptionActive,
          ]}
          onPress={() => onSizeChange(size.value)}
        >
          <Text
            style={[
              styles.fontSizeText,
              { fontSize: size.value },
              currentSize === size.value && styles.fontSizeTextActive,
            ]}
          >
            {size.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default function SettingsScreen() {
  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  
  // Use common styles and contexts
  const { styles } = useScreenStyles();
  const { isDark, setTheme } = useTheme();
  const { fontSize, setFontSize, getFontSizeLabel } = useFontSize();

  // Local styles for settings screen specific needs
  const localStyles = StyleSheet.create({
    scrollContentContainer: {
      paddingBottom: 120, // Extra padding to ensure all content is scrollable
      flexGrow: 1,
    },
    footer: {
      alignItems: 'center',
      paddingVertical: 32,
      paddingHorizontal: 20,
      marginTop: 32,
    },
    footerText: {
      fontSize: 16,
      fontWeight: '600',
      color: isDark ? '#8E8E93' : '#8E8E93',
      marginBottom: 4,
    },
    footerSubtext: {
      fontSize: 14,
      color: isDark ? '#636366' : '#8E8E93',
      textAlign: 'center',
    },
  });

  useEffect(() => {
    loadSettings();
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadSettings = async () => {
    try {
      const savedNotifications = await AsyncStorage.getItem('notifications');
      const savedPushNotifications = await AsyncStorage.getItem('pushNotifications');
      const savedEmailNotifications = await AsyncStorage.getItem('emailNotifications');

      if (savedNotifications !== null) setNotifications(JSON.parse(savedNotifications));
      if (savedPushNotifications !== null) setPushNotifications(JSON.parse(savedPushNotifications));
      if (savedEmailNotifications !== null) setEmailNotifications(JSON.parse(savedEmailNotifications));
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSetting = async (key: string, value: any) => {
    try {
      await AsyncStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
    } catch (error) {
      console.error('Error saving setting:', error);
    }
  };

  const handleDarkModeToggle = (value: boolean) => {
    setTheme(value);
  };

  const handleNotificationsToggle = (value: boolean) => {
    setNotifications(value);
    saveSetting('notifications', value);
  };

  const handlePushNotificationsToggle = (value: boolean) => {
    setPushNotifications(value);
    saveSetting('pushNotifications', value);
  };

  const handleEmailNotificationsToggle = (value: boolean) => {
    setEmailNotifications(value);
    saveSetting('emailNotifications', value);
  };

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. Are you sure you want to delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement account deletion
            Alert.alert('Feature Coming Soon', 'Account deletion will be available in a future update.');
          },
        },
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data and may improve app performance.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: async () => {
            try {
              // Clear specific cache items but keep settings
              const keysToKeep = ['darkMode', 'notifications', 'pushNotifications', 'emailNotifications', 'fontSize'];
              const allKeys = await AsyncStorage.getAllKeys();
              const keysToRemove = allKeys.filter(key => !keysToKeep.includes(key));
              await AsyncStorage.multiRemove(keysToRemove);
              Alert.alert('Success', 'Cache cleared successfully.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer>
      <ScreenHeader 
        title="Settings" 
        subtitle="Customize your app experience"
        colors={['#007AFF', '#0056CC']}
      />

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={localStyles.scrollContentContainer}
        {...(Platform.OS === 'ios' && { contentInsetAdjustmentBehavior: 'automatic' })}
        bounces={true}
        alwaysBounceVertical={true}
      >
        {/* Account Section */}
        {/* <Section title="Account">
          <ListItem
            icon="shield-checkmark-outline"
            title="Privacy & Security"
            subtitle="Manage your privacy settings"
            onPress={() => Alert.alert('Coming Soon', 'Privacy settings will be available soon.')}
          />

        </Section> */}

        {/* Appearance Section */}
        <Section title="Appearance">
          <ListItem
            icon="moon-outline"
            title="Dark Mode"
            subtitle="Switch between light and dark theme"
            rightComponent={
              <Switch
                value={isDark}
                onValueChange={handleDarkModeToggle}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={isDark ? '#ffffff' : '#f4f3f4'}
              />
            }
            showChevron={false}
          />
          <ListItem
            icon="text-outline"
            title="Font Size"
            subtitle={`Current: ${getFontSizeLabel()}`}
            onPress={() => setShowFontSize(!showFontSize)}
          />
          {showFontSize && (
            <View style={styles.fontSizeWrapper}>
              <FontSizeSelector currentSize={fontSize} onSizeChange={handleFontSizeChange} />
            </View>
          )}
        </Section>

        {/* Notifications Section */}
        <Section title="Notifications">
          <ListItem
            icon="notifications-outline"
            title="All Notifications"
            subtitle="Enable or disable all notifications"
            rightComponent={
              <Switch
                value={notifications}
                onValueChange={handleNotificationsToggle}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={notifications ? '#ffffff' : '#f4f3f4'}
              />
            }
            showChevron={false}
          />
          <ListItem
            icon="phone-portrait-outline"
            title="Push Notifications"
            subtitle="Receive notifications on your device"
            rightComponent={
              <Switch
                value={pushNotifications && notifications}
                onValueChange={handlePushNotificationsToggle}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={pushNotifications && notifications ? '#ffffff' : '#f4f3f4'}
                disabled={!notifications}
              />
            }
            showChevron={false}
            disabled={!notifications}
          />
          {/* <ListItem
            icon="mail-outline"
            title="Email Notifications"
            subtitle="Receive notifications via email"
            rightComponent={
              <Switch
                value={emailNotifications && notifications}
                onValueChange={handleEmailNotificationsToggle}
                trackColor={{ false: '#767577', true: '#007AFF' }}
                thumbColor={emailNotifications && notifications ? '#ffffff' : '#f4f3f4'}
                disabled={!notifications}
              />
            }
            showChevron={false}
            disabled={!notifications}
          /> */}
        </Section>

        {/* App Section */}
        <Section title="App">
          <ListItem
            icon="refresh-outline"
            title="Clear Cache"
            subtitle="Free up storage space"
            onPress={handleClearCache}
          />
          {/* <ListItem
            icon="download-outline"
            title="Check for Updates"
            subtitle="Ensure you have the latest version"
            onPress={() => Alert.alert('Up to Date', 'You have the latest version of the app.')}
          /> */}
          {/* <ListItem
            icon="help-circle-outline"
            title="Help & Support"
            subtitle="Get help and contact support"
            onPress={() => Alert.alert('Coming Soon', 'Help & Support will be available soon.')}
          /> */}
          <ListItem
            icon="information-circle-outline"
            title="About"
            subtitle="App version and information"
            onPress={() => Alert.alert('My OAU', 'Version 1.0.0\n\nA comprehensive campus navigation and management app for students and staff.')}
          />
        </Section>

        {/* Danger Zone */}
        <Section title="Account Actions">
          <ListItem
            icon="log-out-outline"
            title="Sign Out"
            subtitle="Sign out of your account"
            onPress={handleSignOut}
          />
          {/* <ListItem
            icon="trash-outline"
            title="Delete Account"
            subtitle="Permanently delete your account"
            onPress={handleDeleteAccount}
          /> */}
        </Section>

        {/* Footer */}
        <View style={localStyles.footer}>
          <Text style={localStyles.footerText}>My OAU v1.0.0</Text>
          <Text style={localStyles.footerSubtext}>Made with ❤️ for students and staff</Text>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

// Removed getStyles - now using useScreenStyles hook
