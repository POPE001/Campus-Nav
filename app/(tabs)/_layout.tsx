import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { useSegments } from 'expo-router';
import { FixedTabBar } from '@/components/FixedTabBar';

export default function TabLayout() {
  const segments = useSegments();
  
  useEffect(() => {
    console.log('🏗️ TAB LAYOUT - Current segments:', segments);
  }, [segments]);

  console.log('🏗️ TAB LAYOUT - Render called');
  
  return (
    <Tabs
      tabBar={(props) => <FixedTabBar {...props} />}  // Fixed professional design with proper positioning
      screenOptions={{
        // Hide the header completely
        headerShown: false,
      }}>
      
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarLabel: 'Map',
          tabBarOnPress: (e) => {
            console.log('🗺️ TAB PRESS - Map tab pressed', e);
          },
        }}
      />

      <Tabs.Screen
        name="campus-news"
        options={{
          title: 'Campus News',
          tabBarLabel: 'Campus News',
          tabBarOnPress: (e) => {
            console.log('📰 TAB PRESS - Campus News tab pressed', e);
          },
          href: '/campus-news', // Force the route to be available
        }}
      />
      
      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarLabel: 'Schedule',
          tabBarOnPress: (e) => {
            console.log('📅 TAB PRESS - Schedule tab pressed', e);
          },
          href: '/schedule', // Force the route to be available
        }}
      />
      
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarLabel: 'Notifications',
          tabBarOnPress: (e) => {
            console.log('🔔 TAB PRESS - Notifications tab pressed', e);
          },
          href: '/notifications', // Force the route to be available
        }}
      />
      
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarLabel: 'Profile',
          tabBarOnPress: (e) => {
            console.log('👤 TAB PRESS - Profile tab pressed', e);
          },
          href: '/profile', // Force the route to be available
        }}
      />
      
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarOnPress: (e) => {
            console.log('⚙️ TAB PRESS - Settings tab pressed', e);
          },
          href: '/settings', // Force the route to be available
        }}
      />
      
    </Tabs>
  );
}
